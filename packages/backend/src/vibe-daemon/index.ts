import { FastifyInstance } from 'fastify';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  VibeDaemonConfigSchema,
  VibeDaemonEventSchema,
  type VibeDaemonConfig,
  type VibeDaemonEvent,
  type VibeDaemonState,
  type VibeDaemonGameId,
} from '@streamdaemon/shared';
import { getIO } from '../socket/index.js';
import { logger } from '../logger.js';
import { evaluateTrigger, buildActivation, normalizeGameId } from './engine.js';
import { getState, resetState } from './state.js';
import { createGlobalAdapter } from './adapters/global.js';
import { createFortniteAdapter } from './adapters/fortnite.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || path.resolve(__dirname, '../../data');
const CONFIG_FILE = path.join(DATA_DIR, 'vibe-daemon.json');

export interface VibeDaemonAdapter {
  name: string;
  handleEvent(event: VibeDaemonEvent): Promise<VibeDaemonState>;
  reset(channel: string, gameId: VibeDaemonGameId): Promise<VibeDaemonState>;
}

const DEFAULT_CONFIG: VibeDaemonConfig = {
  enabled: false,
  triggers: [
    {
      id: 'global-kill',
      gameId: 'global',
      name: '+1 Kill',
      enabled: true,
      eventType: 'kill',
      condition: { type: 'count', count: 1, period: 'session' },
      action: { type: 'overlay', overlayId: 'vibe-daemon', durationMs: 3000 },
    },
    {
      id: 'global-victory',
      gameId: 'global',
      name: '+1 Victory',
      enabled: true,
      eventType: 'victory',
      condition: { type: 'count', count: 1, period: 'session' },
      action: { type: 'overlay', overlayId: 'vibe-daemon', durationMs: 5000 },
    },
    {
      id: 'global-kill-streak',
      gameId: 'global',
      name: '5+ Kill Streak',
      enabled: true,
      eventType: 'kill_streak',
      condition: { type: 'count', count: 5, period: 'match' },
      action: { type: 'overlay', overlayId: 'vibe-daemon', durationMs: 4000 },
    },
    {
      id: 'global-victory-streak',
      gameId: 'global',
      name: '2+ Victory Streak',
      enabled: true,
      eventType: 'victory_streak',
      condition: { type: 'count', count: 2, period: 'session' },
      action: { type: 'overlay', overlayId: 'vibe-daemon', durationMs: 4000 },
    },
    {
      id: 'fortnite-low-shield',
      gameId: 'fortnite',
      name: 'Low Shield',
      enabled: true,
      eventType: 'low_shield',
      condition: { type: 'state' },
      action: { type: 'overlay', overlayId: 'vibe-daemon', durationMs: 3000 },
    },
    {
      id: 'fortnite-low-health',
      gameId: 'fortnite',
      name: 'Low Health',
      enabled: true,
      eventType: 'low_health',
      condition: { type: 'state' },
      action: { type: 'overlay', overlayId: 'vibe-daemon', durationMs: 3000 },
    },
    {
      id: 'fortnite-storm',
      gameId: 'fortnite',
      name: 'Storm Shrinking',
      enabled: true,
      eventType: 'storm_shrinking',
      condition: { type: 'state' },
      action: { type: 'overlay', overlayId: 'vibe-daemon', durationMs: 3000 },
    },
  ],
  hotkeys: {
    kill: 'CommandOrControl+Shift+K',
    death: 'CommandOrControl+Shift+D',
    victory: 'CommandOrControl+Shift+V',
  },
};

let config: VibeDaemonConfig = { ...DEFAULT_CONFIG };

function loadConfig() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      config = { ...DEFAULT_CONFIG, ...parsed };
    }
  } catch (e) {
    logger.warn({ err: e }, 'Failed to load vibe-daemon.json');
  }
}

function saveConfig() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
  } catch (e) {
    logger.warn({ err: e }, 'Failed to save vibe-daemon.json');
  }
}

loadConfig();

function getAdapter(gameId: VibeDaemonGameId): VibeDaemonAdapter {
  switch (gameId) {
    case 'fortnite':
      return createFortniteAdapter({ channel: '' });
    case 'global':
    default:
      return createGlobalAdapter({ channel: '', gameId: 'global' });
  }
}

export async function processVibeDaemonEvent(event: VibeDaemonEvent): Promise<VibeDaemonState> {
  if (!config.enabled) return getState(event.channel, event.gameId);

  const adapter = getAdapter(event.gameId);
  const state = await adapter.handleEvent(event);

  const normalizedGameId = normalizeGameId(event.gameId);
  const matchedTriggers = config.triggers.filter((trigger) => {
    const matchesGame = trigger.gameId === 'global' || trigger.gameId === event.gameId || trigger.gameId === normalizedGameId;
    if (!matchesGame) return false;
    return evaluateTrigger(trigger, state, event);
  });

  for (const trigger of matchedTriggers) {
    const activation = buildActivation(trigger, event.channel, event);
    getIO().to(`channel:${event.channel}`).emit('vibe-daemon:activation', activation);
    logger.info(
      { triggerId: trigger.id, eventType: event.eventType, channel: event.channel },
      'Vibe Daemon triggered',
    );
  }

  getIO().to(`channel:${event.channel}`).emit('vibe-daemon:state', state);
  return state;
}

export function getVibeDaemonConfig(): VibeDaemonConfig {
  return { ...config, triggers: config.triggers.map((t) => ({ ...t })) };
}

export function setupVibeDaemon(app: FastifyInstance) {
  app.get('/vibe-daemon/config', () => getVibeDaemonConfig());

  app.put('/vibe-daemon/config', async (req, reply) => {
    const parsed = VibeDaemonConfigSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid config', details: parsed.error.flatten() });
    }
    config = {
      ...DEFAULT_CONFIG,
      ...parsed.data,
      hotkeys: { ...DEFAULT_CONFIG.hotkeys, ...parsed.data.hotkeys },
    };
    saveConfig();
    reply.send({ ok: true });
  });

  app.get('/vibe-daemon/state/:channel', async (req, reply) => {
    const { channel } = req.params as { channel: string };
    return getState(channel, normalizeGameId('global'));
  });

  app.post('/vibe-daemon/event', async (req, reply) => {
    const parsed = VibeDaemonEventSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid event', details: parsed.error.flatten() });
    }
    const event: VibeDaemonEvent = {
      ...parsed.data,
      timestamp: parsed.data.timestamp ?? Date.now(),
    };
    const state = await processVibeDaemonEvent(event);
    reply.send({ ok: true, state });
  });

  app.post('/vibe-daemon/reset/:channel', async (req, reply) => {
    const { channel } = req.params as { channel: string };
    const { gameId } = req.body as { gameId?: string };
    resetState(channel, gameId || 'global');
    reply.send({ ok: true });
  });

  app.post('/vibe-daemon/test', async (req, reply) => {
    const { channel, eventType, gameId } = req.body as { channel: string; eventType: string; gameId?: string };
    if (!channel || !eventType) {
      return reply.status(400).send({ error: 'Missing channel or eventType' });
    }
    const event: VibeDaemonEvent = {
      channel,
      gameId: gameId || normalizeGameId('global'),
      eventType: eventType as VibeDaemonEvent['eventType'],
      timestamp: Date.now(),
    };
    const state = await processVibeDaemonEvent(event);
    reply.send({ ok: true, state });
  });
}
