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
  console.log("[Migration] 🚀 Starting: add-blueprint-usage-tracking")

  try {
    // Check if migration already applied
    const existing = await sql`
      SELECT version FROM schema_migrations 
      WHERE version = 'add-blueprint-usage-tracking'
    `

    if (existing.length > 0) {
      console.log("[Migration] ✅ Already applied, skipping...")
      return
    }

    console.log("[Migration] Step 1: Creating schema_migrations table if needed...")
    await sql`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `

    console.log("[Migration] Step 2: Adding usage tracking columns...")
    await sql`
      ALTER TABLE blueprint_subscribers
      ADD COLUMN IF NOT EXISTS free_grid_used_at TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS free_grid_used_count INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS paid_grids_generated INTEGER DEFAULT 0
    `

    console.log("[Migration] Step 3: Creating indexes...")
    await sql`
      CREATE INDEX IF NOT EXISTS idx_blueprint_subscribers_free_grid_used 
      ON blueprint_subscribers(user_id, free_grid_used_count)
      WHERE user_id IS NOT NULL
    `

    await sql`
      CREATE INDEX IF NOT EXISTS idx_blueprint_subscribers_paid_grids 
      ON blueprint_subscribers(user_id, paid_grids_generated)
      WHERE user_id IS NOT NULL AND paid_blueprint_purchased = TRUE
    `

    console.log("[Migration] Step 4: Recording migration...")
    await sql`
      INSERT INTO schema_migrations (version) 
      VALUES ('add-blueprint-usage-tracking')
      ON CONFLICT (version) DO NOTHING
    `

    console.log("[Migration] ✅ Successfully completed: add-blueprint-usage-tracking")
  } catch (error) {
    console.error("[Migration] ❌ Error running migration:", error)
    throw error
  }
}

// Run migration if this script is executed directly
runMigration()
  .then(() => {
    console.log("[Migration] ✨ Migration completed successfully")
    process.exit(0)
  })
  .catch((error) => {
    console.error("[Migration] 💥 Migration failed:", error)
    process.exit(1)
  })
