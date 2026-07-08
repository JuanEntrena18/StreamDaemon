import { useEffect } from 'react';

interface ThemeVars {
  '--theme-primary': string;
  '--theme-secondary': string;
  '--theme-bg': string;
  '--theme-accent': string;
  '--theme-font': string;
  '--theme-border': string;
  '--theme-glow': string;
}

const themes: Record<string, ThemeVars> = {
  subnautica2: {
    '--theme-primary': '#00d4ff',
    '--theme-secondary': '#0a4a6e',
    '--theme-bg': 'linear-gradient(180deg, #010d1a 0%, #001a33 100%)',
    '--theme-accent': '#00ff88',
    '--theme-font': "'Courier New', monospace",
    '--theme-border': '2px solid #00d4ff',
    '--theme-glow': '0 0 15px rgba(0, 212, 255, 0.5)',
  },
  poe2: {
    '--theme-primary': '#c9a04a',
    '--theme-secondary': '#3d1f00',
    '--theme-bg': 'linear-gradient(180deg, #0d0800 0%, #1a0f00 100%)',
    '--theme-accent': '#ff4444',
    '--theme-font': "'Times New Roman', serif",
    '--theme-border': '2px solid #c9a04a',
    '--theme-glow': '0 0 10px rgba(201, 160, 74, 0.4)',
  },
  wow: {
    '--theme-primary': '#ffd100',
    '--theme-secondary': '#2d1b00',
    '--theme-bg': 'linear-gradient(180deg, #0a0a0f 0%, #1a1410 100%)',
    '--theme-accent': '#00b8ff',
    '--theme-font': "'Friz Quadrata', 'Times New Roman', serif",
    '--theme-border': '3px solid #ffd100',
    '--theme-glow': '0 0 12px rgba(255, 209, 0, 0.3)',
  },
  alliance: {
    '--theme-primary': '#d4af37',
    '--theme-secondary': '#1a3a8a',
    '--theme-bg': 'linear-gradient(180deg, #0b0e1a 0%, #141832 50%, #0b0e1a 100%)',
    '--theme-accent': '#4a7cff',
    '--theme-font': "'Friz Quadrata', 'Times New Roman', serif",
    '--theme-border': '2px solid #d4af37',
    '--theme-glow': '0 0 15px rgba(212, 175, 55, 0.25)',
  },
  extraction: {
    '--theme-primary': '#ff6b00',
    '--theme-secondary': '#331500',
    '--theme-bg': 'linear-gradient(180deg, #0f0a05 0%, #1a1005 100%)',
    '--theme-accent': '#00f2fe',
    '--theme-font': "'Courier New', monospace",
    '--theme-border': '2px solid #ff6b00',
    '--theme-glow': '0 0 15px rgba(255, 107, 0, 0.3)',
  },
};

export function useTheme(themeId?: string | null) {
  useEffect(() => {
    const vars = themeId ? themes[themeId] : undefined;
    const root = document.documentElement;

    if (vars) {
      Object.entries(vars).forEach(([key, val]) => {
        root.style.setProperty(key, val);
      });
    }
  }, [themeId]);
}
