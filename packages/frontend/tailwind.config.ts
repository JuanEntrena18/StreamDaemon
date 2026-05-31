import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './overlay.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config;
