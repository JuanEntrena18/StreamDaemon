import { FastifyRequest, FastifyReply } from 'fastify';
import { randomBytes } from 'crypto';

export function generateApiToken(): string {
  return randomBytes(32).toString('hex');
}

function sanitizeTokenHeader(value: unknown): string {
  if (typeof value !== 'string') return '(missing)';
  if (value.length < 8) return '(invalid)';
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

export async function requireLocalAuth(req: FastifyRequest, reply: FastifyReply) {
  const token = req.headers['x-local-token'];
  if (!token || token !== process.env.LOCAL_API_TOKEN) {
    req.log.warn({
      provided: sanitizeTokenHeader(token),
      path: req.url,
      method: req.method,
    }, 'Unauthorized local API request');
    return reply.status(401).send({ error: 'Unauthorized' });
  }
}
