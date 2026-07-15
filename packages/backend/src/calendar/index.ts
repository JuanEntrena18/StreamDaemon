import { FastifyInstance } from 'fastify';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getIO } from '../socket/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../../data');

interface CalendarEvent {
  id: string;
  channel: string;
  title: string;
  date: string;
  startTime: string;
  duration: number;
  game?: string;
  category?: string;
  description?: string;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

function dataFile(channel: string): string {
  return path.join(DATA_DIR, `calendar-${channel}.json`);
}

async function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true });
  }
}

async function loadEvents(channel: string): Promise<CalendarEvent[]> {
  await ensureDataDir();
  const file = dataFile(channel);
  try {
    const raw = await readFile(file, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function saveEvents(channel: string, events: CalendarEvent[]) {
  await ensureDataDir();
  await writeFile(dataFile(channel), JSON.stringify(events, null, 2), 'utf-8');
}

function broadcast(channel: string) {
  loadEvents(channel).then(events => {
    getIO().to(`channel:${channel}`).emit('calendar:update', events);
  });
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function setupCalendar(app: FastifyInstance) {
  app.get('/calendar/:channel', async (req, reply) => {
    const { channel } = req.params as { channel: string };
    const events = await loadEvents(channel);
    reply.send(events);
  });

  app.post('/calendar/:channel', async (req, reply) => {
    const { channel } = req.params as { channel: string };
    const body = req.body as Partial<CalendarEvent>;
    if (!body.title || !body.date || !body.startTime) {
      return reply.status(400).send({ error: 'Missing required fields: title, date, startTime' });
    }

    const events = await loadEvents(channel);
    const event: CalendarEvent = {
      id: generateId(),
      channel,
      title: body.title,
      date: body.date,
      startTime: body.startTime,
      duration: body.duration ?? 60,
      game: body.game,
      category: body.category,
      description: body.description,
      color: body.color,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    events.push(event);
    await saveEvents(channel, events);
    broadcast(channel);
    reply.status(201).send(event);
  });

  app.put('/calendar/:channel/:id', async (req, reply) => {
    const { channel, id } = req.params as { channel: string; id: string };
    const body = req.body as Partial<CalendarEvent>;
    const events = await loadEvents(channel);
    const idx = events.findIndex(e => e.id === id);
    if (idx === -1) return reply.status(404).send({ error: 'Event not found' });

    events[idx] = { ...events[idx], ...body, id, channel, updatedAt: new Date().toISOString() };
    await saveEvents(channel, events);
    broadcast(channel);
    reply.send(events[idx]);
  });

  app.delete('/calendar/:channel/:id', async (req, reply) => {
    const { channel, id } = req.params as { channel: string; id: string };
    const events = await loadEvents(channel);
    const filtered = events.filter(e => e.id !== id);
    if (filtered.length === events.length) {
      return reply.status(404).send({ error: 'Event not found' });
    }
    await saveEvents(channel, filtered);
    broadcast(channel);
    reply.send({ success: true });
  });
}

export async function handleGetCalendar(channel: string) {
  const events = await loadEvents(channel);
  getIO().to(`channel:${channel}`).emit('calendar:update', events);
}
