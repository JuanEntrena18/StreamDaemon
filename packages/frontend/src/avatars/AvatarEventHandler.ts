import type { AvatarAction, AvatarEventPayload, AvatarActionHandler } from './types';

/**
 * Mapping from Twitch event types to avatar actions.
 * Each handler specifies the animation to play, optional cooldown, and target scope.
 */
const EVENT_ACTION_MAP: Record<string, AvatarActionHandler> = {
  chat: {
    cooldown: 2000,
    action: 'dance',
    target: 'self',
  },
  bits: {
    priority: 'high',
    action: 'hit',
    target: 'self',
  },
  subscription: {
    action: 'jump',
    target: 'self',
  },
  raid: {
    action: 'wave',
    target: 'all',
  },
  follow: {
    action: 'wave',
    target: 'self',
  },
};

/**
 * Command-to-action mapping (chat commands like !dance, !wave, etc.)
 */
const COMMAND_ACTION_MAP: Record<string, AvatarAction> = {
  '!dance':   'dance',
  '!wave':    'wave',
  '!jump':    'jump',
  '!explode': 'explode',
  '!sleep':   'sleep',
};

// Cooldown tracking: userId → commandName → last trigger timestamp
const cooldowns = new Map<string, Map<string, number>>();

/**
 * Determines the avatar action to perform for a given Twitch event.
 * Returns null if the event should not trigger an action (cooldown, disabled, etc.).
 */
export function getActionForEvent(
  event: AvatarEventPayload,
  enabledEvents: Record<string, boolean>,
): AvatarActionHandler | null {
  // Check if the event type is enabled
  if (!enabledEvents[event.type]) return null;

  const handler = EVENT_ACTION_MAP[event.type];
  if (!handler) return null;

  // Cooldown check
  if (handler.cooldown) {
    const userCooldowns = cooldowns.get(event.userId);
    const lastTrigger = userCooldowns?.get(event.type) ?? 0;
    const now = Date.now();
    if (now - lastTrigger < handler.cooldown) return null;

    // Update cooldown
    if (!cooldowns.has(event.userId)) cooldowns.set(event.userId, new Map());
    cooldowns.get(event.userId)!.set(event.type, now);
  }

  return handler;
}

/**
 * Determines the avatar action for a chat command (!dance, !wave, etc.).
 * Returns the action string or null if not a valid command or on cooldown.
 */
export function getActionForCommand(
  userId: string,
  message: string,
  commandCooldowns: Record<string, number>,
): AvatarAction | null {
  const cmd = message.trim().split(' ')[0]?.toLowerCase();
  if (!cmd) return null;

  const action = COMMAND_ACTION_MAP[cmd];
  if (!action) return null;

  // Check cooldown
  const cooldownSeconds = commandCooldowns[cmd] ?? 0;
  if (cooldownSeconds > 0) {
    const userCooldowns = cooldowns.get(userId);
    const lastTrigger = userCooldowns?.get(cmd) ?? 0;
    const now = Date.now();
    if (now - lastTrigger < cooldownSeconds * 1000) return null;

    if (!cooldowns.has(userId)) cooldowns.set(userId, new Map());
    cooldowns.get(userId)!.set(cmd, now);
  }

  return action;
}

/**
 * Get force vector to apply for bits events.
 */
export function getBitsForce(amount: number): { x: number; y: number } {
  const strength = Math.min(amount / 100, 1) * 0.08;
  return {
    x: (Math.random() - 0.5) * strength * 2,
    y: -strength,
  };
}

/**
 * Clear all cooldown data (e.g. on disconnect).
 */
export function clearCooldowns() {
  cooldowns.clear();
}
