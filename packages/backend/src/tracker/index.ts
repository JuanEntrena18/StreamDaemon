import { FastifyInstance } from 'fastify';
import { ApiClient, type HelixVideo } from '@twurple/api';
import { authProvider } from '../auth/index.js';
import { getEvents } from '../activity/index.js';

interface StreamDetail {
  videoId: string;
  title: string;
  creationDate: string;
  durationInSeconds: number;
  totalViews: number;
  url: string;
  thumbnailUrl: string;
  followersGained: number;
  subsGained: number;
  bitsDonated: number;
}

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

  app.get('/tracker/streams', async (req, reply) => {
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
        // Videos no disponibles
      }

      const events = getEvents(channel.toLowerCase());

      const streams: StreamDetail[] = filtered.map((video) => {
        const streamStart = video.creationDate.getTime();
        const streamEnd = streamStart + video.durationInSeconds * 1000;

        const streamEvents = events.filter(
          (e) => e.timestamp >= streamStart && e.timestamp <= streamEnd
        );

        const followersGained = streamEvents.filter((e) => e.type === 'follow').length;
        const subsGained =
          streamEvents.filter((e) => e.type === 'sub' || e.type === 'resub').length +
          streamEvents
            .filter((e) => e.type === 'gift')
            .reduce((sum, e) => sum + (e.amount ?? 0), 0);
        const bitsDonated = streamEvents
          .filter((e) => e.type === 'cheer')
          .reduce((sum, e) => sum + (e.amount ?? 0), 0);

        return {
          videoId: video.id,
          title: video.title,
          creationDate: video.creationDate.toISOString(),
          durationInSeconds: video.durationInSeconds,
          totalViews: video.views,
          url: video.url,
          thumbnailUrl: video.thumbnailUrl,
          followersGained,
          subsGained,
          bitsDonated,
        };
      });

      streams.sort((a, b) => new Date(b.creationDate).getTime() - new Date(a.creationDate).getTime());

      return { streams, totalStreams: streams.length };
    } catch (err) {
      req.log.error(err, 'Tracker streams error');
      return reply.status(500).send({ error: 'Failed to fetch stream details' });
    }
  });

  // ── Advice endpoint ──
  app.get('/tracker/advice', async (req, reply) => {
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
        // Videos no disponibles
      }

      const events = getEvents(channel.toLowerCase());
      const channelEvents = events;

      const streams: StreamDetail[] = filtered.map((video) => {
        const streamStart = video.creationDate.getTime();
        const streamEnd = streamStart + video.durationInSeconds * 1000;
        const streamEvents = channelEvents.filter(
          (e) => e.timestamp >= streamStart && e.timestamp <= streamEnd
        );
        return {
          videoId: video.id,
          title: video.title,
          creationDate: video.creationDate.toISOString(),
          durationInSeconds: video.durationInSeconds,
          totalViews: video.views,
          url: video.url,
          thumbnailUrl: video.thumbnailUrl,
          followersGained: streamEvents.filter((e) => e.type === 'follow').length,
          subsGained:
            streamEvents.filter((e) => e.type === 'sub' || e.type === 'resub').length +
            streamEvents.filter((e) => e.type === 'gift').reduce((sum, e) => sum + (e.amount ?? 0), 0),
          bitsDonated: streamEvents.filter((e) => e.type === 'cheer').reduce((sum, e) => sum + (e.amount ?? 0), 0),
        };
      });

      streams.sort((a, b) => new Date(b.creationDate).getTime() - new Date(a.creationDate).getTime());

      if (streams.length === 0) {
        return { advice: [], stats: null, ollamaAvailable: false };
      }

      // Calculate aggregate metrics
      const totalStreams = streams.length;
      const totalHours = streams.reduce((s, st) => s + st.durationInSeconds, 0) / 3600;
      const avgDurationMin = streams.reduce((s, st) => s + st.durationInSeconds, 0) / totalStreams / 60;
      const totalViews = streams.reduce((s, st) => s + st.totalViews, 0);
      const avgViews = Math.round(totalViews / totalStreams);
      const totalFollowersGained = streams.reduce((s, st) => s + st.followersGained, 0);
      const avgFollowers = totalFollowersGained / totalStreams;
      const totalSubs = streams.reduce((s, st) => s + st.subsGained, 0);
      const totalBits = streams.reduce((s, st) => s + st.bitsDonated, 0);
      const bestStream = streams.reduce((best, s) => (s.totalViews > (best?.totalViews ?? 0) ? s : best), streams[0]);
      const daysInPeriod = p === 'all' ? 90 : parseInt(p);
      const streamsPerWeek = (totalStreams / daysInPeriod) * 7;

      // Calculate gaps between streams
      let totalGapDays = 0;
      for (let i = 0; i < streams.length - 1; i++) {
        const gap = (new Date(streams[i].creationDate).getTime() - new Date(streams[i + 1].creationDate).getTime()) / 86400000;
        totalGapDays += gap;
      }
      const avgGapDays = totalStreams > 1 ? totalGapDays / (totalStreams - 1) : 0;

      interface AdviceItem {
        type: 'tip' | 'warning' | 'achievement' | 'info';
        icon: string;
        title: string;
        description: string;
      }

      const advice: AdviceItem[] = [];

      // Frequency
      if (streamsPerWeek < 1) {
        advice.push({
          type: 'warning',
          icon: '📅',
          title: 'Poca frecuencia de streams',
          description: `Estás streameando ${streamsPerWeek < 0.5 ? 'menos de 1 vez cada 2 semanas' : `solo ${Math.round(streamsPerWeek)} vez/veces por semana`}. La consistencia es clave para hacer crecer tu audiencia.`,
        });
      } else if (streamsPerWeek < 2) {
        advice.push({
          type: 'tip',
          icon: '📅',
          title: 'Buena base, puedes mejorar',
          description: `Estás streameando ${Math.round(streamsPerWeek)} vez/veces por semana. Intenta aumentar a 3-4 streams semanales para acelerar tu crecimiento.`,
        });
      } else {
        advice.push({
          type: 'achievement',
          icon: '🔥',
          title: 'Buena consistencia',
          description: `Estás streameando ${Math.round(streamsPerWeek)} veces por semana. ¡La consistencia es uno de los factores más importantes para crecer en Twitch!`,
        });
      }

      // Duration
      if (avgDurationMin > 240) {
        advice.push({
          type: 'warning',
          icon: '⏱️',
          title: 'Streams muy largos',
          description: `Tus streams duran promedio ${Math.round(avgDurationMin / 60)}h. Los streams de más de 3-4 horas suelen perder audiencia en la última hora.`,
        });
      } else if (avgDurationMin > 180) {
        advice.push({
          type: 'tip',
          icon: '⏱️',
          title: 'Duración moderada',
          description: `Tus streams duran ~${Math.round(avgDurationMin)} min. Es una duración aceptable, pero monitorea si la audiencia cae hacia el final.`,
        });
      } else if (avgDurationMin < 60 && totalStreams >= 2) {
        advice.push({
          type: 'tip',
          icon: '⏱️',
          title: 'Streams cortos',
          description: `Tus streams duran ~${Math.round(avgDurationMin)} min de promedio. Los streams de al menos 1.5-2h suelen tener mejor retención y más oportunidades de monetización.`,
        });
      }

      // Followers
      if (avgFollowers >= 3) {
        advice.push({
          type: 'achievement',
          icon: '❤️',
          title: 'Excelente crecimiento de seguidores',
          description: `Ganas promedio ${avgFollowers.toFixed(1)} seguidores por stream. ¡Tu contenido está atrayendo nueva audiencia!`,
        });
      } else if (avgFollowers >= 1) {
        advice.push({
          type: 'info',
          icon: '❤️',
          title: 'Crecimiento constante',
          description: `Ganas ~${avgFollowers.toFixed(1)} seguidor(es) por stream. Para acelerar, prueba a promocionar tus clips en redes sociales.`,
        });
      } else if (totalStreams >= 3) {
        advice.push({
          type: 'tip',
          icon: '❤️',
          title: 'Oportunidad de crecimiento',
          description: `Estás ganando menos de 1 seguidor por stream de promedio. Intenta interactuar más con nuevos espectadores que lleguen al chat.`,
        });
      }

      // Best stream insight
      if (bestStream && totalStreams > 1) {
        advice.push({
          type: 'info',
          icon: '🏆',
          title: 'Tu mejor stream',
          description: `"${bestStream.title}" fue tu stream más visto con ${bestStream.totalViews.toLocaleString()} visualizaciones (${new Date(bestStream.creationDate).toLocaleDateString('es-ES')})${bestStream.followersGained > 0 ? `, ganando +${bestStream.followersGained} seguidores` : ''}.`,
        });
      }

      // Monetization
      const estimatedRevenue = totalSubs * 2.49 + totalBits * 0.01;
      if (estimatedRevenue > 50) {
        advice.push({
          type: 'achievement',
          icon: '💰',
          title: 'Monetización activa',
          description: `Has generado ~${estimatedRevenue.toFixed(2)} EUR estimados en ingresos (${totalSubs} suscripciones + ${totalBits} bits) en este período.`,
        });
      } else if (totalSubs > 0 || totalBits > 0) {
        advice.push({
          type: 'info',
          icon: '💰',
          title: 'Primeros ingresos',
          description: `Has recibido ${totalSubs} suscripción(es) y ${totalBits} bits. Sigue así para aumentar tu monetización.`,
        });
      }

      // Growth opportunity: high views but low followers
      const viewsPerFollower = totalFollowersGained > 0 ? totalViews / totalFollowersGained : Infinity;
      if (viewsPerFollower > 500 && totalViews > 1000 && totalFollowersGained < totalStreams) {
        advice.push({
          type: 'tip',
          icon: '🎯',
          title: 'Oportunidad de conversión',
          description: `Tienes ~${Math.round(viewsPerFollower)} visualizaciones por cada seguidor nuevo. Tu contenido se ve pero no convierte. Prueba a pedir follow explícitamente o a hacer más interacción.`,
        });
      }

      // Consistency
      if (avgGapDays > 7 && totalStreams >= 3) {
        advice.push({
          type: 'warning',
          icon: '📆',
          title: 'Horario irregular',
          description: `Hay un gap promedio de ${Math.round(avgGapDays)} días entre tus streams. Un horario fijo ayuda a que tu audiencia sepa cuándo esperarte.`,
        });
      }

      // Gap between best stream and others
      const avgViewsExcludingBest = totalStreams > 1
        ? (totalViews - bestStream.totalViews) / (totalStreams - 1)
        : 0;
      if (avgViewsExcludingBest > 0 && bestStream.totalViews > avgViewsExcludingBest * 2) {
        advice.push({
          type: 'info',
          icon: '💡',
          title: 'Identifica qué funcionó',
          description: `Tu mejor stream tuvo ${Math.round(bestStream.totalViews / avgViewsExcludingBest)}x más views que el promedio. Analiza qué hiciste diferente (título, juego, hora, promoción) para repetirlo.`,
        });
      }

      // Check Ollama availability
      let ollamaAvailable = false;
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2000);
        const resp = await fetch('http://localhost:11434/api/tags', { signal: controller.signal });
        clearTimeout(timeout);
        ollamaAvailable = resp.ok;
      } catch {
        // Ollama not available
      }

      // Ollama advice (if available)
      let ollamaAdvice: AdviceItem | null = null;
      if (ollamaAvailable) {
        const prompt = `Eres un coach de streaming experto. Basado en estos datos de un streamer en Twitch, da un consejo breve y accionable (máximo 2 oraciones) en español para mejorar sus streams:

- Total de streams en el período: ${totalStreams}
- Horas totales estremeadas: ${totalHours.toFixed(1)}
- Duración promedio: ${Math.round(avgDurationMin)} minutos
- Visualizaciones totales: ${totalViews}
- Visualizaciones promedio por stream: ${avgViews}
- Seguidores ganados: ${totalFollowersGained}
- Suscripciones recibidas: ${totalSubs}
- Bits donados: ${totalBits}
- Streams por semana: ${streamsPerWeek.toFixed(1)}
- Gap promedio entre streams: ${avgGapDays.toFixed(1)} días`;
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 15000);
          const resp = await fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: 'llama3.2', prompt, stream: false }),
            signal: controller.signal,
          });
          clearTimeout(timeout);
          if (resp.ok) {
            const data = await resp.json();
            const text = (data.response ?? '').trim();
            if (text) {
              ollamaAdvice = {
                type: 'tip',
                icon: '🤖',
                title: 'Consejo IA (Ollama)',
                description: text,
              };
            }
          }
        } catch {
          // Ollama inference failed
        }
      }

      const result: { advice: AdviceItem[]; metrics: Record<string, unknown>; ollamaAvailable: boolean } = {
        advice,
        metrics: {
          totalStreams,
          totalHours: Math.round(totalHours * 10) / 10,
          avgDurationMin: Math.round(avgDurationMin),
          totalViews,
          avgViews,
          totalFollowersGained,
          totalSubs,
          totalBits,
          streamsPerWeek: Math.round(streamsPerWeek * 10) / 10,
          avgGapDays: Math.round(avgGapDays * 10) / 10,
          bestStreamTitle: bestStream?.title ?? '',
          estimatedRevenue: Math.round(estimatedRevenue * 100) / 100,
        },
        ollamaAvailable,
      };

      if (ollamaAdvice) {
        result.advice.unshift(ollamaAdvice);
      }

      return result;
    } catch (err) {
      req.log.error(err, 'Tracker advice error');
      return reply.status(500).send({ error: 'Failed to generate advice' });
    }
  });
}
