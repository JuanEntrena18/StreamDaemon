import { FastifyInstance } from 'fastify';
import { RefreshingAuthProvider } from '@twurple/auth';
import { PrismaClient } from '@prisma/client';
import { config } from '../config.js';
import { existsSync } from 'fs';
import { execFileSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { randomBytes } from 'crypto';
import { encryptToken, decryptToken, decryptTokenLegacy } from './token-crypto.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const _require = createRequire(import.meta.url);
export const prisma = new PrismaClient();

const SCOPES = [
  'chat:read',
  'chat:edit',
  'channel:read:redemptions',
  'channel:manage:predictions',
  'channel:read:predictions',
  'channel:manage:raids',
  'channel:manage:moderators',
  'moderator:read:followers',
  'channel:read:subscriptions',
  'bits:read',
  'channel:moderate',
  'moderator:read:chatters',
  'moderator:manage:banned_users',
  'channel:manage:broadcast',
];

export let authProvider: RefreshingAuthProvider | null = null;
export let currentUser: { id: string; login: string; displayName: string; profileImageUrl?: string } | null = null;

const authCallbacks: Array<() => void> = [];

export function onAuth(cb: () => void) {
  authCallbacks.push(cb);
}

function notifyAuth() {
  authCallbacks.forEach((cb) => cb());
}

/**
 * Push the Prisma schema to the database, creating tables if they don't exist.
 * Uses the bundled Prisma CLI (found via require.resolve) and the schema file
 * bundled at the app root or in extra/.prisma/client/.
 */
async function pushDbSchema() {
  try {
    const cliPath = _require.resolve('prisma/build/index.js');
    // Try multiple schema locations (app root prisma/, or extra/.prisma/client/)
    let schemaPath = '';
    for (const candidate of [
      path.resolve(__dirname, '../../../../../prisma/schema.prisma'),           // appRoot/prisma/
      path.resolve(__dirname, '../../../../extra/.prisma/client/schema.prisma'), // appRoot/extra/.prisma/
    ]) {
      if (existsSync(candidate)) { schemaPath = candidate; break; }
    }
    if (!schemaPath || !existsSync(cliPath)) return;

    console.log('🗄️  Pushing database schema...');
    execFileSync(process.execPath, [
      cliPath, 'db', 'push',
      `--schema=${schemaPath}`,
      '--accept-data-loss',
      '--skip-generate',
    ], {
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL!, ELECTRON_RUN_AS_NODE: '1' },
      cwd: path.dirname(schemaPath),
      stdio: 'pipe',
      timeout: 30_000,
    });
    console.log('✅ Database schema synchronized');
  } catch (err) {
    console.warn('⚠️  Schema push failed (non-fatal):', err instanceof Error ? err.message : err);
  }
}

export async function setupAuth(app: FastifyInstance) {
  await pushDbSchema();

  authProvider = new RefreshingAuthProvider({
    clientId: config.TWITCH_CLIENT_ID,
    clientSecret: config.TWITCH_CLIENT_SECRET,
  });

  const encKey = config.TWITCH_CLIENT_SECRET;

  authProvider.onRefresh(async (userId, newTokenData) => {
    await prisma.user.update({
      where: { twitchId: userId },
      data: {
        accessToken: encryptToken(newTokenData.accessToken, encKey),
        refreshToken: encryptToken(newTokenData.refreshToken ?? '', encKey),
        tokenExpiresAt: newTokenData.expiresIn
          ? new Date(Date.now() + newTokenData.expiresIn * 1000)
          : null,
      },
    });
  });

  // ── OAuth state store ──
  const pendingStates = new Map<string, number>();

  await restoreSession();

  // ── Authorization Code Grant (browser, redirect flow) ──

  app.get('/auth/login', (_req, reply) => {
    const state = randomBytes(16).toString('hex');
    pendingStates.set(state, Date.now() + 10 * 60 * 1000);
    const url =
      `https://id.twitch.tv/oauth2/authorize` +
      `?client_id=${config.TWITCH_CLIENT_ID}` +
      `&redirect_uri=${config.TWITCH_REDIRECT_URI}` +
      `&response_type=code` +
      `&scope=${SCOPES.join('+')}` +
      `&state=${state}`;
    reply.redirect(url);
  });

  app.get('/auth/login-url', (_req, reply) => {
    const state = randomBytes(16).toString('hex');
    pendingStates.set(state, Date.now() + 10 * 60 * 1000);
    const url =
      `https://id.twitch.tv/oauth2/authorize` +
      `?client_id=${config.TWITCH_CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(config.TWITCH_REDIRECT_URI)}` +
      `&response_type=code` +
      `&scope=${SCOPES.join('+')}` +
      `&state=${state}`;
    reply.send({ url });
  });

  app.get('/auth/callback', async (req, reply) => {
    const { code, state } = req.query as { code?: string; state?: string };
    if (!code) return reply.status(400).send({ error: 'Missing code' });
    if (!state) return reply.status(400).send({ error: 'Missing state' });

    const expiry = pendingStates.get(state);
    if (!expiry || Date.now() > expiry) {
      return reply.status(400).send({ error: 'Invalid or expired state' });
    }
    pendingStates.delete(state);

    const params = new URLSearchParams({
      client_id: config.TWITCH_CLIENT_ID,
      client_secret: config.TWITCH_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: config.TWITCH_REDIRECT_URI,
    });

    const tokenRes = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.json().catch(() => ({}));
      req.log.error({ err }, 'Twitch token exchange failed');
      return reply.status(400).send({ error: 'Authentication failed. Please try again.' });
    }

    const tokenData = await tokenRes.json();

    const userRes = await fetch('https://api.twitch.tv/helix/users', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        'Client-Id': config.TWITCH_CLIENT_ID,
      },
    });

    const userBody = await userRes.json();
    const twitchUser = userBody.data?.[0];
    if (!twitchUser) return reply.status(500).send({ error: 'Failed to fetch user' });

    await finishAuth(tokenData, twitchUser);

    reply.redirect(`${config.FRONTEND_URL}?auth=success`);
  });

  // ── Device Code Grant (Electron / desktop, no redirect) ──

  app.post('/auth/device', async (req, reply) => {
    const params = new URLSearchParams({
      client_id: config.TWITCH_CLIENT_ID,
      scopes: SCOPES.join(' '),
    });

    const res = await fetch('https://id.twitch.tv/oauth2/device', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      req.log.error({ err }, 'Twitch device code request failed');
      return reply.status(400).send({ error: 'Failed to get device code. Please try again.' });
    }

    const data = await res.json() as {
      device_code: string;
      user_code: string;
      verification_uri: string;
      expires_in: number;
      interval: number;
    };

    reply.send({
      device_code: data.device_code,
      user_code: data.user_code,
      verification_uri: data.verification_uri,
      expires_in: data.expires_in,
      interval: data.interval,
    });
  });

  app.post('/auth/device/poll', { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } }, async (req, reply) => {
    const { device_code } = req.body as { device_code: string };
    if (!device_code) return reply.status(400).send({ error: 'Missing device_code' });

    const params = new URLSearchParams({
      client_id: config.TWITCH_CLIENT_ID,
      client_secret: config.TWITCH_CLIENT_SECRET,
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      device_code,
    });

    const res = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    });

    // Device code errors come as 400 with { error, message? }
    // - authorization_pending: user hasn't completed yet (keep polling)
    // - slow_down: increase interval
    // - expired_token: restart flow
    // - access_denied: user denied

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const errorType = err.message || err.error || 'authorization_pending';
      if (errorType !== 'authorization_pending') {
        req.log.error({ err }, 'Twitch token poll failed');
      }
      return reply.send({ status: 'pending', error: errorType });
    }

    const tokenData = await res.json();

    const userRes = await fetch('https://api.twitch.tv/helix/users', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        'Client-Id': config.TWITCH_CLIENT_ID,
      },
    });

    const userBody = await userRes.json();
    const twitchUser = userBody.data?.[0];
    if (!twitchUser) return reply.status(500).send({ error: 'Failed to fetch user' });

    await finishAuth(tokenData, twitchUser);
    reply.send({ status: 'authenticated', user: currentUser });
  });

  // ── Logout ──

  app.post('/auth/logout', async (_req, reply) => {
    if (currentUser) {
      console.log(`🔓 Logging out ${currentUser.displayName}`);
      currentUser = null;
      await prisma.user.deleteMany({});
    }
    reply.send({ success: true });
  });

  // ── Status ──

  app.get('/auth/token', async () => {
    return { token: config.LOCAL_API_TOKEN };
  });

  app.get('/auth/status', async () => {
    let tokenScopes: string[] = [];
    try {
      if (authProvider && currentUser) {
        const token = await authProvider.getAccessTokenForUser(currentUser.id);
        if (token?.scope) tokenScopes = Array.isArray(token.scope) ? token.scope : (token.scope as string).split(' ');
      }
    } catch {}
    return {
      authenticated: authProvider !== null && currentUser !== null,
      user: currentUser,
      scopes: tokenScopes,
      requiredScopes: SCOPES,
    };
  });
}

function normalizeScope(scope: unknown): string[] {
  if (Array.isArray(scope)) return scope as string[];
  if (typeof scope === 'string') return scope.split(' ');
  return SCOPES;
}

async function finishAuth(
  tokenData: { access_token: string; refresh_token?: string; expires_in?: number; scope?: string | string[] },
  twitchUser: { id: string; login: string; display_name: string; profile_image_url: string },
) {
  currentUser = {
    id: twitchUser.id,
    login: twitchUser.login,
    displayName: twitchUser.display_name,
    profileImageUrl: twitchUser.profile_image_url,
  };

  const encKey = config.TWITCH_CLIENT_SECRET;

  await prisma.user.upsert({
    where: { twitchId: twitchUser.id },
    update: {
      login: twitchUser.login,
      displayName: twitchUser.display_name,
      avatarUrl: twitchUser.profile_image_url,
      accessToken: encryptToken(tokenData.access_token, encKey),
      refreshToken: encryptToken(tokenData.refresh_token ?? '', encKey),
      tokenExpiresAt: tokenData.expires_in
        ? new Date(Date.now() + tokenData.expires_in * 1000)
        : null,
    },
    create: {
      twitchId: twitchUser.id,
      login: twitchUser.login,
      displayName: twitchUser.display_name,
      avatarUrl: twitchUser.profile_image_url,
      accessToken: encryptToken(tokenData.access_token, encKey),
      refreshToken: encryptToken(tokenData.refresh_token ?? '', encKey),
      tokenExpiresAt: tokenData.expires_in
        ? new Date(Date.now() + tokenData.expires_in * 1000)
        : null,
    },
  });

  await authProvider?.addUserForToken(
    {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token ?? null,
      expiresIn: tokenData.expires_in ?? null,
      obtainmentTimestamp: Date.now(),
      scope: normalizeScope(tokenData.scope),
    },
    ['chat'],
  );
  notifyAuth();
}

async function restoreSession() {
  try {
    const user = await prisma.user.findFirst({ orderBy: { updatedAt: 'desc' } });
    if (!user) return;

    let accessToken = user.accessToken;
    let refreshToken = user.refreshToken;

    const encKey = config.TWITCH_CLIENT_SECRET;
    try {
      accessToken = decryptToken(user.accessToken, encKey);
      refreshToken = decryptToken(user.refreshToken, encKey);
    } catch {
      try {
        // Fallback: tokens may have been encrypted with the old hardcoded salt
        accessToken = decryptTokenLegacy(user.accessToken, encKey);
        refreshToken = decryptTokenLegacy(user.refreshToken, encKey);
      } catch {
        // Tokens may be in plaintext from a very old version — use as-is
      }
    }

  currentUser = {
    id: user.twitchId,
    login: user.login,
    displayName: user.displayName,
    profileImageUrl: user.avatarUrl ?? undefined,
  };

  await authProvider?.addUserForToken(
    {
      accessToken,
      refreshToken,
      expiresIn: user.tokenExpiresAt
        ? Math.floor((user.tokenExpiresAt.getTime() - Date.now()) / 1000)
        : null,
      obtainmentTimestamp: Date.now(),
      scope: SCOPES,
    },
    ['chat'],
  );

    notifyAuth();

    console.log(`🔑 Session restored for ${user.displayName}`);
  } catch (err) {
    console.warn('⚠️  Could not restore session (database uninitialized?):', err instanceof Error ? err.message : err);
  }
}
