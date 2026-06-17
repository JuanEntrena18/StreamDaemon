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

const SUB_TIER_MAP: Record<string, keyof SubathonState> = {
  '1000': 'subTier1Time',
  '2000': 'subTier2Time',
  '3000': 'subTier3Time',
};

function getTierConfigKey(tier: string): keyof SubathonState {
  return SUB_TIER_MAP[tier] ?? 'otherSubTime';
}

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

  if (inst.state.status === 'stopped' || inst.state.status === 'finished') {
    inst.state.status = 'running';
    inst.startedAt = Date.now();
    inst.pausedAt = Date.now();
    inst.pausedRemaining = inst.state.remaining;
    inst.tickInterval = setInterval(() => tick(channel, inst), 1000);
  } else if (inst.state.status === 'paused') {
    inst.pausedRemaining = inst.state.remaining;
  } else if (inst.state.status === 'running') {
    inst.pausedAt = Date.now();
    inst.pausedRemaining = inst.state.remaining;
  }

  getIO().to(`channel:${channel}`).emit('subathon:time-added', {
    amount: action.timeAdded,
    reason: action.note,
    user: action.user,
    type: action.type,
    remaining: inst.state.remaining,
  });
  broadcast(channel, inst);
}

const DEFAULT_CONFIG = {
  subTier1Time: 300,
  subTier2Time: 600,
  subTier3Time: 900,
  otherSubTime: 180,
  tipTime: 30,
  cheerBitsPerUnit: 100,
  cheerTimePerUnit: 60,
  followTime: 120,
  maxLimit: 86400,
  alertsEnabled: true,
  alertDuration: 6,
  primaryColor: '#ef4444',
  accentColor: '#a78bfa',
  bgColor: '#0a0a0f',
  textColor: '#ffffff',
  accentTextColor: '#ffffff',
  fontFamily: 'Inter, system-ui, sans-serif',
};

export function addSubathonTime(channel: string, action: SubathonAction) {
  let inst = subathons.get(channel);
  if (!inst) {
    const state: SubathonState = {
      status: 'stopped', remaining: 0, totalAdded: 0,
      ...DEFAULT_CONFIG,
      startTime: null, actions: [],
    };
    inst = { state, startedAt: 0, pausedAt: null, pausedRemaining: 0, tickInterval: null };
    subathons.set(channel, inst);
  }

  if (action.type === 'sub') {
    const key = getTierConfigKey(action.tier || '1000');
    action.timeAdded = inst.state[key] as number;
  } else if (action.type === 'bits') {
    const units = Math.floor(action.amount / inst.state.cheerBitsPerUnit);
    action.timeAdded = units * inst.state.cheerTimePerUnit;
  } else if (action.type === 'tip') {
    action.timeAdded = inst.state.tipTime;
  } else if (action.type === 'follow') {
    action.timeAdded = inst.state.followTime;
  } else {
    action.timeAdded = action.amount;
  }

  addTime(channel, inst, action);
}

export function setupSubathon(app: FastifyInstance) {
  function defaultState(): SubathonState {
    return {
      status: 'stopped', remaining: 0, totalAdded: 0,
      ...DEFAULT_CONFIG,
      startTime: null, actions: [],
    };
  }

  app.get('/subathon/:channel', async (req, reply) => {
    const { channel } = req.params as { channel: string };
    const inst = subathons.get(channel);
    reply.send(inst?.state ?? defaultState());
  });

  app.post('/subathon/start', async (req, reply) => {
    const body = req.body as {
      channel: string;
      subTier1Time?: number; subTier2Time?: number; subTier3Time?: number;
      otherSubTime?: number; tipTime?: number;
      cheerBitsPerUnit?: number; cheerTimePerUnit?: number;
      followTime?: number; maxLimit?: number; initialTime?: number;
      alertsEnabled?: boolean; alertDuration?: number;
      primaryColor?: string; accentColor?: string; bgColor?: string;
      textColor?: string; accentTextColor?: string; fontFamily?: string;
    };
    if (!body.channel) return reply.status(400).send({ error: 'Missing channel' });

    const existing = subathons.get(body.channel);
    if (existing?.tickInterval) clearInterval(existing.tickInterval);

    const remaining = Math.min(body.initialTime ?? 0, body.maxLimit ?? DEFAULT_CONFIG.maxLimit);

    const state: SubathonState = {
      status: remaining > 0 ? 'running' : 'paused',
      remaining,
      totalAdded: remaining,
      ...DEFAULT_CONFIG,
      maxLimit: body.maxLimit ?? DEFAULT_CONFIG.maxLimit,
      subTier1Time: body.subTier1Time ?? DEFAULT_CONFIG.subTier1Time,
      subTier2Time: body.subTier2Time ?? DEFAULT_CONFIG.subTier2Time,
      subTier3Time: body.subTier3Time ?? DEFAULT_CONFIG.subTier3Time,
      otherSubTime: body.otherSubTime ?? DEFAULT_CONFIG.otherSubTime,
      tipTime: body.tipTime ?? DEFAULT_CONFIG.tipTime,
      cheerBitsPerUnit: body.cheerBitsPerUnit ?? DEFAULT_CONFIG.cheerBitsPerUnit,
      cheerTimePerUnit: body.cheerTimePerUnit ?? DEFAULT_CONFIG.cheerTimePerUnit,
      followTime: body.followTime ?? DEFAULT_CONFIG.followTime,
      alertsEnabled: body.alertsEnabled ?? DEFAULT_CONFIG.alertsEnabled,
      alertDuration: body.alertDuration ?? DEFAULT_CONFIG.alertDuration,
      primaryColor: body.primaryColor ?? DEFAULT_CONFIG.primaryColor,
      accentColor: body.accentColor ?? DEFAULT_CONFIG.accentColor,
      bgColor: body.bgColor ?? DEFAULT_CONFIG.bgColor,
      textColor: body.textColor ?? DEFAULT_CONFIG.textColor,
      accentTextColor: body.accentTextColor ?? DEFAULT_CONFIG.accentTextColor,
      fontFamily: body.fontFamily ?? DEFAULT_CONFIG.fontFamily,
      startTime: remaining > 0 ? Date.now() : null,
      actions: [],
    };

    if (remaining > 0) {
      state.actions.push({
        id: crypto.randomUUID(), type: 'manual',
        user: 'StreamForge', amount: remaining, timeAdded: remaining,
        note: 'Tiempo inicial', timestamp: Date.now(),
      });
    }

    const inst: SubathonInstance = {
      state,
      startedAt: Date.now(),
      pausedAt: remaining > 0 ? Date.now() : null,
      pausedRemaining: remaining,
      tickInterval: null,
    };

    if (remaining > 0) {
      inst.tickInterval = setInterval(() => tick(body.channel, inst), 1000);
    }
    subathons.set(body.channel, inst);
    broadcast(body.channel, inst);
    reply.send(state);
  });

  app.post('/subathon/add-time', async (req, reply) => {
    const { channel, type, user, amount, note } = req.body as {
      channel: string; type: SubathonAction['type']; user: string; amount: number; note?: string;
    };
    if (!channel || !type || !user || !amount) {
      return reply.status(400).send({ error: 'Missing fields' });
    }

    const action: SubathonAction = {
      id: crypto.randomUUID(), type, user, amount, timeAdded: 0,
      note: note ?? `${type} reward`, timestamp: Date.now(),
    };

    addSubathonTime(channel, action);
    const inst = subathons.get(channel);
    reply.send({ action, remaining: inst?.state.remaining ?? 0 });
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
    reply.send(defaultState());
  });

  app.post('/subathon/config', async (req, reply) => {
    const body = req.body as {
      channel: string;
      subTier1Time?: number; subTier2Time?: number; subTier3Time?: number;
      otherSubTime?: number; tipTime?: number;
      cheerBitsPerUnit?: number; cheerTimePerUnit?: number;
      followTime?: number; maxLimit?: number;
      alertsEnabled?: boolean; alertDuration?: number;
      primaryColor?: string; accentColor?: string; bgColor?: string;
      textColor?: string; accentTextColor?: string; fontFamily?: string;
    };
    if (!body.channel) return reply.status(400).send({ error: 'Missing channel' });

    const inst = subathons.get(body.channel);
    if (!inst) return reply.status(400).send({ error: 'No subathon active' });

    if (body.subTier1Time !== undefined) inst.state.subTier1Time = body.subTier1Time;
    if (body.subTier2Time !== undefined) inst.state.subTier2Time = body.subTier2Time;
    if (body.subTier3Time !== undefined) inst.state.subTier3Time = body.subTier3Time;
    if (body.otherSubTime !== undefined) inst.state.otherSubTime = body.otherSubTime;
    if (body.tipTime !== undefined) inst.state.tipTime = body.tipTime;
    if (body.cheerBitsPerUnit !== undefined) inst.state.cheerBitsPerUnit = body.cheerBitsPerUnit;
    if (body.cheerTimePerUnit !== undefined) inst.state.cheerTimePerUnit = body.cheerTimePerUnit;
    if (body.followTime !== undefined) inst.state.followTime = body.followTime;
    if (body.maxLimit !== undefined) inst.state.maxLimit = body.maxLimit;
    if (body.alertsEnabled !== undefined) inst.state.alertsEnabled = body.alertsEnabled;
    if (body.alertDuration !== undefined) inst.state.alertDuration = body.alertDuration;
    if (body.primaryColor !== undefined) inst.state.primaryColor = body.primaryColor;
    if (body.accentColor !== undefined) inst.state.accentColor = body.accentColor;
    if (body.bgColor !== undefined) inst.state.bgColor = body.bgColor;
    if (body.textColor !== undefined) inst.state.textColor = body.textColor;
    if (body.accentTextColor !== undefined) inst.state.accentTextColor = body.accentTextColor;
    if (body.fontFamily !== undefined) inst.state.fontFamily = body.fontFamily;

    broadcast(body.channel, inst);
    reply.send(inst.state);
  });
}
