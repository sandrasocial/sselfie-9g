/**
 * Run strategy document migrations
 * This script:
 * 1. Adds strategy_document column to feed_strategy table
 * 2. Migrates existing strategy documents from feed_layouts.description
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

async function runMigrations() {
  console.log("📦 Running strategy document migrations...\n")

  try {
    // Step 1: Add strategy_document column
    console.log("Step 1: Adding strategy_document column...")
    try {
      await sql`
        ALTER TABLE feed_strategy 
        ADD COLUMN IF NOT EXISTS strategy_document TEXT
      `
      console.log("  ✅ Column added (or already exists)\n")
    } catch (error: any) {
      if (error.message.includes("already exists") || error.message.includes("duplicate")) {
        console.log("  ℹ️  Column already exists - skipping\n")
      } else {
        throw error
      }
    }

    // Step 2: Add unique constraint (will fail if exists, which is fine)
    console.log("Step 2: Adding unique constraint on feed_layout_id...")
    try {
      await sql`
        ALTER TABLE feed_strategy 
        ADD CONSTRAINT feed_strategy_feed_layout_id_unique 
        UNIQUE (feed_layout_id)
      `
      console.log("  ✅ Unique constraint added\n")
    } catch (error: any) {
      if (error.message.includes("already exists") || error.message.includes("duplicate")) {
        console.log("  ℹ️  Constraint already exists - skipping\n")
      } else {
        throw error
      }
    }

    // Step 3: Add comment
    console.log("Step 3: Adding column comment...")
    try {
      await sql`
        COMMENT ON COLUMN feed_strategy.strategy_document IS 'Full markdown strategy document. Should not be stored in feed_layouts.description to avoid showing in chat feed cards.'
      `
      console.log("  ✅ Comment added\n")
    } catch (error: any) {
      console.log("  ⚠️  Could not add comment (non-critical):", error.message.split("\n")[0], "\n")
    }

    // Step 4: Migrate existing strategy documents
    console.log("Step 4: Migrating existing strategy documents...")
    const feedsWithStrategies = await sql`
      SELECT 
        fl.id as feed_id,
        fl.user_id,
        fl.description
      FROM feed_layouts fl
      WHERE fl.description IS NOT NULL
        AND LENGTH(fl.description) > 500
        AND fl.description ~ '^#{1,3}\s'
        AND NOT EXISTS (
          SELECT 1 FROM feed_strategy fs
          WHERE fs.feed_layout_id = fl.id
          AND fs.strategy_document IS NOT NULL
        )
    `

    console.log(`  Found ${feedsWithStrategies.length} feeds with strategy documents to migrate`)

    let migratedCount = 0
    for (const feed of feedsWithStrategies) {
      try {
        // Check if strategy already exists
        const [existing] = await sql`
          SELECT id FROM feed_strategy
          WHERE feed_layout_id = ${feed.feed_id}
          LIMIT 1
        `

        if (existing) {
          // Update existing strategy
          await sql`
            UPDATE feed_strategy
            SET strategy_document = ${feed.description},
                updated_at = NOW(),
                is_active = true
            WHERE feed_layout_id = ${feed.feed_id}
          `
        } else {
          // Insert new strategy
          await sql`
            INSERT INTO feed_strategy (user_id, feed_layout_id, strategy_document, is_active)
            VALUES (${feed.user_id}, ${feed.feed_id}, ${feed.description}, true)
          `
        }

        // Clear description field
        await sql`
          UPDATE feed_layouts
          SET description = NULL,
              updated_at = NOW()
          WHERE id = ${feed.feed_id}
        `

        migratedCount++
      } catch (error: any) {
        console.error(`  ⚠️  Failed to migrate feed ${feed.feed_id}:`, error.message.split("\n")[0])
      }
    }

    console.log(`  ✅ Migrated ${migratedCount} strategy documents\n`)

    // Step 5: Verify migration
    console.log("Step 5: Verifying migration...")
    const remaining = await sql`
      SELECT COUNT(*) as count
      FROM feed_layouts
      WHERE description IS NOT NULL
        AND LENGTH(description) > 500
        AND description ~ '^#{1,3}\s'
    `
    const remainingCount = remaining[0]?.count || 0

    if (remainingCount > 0) {
      console.log(`  ⚠️  Warning: ${remainingCount} strategy documents still in description field`)
    } else {
      console.log("  ✅ All strategy documents migrated successfully")
    }

    console.log("\n✅ All migrations completed!")
  } catch (error: any) {
    console.error("\n❌ Migration error:", error.message)
    console.error("Full error:", error)
    process.exit(1)
  }
}

runMigrations()

