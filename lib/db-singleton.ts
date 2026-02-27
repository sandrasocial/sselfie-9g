import { neon, type NeonQueryFunction } from "@neondatabase/serverless"

type SqlClient = NeonQueryFunction<false, false>
let dbInstance: SqlClient | null = null

/**
 * Get or create a singleton database connection.
 * This prevents creating new connections on every API request
 * which would exhaust the connection pool under load
 */
function getOrCreateDb(): SqlClient {
  if (!dbInstance) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is not set")
    }
    // All queries run server-side, so the warning is not applicable
    dbInstance = neon<false, false>(process.env.DATABASE_URL, {
      disableWarningInBrowsers: true,
    })
  }
  return dbInstance
}

export function getDbClient(): SqlClient {
  return getOrCreateDb()
}

// Shared singleton sql client for modules that import `sql` directly.
export const sql = getDbClient()
