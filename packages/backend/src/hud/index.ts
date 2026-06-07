import { FastifyInstance } from 'fastify';
import { ApiClient } from '@twurple/api';
import { authProvider } from '../auth/index.js';
import { getIO } from '../socket/index.js';
import type { HudData } from '@streamforger/shared';

let pollInterval: ReturnType<typeof setInterval> | null = null;

async function fetchHud(channelName: string): Promise<HudData | null> {
  if (!authProvider) return null;
  const api = new ApiClient({ authProvider });
  const user = await api.users.getUserByName(channelName);
  if (!user) return null;

  const stream = await api.streams.getStreamByUserId(user.id);
  const followInfo = await api.channels.getChannelFollowers(user.id);
  const subs = await api.subscriptions.getSubscriptions(user.id);

  return {
    viewers: stream?.viewers ?? 0,
    followers: followInfo.total,
    subscribers: subs.total,
    uptimeSeconds: stream?.startDate
      ? Math.floor((Date.now() - stream.startDate.getTime()) / 1000)
      : 0,
    streamTitle: stream?.title ?? user.displayName,
    gameName: stream?.gameName ?? '',
    startedAt: stream?.startDate?.toISOString() ?? null,
    isLive: !!stream,
  };
}

export function setupHud(app: FastifyInstance) {
  app.get('/hud/:channel', async (req, reply) => {
    const { channel } = req.params as { channel: string };
    if (!channel) return reply.status(400).send({ error: 'Missing channel' });
    const data = await fetchHud(channel);
    if (!data) return reply.status(503).send({ error: 'HUD not available' });
    return data;
  });

  app.post('/hud/start-poll', async (req, reply) => {
    const { channel, interval = 10 } = req.body as { channel: string; interval?: number };
    if (!channel) return reply.status(400).send({ error: 'Missing channel' });
    if (pollInterval) clearInterval(pollInterval);
    pollInterval = setInterval(async () => {
      const data = await fetchHud(channel);
      if (data) getIO().to(`channel:${channel}`).emit('hud:update', data);
    }, interval * 1000);
    reply.send({ ok: true, interval });
  });

  app.post('/hud/stop-poll', async (_req, reply) => {
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
    reply.send({ ok: true });
  });
}
