import { neon } from "@neondatabase/serverless"

// Your production database connection string
const sql = neon(
  "postgresql://neondb_owner:npg_4JbrOoe0YugU@ep-dawn-mountain-adwrqtdk-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
)

async function analyzeDatabase() {
  console.log("[v0] Connecting to production database...\n")

  try {
    // Get all tables in the public schema
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `

    console.log(`[v0] Found ${tables.length} tables:\n`)

    // For each table, get row count and column info
    for (const table of tables) {
      const tableName = table.table_name

      const countResult = await sql`SELECT COUNT(*) as count FROM ${sql(tableName)}`
      const rowCount = countResult[0].count

      // Get column information
      const columns = await sql`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = ${tableName}
        ORDER BY ordinal_position
      `

      console.log(`📊 Table: ${tableName}`)
      console.log(`   Rows: ${rowCount}`)
      console.log(`   Columns (${columns.length}):`)
      columns.forEach((col) => {
        console.log(
          `     - ${col.column_name}: ${col.data_type} ${col.is_nullable === "NO" ? "(required)" : "(optional)"}`,
        )
      })
      console.log("")
    }

    console.log("\n=== SUMMARY ===")
    console.log(`Total tables: ${tables.length}`)
    console.log("Recommendation: We should only migrate tables with data > 0")
  } catch (error) {
    console.error("[v0] Error analyzing database:", error)
  }
}

analyzeDatabase()
