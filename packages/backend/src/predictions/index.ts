import { FastifyInstance } from 'fastify';
import { ApiClient } from '@twurple/api';
import { authProvider } from '../auth/index.js';
import { getIO } from '../socket/index.js';
import { config } from '../config.js';

let apiClient: ApiClient | null = null;

export function setupPredictions(app: FastifyInstance) {
  if (authProvider) {
    apiClient = new ApiClient({ authProvider });
  }

  app.post<{ Body: { channelId: string; title: string; options: string[] } }>(
    '/predictions/create',
    async (req, reply) => {
      const { channelId, title, options } = req.body;

      if (!apiClient) {
        return reply.status(503).send({ error: 'API not ready' });
      }

      try {
        const prediction = await apiClient.predictions.createPrediction(channelId, {
          title,
          outcomes: options,
          autoLockAfter: 120,
        });

        getIO().to(`channel:${channelId}`).emit('prediction:create', {
          id: prediction.id,
          title: prediction.title,
          options: prediction.outcomes.map((o) => ({
            id: o.id,
            title: o.title,
            votes: 0,
          })),
          status: 'active',
          outcome: null,
        });

        reply.send({ id: prediction.id });
      } catch (err) {
        reply.status(500).send({ error: 'Failed to create prediction' });
      }
    },
  );

  app.post<{ Body: { channelId: string; predictionId: string; outcomeId: string } }>(
    '/predictions/resolve',
    async (req, reply) => {
      const { channelId, predictionId, outcomeId } = req.body;

      if (!apiClient) {
        return reply.status(503).send({ error: 'API not ready' });
      }

      try {
        await apiClient.predictions.resolvePrediction(channelId, predictionId, outcomeId);

        getIO().to(`channel:${channelId}`).emit('prediction:update', {
          id: predictionId,
          status: 'resolved',
          outcome: outcomeId,
        });

        reply.send({ ok: true });
      } catch (err) {
        reply.status(500).send({ error: 'Failed to resolve prediction' });
      }
    },
  );
}
