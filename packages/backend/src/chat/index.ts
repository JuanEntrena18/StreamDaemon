import { ChatClient } from '@twurple/chat';
import { FastifyInstance } from 'fastify';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getIO } from '../socket/index.js';
import { authProvider, currentUser } from '../auth/index.js';
import { checkCustomCommand } from '../commands/index.js';
import { checkMessage } from '../security/index.js';
import type { enterGiveaway, addTickets } from '../giveaways/index.js';
import { incrementChatCounter } from '../kpi/index.js';
import { ChatGreetingConfigSchema } from '@streamdaemon/shared';
import { logger } from '../logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || path.resolve(__dirname, '../../data');
const GREETING_CONFIG_FILE = path.join(DATA_DIR, 'chat-greeting.json');

interface ChannelGreetingConfig {
  enabled: boolean;
  message: string;
}

let chatClient: ChatClient | null = null;
let enterGiveawayFn: typeof enterGiveaway | null = null;
let addTicketsFn: typeof addTickets | null = null;

const joinedChannels = new Set<string>();

// Greeting state
let greetingConfigs: Record<string, ChannelGreetingConfig> = {};
const pendingGreetings = new Map<string, NodeJS.Timeout>();
const greetingRateLimiter = new Map<string, number>(); // channel -> last send timestamp

const DEFAULT_GREETING_MESSAGE = '¡Bienvenido {user} al canal!';
const GREETING_INTERVAL_MS = 2000; // min 2s between greetings per channel

function loadGreetingConfigs() {
  try {
    if (fs.existsSync(GREETING_CONFIG_FILE)) {
      greetingConfigs = JSON.parse(fs.readFileSync(GREETING_CONFIG_FILE, 'utf-8'));
    }
  } catch (e) {
    logger.error({ err: e }, 'Failed to load greeting configs');
  }
}

function saveGreetingConfigs() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(GREETING_CONFIG_FILE, JSON.stringify(greetingConfigs, null, 2));
  } catch (e) {
    logger.error({ err: e }, 'Failed to save greeting configs');
  }
}

function getGreetingConfig(channel: string): ChannelGreetingConfig {
  return greetingConfigs[channel] || { enabled: false, message: DEFAULT_GREETING_MESSAGE };
}

function setGreetingConfig(channel: string, config: Partial<ChannelGreetingConfig>) {
  const current = getGreetingConfig(channel);
  greetingConfigs[channel] = { ...current, ...config };
  saveGreetingConfigs();
}

function sendGreeting(channelName: string, user: string, key: string, message: string) {
  const now = Date.now();
  const last = greetingRateLimiter.get(channelName) ?? 0;
  const elapsed = now - last;

  if (elapsed >= GREETING_INTERVAL_MS) {
    greetingRateLimiter.set(channelName, now);
    pendingGreetings.delete(key);
    const msg = message.replace(/\{user\}/g, `@${user}`);
    sendMessage(channelName, msg);
  } else {
    const waitMs = GREETING_INTERVAL_MS - elapsed;
    const newTimer = setTimeout(() => {
      greetingRateLimiter.set(channelName, Date.now());
      pendingGreetings.delete(key);
      const msg = message.replace(/\{user\}/g, `@${user}`);
      sendMessage(channelName, msg);
    }, waitMs);
    // Track the new timer so onPart can cancel it
    pendingGreetings.set(key, newTimer);
  }
}

export async function setupChat() {
  if (!authProvider || !currentUser) {
    logger.debug('Auth not ready or no user logged in, skipping chat setup');
    return;
  }

  if (chatClient) {
    try {
      await chatClient.quit();
    } catch (err) {
      logger.warn({ err }, 'Error quitting previous chat client');
    }
    chatClient = null;
  }

  loadGreetingConfigs();

  chatClient = new ChatClient({ authProvider, channels: [], requestMembershipEvents: true });

  chatClient.onDisconnect((manually, reason) => {
    logger.info({ manually, reason: reason?.message || reason }, 'Chat client disconnected');
  });

  chatClient.onAuthenticationSuccess(() => {
    logger.info('Chat authentication successful');
  });

  chatClient.onAuthenticationFailure((message, retryCount) => {
    logger.error({ retryCount, message }, 'Chat client authentication failed');
  });

  chatClient.onTokenFetchFailure((error) => {
    logger.error({ error: error.message }, 'Chat token fetch failed');
  });

  logger.info('Chat client connecting...');
  await chatClient.connect();

  chatClient.onMessage((channel, user, text, msg) => {
    const channelName = channel.replace('#', '');
    logger.debug({ user, channel: channelName, text }, 'Received Twitch chat message');

    const subTier = getSubTier(msg.userInfo.badges);
    handleCommands(channelName, user, text, subTier);
    incrementChatCounter(channelName, user);

    const io = getIO();
    io.to(`channel:${channelName}`).emit('chat:message', {
      id: msg.id,
      user: {
        id: msg.userInfo.userId,
        displayName: msg.userInfo.displayName,
        color: msg.userInfo.color || '#ffffff',
        badges: Array.from(msg.userInfo.badges.keys()),
      },
      text,
      timestamp: Date.now(),
    });

    checkMessage(channelName, user, text);
  });

  chatClient.onJoin((channel, user) => {
    const channelName = channel.replace('#', '');
    const config = getGreetingConfig(channelName);
    if (!config.enabled) return;

    if (user.toLowerCase() === currentUser?.login?.toLowerCase()) return;

    const key = `${channelName}:${user.toLowerCase()}`;
    const existing = pendingGreetings.get(key);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      sendGreeting(channelName, user, key, config.message);
    }, 30000);
    pendingGreetings.set(key, timer);
  });

  chatClient.onPart((channel, user) => {
    const channelName = channel.replace('#', '');
    const key = `${channelName}:${user.toLowerCase()}`;
    const timer = pendingGreetings.get(key);
    if (timer) {
      clearTimeout(timer);
      pendingGreetings.delete(key);
    }
  });

  for (const ch of joinedChannels) {
    try {
      await chatClient.join(ch);
      logger.info({ channel: ch }, 'Re-joined channel');
    } catch (err) {
      logger.error({ channel: ch, err }, 'Failed to re-join channel');
    }
  }
}

export function setupChatGreeting(app: FastifyInstance) {
  app.get('/chat/greeting-config', async (req, reply) => {
    const query = req.query as { channel?: string };
    if (!query.channel) return reply.status(400).send({ error: 'channel required' });
    return getGreetingConfig(query.channel);
  });

  app.put('/chat/greeting-config', async (req, reply) => {
    const parsed = ChatGreetingConfigSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: 'Invalid body', details: parsed.error.flatten() });

    const body = parsed.data;
    const updates: Partial<ChannelGreetingConfig> = {};
    if (body.enabled !== undefined) updates.enabled = body.enabled;
    if (body.message !== undefined) updates.message = body.message;
    setGreetingConfig(body.channel, updates);
    return { ok: true };
  });
}

function getSubTier(badges: Map<string, string>): number {
  const version = badges.get('subscriber');
  if (version === undefined) return 0;
  const tier = parseInt(version, 10);
  if (isNaN(tier)) return 1;
  return Math.min(tier, 2) + 1;
}

function handleCommands(channel: string, user: string, text: string, subTier = 0) {
  const parts = text.trim().split(/\s+/);
  const cmd = parts[0]?.toLowerCase();

  switch (cmd) {
    case '!sorteo':
      if (enterGiveawayFn) {
        enterGiveawayFn(channel, user, subTier);
      }
      break;
    case '!predict':
    case '!votar':
      break;
  }

  checkCustomCommand(channel, user, text).then((response) => {
    if (response) {
      sendMessage(channel, response);
    }
  });
}

export function setEnterGiveaway(fn: typeof enterGiveaway) {
  enterGiveawayFn = fn;
}

export function setAddTickets(fn: typeof addTickets) {
  addTicketsFn = fn;
}

export function getAddTicketsFn() {
  return addTicketsFn;
}

export async function joinChannel(channel: string) {
  if (joinedChannels.has(channel)) return;
  joinedChannels.add(channel);
  if (!chatClient) {
    logger.debug({ channel }, 'Channel queued (chat client not ready)');
    return;
  }
  try {
    await chatClient.join(channel);
    logger.info({ channel }, 'Joined channel');
  } catch (err) {
    joinedChannels.delete(channel);
    logger.error({ channel, err }, 'Failed to join channel');
  }
}

export async function leaveChannel(channel: string) {
  if (!joinedChannels.has(channel)) return;
  joinedChannels.delete(channel);
  if (!chatClient) return;
  chatClient.part(channel);
  logger.info({ channel }, 'Left channel');
}

export async function sendMessage(channel: string, message: string) {
  if (!chatClient) {
    logger.warn('Chat client not ready, cannot send message');
    return;
  }
  try {
    await chatClient.say(channel, message);
    const io = getIO();
    io.to(`channel:${channel}`).emit('chat:message', {
      id: `send-${Date.now()}`,
      user: {
        id: currentUser?.id ?? 'self',
        displayName: currentUser?.displayName ?? 'StreamDaemon',
        color: '#7c3aed',
        badges: ['broadcaster'],
      },
      text: message,
      timestamp: Date.now(),
    });
    logger.debug({ channel, message: message.substring(0, 50) }, 'Message sent');
  } catch (err) {
    logger.error({ channel, err }, 'Failed to send message');
  }
}
