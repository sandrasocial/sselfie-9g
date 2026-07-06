/**
 * Migration: Add ai_image_id to feed_posts (Feed Planner Phase 2c)
 */

import { neon } from "@neondatabase/serverless"
import { readFileSync } from "fs"
import { join } from "path"

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required")
}

const sql = neon(process.env.DATABASE_URL)

async function runMigration() {
  console.log("[v0] ==================== ADD feed_posts.ai_image_id ====================")

  try {
    const migrationPath = join(process.cwd(), "migrations", "add-feed-posts-ai-image-id.sql")
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
      WHERE table_name = 'feed_posts'
      AND column_name = 'ai_image_id'
    `

    if (columns.length !== 1) {
      throw new Error(`Expected ai_image_id column to exist, found ${columns.length}`)
    }

    console.log(`[v0] ✅ Verified: ai_image_id (${columns[0].data_type})`)
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
