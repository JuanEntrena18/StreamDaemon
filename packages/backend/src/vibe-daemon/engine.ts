import type {
  VibeDaemonTrigger,
  VibeDaemonEvent,
  VibeDaemonActivation,
  VibeDaemonState,
  VibeDaemonGameId,
} from '@streamdaemon/shared';

const lastActivationByTrigger = new Map<string, number>();

function isCooldownExpired(trigger: VibeDaemonTrigger): boolean {
  const cooldown = trigger.cooldownMs ?? 0;
  if (cooldown <= 0) return true;
  const last = lastActivationByTrigger.get(trigger.id) ?? 0;
  return Date.now() - last >= cooldown;
}

function markActivated(trigger: VibeDaemonTrigger): void {
  lastActivationByTrigger.set(trigger.id, Date.now());
}

function periodMatches(
  trigger: VibeDaemonTrigger,
  state: VibeDaemonState,
  event: VibeDaemonEvent,
): number {
  const period = trigger.condition.period ?? 'session';

  switch (period) {
    case 'session':
      // Session totals
      switch (event.eventType) {
        case 'kill':
          return state.kills;
        case 'death':
          return state.deaths;
        case 'victory':
          return state.victories;
        case 'kill_streak':
          return state.killStreak;
        case 'victory_streak':
          return state.victoryStreak;
        default:
          return event.value ?? 0;
      }
    case 'match':
    case 'round':
      // Current match/round totals
      switch (event.eventType) {
        case 'kill':
          return state.currentMatchKills;
        case 'death':
          return state.currentMatchDeaths;
        case 'kill_streak':
          return state.killStreak;
        default:
          return event.value ?? 0;
      }
    case 'time_window': {
      const windowSeconds = trigger.condition.timeWindowSeconds ?? 60;
      const now = Date.now();
      let lastEventAt: number | null = null;
      switch (event.eventType) {
        case 'kill':
          lastEventAt = state.lastKillAt;
          break;
        case 'death':
          lastEventAt = state.lastDeathAt;
          break;
        case 'victory':
          lastEventAt = state.lastVictoryAt;
          break;
      }
      if (!lastEventAt) return 0;
      return now - lastEventAt <= windowSeconds * 1000 ? event.value ?? 1 : 0;
    }
    default:
      return event.value ?? 0;
  }
}

export function evaluateTrigger(
  trigger: VibeDaemonTrigger,
  state: VibeDaemonState,
  event: VibeDaemonEvent,
): boolean {
  if (!trigger.enabled) return false;
  if (!isCooldownExpired(trigger)) return false;

  // Global triggers apply to all games; game-specific triggers must match the event's game.
  if (trigger.gameId !== 'global' && trigger.gameId !== event.gameId) return false;

  // For streak events the event type must match exactly.
  if (trigger.eventType !== event.eventType) {
    return false;
  }

  const condition = trigger.condition;
  const value = periodMatches(trigger, state, event);

  switch (condition.type) {
    case 'count':
      return value >= (condition.count ?? 1);
    case 'threshold':
      return value >= (condition.threshold ?? 1);
    case 'state':
      // State events (low_shield, storm_shrinking, ...) carry their own
      // hysteresis and cooldown in the source (CV detector / integrations):
      // a matching event means the state holds.
      return true;
    default:
      return false;
  }
}

export function buildActivation(
  trigger: VibeDaemonTrigger,
  channel: string,
  event: VibeDaemonEvent,
): VibeDaemonActivation {
  markActivated(trigger);
  return {
    triggerId: trigger.id,
    triggerName: trigger.name,
    eventType: event.eventType,
    gameId: trigger.gameId,
    action: trigger.action,
    channel,
    timestamp: Date.now(),
  };
}

export function normalizeGameId(gameName: string): VibeDaemonGameId {
  const normalized = gameName.toLowerCase().trim();
  if (normalized.includes('fortnite')) return 'fortnite';
  return normalized || 'global';
}
