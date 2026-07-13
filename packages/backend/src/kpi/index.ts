import { FastifyInstance } from 'fastify';
import { ApiClient } from '@twurple/api';
import { getRawData } from '@twurple/common';
import { authProvider, currentUser } from '../auth/index.js';
import { getIO } from '../socket/index.js';
import { getEvents } from '../activity/index.js';
import type { ViewerSnapshot, KpiOverview, GamePerformance, BestSlot, ChatStats, StreamSummary, ChannelRecord } from '@streamdaemon/shared';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { updateSessionViewers, restoreActiveSessions } from './session.js';
import { prisma } from '../auth/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || path.resolve(__dirname, '../../data');
const SNAPSHOTS_FILE = path.join(DATA_DIR, 'kpi_snapshots.json');

const MAX_SNAPSHOTS = 120;
let snapshots = new Map<string, ViewerSnapshot[]>();

let chatMessageCount = new Map<string, number>();
let uniqueChattersSet = new Map<string, Set<string>>();
let chatMessageInterval: ReturnType<typeof setInterval> | null = null;

export function resetChatCounter(channel: string) {
  chatMessageCount.set(channel, 0);
  if (!uniqueChattersSet.has(channel)) {
    uniqueChattersSet.set(channel, new Set());
  } else {
    uniqueChattersSet.get(channel)!.clear();
  }
}

export function incrementChatCounter(channel: string, user?: string) {
  const currentCount = chatMessageCount.get(channel) || 0;
  chatMessageCount.set(channel, currentCount + 1);
  if (user) {
    if (!uniqueChattersSet.has(channel)) {
      uniqueChattersSet.set(channel, new Set());
    }
    uniqueChattersSet.get(channel)!.add(user);
  }
}

export function getChatMessagesPerMinute(channel: string): number {
  return chatMessageCount.get(channel) || 0;
}

export function getUniqueChattersCount(channel: string): number {
  return uniqueChattersSet.get(channel)?.size || 0;
}

function loadSnapshots() {
  try {
    if (fs.existsSync(SNAPSHOTS_FILE)) {
      const data = JSON.parse(fs.readFileSync(SNAPSHOTS_FILE, 'utf-8'));
      snapshots = new Map(Object.entries(data));
    }
  } catch (e) {
    console.error('Failed to load KPI snapshots:', e);
  }
}

function saveSnapshots() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    const data = Object.fromEntries(snapshots.entries());
    fs.writeFileSync(SNAPSHOTS_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Failed to save KPI snapshots:', e);
  }
}

export function recordSnapshot(channel: string, viewers: number, chattersActive: number) {
  const normChannel = channel.toLowerCase();
  if (!snapshots.has(normChannel)) snapshots.set(normChannel, []);
  const list = snapshots.get(normChannel)!;
  
  const messagesPerMin = getChatMessagesPerMinute(normChannel);
  const uniqueChatters = getUniqueChattersCount(normChannel);

  list.push({ 
    timestamp: Date.now(), 
    viewers, 
    chattersActive,
    messagesPerMin,
    uniqueChatters
  });

  while (list.length > MAX_SNAPSHOTS) list.shift();
  saveSnapshots();

  if (currentUser && currentUser.login.toLowerCase() === normChannel) {
    updateSessionViewers(currentUser.id, viewers).catch(() => {});
  }
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

function getPreviousPeriodStartDate(period: Period): Date | undefined {
  if (period === 'all') return undefined;
  const days = parseInt(period);
  return new Date(Date.now() - (days * 2) * 86400000);
}

function calculateDelta(current: number, previous: number): number | undefined {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

export function setupKpi(app: FastifyInstance) {
  loadSnapshots();
  restoreActiveSessions();

  if (!chatMessageInterval) {
    chatMessageInterval = setInterval(() => { 
      chatMessageCount.clear(); 
      // Do not clear uniqueChattersSet, we want cumulative unique chatters for the session
    }, 60000);
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
      const prevStartDate = getPreviousPeriodStartDate(period);

      const [followInfo, subInfo, videos] = await Promise.all([
        apiClient.channels.getChannelFollowers(user.id, user.id).catch(() => ({ total: 0 })),
        apiClient.subscriptions.getSubscriptions(user.id).catch(() => ({ total: 0 })),
        apiClient.videos.getVideosByUser(user.id, { type: 'archive', period: 'all', limit: 100 }).catch(() => ({ data: [] })),
      ]);

      const events = getEvents(channel.toLowerCase());

      const processVideos = (start?: Date, end?: Date) => {
        const filtered = videos.data.filter(v => {
          if (start && v.creationDate < start) return false;
          if (end && v.creationDate >= end) return false;
          return true;
        });

        let tHours = 0, tViews = 0, pViewers = 0;
        let fGained = 0, sGained = 0, bDonated = 0;

        for (const video of filtered) {
          tHours += video.durationInSeconds / 3600;
          tViews += video.views;
          pViewers = Math.max(pViewers, video.views);

          const startTime = video.creationDate.getTime();
          const endTime = startTime + video.durationInSeconds * 1000;
          const streamEvents = events.filter(e => e.timestamp >= startTime && e.timestamp <= endTime);

          fGained += streamEvents.filter(e => e.type === 'follow').length;
          sGained += streamEvents.filter(e => e.type === 'sub' || e.type === 'resub' || e.type === 'gift').length;
          bDonated += streamEvents.filter(e => e.type === 'cheer').reduce((sum, e) => sum + (e.amount || 0), 0);
        }

        const aViewers = filtered.length > 0 ? tViews / filtered.length : 0;
        const eRevenue = sGained * 2.49 + bDonated * 0.01;

        return {
          tHours, tViews, pViewers, fGained, sGained, bDonated, aViewers, eRevenue, streams: filtered.length
        };
      };

      const curr = processVideos(startDate);
      const prev = period !== 'all' ? processVideos(prevStartDate, startDate) : curr;

      const totalSubs = subInfo.total;
      const totalFollowers = followInfo.total;
      const subToFollowRatio = totalFollowers > 0 ? totalSubs / totalFollowers : 0;

      const overview: KpiOverview = {
        channel,
        followers: totalFollowers,
        subscribers: totalSubs,
        subToFollowRatio: Math.round(subToFollowRatio * 100) / 100,
        avgViewers: Math.round(curr.aViewers),
        peakViewers: curr.pViewers,
        totalViews: curr.tViews,
        totalHoursStreamed: Math.round(curr.tHours * 100) / 100,
        followersGained: curr.fGained,
        subsGained: curr.sGained,
        bitsDonated: curr.bDonated,
        estimatedRevenue: Math.round(curr.eRevenue * 100) / 100,
        streamsThisPeriod: curr.streams,
        isLive: false,
      };

      if (period !== 'all') {
        overview.avgViewersDelta = calculateDelta(Math.round(curr.aViewers), Math.round(prev.aViewers));
        overview.peakViewersDelta = calculateDelta(curr.pViewers, prev.pViewers);
        overview.totalViewsDelta = calculateDelta(curr.tViews, prev.tViews);
        overview.totalHoursStreamedDelta = calculateDelta(curr.tHours, prev.tHours);
        overview.followersGainedDelta = calculateDelta(curr.fGained, prev.fGained);
        overview.subsGainedDelta = calculateDelta(curr.sGained, prev.sGained);
        overview.bitsDonatedDelta = calculateDelta(curr.bDonated, prev.bDonated);
        overview.estimatedRevenueDelta = calculateDelta(curr.eRevenue, prev.eRevenue);
        overview.streamsThisPeriodDelta = calculateDelta(curr.streams, prev.streams);
      }

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

  app.get('/kpi/chat-stats/:channel', async (req, reply) => {
    try {
      const { channel } = req.params as { channel: string };
      const snapshots = getChannelSnapshots(channel.toLowerCase());
      
      const chatStats: ChatStats = {
        avgMessagesPerMin: 0,
        peakMessagesPerMin: 0,
        totalMessages: 0,
        uniqueChatters: 0,
        avgEngagementRatio: 0,
        topChatters: [],
        timeline: []
      };

      if (snapshots.length === 0) return chatStats;

      let totalEngagement = 0;
      let engagementCount = 0;

      for (const snap of snapshots) {
        const msgs = snap.messagesPerMin || 0;
        chatStats.totalMessages += msgs; // Approximation since we poll every 15s
        chatStats.peakMessagesPerMin = Math.max(chatStats.peakMessagesPerMin, msgs);
        chatStats.uniqueChatters = Math.max(chatStats.uniqueChatters, snap.uniqueChatters || 0);
        
        const engagement = snap.viewers > 0 ? ((snap.chattersActive || 0) / snap.viewers) * 100 : 0;
        if (snap.viewers > 0) {
          totalEngagement += engagement;
          engagementCount++;
        }

        chatStats.timeline.push({
          timestamp: snap.timestamp,
          messagesPerMin: msgs,
          engagement: Math.round(engagement)
        });
      }

      chatStats.avgMessagesPerMin = Math.round(chatStats.totalMessages / Math.max(1, snapshots.length / 4)); // 15s intervals
      chatStats.avgEngagementRatio = engagementCount > 0 ? Math.round(totalEngagement / engagementCount) : 0;

      return chatStats;
    } catch (err) {
      return reply.status(500).send({ error: 'Failed to fetch chat stats' });
    }
  });

  app.get('/kpi/stream-summary/:channel', async (req, reply) => {
    try {
      if (!authProvider) return reply.status(401).send({ error: 'Not authenticated' });
      const { channel } = req.params as { channel: string };

      const apiClient = new ApiClient({ authProvider });
      const user = await apiClient.users.getUserByName(channel);
      if (!user) return reply.status(404).send({ error: 'Channel not found' });

      const videos = await apiClient.videos.getVideosByUser(user.id, { type: 'archive', period: 'all', limit: 10 }).catch(() => ({ data: [] }));
      
      if (videos.data.length === 0) return reply.status(404).send({ error: 'No streams found' });

      const lastVideo = videos.data[0];
      const events = getEvents(channel.toLowerCase());
      const startTime = lastVideo.creationDate.getTime();
      const endTime = startTime + lastVideo.durationInSeconds * 1000;
      const streamEvents = events.filter(e => e.timestamp >= startTime && e.timestamp <= endTime);

      const followersGained = streamEvents.filter(e => e.type === 'follow').length;
      const subsGained = streamEvents.filter(e => e.type === 'sub' || e.type === 'resub' || e.type === 'gift').length;
      const bitsDonated = streamEvents.filter(e => e.type === 'cheer').reduce((sum, e) => sum + (e.amount || 0), 0);
      const estimatedRevenue = subsGained * 2.49 + bitsDonated * 0.01;

      const summary: StreamSummary = {
        channel,
        streamTitle: lastVideo.title,
        gameName: 'Unknown Game', // Would need an extra API call or cached game
        startedAt: lastVideo.creationDate.toISOString(),
        duration: lastVideo.durationInSeconds,
        avgViewers: 0, // Would come from Twitch API or snapshots if we kept them
        peakViewers: lastVideo.views,
        minViewers: 0,
        peakTimestamp: 0,
        avgChatters: 0,
        avgEngagement: 0,
        followersGained,
        subsGained,
        bitsDonated,
        estimatedRevenue,
        totalChatMessages: 0,
        uniqueChatters: 0
      };

      return summary;
    } catch (err) {
      return reply.status(500).send({ error: 'Failed to fetch stream summary' });
    }
  });

  app.get('/kpi/records/:channel', async (req, reply) => {
    try {
      if (!authProvider) return reply.status(401).send({ error: 'Not authenticated' });
      const { channel } = req.params as { channel: string };

      const apiClient = new ApiClient({ authProvider });
      const user = await apiClient.users.getUserByName(channel);
      if (!user) return reply.status(404).send({ error: 'Channel not found' });

      const videos = await apiClient.videos.getVideosByUser(user.id, { type: 'archive', period: 'all', limit: 100 }).catch(() => ({ data: [] }));
      
      const records: ChannelRecord[] = [];

      if (videos.data.length > 0) {
        let maxViewsVideo = videos.data[0];
        let longestVideo = videos.data[0];

        for (const video of videos.data) {
          if (video.views > maxViewsVideo.views) maxViewsVideo = video;
          if (video.durationInSeconds > longestVideo.durationInSeconds) longestVideo = video;
        }

        records.push({
          label: 'Mayor pico de viewers',
          value: maxViewsVideo.views.toLocaleString(),
          streamTitle: maxViewsVideo.title,
          date: maxViewsVideo.creationDate.toISOString(),
          icon: '👥'
        });

        const hours = Math.floor(longestVideo.durationInSeconds / 3600);
        const minutes = Math.floor((longestVideo.durationInSeconds % 3600) / 60);

        records.push({
          label: 'Stream más largo',
          value: `${hours}h ${minutes}m`,
          streamTitle: longestVideo.title,
          date: longestVideo.creationDate.toISOString(),
          icon: '⏱️'
        });
      }

      return { channel, records };
    } catch (err) {
      return reply.status(500).send({ error: 'Failed to fetch channel records' });
    }
  });

  async function fetchGamePerformance(apiClient: ApiClient, userId: string, channelLogin: string, startDate?: Date): Promise<GamePerformance[]> {
    // 1) Try persisted GameStat first
    const cached = await prisma.gameStat.findMany({
      where: { userId, updatedAt: startDate ? { gte: startDate } : undefined },
    });
    if (cached.length > 0) {
      return cached.map(g => ({
        gameName: g.gameName,
        boxArtUrl: g.boxArtUrl ?? undefined,
        streamCount: g.streamCount,
        totalViews: g.totalViews,
        avgViewers: g.avgViewers,
        maxViewers: g.maxViewers,
        followersGained: g.followersGained,
        avgDuration: g.avgDuration,
      })).sort((a, b) => b.totalViews - a.totalViews);
    }

    // 2) Try StreamSession from EventSub
    const sessions = await prisma.streamSession.findMany({
      where: {
        userId,
        startedAt: startDate ? { gte: startDate } : undefined,
      }
    });

    const gameMap = new Map<string, { views: number[]; durations: number[]; count: number; followersGained: number; boxArtUrl?: string }>();

    for (const session of sessions) {
      const gameName = session.gameName || 'General';
      if (!gameMap.has(gameName)) gameMap.set(gameName, { views: [], durations: [], count: 0, followersGained: 0 });
      const entry = gameMap.get(gameName)!;
      entry.views.push(session.viewersMax);
      const duration = session.endedAt
        ? session.durationSeconds
        : Math.floor((Date.now() - session.startedAt.getTime()) / 1000);
      entry.durations.push(duration);
      entry.count++;
      entry.followersGained += session.followersGained;
    }

    // 3) Fallback: fetch from Twitch VODs
    if (sessions.length === 0) {
      const videos = await apiClient.videos.getVideosByUser(userId, { type: 'archive', period: 'all', limit: 100 }).catch(() => ({ data: [] }));
      const filteredVideos = startDate ? videos.data.filter(v => v.creationDate >= startDate) : videos.data;
      const events = getEvents(channelLogin);

      for (const video of filteredVideos) {
        const raw = getRawData(video) as Record<string, any>;
        let gameName = raw.game_name || '';
        if (!gameName || gameName === 'Unknown' || gameName === '') {
          if (raw.game_id) {
            try {
              const g = await apiClient.games.getGameById(raw.game_id);
              if (g) gameName = g.name;
            } catch {}
          }
          if (!gameName) gameName = 'General';
        }
        if (!gameMap.has(gameName)) gameMap.set(gameName, { views: [], durations: [], count: 0, followersGained: 0 });
        const entry = gameMap.get(gameName)!;
        entry.views.push(video.views);
        entry.durations.push(video.durationInSeconds);
        entry.count++;
        const startTime = video.creationDate.getTime();
        const endTime = startTime + video.durationInSeconds * 1000;
        entry.followersGained += events.filter(e => e.timestamp >= startTime && e.timestamp <= endTime && e.type === 'follow').length;
      }
    }

    for (const gameName of gameMap.keys()) {
      try {
        const game = await apiClient.games.getGameByName(gameName);
        if (game) gameMap.get(gameName)!.boxArtUrl = game.boxArtUrl.replace('{width}', '144').replace('{height}', '192');
      } catch {}
    }

    return Array.from(gameMap.entries()).map(([gameName, data]) => ({
      gameName,
      boxArtUrl: data.boxArtUrl,
      streamCount: data.count,
      totalViews: data.views.reduce((a, b) => a + b, 0),
      avgViewers: Math.round(data.views.reduce((a, b) => a + b, 0) / data.count),
      maxViewers: Math.max(...data.views),
      followersGained: data.followersGained,
      avgDuration: Math.round(data.durations.reduce((a, b) => a + b, 0) / data.count),
    })).sort((a, b) => b.totalViews - a.totalViews);
  }

  app.get('/kpi/game-performance/:channel', async (req, reply) => {
    try {
      if (!authProvider) return reply.status(401).send({ error: 'Not authenticated' });
      const { channel } = req.params as { channel: string };
      const { period: periodStr } = req.query as { period?: string };
      const period = parsePeriod(periodStr || '30d');
      const apiClient = new ApiClient({ authProvider });
      const user = await apiClient.users.getUserByName(channel);
      if (!user) return reply.status(404).send({ error: 'Channel not found' });
      const games = await fetchGamePerformance(apiClient, user.id, channel.toLowerCase(), getStartDate(period));
      return { channel, games };
    } catch (err) {
      req.log.error(err, 'Game performance failed');
      return reply.status(500).send({ error: 'Failed to fetch game performance' });
    }
  });

  app.post('/kpi/game-performance/:channel/refresh', async (req, reply) => {
    try {
      if (!authProvider) return reply.status(401).send({ error: 'Not authenticated' });
      const { channel } = req.params as { channel: string };
      const apiClient = new ApiClient({ authProvider });
      const user = await apiClient.users.getUserByName(channel);
      if (!user) return reply.status(404).send({ error: 'Channel not found' });

      // Fetch VODs and compute game stats
      const videos = await apiClient.videos.getVideosByUser(user.id, { type: 'archive', period: 'all', limit: 100 }).catch(() => ({ data: [] }));
      const events = getEvents(channel.toLowerCase());
      const gameMap = new Map<string, { views: number[]; durations: number[]; count: number; followersGained: number; boxArtUrl?: string }>();

      for (const video of videos.data) {
        const raw = getRawData(video) as Record<string, any>;
        let gameName = raw.game_name || '';
        if (!gameName || gameName === 'Unknown' || gameName === '') {
          if (raw.game_id) {
            try {
              const g = await apiClient.games.getGameById(raw.game_id);
              if (g) gameName = g.name;
            } catch {}
          }
          if (!gameName) gameName = 'General';
        }
        if (!gameMap.has(gameName)) gameMap.set(gameName, { views: [], durations: [], count: 0, followersGained: 0 });
        const entry = gameMap.get(gameName)!;
        entry.views.push(video.views);
        entry.durations.push(video.durationInSeconds);
        entry.count++;
        const startTime = video.creationDate.getTime();
        const endTime = startTime + video.durationInSeconds * 1000;
        entry.followersGained += events.filter(e => e.timestamp >= startTime && e.timestamp <= endTime && e.type === 'follow').length;
      }

      for (const gameName of gameMap.keys()) {
        try {
          const game = await apiClient.games.getGameByName(gameName);
          if (game) gameMap.get(gameName)!.boxArtUrl = game.boxArtUrl.replace('{width}', '144').replace('{height}', '192');
        } catch {}
      }

      // Persist to GameStat table
      const games: GamePerformance[] = [];
      for (const [gameName, data] of gameMap.entries()) {
        const totalViews = data.views.reduce((a, b) => a + b, 0);
        const avgViewers = Math.round(data.count > 0 ? totalViews / data.count : 0);
        const maxViewers = data.views.length > 0 ? Math.max(...data.views) : 0;
        const avgDuration = Math.round(data.durations.reduce((a, b) => a + b, 0) / (data.count || 1));

        await prisma.gameStat.upsert({
          where: { userId_gameName: { userId: user.id, gameName } },
          create: {
            userId: user.id,
            gameName,
            boxArtUrl: data.boxArtUrl,
            streamCount: data.count,
            totalViews,
            avgViewers,
            maxViewers,
            followersGained: data.followersGained,
            avgDuration,
          },
          update: {
            boxArtUrl: data.boxArtUrl,
            streamCount: data.count,
            totalViews,
            avgViewers,
            maxViewers,
            followersGained: data.followersGained,
            avgDuration,
          },
        });

        games.push({ gameName, boxArtUrl: data.boxArtUrl, streamCount: data.count, totalViews, avgViewers, maxViewers, followersGained: data.followersGained, avgDuration });
      }

      games.sort((a, b) => b.totalViews - a.totalViews);
      return { channel, games };
    } catch (err) {
      req.log.error(err, 'Game performance refresh failed');
      return reply.status(500).send({ error: 'Failed to refresh game performance' });
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

      results.sort((a, b) => b.estimatedViewers - a.estimatedViewers);
      return { games: results };
    } catch (err) {
      req.log.error(err, 'Failed to fetch top games');
      return reply.status(500).send({ error: 'Failed to fetch top games' });
    }
  });
}
