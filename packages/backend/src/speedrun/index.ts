import { FastifyInstance } from 'fastify';
import { getIO } from '../socket/index.js';

export interface SpeedrunSplit {
  name: string;
  pb: number;
  current: number | null;
  gold: number;
}

export interface SpeedrunState {
  game: string;
  category: string;
  attempts: number;
  pb: number;
  wr: number;
  splits: SpeedrunSplit[];
  currentSplitIndex: number;
  timerRunning: boolean;
  elapsedTime: number;
}

const states = new Map<string, SpeedrunState>();

function defaultSplits(): SpeedrunSplit[] {
  return [
    { name: 'Split 1', pb: 180000, current: null, gold: 165000 },
    { name: 'Split 2', pb: 420000, current: null, gold: 395000 },
    { name: 'Split 3', pb: 780000, current: null, gold: 740000 },
    { name: 'Split 4', pb: 1240000, current: null, gold: 1190000 },
    { name: 'Split 5', pb: 1890000, current: null, gold: 1800000 },
    { name: 'Split 6', pb: 2540000, current: null, gold: 2450000 },
    { name: 'Split 7', pb: 3000000, current: null, gold: 2900000 },
    { name: 'Split 8', pb: 3252330, current: null, gold: 3120000 },
  ];
}

function defaultState(): SpeedrunState {
  return {
    game: 'Speedrun',
    category: 'Any%',
    attempts: 1,
    pb: 3252330,
    wr: 2882000,
    splits: defaultSplits(),
    currentSplitIndex: 0,
    timerRunning: false,
    elapsedTime: 0,
  };
}

function getOrCreate(channel: string): SpeedrunState {
  let state = states.get(channel);
  if (!state) {
    state = defaultState();
    states.set(channel, state);
  }
  return state;
}

function broadcast(channel: string) {
  const state = states.get(channel);
  if (state) getIO().to(`channel:${channel}`).emit('speedrun:update', state);
}

export function handleSpeedrunControl(channel: string, action: string) {
  if (!channel) return;
  const state = getOrCreate(channel);

  switch (action) {
    case 'split': {
      if (!state.timerRunning) {
        state.timerRunning = true;
        state.elapsedTime = 0;
      } else if (state.currentSplitIndex < state.splits.length) {
        state.splits[state.currentSplitIndex].current = state.elapsedTime;
        state.currentSplitIndex++;
        if (state.currentSplitIndex >= state.splits.length) {
          state.timerRunning = false;
        }
      }
      break;
    }
    case 'undo': {
      if (state.currentSplitIndex > 0) {
        state.currentSplitIndex--;
        state.splits[state.currentSplitIndex].current = null;
        state.timerRunning = true;
      }
      break;
    }
    case 'reset': {
      state.timerRunning = false;
      state.elapsedTime = 0;
      state.currentSplitIndex = 0;
      state.splits.forEach(s => s.current = null);
      state.attempts++;
      break;
    }
  }

  broadcast(channel);
}

export function handleGetState(channel: string) {
  if (!channel) return;
  const state = getOrCreate(channel);
  getIO().to(`channel:${channel}`).emit('speedrun:update', state);
}

export function handleSpeedrunConfig(channel: string, config: Partial<SpeedrunState> & { splits?: SpeedrunSplit[] }) {
  if (!channel) return;
  const state = getOrCreate(channel);
  if (config.game !== undefined) state.game = config.game;
  if (config.category !== undefined) state.category = config.category;
  if (config.pb !== undefined) state.pb = config.pb;
  if (config.wr !== undefined) state.wr = config.wr;
  if (config.splits !== undefined) state.splits = config.splits;
  broadcast(channel);
}

export function setupSpeedrun(app: FastifyInstance) {
  app.get('/speedrun/:channel', async (req, reply) => {
    const { channel } = req.params as { channel: string };
    reply.send(getOrCreate(channel));
  });

  app.post('/speedrun/config', async (req, reply) => {
    const body = req.body as {
      channel: string;
      game?: string;
      category?: string;
      pb?: number;
      wr?: number;
      splits?: SpeedrunSplit[];
    };
    if (!body.channel) return reply.status(400).send({ error: 'Missing channel' });

    const state = getOrCreate(body.channel);
    if (body.game !== undefined) state.game = body.game;
    if (body.category !== undefined) state.category = body.category;
    if (body.pb !== undefined) state.pb = body.pb;
    if (body.wr !== undefined) state.wr = body.wr;
    if (body.splits !== undefined) state.splits = body.splits;

    broadcast(body.channel);
    reply.send(state);
  });

  app.post('/speedrun/reset', async (req, reply) => {
    const { channel } = req.body as { channel: string };
    if (!channel) return reply.status(400).send({ error: 'Missing channel' });
    states.delete(channel);
    const fresh = defaultState();
    states.set(channel, fresh);
    broadcast(channel);
    reply.send(fresh);
  });
}
