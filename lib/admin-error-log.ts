/**
 * Admin Error Logging
 * Central helper for logging admin-related errors to admin_email_errors table
 * Falls back to console logging if DB write fails
 * Uses optional error envelope (code, message, context) for consistent log metadata.
 */

import { sql } from "@/lib/db/client"
import { logger } from "@/lib/logger"
import { toErrorEnvelope } from "@/lib/error-envelope"


export interface AdminErrorContext {
  [key: string]: any
}

export interface AdminErrorLogOptions {
  toolName: string
  error: Error | unknown
  context?: AdminErrorContext
  /** Optional code for consistent error classification (e.g. "stuck_sending_timeout"). */
  code?: string
}

/**
 * Log admin error to database
 * Falls back to console logging if DB write fails
 */
export async function logAdminError({
  toolName,
  error,
  context = {},
  code,
}: AdminErrorLogOptions): Promise<void> {
  const envelope = toErrorEnvelope(error, code, context)
  const errorMessage = envelope.message
  const errorStack = envelope.stack ?? (error instanceof Error ? error.stack : undefined)
  const logContext = { ...context, code: envelope.code }

  // Try to write to database
  try {
    await sql`
      INSERT INTO admin_email_errors (
        tool_name, error_message, error_stack,
        context, created_at
      ) VALUES (
        ${toolName},
        ${errorMessage},
        ${errorStack || null},
        ${JSON.stringify(logContext)},
        NOW()
      )
    `
    
    // Also log to structured logger
    logger.warn(`[ADMIN-ERROR] ${toolName}: ${errorMessage}`, {
      toolName,
      code: envelope.code,
      error: errorMessage,
      context: logContext,
    })
  } catch (dbError: any) {
    // Fallback to console + structured logger if DB write fails
    console.error("[ADMIN-ERROR] Failed to log error to database:", dbError.message)
    console.error("[ADMIN-ERROR] Error context:", {
      toolName,
      code: envelope.code,
      error: errorMessage,
      stack: errorStack,
      context: logContext,
    })
    
    const dbErr =
      dbError instanceof Error ? dbError : new Error(typeof dbError?.message === "string" ? dbError.message : "DB log failed")
    logger.error(
      `[ADMIN-ERROR] Failed to log to DB: ${dbErr.message}`,
      dbErr,
      {
        toolName,
        code: envelope.code,
        originalError: errorMessage,
        dbError: dbErr.message,
        context: logContext,
      },
    )
  }
}

/**
 * Log admin error with automatic tool name detection from stack trace
 */
export async function logAdminErrorAuto(
  error: Error | unknown,
  context?: AdminErrorContext,
): Promise<void> {
  let toolName = "unknown"
  
  if (error instanceof Error && error.stack) {
    // Try to extract function/file name from stack
    const stackLines = error.stack.split("\n")
    const relevantLine = stackLines.find(
      (line) => line.includes("lib/alex") || line.includes("lib/email") || line.includes("app/api")
    )
    
    if (relevantLine) {
      // Extract function or file name
      const match = relevantLine.match(/([^/]+)\.(ts|tsx|js):\d+:\d+/)
      if (match) {
        toolName = match[1]
      }
    }
  }
  
  await logAdminError({ toolName, error, context })
}

