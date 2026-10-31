import { FastifyInstance } from 'fastify';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import AdmZip from 'adm-zip';
import { StreamAvatarConfigSchema, type StreamAvatarConfig } from '@streamdaemon/shared';
import { getIO } from '../socket/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || path.resolve(__dirname, '../../data');
const ASSETS_DIR = path.join(DATA_DIR, 'stream-avatar-assets');
const CONFIG_FILE = path.join(DATA_DIR, 'stream-avatar-config.json');

const DEFAULT_CONFIG: StreamAvatarConfig = StreamAvatarConfigSchema.parse({});

let currentConfig: StreamAvatarConfig = { ...DEFAULT_CONFIG };

const REQUIRED_FILES = [
  'body.png',
  'eyes-open.png',
  'eyes-closed.png',
  'mouth-closed.png',
  'mouth-slight.png',
  'mouth-open.png',
  'mouth-wide.png',
  'mouth-round.png',
];

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<StreamAvatarConfig>;
      currentConfig = StreamAvatarConfigSchema.parse({ ...DEFAULT_CONFIG, ...parsed });
    }
  } catch (e) {
    console.error('[stream-avatar] Failed to load config:', e);
  }
}

function saveConfig() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(currentConfig, null, 2));
  } catch (e) {
    console.error('[stream-avatar] Failed to save config:', e);
  }
}

function ensureAssetsDir() {
  if (!fs.existsSync(ASSETS_DIR)) fs.mkdirSync(ASSETS_DIR, { recursive: true });
}

function listAssets(): Array<{ id: string; name: string; createdAt: number }> {
  ensureAssetsDir();
  const entries = fs.readdirSync(ASSETS_DIR, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory())
    .map((e) => {
      const dir = path.join(ASSETS_DIR, e.name);
      const manifestPath = path.join(dir, 'manifest.json');
      let name = e.name;
      let createdAt = 0;
      try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as {
          name?: string;
          createdAt?: number;
        };
        name = manifest.name || e.name;
        createdAt = manifest.createdAt || 0;
      } catch {}
      return { id: e.name, name, createdAt };
    })
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function setupStreamAvatar(app: FastifyInstance) {
  loadConfig();
  ensureAssetsDir();

  app.get('/stream-avatar/config', async (_req, _reply) => {
    return currentConfig;
  });

  app.put('/stream-avatar/config', async (req, _reply) => {
    const body = req.body as Partial<StreamAvatarConfig>;
    currentConfig = StreamAvatarConfigSchema.parse({ ...currentConfig, ...body });
    saveConfig();

    getIO().emit('stream-avatar:config_updated', currentConfig);

    return { ok: true, config: currentConfig };
  });

  app.get('/stream-avatar/assets', async (_req, _reply) => {
    return listAssets();
  });

  app.post('/stream-avatar/assets', async (req, _reply) => {
    const data = await req.file();
    if (!data) {
      return { ok: false, error: 'No file uploaded' };
    }

    const buffer = await data.toBuffer();
    const assetId = `custom-${Date.now()}`;
    const assetDir = path.join(ASSETS_DIR, assetId);
    fs.mkdirSync(assetDir, { recursive: true });

    try {
      const zip = new AdmZip(buffer);
      zip.extractAllTo(assetDir, true);
    } catch {
      fs.rmSync(assetDir, { recursive: true, force: true });
      return { ok: false, error: 'Invalid ZIP file' };
    }

    // Flatten if files are inside a single subfolder (ignoring __MACOSX)
    const files = fs.readdirSync(assetDir).filter((f) => f !== '__MACOSX' && !f.startsWith('.'));
    const subdirs = files.filter((f) => fs.statSync(path.join(assetDir, f)).isDirectory());
    if (subdirs.length === 1 && files.length === 1) {
      const subDir = path.join(assetDir, subdirs[0]);
      for (const file of fs.readdirSync(subDir)) {
        fs.renameSync(path.join(subDir, file), path.join(assetDir, file));
      }
      fs.rmSync(subDir, { recursive: true, force: true });
    }

    const missing = REQUIRED_FILES.filter((f) => !fs.existsSync(path.join(assetDir, f)));
    if (missing.length > 0) {
      fs.rmSync(assetDir, { recursive: true, force: true });
      return { ok: false, error: `Missing files: ${missing.join(', ')}` };
    }

    fs.writeFileSync(
      path.join(assetDir, 'manifest.json'),
      JSON.stringify({ name: data.filename.replace(/\.zip$/i, ''), createdAt: Date.now() }, null, 2),
    );

    getIO().emit('stream-avatar:assets_updated', listAssets());

    return { ok: true, assetId, assets: listAssets() };
  });

  app.post('/stream-avatar/template-zip', async (req, reply) => {
    const body = req.body as {
      files?: Record<string, string>;
      readme?: string;
    };

    const zip = new AdmZip();

    if (body?.files) {
      for (const fileName of REQUIRED_FILES) {
        const dataUrl = body.files[fileName];
        if (typeof dataUrl === 'string') {
          const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
          zip.addFile(fileName, Buffer.from(base64, 'base64'));
        }
      }
    }

    if (typeof body?.readme === 'string' && body.readme.trim().length > 0) {
      zip.addFile('README_TEMPLATE.txt', Buffer.from(body.readme, 'utf-8'));
    }

    const zipBuffer = zip.toBuffer();
    reply
      .header('Content-Type', 'application/zip')
      .header('Content-Disposition', 'attachment; filename="streamdaemon-avatar-template.zip"')
      .send(zipBuffer);
  });

  app.delete('/stream-avatar/assets/:id', async (req, _reply) => {
    const { id } = req.params as { id: string };
    const safeId = path.basename(id);
    const assetDir = path.join(ASSETS_DIR, safeId);
    if (!fs.existsSync(assetDir)) {
      return { ok: false, error: 'Asset not found' };
    }
    fs.rmSync(assetDir, { recursive: true, force: true });

    // Reset to default avatar if the deleted asset was selected
    if (currentConfig.avatarId === safeId) {
      currentConfig = { ...currentConfig, avatarId: 'default' };
      saveConfig();
      getIO().emit('stream-avatar:config_updated', currentConfig);
    }

    getIO().emit('stream-avatar:assets_updated', listAssets());
    return { ok: true, assets: listAssets() };
  });

  // Serve static avatar assets
  app.register(import('@fastify/static'), {
    root: ASSETS_DIR,
    prefix: '/stream-avatar/assets/',
    decorateReply: false,
  });
}
