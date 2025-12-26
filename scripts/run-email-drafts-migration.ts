/**
 * Run the email drafts table migration
 * This script creates the admin_email_drafts table and all related indexes/triggers
 */

import { neon } from "@neondatabase/serverless"
import { config } from "dotenv"
import * as fs from "fs"
import * as path from "path"

// Load environment variables
config({ path: ".env.local" })
config({ path: ".env" })

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error("❌ DATABASE_URL environment variable is not set")
  process.exit(1)
}

const sql = neon(databaseUrl)

async function runMigration() {
  try {
    console.log("[Migration] Starting email drafts table migration...")
    
    const migrationPath = path.join(process.cwd(), "scripts", "51-create-email-drafts-table.sql")
    
    if (!fs.existsSync(migrationPath)) {
      console.error(`❌ Migration script not found at: ${migrationPath}`)
      process.exit(1)
    }

    console.log(`[Migration] Reading migration script from: ${migrationPath}`)
    const migrationSQL = fs.readFileSync(migrationPath, "utf-8")

    // Check if table already exists
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'admin_email_drafts'
      )
    `

    if (tableExists[0].exists) {
      console.log("⚠️  Table 'admin_email_drafts' already exists. Skipping migration.")
      console.log("   If you want to recreate it, drop it first with:")
      console.log("   DROP TABLE IF EXISTS admin_email_drafts CASCADE;")
      process.exit(0)
    }

    // Execute the migration SQL using the full file content
    // Note: We need to split into individual statements since neon requires tagged templates
    // For complex migrations with multiple statements, we'll execute the whole file as one
    
    // Split SQL into statements, but keep CREATE OR REPLACE functions together
    const statements = migrationSQL
      .split(/;(?=\s*(?:CREATE|COMMENT|--|$))/i)
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith("--") && s !== "")

    console.log(`[Migration] Executing ${statements.length} SQL statements...`)

    // Execute SQL statements using tagged template literals
    // We'll parse the SQL file and execute each major statement
    console.log("[Migration] Executing migration statements...")
    
    // Create table
    await sql`
      CREATE TABLE IF NOT EXISTS admin_email_drafts (
        id SERIAL PRIMARY KEY,
        chat_id INTEGER,
        draft_name TEXT NOT NULL,
        subject_line TEXT NOT NULL,
        preview_text TEXT,
        body_html TEXT NOT NULL,
        body_text TEXT,
        email_type TEXT DEFAULT 'newsletter',
        campaign_name TEXT,
        target_segment TEXT,
        image_urls TEXT[],
        metadata JSONB DEFAULT '{}',
        version_number INTEGER DEFAULT 1,
        parent_draft_id INTEGER REFERENCES admin_email_drafts(id) ON DELETE SET NULL,
        status TEXT DEFAULT 'draft',
        is_current_version BOOLEAN DEFAULT true,
        created_by TEXT DEFAULT 'ssa@ssasocial.com',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `
    console.log("✅ Table created")

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_email_drafts_chat_id ON admin_email_drafts(chat_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_email_drafts_status ON admin_email_drafts(status)`
    await sql`CREATE INDEX IF NOT EXISTS idx_email_drafts_created_at ON admin_email_drafts(created_at DESC)`
    await sql`CREATE INDEX IF NOT EXISTS idx_email_drafts_parent_id ON admin_email_drafts(parent_draft_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_email_drafts_current_version ON admin_email_drafts(is_current_version) WHERE is_current_version = true`
    console.log("✅ Indexes created")

    // Create function
    await sql`
      CREATE OR REPLACE FUNCTION update_email_drafts_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `
    console.log("✅ Function created")

    // Drop trigger if exists (separate statement)
    try {
      await sql`DROP TRIGGER IF EXISTS email_drafts_updated_at ON admin_email_drafts`
    } catch (error: any) {
      // Ignore if trigger doesn't exist
      console.log("  (No existing trigger to drop)")
    }

    // Create trigger (separate statement)
    await sql`
      CREATE TRIGGER email_drafts_updated_at
      BEFORE UPDATE ON admin_email_drafts
      FOR EACH ROW
      EXECUTE FUNCTION update_email_drafts_updated_at()
    `
    console.log("✅ Trigger created")

    // Add comments
    await sql`COMMENT ON TABLE admin_email_drafts IS 'Stores email drafts with version history, similar to concept cards. Allows editing without losing previous versions.'`
    await sql`COMMENT ON COLUMN admin_email_drafts.parent_draft_id IS 'Links to previous version for version history tracking'`
    await sql`COMMENT ON COLUMN admin_email_drafts.is_current_version IS 'True for the latest version of a draft. Previous versions are kept for history.'`
    console.log("✅ Comments added")

    // Verify table was created
    console.log("\n[Migration] Verifying table creation...")
    const verify = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'admin_email_drafts'
      )
    `

    if (verify[0].exists) {
      console.log("✅ Migration completed successfully!")
      console.log("✅ Table 'admin_email_drafts' created successfully")
      
      // Check row count
      const rowCount = await sql`SELECT COUNT(*) as count FROM admin_email_drafts`
      console.log(`✅ Table has ${rowCount[0].count} rows`)
    } else {
      console.error("❌ Migration completed but table was not found!")
      process.exit(1)
    }
  } catch (error: any) {
    console.error("❌ Migration failed:", error.message)
    console.error(error)
    process.exit(1)
  }
}

runMigration()

