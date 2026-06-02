import { FastifyInstance } from 'fastify';
import { Server as SocketIOServer } from 'socket.io';
import { joinChannel, leaveChannel, sendMessage } from '../chat/index.js';

let io: SocketIOServer | null = null;

export function setupSocketIO(app: FastifyInstance) {
  io = new SocketIOServer(app.server, {
    cors: { origin: true, credentials: true },
  });

  io.on('connection', (socket) => {
    console.log(`⚡ Client connected: ${socket.id}`);

    socket.on('join:channel', (channel: string) => {
      socket.join(`channel:${channel}`);
      joinChannel(channel);
    });

    socket.on('leave:channel', (channel: string) => {
      socket.leave(`channel:${channel}`);
      leaveChannel(channel);
    });

    socket.on('chat:send', ({ channel, text }: { channel: string; text: string }) => {
      if (!channel || !text) return;
      sendMessage(channel, text);
    });

    socket.on('disconnect', () => {
      console.log(`❌ Client disconnected: ${socket.id}`);
    });
  });
}

export function getIO(): SocketIOServer {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
}
