import { FastifyInstance } from 'fastify';
import { authProvider, currentUser } from '../auth/index.js';
import { config } from '../config.js';

const GQL_CLIENT_ID = process.env.TWITCH_CLIENT_ID || config.TWITCH_CLIENT_ID || '';

async function queryGQL(query: string, variables: Record<string, unknown>) {
  if (!authProvider || !currentUser) throw new Error('Not authenticated');
  const token = await authProvider.getAccessTokenForUser(currentUser.id);
  const accessToken = token?.accessToken;

  if (!GQL_CLIENT_ID) {
    throw new Error('TWITCH_CLIENT_ID is not configured');
  }
  if (!accessToken) {
    throw new Error('No OAuth token available');
  }

  const headers: Record<string, string> = {
    'Client-ID': GQL_CLIENT_ID,
    'Authorization': `OAuth ${accessToken}`,
    'Content-Type': 'application/json',
  };

  const res = await fetch('https://gql.twitch.tv/gql', {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`GQL HTTP ${res.status}: ${text}`);
  }

  return res.json();
}

export function setupAchievements(app: FastifyInstance) {
  app.get('/achievements', async (req, reply) => {
    if (!authProvider || !currentUser) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }

    try {
      const query = `
        query GetAchievements {
          currentUser {
            login
            displayName
            profileImageURL(width: 300)
            quests {
              pathToAffiliate {
                averageViewers { current goal }
                badgeURL
                completedAt
                followers { current goal }
                hoursStreamed { current goal }
                uniqueDaysStreamed { current goal }
                affiliateInvitationStatus
              }
              pathToPartner {
                averageViewers30 { current goal }
                averageViewers60 { current goal }
                uniqueDaysStreamed { current goal }
                completedAt
                affiliateInvitationStatus
              }
              buildACommunity {
                enabled { current goal }
                communityServer { current goal }
                hostedCommunityEvents { current goal }
                completedAt
              }
            }
          }
        }
      `;

      const data = await queryGQL(query, {});

      if (data?.errors) {
        req.log.error({ gqlErrors: data.errors }, 'GQL achievements query returned errors');
        return reply.status(500).send({ error: 'Failed to fetch achievements', details: data.errors });
      }

      const userData = data?.data?.currentUser;
      if (!userData) {
        req.log.error({ gqlResponse: data }, 'GQL achievements query missing user data');
        return reply.status(500).send({ error: 'Failed to fetch achievements', details: 'No user data in GQL response' });
      }

      return reply.send({
        userId: currentUser.id,
        displayName: userData.displayName ?? currentUser.displayName,
        avatarUrl: userData.profileImageURL ?? null,
        quests: userData.quests ?? null,
      });
    } catch (err) {
      req.log.error(err, 'Achievements fetch failed');
      const msg = err instanceof Error ? err.message : 'Unknown error';
      return reply.status(500).send({ error: 'Failed to fetch achievements', details: msg });
    }
  });
}
