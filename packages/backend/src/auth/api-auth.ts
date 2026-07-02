import { FastifyRequest, FastifyReply } from 'fastify';
import { randomBytes } from 'crypto';

export function generateApiToken(): string {
  return randomBytes(32).toString('hex');
}

export async function requireLocalAuth(req: FastifyRequest, reply: FastifyReply) {
  const token = req.headers['x-local-token'];
  if (!token || token !== process.env.LOCAL_API_TOKEN) {
    console.log('[requireLocalAuth] Unauthorized! Provided:', token, 'Expected:', process.env.LOCAL_API_TOKEN);
    return reply.status(401).send({ error: 'Unauthorized' });
  }
}
