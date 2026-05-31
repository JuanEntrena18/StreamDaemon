export const TWITCH_SCOPES = [
  'chat:read',
  'chat:edit',
  'channel:read:redemptions',
  'channel:manage:predictions',
  'channel:read:predictions',
  'channel:manage:raids',
  'channel:manage:moderators',
] as const;

export const GAME_THEMES = [
  {
    id: 'subnautica2',
    name: 'Subnautica 2',
    css: {
      '--theme-primary': '#00d4ff',
      '--theme-secondary': '#0a4a6e',
      '--theme-bg': 'linear-gradient(180deg, #010d1a 0%, #001a33 100%)',
      '--theme-accent': '#00ff88',
      '--theme-font': "'Courier New', monospace",
      '--theme-border': '2px solid #00d4ff',
      '--theme-glow': '0 0 15px rgba(0, 212, 255, 0.5)',
    },
  },
  {
    id: 'poe2',
    name: 'Path of Exile 2',
    css: {
      '--theme-primary': '#c9a04a',
      '--theme-secondary': '#3d1f00',
      '--theme-bg': 'linear-gradient(180deg, #0d0800 0%, #1a0f00 100%)',
      '--theme-accent': '#ff4444',
      '--theme-font': "'Times New Roman', serif",
      '--theme-border': '2px solid #c9a04a',
      '--theme-glow': '0 0 10px rgba(201, 160, 74, 0.4)',
    },
  },
  {
    id: 'wow',
    name: 'World of Warcraft',
    css: {
      '--theme-primary': '#ffd100',
      '--theme-secondary': '#2d1b00',
      '--theme-bg': 'linear-gradient(180deg, #0a0a0f 0%, #1a1410 100%)',
      '--theme-accent': '#00b8ff',
      '--theme-font': "'Friz Quadrata', 'Times New Roman', serif",
      '--theme-border': '3px solid #ffd100',
      '--theme-glow': '0 0 12px rgba(255, 209, 0, 0.3)',
    },
  },
] as const;
