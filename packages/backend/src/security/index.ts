import { FastifyInstance } from 'fastify';
import { ApiClient } from '@twurple/api';
import { authProvider, currentUser, prisma } from '../auth/index.js';
import { getIO } from '../socket/index.js';
import * as fs from 'fs';
import * as path from 'path';
import { SecurityConfigUpdateSchema, SecurityScanSchema, SecurityBanSchema, SecurityUnbanSchema, SecurityWhitelistAddSchema, SecurityWhitelistRemoveSchema } from '@streamdaemon/shared';

interface SecurityConfig {
  followBotProtection: boolean;
  spamFilter: boolean;
  autoBan: boolean;
  accountAgeFilter: number;
}

interface WhitelistEntry {
  username: string;
  reason?: string | null;
  createdAt: Date;
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
  accountAgeFilter: 0,
};

let whitelist: WhitelistEntry[] = [];

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

async function loadConfig() {
  if (!currentUser) return;
  try {
    const dbConfig = await prisma.securityConfig.findUnique({
      where: { userId: currentUser.id },
    });
    if (dbConfig) {
      config = {
        followBotProtection: dbConfig.followBotProtection,
        spamFilter: dbConfig.spamFilter,
        autoBan: dbConfig.autoBan,
        accountAgeFilter: dbConfig.accountAgeFilter,
      };
    } else {
      // Create default
      await prisma.securityConfig.create({
        data: {
          userId: currentUser.id,
        },
      });
    }

    const dbWhitelist = await prisma.securityWhitelist.findMany({
      where: { userId: currentUser.id },
    });
    whitelist = dbWhitelist.map((w) => ({
      username: w.username,
      reason: w.reason,
      createdAt: w.createdAt,
    }));
  } catch (error) {
    console.error('Error loading security config from DB', error);
  }
}

async function saveConfig() {
  if (!currentUser) return;
  try {
    await prisma.securityConfig.upsert({
      where: { userId: currentUser.id },
      update: {
        followBotProtection: config.followBotProtection,
        spamFilter: config.spamFilter,
        autoBan: config.autoBan,
        accountAgeFilter: config.accountAgeFilter,
      },
      create: {
        userId: currentUser.id,
        followBotProtection: config.followBotProtection,
        spamFilter: config.spamFilter,
        autoBan: config.autoBan,
        accountAgeFilter: config.accountAgeFilter,
      },
    });
  } catch (error) {
    console.error('Error saving security config to DB', error);
  }
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
  return whitelist.some((w) => w.username.toLowerCase() === userName.toLowerCase());
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

  // Check account age
  if (config.accountAgeFilter > 0) {
    try {
      const api = new ApiClient({ authProvider });
      const userObj = await api.users.getUserById(userId);
      if (userObj) {
        const ageHours = (Date.now() - userObj.creationDate.getTime()) / (1000 * 60 * 60);
        if (ageHours < config.accountAgeFilter) {
          const reason = `Cuenta demasiado nueva (${Math.floor(ageHours)}h, min ${config.accountAgeFilter}h)`;
          if (config.autoBan) {
            await executeBan(userId, userName, 'follow-bot', reason);
          } else {
            addDetection('follow-bot', userName, userId, 'flagged', reason);
          }
          return true;
        }
      }
    } catch {
      // Ignore API errors
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
  loadBotList();
  
  // We need to wait for currentUser to be available to load DB config.
  // Using an interval to poll until it's loaded, since auth might take a bit.
  const loadInterval = setInterval(() => {
    if (currentUser) {
      clearInterval(loadInterval);
      loadConfig();
    }
  }, 1000);

  // GET config
  app.get('/security/config', async (_req, reply) => {
    return {
      followBotProtection: config.followBotProtection,
      spamFilter: config.spamFilter,
      autoBan: config.autoBan,
      accountAgeFilter: config.accountAgeFilter,
      whitelist: whitelist,
    };
  });

  // PUT config
  app.put('/security/config', async (req, reply) => {
    if (!currentUser) return reply.status(401).send({ error: 'Not authenticated' });
    const parsed = SecurityConfigUpdateSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: 'Invalid body', details: parsed.error.flatten() });

    const body = parsed.data;
    if (body.followBotProtection !== undefined) config.followBotProtection = body.followBotProtection;
    if (body.spamFilter !== undefined) config.spamFilter = body.spamFilter;
    if (body.autoBan !== undefined) config.autoBan = body.autoBan;
    if (body.accountAgeFilter !== undefined) config.accountAgeFilter = body.accountAgeFilter;
    
    await saveConfig();
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
    const parsed = SecurityScanSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: 'Invalid body', details: parsed.error.flatten() });
    const result = await scanFollowers(parsed.data.channel);
    return result;
  });

  // PUT whitelist add
  app.put('/security/whitelist', async (req, reply) => {
    if (!currentUser) return reply.status(401).send({ error: 'Not authenticated' });
    const parsed = SecurityWhitelistAddSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: 'Invalid body', details: parsed.error.flatten() });

    const { user, reason } = parsed.data;
    if (!whitelist.some((w) => w.username.toLowerCase() === user.toLowerCase())) {
      try {
        const dbWhitelist = await prisma.securityWhitelist.create({
          data: {
            userId: currentUser.id,
            username: user,
            reason: reason || null,
          },
        });
        whitelist.push({
          username: dbWhitelist.username,
          reason: dbWhitelist.reason,
          createdAt: dbWhitelist.createdAt,
        });
      } catch (e) {
        console.error('Error adding to whitelist', e);
      }
    }
    return { whitelist };
  });

  // POST whitelist remove
  app.post('/security/whitelist/remove', async (req, reply) => {
    if (!currentUser) return reply.status(401).send({ error: 'Not authenticated' });
    const parsed = SecurityWhitelistRemoveSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: 'Invalid body', details: parsed.error.flatten() });

    const { user } = parsed.data;
    try {
      await prisma.securityWhitelist.deleteMany({
        where: {
          userId: currentUser.id,
          username: user,
        },
      });
      whitelist = whitelist.filter((w) => w.username.toLowerCase() !== user.toLowerCase());
    } catch (e) {
      console.error('Error removing from whitelist', e);
    }
    
    return { whitelist };
  });

  // POST ban user
  app.post('/security/ban', async (req, reply) => {
    if (!authProvider || !currentUser) return reply.status(401).send({ error: 'Not authenticated' });
    const parsed = SecurityBanSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: 'Invalid body', details: parsed.error.flatten() });

    const { user } = parsed.data;

    try {
      const api = new ApiClient({ authProvider });
      const userData = await api.users.getUserByName(user);
      if (!userData) return reply.status(404).send({ error: 'User not found' });

      await api.moderation.banUser(currentUser.id, {
        user: userData.id,
        reason: '[Anti-Bots] Ban manual desde panel',
      });

      resetDailyStats();
      const existing = detections.find((d) => d.user.toLowerCase() === user.toLowerCase() && d.action === 'flagged');
      if (existing) {
        existing.action = 'banned';
      } else {
        detections.unshift({
          id: generateId(),
          type: 'suspicious',
          user,
          userId: userData.id,
          action: 'banned',
          timestamp: Date.now(),
          reason: 'Ban manual desde el panel',
        });
        if (detections.length > 100) detections.length = 100;
      }
      stats.totalBanned++;
      stats.todayBanned++;
      emitUpdate();

      return { ok: true };
    } catch {
      return reply.status(500).send({ error: 'Ban failed' });
    }
  });

  // POST unban user
  app.post('/security/unban', async (req, reply) => {
    if (!authProvider || !currentUser) return reply.status(401).send({ error: 'Not authenticated' });
    const parsed = SecurityUnbanSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: 'Invalid body', details: parsed.error.flatten() });

    const { user } = parsed.data;

    try {
      const api = new ApiClient({ authProvider });
      const userData = await api.users.getUserByName(user);
      if (!userData) return reply.status(404).send({ error: 'User not found' });

      await api.moderation.unbanUser(currentUser.id, userData.id);
      return { ok: true };
    } catch {
      return reply.status(500).send({ error: 'Unban failed' });
    }
  });
}
