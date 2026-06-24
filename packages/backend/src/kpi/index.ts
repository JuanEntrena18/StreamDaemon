import { FastifyInstance } from 'fastify';
import { ApiClient } from '@twurple/api';
import { getRawData } from '@twurple/common';
import { authProvider, currentUser } from '../auth/index.js';
import { getIO } from '../socket/index.js';
import { getEvents } from '../activity/index.js';
import type { ViewerSnapshot, KpiOverview, GamePerformance, BestSlot } from '@streamforger/shared';

const MAX_SNAPSHOTS = 120;
const snapshots = new Map<string, ViewerSnapshot[]>();

let chatMessageCount = 0;
let chatMessageInterval: ReturnType<typeof setInterval> | null = null;

export function resetChatCounter() { chatMessageCount = 0; }
export function incrementChatCounter() { chatMessageCount++; }
export function getChatMessagesPerMinute(): number { return chatMessageCount; }

export function recordSnapshot(channel: string, viewers: number, chattersActive: number) {
  if (!snapshots.has(channel)) snapshots.set(channel, []);
  const list = snapshots.get(channel)!;
  list.push({ timestamp: Date.now(), viewers, chattersActive });
  while (list.length > MAX_SNAPSHOTS) list.shift();
}

function getChannelSnapshots(channel: string): ViewerSnapshot[] {
  return snapshots.get(channel) ?? [];
}

const VALID_PERIODS = ['7d', '30d', '90d', 'all'] as const;
type Period = typeof VALID_PERIODS[number];

function parsePeriod(p: string): Period {
  return VALID_PERIODS.includes(p as Period) ? p as Period : '7d';
}

function getStartDate(period: Period): Date | undefined {
  if (period === 'all') return undefined;
  const days = parseInt(period);
  return new Date(Date.now() - days * 86400000);
}

export function setupKpi(app: FastifyInstance) {
  if (!chatMessageInterval) {
    chatMessageInterval = setInterval(() => { chatMessageCount = 0; }, 60000);
  }

  app.get('/kpi/overview/:channel', async (req, reply) => {
    try {
      if (!authProvider) return reply.status(401).send({ error: 'Not authenticated' });
      const { channel } = req.params as { channel: string };
      const { period: periodStr } = req.query as { period?: string };
      const period = parsePeriod(periodStr || '30d');

      const apiClient = new ApiClient({ authProvider });
      const user = await apiClient.users.getUserByName(channel);
      if (!user) return reply.status(404).send({ error: 'Channel not found' });

      const startDate = getStartDate(period);

      const [followInfo, subInfo, videos] = await Promise.all([
        apiClient.channels.getChannelFollowers(user.id, user.id).catch(() => ({ total: 0 })),
        apiClient.subscriptions.getSubscriptions(user.id).catch(() => ({ total: 0 })),
        apiClient.videos.getVideosByUser(user.id, { type: 'archive', period: 'all', limit: 100 }).catch(() => ({ data: [] })),
      ]);

      const filteredVideos = startDate
        ? videos.data.filter(v => v.creationDate >= startDate)
        : videos.data;

      const events = getEvents(channel.toLowerCase());

      let totalHoursStreamed = 0;
      let totalViews = 0;
      let peakViewers = 0;
      let totalFollowersGained = 0;
      let totalSubsGained = 0;
      let totalBitsDonated = 0;

      for (const video of filteredVideos) {
        const durationH = video.durationInSeconds / 3600;
        totalHoursStreamed += durationH;
        totalViews += video.views;

        const startTime = video.creationDate.getTime();
        const endTime = startTime + video.durationInSeconds * 1000;
        const streamEvents = events.filter(e => e.timestamp >= startTime && e.timestamp <= endTime);

        const followersGained = streamEvents.filter(e => e.type === 'follow').length;
        totalFollowersGained += followersGained;
        const subsGained = streamEvents.filter(e => e.type === 'sub' || e.type === 'resub' || e.type === 'gift').length;
        totalSubsGained += subsGained;
        const bitsDonated = streamEvents.filter(e => e.type === 'cheer').reduce((sum, e) => sum + (e.amount || 0), 0);
        totalBitsDonated += bitsDonated;

        peakViewers = Math.max(peakViewers, video.views);
      }

      const totalSubs = subInfo.total;
      const totalFollowers = followInfo.total;
      const subToFollowRatio = totalFollowers > 0 ? totalSubs / totalFollowers : 0;
      const avgViewers = filteredVideos.length > 0 ? totalViews / filteredVideos.length : 0;
      const estimatedRevenue = totalSubsGained * 2.49 + totalBitsDonated * 0.01;

      const overview: KpiOverview = {
        channel,
        followers: totalFollowers,
        subscribers: totalSubs,
        subToFollowRatio: Math.round(subToFollowRatio * 100) / 100,
        avgViewers: Math.round(avgViewers),
        peakViewers,
        totalViews,
        totalHoursStreamed: Math.round(totalHoursStreamed * 100) / 100,
        followersGained: totalFollowersGained,
        subsGained: totalSubsGained,
        bitsDonated: totalBitsDonated,
        estimatedRevenue: Math.round(estimatedRevenue * 100) / 100,
        streamsThisPeriod: filteredVideos.length,
        isLive: false,
      };

      return overview;
    } catch (err) {
      req.log.error(err, 'KPI overview failed');
      return reply.status(500).send({ error: 'Failed to fetch KPI data' });
    }
  });

  app.get('/kpi/viewers-history/:channel', async (req, reply) => {
    try {
      const { channel } = req.params as { channel: string };
      const snapshots = getChannelSnapshots(channel.toLowerCase());
      return { channel, snapshots, activeViewers: snapshots.length > 0 ? snapshots[snapshots.length - 1].viewers : 0 };
    } catch (err) {
      return reply.status(500).send({ error: 'Failed to fetch viewer history' });
    }
  });

  app.get('/kpi/game-performance/:channel', async (req, reply) => {
    try {
      if (!authProvider) return reply.status(401).send({ error: 'Not authenticated' });
      const { channel } = req.params as { channel: string };
      const { period: periodStr } = req.query as { period?: string };
      const period = parsePeriod(periodStr || '30d');

      const apiClient = new ApiClient({ authProvider });
      const user = await apiClient.users.getUserByName(channel);
      if (!user) return reply.status(404).send({ error: 'Channel not found' });

      const startDate = getStartDate(period);
      const videos = await apiClient.videos.getVideosByUser(user.id, { type: 'archive', period: 'all', limit: 100 }).catch(() => ({ data: [] }));

      const filteredVideos = startDate
        ? videos.data.filter(v => v.creationDate >= startDate)
        : videos.data;

      const channelInfo = await apiClient.channels.getChannelInfoById(user.id);
      const fallbackGameName = channelInfo?.gameName || 'General';
      const fallbackGameId = channelInfo?.gameId || '';

      const gameMap = new Map<string, { views: number[]; durations: number[]; count: number; followersGained: number; boxArtUrl?: string }>();
      const events = getEvents(channel.toLowerCase());

      for (const video of filteredVideos) {
        const gameName = (raw.game_name && raw.game_name !== 'Unknown') ? raw.game_name : fallbackGameName;
        if (!gameMap.has(gameName)) gameMap.set(gameName, { views: [], durations: [], count: 0, followersGained: 0 });
        const entry = gameMap.get(gameName)!;
        entry.views.push(video.views);
        entry.durations.push(video.durationInSeconds);
        entry.count++;
        const startTime = video.creationDate.getTime();
        const endTime = startTime + video.durationInSeconds * 1000;
        entry.followersGained += events.filter(e => e.timestamp >= startTime && e.timestamp <= endTime && e.type === 'follow').length;
      }

      // Fetch box art URLs for games
      for (const gameName of gameMap.keys()) {
        try {
          const game = await apiClient.games.getGameByName(gameName);
          if (game) {
            // Replace {width}x{height} with e.g. 144x192
            gameMap.get(gameName)!.boxArtUrl = game.boxArtUrl.replace('{width}', '144').replace('{height}', '192');
          }
        } catch (e) {
          // ignore
        }
      }

      const games: GamePerformance[] = Array.from(gameMap.entries()).map(([gameName, data]) => ({
        gameName,
        boxArtUrl: data.boxArtUrl,
        streamCount: data.count,
        totalViews: data.views.reduce((a, b) => a + b, 0),
        avgViewers: Math.round(data.views.reduce((a, b) => a + b, 0) / data.count),
        maxViewers: Math.max(...data.views),
        followersGained: data.followersGained,
        avgDuration: Math.round(data.durations.reduce((a, b) => a + b, 0) / data.count),
      })).sort((a, b) => b.totalViews - a.totalViews);

      return { channel, games };
    } catch (err) {
      return reply.status(500).send({ error: 'Failed to fetch game performance' });
    }
  });

  app.get('/kpi/best-slots/:channel', async (req, reply) => {
    try {
      if (!authProvider) return reply.status(401).send({ error: 'Not authenticated' });
      const { channel } = req.params as { channel: string };
      const { period: periodStr } = req.query as { period?: string };
      const period = parsePeriod(periodStr || 'all');

      const apiClient = new ApiClient({ authProvider });
      const user = await apiClient.users.getUserByName(channel);
      if (!user) return reply.status(404).send({ error: 'Channel not found' });

      const startDate = getStartDate(period);
      const videos = await apiClient.videos.getVideosByUser(user.id, { type: 'archive', period: 'all', limit: 100 }).catch(() => ({ data: [] }));

      const filteredVideos = startDate
        ? videos.data.filter(v => v.creationDate >= startDate)
        : videos.data;

      const slotMap = new Map<string, { views: number[]; count: number }>();

      for (const video of filteredVideos) {
        const dayOfWeek = video.creationDate.getDay();
        const hourStart = video.creationDate.getHours();
        const key = `${dayOfWeek}-${hourStart}`;
        if (!slotMap.has(key)) slotMap.set(key, { views: [], count: 0 });
        const entry = slotMap.get(key)!;
        entry.views.push(video.views);
        entry.count++;
      }

      const slots: BestSlot[] = Array.from(slotMap.entries()).map(([key, data]) => {
        const [dayOfWeek, hourStart] = key.split('-').map(Number);
        return {
          dayOfWeek,
          hourStart,
          avgViewers: Math.round(data.views.reduce((a, b) => a + b, 0) / data.count),
          streamCount: data.count,
        };
      }).sort((a, b) => b.avgViewers - a.avgViewers);

      return { channel, slots };
    } catch (err) {
      return reply.status(500).send({ error: 'Failed to fetch best slots' });
    }
  });

  app.post('/kpi/viewer-snapshot', async (req, reply) => {
    const { channel, viewers, chattersActive } = req.body as { channel: string; viewers: number; chattersActive: number };
    if (!channel) return reply.status(400).send({ error: 'Missing channel' });
    recordSnapshot(channel.toLowerCase(), viewers, chattersActive ?? 0);
    return { ok: true };
  });

  app.get('/kpi/top-twitch-games', async (req, reply) => {
    try {
      if (!authProvider) return reply.status(401).send({ error: 'Not authenticated' });
      const apiClient = new ApiClient({ authProvider });

      const topGamesPage = await apiClient.games.getTopGames({ limit: 12 });
      const games = topGamesPage.data;

      const results = await Promise.all(games.map(async (game) => {
        try {
          const streamsPage = await apiClient.streams.getStreams({ game: game.id, limit: 100 });
          const estimatedViewers = streamsPage.data.reduce((acc, stream) => acc + stream.viewers, 0);
          return {
            id: game.id,
            name: game.name,
            boxArtUrl: game.boxArtUrl.replace('{width}', '144').replace('{height}', '192'),
            estimatedViewers
          };
        } catch {
          return {
            id: game.id,
            name: game.name,
            boxArtUrl: game.boxArtUrl.replace('{width}', '144').replace('{height}', '192'),
            estimatedViewers: 0
          };
        }
      }));

      // Sort just in case, though Twitch already ranks them
      results.sort((a, b) => b.estimatedViewers - a.estimatedViewers);

      return { games: results };
    } catch (err) {
      req.log.error(err, 'Failed to fetch top games');
      return reply.status(500).send({ error: 'Failed to fetch top games' });
    }
  });
}
