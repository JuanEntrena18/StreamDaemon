import { FastifyInstance } from 'fastify';
import { authProvider, currentUser } from '../auth/index.js';

// gql.twitch.tv only accepts tokens issued against Twitch's own web Client-ID.
// The developer's app Client-ID works for Helix API but not for the internal GQL endpoint.
const TWITCH_WEB_CLIENT_ID = 'kimne78kx3ncx6brgo4mv6wki5h1ko';

async function queryGQL(query: string, variables: Record<string, unknown>) {
  if (!authProvider || !currentUser) throw new Error('Not authenticated');
  const token = await authProvider.getAccessTokenForUser(currentUser.id);
  const accessToken = token?.accessToken;

  if (!accessToken) {
    throw new Error('No OAuth token available');
  }

  const headers: Record<string, string> = {
    'Client-ID': TWITCH_WEB_CLIENT_ID,
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

  const json = await res.json();
  if (json?.errors) {
    throw new Error(`GQL error: ${JSON.stringify(json.errors)}`);
  }

  return json;
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
