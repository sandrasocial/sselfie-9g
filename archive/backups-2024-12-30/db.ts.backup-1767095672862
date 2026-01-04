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
