import { FastifyInstance } from 'fastify';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../../data');
const CONFIG_FILE = path.join(DATA_DIR, 'fortnite-config.json');

interface FortniteConfig {
  apiKey: string;
  epicUsername: string;
  statsMode: string;
}

const DEFAULT_CONFIG: FortniteConfig = { apiKey: '', epicUsername: '', statsMode: 'solo' };

let fortniteConfig: FortniteConfig = { ...DEFAULT_CONFIG };
const statsCache = new Map<string, { data: any; expiresAt: number }>();
const CACHE_TTL = 5 * 60 * 1000;

function loadConfig() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
      fortniteConfig = { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
    }
    if (!fortniteConfig.apiKey && config.FORTNITE_API_KEY) {
      fortniteConfig.apiKey = config.FORTNITE_API_KEY;
    }
  } catch (e) {
    console.warn('Failed to load fortnite-config.json', e);
  }
}

function saveConfig() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(fortniteConfig, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Failed to save fortnite-config.json', e);
  }
}

loadConfig();

function getModeKey(mode: string): string {
  const m = mode.toLowerCase();
  if (['solo', 'duo', 'trio', 'squad'].includes(m)) return m;
  return 'solo';
}

async function fetchFortniteStats(username: string, mode: string): Promise<any> {
  const cacheKey = `${username}:${mode}`;
  const cached = statsCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  const apiKey = fortniteConfig.apiKey || config.FORTNITE_API_KEY;
  if (!apiKey) throw new Error('FORTNITE_API_KEY not configured');

  const url = `https://fortnite-api.com/v2/stats/br/v2?name=${encodeURIComponent(username)}&accountType=epic&timeWindow=lifetime`;
  const res = await fetch(url, { headers: { Authorization: apiKey } });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Fortnite API error ${res.status}: ${text}`);
  }

  const body = await res.json();
  if (body.status !== 200 || !body.data) throw new Error('Invalid Fortnite API response');

  const statsAll = body.data.stats?.all;
  if (!statsAll) throw new Error('No stats found for this user');

  const modeKey = getModeKey(mode);
  const modeStats = statsAll[modeKey] || statsAll.overall;

  const result = {
    account: body.data.account,
    battlePass: body.data.battlePass,
    mode: modeKey,
    kills: modeStats?.kills?.value ?? 0,
    wins: modeStats?.wins?.value ?? 0,
    matches: modeStats?.matches?.value ?? 0,
    kd: modeStats?.kd?.value ?? 0,
    winRate: modeStats?.winRate?.value ?? 0,
    top10: modeStats?.top10?.value ?? 0,
    top25: modeStats?.top25?.value ?? 0,
    score: modeStats?.score?.value ?? 0,
    minutesPlayed: modeStats?.minutesPlayed?.value ?? 0,
    killsPerMatch: modeStats?.killsPerMatch?.value ?? 0,
  };

  statsCache.set(cacheKey, { data: result, expiresAt: Date.now() + CACHE_TTL });
  return result;
}

export function setupFortnite(app: FastifyInstance) {
  // Get current config
  app.get('/fortnite/config', () => ({
    apiKey: !!fortniteConfig.apiKey,
    epicUsername: fortniteConfig.epicUsername,
    statsMode: fortniteConfig.statsMode,
  }));

  // Update config
  app.put('/fortnite/config', async (req, reply) => {
    const { apiKey, epicUsername, statsMode } = req.body as Partial<FortniteConfig>;
    if (apiKey !== undefined) fortniteConfig.apiKey = apiKey;
    if (epicUsername !== undefined) fortniteConfig.epicUsername = epicUsername;
    if (statsMode !== undefined) fortniteConfig.statsMode = statsMode;
    saveConfig();
    reply.send({ ok: true });
  });

  // Fetch stats for a player
  app.get('/fortnite/stats/:username', async (req, reply) => {
    const { username } = req.params as { username: string };
    const { mode } = req.query as { mode?: string };

    if (!username) return reply.status(400).send({ error: 'Missing username' });

    try {
      const data = await fetchFortniteStats(username, mode || fortniteConfig.statsMode);
      reply.send(data);
    } catch (err: any) {
      reply.status(502).send({ error: err.message ?? 'Failed to fetch Fortnite stats' });
    }
  });
}
