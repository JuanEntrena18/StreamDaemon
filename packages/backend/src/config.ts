import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomBytes } from 'crypto';

// Cargar .env desde el directorio del package (funciona tanto en dev como en producción)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Auto-generar LOCAL_API_TOKEN si no está configurado (seguridad por defecto)
if (!process.env.LOCAL_API_TOKEN) {
  process.env.LOCAL_API_TOKEN = randomBytes(32).toString('hex');
  console.log(`[config] LOCAL_API_TOKEN auto-generated: ${process.env.LOCAL_API_TOKEN}`);
}

export const config = {
  PORT: process.env.PORT ?? '3000',
  DATABASE_URL: process.env.DATABASE_URL ?? 'file:./data/streamforger.db',
  TWITCH_CLIENT_ID: process.env.TWITCH_CLIENT_ID ?? '',
  TWITCH_CLIENT_SECRET: process.env.TWITCH_CLIENT_SECRET ?? '',
  FORTNITE_API_KEY: process.env.FORTNITE_API_KEY ?? '',
  LOCAL_API_TOKEN: process.env.LOCAL_API_TOKEN,
};
