/**
 * Migration Script: Add 'prompt_builder' as valid chat_type value
 * 
 * This script runs the SQL migration to update the maya_chats table
 * to allow 'prompt_builder' as a valid chat_type value alongside existing values.
 * 
 * Run with: npx tsx scripts/39-run-prompt-builder-chat-type-migration.ts
 */

import { neon } from "@neondatabase/serverless"
import { config } from "dotenv"
import { join } from "path"

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
  console.log("[Migration] Starting migration to add 'prompt_builder' chat_type...")

  try {
    // Step 1: Drop the existing constraint if it exists
    console.log("[Migration] Step 1: Dropping existing constraint if it exists...")
    await sql`
      DO $$ 
      BEGIN
        IF EXISTS (
          SELECT 1 
          FROM pg_constraint 
          WHERE conname = 'maya_chats_chat_type_check'
        ) THEN
          ALTER TABLE maya_chats DROP CONSTRAINT maya_chats_chat_type_check;
          RAISE NOTICE 'Dropped existing chat_type constraint';
        END IF;
      END $$;
    `
    console.log("[Migration] ✅ Step 1 completed")

    // Step 2: Add new constraint that includes 'prompt_builder'
    console.log("[Migration] Step 2: Adding new constraint with 'prompt_builder' value...")
    await sql`
      ALTER TABLE maya_chats 
      ADD CONSTRAINT maya_chats_chat_type_check 
      CHECK (chat_type IN ('maya', 'feed-designer', 'pro', 'prompt_builder'));
    `
    console.log("[Migration] ✅ Step 2 completed")

    // Step 3: Update the comment
    console.log("[Migration] Step 3: Updating column comment...")
    await sql`
      COMMENT ON COLUMN maya_chats.chat_type IS 'Type of chat: maya (regular Maya conversations), feed-designer (Instagram feed design chats), pro (Studio Pro mode chats), or prompt_builder (Admin Prompt Builder chats)';
    `
    console.log("[Migration] ✅ Step 3 completed")

    console.log("[Migration] ✅ Successfully updated chat_type constraint to include 'prompt_builder'")
    console.log("[Migration] ✅ Migration completed successfully!")

    // Verify the constraint was updated
    console.log("[Migration] Verifying constraint...")
    const constraintCheck = await sql`
      SELECT 
        conname,
        pg_get_constraintdef(oid) as definition
      FROM pg_constraint
      WHERE conname = 'maya_chats_chat_type_check'
    ` as any[]

    if (constraintCheck.length > 0) {
      console.log("[Migration] ✅ Verified constraint exists:")
      console.log(`[Migration]    ${constraintCheck[0].definition}`)
    } else {
      console.warn("[Migration] ⚠️  Warning: Could not verify constraint (it may have a different name)")
    }
  } catch (error: any) {
    console.error("[Migration] ❌ Migration failed:", error.message)
    if (error.stack) {
      console.error("[Migration] Stack trace:", error.stack)
    }
    throw error
  }
}

// Run the migration
runMigration()
  .then(() => {
    console.log("[Migration] Migration script completed")
    process.exit(0)
  })
  .catch((error) => {
    console.error("[Migration] Migration script failed:", error)
    process.exit(1)
  })









