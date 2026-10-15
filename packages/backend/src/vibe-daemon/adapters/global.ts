import type { VibeDaemonEvent } from '@streamdaemon/shared';
import type { VibeDaemonAdapter } from '../index.js';
import { recordKill, recordDeath, recordVictory, getState, resetState } from '../state.js';

export interface GlobalAdapterOptions {
  channel: string;
  gameId: string;
}

export function createGlobalAdapter(options: GlobalAdapterOptions): VibeDaemonAdapter {
  return {
    name: 'global',
    async handleEvent(event: VibeDaemonEvent) {
      const { channel, gameId, eventType } = event;

      switch (eventType) {
        case 'kill':
          recordKill(channel, gameId);
          break;
        case 'death':
          recordDeath(channel, gameId);
          break;
        case 'victory':
          recordVictory(channel, gameId);
          break;
        case 'manual':
          // Manual events do not mutate state; they are evaluated directly.
          break;
        default:
          break;
      }

      return getState(channel, gameId);
    },
    async reset(channel: string, gameId: string) {
      return resetState(channel, gameId);
    },
  };
}
