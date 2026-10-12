import electronLog from 'electron-log';

export const logger = electronLog;

logger.transports.file.level = (process.env.LOG_LEVEL as electronLog.LevelOption) ?? 'info';
logger.transports.console.level = (process.env.LOG_LEVEL as electronLog.LevelOption) ?? (process.env.NODE_ENV === 'development' ? 'debug' : 'info');

let redirected = false;

export function redirectConsoleToLogger(): void {
  if (redirected) return;
  redirected = true;

  console.log = (...args: unknown[]) => { logger.info(args.length === 1 ? args[0] : args); };
  console.info = (...args: unknown[]) => { logger.info(args.length === 1 ? args[0] : args); };
  console.warn = (...args: unknown[]) => { logger.warn(args.length === 1 ? args[0] : args); };
  console.error = (...args: unknown[]) => { logger.error(args.length === 1 ? args[0] : args); };
  console.debug = (...args: unknown[]) => { logger.debug(args.length === 1 ? args[0] : args); };

  logger.debug('Console output redirected to electron-log');
}
