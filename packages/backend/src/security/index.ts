import { FastifyInstance } from 'fastify';
import { ApiClient } from '@twurple/api';
import { authProvider, currentUser } from '../auth/index.js';
import { getIO } from '../socket/index.js';
import * as fs from 'fs';
import * as path from 'path';

interface SecurityConfig {
  followBotProtection: boolean;
  spamFilter: boolean;
  autoBan: boolean;
  whitelist: string[];
}

interface BotDetection {
  id: string;
  type: 'follow-bot' | 'spam' | 'suspicious';
  user: string;
  userId: string;
  action: 'banned' | 'flagged';
  timestamp: number;
  reason: string;
}

interface SecurityStats {
  totalBanned: number;
  todayBanned: number;
  totalFlagged: number;
  lastResetDate: string;
}

const DATA_DIR = path.resolve('data');
const CONFIG_PATH = path.join(DATA_DIR, 'security-config.json');
const BOT_LIST_PATH = path.join(DATA_DIR, 'known-bots.json');

const SUSPICIOUS_PATTERNS = [
  /^[a-zA-Z]+[0-9]{5,}$/,
  /^[a-zA-Z]+_[a-zA-Z0-9]{4,}$/,
  /(?:bot|_bot|_service|_support)$/i,
  /^(?:xXx_|_xXx)/,
  /[0-9]{3,}[a-zA-Z]+[0-9]{3,}/,
];

const SPAM_PATTERNS = [
  /bit\.ly\//i,
  /tinyurl\.com\//i,
  /(?:check|view|follow)\s*(?:out|my|our)\s*(?:stream|channel)/i,
  /free\s*(?:followers|viewers|subs|bits)/i,
  /buy\s*(?:followers|viewers|subs)/i,
  /follow\s*(?:for\s*)?follow/i,
  /(?:join|check|visit)\s*(?:my\s*)?(?:discord|giveaway|stream)/i,
  /(?:stream|channel)\s* promotion/i,
  /\b(?:discord\.(?:gg|com\/invite)|twitch\.tv\/[a-z0-9_]+\/?(?:\?|$))/i,
];

let config: SecurityConfig = {
  followBotProtection: true,
  spamFilter: true,
  autoBan: true,
  whitelist: [],
};

let detections: BotDetection[] = [];
let stats: SecurityStats = {
  totalBanned: 0,
  todayBanned: 0,
  totalFlagged: 0,
  lastResetDate: new Date().toDateString(),
};

let knownBotUsernames: string[] = [];

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      config = { ...config, ...JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8')) };
    }
  } catch { /* usar defaults */ }
}

function saveConfig() {
  ensureDataDir();
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

function loadBotList() {
  try {
    if (fs.existsSync(BOT_LIST_PATH)) {
      const data = JSON.parse(fs.readFileSync(BOT_LIST_PATH, 'utf-8'));
      knownBotUsernames = data.usernames ?? [];
    }
  } catch { /* lista vacía */ }
}

function resetDailyStats() {
  const today = new Date().toDateString();
  if (stats.lastResetDate !== today) {
    stats.todayBanned = 0;
    stats.lastResetDate = today;
  }
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function emitUpdate() {
  try {
    getIO().to(`channel:${currentUser?.login}`).emit('security:update', {
      stats,
      detections: detections.slice(0, 20),
    });
  } catch { /* socket no disponible */ }
}

function isWhitelisted(userName: string): boolean {
  return config.whitelist.some((w) => w.toLowerCase() === userName.toLowerCase());
}

export async function checkFollow(userId: string, userName: string): Promise<boolean> {
  if (!config.followBotProtection || !authProvider || !currentUser) return false;
  if (isWhitelisted(userName)) return false;

  const lowerName = userName.toLowerCase();

  // Check exact match against known bots
  if (knownBotUsernames.some((b) => b.toLowerCase() === lowerName)) {
    await executeBan(userId, userName, 'follow-bot', 'Cuenta maliciosa conocida');
    return true;
  }

  // Check pattern match
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(lowerName)) {
      if (config.autoBan) {
        await executeBan(userId, userName, 'suspicious', `Nombre coincide con patrón sospechoso: ${pattern.source}`);
      } else {
        addDetection('suspicious', userName, userId, 'flagged', `Nombre sospechoso (${pattern.source})`);
      }
      return true;
    }
  }

  return false;
}

export function checkMessage(channel: string, user: string, message: string): boolean {
  if (!config.spamFilter || !authProvider || !currentUser) return false;
  if (isWhitelisted(user)) return false;

  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(message)) {
      addDetection('spam', user, '', 'flagged', `Mensaje sospechoso detectado (${pattern.source})`);
      return true;
    }
  }

  return false;
}

async function executeBan(userId: string, userName: string, type: 'follow-bot' | 'suspicious', reason: string) {
  if (!authProvider || !currentUser) return;
  try {
    const api = new ApiClient({ authProvider });
    await api.moderation.banUser(currentUser.id, {
      user: userId,
      reason: `[Anti-Bots] ${reason}`,
    });
    addDetection(type, userName, userId, 'banned', reason);
  } catch {
    addDetection(type, userName, userId, 'flagged', `${reason} (ban falló)`);
  }
}

function addDetection(type: BotDetection['type'], user: string, userId: string, action: BotDetection['action'], reason: string) {
  resetDailyStats();
  const detection: BotDetection = {
    id: generateId(),
    type,
    user,
    userId,
    action,
    timestamp: Date.now(),
    reason,
  };
  detections.unshift(detection);
  if (detections.length > 100) detections.length = 100;

  if (action === 'banned') {
    stats.totalBanned++;
    stats.todayBanned++;
  } else {
    stats.totalFlagged++;
  }

  emitUpdate();
}

async function scanFollowers(username: string): Promise<{ found: number; banned: number }> {
  if (!authProvider || !currentUser) return { found: 0, banned: 0 };

  try {
    const api = new ApiClient({ authProvider });
    const user = await api.users.getUserByName(username);
    if (!user) return { found: 0, banned: 0 };

    const followers = await api.channels.getChannelFollowers(user.id);
    const followersData = followers.data ?? [];

    let found = 0;
    let banned = 0;

    for (const f of followersData) {
      if (!f.userId || !f.userName) continue;
      if (isWhitelisted(f.userName)) continue;

      const lowerName = f.userName.toLowerCase();
      const isKnown = knownBotUsernames.some((b) => b.toLowerCase() === lowerName);
      const isSuspicious = SUSPICIOUS_PATTERNS.some((p) => p.test(lowerName));

      if (isKnown || isSuspicious) {
        found++;
        if (config.autoBan) {
          try {
            await api.moderation.banUser(currentUser.id, {
              user: f.userId,
              reason: `[Anti-Bots] Escaneo manual: ${isKnown ? 'bot conocido' : 'patrón sospechoso'}`,
            });
            banned++;
            addDetection('follow-bot', f.userName, f.userId, 'banned', 'Detectado en escaneo manual');
          } catch {
            addDetection('follow-bot', f.userName, f.userId, 'flagged', 'Detectado en escaneo (ban falló)');
          }
        } else {
          addDetection('follow-bot', f.userName, f.userId, 'flagged', 'Detectado en escaneo manual');
        }
      }
    }

    return { found, banned };
  } catch {
    return { found: 0, banned: 0 };
  }
}

// ── API routes ──

export function setupSecurity(app: FastifyInstance) {
  ensureDataDir();
  loadConfig();
  loadBotList();

  // GET config
  app.get('/security/config', async (_req, reply) => {
    return {
      followBotProtection: config.followBotProtection,
      spamFilter: config.spamFilter,
      autoBan: config.autoBan,
      whitelist: config.whitelist,
    };
  });

  // PUT config
  app.put('/security/config', async (req, reply) => {
    const body = req.body as Partial<SecurityConfig>;
    if (typeof body.followBotProtection === 'boolean') config.followBotProtection = body.followBotProtection;
    if (typeof body.spamFilter === 'boolean') config.spamFilter = body.spamFilter;
    if (typeof body.autoBan === 'boolean') config.autoBan = body.autoBan;
    if (Array.isArray(body.whitelist)) config.whitelist = body.whitelist;
    saveConfig();
    return { ok: true };
  });

  // GET stats
  app.get('/security/stats', async (_req, reply) => {
    resetDailyStats();
    return {
      stats,
      recentDetections: detections.slice(0, 50),
      knownBotCount: knownBotUsernames.length,
    };
  });

  // POST scan followers
  app.post('/security/scan', async (req, reply) => {
    const { channel } = req.body as { channel: string };
    if (!channel) return reply.status(400).send({ error: 'Missing channel' });
    const result = await scanFollowers(channel);
    return result;
  });

  // PUT whitelist add
  app.put('/security/whitelist', async (req, reply) => {
    const { user } = req.body as { user: string };
    if (!user) return reply.status(400).send({ error: 'Missing user' });
    if (!config.whitelist.includes(user)) {
      config.whitelist.push(user);
      saveConfig();
    }
    return { whitelist: config.whitelist };
  });

  // POST whitelist remove
  app.post('/security/whitelist/remove', async (req, reply) => {
    const { user } = req.body as { user: string };
    if (!user) return reply.status(400).send({ error: 'Missing user' });
    config.whitelist = config.whitelist.filter((w) => w !== user);
    saveConfig();
    return { whitelist: config.whitelist };
  });
}
