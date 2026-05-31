import { FastifyInstance } from 'fastify';
import { Server as SocketIOServer } from 'socket.io';

let io: SocketIOServer | null = null;

export function setupSocketIO(app: FastifyInstance) {
  io = new SocketIOServer(app.server, {
    cors: { origin: true, credentials: true },
  });

  io.on('connection', (socket) => {
    console.log(`⚡ Client connected: ${socket.id}`);

    socket.on('join:channel', (channel: string) => {
      socket.join(`channel:${channel}`);
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
