import Fastify from 'fastify';
import cors from '@fastify/cors';
import { config } from './config.js';
import { setupAuth } from './auth/index.js';
import { setupChat, setEnterGiveaway } from './chat/index.js';
import { setupSocketIO } from './socket/index.js';
import { setupGiveaways, enterGiveaway } from './giveaways/index.js';
import { setupPredictions } from './predictions/index.js';

export async function startServer(port?: number) {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: true });

  await setupAuth(app);
  setupSocketIO(app);
  setupGiveaways(app);
  setEnterGiveaway(enterGiveaway);
  setupChat();
  setupPredictions(app);

  app.get('/health', async () => ({ status: 'ok', timestamp: Date.now() }));

  const listenPort = port ?? parseInt(config.PORT, 10);
  await app.listen({ port: listenPort, host: '0.0.0.0' });
  console.log(`🚀 Server running on http://localhost:${listenPort}`);

  return app;
}

// Auto-start when run directly (not imported)
const isMainModule = process.argv[1]?.includes('index');
if (isMainModule) {
  startServer().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
