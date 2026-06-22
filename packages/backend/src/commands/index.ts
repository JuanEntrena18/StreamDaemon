import { FastifyInstance } from 'fastify';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../../data');
const COMMANDS_FILE = path.join(DATA_DIR, 'commands.json');

interface Command {
  id: string;
  name: string;
  response: string;
  enabled: boolean;
  aliases: string[];
  cooldown: number;
  modOnly: boolean;
  count: number;
}

let store = new Map<string, Command[]>();

function load() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (fs.existsSync(COMMANDS_FILE)) {
      const raw = fs.readFileSync(COMMANDS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      store = new Map(Object.entries(parsed));
    }
  } catch (e) {
    console.warn('⚠️ Could not load commands.json, starting fresh', e);
  }
}

function save() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    const obj = Object.fromEntries(store);
    fs.writeFileSync(COMMANDS_FILE, JSON.stringify(obj, null, 2), 'utf-8');
  } catch (e) {
    console.error('❌ Failed to save commands.json', e);
  }
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function getCommandsForChannel(channel: string): Command[] {
  return store.get(channel.toLowerCase()) ?? [];
}

export async function checkCustomCommand(channel: string, user: string, text: string): Promise<string | null> {
  const parts = text.trim().split(/\s+/);
  const firstWord = parts[0]?.toLowerCase();
  
  // The command must start with !
  if (!firstWord || !firstWord.startsWith('!')) return null;
  const cmdName = firstWord.substring(1);

  const cmds = getCommandsForChannel(channel);
  // Allow matching even if the saved name accidentally includes !
  const cmd = cmds.find((c) => c.enabled && (
    c.name.replace(/^!/, '') === cmdName || 
    c.aliases.map(a => a.replace(/^!/, '')).includes(cmdName)
  ));
  
  if (!cmd) {
    return null;
  }

  console.log(`  🤖 Custom command !${cmdName} matched, responding: "${cmd.response}"`);
  cmd.count++;
  save();
  
  let response = cmd.response;
  response = response.replace(/\{user\}/g, `@${user}`);
  response = response.replace(/\{channel\}/g, channel);
  response = response.replace(/\{streamer\}/g, channel);
  response = response.replace(/\{count\}/g, cmd.count.toString());
  
  const args = parts.slice(1).join(' ');
  response = response.replace(/\{args\}/g, args);
  
  response = response.replace(/\{random:(\d+)-(\d+)\}/g, (_, minStr, maxStr) => {
    const min = parseInt(minStr, 10);
    const max = parseInt(maxStr, 10);
    if (isNaN(min) || isNaN(max) || min > max) return '0';
    return Math.floor(Math.random() * (max - min + 1) + min).toString();
  });

  return response;
}

export function setupCommands(app: FastifyInstance) {
  load();

  // List commands
  app.get('/commands/:channel', (req, reply) => {
    const { channel } = req.params as { channel: string };
    return getCommandsForChannel(channel);
  });

  // Add command
  app.post('/commands/add', async (req, reply) => {
    const body = req.body as { channel: string; name: string; response: string };
    if (!body.channel || !body.name || !body.response) {
      return reply.status(400).send({ error: 'Missing channel, name or response' });
    }

    const channel = body.channel.toLowerCase();
    if (!store.has(channel)) store.set(channel, []);

    const cmds = store.get(channel)!;
    const cleanName = body.name.trim().toLowerCase().replace(/^!/, '');
    
    if (cmds.find((c) => c.name.replace(/^!/, '') === cleanName)) {
      return reply.status(409).send({ error: `El comando !${cleanName} ya existe` });
    }

    const cmd: Command = {
      id: generateId(),
      name: cleanName,
      response: body.response,
      enabled: true,
      aliases: [],
      cooldown: 0,
      modOnly: false,
      count: 0,
    };

    cmds.push(cmd);
    save();
    return reply.send(cmd);
  });

  // Toggle command enabled/disabled
  app.put('/commands/toggle', async (req, reply) => {
    const body = req.body as { channel: string; commandId: string; enabled: boolean };
    const channel = body.channel.toLowerCase();
    const cmds = store.get(channel);
    if (!cmds) return reply.status(404).send({ error: 'No commands for this channel' });

    const cmd = cmds.find((c) => c.id === body.commandId);
    if (!cmd) return reply.status(404).send({ error: 'Command not found' });

    cmd.enabled = body.enabled;
    save();
    return reply.send({ ok: true });
  });

  // Delete command
  app.post('/commands/delete', async (req, reply) => {
    const body = req.body as { channel: string; commandId: string };
    const channel = body.channel.toLowerCase();
    const cmds = store.get(channel);
    if (!cmds) return reply.status(404).send({ error: 'No commands for this channel' });

    const idx = cmds.findIndex((c) => c.id === body.commandId);
    if (idx === -1) return reply.status(404).send({ error: 'Command not found' });

    cmds.splice(idx, 1);
    save();
    return reply.send({ ok: true });
  });

  // Update command
  app.put('/commands/update', async (req, reply) => {
    const body = req.body as {
      channel: string; commandId: string;
      response?: string; aliases?: string[]; cooldown?: number; modOnly?: boolean;
    };
    const channel = body.channel.toLowerCase();
    const cmds = store.get(channel);
    if (!cmds) return reply.status(404).send({ error: 'No commands for this channel' });

    const cmd = cmds.find((c) => c.id === body.commandId);
    if (!cmd) return reply.status(404).send({ error: 'Command not found' });

    if (body.response !== undefined) cmd.response = body.response;
    if (body.aliases !== undefined) cmd.aliases = body.aliases.map(a => a.trim().toLowerCase().replace(/^!/, ''));
    if (body.cooldown !== undefined) cmd.cooldown = body.cooldown;
    if (body.modOnly !== undefined) cmd.modOnly = body.modOnly;

    save();
    return reply.send({ ok: true });
  });

  // Export commands as JSON
  app.get('/commands/:channel/export', (req, reply) => {
    const { channel } = req.params as { channel: string };
    const cmds = getCommandsForChannel(channel);
    return reply.send({ channel, commands: cmds, exportedAt: new Date().toISOString() });
  });

  // Import commands from JSON
  app.post('/commands/:channel/import', async (req, reply) => {
    const { channel } = req.params as { channel: string };
    const body = req.body as { commands: Command[] };
    if (!Array.isArray(body.commands)) {
      return reply.status(400).send({ error: 'Missing commands array' });
    }

    const ch = channel.toLowerCase();
    if (!store.has(ch)) store.set(ch, []);

    const existing = store.get(ch)!;
    const names = new Set(existing.map((c) => c.name));
    let imported = 0;
    let skipped = 0;

    for (const cmd of body.commands) {
      if (!cmd.name || !cmd.response) continue;
      if (names.has(cmd.name)) { skipped++; continue; }
      existing.push({
        id: generateId(),
        name: cmd.name,
        response: cmd.response,
        enabled: cmd.enabled ?? true,
        aliases: cmd.aliases ?? [],
        cooldown: cmd.cooldown ?? 0,
        modOnly: cmd.modOnly ?? false,
        count: 0,
      });
      names.add(cmd.name);
      imported++;
    }

    save();
    return reply.send({ ok: true, imported, skipped });
  });
}
