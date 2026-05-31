import 'dotenv/config';

export const config = {
  PORT: process.env.PORT ?? '3000',
  DATABASE_URL: process.env.DATABASE_URL ?? 'postgresql://overlay:overlay_dev@localhost:5432/twitch_overlay',
  TWITCH_CLIENT_ID: process.env.TWITCH_CLIENT_ID ?? '',
  TWITCH_CLIENT_SECRET: process.env.TWITCH_CLIENT_SECRET ?? '',
  TWITCH_REDIRECT_URI: process.env.TWITCH_REDIRECT_URI ?? 'http://localhost:3000/auth/callback',
  SESSION_SECRET: process.env.SESSION_SECRET ?? 'change-me-in-production',
  FRONTEND_URL: process.env.FRONTEND_URL ?? 'http://localhost:5173',
};
