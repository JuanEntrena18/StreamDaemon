import { FastifyInstance } from 'fastify';
import { getIO } from '../socket/index.js';
import type { SubathonState, SubathonAction } from '@streamforger/shared';
import crypto from 'crypto';

interface SubathonInstance {
  state: SubathonState;
  startedAt: number;
  pausedAt: number | null;
  pausedRemaining: number;
  tickInterval: ReturnType<typeof setInterval> | null;
}

const subathons = new Map<string, SubathonInstance>();

function broadcast(channel: string, inst: SubathonInstance) {
  getIO().to(`channel:${channel}`).emit('subathon:state', inst.state);
}

function tick(channel: string, inst: SubathonInstance) {
  if (inst.state.status !== 'running') return;

  if (inst.pausedAt !== null) {
    const elapsed = Math.floor((Date.now() - inst.pausedAt) / 1000);
    inst.state.remaining = Math.max(0, inst.pausedRemaining - elapsed);
  }

  getIO().to(`channel:${channel}`).emit('subathon:tick', {
    remaining: inst.state.remaining,
    maxLimit: inst.state.maxLimit,
  });

  if (inst.state.remaining <= 0) {
    inst.state.status = 'finished';
    inst.state.remaining = 0;
    if (inst.tickInterval) {
      clearInterval(inst.tickInterval);
      inst.tickInterval = null;
    }
    broadcast(channel, inst);
  }
}

function addTime(channel: string, inst: SubathonInstance, action: SubathonAction) {
  const newTotal = inst.state.remaining + action.timeAdded;
  inst.state.remaining = Math.min(newTotal, inst.state.maxLimit);
  inst.state.totalAdded += action.timeAdded;
  inst.state.actions.unshift(action);
  if (inst.state.actions.length > 100) inst.state.actions.pop();

  if (inst.state.status === 'stopped') {
    inst.state.status = 'running';
    inst.startedAt = Date.now();
    inst.pausedAt = null;
    inst.pausedRemaining = inst.state.remaining;
    inst.tickInterval = setInterval(() => tick(channel, inst), 1000);
  } else if (inst.state.status === 'paused') {
    inst.pausedRemaining = inst.state.remaining;
  }

  getIO().to(`channel:${channel}`).emit('subathon:time-added', {
    amount: action.timeAdded,
    reason: action.note,
    user: action.user,
    remaining: inst.state.remaining,
  });
  broadcast(channel, inst);
}

const DEFAULT_CONFIG = {
  subTime: 300,
  bitTime: 60,
  bitsPerUnit: 100,
  maxLimit: 86400,
};

export function setupSubathon(app: FastifyInstance) {
  app.get('/subathon/:channel', async (req, reply) => {
    const { channel } = req.params as { channel: string };
    const inst = subathons.get(channel);
    reply.send(inst?.state ?? {
      status: 'stopped',
      remaining: 0,
      totalAdded: 0,
      maxLimit: DEFAULT_CONFIG.maxLimit,
      subTime: DEFAULT_CONFIG.subTime,
      bitTime: DEFAULT_CONFIG.bitTime,
      bitsPerUnit: DEFAULT_CONFIG.bitsPerUnit,
      startTime: null,
      actions: [],
    });
  });

  app.post('/subathon/start', async (req, reply) => {
    const { channel, subTime, bitTime, bitsPerUnit, maxLimit } = req.body as {
      channel: string;
      subTime?: number;
      bitTime?: number;
      bitsPerUnit?: number;
      maxLimit?: number;
    };
    if (!channel) return reply.status(400).send({ error: 'Missing channel' });

    const existing = subathons.get(channel);
    if (existing?.tickInterval) clearInterval(existing.tickInterval);

    const state: SubathonState = {
      status: 'running',
      remaining: 0,
      totalAdded: 0,
      maxLimit: maxLimit ?? DEFAULT_CONFIG.maxLimit,
      subTime: subTime ?? DEFAULT_CONFIG.subTime,
      bitTime: bitTime ?? DEFAULT_CONFIG.bitTime,
      bitsPerUnit: bitsPerUnit ?? DEFAULT_CONFIG.bitsPerUnit,
      startTime: Date.now(),
      actions: [],
    };

    const inst: SubathonInstance = {
      state,
      startedAt: Date.now(),
      pausedAt: Date.now(),
      pausedRemaining: 0,
      tickInterval: null,
    };

    inst.tickInterval = setInterval(() => tick(channel, inst), 1000);
    subathons.set(channel, inst);
    broadcast(channel, inst);
    reply.send(state);
  });

  app.post('/subathon/add-time', async (req, reply) => {
    const { channel, type, user, amount, note } = req.body as {
      channel: string;
      type: SubathonAction['type'];
      user: string;
      amount: number;
      note?: string;
    };
    if (!channel || !type || !user || !amount) {
      return reply.status(400).send({ error: 'Missing fields' });
    }

    let inst = subathons.get(channel);
    if (!inst) {
      const state: SubathonState = {
        status: 'stopped',
        remaining: 0,
        totalAdded: 0,
        maxLimit: DEFAULT_CONFIG.maxLimit,
        subTime: DEFAULT_CONFIG.subTime,
        bitTime: DEFAULT_CONFIG.bitTime,
        bitsPerUnit: DEFAULT_CONFIG.bitsPerUnit,
        startTime: null,
        actions: [],
      };
      inst = {
        state,
        startedAt: 0,
        pausedAt: null,
        pausedRemaining: 0,
        tickInterval: null,
      };
      subathons.set(channel, inst);
    }

    let timeAdded = amount;
    if (type === 'sub') timeAdded = inst.state.subTime;
    else if (type === 'bits') timeAdded = Math.floor(amount / inst.state.bitsPerUnit) * inst.state.bitTime;

    const action: SubathonAction = {
      id: crypto.randomUUID(),
      type,
      user,
      amount,
      timeAdded,
      note: note ?? `${type} reward`,
      timestamp: Date.now(),
    };

    addTime(channel, inst, action);
    reply.send({ action, remaining: inst.state.remaining });
  });

  app.post('/subathon/pause', async (req, reply) => {
    const { channel } = req.body as { channel?: string };
    if (!channel) return reply.status(400).send({ error: 'Missing channel' });

    const inst = subathons.get(channel);
    if (!inst || inst.state.status !== 'running') {
      return reply.status(400).send({ error: 'No active subathon' });
    }

    if (inst.tickInterval) clearInterval(inst.tickInterval);
    inst.tickInterval = null;
    inst.state.status = 'paused';
    inst.pausedAt = null;
    inst.pausedRemaining = inst.state.remaining;
    broadcast(channel, inst);
    reply.send(inst.state);
  });

  app.post('/subathon/resume', async (req, reply) => {
    const { channel } = req.body as { channel?: string };
    if (!channel) return reply.status(400).send({ error: 'Missing channel' });

    const inst = subathons.get(channel);
    if (!inst || inst.state.status !== 'paused') {
      return reply.status(400).send({ error: 'No paused subathon' });
    }

    inst.state.status = 'running';
    inst.pausedAt = Date.now();
    inst.pausedRemaining = inst.state.remaining;
    inst.tickInterval = setInterval(() => tick(channel, inst), 1000);
    broadcast(channel, inst);
    reply.send(inst.state);
  });

  app.post('/subathon/stop', async (req, reply) => {
    const { channel } = req.body as { channel?: string };
    if (!channel) return reply.status(400).send({ error: 'Missing channel' });

    const existing = subathons.get(channel);
    if (existing?.tickInterval) clearInterval(existing.tickInterval);
    subathons.delete(channel);
    reply.send({ status: 'stopped', remaining: 0, totalAdded: 0, maxLimit: DEFAULT_CONFIG.maxLimit, subTime: DEFAULT_CONFIG.subTime, bitTime: DEFAULT_CONFIG.bitTime, bitsPerUnit: DEFAULT_CONFIG.bitsPerUnit, startTime: null, actions: [] });
  });

  app.post('/subathon/config', async (req, reply) => {
    const { channel, subTime, bitTime, bitsPerUnit, maxLimit } = req.body as {
      channel: string;
      subTime?: number;
      bitTime?: number;
      bitsPerUnit?: number;
      maxLimit?: number;
    };
    if (!channel) return reply.status(400).send({ error: 'Missing channel' });

    const inst = subathons.get(channel);
    if (!inst) return reply.status(400).send({ error: 'No subathon active' });

    if (subTime !== undefined) inst.state.subTime = subTime;
    if (bitTime !== undefined) inst.state.bitTime = bitTime;
    if (bitsPerUnit !== undefined) inst.state.bitsPerUnit = bitsPerUnit;
    if (maxLimit !== undefined) inst.state.maxLimit = maxLimit;

    broadcast(channel, inst);
    reply.send(inst.state);
  });
}
