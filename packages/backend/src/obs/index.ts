import { FastifyInstance } from 'fastify';
import OBSWebSocket from 'obs-websocket-js';

const obs = new OBSWebSocket();
let connected = false;
let currentHost = '';

interface SceneConfig {
  name: string;
  url: string;
  width: number;
  height: number;
}

export function setupObs(app: FastifyInstance) {

  app.post('/obs/connect', async (req, reply) => {
    const { host, port, password } = req.body as { host?: string; port?: number; password?: string };
    const h = host || '127.0.0.1';
    const p = port || 4455;
    const url = `ws://${h}:${p}`;
    try {
      if (connected) await obs.disconnect();
      await obs.connect(url, password || '', { rpcVersion: 1 });
      connected = true;
      currentHost = `${h}:${p}`;
      return { ok: true, host: currentHost };
    } catch (err: any) {
      connected = false;
      reply.status(400);
      return { ok: false, error: err.message || 'Failed to connect to OBS' };
    }
  });

  app.post('/obs/disconnect', async (_req, reply) => {
    try {
      if (connected) await obs.disconnect();
      connected = false;
      currentHost = '';
      return { ok: true };
    } catch (err: any) {
      reply.status(400);
      return { ok: false, error: err.message };
    }
  });

  app.get('/obs/status', async () => {
    return { connected, host: currentHost };
  });

  app.post('/obs/apply-theme', async (req, reply) => {
    if (!connected) {
      reply.status(400);
      return { ok: false, error: 'Not connected to OBS' };
    }
    const { scenes } = req.body as { scenes?: SceneConfig[] };
    if (!scenes || scenes.length === 0) {
      reply.status(400);
      return { ok: false, error: 'No scenes provided' };
    }
    try {
      const result = await obs.call('GetSceneList') as { scenes: any[] };
      const existingNames = result.scenes.map((s: any) => s.sceneName);

      for (const sc of scenes) {
        if (!existingNames.includes(sc.name)) {
          await obs.call('CreateScene', { sceneName: sc.name });
        }
        const inputs = await obs.call('GetSceneItemList', { sceneName: sc.name });
        const browserItems = (inputs.sceneItems || []).filter(
          (item: any) => item.inputKind === 'browser_source'
        );
        if (browserItems.length > 0) {
          const browserItem = browserItems[0];
          await obs.call('SetInputSettings', {
            inputName: String(browserItem.sourceName),
            inputSettings: { url: sc.url, width: sc.width, height: sc.height },
          });
        } else {
          const sourceName = `${sc.name} - StreamForger`;
          await obs.call('CreateInput', {
            sceneName: sc.name,
            inputName: sourceName,
            inputKind: 'browser_source',
            inputSettings: {
              url: sc.url,
              width: sc.width,
              height: sc.height,
              fps: 60,
              css: '',
              reroute_audio: false,
            },
          });
        }
      }
      return { ok: true, scenes: scenes.map((s) => s.name) };
    } catch (err: any) {
      reply.status(500);
      return { ok: false, error: err.message || 'Failed to apply theme' };
    }
  });
}
