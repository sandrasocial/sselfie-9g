/**
 * Migration script to add blueprint follow-up email tracking columns
 * Run with: pnpm exec tsx scripts/add-blueprint-followup-columns.ts
 */

import { neon } from "@neondatabase/serverless"
import { readFileSync } from "fs"
import { join } from "path"
import { config } from "dotenv"

// Load environment variables from .env files
config({ path: join(process.cwd(), ".env.local") })
config({ path: join(process.cwd(), ".env") })

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  console.error("Missing required environment variable: DATABASE_URL")
  console.error("Make sure DATABASE_URL is set in .env or .env.local")
  process.exit(1)
}

const sql = neon(databaseUrl)

async function runMigration() {
  console.log("Running blueprint follow-up email columns migration...")

  try {
    // Add columns
    console.log("Adding day_3_email_sent columns...")
    await sql`
      ALTER TABLE blueprint_subscribers
      ADD COLUMN IF NOT EXISTS day_3_email_sent BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS day_3_email_sent_at TIMESTAMP WITH TIME ZONE
    `

    console.log("Adding day_7_email_sent columns...")
    await sql`
      ALTER TABLE blueprint_subscribers
      ADD COLUMN IF NOT EXISTS day_7_email_sent BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS day_7_email_sent_at TIMESTAMP WITH TIME ZONE
    `

    console.log("Adding day_14_email_sent columns...")
    await sql`
      ALTER TABLE blueprint_subscribers
      ADD COLUMN IF NOT EXISTS day_14_email_sent BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS day_14_email_sent_at TIMESTAMP WITH TIME ZONE
    `

    // Create indexes
    console.log("Creating indexes...")
    await sql`
      CREATE INDEX IF NOT EXISTS idx_blueprint_subscribers_day3_email 
      ON blueprint_subscribers(day_3_email_sent, created_at) 
      WHERE day_3_email_sent = FALSE
    `

    await sql`
      CREATE INDEX IF NOT EXISTS idx_blueprint_subscribers_day7_email 
      ON blueprint_subscribers(day_7_email_sent, created_at) 
      WHERE day_7_email_sent = FALSE
    `

    await sql`
      CREATE INDEX IF NOT EXISTS idx_blueprint_subscribers_day14_email 
      ON blueprint_subscribers(day_14_email_sent, created_at) 
      WHERE day_14_email_sent = FALSE
    `

    console.log("✅ Migration completed successfully!")
    console.log("Added columns:")
    console.log("  - day_3_email_sent, day_3_email_sent_at")
    console.log("  - day_7_email_sent, day_7_email_sent_at")
    console.log("  - day_14_email_sent, day_14_email_sent_at")
    console.log("Created indexes for faster queries")
  } catch (error: any) {
    console.error("❌ Migration failed:", error.message)
    if (error.message?.includes("already exists")) {
      console.log("ℹ️  Columns may already exist - this is safe to ignore")
    } else {
      throw error
    }
  }
}

runMigration()
  .then(() => {
    console.log("Migration script completed")
    process.exit(0)
  })
  .catch((error) => {
    console.error("Migration script failed:", error)
    process.exit(1)
  })
