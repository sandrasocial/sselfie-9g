/**
 * Error envelope for consistent log metadata across cron and email paths.
 * Use for structured logging and admin error logs so all errors have code, message, context.
 */

export interface ErrorEnvelope {
  code: string
  message: string
  context?: Record<string, unknown>
  stack?: string
}

/**
 * Build a structured error envelope from an Error or unknown.
 * Optional code and context are merged for consistent log metadata.
 */
export function toErrorEnvelope(
  error: Error | unknown,
  code?: string,
  context?: Record<string, unknown>,
): ErrorEnvelope {
  const message = error instanceof Error ? error.message : String(error)
  const stack = error instanceof Error ? error.stack : undefined
  return {
    code: code ?? (error instanceof Error ? error.name : "UnknownError"),
    message,
    ...(stack && { stack }),
    ...(context && Object.keys(context).length > 0 && { context }),
  }
}
