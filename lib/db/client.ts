import { neon as createNeonClient, type NeonQueryFunction } from "@neondatabase/serverless"

type SqlClient = NeonQueryFunction<false, false>

let dbInstance: SqlClient | null = null

function getOrCreateDb(): SqlClient {
  if (!dbInstance) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is not set")
    }
    dbInstance = createNeonClient<false, false>(process.env.DATABASE_URL, {
      disableWarningInBrowsers: true,
    })
  }
  return dbInstance
}

/** Canonical singleton DB client. Use this in all new code. */
export const sql: SqlClient = getOrCreateDb()

/** Alias for callers migrated from @/lib/db */
export function getDb(): SqlClient {
  return getOrCreateDb()
}

/** Alias for callers migrated from @/lib/db-singleton */
export function getDbClient(): SqlClient {
  return getOrCreateDb()
}

/** Re-export the neon factory for the few callers that need it directly */
export const neon = createNeonClient

/** Batch INSERT helper — kept here as the single canonical location */
export async function batchInsert<T>(
  client: SqlClient,
  tableName: string,
  columns: string[],
  rows: unknown[][],
  batchSize = 10,
): Promise<void> {
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
    await (client as (q: string, p: unknown[]) => Promise<unknown>)(query, flatValues)

    if (i + batchSize < rows.length) {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
  }
}
