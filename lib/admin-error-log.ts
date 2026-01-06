/**
 * Admin Error Logging
 * Central helper for logging admin-related errors to admin_email_errors table
 * Falls back to console logging if DB write fails
 */

import { neon } from "@neondatabase/serverless"
import { logger } from "@/lib/logger"

const sql = neon(process.env.DATABASE_URL!)

export interface AdminErrorContext {
  [key: string]: any
}

export interface AdminErrorLogOptions {
  toolName: string
  error: Error | unknown
  context?: AdminErrorContext
}

/**
 * Log admin error to database
 * Falls back to console logging if DB write fails
 */
export async function logAdminError({
  toolName,
  error,
  context = {},
}: AdminErrorLogOptions): Promise<void> {
  const errorMessage = error instanceof Error ? error.message : String(error)
  const errorStack = error instanceof Error ? error.stack : undefined

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
        ${JSON.stringify(context)},
        NOW()
      )
    `
    
    // Also log to structured logger
    logger.warn(`[ADMIN-ERROR] ${toolName}: ${errorMessage}`, {
      toolName,
      error: errorMessage,
      context,
    })
  } catch (dbError: any) {
    // Fallback to console + structured logger if DB write fails
    console.error("[ADMIN-ERROR] Failed to log error to database:", dbError.message)
    console.error("[ADMIN-ERROR] Error context:", {
      toolName,
      error: errorMessage,
      stack: errorStack,
      context,
    })
    
    logger.error(`[ADMIN-ERROR] Failed to log to DB: ${dbError.message}`, {
      toolName,
      originalError: errorMessage,
      dbError: dbError.message,
      context,
    })
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

