import { FastifyInstance } from 'fastify';
import { ApiClient } from '@twurple/api';
import { authProvider } from '../auth/index.js';

export function setupMod(app: FastifyInstance) {
  app.get('/mod/chatters/:channel', async (req, reply) => {
    const { channel } = req.params as { channel: string };
    if (!channel) return reply.status(400).send({ error: 'Missing channel' });
    if (!authProvider) return reply.status(503).send({ error: 'Not authenticated' });

    try {
      const api = new ApiClient({ authProvider });
      const user = await api.users.getUserByName(channel);
      if (!user) return reply.status(404).send({ error: 'Channel not found' });

      const result = await api.chat.getChatters(user.id);
      const allChatters = result.data.map((c) => ({
        userName: c.userName,
        userDisplayName: c.userDisplayName,
      }));
      return reply.send({ chatters: allChatters });
    } catch (err: any) {
      return reply.status(500).send({ error: err?.message ?? 'Failed to fetch chatters' });
    }
  });

  app.post('/mod/timeout', async (req, reply) => {
    const { channel, userName: targetName, duration, reason } = req.body as {
      channel: string; userName: string; duration?: number; reason?: string;
    };
    if (!channel || !targetName) return reply.status(400).send({ error: 'Missing channel or userName' });
    if (!authProvider) return reply.status(503).send({ error: 'Not authenticated' });

    try {
      const api = new ApiClient({ authProvider });
      const user = await api.users.getUserByName(channel);
      const target = await api.users.getUserByName(targetName);
      if (!user || !target) return reply.status(404).send({ error: 'User not found' });

      await api.moderation.banUser(user.id, {
        user: target.id,
        duration: duration ?? 300,
        reason: reason ?? '',
      });
      return reply.send({ ok: true });
    } catch (err: any) {
      return reply.status(500).send({ error: err?.message ?? 'Failed to timeout user' });
    }
  });

  app.post('/mod/ban', async (req, reply) => {
    const { channel, userName: targetName, reason } = req.body as {
      channel: string; userName: string; reason?: string;
    };
    if (!channel || !targetName) return reply.status(400).send({ error: 'Missing channel or userName' });
    if (!authProvider) return reply.status(503).send({ error: 'Not authenticated' });

    try {
      const api = new ApiClient({ authProvider });
      const user = await api.users.getUserByName(channel);
      const target = await api.users.getUserByName(targetName);
      if (!user || !target) return reply.status(404).send({ error: 'User not found' });

      await api.moderation.banUser(user.id, {
        user: target.id,
        reason: reason ?? '',
      });
      return reply.send({ ok: true });
    } catch (err: any) {
      return reply.status(500).send({ error: err?.message ?? 'Failed to ban user' });
    }
  });

  app.post('/mod/unban', async (req, reply) => {
    const { channel, userName: targetName } = req.body as {
      channel: string; userName: string;
    };
    if (!channel || !targetName) return reply.status(400).send({ error: 'Missing channel or userName' });
    if (!authProvider) return reply.status(503).send({ error: 'Not authenticated' });

    try {
      const api = new ApiClient({ authProvider });
      const user = await api.users.getUserByName(channel);
      const target = await api.users.getUserByName(targetName);
      if (!user || !target) return reply.status(404).send({ error: 'User not found' });

      await api.moderation.unbanUser(user.id, target.id);
      return reply.send({ ok: true });
    } catch (err: any) {
      return reply.status(500).send({ error: err?.message ?? 'Failed to unban user' });
    }
  });
}
