import { FastifyInstance } from 'fastify';
import { ApiClient } from '@twurple/api';
import { authProvider } from '../auth/index.js';
import { getIO } from '../socket/index.js';
import type { HudData } from '@streamdaemon/shared';
import { recordSnapshot } from '../kpi/index.js';

let pollInterval: ReturnType<typeof setInterval> | null = null;

async function fetchHud(channelName: string): Promise<HudData | null> {
  try {
    if (!authProvider) return null;
    const api = new ApiClient({ authProvider });
    const user = await api.users.getUserByName(channelName);
    if (!user) return null;

    const stream = await api.streams.getStreamByUserId(user.id);

    let totalFollowers = 0;
    let lastFollower: string | null = null;
    try {
      const followInfo = await api.channels.getChannelFollowers(user.id, user.id);
      totalFollowers = followInfo.total;
      if (followInfo.data.length > 0) {
        lastFollower = followInfo.data[0].userDisplayName;
      }
    } catch (e: any) {
      console.warn(`[HUD] Followers fetch failed for ${channelName}: ${e?.message ?? e}`);
    }

    let totalSubs = 0;
    let lastSubscriber: string | null = null;
    try {
      const subs = await api.subscriptions.getSubscriptions(user.id);
      totalSubs = subs.total;
      if (subs.data.length > 0) {
        lastSubscriber = subs.data[0].userDisplayName;
      }
    } catch (e: any) {
      console.warn(`[HUD] Subs fetch failed for ${channelName}: ${e?.message ?? e}`);
    }

    return {
      viewers: stream?.viewers ?? 0,
      followers: totalFollowers,
      subscribers: totalSubs,
      uptimeSeconds: stream?.startDate
        ? Math.floor((Date.now() - stream.startDate.getTime()) / 1000)
        : 0,
      streamTitle: stream?.title ?? user.displayName,
      gameName: stream?.gameName ?? '',
      startedAt: stream?.startDate?.toISOString() ?? null,
      isLive: !!stream,
      lastFollower,
      lastSubscriber,
    };
  } catch (e: any) {
    console.warn(`[HUD] fetchHud failed for ${channelName}: ${e?.message ?? e}`);
    return null;
  }
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
      if (data) {
        getIO().to(`channel:${channel}`).emit('hud:update', data);
        // Fetch active chatters count for KPI audience graph
        let chattersCount = 0;
        try {
          if (authProvider && data.isLive) {
            const api = new ApiClient({ authProvider });
            const user = await api.users.getUserByName(channel);
            if (user) {
              const chattersResult = await api.chat.getChatters(user.id);
              chattersCount = chattersResult.data.length;
            }
          }
        } catch { /* ignore chatters fetch errors */ }
        recordSnapshot(channel.toLowerCase(), data.viewers, chattersCount);
      }
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

  // Update stream title / game / tags
  app.put('/hud/stream/info', async (req, reply) => {
    const { channel, title, gameName, tags } = req.body as { channel: string; title?: string; gameName?: string; tags?: string[] };
    if (!channel) return reply.status(400).send({ error: 'Missing channel' });

    try {
      if (!authProvider) return reply.status(503).send({ error: 'Not authenticated' });
      const api = new ApiClient({ authProvider });
      const user = await api.users.getUserByName(channel);
      if (!user) return reply.status(404).send({ error: 'User not found' });

      const update: Record<string, any> = {};
      if (title !== undefined) update.title = title;
      if (gameName !== undefined && gameName) {
        const result = await api.search.searchCategories(gameName);
        const found = result.data?.[0];
        if (found) update.gameId = found.id;
      }
      if (tags !== undefined) update.tags = tags;

      if (Object.keys(update).length > 0) {
        await api.channels.updateChannelInfo(user.id, update as any);
      }

      reply.send({ ok: true });
    } catch (err: any) {
      const msg = err?.message ?? '';
      if (msg.includes('scope') || msg.includes('channel:manage:broadcast')) {
        reply.status(403).send({ error: 'missing_scope', message: 'Tu token de Twitch no tiene el permiso necesario (channel:manage:broadcast). Desconectá y volvé a conectar Twitch en Configuración para actualizar los permisos.' });
      } else {
        reply.status(500).send({ error: err?.message ?? 'Failed to update stream info' });
      }
    }
  });

  // Search games / categories
  app.get('/hud/games/search', async (req, reply) => {
    const { query } = req.query as { query?: string };
    if (!query) return reply.status(400).send({ error: 'Missing query' });

    try {
      if (!authProvider) return reply.status(503).send({ error: 'Not authenticated' });
      const api = new ApiClient({ authProvider });
      const result = await api.search.searchCategories(query);
      reply.send(result.data.map((g) => ({ id: g.id, name: g.name, boxArtUrl: g.boxArtUrl })));
    } catch (err: any) {
      reply.status(500).send({ error: err?.message ?? 'Search failed' });
    }
  });

  // Get current channel tags and stream info
  app.get('/hud/tags/:channel', async (req, reply) => {
    const { channel } = req.params as { channel: string };
    if (!channel) return reply.status(400).send({ error: 'Missing channel' });

    try {
      if (!authProvider) return reply.status(503).send({ error: 'Not authenticated' });
      const api = new ApiClient({ authProvider });
      const user = await api.users.getUserByName(channel);
      if (!user) return reply.status(404).send({ error: 'User not found' });

      const [channelInfo, stream] = await Promise.all([
        api.channels.getChannelInfoById(user.id),
        api.streams.getStreamByUserId(user.id),
      ]);

      // Fetch all available stream tags from the Twitch API directly
      let allTags: Array<{ id: string; name: string; isAuto: boolean }> = [];
      // NOTE: The /tags/streams Twitch API is deprecated and returns 410 Gone.
      // Twitch now uses freeform string tags instead of a predefined dictionary.

      // Fallback: if the allTags list is empty but the channel has active tags,
      // create basic entries from the active tag IDs
      const activeTags: string[] = channelInfo?.tags ?? [];
      if (allTags.length === 0 && activeTags.length > 0) {
        allTags = activeTags.map((tagId) => ({
          id: tagId,
          name: tagId.slice(0, 20),
          isAuto: false,
        }));
      }

      reply.send({
        allTags,
        activeTagIds: activeTags,
        gameId: stream?.gameId ?? null,
        gameName: stream?.gameName ?? '',
      });
    } catch (err: any) {
      reply.status(500).send({ error: err?.message ?? 'Failed to fetch tags' });
    }
  });
}
