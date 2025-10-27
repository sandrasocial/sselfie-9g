import { neon } from "@neondatabase/serverless"

const connectionString =
  "postgresql://neondb_owner:npg_4JbrOoe0YugU@ep-dawn-mountain-adwrqtdk-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"

async function listTables() {
  try {
    const sql = neon(connectionString)

    console.log("[v0] Connecting to database...")

    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `

    console.log(`[v0] Found ${tables.length} tables:\n`)
    tables.forEach((table: any, index: number) => {
      console.log(`${index + 1}. ${table.table_name}`)
    })
  } catch (error) {
    console.error("[v0] Error:", error)
  }
}

listTables()
