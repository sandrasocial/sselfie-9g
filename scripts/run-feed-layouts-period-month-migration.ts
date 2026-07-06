/**
 * Migration: Add period_month to feed_layouts (Feed Planner Phase 2b — Maya auto-draft)
 */

import { neon } from "@neondatabase/serverless"
import { readFileSync } from "fs"
import { join } from "path"

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required")
}

const sql = neon(process.env.DATABASE_URL)

async function runMigration() {
  console.log("[v0] ==================== ADD feed_layouts.period_month ====================")

  try {
    const migrationPath = join(process.cwd(), "migrations", "add-feed-layouts-period-month.sql")
    const migrationSQL = readFileSync(migrationPath, "utf-8")
      .split("\n")
      .filter((line) => !line.trim().startsWith("--"))
      .join("\n")

    const statements = migrationSQL
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0)

    for (const statement of statements) {
      console.log(`[v0] Executing: ${statement.substring(0, 100)}...`)
      await sql.query(statement)
    }

    const columns = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'feed_layouts'
      AND column_name = 'period_month'
    `

    if (columns.length !== 1) {
      throw new Error(`Expected period_month column to exist, found ${columns.length}`)
    }

    console.log(`[v0] ✅ Verified: period_month (${columns[0].data_type})`)
  } catch (error) {
    console.error("[v0] ❌ Migration failed:", error)
    throw error
  }
}

runMigration()
  .then(() => {
    console.log("[v0] Migration script completed")
    process.exit(0)
  })
  .catch((error) => {
    console.error("[v0] Migration script failed:", error)
    process.exit(1)
  })
