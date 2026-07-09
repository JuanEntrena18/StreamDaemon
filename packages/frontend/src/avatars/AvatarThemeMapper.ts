import type { SpriteThemeConfig } from './types';

/**
 * Registry of available sprite themes.
 * Each theme maps to a spritesheet in /public/sprites/<theme>/
 */
const THEME_REGISTRY: Record<string, SpriteThemeConfig> = {
  default: {
    sheetPath: '/sprites/default/spritesheet.png',
    frameWidth: 64,
    frameHeight: 80,
    frames: {
      idle:  { index: 0, count: 4 },
      run:   { index: 1, count: 6 },
      jump:  { index: 2, count: 3 },
      dance: { index: 3, count: 8 },
      hit:   { index: 4, count: 3 },
      wave:  { index: 5, count: 4 },
    },
    scale: 1.6,
    tint: null,
  },
  cyberpunk: {
    sheetPath: '/sprites/cyberpunk/spritesheet.png',
    frameWidth: 80,
    frameHeight: 88,
    frames: {
      idle:  { index: 0, count: 4 },
      run:   { index: 1, count: 6 },
      jump:  { index: 2, count: 3 },
      dance: { index: 3, count: 6 },
      hit:   { index: 4, count: 3 },
      wave:  { index: 5, count: 4 },
    },
    scale: 1.5,
    tint: null,
  },
  '8bits': {
    sheetPath: '/sprites/8bits/spritesheet.png',
    frameWidth: 64,
    frameHeight: 72,
    frames: {
      idle:  { index: 0, count: 4 },
      run:   { index: 1, count: 6 },
      jump:  { index: 2, count: 3 },
      dance: { index: 3, count: 8 },
      hit:   { index: 4, count: 3 },
      wave:  { index: 5, count: 4 },
    },
    scale: 1.8,
    tint: null,
  },
  horde: {
    sheetPath: '/sprites/horde/spritesheet.png',
    frameWidth: 80,
    frameHeight: 88,
    frames: {
      idle:  { index: 0, count: 4 },
      run:   { index: 1, count: 6 },
      jump:  { index: 2, count: 3 },
      dance: { index: 3, count: 8 },
      hit:   { index: 4, count: 3 },
      wave:  { index: 5, count: 4 },
    },
    scale: 1.5,
    tint: null,
  },
};

/**
 * Get the sprite theme config for a given theme ID.
 * Falls back to 'default' if the theme is not found.
 */
export function getThemeConfig(themeId: string): SpriteThemeConfig {
  return THEME_REGISTRY[themeId] ?? THEME_REGISTRY['default'];
}

/**
 * Get the list of available theme IDs.
 */
export function getAvailableThemes(): string[] {
  return Object.keys(THEME_REGISTRY);
}

/**
 * Generates a simple colour tint based on the user ID string,
 * so each avatar gets a unique-ish colour.
 */
export function getUserTint(userId: string): number {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash + userId.charCodeAt(i)) | 0;
  }
  // Map to HSL-like hue and convert to hex
  const hue = Math.abs(hash) % 360;
  return hslToHex(hue, 70, 60);
}

function hslToHex(h: number, s: number, l: number): number {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color);
  };
  return (f(0) << 16) | (f(8) << 8) | f(4);
}
