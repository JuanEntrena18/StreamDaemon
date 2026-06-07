import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Cargar .env desde el directorio del package (funciona tanto en dev como en producción)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

export const config = {
  PORT: process.env.PORT ?? '3000',
  DATABASE_URL: process.env.DATABASE_URL ?? 'postgresql://overlay:overlay_dev@localhost:5432/twitch_overlay',
  TWITCH_CLIENT_ID: process.env.TWITCH_CLIENT_ID ?? '',
  TWITCH_CLIENT_SECRET: process.env.TWITCH_CLIENT_SECRET ?? '',
  TWITCH_REDIRECT_URI: process.env.TWITCH_REDIRECT_URI ?? 'http://localhost:3000/auth/callback',
  FRONTEND_URL: process.env.FRONTEND_URL ?? 'http://localhost:5173',
};
