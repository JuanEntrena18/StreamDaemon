import { FastifyInstance } from 'fastify';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getIO } from '../socket/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../../data');
const CONFIG_FILE = path.join(DATA_DIR, 'avatar-config.json');

// Mirror of AvatarConfig from frontend
const DEFAULT_CONFIG = {
  enabled: true,
  theme: 'default',
  maxAvatars: 20,
  commandsEnabled: true,
  commandCooldowns: {
    '!dance': 5,
    '!wave': 3,
    '!jump': 2,
    '!explode': 10,
    '!sleep': 0,
  },
  eventActions: {
    chat: true,
    bits: true,
    subscription: true,
    raid: true,
    follow: true,
  },
  physicsEnabled: true,
  nametagsVisible: true,
};

let currentConfig = { ...DEFAULT_CONFIG };

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
      currentConfig = { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.error('Failed to load avatar config:', e);
  }
}

function saveConfig() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(currentConfig, null, 2));
  } catch (e) {
    console.error('Failed to save avatar config:', e);
  }
}

export function setupAvatars(app: FastifyInstance) {
  loadConfig();

  app.get('/avatars/config', async (req, reply) => {
    return currentConfig;
  });

  app.put('/avatars/config', async (req, reply) => {
    const body = req.body as Partial<typeof DEFAULT_CONFIG>;
    currentConfig = { ...currentConfig, ...body };
    saveConfig();
    
    // Broadcast config change to all connected clients (OBS overlay & dashboard)
    getIO().emit('avatars:config_updated', currentConfig);
    
    return { ok: true };
  });
}
