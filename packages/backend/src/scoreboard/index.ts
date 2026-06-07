import { FastifyInstance } from 'fastify';
import { getIO } from '../socket/index.js';
import { ScoreboardPlayerSchema, ScoreboardScoreSchema, ScoreboardIncrementSchema } from '@streamforger/shared';
import type { ScoreboardState, ScoreboardPlayer } from '@streamforger/shared';

const boards = new Map<string, ScoreboardState>();

function broadcast(channel: string) {
  const board = boards.get(channel);
  if (board) getIO().to(`channel:${channel}`).emit('scoreboard:update', board);
}

function getOrCreate(channel: string): ScoreboardState {
  let board = boards.get(channel);
  if (!board) {
    board = { players: [], title: 'Scoreboard' };
    boards.set(channel, board);
  }
  return board;
}

export function setupScoreboard(app: FastifyInstance) {
  app.get('/scoreboard/:channel', async (req, reply) => {
    const { channel } = req.params as { channel: string };
    reply.send(getOrCreate(channel));
  });

  app.post('/scoreboard/title', async (req, reply) => {
    const { channel, title } = req.body as { channel: string; title: string };
    if (!channel) return reply.status(400).send({ error: 'Missing channel' });
    const board = getOrCreate(channel);
    board.title = title || 'Scoreboard';
    broadcast(channel);
    reply.send(board);
  });

  app.post('/scoreboard/player/add', async (req, reply) => {
    const { channel } = req.body as { channel?: string };
    if (!channel) return reply.status(400).send({ error: 'Missing channel' });

    const parsed = ScoreboardPlayerSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const board = getOrCreate(channel);
    const id = `p_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    board.players.push({ id, name: parsed.data.name, score: 0 });
    broadcast(channel);
    reply.send(board);
  });

  app.post('/scoreboard/player/remove', async (req, reply) => {
    const { channel, playerId } = req.body as { channel: string; playerId: string };
    if (!channel || !playerId) return reply.status(400).send({ error: 'Missing channel or playerId' });

    const board = boards.get(channel);
    if (!board) return reply.status(404).send({ error: 'No scoreboard' });

    board.players = board.players.filter((p) => p.id !== playerId);
    broadcast(channel);
    reply.send(board);
  });

  app.post('/scoreboard/score/set', async (req, reply) => {
    const { channel } = req.body as { channel?: string };
    if (!channel) return reply.status(400).send({ error: 'Missing channel' });

    const parsed = ScoreboardScoreSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const board = boards.get(channel);
    if (!board) return reply.status(404).send({ error: 'No scoreboard' });

    const player = board.players.find((p) => p.id === parsed.data.playerId);
    if (!player) return reply.status(404).send({ error: 'Player not found' });

    player.score = parsed.data.score;
    broadcast(channel);
    reply.send(board);
  });

  app.post('/scoreboard/score/increment', async (req, reply) => {
    const { channel } = req.body as { channel?: string };
    if (!channel) return reply.status(400).send({ error: 'Missing channel' });

    const parsed = ScoreboardIncrementSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const board = boards.get(channel);
    if (!board) return reply.status(404).send({ error: 'No scoreboard' });

    const player = board.players.find((p) => p.id === parsed.data.playerId);
    if (!player) return reply.status(404).send({ error: 'Player not found' });

    player.score += parsed.data.amount;
    broadcast(channel);
    reply.send(board);
  });

  app.post('/scoreboard/score/decrement', async (req, reply) => {
    const { channel } = req.body as { channel?: string };
    if (!channel) return reply.status(400).send({ error: 'Missing channel' });

    const parsed = ScoreboardIncrementSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const board = boards.get(channel);
    if (!board) return reply.status(404).send({ error: 'No scoreboard' });

    const player = board.players.find((p) => p.id === parsed.data.playerId);
    if (!player) return reply.status(404).send({ error: 'Player not found' });

    player.score -= parsed.data.amount;
    broadcast(channel);
    reply.send(board);
  });

  app.post('/scoreboard/reset', async (req, reply) => {
    const { channel } = req.body as { channel?: string };
    if (!channel) return reply.status(400).send({ error: 'Missing channel' });

    const board = boards.get(channel);
    if (board) {
      board.players.forEach((p) => (p.score = 0));
      broadcast(channel);
    }
    reply.send(board ?? { players: [], title: 'Scoreboard' });
  });

  app.post('/scoreboard/clear', async (req, reply) => {
    const { channel } = req.body as { channel?: string };
    if (!channel) return reply.status(400).send({ error: 'Missing channel' });
    boards.delete(channel);
    const empty: ScoreboardState = { players: [], title: 'Scoreboard' };
    getIO().to(`channel:${channel}`).emit('scoreboard:update', empty);
    reply.send(empty);
  });
}
