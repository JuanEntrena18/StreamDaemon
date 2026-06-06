import { FastifyInstance } from 'fastify';
import { getIO } from '../socket/index.js';
import { sendMessage } from '../chat/index.js';
import { GiveawayCreateSchema } from '@streamforger/shared';

interface Giveaway {
  id: string;
  channel: string;
  prize: string;
  status: 'pending' | 'active' | 'ended';
  entries: Set<string>;
  winnerId: string | null;
  timer: ReturnType<typeof setTimeout> | null;
}

const giveaways = new Map<string, Giveaway>();

let giveawayIdCounter = 0;

export function setupGiveaways(app: FastifyInstance) {
  app.post<{ Body: { channel: string; prize: string; duration?: number } }>(
    '/giveaways/start',
    { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } },
    async (req, reply) => {
      const channel = req.body.channel;
      if (!channel || typeof channel !== 'string') {
        return reply.status(400).send({ error: 'Missing or invalid channel' });
      }
      const body = GiveawayCreateSchema.safeParse(req.body);
      if (!body.success) {
        return reply.status(400).send({ error: body.error.flatten() });
      }
      const { prize, duration = 60 } = body.data;

      const id = `giveaway_${++giveawayIdCounter}`;
      const giveaway: Giveaway = {
        id,
        channel,
        prize,
        status: 'active',
        entries: new Set(),
        winnerId: null,
        timer: null,
      };

      giveaway.timer = setTimeout(() => endGiveaway(id), duration * 1000);
      giveaways.set(id, giveaway);

      sendMessage(channel, `🎉 Sorteo iniciado! Premio: ${prize}. Escribe !sorteo en el chat para participar!`);

      getIO().to(`channel:${channel}`).emit('giveaway:start', {
        id,
        prize,
        status: 'active',
        winnerId: null,
        entries: 0,
        participants: [],
      });

      reply.send({ id, prize, duration });
    },
  );

  app.post<{ Body: { channel: string; id: string } }>(
    '/giveaways/end',
    async (req, reply) => {
      const { id } = req.body;
      endGiveaway(id);
      reply.send({ ok: true });
    },
  );

  app.get('/giveaways/:channel/active', (req, reply) => {
    const { channel } = req.params as { channel: string };
    const active = Array.from(giveaways.values()).find(
      (g) => g.channel === channel && g.status === 'active',
    );
    reply.send(active ? { ...active, entries: active.entries.size } : null);
  });
}

export function enterGiveaway(channel: string, user: string) {
  const giveaway = Array.from(giveaways.values()).find(
    (g) => g.channel === channel && g.status === 'active',
  );
  if (giveaway && !giveaway.entries.has(user)) {
    giveaway.entries.add(user);
    getIO().to(`channel:${channel}`).emit('giveaway:entry', {
      user,
      participants: Array.from(giveaway.entries),
      count: giveaway.entries.size,
    });
  }
}

function endGiveaway(id: string) {
  const giveaway = giveaways.get(id);
  if (!giveaway || giveaway.status === 'ended') return;

  giveaway.status = 'ended';
  if (giveaway.timer) clearTimeout(giveaway.timer);

  const entries = Array.from(giveaway.entries);
  const winner = entries.length > 0
    ? entries[Math.floor(Math.random() * entries.length)]
    : null;

  giveaway.winnerId = winner;

  if (winner) {
    sendMessage(giveaway.channel, `🎉 El ganador del sorteo "${giveaway.prize}" es @${winner}! Felicidades!`);
  } else {
    sendMessage(giveaway.channel, `😢 El sorteo "${giveaway.prize}" terminó sin participantes.`);
  }

  getIO().to(`channel:${giveaway.channel}`).emit('giveaway:end', {
    id: giveaway.id,
    prize: giveaway.prize,
    status: 'ended',
    winnerId: winner,
    entries: entries.length,
    participants: entries,
  });

  if (winner) {
    getIO().to(`channel:${giveaway.channel}`).emit('giveaway:winner', {
      winner,
      prize: giveaway.prize,
    });
  }

  setTimeout(() => giveaways.delete(id), 60_000);
}
