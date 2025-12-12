/**
 * Migration script to set up email automation tables
 * Run with: pnpm exec tsx scripts/setup-email-automation-tables.ts
 */

import { neon } from "@neondatabase/serverless"
import { config } from "dotenv"
import { join } from "path"

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
  console.log("\n📊 SETTING UP EMAIL AUTOMATION TABLES")
  console.log("=".repeat(50))

  try {
    // Create welcome_back_sequence table
    console.log("\n1. Creating welcome_back_sequence table...")
    await sql`
      CREATE TABLE IF NOT EXISTS welcome_back_sequence (
        id SERIAL PRIMARY KEY,
        user_email TEXT NOT NULL,
        initial_campaign_id INTEGER,
        day_0_sent_at TIMESTAMP WITH TIME ZONE,
        day_7_email_sent BOOLEAN DEFAULT FALSE,
        day_7_email_sent_at TIMESTAMP WITH TIME ZONE,
        day_7_campaign_id INTEGER,
        day_14_email_sent BOOLEAN DEFAULT FALSE,
        day_14_email_sent_at TIMESTAMP WITH TIME ZONE,
        day_14_campaign_id INTEGER,
        converted BOOLEAN DEFAULT FALSE,
        converted_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `
    console.log("   ✓ welcome_back_sequence table created")

    // Create indexes for welcome_back_sequence
    console.log("\n2. Creating indexes for welcome_back_sequence...")
    await sql`
      CREATE INDEX IF NOT EXISTS idx_welcome_back_email ON welcome_back_sequence(user_email)
    `
    await sql`
      CREATE INDEX IF NOT EXISTS idx_welcome_back_converted ON welcome_back_sequence(converted)
    `
    await sql`
      CREATE INDEX IF NOT EXISTS idx_welcome_back_day7 
      ON welcome_back_sequence(day_7_email_sent, day_0_sent_at) 
      WHERE day_7_email_sent = FALSE
    `
    await sql`
      CREATE INDEX IF NOT EXISTS idx_welcome_back_day14 
      ON welcome_back_sequence(day_14_email_sent, day_0_sent_at) 
      WHERE day_14_email_sent = FALSE
    `
    console.log("   ✓ Indexes created")

    // Add conversion tracking columns to email_logs
    console.log("\n3. Adding conversion tracking columns to email_logs...")
    await sql`
      ALTER TABLE email_logs
      ADD COLUMN IF NOT EXISTS campaign_id INTEGER,
      ADD COLUMN IF NOT EXISTS opened BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS opened_at TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS clicked BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS clicked_at TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS converted BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS converted_at TIMESTAMP WITH TIME ZONE
    `
    console.log("   ✓ Conversion tracking columns added")

    // Create indexes for email_logs
    console.log("\n4. Creating indexes for email_logs...")
    await sql`
      CREATE INDEX IF NOT EXISTS idx_email_logs_campaign ON email_logs(campaign_id)
    `
    await sql`
      CREATE INDEX IF NOT EXISTS idx_email_logs_converted ON email_logs(converted)
    `
    await sql`
      CREATE INDEX IF NOT EXISTS idx_email_logs_opened ON email_logs(opened)
    `
    await sql`
      CREATE INDEX IF NOT EXISTS idx_email_logs_clicked ON email_logs(clicked)
    `
    console.log("   ✓ Indexes created")

    // Create updated_at trigger
    console.log("\n5. Creating updated_at trigger...")
    await sql`
      CREATE OR REPLACE FUNCTION update_welcome_back_sequence_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `
    await sql`
      DROP TRIGGER IF EXISTS welcome_back_sequence_updated_at ON welcome_back_sequence
    `
    await sql`
      CREATE TRIGGER welcome_back_sequence_updated_at
      BEFORE UPDATE ON welcome_back_sequence
      FOR EACH ROW
      EXECUTE FUNCTION update_welcome_back_sequence_updated_at()
    `
    console.log("   ✓ Trigger created")

    console.log("\n" + "=".repeat(50))
    console.log("✅ MIGRATION COMPLETED SUCCESSFULLY!")
    console.log("=".repeat(50))
    console.log("\n📋 Created:")
    console.log("   ✓ welcome_back_sequence table")
    console.log("   ✓ Conversion tracking columns in email_logs")
    console.log("   ✓ Indexes for fast queries")
    console.log("   ✓ Updated_at trigger")
    console.log("\n🎯 Next Steps:")
    console.log("   1. Create cron endpoints (Day 2 Prompt 7, Day 3 Prompt 8)")
    console.log("   2. Update Stripe webhook to mark conversions")
    console.log("   3. Deploy to Vercel to activate cron jobs")
    console.log()
  } catch (error: any) {
    console.error("\n❌ Migration failed:", error.message)
    if (error.message?.includes("already exists")) {
      console.log("ℹ️  Some objects may already exist - this is safe to ignore")
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
