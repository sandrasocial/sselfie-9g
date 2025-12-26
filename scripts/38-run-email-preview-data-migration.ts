/**
 * Migration Script: Add email_preview_data column to admin_agent_messages
 * 
 * This script adds the email_preview_data JSONB column to store structured
 * email preview data (HTML, subject, preview text) from the compose_email tool.
 * 
 * Run with: npx tsx scripts/38-run-email-preview-data-migration.ts
 */

import { neon } from "@neondatabase/serverless"
import { config } from "dotenv"
import { join } from "path"
import { readFileSync } from "fs"

// Load environment variables
config({ path: join(process.cwd(), ".env.local") })
config({ path: join(process.cwd(), ".env") })

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error("[Migration] ❌ DATABASE_URL environment variable is not set")
  process.exit(1)
}

const sql = neon(databaseUrl)

async function runMigration() {
  console.log("[Migration] 🚀 Starting migration to add email_preview_data column...")

  try {
    // Step 1: Ensure admin_agent_chats table exists
    console.log("[Migration] Step 1: Ensuring admin_agent_chats table exists...")
    await sql`
      CREATE TABLE IF NOT EXISTS admin_agent_chats (
        id SERIAL PRIMARY KEY,
        admin_user_id TEXT NOT NULL,
        chat_title TEXT,
        agent_mode TEXT CHECK (agent_mode IS NULL OR agent_mode IN ('instagram', 'email', 'content', 'analytics', 'competitor', 'research')),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        last_activity TIMESTAMPTZ DEFAULT NOW()
      )
    `
    console.log("[Migration] ✅ Step 1 completed: admin_agent_chats table verified")

    // Step 2: Ensure admin_agent_messages table exists
    console.log("[Migration] Step 2: Ensuring admin_agent_messages table exists...")
    await sql`
      CREATE TABLE IF NOT EXISTS admin_agent_messages (
        id SERIAL PRIMARY KEY,
        chat_id INTEGER NOT NULL REFERENCES admin_agent_chats(id) ON DELETE CASCADE,
        role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `
    console.log("[Migration] ✅ Step 2 completed: admin_agent_messages table verified")

    // Step 3: Add email_preview_data column if it doesn't exist
    console.log("[Migration] Step 3: Adding email_preview_data column...")
    const columnCheck = await sql`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'admin_agent_messages' 
        AND column_name = 'email_preview_data'
      ) as exists
    `
    
    if (columnCheck[0]?.exists) {
      console.log("[Migration] ℹ️  Column email_preview_data already exists, skipping...")
    } else {
      await sql`
        ALTER TABLE admin_agent_messages 
        ADD COLUMN email_preview_data JSONB
      `
      
      await sql`
        COMMENT ON COLUMN admin_agent_messages.email_preview_data IS 
        'Structured email preview data from compose_email tool: {html, subjectLine, preview, readyToSend}'
      `
      console.log("[Migration] ✅ Step 3 completed: email_preview_data column added")
    }

    // Step 4: Create indexes for better performance
    console.log("[Migration] Step 4: Creating indexes...")
    await sql`
      CREATE INDEX IF NOT EXISTS idx_admin_agent_chats_user_id ON admin_agent_chats(admin_user_id)
    `
    await sql`
      CREATE INDEX IF NOT EXISTS idx_admin_agent_chats_last_activity ON admin_agent_chats(last_activity DESC)
    `
    await sql`
      CREATE INDEX IF NOT EXISTS idx_admin_agent_messages_chat_id ON admin_agent_messages(chat_id)
    `
    await sql`
      CREATE INDEX IF NOT EXISTS idx_admin_agent_messages_created_at ON admin_agent_messages(created_at)
    `
    console.log("[Migration] ✅ Step 4 completed: Indexes created")

    // Step 5: Verify the migration
    console.log("[Migration] Step 5: Verifying migration...")
    const verification = await sql`
      SELECT 
        column_name, 
        data_type, 
        is_nullable
      FROM information_schema.columns
      WHERE table_name = 'admin_agent_messages'
      AND column_name = 'email_preview_data'
    `
    
    if (verification.length > 0) {
      console.log("[Migration] ✅ Verification successful:")
      console.log("[Migration]   Column:", verification[0].column_name)
      console.log("[Migration]   Type:", verification[0].data_type)
      console.log("[Migration]   Nullable:", verification[0].is_nullable)
    } else {
      console.log("[Migration] ⚠️  Warning: Column not found after migration")
    }

    console.log("[Migration] 🎉 Migration completed successfully!")
    return true
  } catch (error: any) {
    console.error("[Migration] ❌ Migration failed:", error)
    console.error("[Migration] Error details:", {
      message: error?.message,
      code: error?.code,
      detail: error?.detail
    })
    throw error
  }
}

// Run the migration
runMigration()
  .then(() => {
    console.log("[Migration] ✅ Migration script completed")
    process.exit(0)
  })
  .catch((error) => {
    console.error("[Migration] ❌ Migration script failed:", error)
    process.exit(1)
  })





