/**
 * Migration Runner: Add feed_style column to feed_layouts
 * 
 * This migration adds the feed_style column to allow each feed
 * to have its own style selection independent of user profile.
 */

import { neon } from "@neondatabase/serverless"
import { readFileSync } from "fs"
import { join } from "path"
import { config } from "dotenv"
import { resolve } from "path"

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), ".env.local") })

async function runMigration() {
  const sql = neon(process.env.DATABASE_URL!)

  try {
    console.log("[Migration] Starting: Add feed_style to feed_layouts...")

    // Check if column already exists
    const checkResult = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'feed_layouts' 
      AND column_name = 'feed_style'
    `

    if (checkResult.length > 0) {
      console.log("[Migration] ✅ Column feed_style already exists, skipping...")
      return
    }

    // Read and execute migration SQL
    const migrationPath = join(process.cwd(), "scripts/migrations/add-feed-style-to-feed-layouts.sql")
    const migrationSQL = readFileSync(migrationPath, "utf-8")

    // Execute migration
    await sql.unsafe(migrationSQL)

    console.log("[Migration] ✅ Successfully added feed_style column to feed_layouts")
  } catch (error: any) {
    console.error("[Migration] ❌ Error running migration:", error.message)
    throw error
  }
}

// Run migration
runMigration()
  .then(() => {
    console.log("[Migration] ✅ Migration completed successfully")
    process.exit(0)
  })
  .catch((error) => {
    console.error("[Migration] ❌ Migration failed:", error)
    process.exit(1)
  })
