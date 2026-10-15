import type { VibeDaemonEvent } from '@streamdaemon/shared';
import type { VibeDaemonAdapter } from '../index.js';
import { getState } from '../state.js';

export interface FortniteAdapterOptions {
  channel: string;
}

export function createFortniteAdapter(options: FortniteAdapterOptions): VibeDaemonAdapter {
  return {
    name: 'fortnite',
    async handleEvent(event: VibeDaemonEvent) {
      // Fortnite-specific state handling can be added here.
      // For now we just return the current state so triggers evaluate against the event itself.
      return getState(event.channel, event.gameId);
    },
    async reset(channel: string, gameId: string) {
      return getState(channel, gameId);
    },
  };
}
