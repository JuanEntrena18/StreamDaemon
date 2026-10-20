import type { StreamAvatarConfig, StreamAvatarViseme } from '@streamdaemon/shared';

export interface AvatarDefinition {
  id: string;
  name: string;
  description: string;
  // If true, the renderer builds the avatar from SVG primitives.
  // If false, it loads PNG sprites from the assets folder.
  vectorBased: boolean;
  // Vector-only: color palette overrides.
  colors?: {
    skin?: string;
    hair?: string;
    eyes?: string;
    mouth?: string;
    shirt?: string;
  };
}

export interface LipSyncFrame {
  viseme: StreamAvatarViseme;
  volume: number;
  isSpeaking: boolean;
}

export interface AudioAnalysis {
  rms: number;
  lowFreq: number;
  midFreq: number;
  highFreq: number;
  veryHighFreq: number;
}

export { type StreamAvatarConfig, type StreamAvatarViseme };
