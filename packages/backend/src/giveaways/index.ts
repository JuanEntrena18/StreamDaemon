import { FastifyInstance } from 'fastify';
import { getIO } from '../socket/index.js';
import { sendMessage } from '../chat/index.js';
import { GiveawayCreateSchema } from '@streamdaemon/shared';

interface GiveawayEntry {
  user: string;
  tickets: number;
}

interface Giveaway {
  id: string;
  channel: string;
  prize: string;
  status: 'pending' | 'active' | 'ended';
  entries: Map<string, GiveawayEntry>;
  winnerId: string | null;
  timer: ReturnType<typeof setTimeout> | null;
  ticketCost: number;
  ticketRewardTitle: string;
}

const giveaways = new Map<string, Giveaway>();

let giveawayIdCounter = 0;

function pickWinnerWeighted(entries: GiveawayEntry[]): string | null {
  if (entries.length === 0) return null;
  const totalTickets = entries.reduce((sum, e) => sum + e.tickets, 0);
  if (totalTickets <= 0) return null;
  let roll = Math.random() * totalTickets;
  for (const entry of entries) {
    roll -= entry.tickets;
    if (roll <= 0) return entry.user;
  }
  return entries[entries.length - 1].user;
}

const SUB_TICKETS: Record<number, number> = {
  0: 1,  // no suscriptor
  1: 2,  // Tier 1
  2: 5,  // Tier 2
  3: 10, // Tier 3
};

function enterGiveaway(channel: string, user: string, subTier = 0) {
  const giveaway = Array.from(giveaways.values()).find(
    (g) => g.channel === channel && g.status === 'active',
  );
  if (!giveaway) return;
  const existing = giveaway.entries.get(user.toLowerCase());
  if (existing) return;
  const tickets = SUB_TICKETS[subTier] ?? 1;
  giveaway.entries.set(user.toLowerCase(), { user, tickets });
  const entries = Array.from(giveaway.entries.values());
  getIO().to(`channel:${channel}`).emit('giveaway:entry', {
    user,
    participants: entries.map((e) => e.user),
    tickets: entries.map((e) => ({ user: e.user, tickets: e.tickets })),
    count: entries.length,
    totalTickets: entries.reduce((s, e) => s + e.tickets, 0),
  });
}

function addTickets(channel: string, user: string, amount: number) {
  const giveaway = Array.from(giveaways.values()).find(
    (g) => g.channel === channel && g.status === 'active',
  );
  if (!giveaway) return;
  let entry = giveaway.entries.get(user.toLowerCase());
  if (!entry) {
    const tickets = SUB_TICKETS[0];
    entry = { user, tickets };
    giveaway.entries.set(user.toLowerCase(), entry);
  }
  entry.tickets += amount;
  const entries = Array.from(giveaway.entries.values());
  getIO().to(`channel:${channel}`).emit('giveaway:entry', {
    user,
    participants: entries.map((e) => e.user),
    tickets: entries.map((e) => ({ user: e.user, tickets: e.tickets })),
    count: entries.length,
    totalTickets: entries.reduce((s, e) => s + e.tickets, 0),
  });
}

function endGiveaway(id: string) {
  const giveaway = giveaways.get(id);
  if (!giveaway || giveaway.status === 'ended') return;

  giveaway.status = 'ended';
  if (giveaway.timer) clearTimeout(giveaway.timer);

  const entries = Array.from(giveaway.entries.values());
  const winner = pickWinnerWeighted(entries);

  giveaway.winnerId = winner;

  if (winner) {
    const totalTickets = entries.reduce((s, e) => s + e.tickets, 0);
    sendMessage(
      giveaway.channel,
      `🎉 El ganador del sorteo "${giveaway.prize}" es @${winner}! Felicidades! (${entries.length} participantes, ${totalTickets} boletos)`,
    );
  } else {
    sendMessage(
      giveaway.channel,
      `😢 El sorteo "${giveaway.prize}" terminó sin participantes.`,
    );
  }

  getIO().to(`channel:${giveaway.channel}`).emit('giveaway:end', {
    id: giveaway.id,
    prize: giveaway.prize,
    status: 'ended',
    winnerId: winner,
    entries: entries.length,
    participants: entries.map((e) => e.user),
    tickets: entries.map((e) => ({ user: e.user, tickets: e.tickets })),
    totalTickets: entries.reduce((s, e) => s + e.tickets, 0),
  });

  if (winner) {
    getIO().to(`channel:${giveaway.channel}`).emit('giveaway:winner', {
      winner,
      prize: giveaway.prize,
    });
  }

  setTimeout(() => giveaways.delete(id), 60_000);
}

export function setupGiveaways(app: FastifyInstance) {
  app.post<{ Body: { channel: string; prize: string; duration?: number; ticketCost?: number; ticketRewardTitle?: string } }>(
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
      const ticketCost = req.body.ticketCost ?? 0;
      const ticketRewardTitle = req.body.ticketRewardTitle ?? '';

      const id = `giveaway_${++giveawayIdCounter}`;
      const giveaway: Giveaway = {
        id,
        channel,
        prize,
        status: 'active',
        entries: new Map(),
        winnerId: null,
        timer: null,
        ticketCost,
        ticketRewardTitle,
      };

      giveaway.timer = setTimeout(() => endGiveaway(id), duration * 1000);
      giveaways.set(id, giveaway);

      let msg = `🎉 Sorteo iniciado! Premio: ${prize}. Escribe !sorteo en el chat para participar!`;
      if (ticketCost > 0) {
        msg = `🎉 Sorteo iniciado! Premio: ${prize}. Usa puntos de canal para obtener más boletos! Escribe !sorteo para participar (1 boleto base).`;
      }
      sendMessage(channel, msg);

      getIO().to(`channel:${channel}`).emit('giveaway:start', {
        id,
        prize,
        status: 'active',
        winnerId: null,
        entries: 0,
        participants: [],
        tickets: [],
        totalTickets: 0,
        ticketCost,
        ticketRewardTitle,
      });

      reply.send({ id, prize, duration, ticketCost, ticketRewardTitle });
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
    if (!active) return reply.send(null);
    const entries = Array.from(active.entries.values());
    reply.send({
      id: active.id,
      prize: active.prize,
      status: active.status,
      entries: entries.length,
      participants: entries.map((e) => e.user),
      tickets: entries.map((e) => ({ user: e.user, tickets: e.tickets })),
      totalTickets: entries.reduce((s, e) => s + e.tickets, 0),
      ticketCost: active.ticketCost,
      ticketRewardTitle: active.ticketRewardTitle,
    });
  });
}

export { enterGiveaway, addTickets };

export function getActiveGiveaway(channel: string): {
  ticketCost: number;
  ticketRewardTitle: string;
} | null {
  const g = Array.from(giveaways.values()).find(
    (g) => g.channel === channel && g.status === 'active',
  );
  if (!g) return null;
  return { ticketCost: g.ticketCost, ticketRewardTitle: g.ticketRewardTitle };
}
