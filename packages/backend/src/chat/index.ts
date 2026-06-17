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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../../data');
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

const DEFAULT_GREETING_MESSAGE = '¡Bienvenido @{user} al canal!';

function loadGreetingConfigs() {
  try {
    if (fs.existsSync(GREETING_CONFIG_FILE)) {
      greetingConfigs = JSON.parse(fs.readFileSync(GREETING_CONFIG_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Failed to load greeting configs:', e);
  }
}

function saveGreetingConfigs() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(GREETING_CONFIG_FILE, JSON.stringify(greetingConfigs, null, 2));
  } catch (e) {
    console.error('Failed to save greeting configs:', e);
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

export async function setupChat() {
  if (!authProvider || !currentUser) {
    console.log('⏳ Auth not ready or no user logged in, skipping chat setup');
    return;
  }

  if (chatClient) {
    chatClient.quit();
    chatClient = null;
  }

  loadGreetingConfigs();

  chatClient = new ChatClient({ authProvider, channels: [], requestMembershipEvents: true });

  chatClient.onDisconnect((manually, reason) => {
    console.log(`❌ Chat client disconnected (manually=${manually}): ${reason?.message || reason}`);
  });

  chatClient.onAuthenticationSuccess(() => {
    console.log('🔑 Chat authentication successful');
  });

  chatClient.onAuthenticationFailure((message, retryCount) => {
    console.error(`❌ Chat client authentication failed (attempt ${retryCount}): ${message}`);
  });

  chatClient.onTokenFetchFailure((error) => {
    console.error('❌ Chat token fetch failed:', error.message);
  });

  chatClient.connect();
  console.log('💬 Chat client connecting...');

  chatClient.onMessage((channel, user, text, msg) => {
    const channelName = channel.replace('#', '');

    const subTier = getSubTier(msg.userInfo.badges);
    handleCommands(channelName, user, text, subTier);

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
    if (pendingGreetings.has(key)) return;

    const timer = setTimeout(() => {
      pendingGreetings.delete(key);
      const msg = config.message.replace(/\{user\}/g, `@${user}`);
      sendMessage(channelName, msg);
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
      console.log(`📡 Re-joined channel: ${ch}`);
    } catch (err) {
      console.error(`❌ Failed to re-join channel ${ch}:`, err);
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
    const body = req.body as { channel: string; enabled?: boolean; message?: string } | null;
    if (!body?.channel) return reply.status(400).send({ error: 'channel required' });
    const updates: Partial<ChannelGreetingConfig> = {};
    if (typeof body.enabled === 'boolean') updates.enabled = body.enabled;
    if (typeof body.message === 'string' && body.message.trim()) updates.message = body.message.trim();
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

  checkCustomCommand(channel, text).then((response) => {
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
    console.log(`⏳ Channel ${channel} queued (chat client not ready)`);
    return;
  }
  try {
    await chatClient.join(channel);
    console.log(`📡 Joined channel: ${channel}`);
  } catch (err) {
    joinedChannels.delete(channel);
    console.error(`❌ Failed to join channel ${channel}:`, err);
  }
}

export async function leaveChannel(channel: string) {
  if (!joinedChannels.has(channel)) return;
  joinedChannels.delete(channel);
  if (!chatClient) return;
  chatClient.part(channel);
  console.log(`📡 Left channel: ${channel}`);
}

export async function sendMessage(channel: string, message: string) {
  if (!chatClient) {
    console.warn('⚠️ Chat client not ready, cannot send message');
    return;
  }
  try {
    await chatClient.say(channel, message);
    const io = getIO();
    io.to(`channel:${channel}`).emit('chat:message', {
      id: `send-${Date.now()}`,
      user: {
        id: currentUser?.id ?? 'self',
        displayName: currentUser?.displayName ?? 'StreamForger',
        color: '#7c3aed',
        badges: ['broadcaster'],
      },
      text: message,
      timestamp: Date.now(),
    });
    console.log(`📤 Message sent to #${channel}: ${message.substring(0, 50)}`);
  } catch (err) {
    console.error(`❌ Failed to send message to #${channel}:`, err);
  }
}
