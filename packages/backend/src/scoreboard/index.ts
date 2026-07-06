import { FastifyInstance } from 'fastify';
import { getIO } from '../socket/index.js';
import { ScoreboardPlayerSchema, ScoreboardScoreSchema, ScoreboardIncrementSchema, FighterConfigSchema, FighterDamageSchema, FighterRoundSchema, FighterHealSchema } from '@streamdaemon/shared';
import type { ScoreboardState, ScoreboardPlayer, FighterState, FighterPlayer } from '@streamdaemon/shared';

const boards = new Map<string, ScoreboardState>();
const fighterBoards = new Map<string, FighterState>();
const fighterIntervals = new Map<string, NodeJS.Timeout>();

function defaultFighter(): FighterState {
  return {
    p1: { name: 'Player 1', health: 144, rounds: 0, charName: '', portrait: '' },
    p2: { name: 'Player 2', health: 144, rounds: 0, charName: '', portrait: '' },
    maxHealth: 144,
    roundsToWin: 2,
    timerRemaining: 99,
    timerRunning: false,
    timerDuration: 99,
    status: 'waiting',
  };
}

function getOrCreateFighter(channel: string): FighterState {
  let f = fighterBoards.get(channel);
  if (!f) {
    f = defaultFighter();
    fighterBoards.set(channel, f);
  }
  return f;
}

function broadcastFighter(channel: string) {
  const f = fighterBoards.get(channel);
  if (f) getIO().to(`channel:${channel}`).emit('fighter:update', f);
}

function stopFighterTimer(channel: string) {
  const interval = fighterIntervals.get(channel);
  if (interval) {
    clearInterval(interval);
    fighterIntervals.delete(channel);
  }
}

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

  // ── Fighter routes ──

  app.get('/fighter/:channel', async (req, reply) => {
    const { channel } = req.params as { channel: string };
    reply.send(getOrCreateFighter(channel));
  });

  app.post('/fighter/config', async (req, reply) => {
    const { channel } = req.body as { channel?: string };
    if (!channel) return reply.status(400).send({ error: 'Missing channel' });
    const parsed = FighterConfigSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });
    const f = getOrCreateFighter(channel);
    const cfg = parsed.data;
    if (cfg.p1Name !== undefined) f.p1.name = cfg.p1Name;
    if (cfg.p1CharName !== undefined) f.p1.charName = cfg.p1CharName;
    if (cfg.p1Portrait !== undefined) f.p1.portrait = cfg.p1Portrait;
    if (cfg.p2Name !== undefined) f.p2.name = cfg.p2Name;
    if (cfg.p2CharName !== undefined) f.p2.charName = cfg.p2CharName;
    if (cfg.p2Portrait !== undefined) f.p2.portrait = cfg.p2Portrait;
    if (cfg.maxHealth !== undefined) f.maxHealth = cfg.maxHealth;
    if (cfg.roundsToWin !== undefined) f.roundsToWin = cfg.roundsToWin;
    if (cfg.timerDuration !== undefined) { f.timerDuration = cfg.timerDuration; f.timerRemaining = cfg.timerDuration; }
    broadcastFighter(channel);
    reply.send(f);
  });

  app.post('/fighter/damage', async (req, reply) => {
    const { channel } = req.body as { channel?: string };
    if (!channel) return reply.status(400).send({ error: 'Missing channel' });
    const parsed = FighterDamageSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });
    const f = fighterBoards.get(channel);
    if (!f) return reply.status(404).send({ error: 'No fighter board' });
    const player = parsed.data.player === 'p1' ? f.p1 : f.p2;
    player.health = Math.max(0, player.health - parsed.data.amount);
    if (player.health <= 0) f.status = 'finished';
    broadcastFighter(channel);
    reply.send(f);
  });

  app.post('/fighter/heal', async (req, reply) => {
    const { channel } = req.body as { channel?: string };
    if (!channel) return reply.status(400).send({ error: 'Missing channel' });
    const parsed = FighterHealSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });
    const f = fighterBoards.get(channel);
    if (!f) return reply.status(404).send({ error: 'No fighter board' });
    const player = parsed.data.player === 'p1' ? f.p1 : f.p2;
    player.health = Math.min(f.maxHealth, player.health + parsed.data.amount);
    broadcastFighter(channel);
    reply.send(f);
  });

  app.post('/fighter/round', async (req, reply) => {
    const { channel } = req.body as { channel?: string };
    if (!channel) return reply.status(400).send({ error: 'Missing channel' });
    const parsed = FighterRoundSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });
    const f = fighterBoards.get(channel);
    if (!f) return reply.status(404).send({ error: 'No fighter board' });
    const player = parsed.data.player === 'p1' ? f.p1 : f.p2;
    player.rounds = Math.min(f.roundsToWin, player.rounds + 1);
    const opponent = parsed.data.player === 'p1' ? f.p2 : f.p1;
    if (player.rounds >= f.roundsToWin) {
      f.status = 'finished';
    } else {
      f.p1.health = f.maxHealth;
      f.p2.health = f.maxHealth;
      f.timerRemaining = f.timerDuration;
      f.timerRunning = false;
      stopFighterTimer(channel);
    }
    broadcastFighter(channel);
    reply.send(f);
  });

  app.post('/fighter/timer/start', async (req, reply) => {
    const { channel } = req.body as { channel?: string };
    if (!channel) return reply.status(400).send({ error: 'Missing channel' });
    const f = fighterBoards.get(channel);
    if (!f) return reply.status(404).send({ error: 'No fighter board' });
    if (f.timerRunning) return reply.send(f);
    f.timerRunning = true;
    if (f.timerRemaining <= 0) f.timerRemaining = f.timerDuration;
    const interval = setInterval(() => {
      const state = fighterBoards.get(channel);
      if (!state || !state.timerRunning) { stopFighterTimer(channel); return; }
      state.timerRemaining = Math.max(0, state.timerRemaining - 1);
      broadcastFighter(channel);
      if (state.timerRemaining <= 0) {
        state.timerRunning = false;
        stopFighterTimer(channel);
        if (state.p1.health !== state.p2.health) {
          state.p1.health > state.p2.health
            ? state.p1.rounds = Math.min(state.roundsToWin, state.p1.rounds + 1)
            : state.p2.rounds = Math.min(state.roundsToWin, state.p2.rounds + 1);
          const winner = state.p1.health > state.p2.health ? state.p1 : state.p2;
          const loser = state.p1.health > state.p2.health ? state.p2 : state.p1;
          if (winner.rounds >= state.roundsToWin) {
            state.status = 'finished';
          } else {
            state.p1.health = state.maxHealth;
            state.p2.health = state.maxHealth;
            state.timerRemaining = state.timerDuration;
          }
        } else {
          state.status = 'finished';
        }
        broadcastFighter(channel);
      }
    }, 1000);
    fighterIntervals.set(channel, interval);
    broadcastFighter(channel);
    reply.send(f);
  });

  app.post('/fighter/timer/pause', async (req, reply) => {
    const { channel } = req.body as { channel?: string };
    if (!channel) return reply.status(400).send({ error: 'Missing channel' });
    const f = fighterBoards.get(channel);
    if (!f) return reply.status(404).send({ error: 'No fighter board' });
    f.timerRunning = false;
    stopFighterTimer(channel);
    broadcastFighter(channel);
    reply.send(f);
  });

  app.post('/fighter/timer/reset', async (req, reply) => {
    const { channel } = req.body as { channel?: string };
    if (!channel) return reply.status(400).send({ error: 'Missing channel' });
    const f = fighterBoards.get(channel);
    if (!f) return reply.status(404).send({ error: 'No fighter board' });
    f.timerRunning = false;
    f.timerRemaining = f.timerDuration;
    stopFighterTimer(channel);
    broadcastFighter(channel);
    reply.send(f);
  });

  app.post('/fighter/reset', async (req, reply) => {
    const { channel } = req.body as { channel?: string };
    if (!channel) return reply.status(400).send({ error: 'Missing channel' });
    stopFighterTimer(channel);
    const f = getOrCreateFighter(channel);
    f.p1.health = f.maxHealth;
    f.p1.rounds = 0;
    f.p2.health = f.maxHealth;
    f.p2.rounds = 0;
    f.timerRemaining = f.timerDuration;
    f.timerRunning = false;
    f.status = 'waiting';
    broadcastFighter(channel);
    reply.send(f);
  });
}
