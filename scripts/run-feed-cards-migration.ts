/**
 * Run feed_cards column migration
 * This script:
 * 1. Adds feed_cards column to maya_chat_messages table
 * 2. Migrates existing data from styling_details to feed_cards
 * 3. Creates GIN index for performance
 */

import { neon } from "@neondatabase/serverless"
import fs from "fs"
import path from "path"
import dotenv from "dotenv"

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, "..", ".env.local") })

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required")
}

const sql = neon(process.env.DATABASE_URL)

async function runMigration() {
  console.log("📦 Running feed_cards column migration...\n")

  try {
    // Step 1: Add feed_cards column
    console.log("Step 1: Adding feed_cards column...")
    try {
      await sql`
        ALTER TABLE maya_chat_messages
        ADD COLUMN IF NOT EXISTS feed_cards JSONB
      `
      console.log("  ✅ Column added (or already exists)\n")
    } catch (error: any) {
      if (error.message.includes("already exists") || error.message.includes("duplicate")) {
        console.log("  ℹ️  Column already exists - skipping\n")
      } else {
        throw error
      }
    }

    // Step 2: Add comment
    console.log("Step 2: Adding column comment...")
    try {
      await sql`
        COMMENT ON COLUMN maya_chat_messages.feed_cards IS 'Feed cards data (similar to concept_cards). Previously stored in styling_details.'
      `
      console.log("  ✅ Comment added\n")
    } catch (error: any) {
      console.log("  ⚠️  Could not add comment (non-critical):", error.message.split("\n")[0], "\n")
    }

    // Step 3: Migrate existing data from styling_details to feed_cards
    console.log("Step 3: Migrating existing feed cards from styling_details...")
    try {
      const result = await sql`
        UPDATE maya_chat_messages
        SET feed_cards = styling_details
        WHERE styling_details IS NOT NULL
          AND styling_details::text LIKE '%"feedStrategy"%'
          AND feed_cards IS NULL
      `
      console.log(`  ✅ Migrated ${result.count || 0} feed cards from styling_details\n`)
    } catch (error: any) {
      console.error("  ❌ Error migrating data:", error.message.split("\n")[0])
      throw error
    }

    // Step 4: Create GIN index
    console.log("Step 4: Creating GIN index on feed_cards...")
    try {
      await sql`
        CREATE INDEX IF NOT EXISTS idx_maya_chat_messages_feed_cards 
        ON maya_chat_messages USING GIN (feed_cards)
        WHERE feed_cards IS NOT NULL
      `
      console.log("  ✅ Index created (or already exists)\n")
    } catch (error: any) {
      if (error.message.includes("already exists") || error.message.includes("duplicate")) {
        console.log("  ℹ️  Index already exists - skipping\n")
      } else {
        throw error
      }
    }

    // Step 5: Verify migration
    console.log("Step 5: Verifying migration...")
    const feedCardsCount = await sql`
      SELECT COUNT(*) as count
      FROM maya_chat_messages
      WHERE feed_cards IS NOT NULL
    `
    const count = feedCardsCount[0]?.count || 0
    console.log(`  ✅ Found ${count} messages with feed_cards\n`)

    // Check for remaining data in styling_details
    const remainingCount = await sql`
      SELECT COUNT(*) as count
      FROM maya_chat_messages
      WHERE styling_details IS NOT NULL
        AND styling_details::text LIKE '%"feedStrategy"%'
        AND feed_cards IS NULL
    `
    const remaining = remainingCount[0]?.count || 0

    if (remaining > 0) {
      console.log(`  ⚠️  Warning: ${remaining} feed cards still in styling_details (may need manual migration)`)
    } else {
      console.log("  ✅ All feed cards migrated successfully")
    }

    console.log("\n✅ Migration completed successfully!")
  } catch (error: any) {
    console.error("\n❌ Migration error:", error.message)
    console.error("Full error:", error)
    process.exit(1)
  }
}

runMigration()

