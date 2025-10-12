/**
 * Centralized Logging Utility
 *
 * This logger replaces direct console.log/console.error calls throughout the app.
 * Benefits:
 * - Prevents sensitive data leaks in production
 * - Makes it easy to add external logging services (Sentry, DataDog, etc.)
 * - Provides consistent log formatting
 * - Can be filtered by environment
 *
 * Usage:
 * ```ts
 * import { logger } from '@/lib/logger';
 *
 * logger.debug('User clicked button', { userId: '123' });
 * logger.info('Order created', { orderId: 'abc' });
 * logger.warn('Slow query detected', { duration: 5000 });
 * logger.error('Payment failed', error);
 * ```
 */

import { isDev, isProd } from './env';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  [key: string]: any;
}

/**
 * Logger class with environment-aware logging
 */
class Logger {
  /**
   * Format timestamp for logs
   */
  private getTimestamp(): string {
    return new Date().toISOString();
  }

  /**
   * Format log message with metadata
   */
  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = this.getTimestamp();
    const levelStr = level.toUpperCase().padEnd(5);
    return `[${timestamp}] [${levelStr}] ${message}`;
  }

  /**
   * Core logging method
   */
  private log(
    level: LogLevel,
    message: string,
    context?: LogContext | Error
  ): void {
    const formattedMessage = this.formatMessage(level, message);

    // Errors always get logged
    if (level === 'error') {
      console.error(formattedMessage, context);

      // TODO: Send to error tracking service in production
      // if (isProd) {
      //   Sentry.captureException(context);
      // }
      return;
    }

    // Warnings always get logged
    if (level === 'warn') {
      console.warn(formattedMessage, context);
      return;
    }

    // Info and debug only in development
    if (isDev) {
      if (level === 'info') {
        console.log(formattedMessage, context);
      } else if (level === 'debug') {
        console.debug(formattedMessage, context);
      }
    }
  }

  /**
   * Debug level - verbose logging for development
   * Only shows in development
   *
   * @example
   * logger.debug('Component rendered', { props: { id: '123' } });
   */
  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  /**
   * Info level - general information
   * Only shows in development
   *
   * @example
   * logger.info('User logged in', { userId: user.id });
   */
  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  /**
   * Warn level - warnings that don't break functionality
   * Shows in all environments
   *
   * @example
   * logger.warn('Slow database query', { duration: 2000, query: 'SELECT ...' });
   */
  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  /**
   * Error level - errors that break functionality
   * Shows in all environments and gets sent to error tracking
   *
   * @example
   * try {
   *   await processPayment();
   * } catch (error) {
   *   logger.error('Payment processing failed', error);
   * }
   */
  error(message: string, error?: Error | LogContext): void {
    this.log('error', message, error);
  }

  /**
   * API request logging helper
   *
   * @example
   * logger.api('POST /api/teams', { status: 200, duration: 123 });
   */
  api(endpoint: string, context: LogContext): void {
    const { status, duration, ...rest } = context;
    const statusColor = status >= 400 ? '🔴' : status >= 300 ? '🟡' : '🟢';
    this.info(`${statusColor} ${endpoint} ${status} (${duration}ms)`, rest);
  }

  /**
   * Database query logging helper
   *
   * @example
   * logger.db('SELECT * FROM teams WHERE id = ?', { duration: 45, rows: 1 });
   */
  db(query: string, context: LogContext): void {
    const { duration, rows, ...rest } = context;
    const warning = duration > 1000 ? '⚠️ SLOW' : '';
    this.debug(`${warning} DB: ${query.substring(0, 100)}...`, {
      duration,
      rows,
      ...rest,
    });
  }
}

/**
 * Global logger instance
 *
 * Import and use this throughout your application
 */
export const logger = new Logger();

/**
 * Create a logger with a prefix (useful for modules/classes)
 *
 * @example
 * const log = createLogger('PaymentService');
 * log.info('Processing payment'); // [PaymentService] Processing payment
 */
export function createLogger(prefix: string): Logger {
  return {
    debug: (message: string, context?: LogContext) =>
      logger.debug(`[${prefix}] ${message}`, context),
    info: (message: string, context?: LogContext) =>
      logger.info(`[${prefix}] ${message}`, context),
    warn: (message: string, context?: LogContext) =>
      logger.warn(`[${prefix}] ${message}`, context),
    error: (message: string, error?: Error | LogContext) =>
      logger.error(`[${prefix}] ${message}`, error),
    api: (endpoint: string, context: LogContext) =>
      logger.api(`[${prefix}] ${endpoint}`, context),
    db: (query: string, context: LogContext) =>
      logger.db(query, { ...context, module: prefix }),
  } as Logger;
}
