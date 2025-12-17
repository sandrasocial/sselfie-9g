import { neon } from "@neondatabase/serverless"
import { readFileSync } from "fs"
import { join } from "path"
import { config } from "dotenv"
import { resolve } from "path"

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), ".env.local") })

if (!process.env.DATABASE_URL) {
  console.error("[v0] ❌ DATABASE_URL not found in environment variables")
  console.error("[v0] Please make sure .env.local exists and contains DATABASE_URL")
  process.exit(1)
}

const sql = neon(process.env.DATABASE_URL)

async function runMigration() {
  try {
    console.log("[v0] Running migration: Add is_test flag to user_models")
    
    // Execute each statement individually
    console.log("[v0] Step 1: Adding is_test column...")
    try {
      await sql`
        ALTER TABLE user_models 
        ADD COLUMN IF NOT EXISTS is_test BOOLEAN DEFAULT false
      `
      console.log("[v0] ✓ Column added")
    } catch (err: any) {
      if (err.message?.includes("already exists") || err.code === "42701") {
        console.log("[v0] ⚠️  Column already exists (skipping)")
      } else {
        throw err
      }
    }

    console.log("[v0] Step 2: Creating index...")
    try {
      await sql`
        CREATE INDEX IF NOT EXISTS idx_user_models_is_test 
        ON user_models(user_id, is_test) 
        WHERE is_test = false
      `
      console.log("[v0] ✓ Index created")
    } catch (err: any) {
      if (err.message?.includes("already exists") || err.code === "42P07") {
        console.log("[v0] ⚠️  Index already exists (skipping)")
      } else {
        throw err
      }
    }

    console.log("[v0] Step 3: Updating existing rows...")
    const updateResult = await sql`
      UPDATE user_models 
      SET is_test = false 
      WHERE is_test IS NULL
    `
    console.log("[v0] ✓ Updated existing rows")

    console.log("[v0] Step 4: Adding comment...")
    try {
      await sql`
        COMMENT ON COLUMN user_models.is_test IS 
        'Flag to mark test models created through admin Maya testing. Production queries should filter these out.'
      `
      console.log("[v0] ✓ Comment added")
    } catch (err: any) {
      // Comments might fail in some setups, not critical
      console.log("[v0] ⚠️  Could not add comment (non-critical):", err.message)
    }

    console.log("[v0] ✅ Migration completed successfully!")
  } catch (error: any) {
    console.error("[v0] ❌ Migration failed:", error.message)
    console.error("[v0] Error code:", error.code)
    console.error("[v0] Error details:", error)
    process.exit(1)
  }
}

runMigration()
