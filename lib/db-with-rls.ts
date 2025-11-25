import "server-only"

import { neon as createNeonClient } from "@neondatabase/serverless"

let sqlInstance: ReturnType<typeof createNeonClient> | null = null

export function getDb() {
  if (!sqlInstance) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is not set")
    }
    sqlInstance = createNeonClient(process.env.DATABASE_URL)
    console.log("[v0] [DB] Created singleton database connection")
  }
  return sqlInstance
}

// Export the neon client creator for backwards compatibility
export const neon = createNeonClient

/**
 * Execute a database query with RLS context set
 * This function sets the current user ID as a session variable before executing queries
 *
 * NOTE: Neon serverless driver has limitations with session variables.
 * For now, this serves as a wrapper for future RLS enforcement.
 * Current security relies on application-level filtering by user_id.
 *
 * @param userId - The Neon database user ID (not Supabase auth ID)
 * @param queryFn - Async function that performs database operations
 * @param isAdmin - Whether the user has admin privileges (default: false)
 * @returns The result of the query function
 *
 * @example
 * ```typescript
 * const user = await getUserByAuthId(authUser.id)
 * const result = await executeWithRLS(user.id, async (sql) => {
 *   return await sql`SELECT * FROM maya_chats WHERE user_id = ${user.id}`
 * })
 * ```
 */
export async function executeWithRLS<T>(
  userId: number | string,
  queryFn: (sql: ReturnType<typeof createNeonClient>) => Promise<T>,
  isAdmin = false,
): Promise<T> {
  const sql = getDb()

  // TODO: When using Neon pooler connection, uncomment these lines:
  // await sql`SET LOCAL app.current_user_id = ${userId.toString()}`
  // if (isAdmin) {
  //   await sql`SET LOCAL app.is_admin = 'true'`
  // }

  try {
    const result = await queryFn(sql)
    return result
  } catch (error) {
    console.error("[v0] [DB] Error executing query with RLS:", error)
    throw error
  }
}

/**
 * Execute a database query with admin privileges
 * This bypasses RLS checks for administrative operations
 *
 * @param queryFn - Async function that performs database operations
 * @returns The result of the query function
 *
 * @example
 * ```typescript
 * const allUsers = await executeAsAdmin(async (sql) => {
 *   return await sql`SELECT * FROM users`
 * })
 * ```
 */
export async function executeAsAdmin<T>(queryFn: (sql: ReturnType<typeof createNeonClient>) => Promise<T>): Promise<T> {
  const sql = getDb()

  // TODO: When using Neon pooler connection, uncomment this line:
  // await sql`SET LOCAL app.is_admin = 'true'`

  try {
    const result = await queryFn(sql)
    return result
  } catch (error) {
    console.error("[v0] [DB] Error executing admin query:", error)
    throw error
  }
}

// Helper function to batch INSERT operations
export async function batchInsert<T>(
  sql: ReturnType<typeof createNeonClient>,
  tableName: string,
  columns: string[],
  rows: any[][],
  batchSize = 10,
): Promise<void> {
  console.log(`[v0] [DB] Batching ${rows.length} inserts into ${tableName} (batch size: ${batchSize})`)

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize)
    const values = batch
      .map((_, idx) => {
        const placeholders = columns.map((_, colIdx) => `$${idx * columns.length + colIdx + 1}`).join(", ")
        return `(${placeholders})`
      })
      .join(", ")

    const flatValues = batch.flat()
    const query = `INSERT INTO ${tableName} (${columns.join(", ")}) VALUES ${values}`

    await sql(query, flatValues)
    console.log(`[v0] [DB] Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(rows.length / batchSize)}`)

    // Add small delay between batches to avoid rate limits
    if (i + batchSize < rows.length) {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
  }
}
