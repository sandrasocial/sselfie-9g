import { neon } from "@neondatabase/serverless"

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required")
}

const sql = neon(databaseUrl)

async function analyzeProductionDatabase() {
  try {
    console.log("[v0] Connecting to production database...")

    // Get all tables
    const tables = await sql`
      SELECT 
        table_name,
        table_schema
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `

    console.log(`[v0] Found ${tables.length} tables:\n`)

    // Get columns for each table
    for (const table of tables) {
      const tableName = table.table_name

      console.log(`\n📋 Table: ${tableName}`)

      // Get columns
      const columns = await sql`
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' 
          AND table_name = ${tableName}
        ORDER BY ordinal_position
      `

      console.log("   Columns:")
      columns.forEach((col) => {
        console.log(`   - ${col.column_name}: ${col.data_type}${col.is_nullable === "NO" ? " NOT NULL" : ""}`)
      })
    }

    console.log("\n\n[v0] Schema analysis complete!")
    console.log("[v0] Please review the tables above and tell me which ones contain important data.")
  } catch (error) {
    console.error("[v0] Error analyzing database:", error)
  }
}

analyzeProductionDatabase()
