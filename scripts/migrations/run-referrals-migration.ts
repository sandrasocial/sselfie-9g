import { neon } from "@neondatabase/serverless"
import { config } from "dotenv"
import { join } from "path"
import * as fs from "fs"

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
  console.log("[Migration] 🚀 Starting: create-referrals-table")

  try {
    // Check if migration already applied
    const existing = await sql`
      SELECT version FROM schema_migrations 
      WHERE version = 'create-referrals-table'
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

    console.log("[Migration] Step 1: Creating referrals table...")

    // Create referrals table
    await sql`
      CREATE TABLE IF NOT EXISTS referrals (
        id SERIAL PRIMARY KEY,
        referrer_id VARCHAR REFERENCES users(id) ON DELETE CASCADE,
        referred_id VARCHAR REFERENCES users(id) ON DELETE CASCADE,
        referral_code VARCHAR(50) UNIQUE NOT NULL,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
        credits_awarded_referrer INTEGER DEFAULT 0,
        credits_awarded_referred INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        completed_at TIMESTAMP WITH TIME ZONE,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `

    console.log("[Migration] Step 2: Creating indexes...")

    // Create indexes
    await sql`
      CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id)
    `
    await sql`
      CREATE INDEX IF NOT EXISTS idx_referrals_referred_id ON referrals(referred_id)
    `
    await sql`
      CREATE INDEX IF NOT EXISTS idx_referrals_referral_code ON referrals(referral_code)
    `
    await sql`
      CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status)
    `

    console.log("[Migration] Step 3: Adding referral_code column to users table...")

    // Add referral_code column to users table
    await sql`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code VARCHAR(50) UNIQUE
    `

    await sql`
      CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code)
    `

    console.log("[Migration] Step 4: Creating updated_at trigger...")

    // Create updated_at trigger
    await sql`
      CREATE OR REPLACE FUNCTION update_referrals_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `

    await sql`
      DROP TRIGGER IF EXISTS referrals_updated_at ON referrals
    `

    await sql`
      CREATE TRIGGER referrals_updated_at
      BEFORE UPDATE ON referrals
      FOR EACH ROW
      EXECUTE FUNCTION update_referrals_updated_at()
    `

    console.log("[Migration] Step 5: Recording migration...")

    // Record migration
    await sql`
      INSERT INTO schema_migrations (version) 
      VALUES ('create-referrals-table')
      ON CONFLICT (version) DO NOTHING
    `

    // Verify table was created
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'referrals'
      )
    `

    if (tableExists[0]?.exists) {
      console.log("[Migration] ✅ Verification: referrals table exists")
    } else {
      throw new Error("Referrals table was not created")
    }

    // Verify columns
    const columns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'referrals' 
      ORDER BY column_name
    `

    console.log(`[Migration] ✅ Verification: Found ${columns.length} columns in referrals table:`)
    columns.forEach((col: any) => {
      console.log(`  - ${col.column_name} (${col.data_type})`)
    })

    // Verify users.referral_code column
    const userColumn = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'referral_code'
    `

    if (userColumn.length > 0) {
      console.log("[Migration] ✅ Verification: users.referral_code column exists")
    } else {
      console.log("[Migration] ⚠️ Warning: users.referral_code column not found")
    }

    console.log("[Migration] ✅ Migration completed successfully!")
  } catch (error) {
    console.error("[Migration] ❌ Error:", error)
    throw error
  }
}

runMigration()
  .then(() => {
    console.log("[Migration] Done!")
    process.exit(0)
  })
  .catch((error) => {
    console.error("[Migration] Failed:", error)
    process.exit(1)
  })
