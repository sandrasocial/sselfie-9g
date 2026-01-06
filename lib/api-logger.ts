import "server-only"
import { logger } from "./logger"

/**
 * API Request Logger
 * 
 * Provides consistent logging for API routes with:
 * - Unique request ID for tracing
 * - Route name and HTTP method
 * - Success/failure status
 * - Request duration
 * - Error details when failures occur
 */

/**
 * Generate a unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Extract route name from request URL
 */
function getRouteName(request: Request): string {
  try {
    const url = new URL(request.url)
    return url.pathname
  } catch {
    return "unknown"
  }
}

/**
 * API Logger instance for a single request
 */
export class ApiLogger {
  private requestId: string
  private routeName: string
  private method: string
  private startTime: number

  constructor(request: Request) {
    // Check if client provided a requestId in header (for end-to-end tracing)
    const clientRequestId = request.headers.get("X-Request-ID")
    this.requestId = clientRequestId || generateRequestId()
    this.routeName = getRouteName(request)
    this.method = request.method
    this.startTime = Date.now()
  }

  /**
   * Get the request ID for this request
   */
  getRequestId(): string {
    return this.requestId
  }

  /**
   * Log the start of a request
   */
  start(): void {
    logger.info("API request started", {
      requestId: this.requestId,
      route: this.routeName,
      method: this.method,
    })
  }

  /**
   * Log successful completion of a request
   */
  success(statusCode: number, additionalContext?: Record<string, unknown>): void {
    const duration = Date.now() - this.startTime
    logger.info("API request completed", {
      requestId: this.requestId,
      route: this.routeName,
      method: this.method,
      statusCode,
      duration: `${duration}ms`,
      success: true,
      ...additionalContext,
    })
  }

  /**
   * Log a request failure
   */
  error(error: Error | unknown, statusCode?: number, additionalContext?: Record<string, unknown>): void {
    const duration = Date.now() - this.startTime
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorName = error instanceof Error ? error.name : "UnknownError"

    logger.error("API request failed", error instanceof Error ? error : new Error(errorMessage), {
      requestId: this.requestId,
      route: this.routeName,
      method: this.method,
      statusCode: statusCode || 500,
      duration: `${duration}ms`,
      success: false,
      errorName,
      errorMessage,
      ...additionalContext,
    })
  }

  /**
   * Log a warning for a request
   */
  warn(message: string, additionalContext?: Record<string, unknown>): void {
    logger.warn(message, {
      requestId: this.requestId,
      route: this.routeName,
      method: this.method,
      ...additionalContext,
    })
  }
}

/**
 * Create an API logger instance for a request
 */
export function createApiLogger(request: Request): ApiLogger {
  return new ApiLogger(request)
}

