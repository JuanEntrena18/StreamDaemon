// ─── Avatar Action Types ───────────────────────────────────────────

export type AvatarAction =
  | 'idle'
  | 'run'
  | 'jump'
  | 'dance'
  | 'hit'
  | 'wave'
  | 'explode'
  | 'sleep';

// ─── Texture / Sprite Types ────────────────────────────────────────

export interface FrameDef {
  /** Row or column index in the spritesheet */
  index: number;
  /** Number of frames in the animation */
  count: number;
}

export interface SpriteThemeConfig {
  /** Path to the spritesheet image relative to /public */
  sheetPath: string;
  /** Width of a single frame in px */
  frameWidth: number;
  /** Height of a single frame in px */
  frameHeight: number;
  /** Frame definitions per action */
  frames: Partial<Record<AvatarAction, FrameDef>>;
  /** Scale multiplier */
  scale: number;
  /** Optional tint (hex number, e.g. 0xff0000) */
  tint?: number | null;
}

// ─── Avatar Sprite Config ──────────────────────────────────────────

export interface AvatarSpriteConfig {
  userId: string;
  username: string;
  displayName: string;
  theme: string;
  /** Starting x position */
  x: number;
  /** Starting y position */
  y: number;
}

// ─── Avatar Store Config ───────────────────────────────────────────

export interface AvatarConfig {
  enabled: boolean;
  theme: string;
  maxAvatars: number;
  commandsEnabled: boolean;
  commandCooldowns: Record<string, number>;
  eventActions: Record<string, boolean>;
  physicsEnabled: boolean;
  nametagsVisible: boolean;
  chatBubbles: boolean;
  animSpeedMultiplier: number;
}

export const DEFAULT_AVATAR_CONFIG: AvatarConfig = {
  enabled: false,
  theme: 'random',
  maxAvatars: 20,
  commandsEnabled: true,
  commandCooldowns: {
    '!dance': 5,
    '!wave': 3,
    '!jump': 2,
    '!explode': 10,
    '!sleep': 0,
  },
  eventActions: {
    chat: true,
    bits: true,
    subscription: true,
    raid: true,
    follow: true,
  },
  physicsEnabled: true,
  nametagsVisible: true,
  chatBubbles: true,
  animSpeedMultiplier: 1.0,
};

// ─── Event Handler Types ───────────────────────────────────────────

export interface AvatarEventPayload {
  userId: string;
  username: string;
  displayName: string;
  type: string;
  message?: string;
  amount?: number;
  tier?: string;
}

export interface AvatarActionHandler {
  cooldown?: number;
  priority?: 'normal' | 'high';
  target?: 'self' | 'all';
  action: AvatarAction;
}
