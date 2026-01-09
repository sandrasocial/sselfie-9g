#!/usr/bin/env tsx
/**
 * Run Paid Blueprint Email Columns Migration
 * Executes add-paid-blueprint-email-columns.sql
 */

import { neon } from "@neondatabase/serverless"
import { config } from "dotenv"
import { join } from "path"

// Load environment variables
config({ path: join(process.cwd(), ".env.local") })
config({ path: join(process.cwd(), ".env") })

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error("❌ DATABASE_URL environment variable is not set")
  process.exit(1)
}

const sql = neon(databaseUrl)

console.log("🚀 Paid Blueprint Email Columns Migration")
console.log("==========================================\n")

async function runMigration() {
  try {
    // Check if migration already applied
    const existing = await sql`
      SELECT version FROM schema_migrations 
      WHERE version = 'add-paid-blueprint-email-columns'
    `

    if (existing.length > 0) {
      console.log("⏭️  Migration already applied (skipping)")
      console.log(`   Applied at: ${existing[0].applied_at}\n`)
      return
    }

    console.log("📝 Running migration: add-paid-blueprint-email-columns\n")

    // Create schema_migrations table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `

    console.log("   Step 1: Adding email tracking columns...")

    // Add email tracking columns
    await sql`
      ALTER TABLE blueprint_subscribers
      ADD COLUMN IF NOT EXISTS day_1_paid_email_sent BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS day_1_paid_email_sent_at TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS day_3_paid_email_sent BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS day_3_paid_email_sent_at TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS day_7_paid_email_sent BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS day_7_paid_email_sent_at TIMESTAMP WITH TIME ZONE
    `

    console.log("   ✅ Step 1 completed: Columns added")

    console.log("   Step 2: Creating indexes...")

    // Create indexes
    await sql`
      CREATE INDEX IF NOT EXISTS idx_blueprint_paid_email_day1 
      ON blueprint_subscribers(day_1_paid_email_sent, paid_blueprint_purchased_at) 
      WHERE paid_blueprint_purchased = TRUE AND day_1_paid_email_sent = FALSE
    `

    await sql`
      CREATE INDEX IF NOT EXISTS idx_blueprint_paid_email_day3 
      ON blueprint_subscribers(day_3_paid_email_sent, paid_blueprint_purchased_at) 
      WHERE paid_blueprint_purchased = TRUE AND day_3_paid_email_sent = FALSE
    `

    await sql`
      CREATE INDEX IF NOT EXISTS idx_blueprint_paid_email_day7 
      ON blueprint_subscribers(day_7_paid_email_sent, paid_blueprint_purchased_at) 
      WHERE paid_blueprint_purchased = TRUE AND day_7_paid_email_sent = FALSE
    `

    console.log("   ✅ Step 2 completed: Indexes created")

    console.log("   Step 3: Recording migration...")

    // Record migration
    await sql`
      INSERT INTO schema_migrations (version) 
      VALUES ('add-paid-blueprint-email-columns')
      ON CONFLICT (version) DO NOTHING
    `

    console.log("   ✅ Step 3 completed: Migration recorded")

    console.log("✅ Migration complete\n")

    // Verification
    console.log("🔍 Verification")
    console.log("---------------")

    const columns = await sql`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'blueprint_subscribers'
      AND column_name LIKE 'day_%_paid_email%'
      ORDER BY column_name
    `

    console.log(`✅ Found ${columns.length} paid email columns:`)
    columns.forEach((col: any) => {
      console.log(`   - ${col.column_name} (${col.data_type}, default: ${col.column_default || "NULL"})`)
    })

    const indexes = await sql`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'blueprint_subscribers'
      AND indexname LIKE 'idx_blueprint_paid_email%'
      ORDER BY indexname
    `

    console.log(`✅ Found ${indexes.length} paid email indexes:`)
    indexes.forEach((idx: any) => {
      console.log(`   - ${idx.indexname}`)
    })

    const migrationRecord = await sql`
      SELECT version, applied_at
      FROM schema_migrations
      WHERE version = 'add-paid-blueprint-email-columns'
    `

    if (migrationRecord.length > 0) {
      console.log(`✅ Migration recorded: ${migrationRecord[0].applied_at}`)
    } else {
      console.log("⚠️  Migration not recorded in schema_migrations (may need manual insert)")
    }

    console.log("\n✨ Migration complete!\n")
  } catch (error: any) {
    console.error("\n❌ Migration failed:", error.message)
    console.error(error)
    throw error
  }
}

// Run migration
runMigration()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("💥 Fatal error:", error)
    process.exit(1)
  })
