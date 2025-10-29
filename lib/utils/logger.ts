/**
 * Structured logging utility for the Tracker application
 * Provides consistent logging with proper levels and context
 */

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
}

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: string;
  error?: Error;
  metadata?: any;
  timestamp: string;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  private formatLog(entry: LogEntry): string {
    const { level, message, context, timestamp } = entry;
    const contextStr = context ? `[${context}]` : '';
    return `${timestamp} ${level.toUpperCase()} ${contextStr} ${message}`;
  }

  private createEntry(
    level: LogLevel,
    message: string,
    context?: string,
    error?: Error,
    metadata?: any,
  ): LogEntry {
    return {
      level,
      message,
      context,
      error,
      metadata,
      timestamp: new Date().toISOString(),
    };
  }

  private shouldLog(level: LogLevel): boolean {
    // In production, only log errors and warnings
    if (!this.isDevelopment) {
      return level === LogLevel.ERROR || level === LogLevel.WARN;
    }
    // In development, log everything
    return true;
  }

  private logToConsole(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) return;

    const formatted = this.formatLog(entry);

    switch (entry.level) {
      case LogLevel.ERROR:
        console.error(formatted, entry.error || '', entry.metadata || '');
        break;
      case LogLevel.WARN:
        console.warn(formatted, entry.metadata || '');
        break;
      case LogLevel.INFO:
        console.info(formatted, entry.metadata || '');
        break;
      case LogLevel.DEBUG:
        console.log(formatted, entry.metadata || '');
        break;
    }
  }

  /**
   * Log an error - always shown in production
   */
  error(message: string, context?: string, error?: Error, metadata?: any): void {
    const entry = this.createEntry(LogLevel.ERROR, message, context, error, metadata);
    this.logToConsole(entry);

    // In production, could send to error tracking service
    if (!this.isDevelopment) {
      this.sendToErrorTracking(entry);
    }
  }

  /**
   * Log a warning - always shown in production
   */
  warn(message: string, context?: string, metadata?: any): void {
    const entry = this.createEntry(LogLevel.WARN, message, context, undefined, metadata);
    this.logToConsole(entry);
  }

  /**
   * Log informational message - development only
   */
  info(message: string, context?: string, metadata?: any): void {
    const entry = this.createEntry(LogLevel.INFO, message, context, undefined, metadata);
    this.logToConsole(entry);
  }

  /**
   * Log debug information - development only
   */
  debug(message: string, context?: string, metadata?: any): void {
    const entry = this.createEntry(LogLevel.DEBUG, message, context, undefined, metadata);
    this.logToConsole(entry);
  }

  /**
   * Send error to Sentry error tracking service
   * Only sends in production when Sentry is configured
   */
  private sendToErrorTracking(entry: LogEntry): void {
    // Dynamically import Sentry to avoid bundling in non-browser environments
    // that don't need error tracking
    if (typeof window !== 'undefined') {
      // Client-side error tracking
      import('@sentry/nextjs')
        .then((Sentry) => {
          if (entry.error) {
            // Capture exception with context
            Sentry.captureException(entry.error, {
              level: entry.level === LogLevel.ERROR ? 'error' : 'warning',
              tags: {
                context: entry.context || 'unknown',
              },
              extra: {
                message: entry.message,
                metadata: entry.metadata,
                timestamp: entry.timestamp,
              },
            });
          } else {
            // Capture message without exception
            Sentry.captureMessage(entry.message, {
              level: entry.level === LogLevel.ERROR ? 'error' : 'warning',
              tags: {
                context: entry.context || 'unknown',
              },
              extra: {
                metadata: entry.metadata,
                timestamp: entry.timestamp,
              },
            });
          }
        })
        .catch((err) => {
          console.error('[LOGGER] Failed to send to Sentry:', err);
        });
    } else {
      // Server-side error tracking
      import('@sentry/nextjs')
        .then((Sentry) => {
          if (entry.error) {
            Sentry.captureException(entry.error, {
              level: entry.level === LogLevel.ERROR ? 'error' : 'warning',
              tags: {
                context: entry.context || 'unknown',
              },
              extra: {
                message: entry.message,
                metadata: entry.metadata,
                timestamp: entry.timestamp,
              },
            });
          } else {
            Sentry.captureMessage(entry.message, {
              level: entry.level === LogLevel.ERROR ? 'error' : 'warning',
              tags: {
                context: entry.context || 'unknown',
              },
              extra: {
                metadata: entry.metadata,
                timestamp: entry.timestamp,
              },
            });
          }
        })
        .catch((err) => {
          console.error('[LOGGER] Failed to send to Sentry:', err);
        });
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Convenience functions for common patterns
export const logError = (message: string, context: string, error?: Error) =>
  logger.error(message, context, error);

export const logNetworkError = (operation: string, error: Error) =>
  logger.error(`Network operation failed: ${operation}`, 'NetworkUtils', error);

export const logRetry = (operation: string, attempt: number, maxAttempts: number) =>
  logger.warn(`Retrying ${operation} (${attempt}/${maxAttempts})`, 'NetworkUtils');

export const logUserAction = (action: string, context: string, metadata?: any) =>
  logger.info(`User action: ${action}`, context, metadata);

// Development-only logging
export const logDebug = (message: string, context: string, data?: any) =>
  logger.debug(message, context, data);
