import { FastifyInstance } from 'fastify';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getIO } from '../socket/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../../data');

interface HltbData {
  mainStory: number;
  mainExtra: number;
  completionist: number;
}

interface GameEntry {
  id: string;
  channel: string;
  name: string;
  coverUrl?: string;
  hoursPlayed: number;
  score: number;
  completedDate?: string;
  playDates?: string[];
  notes?: string;
  hltbData?: HltbData;
  createdAt: string;
  updatedAt: string;
}

function dataFile(channel: string): string {
  return path.join(DATA_DIR, `diary-${channel}.json`);
}

async function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true });
  }
}

async function loadEntries(channel: string): Promise<GameEntry[]> {
  await ensureDataDir();
  try {
    const raw = await readFile(dataFile(channel), 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function saveEntries(channel: string, entries: GameEntry[]) {
  await ensureDataDir();
  await writeFile(dataFile(channel), JSON.stringify(entries, null, 2), 'utf-8');
}

function broadcast(channel: string) {
  loadEntries(channel).then(entries => {
    getIO().to(`channel:${channel}`).emit('diary:update', entries);
  });
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

interface HltbSearchResult {
  game_id: number;
  game_name: string;
  game_image_url?: string;
  gameplay_main: number;
  gameplay_main_extra: number;
  gameplay_completionist: number;
}

let hltbToken: { token: string; hpKey: string; hpVal: string } | null = null;
let hltbTokenExpiry = 0;

async function getHltbToken(): Promise<{ token: string; hpKey: string; hpVal: string } | null> {
  if (hltbToken && Date.now() < hltbTokenExpiry) return hltbToken;
  try {
    const res = await fetch(`https://howlongtobeat.com/api/bleed/init?t=${Date.now()}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://howlongtobeat.com/',
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.token || !data.hpKey || !data.hpVal) return null;
    hltbToken = { token: data.token, hpKey: data.hpKey, hpVal: data.hpVal };
    hltbTokenExpiry = Date.now() + 3600000; // 1 hour
    return hltbToken;
  } catch {
    return null;
  }
}

async function searchHltb(query: string): Promise<HltbSearchResult[]> {
  try {
    const auth = await getHltbToken();
    if (!auth) return [];

    const res = await fetch('https://howlongtobeat.com/api/bleed', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://howlongtobeat.com/',
        'x-auth-token': auth.token,
        'x-hp-key': auth.hpKey,
        'x-hp-val': auth.hpVal,
      },
      body: JSON.stringify({
        searchType: 'games',
        searchTerms: query.trim().split(/\s+/),
        searchPage: 1,
        size: 10,
        searchOptions: {
          games: { userId: 0, platform: '', sortCategory: 'popular', rangeCategory: 'main', rangeTime: { min: null, max: null }, gameplay: { perspective: '', flow: '', genre: '', difficulty: '' }, rangeYear: { min: '', max: '' }, modifier: '' },
          users: { sortCategory: 'postcount' },
          lists: { sortCategory: 'follows' },
          filter: '', sort: 0, randomizer: 0,
        },
        useCache: true,
        [auth.hpKey]: auth.hpVal,
      }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data || []).map((g: any) => ({
      game_id: g.game_id,
      game_name: g.game_name,
      game_image_url: g.game_image ? `https://howlongtobeat.com/games/${g.game_image}` : undefined,
      gameplay_main: g.comp_main || 0,
      gameplay_main_extra: g.comp_plus || 0,
      gameplay_completionist: g.comp_100 || 0,
    }));
  } catch {
    return [];
  }
}

export function setupDiary(app: FastifyInstance) {
  app.get('/diary/hltb-search', async (req, reply) => {
    const { q } = req.query as { q?: string };
    if (!q || q.length < 2) return reply.send([]);
    const results = await searchHltb(q);
    reply.send(results);
  });

  app.get('/diary/:channel', async (req, reply) => {
    const { channel } = req.params as { channel: string };
    const entries = await loadEntries(channel);
    reply.send(entries);
  });

  app.post('/diary/:channel', async (req, reply) => {
    const { channel } = req.params as { channel: string };
    const body = req.body as Partial<GameEntry>;
    if (!body.name) return reply.status(400).send({ error: 'Missing required field: name' });

    const entries = await loadEntries(channel);
    const entry: GameEntry = {
      id: generateId(),
      channel,
      name: body.name,
      hoursPlayed: body.hoursPlayed ?? 0,
      score: body.score ?? 0,
      coverUrl: body.coverUrl,
      completedDate: body.completedDate,
      playDates: body.playDates,
      notes: body.notes,
      hltbData: body.hltbData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    entries.push(entry);
    await saveEntries(channel, entries);
    broadcast(channel);
    reply.status(201).send(entry);
  });

  app.put('/diary/:channel/:id', async (req, reply) => {
    const { channel, id } = req.params as { channel: string; id: string };
    const body = req.body as Partial<GameEntry>;
    const entries = await loadEntries(channel);
    const idx = entries.findIndex(e => e.id === id);
    if (idx === -1) return reply.status(404).send({ error: 'Entry not found' });

    entries[idx] = { ...entries[idx], ...body, id, channel, updatedAt: new Date().toISOString() };
    await saveEntries(channel, entries);
    broadcast(channel);
    reply.send(entries[idx]);
  });

  app.delete('/diary/:channel/:id', async (req, reply) => {
    const { channel, id } = req.params as { channel: string; id: string };
    const entries = await loadEntries(channel);
    const filtered = entries.filter(e => e.id !== id);
    if (filtered.length === entries.length) {
      return reply.status(404).send({ error: 'Entry not found' });
    }
    await saveEntries(channel, filtered);
    broadcast(channel);
    reply.send({ success: true });
  });
}

export async function handleGetDiary(channel: string) {
  const entries = await loadEntries(channel);
  getIO().to(`channel:${channel}`).emit('diary:update', entries);
}
