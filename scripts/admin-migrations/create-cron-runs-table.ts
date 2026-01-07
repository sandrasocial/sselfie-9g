/**
 * Create admin_cron_runs table
 */

import { neon } from "@neondatabase/serverless"
import { config } from "dotenv"
import { join } from "path"
import { readFileSync } from "fs"

config({ path: join(process.cwd(), ".env.local") })
config({ path: join(process.cwd(), ".env") })

const sql = neon(process.env.DATABASE_URL!)

async function main() {
  const migrationSQL = readFileSync(
    "scripts/admin-migrations/20250106_create_admin_cron_runs.sql",
    "utf-8",
  )

  try {
    await sql.unsafe(migrationSQL)
    console.log("✅ Created admin_cron_runs table")
  } catch (error: any) {
    console.error("❌ Error:", error.message)
    process.exit(1)
  }
}

main()


