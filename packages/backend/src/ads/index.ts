import { FastifyInstance } from 'fastify';
import { readFile, writeFile, mkdir, unlink, readdir } from 'fs/promises';
import { existsSync, createWriteStream } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getIO } from '../socket/index.js';
import { pipeline } from 'stream';
import { promisify } from 'util';

const pump = promisify(pipeline);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || path.resolve(__dirname, '../../data');

interface AdsConfig {
  mode: 'lateral' | 'crossfade';
  speed: number;
  width: number;
  height: number;
}

interface AdImage {
  id: string;
  filename: string;
  order: number;
}

function adsDir(channel: string): string {
  return path.join(DATA_DIR, 'ads', channel);
}

function configFile(channel: string): string {
  return path.join(DATA_DIR, `ads-config-${channel}.json`);
}

async function ensureDirs(channel: string) {
  const d = adsDir(channel);
  if (!existsSync(DATA_DIR)) await mkdir(DATA_DIR, { recursive: true });
  if (!existsSync(d)) await mkdir(d, { recursive: true });
}

async function loadConfig(channel: string): Promise<AdsConfig> {
  try {
    const raw = await readFile(configFile(channel), 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { mode: 'lateral', speed: 50, width: 300, height: 200 };
  }
}

async function saveConfig(channel: string, config: AdsConfig) {
  await ensureDirs(channel);
  await writeFile(configFile(channel), JSON.stringify(config, null, 2), 'utf-8');
}

async function loadImages(channel: string): Promise<AdImage[]> {
  await ensureDirs(channel);
  try {
    const files = await readdir(adsDir(channel));
    const pngs = files.filter(f => f.endsWith('.png')).sort();
    return pngs.map((f, i) => ({ id: f.replace('.png', ''), filename: f, order: i }));
  } catch {
    return [];
  }
}

function broadcast(channel: string) {
  Promise.all([loadConfig(channel), loadImages(channel)]).then(([config, images]) => {
    getIO().to(`channel:${channel}`).emit('ads:update', { config, images });
  });
}

export function setupAds(app: FastifyInstance) {
  // Serve image files statically
  app.get('/ads/:channel/:filename', async (req, reply) => {
    const { channel, filename } = req.params as { channel: string; filename: string };
    const filePath = path.join(adsDir(channel), filename);
    try {
      const content = await readFile(filePath);
      reply.header('Content-Type', 'image/png');
      reply.header('Cache-Control', 'public, max-age=3600');
      reply.send(content);
    } catch {
      reply.status(404).send({ error: 'File not found' });
    }
  });

  // GET config + images
  app.get('/ads/:channel', async (req, reply) => {
    const { channel } = req.params as { channel: string };
    const [config, images] = await Promise.all([loadConfig(channel), loadImages(channel)]);
    reply.send({ config, images });
  });

  // PUT config
  app.put('/ads/:channel/config', async (req, reply) => {
    const { channel } = req.params as { channel: string };
    const body = req.body as Partial<AdsConfig>;
    const current = await loadConfig(channel);
    const config: AdsConfig = { ...current, ...body };
    await saveConfig(channel, config);
    broadcast(channel);
    reply.send(config);
  });

  // POST upload image
  app.post('/ads/:channel/upload', async (req, reply) => {
    const { channel } = req.params as { channel: string };
    await ensureDirs(channel);
    const contentType = req.headers['content-type'] || '';
    if (!contentType.includes('multipart/form-data')) {
      return reply.status(400).send({ error: 'Expected multipart/form-data' });
    }
    const data = await req.file();
    if (!data) return reply.status(400).send({ error: 'No file uploaded' });
    const ext = path.extname(data.filename).toLowerCase();
    if (ext !== '.png') return reply.status(400).send({ error: 'Only PNG files allowed' });
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const filename = `${id}.png`;
    const filePath = path.join(adsDir(channel), filename);
    const writeStream = createWriteStream(filePath);
    await pump(data.file, writeStream);
    broadcast(channel);
    reply.status(201).send({ id, filename });
  });

  // DELETE image
  app.delete('/ads/:channel/:id', async (req, reply) => {
    const { channel, id } = req.params as { channel: string; id: string };
    const filePath = path.join(adsDir(channel), `${id}.png`);
    try {
      await unlink(filePath);
    } catch {
      return reply.status(404).send({ error: 'Image not found' });
    }
    broadcast(channel);
    reply.send({ success: true });
  });

  // PUT reorder
  app.put('/ads/:channel/reorder', async (req, reply) => {
    const { channel } = req.params as { channel: string };
    const { ids } = req.body as { ids: string[] };
    if (!Array.isArray(ids)) return reply.status(400).send({ error: 'ids must be an array' });
    const images = await loadImages(channel);
    const renamed: string[] = [];
    for (let i = 0; i < ids.length; i++) {
      const img = images.find(im => im.id === ids[i]);
      if (img) renamed.push(img.filename);
    }
    broadcast(channel);
    reply.send({ success: true, order: renamed });
  });
}

export async function handleGetAds(channel: string) {
  const [config, images] = await Promise.all([loadConfig(channel), loadImages(channel)]);
  getIO().to(`channel:${channel}`).emit('ads:update', { config, images });
}
