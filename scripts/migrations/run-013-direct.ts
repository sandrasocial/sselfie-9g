/**
 * Run Migration 013 directly - Alternative method
 * Executes SQL statements one by one with better error handling
 */

import { neon } from '@neondatabase/serverless'
import { config } from 'dotenv'
import { readFileSync } from 'fs'
import { join } from 'path'

config({ path: '.env.local' })

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is not set')
}

const sql = neon(databaseUrl)

async function runMigration() {
  console.log('🚀 Running migration 013 directly...\n')
  
  try {
    // Read the SQL file
    const migrationPath = join(process.cwd(), 'scripts/migrations/013_add_loops_contact_tracking.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf-8')
    
    // Split by semicolons, but be careful with comments and multi-line statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))
    
    console.log(`📝 Found ${statements.length} statements to execute\n`)
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (!statement) continue
      
      // Skip comment-only lines
      if (statement.split('\n').every(line => line.trim().startsWith('--') || line.trim() === '')) {
        continue
      }
      
      try {
        console.log(`Executing statement ${i + 1}/${statements.length}...`)
        console.log(`SQL: ${statement.substring(0, 100)}${statement.length > 100 ? '...' : ''}`)
        
        const result = await sql.unsafe(statement + ';')
        
        console.log(`✅ Statement ${i + 1} executed successfully\n`)
      } catch (error: any) {
        // Check for "already exists" errors
        if (
          error.message?.includes('already exists') ||
          error.message?.includes('duplicate') ||
          error.message?.includes('column') && error.message?.includes('already') ||
          error.code === '42P07' || // relation already exists
          error.code === '42710' || // duplicate object
          error.code === '42701' // duplicate column
        ) {
          console.log(`⚠️ Statement ${i + 1} already applied (skipping): ${error.message}\n`)
        } else {
          console.error(`❌ Error in statement ${i + 1}:`, error.message)
          console.error(`   Code: ${error.code}`)
          console.error(`   SQL: ${statement.substring(0, 200)}`)
          throw error
        }
      }
    }
    
    console.log('✅ Migration completed!\n')
    
    // Verify columns were added
    console.log('🔍 Verifying columns...\n')
    
    const freebieCheck = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'freebie_subscribers'
      AND column_name IN ('loops_contact_id', 'synced_to_loops', 'loops_synced_at')
      ORDER BY column_name
    `
    
    const blueprintCheck = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'blueprint_subscribers'
      AND column_name IN ('loops_contact_id', 'synced_to_loops', 'loops_synced_at')
      ORDER BY column_name
    `
    
    console.log('📋 freebie_subscribers Loops columns:')
    if (freebieCheck.length > 0) {
      console.table(freebieCheck)
    } else {
      console.log('  ⚠️ No Loops columns found')
    }
    
    console.log('\n📋 blueprint_subscribers Loops columns:')
    if (blueprintCheck.length > 0) {
      console.table(blueprintCheck)
    } else {
      console.log('  ⚠️ No Loops columns found')
    }
    
    if (freebieCheck.length === 3 && blueprintCheck.length === 3) {
      console.log('\n✅ All 6 Loops columns found (3 per table)')
    } else {
      console.log(`\n⚠️ Expected 3 columns per table. Found: freebie=${freebieCheck.length}, blueprint=${blueprintCheck.length}`)
    }
    
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message)
    console.error(error)
    process.exit(1)
  }
}

runMigration()

