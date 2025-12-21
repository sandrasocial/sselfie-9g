/**
 * Migration Script: Add 'pro' as valid chat_type value
 * 
 * This script runs the SQL migration to update the maya_chats table
 * to allow 'pro' as a valid chat_type value alongside 'maya' and 'feed-designer'.
 * 
 * Run with: npx tsx scripts/38-run-pro-chat-type-migration.ts
 */

import { neon } from "@neondatabase/serverless"

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required")
}

const sql = neon(process.env.DATABASE_URL)

async function runMigration() {
  console.log("[Migration] Starting migration to add 'pro' chat_type...")

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

    // Step 2: Add new constraint that includes 'pro'
    console.log("[Migration] Step 2: Adding new constraint with 'pro' value...")
    await sql`
      ALTER TABLE maya_chats 
      ADD CONSTRAINT maya_chats_chat_type_check 
      CHECK (chat_type IN ('maya', 'feed-designer', 'pro'));
    `
    console.log("[Migration] ✅ Step 2 completed")

    // Step 3: Update the comment
    console.log("[Migration] Step 3: Updating column comment...")
    await sql`
      COMMENT ON COLUMN maya_chats.chat_type IS 'Type of chat: maya (regular Maya conversations), feed-designer (Instagram feed design chats), or pro (Studio Pro mode chats)';
    `
    console.log("[Migration] ✅ Step 3 completed")

    console.log("[Migration] ✅ Successfully updated chat_type constraint to include 'pro'")
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
