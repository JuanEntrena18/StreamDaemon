import { FastifyInstance } from 'fastify';
import { RefreshingAuthProvider } from '@twurple/auth';
import { PrismaClient } from '@prisma/client';
import { config } from '../config.js';

const prisma = new PrismaClient();

const SCOPES = [
  'chat:read',
  'chat:edit',
  'channel:read:redemptions',
  'channel:manage:predictions',
  'channel:read:predictions',
  'channel:manage:raids',
  'channel:manage:moderators',
];

export let authProvider: RefreshingAuthProvider | null = null;
export let currentUser: { id: string; login: string; displayName: string } | null = null;

const authCallbacks: Array<() => void> = [];

export function onAuth(cb: () => void) {
  authCallbacks.push(cb);
}

function notifyAuth() {
  authCallbacks.forEach((cb) => cb());
}

export async function setupAuth(app: FastifyInstance) {
  authProvider = new RefreshingAuthProvider({
    clientId: config.TWITCH_CLIENT_ID,
    clientSecret: config.TWITCH_CLIENT_SECRET,
  });

  authProvider.onRefresh(async (userId, newTokenData) => {
    await prisma.user.update({
      where: { twitchId: userId },
      data: {
        accessToken: newTokenData.accessToken,
        refreshToken: newTokenData.refreshToken ?? '',
        tokenExpiresAt: newTokenData.expiresIn
          ? new Date(Date.now() + newTokenData.expiresIn * 1000)
          : null,
      },
    });
  });

  await restoreSession();

  // ── Authorization Code Grant (browser, redirect flow) ──

  app.get('/auth/login', (_req, reply) => {
    const state = Math.random().toString(36).slice(2);
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
    const state = Math.random().toString(36).slice(2);
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
    const { code } = req.query as { code?: string };
    if (!code) return reply.status(400).send({ error: 'Missing code' });

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
      return reply.status(400).send({ error: 'Failed to get token', details: err });
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

  app.post('/auth/device', async (_req, reply) => {
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
      return reply.status(400).send({ error: 'Failed to get device code', details: err });
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

  app.post('/auth/device/poll', async (req, reply) => {
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
      return reply.send({ status: 'pending', error: err.error, message: err.message });
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

  app.get('/auth/status', () => ({
    authenticated: authProvider !== null && currentUser !== null,
    user: currentUser,
  }));
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
  };

  await prisma.user.upsert({
    where: { twitchId: twitchUser.id },
    update: {
      login: twitchUser.login,
      displayName: twitchUser.display_name,
      avatarUrl: twitchUser.profile_image_url,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token ?? '',
      tokenExpiresAt: tokenData.expires_in
        ? new Date(Date.now() + tokenData.expires_in * 1000)
        : null,
    },
    create: {
      twitchId: twitchUser.id,
      login: twitchUser.login,
      displayName: twitchUser.display_name,
      avatarUrl: twitchUser.profile_image_url,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token ?? '',
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
  const user = await prisma.user.findFirst({ orderBy: { updatedAt: 'desc' } });
  if (!user) return;

  currentUser = {
    id: user.twitchId,
    login: user.login,
    displayName: user.displayName,
  };

  await authProvider?.addUserForToken(
    {
      accessToken: user.accessToken,
      refreshToken: user.refreshToken,
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
}
