import { AudioAnalyzer } from './AudioAnalyzer.js';
import { mapAudioToViseme } from './VisemeMapper.js';
import type { StreamAvatarConfig, StreamAvatarViseme } from '../types.js';

export interface LipSyncState {
  viseme: StreamAvatarViseme;
  volume: number;
  isSpeaking: boolean;
}

export class LipSyncEngine {
  private analyzer: AudioAnalyzer;
  private rafId: number | null = null;
  private listeners: Set<(state: LipSyncState) => void> = new Set();
  private config: Pick<StreamAvatarConfig, 'micSensitivity' | 'smoothing' | 'noiseGate'>;
  private currentState: LipSyncState = { viseme: 'closed', volume: 0, isSpeaking: false };

  constructor(config: StreamAvatarConfig) {
    this.analyzer = new AudioAnalyzer();
    this.config = config;
  }

  async start(deviceId: string): Promise<void> {
    await this.analyzer.start(deviceId);
    this.tick();
  }

  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.analyzer.stop();
    this.currentState = { viseme: 'closed', volume: 0, isSpeaking: false };
    this.emit(this.currentState);
  }

  updateConfig(config: StreamAvatarConfig): void {
    this.config = {
      micSensitivity: config.micSensitivity,
      smoothing: config.smoothing,
      noiseGate: config.noiseGate,
    };
  }

  onFrame(listener: (state: LipSyncState) => void): () => void {
    this.listeners.add(listener);
    // Emit current state immediately so the renderer shows something.
    listener(this.currentState);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private tick = (): void => {
    const audio = this.analyzer.analyze();

    if (audio) {
      const frame = mapAudioToViseme(audio, {
        sensitivity: this.config.micSensitivity,
        noiseGate: this.config.noiseGate,
      });

      const smoothing = this.config.smoothing;
      const volume = this.currentState.volume * smoothing + frame.volume * (1 - smoothing);

      this.currentState = {
        viseme: frame.viseme,
        volume,
        isSpeaking: frame.isSpeaking && volume > this.config.noiseGate,
      };

      this.emit(this.currentState);
    }

    this.rafId = requestAnimationFrame(this.tick);
  };

  private emit(state: LipSyncState): void {
    for (const listener of this.listeners) {
      listener(state);
    }
  }
}
