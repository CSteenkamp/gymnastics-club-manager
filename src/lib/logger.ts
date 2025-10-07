/**
 * Production-ready logging utility
 * Replace with Winston, Pino, or your preferred logging library in production
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug'

interface LogContext {
  [key: string]: any
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development'
  private isProduction = process.env.NODE_ENV === 'production'

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString()
    const contextStr = context ? ` ${JSON.stringify(context)}` : ''
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`
  }

  info(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.log(this.formatMessage('info', message, context))
    } else if (this.isProduction) {
      // In production, send to logging service (e.g., CloudWatch, Datadog, Sentry)
      console.log(JSON.stringify({ level: 'info', message, context, timestamp: new Date().toISOString() }))
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.warn(this.formatMessage('warn', message, context))
    } else if (this.isProduction) {
      console.warn(JSON.stringify({ level: 'warn', message, context, timestamp: new Date().toISOString() }))
    }
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorContext = {
      ...context,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name,
      } : error,
    }

    if (this.isDevelopment) {
      console.error(this.formatMessage('error', message, errorContext))
      if (error instanceof Error) {
        console.error(error)
      }
    } else if (this.isProduction) {
      console.error(JSON.stringify({ level: 'error', message, ...errorContext, timestamp: new Date().toISOString() }))

      // TODO: Send to error tracking service (Sentry, Rollbar, etc.)
      // if (error instanceof Error) {
      //   Sentry.captureException(error, { extra: context })
      // }
    }
  }

  debug(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.debug(this.formatMessage('debug', message, context))
    }
    // Debug logs are typically not sent in production
  }

  /**
   * Log HTTP request
   */
  request(method: string, path: string, context?: LogContext): void {
    this.info(`${method} ${path}`, context)
  }

  /**
   * Log HTTP response
   */
  response(method: string, path: string, status: number, duration: number, context?: LogContext): void {
    const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info'
    this[level](`${method} ${path} ${status} - ${duration}ms`, context)
  }
}

// Export singleton instance
export const logger = new Logger()

/**
 * Utility to create request-scoped logger with context
 */
export function createRequestLogger(requestId: string, userId?: string, clubId?: string) {
  return {
    info: (message: string, context?: LogContext) =>
      logger.info(message, { requestId, userId, clubId, ...context }),

    warn: (message: string, context?: LogContext) =>
      logger.warn(message, { requestId, userId, clubId, ...context }),

    error: (message: string, error?: Error | unknown, context?: LogContext) =>
      logger.error(message, error, { requestId, userId, clubId, ...context }),

    debug: (message: string, context?: LogContext) =>
      logger.debug(message, { requestId, userId, clubId, ...context }),
  }
}
