/**
 * Migration: Add Blueprint Generation Tracking
 * 
 * Adds columns to blueprint_subscribers table to track:
 * - Strategy generation (one-time limit)
 * - Grid generation (one-time limit)
 * - Generated data storage
 * 
 * Safe to run multiple times (uses IF NOT EXISTS)
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
  console.log("[Migration] 🚀 Starting: add-blueprint-generation-tracking")

  try {
    // Check if migration already applied
    const existing = await sql`
      SELECT version FROM schema_migrations 
      WHERE version = 'add-blueprint-generation-tracking'
    `

    if (existing.length > 0) {
      console.log("[Migration] ✅ Already applied, skipping...")
      return
    }

    // Create schema_migrations table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `

    console.log("[Migration] Step 1: Adding columns to blueprint_subscribers...")

    // Add strategy tracking columns
    await sql`
      ALTER TABLE blueprint_subscribers
      ADD COLUMN IF NOT EXISTS strategy_generated BOOLEAN DEFAULT FALSE
    `
    await sql`
      ALTER TABLE blueprint_subscribers
      ADD COLUMN IF NOT EXISTS strategy_generated_at TIMESTAMP WITH TIME ZONE
    `
    await sql`
      ALTER TABLE blueprint_subscribers
      ADD COLUMN IF NOT EXISTS strategy_data JSONB
    `

    // Add grid tracking columns
    await sql`
      ALTER TABLE blueprint_subscribers
      ADD COLUMN IF NOT EXISTS grid_generated BOOLEAN DEFAULT FALSE
    `
    await sql`
      ALTER TABLE blueprint_subscribers
      ADD COLUMN IF NOT EXISTS grid_generated_at TIMESTAMP WITH TIME ZONE
    `
    await sql`
      ALTER TABLE blueprint_subscribers
      ADD COLUMN IF NOT EXISTS grid_url TEXT
    `
    await sql`
      ALTER TABLE blueprint_subscribers
      ADD COLUMN IF NOT EXISTS grid_frame_urls JSONB
    `
    await sql`
      ALTER TABLE blueprint_subscribers
      ADD COLUMN IF NOT EXISTS grid_prediction_id TEXT
    `

    // Add selfie image URLs column
    await sql`
      ALTER TABLE blueprint_subscribers
      ADD COLUMN IF NOT EXISTS selfie_image_urls JSONB
    `

    console.log("[Migration] ✅ Step 1 completed: Columns added")

    // Create indexes
    console.log("[Migration] Step 2: Creating indexes...")

    await sql`
      CREATE INDEX IF NOT EXISTS idx_blueprint_strategy_generated 
      ON blueprint_subscribers(strategy_generated, strategy_generated_at)
    `
    await sql`
      CREATE INDEX IF NOT EXISTS idx_blueprint_grid_generated 
      ON blueprint_subscribers(grid_generated, grid_generated_at)
    `
    await sql`
      CREATE INDEX IF NOT EXISTS idx_blueprint_email_strategy 
      ON blueprint_subscribers(email, strategy_generated) 
      WHERE strategy_generated = FALSE
    `
    await sql`
      CREATE INDEX IF NOT EXISTS idx_blueprint_email_grid 
      ON blueprint_subscribers(email, grid_generated) 
      WHERE grid_generated = FALSE
    `

    console.log("[Migration] ✅ Step 2 completed: Indexes created")

    // Record migration
    await sql`
      INSERT INTO schema_migrations (version) 
      VALUES ('add-blueprint-generation-tracking')
      ON CONFLICT (version) DO NOTHING
    `

    // Verify columns were added
    const columns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'blueprint_subscribers' 
      AND column_name IN (
        'strategy_generated', 
        'strategy_generated_at', 
        'strategy_data',
        'grid_generated',
        'grid_generated_at',
        'grid_url',
        'grid_frame_urls',
        'grid_prediction_id',
        'selfie_image_urls'
      )
      ORDER BY column_name
    `

    console.log(`[Migration] ✅ Verification: Found ${columns.length} columns:`)
    columns.forEach((col: any) => {
      console.log(`  - ${col.column_name} (${col.data_type})`)
    })

    // Verify indexes
    const indexes = await sql`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'blueprint_subscribers' 
      AND indexname LIKE 'idx_blueprint_%'
      ORDER BY indexname
    `

    console.log(`[Migration] ✅ Verification: Found ${indexes.length} indexes:`)
    indexes.forEach((idx: any) => {
      console.log(`  - ${idx.indexname}`)
    })

    console.log("[Migration] ✅ Migration completed successfully!")
  } catch (error) {
    console.error("[Migration] ❌ Error:", error)
    throw error
  }
}

// Run if called directly
if (require.main === module) {
  runMigration()
    .then(() => {
      console.log("[Migration] Done")
      process.exit(0)
    })
    .catch((error) => {
      console.error("[Migration] Failed:", error)
      process.exit(1)
    })
}

export { runMigration }
