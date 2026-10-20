import { PixiAvatarRenderer } from './PixiAvatarRenderer.js';
import { PngAvatarRenderer } from './PngAvatarRenderer.js';
import type { StreamAvatarConfig } from '../types.js';

const BUILTIN_AVATARS = ['default', 'cyber', 'pixel', 'future', 'dark'];

export interface AvatarRenderer {
  init(): Promise<void>;
  destroy(): void;
  updateConfig(config: StreamAvatarConfig): void;
  setViseme(viseme: import('../types.js').StreamAvatarViseme, volume: number): void;
}

export function createAvatarRenderer(
  canvas: HTMLCanvasElement,
  config: StreamAvatarConfig,
): AvatarRenderer {
  if (BUILTIN_AVATARS.includes(config.avatarId)) {
    return new PixiAvatarRenderer(canvas, config);
  }
  return new PngAvatarRenderer(canvas, config, config.avatarId);
}
