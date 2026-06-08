import { FastifyInstance } from 'fastify';
import { ApiClient, type HelixVideo } from '@twurple/api';
import { authProvider } from '../auth/index.js';

export function setupTracker(app: FastifyInstance) {
  app.get('/tracker/stats', async (req, reply) => {
    try {
      if (!authProvider) return reply.status(401).send({ error: 'Not authenticated' });

      const { period, channel } = req.query as { period?: string; channel?: string };
      if (!channel) return reply.status(400).send({ error: 'Missing channel' });

      const validPeriods = ['7d', '30d', '90d', 'all'];
      const p = period && validPeriods.includes(period) ? period : '7d';

      const apiClient = new ApiClient({ authProvider });

      const user = await apiClient.users.getUserByName(channel);
      if (!user) return reply.status(404).send({ error: 'Channel not found' });

      const now = new Date();
      let startDate: Date | undefined;
      if (p !== 'all') {
        const days = parseInt(p);
        startDate = new Date(now.getTime() - days * 86400000);
      }

      let filtered: HelixVideo[] = [];
      try {
        const allVideos = await apiClient.videos.getVideosByUser(user.id, {
          type: 'archive',
          period: 'all',
          limit: 100,
        });
        filtered = startDate
          ? allVideos.data.filter((v: HelixVideo) => v.creationDate >= startDate)
          : allVideos.data;
      } catch {
        // Videos no disponibles (sin streams archiveados)
      }

      let totalSeconds = 0;
      let peakViewers = 0;
      let peakDate = '';

      for (const video of filtered) {
        totalSeconds += video.durationInSeconds;
        if (video.views > peakViewers) {
          peakViewers = video.views;
          peakDate = video.creationDate.toISOString();
        }
      }

      let totalFollowers = 0;
      try {
        const followersResult = await apiClient.channels.getChannelFollowers(user.id);
        totalFollowers = followersResult.total;
      } catch {
        // Followers no disponibles (scope moderator:read:followers no concedido)
      }

      const totalHoursStreamed = Math.round((totalSeconds / 3600) * 100) / 100;

      return {
        period: p,
        channel: user.displayName,
        totalHoursStreamed,
        peakViewers,
        peakDate,
        totalFollowers,
        videoCount: filtered.length,
      };
    } catch (err) {
      req.log.error(err, 'Tracker stats error');
      return reply.status(500).send({ error: 'Failed to fetch tracker stats' });
    }
  });
}
