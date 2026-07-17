import { FastifyInstance } from 'fastify';
import { Server as SocketIOServer } from 'socket.io';
import { joinChannel, leaveChannel, sendMessage } from '../chat/index.js';
import { handleSpeedrunControl, handleGetState, handleSpeedrunConfig } from '../speedrun/index.js';
import { handleGetCalendar } from '../calendar/index.js';
import { handleGetDiary } from '../diary/index.js';
import { handleGetAds } from '../ads/index.js';

let io: SocketIOServer | null = null;
const chatThrottle = new Map<string, number>();

export function setupSocketIO(app: FastifyInstance) {
  io = new SocketIOServer(app.server, {
    cors: { origin: ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000', 'http://127.0.0.1:5173', 'file://'] },
  });

  io.on('connection', (socket) => {
    console.log(`⚡ Client connected: ${socket.id}`);

    socket.on('join:channel', async (channel: string) => {
      socket.join(`channel:${channel}`);
      await joinChannel(channel);
    });

    socket.on('leave:channel', async (channel: string) => {
      socket.leave(`channel:${channel}`);
      await leaveChannel(channel);
    });

    socket.on('chat:send', async ({ channel, text }: { channel: string; text: string }) => {
      if (!channel || !text) return;
      const last = chatThrottle.get(socket.id) ?? 0;
      if (Date.now() - last < 1500) return;
      chatThrottle.set(socket.id, Date.now());
      await sendMessage(channel, text);
    });

    socket.on('speedrun:control', ({ channel, action }: { channel: string; action: string }) => {
      handleSpeedrunControl(channel, action);
    });

    socket.on('speedrun:get-state', ({ channel }: { channel: string }) => {
      handleGetState(channel);
    });

    socket.on('speedrun:config', ({ channel, config }: { channel: string; config: any }) => {
      handleSpeedrunConfig(channel, config);
    });

    socket.on('calendar:get-state', ({ channel }: { channel: string }) => {
      handleGetCalendar(channel);
    });

    socket.on('diary:get-state', ({ channel }: { channel: string }) => {
      handleGetDiary(channel);
    });

    socket.on('ads:get-state', ({ channel }: { channel: string }) => {
      handleGetAds(channel);
    });

    socket.on('disconnect', () => {
      chatThrottle.delete(socket.id);
      console.log(`❌ Client disconnected: ${socket.id}`);
    });
  });
}

export function getIO(): SocketIOServer {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
}
