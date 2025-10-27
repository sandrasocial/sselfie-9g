import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL || "")

async function analyzeSchema() {
  try {
    console.log("[v0] Analyzing database schema...\n")

    // Get all tables with their columns
    const tables = await sql`
      SELECT 
        t.table_name,
        array_agg(
          json_build_object(
            'column_name', c.column_name,
            'data_type', c.data_type,
            'is_nullable', c.is_nullable
          ) ORDER BY c.ordinal_position
        ) as columns
      FROM information_schema.tables t
      LEFT JOIN information_schema.columns c 
        ON t.table_name = c.table_name 
        AND t.table_schema = c.table_schema
      WHERE t.table_schema = 'public'
        AND t.table_type = 'BASE TABLE'
      GROUP BY t.table_name
      ORDER BY t.table_name
    `

    console.log(`[v0] Found ${tables.length} tables:\n`)

    // Print each table with its columns
    for (const table of tables) {
      console.log(`\n📋 Table: ${table.table_name}`)
      console.log("   Columns:")
      for (const col of table.columns) {
        const nullable = col.is_nullable === "YES" ? "(nullable)" : "(required)"
        console.log(`   - ${col.column_name}: ${col.data_type} ${nullable}`)
      }
    }

    console.log("\n\n[v0] Schema analysis complete!")
    console.log("[v0] Please review the tables above and tell me which ones contain important data.")
  } catch (error) {
    console.error("[v0] Error analyzing schema:", error)
  }
}

analyzeSchema()
