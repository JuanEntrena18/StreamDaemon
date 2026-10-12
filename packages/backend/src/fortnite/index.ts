import { FastifyInstance } from 'fastify';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || path.resolve(__dirname, '../../data');
const CONFIG_FILE = path.join(DATA_DIR, 'fortnite-config.json');

interface FortniteConfig {
  apiKey: string;
  epicUsername: string;
  statsMode: string;
  layout: string;
}

const DEFAULT_CONFIG: FortniteConfig = { apiKey: '', epicUsername: '', statsMode: 'overall', layout: 'stats' };

interface FortniteApiStat {
  value?: number;
  [key: string]: unknown;
}

interface FortniteApiStats {
  all?: Record<string, FortniteApiStat | undefined>;
}

interface FortniteStatsResult {
  account: unknown;
  battlePass: unknown;
  mode: string;
  kills: number;
  wins: number;
  matches: number;
  kd: number;
  winRate: number;
  top10: number;
  top25: number;
  score: number;
  minutesPlayed: number;
  killsPerMatch: number;
}

let fortniteConfig: FortniteConfig = { ...DEFAULT_CONFIG };
const statsCache = new Map<string, { data: FortniteStatsResult; expiresAt: number }>();
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
  if (['overall', 'solo', 'duo', 'trio', 'squad'].includes(m)) return m;
  return 'overall';
}

function getStat(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  if (typeof v === 'object' && v !== null && typeof (v as FortniteApiStat).value === 'number') {
    return (v as FortniteApiStat).value ?? 0;
  }
  return 0;
}

async function fetchFortniteStats(username: string, mode: string): Promise<FortniteStatsResult> {
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

  const body = await res.json() as {
    status?: number;
    data?: {
      account?: unknown;
      battlePass?: unknown;
      stats?: FortniteApiStats;
    };
  };
  if (body.status !== 200 || !body.data) throw new Error('Invalid Fortnite API response');

  const statsAll = body.data.stats?.all;
  if (!statsAll) throw new Error('No stats found for this user');

  const modeKey = getModeKey(mode);
  let modeStats = statsAll[modeKey];
  // Fall back to overall when mode-specific stats are all zero
  if (modeStats && modeKey !== 'overall') {
    const zero = !(getStat(modeStats?.kills) || getStat(modeStats?.wins) || getStat(modeStats?.matches));
    if (zero) modeStats = statsAll.overall;
  }
  if (!modeStats) modeStats = statsAll.overall;
  if (!modeStats) throw new Error('No stats found for this user');

  const s = (k: string) => getStat(modeStats?.[k]);
  const result = {
    account: body.data.account,
    battlePass: body.data.battlePass,
    mode: modeKey,
    kills: s('kills'),
    wins: s('wins'),
    matches: s('matches'),
    kd: s('kd'),
    winRate: s('winRate'),
    top10: s('top10'),
    top25: s('top25'),
    score: s('score'),
    minutesPlayed: s('minutesPlayed'),
    killsPerMatch: s('killsPerMatch'),
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
    layout: fortniteConfig.layout,
  }));

  // Update config
  app.put('/fortnite/config', async (req, reply) => {
    const { apiKey, epicUsername, statsMode, layout } = req.body as Partial<FortniteConfig>;
    if (apiKey !== undefined && apiKey !== '') fortniteConfig.apiKey = apiKey;
    if (epicUsername !== undefined) fortniteConfig.epicUsername = epicUsername;
    if (statsMode !== undefined) fortniteConfig.statsMode = statsMode;
    if (layout !== undefined) fortniteConfig.layout = layout;
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
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch Fortnite stats';
      reply.status(502).send({ error: message });
    }
  });
}
