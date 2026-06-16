import { ChatClient } from '@twurple/chat';
import { getIO } from '../socket/index.js';
import { authProvider, currentUser } from '../auth/index.js';
import { checkCustomCommand } from '../commands/index.js';
import { checkMessage } from '../security/index.js';
import type { enterGiveaway, addTickets } from '../giveaways/index.js';

let chatClient: ChatClient | null = null;
let enterGiveawayFn: typeof enterGiveaway | null = null;
let addTicketsFn: typeof addTickets | null = null;

const joinedChannels = new Set<string>();

export async function setupChat() {
  if (!authProvider || !currentUser) {
    console.log('⏳ Auth not ready or no user logged in, skipping chat setup');
    return;
  }

  if (chatClient) {
    chatClient.quit();
    chatClient = null;
  }

  chatClient = new ChatClient({ authProvider, channels: [] });

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

  // Re-join all previously joined channels on the new connection
  for (const ch of joinedChannels) {
    try {
      await chatClient.join(ch);
      console.log(`📡 Re-joined channel: ${ch}`);
    } catch (err) {
      console.error(`❌ Failed to re-join channel ${ch}:`, err);
    }
  }
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

  // Check custom commands — respond if matched
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
