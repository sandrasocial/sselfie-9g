import "server-only"

/**
 * Structured logging utility
 * Replaces console.log/error with structured logging
 * 
 * In production, logs are sent to Sentry
 * In development, logs are printed to console with formatting
 */

type LogLevel = "debug" | "info" | "warn" | "error"

interface LogContext {
  [key: string]: unknown
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === "development"
  private isProduction = process.env.NODE_ENV === "production"

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString()
    const contextStr = context ? ` ${JSON.stringify(context)}` : ""
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`
  }

  private log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
    const formattedMessage = this.formatMessage(level, message, context)

    if (this.isDevelopment) {
      // In development, use console with colors
      switch (level) {
        case "debug":
          console.debug(formattedMessage)
          break
        case "info":
          console.log(formattedMessage)
          break
        case "warn":
          console.warn(formattedMessage)
          break
        case "error":
          console.error(formattedMessage, error || "")
          break
      }
    } else {
      // In production, structured JSON logging
      const logEntry = {
        timestamp: new Date().toISOString(),
        level,
        message,
        ...context,
        ...(error && {
          error: {
            name: error.name,
            message: error.message,
            stack: error.stack,
          },
        }),
      }

      // Send errors to Sentry in production
      if (this.isProduction && level === "error" && typeof window === "undefined") {
        try {
          const Sentry = require("@sentry/nextjs")
          Sentry.captureException(error || new Error(message), {
            extra: context,
          })
        } catch {
          // Sentry not available, fallback to console
          console.error(JSON.stringify(logEntry))
        }
      } else {
        console.log(JSON.stringify(logEntry))
      }
    }
  }

  debug(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      this.log("debug", message, context)
    }
  }

  info(message: string, context?: LogContext): void {
    this.log("info", message, context)
  }

  warn(message: string, context?: LogContext): void {
    this.log("warn", message, context)
  }

  error(message: string, error?: Error, context?: LogContext): void {
    this.log("error", message, context, error)
  }
}

// Export singleton instance
export const logger = new Logger()

// Export type for use in other files
export type { LogContext }

