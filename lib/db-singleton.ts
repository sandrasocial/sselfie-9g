import { neon } from "@neondatabase/serverless"

let dbInstance: ReturnType<typeof neon> | null = null

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

export const getDbClient = getDb

// Export for backwards compatibility
export const sql = getDb()
