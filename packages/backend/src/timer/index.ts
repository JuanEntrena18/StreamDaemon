import { FastifyInstance } from 'fastify';
import { getIO } from '../socket/index.js';
import { TimerStartSchema } from '@streamforger/shared';
import type { TimerState } from '@streamforger/shared';

interface TimerInstance {
  state: TimerState;
  startedAt: number;
  tickInterval: ReturnType<typeof setInterval> | null;
}

const timers = new Map<string, TimerInstance>();

function broadcast(channel: string, timer: TimerInstance) {
  getIO().to(`channel:${channel}`).emit('timer:state', timer.state);
}

function tick(channel: string, timer: TimerInstance) {
  if (timer.state.status !== 'running') return;
  const elapsed = Math.floor((Date.now() - timer.startedAt) / 1000);
  const remaining = Math.max(0, timer.state.duration - elapsed);
  timer.state.remaining = remaining;

  getIO().to(`channel:${channel}`).emit('timer:tick', { remaining });

  if (remaining <= 0) {
    timer.state.status = 'finished';
    timer.state.remaining = 0;
    if (timer.tickInterval) {
      clearInterval(timer.tickInterval);
      timer.tickInterval = null;
    }
    broadcast(channel, timer);
  }
}

export function setupTimer(app: FastifyInstance) {
  app.post('/timer/start', async (req, reply) => {
    const { channel } = req.body as { channel?: string };
    if (!channel) return reply.status(400).send({ error: 'Missing channel' });

    const parsed = TimerStartSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const { duration, label } = parsed.data;

    const existing = timers.get(channel);
    if (existing?.tickInterval) clearInterval(existing.tickInterval);

    const timer: TimerInstance = {
      state: { status: 'running', remaining: duration, duration, label },
      startedAt: Date.now(),
      tickInterval: null,
    };

    timer.tickInterval = setInterval(() => tick(channel, timer), 1000);
    timers.set(channel, timer);
    broadcast(channel, timer);
    reply.send(timer.state);
  });

  app.post('/timer/pause', async (req, reply) => {
    const { channel } = req.body as { channel?: string };
    if (!channel) return reply.status(400).send({ error: 'Missing channel' });

    const timer = timers.get(channel);
    if (!timer || timer.state.status !== 'running') {
      return reply.status(400).send({ error: 'No active timer' });
    }

    if (timer.tickInterval) clearInterval(timer.tickInterval);
    timer.tickInterval = null;
    timer.state.status = 'paused';
    const elapsed = Math.floor((Date.now() - timer.startedAt) / 1000);
    timer.state.remaining = Math.max(0, timer.state.duration - elapsed);
    broadcast(channel, timer);
    reply.send(timer.state);
  });

  app.post('/timer/resume', async (req, reply) => {
    const { channel } = req.body as { channel?: string };
    if (!channel) return reply.status(400).send({ error: 'Missing channel' });

    const timer = timers.get(channel);
    if (!timer || timer.state.status !== 'paused') {
      return reply.status(400).send({ error: 'No paused timer' });
    }

    timer.startedAt = Date.now() - (timer.state.duration - timer.state.remaining) * 1000;
    timer.state.status = 'running';
    timer.tickInterval = setInterval(() => tick(channel, timer), 1000);
    broadcast(channel, timer);
    reply.send(timer.state);
  });

  app.post('/timer/reset', async (req, reply) => {
    const { channel } = req.body as { channel?: string };
    if (!channel) return reply.status(400).send({ error: 'Missing channel' });

    const existing = timers.get(channel);
    if (existing?.tickInterval) clearInterval(existing.tickInterval);
    timers.delete(channel);
    const empty: TimerState = { status: 'stopped', remaining: 0, duration: 0, label: '' };
    broadcast(channel, { state: empty, startedAt: 0, tickInterval: null });
    reply.send(empty);
  });

  app.get('/timer/:channel', async (req, reply) => {
    const { channel } = req.params as { channel: string };
    const timer = timers.get(channel);
    reply.send(timer?.state ?? { status: 'stopped', remaining: 0, duration: 0, label: '' });
  });
}
