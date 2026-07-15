import { neon as createNeonClient, type NeonQueryFunction } from "@neondatabase/serverless"

type SqlClient = NeonQueryFunction<false, false>

let dbInstance: SqlClient | null = null

function getDatabaseUrl(): string | undefined {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.SUPABASE_POSTGRES_URL
  )
}

function getOrCreateDb(): SqlClient {
  if (!dbInstance) {
    const databaseUrl = getDatabaseUrl()
    if (!databaseUrl) {
      throw new Error(
        "DATABASE_URL environment variable is not set (checked DATABASE_URL, POSTGRES_URL, POSTGRES_PRISMA_URL, SUPABASE_POSTGRES_URL)",
      )
    }
    dbInstance = createNeonClient<false, false>(databaseUrl, {
      disableWarningInBrowsers: true,
    })
  }
  return dbInstance
}

/** Canonical singleton DB client. Lazily resolves the real client on first query. */
const lazySql = ((...args: Parameters<SqlClient>) => {
  const client = getOrCreateDb()
  return client(...args)
}) as unknown as SqlClient

// A callable wrapper does not inherit the methods attached to Neon's query function. Academy
// notes/progress and the Blueprint state route use parameterized `sql.query(...)`; forwarding the
// full public surface keeps the singleton lazy without turning those valid calls into runtime 500s.
lazySql.query = ((...args: any[]) =>
  (getOrCreateDb().query as (...queryArgs: any[]) => unknown)(...args)) as SqlClient["query"]
lazySql.unsafe = ((...args: any[]) =>
  (getOrCreateDb().unsafe as (...unsafeArgs: any[]) => unknown)(...args)) as SqlClient["unsafe"]
lazySql.transaction = ((...args: any[]) =>
  (getOrCreateDb().transaction as (...transactionArgs: any[]) => unknown)(
    ...args
  )) as SqlClient["transaction"]

export const sql = lazySql

/** Alias for callers migrated from @/lib/db */
export function getDb(): SqlClient {
  return sql
}

/** Alias for callers migrated from @/lib/db-singleton */
export function getDbClient(): SqlClient {
  return sql
}

/** Re-export the neon factory for the few callers that need it directly */
export const neon = createNeonClient
export { getDatabaseUrl }

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
    await (client as unknown as (q: string, p: unknown[]) => Promise<unknown>)(query, flatValues)

    if (i + batchSize < rows.length) {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
  }
}
