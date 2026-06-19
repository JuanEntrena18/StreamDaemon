import { FastifyInstance } from 'fastify';
import { authProvider, currentUser } from '../auth/index.js';
import { config } from '../config.js';

async function helixGet(path: string) {
  if (!authProvider || !currentUser) throw new Error('Not authenticated');
  const token = await authProvider.getAccessTokenForUser(currentUser.id);
  if (!token?.accessToken) throw new Error('No OAuth token available');

  const res = await fetch(`https://api.twitch.tv/helix${path}`, {
    headers: {
      'Client-ID': config.TWITCH_CLIENT_ID,
      'Authorization': `Bearer ${token.accessToken}`,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Helix HTTP ${res.status}: ${text}`);
  }

  const json = await res.json() as { data?: unknown[] };
  return json;
}

export function setupAchievements(app: FastifyInstance) {
  app.get('/achievements', async (req, reply) => {
    if (!authProvider || !currentUser) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }

    try {
      const [userRes, followsRes] = await Promise.allSettled([
        helixGet(`/users?id=${currentUser.id}`),
        helixGet(`/channels/followers?broadcaster_id=${currentUser.id}&moderator_id=${currentUser.id}&first=1`),
      ]);

      const userData = userRes.status === 'fulfilled'
        ? (userRes.value.data as Array<{ id: string; login: string; display_name: string; profile_image_url: string; view_count: number }>)?.[0]
        : null;

      const followCount = followsRes.status === 'fulfilled'
        ? (followsRes.value as unknown as { total: number })?.total ?? null
        : null;

      return reply.send({
        userId: currentUser.id,
        login: currentUser.login,
        displayName: userData?.display_name ?? currentUser.displayName,
        avatarUrl: userData?.profile_image_url ?? null,
        viewCount: userData?.view_count ?? null,
        followers: followCount,
        twitchAchievementsUrl: `https://www.twitch.tv/${currentUser.login}/achievements`,
      });
    } catch (err) {
      req.log.error(err, 'Achievements fetch failed');
      const msg = err instanceof Error ? err.message : 'Unknown error';
      return reply.status(500).send({ error: 'Failed to fetch achievements', details: msg });
    }
  });
}
