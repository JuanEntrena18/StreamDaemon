import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config.js';
import { setupAuth, onAuth } from './auth/index.js';
import { setupChat, setEnterGiveaway } from './chat/index.js';
import { setupSocketIO } from './socket/index.js';
import { setupGiveaways, enterGiveaway } from './giveaways/index.js';
import { setupPredictions } from './predictions/index.js';
import { setupEventSub, stopEventSub } from './eventsub/index.js';
import { setupTracker } from './tracker/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function startServer(opts?: { port?: number; frontendDir?: string }) {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: true });

  // Serve frontend static files in production / standalone mode
  // Wildcard: true allows SPA routing — all paths fall through to static file
  // serving. Exact routes (auth, health, etc.) take priority over * in Fastify.
  if (opts?.frontendDir) {
    await app.register(fastifyStatic, {
      root: opts.frontendDir,
      prefix: '/',
      wildcard: false,
      index: ['index.html'],
    });

    // SPA fallback: solo para rutas sin extensión (navegación del dashboard).
    // Con wildcard:true, cualquier asset no encontrado devolvía index.html
    // con content-type text/html → el navegador lo ejecutaba como JS → overlay en blanco.
    // Ahora solo rutas sin punto (ej: /sorteos, /config) caen aquí.
    app.setNotFoundHandler((req, reply) => {
      const url = req.url.split('?')[0];
      if (!url.includes('.')) {
        return reply.sendFile('index.html');
      }
      reply.status(404).send({ error: 'Not found', path: req.url });
    });
  }

  await setupAuth(app);
  setupSocketIO(app);
  setupGiveaways(app);
  setEnterGiveaway(enterGiveaway);
  setupChat();
  setupEventSub();
  onAuth(() => { setupChat(); setupEventSub(); });
  setupPredictions(app);
  setupTracker(app);

  app.get('/health', async () => ({ status: 'ok', timestamp: Date.now() }));

  const listenPort = opts?.port ?? parseInt(config.PORT, 10);
  await app.listen({ port: listenPort, host: '0.0.0.0' });
  console.log(`🚀 Server running on http://localhost:${listenPort}`);

  return app;
}

// Auto-start when run directly (not imported)
const isMainModule = process.argv[1]?.includes('index');
if (isMainModule) {
  const frontendDir = path.resolve(__dirname, '../../frontend/dist');
  startServer({ frontendDir }).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
