/**
 * Run Email Sends Table Migration
 * 
 * Executes the SQL migration to create the email_sends table for tracking
 * individual email sends in automation sequences.
 */

import { neon } from "@neondatabase/serverless"
import { config } from "dotenv"
import { resolve } from "path"

// Load environment variables
config({ path: resolve(process.cwd(), ".env.local") })
config({ path: resolve(process.cwd(), ".env") })

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required")
}

const sql = neon(process.env.DATABASE_URL)

async function runMigration() {
  console.log("[v0] Starting email_sends table migration...")

  try {
    // Check if table already exists
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'email_sends'
      )
    `

    if (tableExists[0].exists) {
      console.log("⚠️  Table 'email_sends' already exists. Skipping migration.")
      console.log("   If you want to recreate it, drop it first with:")
      console.log("   DROP TABLE IF EXISTS email_sends CASCADE;")
      return { success: true, skipped: true }
    }

    console.log("[v0] Creating email_sends table...")
    
    // Create table
    await sql`
      CREATE TABLE IF NOT EXISTS email_sends (
        id SERIAL PRIMARY KEY,
        campaign_id INTEGER REFERENCES admin_email_campaigns(id) ON DELETE SET NULL,
        user_email TEXT NOT NULL,
        sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        opened_at TIMESTAMP WITH TIME ZONE,
        clicked_at TIMESTAMP WITH TIME ZONE,
        converted BOOLEAN DEFAULT false,
        converted_at TIMESTAMP WITH TIME ZONE,
        resend_message_id TEXT,
        UNIQUE(campaign_id, user_email)
      )
    `
    console.log("✅ Table created")

    console.log("[v0] Creating indexes...")
    
    // Create indexes
    const indexes = [
      sql`CREATE INDEX IF NOT EXISTS idx_email_sends_email ON email_sends(user_email)`,
      sql`CREATE INDEX IF NOT EXISTS idx_email_sends_campaign ON email_sends(campaign_id)`,
      sql`CREATE INDEX IF NOT EXISTS idx_email_sends_sent_at ON email_sends(sent_at DESC)`,
    ]

    for (const indexQuery of indexes) {
      try {
        await indexQuery
      } catch (error: any) {
        console.warn(`[v0] Warning creating index: ${error.message}`)
      }
    }
    console.log("✅ Indexes created")

    // Add comment
    await sql`COMMENT ON TABLE email_sends IS 'Tracks individual email sends for automation sequences'`
    console.log("✅ Comments added")

    // Verify table was created
    console.log("\n[v0] Verifying table creation...")
    const verify = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'email_sends'
      )
    `

    if (verify[0].exists) {
      console.log("✅ Migration completed successfully!")
      console.log("✅ Table 'email_sends' created successfully")
      
      // Check column count
      const columns = await sql`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'email_sends'
        ORDER BY ordinal_position
      `
      console.log(`✅ Table has ${columns.length} columns`)
      console.log("   Columns:", columns.map((c: any) => c.column_name).join(", "))
    } else {
      console.error("❌ Migration completed but table was not found!")
      throw new Error("Table verification failed")
    }

    return { success: true }
  } catch (error: any) {
    console.error("[v0] ❌ Migration failed:", error)
    console.error("[v0] Error details:", error.message)
    throw error
  }
}

// Run the migration
runMigration()
  .then(() => {
    console.log("[v0] Migration script completed")
    process.exit(0)
  })
  .catch((error) => {
    console.error("[v0] Migration script failed:", error)
    process.exit(1)
  })

