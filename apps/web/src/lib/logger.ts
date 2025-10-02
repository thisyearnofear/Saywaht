/**
 * PRODUCTION LOGGER SYSTEM
 * Consolidates all logging with environment-aware output
 * Following AGGRESSIVE CONSOLIDATION and CLEAN principles
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: any;
  timestamp: number;
  context?: string;
}

class ProductionLogger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private logs: LogEntry[] = [];

  /**
   * CLEAN: Single logging interface for all components
   */
  private log(level: LogLevel, message: string, data?: any, context?: string) {
    const entry: LogEntry = {
      level,
      message,
      data,
      timestamp: Date.now(),
      context
    };

    // AGGRESSIVE CONSOLIDATION: Only log in development or for errors
    if (this.isDevelopment || level === 'error') {
      const emoji = {
        debug: '🔍',
        info: 'ℹ️',
        warn: '⚠️',
        error: '❌'
      }[level];

      const prefix = context ? `${emoji} [${context}]` : emoji;
      
      if (level === 'error') {
        console.error(prefix, message, data || '');
      } else if (level === 'warn') {
        console.warn(prefix, message, data || '');
      } else {
        console.log(prefix, message, data || '');
      }
    }

    // PERFORMANT: Keep only last 100 logs to prevent memory issues
    this.logs.push(entry);
    if (this.logs.length > 100) {
      this.logs = this.logs.slice(-100);
    }
  }

  debug(message: string, data?: any, context?: string) {
    this.log('debug', message, data, context);
  }

  info(message: string, data?: any, context?: string) {
    this.log('info', message, data, context);
  }

  warn(message: string, data?: any, context?: string) {
    this.log('warn', message, data, context);
  }

  error(message: string, data?: any, context?: string) {
    this.log('error', message, data, context);
  }

  /**
   * MODULAR: Get logs for debugging
   */
  getLogs(level?: LogLevel): LogEntry[] {
    return level ? this.logs.filter(log => log.level === level) : this.logs;
  }

  /**
   * CLEAN: Clear logs
   */
  clear() {
    this.logs = [];
  }
}

// ORGANIZED: Export singleton instance
export const logger = new ProductionLogger();

// MODULAR: Export convenience functions
export const log = {
  debug: (message: string, data?: any, context?: string) => logger.debug(message, data, context),
  info: (message: string, data?: any, context?: string) => logger.info(message, data, context),
  warn: (message: string, data?: any, context?: string) => logger.warn(message, data, context),
  error: (message: string, data?: any, context?: string) => logger.error(message, data, context),
};