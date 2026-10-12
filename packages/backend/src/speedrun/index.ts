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

interface SpeedrunInstance {
  state: SpeedrunState;
  startTime: number; // Date.now() when the current run started minus already elapsed time
  tickInterval: ReturnType<typeof setInterval> | null;
}

const instances = new Map<string, SpeedrunInstance>();

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

function getOrCreate(channel: string): SpeedrunInstance {
  let inst = instances.get(channel);
  if (!inst) {
    inst = { state: defaultState(), startTime: 0, tickInterval: null };
    instances.set(channel, inst);
  }
  return inst;
}

function stopTick(inst: SpeedrunInstance) {
  if (inst.tickInterval) {
    clearInterval(inst.tickInterval);
    inst.tickInterval = null;
  }
}

function recalculateElapsed(inst: SpeedrunInstance) {
  if (inst.state.timerRunning) {
    inst.state.elapsedTime = Date.now() - inst.startTime;
  }
}

function broadcast(channel: string) {
  const inst = instances.get(channel);
  if (!inst) return;
  recalculateElapsed(inst);
  getIO().to(`channel:${channel}`).emit('speedrun:update', inst.state);
}

export function handleSpeedrunControl(channel: string, action: string) {
  if (!channel) return;
  const inst = getOrCreate(channel);

  switch (action) {
    case 'split': {
      if (!inst.state.timerRunning) {
        inst.state.timerRunning = true;
        inst.state.elapsedTime = 0;
        inst.startTime = Date.now();
        inst.tickInterval = setInterval(() => broadcast(channel), 1000);
      } else if (inst.state.currentSplitIndex < inst.state.splits.length) {
        recalculateElapsed(inst);
        inst.state.splits[inst.state.currentSplitIndex].current = inst.state.elapsedTime;
        inst.state.currentSplitIndex++;
        if (inst.state.currentSplitIndex >= inst.state.splits.length) {
          inst.state.timerRunning = false;
          stopTick(inst);
        }
      }
      break;
    }
    case 'undo': {
      if (inst.state.currentSplitIndex > 0) {
        inst.state.currentSplitIndex--;
        inst.state.splits[inst.state.currentSplitIndex].current = null;
        inst.state.timerRunning = true;
        inst.startTime = Date.now() - inst.state.elapsedTime;
        if (!inst.tickInterval) {
          inst.tickInterval = setInterval(() => broadcast(channel), 1000);
        }
      }
      break;
    }
    case 'reset': {
      inst.state.timerRunning = false;
      inst.state.elapsedTime = 0;
      inst.state.currentSplitIndex = 0;
      inst.state.splits.forEach((s) => (s.current = null));
      inst.state.attempts++;
      inst.startTime = 0;
      stopTick(inst);
      break;
    }
  }

  broadcast(channel);
}

export function handleGetState(channel: string) {
  if (!channel) return;
  const inst = getOrCreate(channel);
  recalculateElapsed(inst);
  getIO().to(`channel:${channel}`).emit('speedrun:update', inst.state);
}

export function handleSpeedrunConfig(channel: string, config: Partial<SpeedrunState> & { splits?: SpeedrunSplit[] }) {
  if (!channel) return;
  const inst = getOrCreate(channel);
  if (config.game !== undefined) inst.state.game = config.game;
  if (config.category !== undefined) inst.state.category = config.category;
  if (config.pb !== undefined) inst.state.pb = config.pb;
  if (config.wr !== undefined) inst.state.wr = config.wr;
  if (config.splits !== undefined) inst.state.splits = config.splits;
  broadcast(channel);
}

export function setupSpeedrun(app: FastifyInstance) {
  app.get('/speedrun/:channel', async (req, reply) => {
    const { channel } = req.params as { channel: string };
    const inst = getOrCreate(channel);
    recalculateElapsed(inst);
    reply.send(inst.state);
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

    const inst = getOrCreate(body.channel);
    if (body.game !== undefined) inst.state.game = body.game;
    if (body.category !== undefined) inst.state.category = body.category;
    if (body.pb !== undefined) inst.state.pb = body.pb;
    if (body.wr !== undefined) inst.state.wr = body.wr;
    if (body.splits !== undefined) inst.state.splits = body.splits;

    broadcast(body.channel);
    reply.send(inst.state);
  });

  app.post('/speedrun/reset', async (req, reply) => {
    const { channel } = req.body as { channel: string };
    if (!channel) return reply.status(400).send({ error: 'Missing channel' });
    const inst = getOrCreate(channel);
    stopTick(inst);
    inst.state = defaultState();
    inst.startTime = 0;
    broadcast(channel);
    reply.send(inst.state);
  });
}
