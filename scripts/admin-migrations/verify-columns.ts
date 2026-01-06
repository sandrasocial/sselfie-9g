/**
 * Verify columns used in admin queries match database schema
 */

import { neon } from "@neondatabase/serverless"
import { config } from "dotenv"
import { join } from "path"

config({ path: join(process.cwd(), ".env.local") })
config({ path: join(process.cwd(), ".env") })

const sql = neon(process.env.DATABASE_URL!)

// Key tables to verify columns for
const KEY_TABLES = [
  "admin_knowledge_base",
  "admin_context_guidelines",
  "admin_memory",
  "admin_business_insights",
  "admin_content_performance",
]

async function verifyColumns() {
  console.log("\n" + "=".repeat(70))
  console.log("COLUMN VERIFICATION")
  console.log("=".repeat(70) + "\n")

  for (const tableName of KEY_TABLES) {
    const columns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = ${tableName}
      ORDER BY column_name
    `

    console.log(`✅ ${tableName}:`)
    columns.forEach((col: any) => {
      console.log(`   - ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`)
    })
    console.log()
  }
}

verifyColumns().catch(console.error)

