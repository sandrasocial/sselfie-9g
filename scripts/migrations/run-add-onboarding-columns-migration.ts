import { neon } from "@neondatabase/serverless"
import { readFileSync } from "fs"
import { resolve } from "path"
import * as dotenv from "dotenv"

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), ".env.local") })

async function runMigration() {
  const sql = neon(process.env.DATABASE_URL!)

  try {
    console.log("🔍 Checking if migration has already been applied...")

    // Create schema_migrations table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `

    // Check if migration has already been applied
    const existing = await sql`
      SELECT version FROM schema_migrations 
      WHERE version = 'add-onboarding-columns'
      LIMIT 1
    `

    if (existing.length > 0) {
      console.log("✅ Migration 'add-onboarding-columns' has already been applied. Skipping.")
      return
    }

    console.log("📝 Running migration: add-onboarding-columns")

    // Add onboarding_completed column
    await sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false NOT NULL
    `

    // Add blueprint_welcome_shown_at column
    await sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS blueprint_welcome_shown_at TIMESTAMP WITH TIME ZONE
    `

    // Create index on onboarding_completed
    await sql`
      CREATE INDEX IF NOT EXISTS idx_users_onboarding_completed ON users(onboarding_completed)
    `

    // Record migration
    await sql`
      INSERT INTO schema_migrations (version) 
      VALUES ('add-onboarding-columns')
      ON CONFLICT (version) DO NOTHING
    `

    console.log("✅ Migration 'add-onboarding-columns' completed successfully!")
    console.log("   - Added onboarding_completed column (BOOLEAN, DEFAULT false)")
    console.log("   - Added blueprint_welcome_shown_at column (TIMESTAMP, nullable)")
    console.log("   - Created index on onboarding_completed")
  } catch (error: any) {
    console.error("❌ Migration failed:", error.message)
    if (error.stack) {
      console.error(error.stack)
    }
    process.exit(1)
  }
}

runMigration()
