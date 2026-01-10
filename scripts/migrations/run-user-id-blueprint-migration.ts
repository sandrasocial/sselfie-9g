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
  console.log("[Migration] 🚀 Starting: add-user-id-to-blueprint-subscribers")

  try {
    // Check if migration already applied
    const existing = await sql`
      SELECT version FROM schema_migrations 
      WHERE version = 'add-user-id-to-blueprint-subscribers'
    `

    if (existing.length > 0) {
      console.log("[Migration] ✅ Already applied, skipping...")
      return
    }

    console.log("[Migration] Step 1: Creating schema_migrations table if needed...")
    // Create schema_migrations table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `

    console.log("[Migration] Step 2: Adding user_id column to blueprint_subscribers...")
    // Add user_id column to blueprint_subscribers
    await sql`
      ALTER TABLE blueprint_subscribers
      ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES users(id) ON DELETE CASCADE
    `

    console.log("[Migration] Step 3: Creating index for user_id...")
    // Create index for faster lookups by user_id
    await sql`
      CREATE INDEX IF NOT EXISTS idx_blueprint_subscribers_user_id 
      ON blueprint_subscribers(user_id)
      WHERE user_id IS NOT NULL
    `

    console.log("[Migration] Step 4: Recording migration...")
    // Record migration
    await sql`
      INSERT INTO schema_migrations (version) 
      VALUES ('add-user-id-to-blueprint-subscribers')
      ON CONFLICT (version) DO NOTHING
    `

    console.log("[Migration] ✅ Successfully completed: add-user-id-to-blueprint-subscribers")
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
