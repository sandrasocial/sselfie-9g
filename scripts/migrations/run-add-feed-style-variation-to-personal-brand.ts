/**
 * Migration: Add feed_style_variation_id to user_personal_brand
 */

import * as dotenv from "dotenv"
import { neon } from "@neondatabase/serverless"
import { readFileSync } from "fs"
import { join } from "path"

dotenv.config({ path: ".env.local" })

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required")
}

const sql = neon(process.env.DATABASE_URL)

async function runMigration() {
  console.log("[FEED-PLANNER-V2] ==================== RUNNING PERSONAL BRAND VARIATION MIGRATION ====================")

  const migrationPath = join(
    process.cwd(),
    "scripts",
    "migrations",
    "2026-01-20-add-feed-style-variation-to-personal-brand.sql"
  )
  const migrationSQL = readFileSync(migrationPath, "utf-8")

  const statements = migrationSQL
    .split(";")
    .map((s) => s.trim())
    .filter((s) => {
      const cleaned = s.replace(/--.*$/gm, "").trim()
      return cleaned.length > 0 && !cleaned.startsWith("--")
    })

  for (const statement of statements) {
    console.log(`[FEED-PLANNER-V2] Executing: ${statement.substring(0, 120).replace(/\n/g, " ")}...`)
    await sql.query(statement + ";")
  }

  console.log("[FEED-PLANNER-V2] ✅ Migration completed successfully!")
}

runMigration()
  .then(() => {
    console.log("[FEED-PLANNER-V2] Migration script completed")
    process.exit(0)
  })
  .catch((error) => {
    console.error("[FEED-PLANNER-V2] ❌ Migration script failed:", error)
    process.exit(1)
  })
