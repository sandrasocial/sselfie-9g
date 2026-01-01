/**
 * Migration: Add Pro Mode support to feed_posts table
 * Run this script to add generation_mode and pro_mode_type columns
 */

import { neon } from "@neondatabase/serverless"
import { readFileSync } from "fs"
import { join } from "path"

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required")
}

const sql = neon(process.env.DATABASE_URL)

async function runMigration() {
  console.log("[v0] ==================== RUNNING PRO MODE MIGRATION ====================")
  console.log("[v0] Adding generation_mode and pro_mode_type columns to feed_posts table...")

  try {
    // Read the migration SQL file
    const migrationPath = join(process.cwd(), "migrations", "add-pro-mode-to-feed-posts.sql")
    const migrationSQL = readFileSync(migrationPath, "utf-8")

    console.log("[v0] Migration SQL loaded, executing...")

    // Execute the migration
    // Split by semicolons and execute each statement
    const statements = migrationSQL
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith("--"))

    for (const statement of statements) {
      if (statement) {
        console.log(`[v0] Executing: ${statement.substring(0, 100)}...`)
        await sql(statement)
      }
    }

    console.log("[v0] ✅ Migration completed successfully!")
    console.log("[v0] Added columns:")
    console.log("[v0]   - generation_mode (VARCHAR(10), DEFAULT 'classic')")
    console.log("[v0]   - pro_mode_type (VARCHAR(50))")
    console.log("[v0] Added indexes:")
    console.log("[v0]   - idx_feed_posts_generation_mode")
    console.log("[v0]   - idx_feed_posts_pro_mode_type")

    // Verify the migration
    const columns = await sql`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'feed_posts'
      AND column_name IN ('generation_mode', 'pro_mode_type')
      ORDER BY column_name
    `

    console.log("\n[v0] Verification:")
    for (const col of columns) {
      console.log(`[v0]   ✓ ${col.column_name}: ${col.data_type} (default: ${col.column_default || "NULL"})`)
    }

    if (columns.length !== 2) {
      throw new Error(`Expected 2 columns, found ${columns.length}`)
    }

    console.log("\n[v0] ✅ Migration verified successfully!")
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

