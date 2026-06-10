import { FastifyInstance } from 'fastify';

interface StoredEvent {
  id: string;
  type: string;
  user: string;
  message: string;
  timestamp: number;
  amount?: number;
}

const MAX_EVENTS = 100;
const events = new Map<string, StoredEvent[]>();

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function recordEvent(channel: string, type: string, user: string, message: string, amount?: number) {
  if (!events.has(channel)) {
    events.set(channel, []);
  }
  const list = events.get(channel)!;
  list.unshift({
    id: generateId(),
    type,
    user,
    message,
    timestamp: Date.now(),
    amount,
  });
  if (list.length > MAX_EVENTS) {
    list.length = MAX_EVENTS;
  }
}

export function getEvents(channel: string): StoredEvent[] {
  return events.get(channel) ?? [];
}

export function setupActivity(app: FastifyInstance) {
  app.get('/activity/:channel', async (req, reply) => {
    const { channel } = req.params as { channel: string };
    return getEvents(channel.toLowerCase());
  });
}
