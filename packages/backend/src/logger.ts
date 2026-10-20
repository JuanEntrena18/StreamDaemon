import pino from 'pino';
import { createRequire } from 'module';

// Electron empaquetado no define NODE_ENV, y pino-pretty (devDependency) no se incluye
// en el instalador. Además, los transports de pino usan worker threads que fallan dentro de asar.
const isPackagedElectron =
  !!process.versions.electron &&
  !(process as NodeJS.Process & { defaultApp?: boolean }).defaultApp &&
  !process.env.ELECTRON_DEV;
const isDev = process.env.NODE_ENV !== 'production' && !isPackagedElectron;

function canUsePretty(): boolean {
  try {
    createRequire(import.meta.url).resolve('pino-pretty');
    return true;
  } catch {
    return false;
  }
}

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isDev ? 'debug' : 'info'),
  transport: isDev && canUsePretty()
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
  base: {
    service: 'streamdaemon-backend',
  },
});

let redirected = false;

export function redirectConsoleToLogger(): void {
  if (redirected) return;
  redirected = true;

  console.log = (...args: unknown[]) => { logger.info(args.length === 1 ? args[0] : args); };
  console.info = (...args: unknown[]) => { logger.info(args.length === 1 ? args[0] : args); };
  console.warn = (...args: unknown[]) => { logger.warn(args.length === 1 ? args[0] : args); };
  console.error = (...args: unknown[]) => { logger.error(args.length === 1 ? args[0] : args); };
  console.debug = (...args: unknown[]) => { logger.debug(args.length === 1 ? args[0] : args); };

  logger.debug('Console output redirected to structured logger');
}
