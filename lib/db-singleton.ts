import { neon } from "@neondatabase/serverless"

let dbInstance: ReturnType<typeof neon> | null = null

/**
 * Retry database operation with exponential backoff
 */
async function retryDbOperation<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  initialDelay = 1000,
): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      
      // Check if error is retryable (connection errors, timeouts)
      const isRetryable =
        lastError.message.includes("connection") ||
        lastError.message.includes("timeout") ||
        lastError.message.includes("ECONNREFUSED") ||
        lastError.message.includes("ETIMEDOUT") ||
        lastError.message.includes("ENOTFOUND")

      if (!isRetryable || attempt === maxRetries - 1) {
        throw lastError
      }

      // Exponential backoff: 1s, 2s, 4s
      const delay = initialDelay * Math.pow(2, attempt)
      console.log(`[DB] Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw lastError || new Error("Database operation failed after retries")
}

/**
 * Get or create a singleton database connection
 * This prevents creating new connections on every API request
 * which would exhaust the connection pool under load
 */
export function getDb() {
  if (!dbInstance) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is not set")
    }
    // All queries run server-side, so the warning is not applicable
    dbInstance = neon(process.env.DATABASE_URL, {
      disableWarningInBrowsers: true,
    })
  }
  return dbInstance
}

/**
 * Execute database query with retry logic
 */
export async function executeWithRetry<T>(
  query: () => Promise<T>,
  maxRetries = 3,
): Promise<T> {
  return retryDbOperation(query, maxRetries)
}

/**
 * Health check for database connection
 */
export async function checkDbHealth(): Promise<boolean> {
  try {
    const db = getDb()
    await db`SELECT 1`
    return true
  } catch (error) {
    console.error("[DB] Health check failed:", error)
    return false
  }
}

export const getDbClient = getDb

// Export for backwards compatibility
export const sql = getDb()
