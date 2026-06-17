import { FastifyInstance } from 'fastify';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getIO } from '../socket/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../../data');
const CONFIG_FILE = path.join(DATA_DIR, 'alert-sounds.json');

export interface AlertSoundsConfig {
  follow: string;
  subscribe: string;
  bits: string;
  raid: string;
  redemption: string;
}

const DEFAULT_SOUNDS: AlertSoundsConfig = {
  follow: '',
  subscribe: '',
  bits: '',
  raid: '',
  redemption: '',
};

let sounds: AlertSoundsConfig = { ...DEFAULT_SOUNDS };

function loadConfig() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
      sounds = { ...DEFAULT_SOUNDS, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.warn('Failed to load alert-sounds.json', e);
  }
}

function saveConfig() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(sounds, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Failed to save alert-sounds.json', e);
  }
}

export function getAlertSounds(): AlertSoundsConfig {
  return { ...sounds };
}

loadConfig();

export function setupAlertSounds(app: FastifyInstance) {
  app.get('/alert-sounds', () => sounds);

  app.put('/alert-sounds', async (req, reply) => {
    const body = req.body as Partial<AlertSoundsConfig>;
    if (body.follow !== undefined) sounds.follow = body.follow;
    if (body.subscribe !== undefined) sounds.subscribe = body.subscribe;
    if (body.bits !== undefined) sounds.bits = body.bits;
    if (body.raid !== undefined) sounds.raid = body.raid;
    if (body.redemption !== undefined) sounds.redemption = body.redemption;
    saveConfig();
    reply.send({ ok: true });
  });

  // Test endpoint: emits a fake alert event to a channel room so overlays can show it
  app.post('/alert-sounds/test', async (req, reply) => {
    const { type, channel } = req.body as { type: string; channel: string };
    if (!type || !channel) {
      return reply.status(400).send({ error: 'Missing type or channel' });
    }

    const testUser = 'StreamForger_Test';
    const displayName = 'StreamForger Test';

    switch (type) {
      case 'follow':
        getIO().to(`channel:${channel}`).emit('channel:follow', {
          userDisplayName: displayName,
          userName: testUser,
          userId: 'test',
          timestamp: Date.now(),
        });
        break;
      case 'subscribe':
        getIO().to(`channel:${channel}`).emit('channel:subscribe', {
          userDisplayName: displayName,
          userName: testUser,
          tier: '1000',
          isGift: false,
          timestamp: Date.now(),
        });
        break;
      case 'donation':
        getIO().to(`channel:${channel}`).emit('channel:redemption', {
          userDisplayName: displayName,
          userName: testUser,
          rewardTitle: 'Donación de prueba',
          rewardCost: 500,
          input: '¡Gracias por el stream!',
          timestamp: Date.now(),
        });
        break;
      case 'raid':
        getIO().to(`channel:${channel}`).emit('channel:raid', {
          fromDisplayName: displayName,
          fromName: testUser,
          viewerCount: 42,
          timestamp: Date.now(),
        });
        break;
      case 'bits':
        getIO().to(`channel:${channel}`).emit('channel:cheer', {
          userDisplayName: displayName,
          userName: testUser,
          bits: 100,
          message: '¡Toma tus bits!',
          timestamp: Date.now(),
        });
        break;
      case 'host':
        // Twitch removed hosting; emit as a follow for backward compatibility
        getIO().to(`channel:${channel}`).emit('channel:follow', {
          userDisplayName: displayName + ' (Host)',
          userName: testUser,
          userId: 'test',
          timestamp: Date.now(),
        });
        break;
      default:
        return reply.status(400).send({ error: `Unknown type: ${type}` });
    }

    reply.send({ ok: true, type, channel });
  });
}
