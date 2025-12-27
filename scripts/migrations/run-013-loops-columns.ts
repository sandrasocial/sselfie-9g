/**
 * Migration Script: Add Loops contact tracking columns
 * 
 * This script adds loops_contact_id, synced_to_loops, and loops_synced_at
 * columns to freebie_subscribers and blueprint_subscribers tables.
 * 
 * Run with: npx tsx scripts/migrations/run-013-loops-columns.ts
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
  console.log("[Migration] 🚀 Starting migration to add Loops contact tracking columns...")

  try {
    // ============================================================
    // FREEBIE_SUBSCRIBERS
    // ============================================================
    console.log("[Migration] Step 1: Adding columns to freebie_subscribers...")
    
    // Check if columns already exist
    const freebieCheck = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'freebie_subscribers'
      AND column_name IN ('loops_contact_id', 'synced_to_loops', 'loops_synced_at')
    `
    
    if (freebieCheck.length === 3) {
      console.log("[Migration] ℹ️  Loops columns already exist in freebie_subscribers, skipping...")
    } else {
      // Add loops_contact_id
      await sql`
        ALTER TABLE freebie_subscribers
        ADD COLUMN IF NOT EXISTS loops_contact_id VARCHAR(255)
      `
      
      // Add synced_to_loops
      await sql`
        ALTER TABLE freebie_subscribers
        ADD COLUMN IF NOT EXISTS synced_to_loops BOOLEAN DEFAULT false
      `
      
      // Add loops_synced_at
      await sql`
        ALTER TABLE freebie_subscribers
        ADD COLUMN IF NOT EXISTS loops_synced_at TIMESTAMP
      `
      
      console.log("[Migration] ✅ Step 1 completed: Columns added to freebie_subscribers")
    }

    // Create indexes for freebie_subscribers
    console.log("[Migration] Step 2: Creating indexes for freebie_subscribers...")
    await sql`
      CREATE INDEX IF NOT EXISTS idx_freebie_loops_contact
      ON freebie_subscribers(loops_contact_id)
    `
    await sql`
      CREATE INDEX IF NOT EXISTS idx_freebie_loops_synced
      ON freebie_subscribers(synced_to_loops)
      WHERE synced_to_loops = false
    `
    console.log("[Migration] ✅ Step 2 completed: Indexes created for freebie_subscribers")

    // ============================================================
    // BLUEPRINT_SUBSCRIBERS
    // ============================================================
    console.log("[Migration] Step 3: Adding columns to blueprint_subscribers...")
    
    // Check if columns already exist
    const blueprintCheck = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'blueprint_subscribers'
      AND column_name IN ('loops_contact_id', 'synced_to_loops', 'loops_synced_at')
    `
    
    if (blueprintCheck.length === 3) {
      console.log("[Migration] ℹ️  Loops columns already exist in blueprint_subscribers, skipping...")
    } else {
      // Add loops_contact_id
      await sql`
        ALTER TABLE blueprint_subscribers
        ADD COLUMN IF NOT EXISTS loops_contact_id VARCHAR(255)
      `
      
      // Add synced_to_loops
      await sql`
        ALTER TABLE blueprint_subscribers
        ADD COLUMN IF NOT EXISTS synced_to_loops BOOLEAN DEFAULT false
      `
      
      // Add loops_synced_at
      await sql`
        ALTER TABLE blueprint_subscribers
        ADD COLUMN IF NOT EXISTS loops_synced_at TIMESTAMP
      `
      
      console.log("[Migration] ✅ Step 3 completed: Columns added to blueprint_subscribers")
    }

    // Create indexes for blueprint_subscribers
    console.log("[Migration] Step 4: Creating indexes for blueprint_subscribers...")
    await sql`
      CREATE INDEX IF NOT EXISTS idx_blueprint_loops_contact
      ON blueprint_subscribers(loops_contact_id)
    `
    await sql`
      CREATE INDEX IF NOT EXISTS idx_blueprint_loops_synced
      ON blueprint_subscribers(synced_to_loops)
      WHERE synced_to_loops = false
    `
    console.log("[Migration] ✅ Step 4 completed: Indexes created for blueprint_subscribers")

    // Add comments
    console.log("[Migration] Step 5: Adding column comments...")
    await sql`
      COMMENT ON COLUMN freebie_subscribers.loops_contact_id IS 'Loops platform contact ID for marketing emails'
    `
    await sql`
      COMMENT ON COLUMN freebie_subscribers.synced_to_loops IS 'Whether contact has been synced to Loops'
    `
    await sql`
      COMMENT ON COLUMN freebie_subscribers.loops_synced_at IS 'Timestamp when contact was synced to Loops'
    `
    await sql`
      COMMENT ON COLUMN blueprint_subscribers.loops_contact_id IS 'Loops platform contact ID for marketing emails'
    `
    await sql`
      COMMENT ON COLUMN blueprint_subscribers.synced_to_loops IS 'Whether contact has been synced to Loops'
    `
    await sql`
      COMMENT ON COLUMN blueprint_subscribers.loops_synced_at IS 'Timestamp when contact was synced to Loops'
    `
    console.log("[Migration] ✅ Step 5 completed: Comments added")

    // ============================================================
    // VERIFICATION
    // ============================================================
    console.log("[Migration] Step 6: Verifying migration...")
    const freebieVerification = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'freebie_subscribers'
      AND column_name IN ('loops_contact_id', 'synced_to_loops', 'loops_synced_at')
      ORDER BY column_name
    `
    
    const blueprintVerification = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'blueprint_subscribers'
      AND column_name IN ('loops_contact_id', 'synced_to_loops', 'loops_synced_at')
      ORDER BY column_name
    `
    
    console.log("\n[Migration] 📊 Verification Results:")
    console.log("\nfreebie_subscribers:")
    if (freebieVerification.length > 0) {
      console.table(freebieVerification)
    } else {
      console.log("  ⚠️  No Loops columns found")
    }
    
    console.log("\nblueprint_subscribers:")
    if (blueprintVerification.length > 0) {
      console.table(blueprintVerification)
    } else {
      console.log("  ⚠️  No Loops columns found")
    }
    
    if (freebieVerification.length === 3 && blueprintVerification.length === 3) {
      console.log("\n[Migration] ✅ Verification successful: All 6 columns found (3 per table)")
    } else {
      console.log(`\n[Migration] ⚠️  Warning: Expected 3 columns per table. Found: freebie=${freebieVerification.length}, blueprint=${blueprintVerification.length}`)
    }

    console.log("\n[Migration] 🎉 Migration completed successfully!")
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

