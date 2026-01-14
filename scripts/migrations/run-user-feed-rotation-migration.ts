/**
 * Migration Runner: Create user_feed_rotation_state table
 * 
 * This migration creates the table to track rotation indices for dynamic template injection.
 * Ensures users get different outfits/locations/accessories each time they generate a feed.
 */

import { neon } from "@neondatabase/serverless"
import { readFileSync } from "fs"
import { join } from "path"
import { config } from "dotenv"
import { resolve } from "path"

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), ".env.local") })

async function runMigration() {
  const sql = neon(process.env.DATABASE_URL!)

  try {
    console.log("[Migration] Starting: Create user_feed_rotation_state table...")

    // Check if table already exists
    const checkResult = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'user_feed_rotation_state'
    `

    if (checkResult.length > 0) {
      console.log("[Migration] ✅ Table user_feed_rotation_state already exists, skipping...")
      
      // Verify table structure
      const columns = await sql`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'user_feed_rotation_state'
        ORDER BY ordinal_position
      `
      
      console.log("[Migration] Table structure:")
      columns.forEach((col: any) => {
        console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`)
      })
      
      return
    }

    // Read and execute migration SQL
    const migrationPath = join(process.cwd(), "scripts/migrations/create-user-feed-rotation-state.sql")
    const migrationSQL = readFileSync(migrationPath, "utf-8")

    // Split SQL by semicolons and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && s !== 'BEGIN' && s !== 'COMMIT')

    for (const statement of statements) {
      if (statement.trim().length > 0) {
        try {
          await sql.unsafe(statement)
        } catch (error: any) {
          // Ignore "already exists" errors for idempotency
          if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
            console.log(`[Migration] ⚠️  Statement already applied (skipping): ${statement.substring(0, 50)}...`)
            continue
          }
          throw error
        }
      }
    }

    console.log("[Migration] ✅ Successfully created user_feed_rotation_state table")
    
    // Verify table was created
    const verifyResult = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'user_feed_rotation_state'
    `
    
    if (verifyResult.length > 0) {
      console.log("[Migration] ✅ Verification: Table exists")
    } else {
      throw new Error("Table was not created successfully")
    }
  } catch (error: any) {
    console.error("[Migration] ❌ Error running migration:", error.message)
    if (error.stack) {
      console.error("[Migration] Stack trace:", error.stack)
    }
    throw error
  }
}

// Run migration
runMigration()
  .then(() => {
    console.log("[Migration] ✅ Migration completed successfully")
    process.exit(0)
  })
  .catch((error) => {
    console.error("[Migration] ❌ Migration failed:", error)
    process.exit(1)
  })
