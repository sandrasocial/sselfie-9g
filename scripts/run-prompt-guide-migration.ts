/**
 * Run Prompt Guide Builder Database Migration
 * 
 * Creates all tables required for the Admin Prompt Guide Builder feature
 */

import { config } from 'dotenv'
import { neon } from '@neondatabase/serverless'
import * as fs from 'fs'
import * as path from 'path'

// Load environment variables from .env.local first, then .env
config({ path: '.env.local' })
config()

async function runMigration() {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set')
  }

  const sql = neon(databaseUrl)

  console.log('[MIGRATION] Starting Prompt Guide Builder tables migration...')

  try {
    // Read the SQL file
    const sqlPath = path.join(process.cwd(), 'scripts/50-create-prompt-guide-tables.sql')
    const sqlContent = fs.readFileSync(sqlPath, 'utf-8')

    // Split by semicolons and execute each statement individually
    // This ensures we catch errors for each statement
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    console.log(`[MIGRATION] Found ${statements.length} statements to execute`)

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (!statement) continue

      try {
        await sql.unsafe(statement)
        console.log(`[MIGRATION] ✓ Statement ${i + 1}/${statements.length} executed`)
      } catch (error: any) {
        // Ignore "already exists" errors for CREATE TABLE IF NOT EXISTS
        if (
          error.message?.includes('already exists') ||
          error.message?.includes('duplicate') ||
          error.code === '42P07' // relation already exists
        ) {
          console.log(`[MIGRATION] ⚠ Statement ${i + 1} already applied (skipping)`)
        } else {
          console.error(`[MIGRATION] ❌ Error in statement ${i + 1}:`, {
            error: error.message,
            code: error.code,
            statement: statement.substring(0, 100) + '...',
          })
          throw error
        }
      }
    }

    console.log('[MIGRATION] ✅ Prompt Guide Builder tables migration completed successfully')
  } catch (error) {
    console.error('[MIGRATION] ❌ Migration failed:', error)
    throw error
  }
}

// Run if called directly
if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('[MIGRATION] Done')
      process.exit(0)
    })
    .catch((error) => {
      console.error('[MIGRATION] Error:', error)
      process.exit(1)
    })
}

export { runMigration }
