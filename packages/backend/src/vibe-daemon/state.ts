import type { VibeDaemonState, VibeDaemonGameId } from '@streamdaemon/shared';

const states = new Map<string, VibeDaemonState>();

function getKey(channel: string, gameId: VibeDaemonGameId): string {
  return `${channel}:${gameId}`;
}

export function getState(channel: string, gameId: VibeDaemonGameId): VibeDaemonState {
  const key = getKey(channel, gameId);
  if (!states.has(key)) {
    states.set(key, {
      channel,
      gameId,
      kills: 0,
      deaths: 0,
      victories: 0,
      killStreak: 0,
      victoryStreak: 0,
      maxKillStreak: 0,
      maxVictoryStreak: 0,
      currentMatchKills: 0,
      currentMatchDeaths: 0,
      lastKillAt: null,
      lastDeathAt: null,
      lastVictoryAt: null,
    });
  }
  return states.get(key)!;
}

export function resetState(channel: string, gameId: VibeDaemonGameId): VibeDaemonState {
  const key = getKey(channel, gameId);
  const fresh: VibeDaemonState = {
    channel,
    gameId,
    kills: 0,
    deaths: 0,
    victories: 0,
    killStreak: 0,
    victoryStreak: 0,
    maxKillStreak: 0,
    maxVictoryStreak: 0,
    currentMatchKills: 0,
    currentMatchDeaths: 0,
    lastKillAt: null,
    lastDeathAt: null,
    lastVictoryAt: null,
  };
  states.set(key, fresh);
  return fresh;
}

export function resetMatchStats(channel: string, gameId: VibeDaemonGameId): VibeDaemonState {
  const state = getState(channel, gameId);
  state.currentMatchKills = 0;
  state.currentMatchDeaths = 0;
  state.killStreak = 0;
  return state;
}

export function recordKill(channel: string, gameId: VibeDaemonGameId): VibeDaemonState {
  const state = getState(channel, gameId);
  state.kills += 1;
  state.currentMatchKills += 1;
  state.killStreak += 1;
  state.deaths = 0; // reset death streak
  state.maxKillStreak = Math.max(state.maxKillStreak, state.killStreak);
  state.lastKillAt = Date.now();
  return state;
}

export function recordDeath(channel: string, gameId: VibeDaemonGameId): VibeDaemonState {
  const state = getState(channel, gameId);
  state.deaths += 1;
  state.currentMatchDeaths += 1;
  state.killStreak = 0;
  state.lastDeathAt = Date.now();
  return state;
}

export function recordVictory(channel: string, gameId: VibeDaemonGameId): VibeDaemonState {
  const state = getState(channel, gameId);
  state.victories += 1;
  state.victoryStreak += 1;
  state.maxVictoryStreak = Math.max(state.maxVictoryStreak, state.victoryStreak);
  state.lastVictoryAt = Date.now();
  return state;
}

export function recordDefeat(channel: string, gameId: VibeDaemonGameId): VibeDaemonState {
  const state = getState(channel, gameId);
  state.victoryStreak = 0;
  return state;
}

export function getAllStatesForChannel(channel: string): VibeDaemonState[] {
  return Array.from(states.values()).filter((s) => s.channel === channel);
}
