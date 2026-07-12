import { neon } from "@neondatabase/serverless"

async function queryViaRest() {
  try {
    console.log("[v0] Connecting to Neon via REST API...")

    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl) {
      throw new Error("DATABASE_URL is required")
    }

    const sql = neon(databaseUrl)

    console.log("[v0] Querying tables...")

    // Get all tables
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `

    console.log(`[v0] Found ${tables.length} tables:\n`)

    // Print table names
    tables.forEach((table, index) => {
      console.log(`${index + 1}. ${table.table_name}`)
    })

    console.log("\n[v0] Getting column details for each table...\n")

    // Get columns for each table
    for (const table of tables.slice(0, 10)) {
      // Limit to first 10 tables for now
      const columns = await sql`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = ${table.table_name}
        ORDER BY ordinal_position
      `

      console.log(`\n📋 ${table.table_name}:`)
      columns.forEach((col) => {
        console.log(`  - ${col.column_name}: ${col.data_type}${col.is_nullable === "YES" ? " (nullable)" : ""}`)
      })
    }

    console.log("\n[v0] Schema query complete!")
  } catch (error) {
    console.error("[v0] Error querying database:", error)
  }
}

queryViaRest()
