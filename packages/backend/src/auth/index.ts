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

    authProvider?.addUserForToken(tokenData, ['chat']);

    reply.redirect(`${config.FRONTEND_URL}?auth=success`);
  });

  app.get('/auth/status', () => ({
    authenticated: authProvider !== null && currentUser !== null,
    user: currentUser,
  }));
}

async function restoreSession() {
  const user = await prisma.user.findFirst({ orderBy: { updatedAt: 'desc' } });
  if (!user) return;

  currentUser = {
    id: user.twitchId,
    login: user.login,
    displayName: user.displayName,
  };

  authProvider?.addUserForToken(
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

  console.log(`🔑 Session restored for ${user.displayName}`);
}
