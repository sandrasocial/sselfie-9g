/**
 * Migration: Ensure all required columns exist for Feed Planner
 * Run this script to add missing columns to feed_layouts and feed_posts tables
 */

import * as dotenv from 'dotenv'
import { neon } from "@neondatabase/serverless"
import { readFileSync } from "fs"
import { join } from "path"

// Load environment variables
dotenv.config({ path: '.env.local' })

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required")
}

const sql = neon(process.env.DATABASE_URL)

async function runMigration() {
  console.log("[FEED-PLANNER] ==================== RUNNING FEED PLANNER COLUMNS MIGRATION ====================")
  console.log("[FEED-PLANNER] Ensuring all required columns exist for feed_layouts and feed_posts tables...")

  try {
    // Read the migration SQL file
    const migrationPath = join(process.cwd(), "migrations", "ensure-feed-planner-columns.sql")
    const migrationSQL = readFileSync(migrationPath, "utf-8")

    console.log("[FEED-PLANNER] Migration SQL loaded, executing...")

    // Handle DO blocks separately (they contain $$ which breaks simple splitting)
    // Extract DO blocks first
    const doBlockRegex = /DO \$\$[\s\S]*?\$\$;/g
    const doBlocks: string[] = []
    let processedSQL = migrationSQL
    
    let match
    while ((match = doBlockRegex.exec(migrationSQL)) !== null) {
      doBlocks.push(match[0])
      processedSQL = processedSQL.replace(match[0], `-- DO_BLOCK_PLACEHOLDER_${doBlocks.length - 1}`)
    }

    // Split remaining SQL into individual statements
    const statements = processedSQL
      .split(";")
      .map((s) => s.trim())
      .filter((s) => {
        // Filter out empty statements and comment-only lines
        const cleaned = s.replace(/--.*$/gm, "").trim()
        return cleaned.length > 0 && !cleaned.startsWith("--") && !cleaned.match(/^-- DO_BLOCK_PLACEHOLDER/)
      })

    // Execute regular statements
    for (const statement of statements) {
      if (statement) {
        console.log(`[FEED-PLANNER] Executing: ${statement.substring(0, 100).replace(/\n/g, " ")}...`)
        await sql.query(statement + ";")
      }
    }

    // Execute DO blocks
    for (let i = 0; i < doBlocks.length; i++) {
      console.log(`[FEED-PLANNER] Executing DO block ${i + 1}...`)
      await sql.query(doBlocks[i])
    }

    console.log("[FEED-PLANNER] ✅ Migration completed successfully!")
    console.log("[FEED-PLANNER] Added/verified columns for feed_layouts:")
    console.log("[FEED-PLANNER]   - username, brand_name, business_type, brand_vibe")
    console.log("[FEED-PLANNER]   - layout_type, visual_rhythm, feed_story, color_palette, status")
    console.log("[FEED-PLANNER] Added/verified columns for feed_posts:")
    console.log("[FEED-PLANNER]   - content_pillar, post_status, generation_mode, pro_mode_type")

    // Verify the migration
    const feedLayoutsColumns = await sql`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'feed_layouts'
      AND column_name IN ('username', 'brand_name', 'business_type', 'brand_vibe', 'visual_rhythm', 'feed_story', 'color_palette')
      ORDER BY column_name
    `

    const feedPostsColumns = await sql`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'feed_posts'
      AND column_name IN ('content_pillar', 'post_status', 'generation_mode', 'pro_mode_type')
      ORDER BY column_name
    `

    console.log("\n[FEED-PLANNER] Verification - feed_layouts columns:")
    for (const col of feedLayoutsColumns) {
      console.log(`[FEED-PLANNER]   ✓ ${col.column_name}: ${col.data_type} (default: ${col.column_default || "NULL"})`)
    }

    console.log("\n[FEED-PLANNER] Verification - feed_posts columns:")
    for (const col of feedPostsColumns) {
      console.log(`[FEED-PLANNER]   ✓ ${col.column_name}: ${col.data_type} (default: ${col.column_default || "NULL"})`)
    }

    console.log("\n[FEED-PLANNER] ✅ Migration verified successfully!")
  } catch (error) {
    console.error("[FEED-PLANNER] ❌ Migration failed:", error)
    throw error
  }
}

runMigration()
  .then(() => {
    console.log("[FEED-PLANNER] Migration script completed")
    process.exit(0)
  })
  .catch((error) => {
    console.error("[FEED-PLANNER] Migration script failed:", error)
    process.exit(1)
  })

