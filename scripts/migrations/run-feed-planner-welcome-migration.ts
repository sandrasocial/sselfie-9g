/**
 * Migration: Add feed_planner_welcome_shown to user_personal_brand
 * Phase 3: Welcome Wizard
 * 
 * Run with: npx tsx scripts/migrations/run-feed-planner-welcome-migration.ts
 */

import { neon } from "@neondatabase/serverless"
import { readFileSync } from "fs"
import { join } from "path"
import { config } from "dotenv"

// Load environment variables from .env.local
config({ path: join(process.cwd(), ".env.local") })

async function runMigration() {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    console.error("❌ DATABASE_URL environment variable is not set")
    process.exit(1)
  }

  const sql = neon(databaseUrl)

  try {
    console.log("🔄 Starting migration: Add feed_planner_welcome_shown column...")

    // Add column if it doesn't exist
    await sql`
      ALTER TABLE user_personal_brand 
      ADD COLUMN IF NOT EXISTS feed_planner_welcome_shown BOOLEAN DEFAULT false
    `

    // Update existing records to false (not shown)
    await sql`
      UPDATE user_personal_brand
      SET feed_planner_welcome_shown = false
      WHERE feed_planner_welcome_shown IS NULL
    `

    console.log("✅ Migration completed successfully!")
    console.log("   - Added feed_planner_welcome_shown column to user_personal_brand")
    console.log("   - Default value: false")
  } catch (error) {
    console.error("❌ Migration failed:", error)
    process.exit(1)
  }
}

runMigration()
