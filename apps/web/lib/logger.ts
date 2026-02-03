/**
 * Structured Logging Module
 *
 * Provides consistent, structured logging across the application.
 * 
 * Features:
 * - Log levels (debug, info, warn, error)
 * - Structured JSON output in production
 * - Pretty output in development
 * - Context injection (requestId, userId, etc.)
 * - Performance timing
 *
 * Usage:
 * ```ts
 * import { logger } from '@/lib/logger';
 * 
 * logger.info('Order created', { orderId: '123', userId: 'abc' });
 * logger.error('Payment failed', { error: err, paymentIntentId: 'pi_...' });
 * ```
 *
 * For production, consider replacing with pino or winston for:
 * - Better performance
 * - Log rotation
 * - External transport (Datadog, Logtail, etc.)
 */

// ============================================
// Types
// ============================================

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

// ============================================
// Configuration
// ============================================

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const CURRENT_LEVEL = (process.env.LOG_LEVEL as LogLevel) || "info";
const IS_DEVELOPMENT = process.env.NODE_ENV === "development";

// ============================================
// Formatters
// ============================================

function formatError(error: unknown): LogEntry["error"] | undefined {
  if (!error) return undefined;

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: IS_DEVELOPMENT ? error.stack : undefined,
    };
  }

  return {
    name: "UnknownError",
    message: String(error),
  };
}

function formatForDevelopment(entry: LogEntry): string {
  const levelColors: Record<LogLevel, string> = {
    debug: "\x1b[36m", // Cyan
    info: "\x1b[32m",  // Green
    warn: "\x1b[33m",  // Yellow
    error: "\x1b[31m", // Red
  };
  const reset = "\x1b[0m";
  const color = levelColors[entry.level];

  let output = `${color}[${entry.level.toUpperCase()}]${reset} ${entry.message}`;

  if (entry.context && Object.keys(entry.context).length > 0) {
    output += ` ${JSON.stringify(entry.context)}`;
  }

  if (entry.error) {
    output += `\n  Error: ${entry.error.message}`;
    if (entry.error.stack) {
      output += `\n${entry.error.stack}`;
    }
  }

  return output;
}

function formatForProduction(entry: LogEntry): string {
  return JSON.stringify(entry);
}

// ============================================
// Logger Class
// ============================================

class Logger {
  private context: LogContext = {};

  /**
   * Create a child logger with additional context.
   * Useful for adding requestId, userId, etc.
   */
  child(context: LogContext): Logger {
    const childLogger = new Logger();
    childLogger.context = { ...this.context, ...context };
    return childLogger;
  }

  private log(level: LogLevel, message: string, context?: LogContext): void {
    // Skip if below current level
    if (LOG_LEVELS[level] < LOG_LEVELS[CURRENT_LEVEL]) {
      return;
    }

    // Extract error from context if present
    let error: unknown;
    const cleanContext = { ...this.context, ...context };
    if (cleanContext.error) {
      error = cleanContext.error;
      delete cleanContext.error;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: Object.keys(cleanContext).length > 0 ? cleanContext : undefined,
      error: formatError(error),
    };

    const formatted = IS_DEVELOPMENT
      ? formatForDevelopment(entry)
      : formatForProduction(entry);

    // Use appropriate console method
    switch (level) {
      case "debug":
        console.debug(formatted);
        break;
      case "info":
        console.info(formatted);
        break;
      case "warn":
        console.warn(formatted);
        break;
      case "error":
        console.error(formatted);
        break;
    }
  }

  debug(message: string, context?: LogContext): void {
    this.log("debug", message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log("info", message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log("warn", message, context);
  }

  error(message: string, context?: LogContext): void {
    this.log("error", message, context);
  }

  /**
   * Time an operation and log the duration.
   * 
   * Usage:
   * ```ts
   * const timer = logger.startTimer('Database query');
   * await db.query(...);
   * timer.done({ rows: results.length });
   * ```
   */
  startTimer(operation: string) {
    const start = performance.now();
    return {
      done: (context?: LogContext) => {
        const duration = Math.round(performance.now() - start);
        this.info(`${operation} completed`, { ...context, durationMs: duration });
      },
    };
  }
}

// ============================================
// Export Singleton
// ============================================

export const logger = new Logger();

// ============================================
// Specialized Loggers
// ============================================

export const paymentLogger = logger.child({ module: "payment" });
export const orderLogger = logger.child({ module: "order" });
export const authLogger = logger.child({ module: "auth" });
export const apiLogger = logger.child({ module: "api" });


