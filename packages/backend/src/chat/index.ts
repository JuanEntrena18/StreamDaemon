import { ChatClient } from '@twurple/chat';
import { getIO } from '../socket/index.js';
import { authProvider, currentUser } from '../auth/index.js';
import { checkCustomCommand } from '../commands/index.js';
import type { enterGiveaway } from '../giveaways/index.js';

let chatClient: ChatClient | null = null;
let enterGiveawayFn: typeof enterGiveaway | null = null;

export function setupChat() {
  if (!authProvider || !currentUser) {
    console.log('⏳ Auth not ready or no user logged in, skipping chat setup');
    return;
  }

  if (chatClient) {
    chatClient.quit();
  }

  chatClient = new ChatClient({ authProvider, channels: [] });
  chatClient.connect();

  chatClient.onMessage((channel, user, text, msg) => {
    const channelName = channel.replace('#', '');

    handleCommands(channelName, user, text);

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
  });

  console.log('💬 Chat client connected');
}

function handleCommands(channel: string, user: string, text: string) {
  const parts = text.trim().split(/\s+/);
  const cmd = parts[0]?.toLowerCase();

  switch (cmd) {
    case '!sorteo':
      if (enterGiveawayFn) {
        enterGiveawayFn(channel, user);
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

const joinedChannels = new Set<string>();

export function joinChannel(channel: string) {
  if (chatClient && !joinedChannels.has(channel)) {
    joinedChannels.add(channel);
    chatClient.join(channel);
    console.log(`📡 Joined channel: ${channel}`);
  }
}

export function leaveChannel(channel: string) {
  if (chatClient && joinedChannels.has(channel)) {
    joinedChannels.delete(channel);
    chatClient.part(channel);
    console.log(`📡 Left channel: ${channel}`);
  }
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
