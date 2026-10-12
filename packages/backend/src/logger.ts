import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isDev ? 'debug' : 'info'),
  transport: isDev
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
