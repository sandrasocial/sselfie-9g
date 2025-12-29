/**
 * Run Alex Suggestion History Migration
 * 
 * Creates the alex_suggestion_history table for tracking proactive email suggestions
 */

import { neon } from "@neondatabase/serverless"
import * as fs from "fs"
import * as path from "path"
import { config } from "dotenv"

// Load environment variables from .env files
config({ path: path.join(process.cwd(), '.env.local') })
config({ path: path.join(process.cwd(), '.env') })

async function runMigration() {
  const databaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_POSTGRES_URL || process.env.POSTGRES_URL

  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set. Please set DATABASE_URL, SUPABASE_POSTGRES_URL, or POSTGRES_URL')
  }

  const sql = neon(databaseUrl)

  console.log('[MIGRATION] Starting Alex suggestion history table migration...')

  try {
    // Check if table already exists
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'alex_suggestion_history'
      )
    `
    
    if (tableExists[0]?.exists) {
      console.log('[MIGRATION] ✅ Table alex_suggestion_history already exists. Skipping migration.')
      return
    }
    
    // Read the SQL file
    const sqlPath = path.join(process.cwd(), 'scripts/migrations/019_create_alex_suggestion_history.sql')
    const sqlContent = fs.readFileSync(sqlPath, 'utf-8')

    // Split by semicolons and execute each statement individually
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    console.log(`[MIGRATION] Found ${statements.length} statements to execute`)

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (!statement) continue

      try {
        await sql.unsafe(statement + ';')
        console.log(`[MIGRATION] ✓ Statement ${i + 1}/${statements.length} executed`)
      } catch (error: any) {
        // Ignore "already exists" errors for CREATE TABLE IF NOT EXISTS and CREATE INDEX IF NOT EXISTS
        if (
          error.message?.includes('already exists') ||
          error.message?.includes('duplicate') ||
          error.code === '42P07' || // relation already exists
          error.code === '42710'    // duplicate object
        ) {
          console.log(`[MIGRATION] ⚠ Statement ${i + 1} already applied (skipping)`)
        } else {
          throw error
        }
      }
    }

    console.log('[MIGRATION] ✅ Successfully created alex_suggestion_history table and indexes')
    
    // Verify table was created
    const verify = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'alex_suggestion_history'
      ORDER BY ordinal_position
    `
    
    console.log('[MIGRATION] ✅ Table structure verified:')
    verify.forEach((col: any) => {
      console.log(`  - ${col.column_name}: ${col.data_type}`)
    })
    
  } catch (error: any) {
    console.error('[MIGRATION] ❌ Error running migration:', error.message)
    throw error
  }
}

runMigration()
  .then(() => {
    console.log('[Migration] ✅ Migration completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('[Migration] ❌ Migration failed:', error)
    process.exit(1)
  })

