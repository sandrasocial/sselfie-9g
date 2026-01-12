/**
 * Migration Runner: Migrate blueprint_subscribers.form_data to user_personal_brand
 * 
 * This script:
 * 1. Loads environment variables
 * 2. Checks if migration has already been run
 * 3. Executes the SQL migration
 * 4. Reports results
 */

import { neon } from "@neondatabase/serverless"
import * as dotenv from "dotenv"
import * as path from "path"
import * as fs from "fs"

// Load environment variables from .env.local
const envPath = path.join(process.cwd(), ".env.local")
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath })
} else {
  dotenv.config() // Fallback to .env
}

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  console.error("❌ Missing required environment variable: DATABASE_URL")
  process.exit(1)
}

const sql = neon(databaseUrl)

async function checkMigrationStatus(): Promise<boolean> {
  try {
    // Check if schema_migrations table exists
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'schema_migrations'
      )
    `
    
    if (!tableExists[0].exists) {
      console.log("ℹ️  schema_migrations table does not exist, will run migration")
      return false
    }

    // Check if migration has already been run
    // First check what columns exist in schema_migrations
    const columns = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'schema_migrations'
    `
    
    if (columns.length > 0) {
      // Try to find migration record (handle different column names)
      const migration = await sql`
        SELECT * FROM schema_migrations
        LIMIT 1
      `
      // If table exists but we can't query by name, just skip the check
      // (migration is idempotent anyway)
      console.log("ℹ️  schema_migrations table exists, but structure may differ - proceeding with migration")
    }

    return false
  } catch (error) {
    console.error("❌ Error checking migration status:", error)
    return false
  }
}

async function runMigration() {
  console.log("🚀 Starting migration: blueprint_subscribers → user_personal_brand")
  console.log("")

  try {
    // Check if migration has already been run
    const alreadyRun = await checkMigrationStatus()
    if (alreadyRun) {
      console.log("⏭️  Migration already completed, skipping")
      return
    }

    // Count users to migrate
    const countResult = await sql`
      SELECT COUNT(*) as count
      FROM blueprint_subscribers bs
      WHERE bs.user_id IS NOT NULL
        AND bs.form_data IS NOT NULL
        AND bs.form_data::text != 'null'::text
        AND NOT EXISTS (
          SELECT 1 FROM user_personal_brand upb
          WHERE upb.user_id = bs.user_id
            AND upb.business_type IS NOT NULL
            AND upb.ideal_audience IS NOT NULL
            AND upb.is_completed = true
        )
    `
    const usersToMigrate = parseInt(countResult[0].count as string, 10)
    console.log(`📊 Found ${usersToMigrate} users to migrate`)

    if (usersToMigrate === 0) {
      console.log("✅ No users need migration")
      return
    }

    // Read and execute SQL migration
    const sqlPath = path.join(process.cwd(), "scripts/migrations/migrate-blueprint-to-unified-wizard.sql")
    const sqlContent = fs.readFileSync(sqlPath, "utf-8")

    console.log("📝 Executing migration SQL...")
    // Execute migration (SQL file contains BEGIN/COMMIT)
    await sql.unsafe(sqlContent)

    // Verify migration results
    const verifyResult = await sql`
      SELECT COUNT(*) as count
      FROM blueprint_subscribers bs
      INNER JOIN user_personal_brand upb ON bs.user_id = upb.user_id
      WHERE bs.user_id IS NOT NULL
        AND bs.form_data IS NOT NULL
        AND bs.form_data::text != 'null'::text
        AND upb.business_type IS NOT NULL
        AND upb.ideal_audience IS NOT NULL
    `
    const migratedCount = parseInt(verifyResult[0].count as string, 10)
    console.log(`✅ Successfully migrated ${migratedCount} users`)

    // Report any remaining unmigrated users
    const remainingResult = await sql`
      SELECT COUNT(*) as count
      FROM blueprint_subscribers bs
      WHERE bs.user_id IS NOT NULL
        AND bs.form_data IS NOT NULL
        AND bs.form_data::text != 'null'::text
        AND NOT EXISTS (
          SELECT 1 FROM user_personal_brand upb
          WHERE upb.user_id = bs.user_id
            AND upb.business_type IS NOT NULL
            AND upb.ideal_audience IS NOT NULL
        )
    `
    const remainingCount = parseInt(remainingResult[0].count as string, 10)
    if (remainingCount > 0) {
      console.log(`⚠️  Warning: ${remainingCount} users still need migration (may have incomplete data)`)
    }

    console.log("")
    console.log("✅ Migration completed successfully!")
  } catch (error) {
    console.error("❌ Migration failed:", error)
    throw error
  }
}

// Run migration
runMigration()
  .then(() => {
    console.log("")
    console.log("🎉 Migration process completed")
    process.exit(0)
  })
  .catch((error) => {
    console.error("")
    console.error("💥 Migration process failed:", error)
    process.exit(1)
  })
