// dotenv/config eliminado intencionalmente:
// En modo desktop (Electron), las variables de entorno las inyecta
// loadBackendEnv() en main.ts ANTES del import dinámico del backend.
// Usar dotenv/config aquí causaba que buscara .env en process.cwd()
// (directorio del instalador) en lugar de leer lo ya inyectado en process.env.

export const config = {
  PORT: process.env.PORT ?? '3000',
  DATABASE_URL: process.env.DATABASE_URL ?? 'postgresql://overlay:overlay_dev@localhost:5432/twitch_overlay',
  TWITCH_CLIENT_ID: process.env.TWITCH_CLIENT_ID ?? '',
  TWITCH_CLIENT_SECRET: process.env.TWITCH_CLIENT_SECRET ?? '',
  TWITCH_REDIRECT_URI: process.env.TWITCH_REDIRECT_URI ?? 'http://localhost:3000/auth/callback',
  FRONTEND_URL: process.env.FRONTEND_URL ?? 'http://localhost:5173',
};
