import { FastifyInstance } from 'fastify';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { sendMessage } from '../chat/index.js';
import { getChatMessagesPerMinute } from '../kpi/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || path.resolve(__dirname, '../../data');
const TIMERS_FILE = path.join(DATA_DIR, 'timers.json');

export interface ChatTimer {
  id: string;
  name: string;
  response: string;
  intervalMinutes: number;
  minLines: number;
  enabled: boolean;
  lastTriggered: number;
}

let store = new Map<string, ChatTimer[]>();
let engineInterval: ReturnType<typeof setInterval> | null = null;

function load() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (fs.existsSync(TIMERS_FILE)) {
      const raw = fs.readFileSync(TIMERS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      store = new Map(Object.entries(parsed));
    }
  } catch (e) {
    console.warn('⚠️ Could not load timers.json, starting fresh', e);
  }
}

function save() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    const obj = Object.fromEntries(store);
    fs.writeFileSync(TIMERS_FILE, JSON.stringify(obj, null, 2), 'utf-8');
  } catch (e) {
    console.error('❌ Failed to save timers.json', e);
  }
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function getTimersForChannel(channel: string): ChatTimer[] {
  return store.get(channel.toLowerCase()) ?? [];
}

// Every minute, check all timers for all channels
function runEngine() {
  const now = Date.now();
  for (const [channel, timers] of store.entries()) {
    for (const timer of timers) {
      if (!timer.enabled) continue;
      
      const msSinceLast = now - (timer.lastTriggered || 0);
      const minutesSinceLast = msSinceLast / 1000 / 60;
      
      if (minutesSinceLast >= timer.intervalMinutes) {
        // Evaluate lines logic if minLines > 0
        if (timer.minLines > 0) {
          // We don't have exact historical lines since last trigger easily,
          // but we can look at the current activity. 
          // If the chat is completely dead, let's delay it.
          const currentMsgsPerMin = getChatMessagesPerMinute(channel);
          // If the chat is dead and requires minLines, just skip this tick.
          if (currentMsgsPerMin === 0) continue;
        }

        // Send message
        let response = timer.response;
        response = response.replace(/\{channel\}/g, channel);
        response = response.replace(/\{streamer\}/g, channel);
        
        sendMessage(channel, response);
        timer.lastTriggered = now;
        save();
      }
    }
  }
}

export function setupChatTimers(app: FastifyInstance) {
  load();

  if (!engineInterval) {
    engineInterval = setInterval(runEngine, 60000); // Check every minute
  }

  app.get('/timers/:channel', (req, reply) => {
    const { channel } = req.params as { channel: string };
    return getTimersForChannel(channel);
  });

  app.post('/timers/add', async (req, reply) => {
    const body = req.body as { channel: string; name: string; response: string; intervalMinutes: number; minLines?: number };
    if (!body.channel || !body.name || !body.response || !body.intervalMinutes) {
      return reply.status(400).send({ error: 'Faltan parámetros obligatorios' });
    }

    const channel = body.channel.toLowerCase();
    if (!store.has(channel)) store.set(channel, []);

    const timers = store.get(channel)!;
    
    const timer: ChatTimer = {
      id: generateId(),
      name: body.name.trim(),
      response: body.response,
      intervalMinutes: Math.max(1, body.intervalMinutes),
      minLines: body.minLines ?? 0,
      enabled: true,
      lastTriggered: Date.now(), // start counting from now
    };

    timers.push(timer);
    save();
    return reply.send(timer);
  });

  app.put('/timers/toggle', async (req, reply) => {
    const body = req.body as { channel: string; timerId: string; enabled: boolean };
    const channel = body.channel.toLowerCase();
    const timers = store.get(channel);
    if (!timers) return reply.status(404).send({ error: 'No timers for this channel' });

    const timer = timers.find((t) => t.id === body.timerId);
    if (!timer) return reply.status(404).send({ error: 'Timer not found' });

    timer.enabled = body.enabled;
    if (timer.enabled) {
      timer.lastTriggered = Date.now(); // reset timer
    }
    save();
    return reply.send({ ok: true });
  });

  app.post('/timers/delete', async (req, reply) => {
    const body = req.body as { channel: string; timerId: string };
    const channel = body.channel.toLowerCase();
    const timers = store.get(channel);
    if (!timers) return reply.status(404).send({ error: 'No timers for this channel' });

    const idx = timers.findIndex((t) => t.id === body.timerId);
    if (idx === -1) return reply.status(404).send({ error: 'Timer not found' });

    timers.splice(idx, 1);
    save();
    return reply.send({ ok: true });
  });

  app.put('/timers/update', async (req, reply) => {
    const body = req.body as {
      channel: string; timerId: string;
      name?: string; response?: string; intervalMinutes?: number; minLines?: number;
    };
    const channel = body.channel.toLowerCase();
    const timers = store.get(channel);
    if (!timers) return reply.status(404).send({ error: 'No timers for this channel' });

    const timer = timers.find((t) => t.id === body.timerId);
    if (!timer) return reply.status(404).send({ error: 'Timer not found' });

    if (body.name !== undefined) timer.name = body.name.trim();
    if (body.response !== undefined) timer.response = body.response;
    if (body.intervalMinutes !== undefined) timer.intervalMinutes = Math.max(1, body.intervalMinutes);
    if (body.minLines !== undefined) timer.minLines = Math.max(0, body.minLines);

    save();
    return reply.send({ ok: true });
  });
}
