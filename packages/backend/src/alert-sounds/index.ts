import { FastifyInstance } from 'fastify';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getIO } from '../socket/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || path.resolve(__dirname, '../../data');
const CONFIG_FILE = path.join(DATA_DIR, 'alert-sounds.json');
const SOUNDS_DIR = path.join(DATA_DIR, 'alert-sounds');

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

  // Upload an MP3 file for a specific alert type
  app.put('/alert-sounds/upload/:type', async (req, reply) => {
    const { type } = req.params as { type: string };
    const validTypes = ['follow', 'subscribe', 'bits', 'raid', 'redemption'];
    if (!validTypes.includes(type)) {
      return reply.status(400).send({ error: `Invalid type: ${type}` });
    }

    const body = req.body as { data: string };
    if (!body.data) {
      return reply.status(400).send({ error: 'Missing file data (base64)' });
    }

    try {
      const base64Data = body.data.replace(/^data:audio\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      if (!fs.existsSync(SOUNDS_DIR)) fs.mkdirSync(SOUNDS_DIR, { recursive: true });

      const filename = `${type}.mp3`;
      fs.writeFileSync(path.join(SOUNDS_DIR, filename), buffer);

      // Store just the filename — frontend/overlays prepend the URL
      (sounds as any)[type] = filename;
      saveConfig();

      reply.send({ ok: true, filename, url: `/alert-sounds/file/${filename}` });
    } catch (e) {
      reply.status(500).send({ error: 'Failed to save file' });
    }
  });

  // Serve uploaded sound files
  app.get('/alert-sounds/file/:filename', async (req, reply) => {
    const { filename } = req.params as { filename: string };
    const filePath = path.join(SOUNDS_DIR, filename);

    if (!fs.existsSync(filePath)) {
      return reply.status(404).send({ error: 'File not found' });
    }

    const ext = path.extname(filename).toLowerCase();
    const mime: Record<string, string> = { '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg' };
    reply.header('Content-Type', mime[ext] || 'application/octet-stream');
    reply.header('Cache-Control', 'max-age=86400');
    return fs.createReadStream(filePath);
  });

  // Test endpoint: emits a fake alert event to a channel room so overlays can show it
  app.post('/alert-sounds/test', async (req, reply) => {
    const { type, channel } = req.body as { type: string; channel: string };
    if (!type || !channel) {
      return reply.status(400).send({ error: 'Missing type or channel' });
    }

    const testUser = 'StreamDaemon_Test';
    const displayName = 'StreamDaemon Test';

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
