/**
 * Migration: Add display_color column to feed_layouts
 * Run this script to add the display_color column for feed organization
 */

import * as dotenv from 'dotenv'
import { neon } from "@neondatabase/serverless"

// Load environment variables
dotenv.config({ path: '.env.local' })

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required")
}

const sql = neon(process.env.DATABASE_URL)

async function runMigration() {
  console.log("[MIGRATION] ==================== ADDING display_color COLUMN ====================")
  console.log("[MIGRATION] Adding display_color column to feed_layouts table...")

  try {
    // Add the column
    await sql`
      ALTER TABLE feed_layouts
      ADD COLUMN IF NOT EXISTS display_color VARCHAR(7)
    `

    // Add comment
    await sql`
      COMMENT ON COLUMN feed_layouts.display_color IS 'Hex color code for visual feed organization (e.g., #ec4899)'
    `

    console.log("[MIGRATION] ✅ Column added successfully!")

    // Verify the migration
    const columnInfo = await sql`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'feed_layouts'
      AND column_name = 'display_color'
    `

    if (columnInfo.length > 0) {
      const col = columnInfo[0]
      console.log(`[MIGRATION] ✅ Verification successful:`)
      console.log(`[MIGRATION]   - Column: ${col.column_name}`)
      console.log(`[MIGRATION]   - Type: ${col.data_type}(${col.character_maximum_length || 'N/A'})`)
    } else {
      console.warn("[MIGRATION] ⚠️  Column not found after migration - this may indicate an issue")
    }

    console.log("[MIGRATION] ✅ Migration completed successfully!")
  } catch (error) {
    console.error("[MIGRATION] ❌ Migration failed:", error)
    throw error
  }
}

runMigration()
  .then(() => {
    console.log("[MIGRATION] Migration script completed")
    process.exit(0)
  })
  .catch((error) => {
    console.error("[MIGRATION] Migration script failed:", error)
    process.exit(1)
  })

