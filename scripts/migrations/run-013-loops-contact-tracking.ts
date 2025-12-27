/**
 * Migration 013: Add Loops contact tracking columns
 * 
 * Adds loops_contact_id, synced_to_loops, and loops_synced_at columns
 * to freebie_subscribers and blueprint_subscribers tables.
 */

import { neon } from '@neondatabase/serverless'
import { readFileSync } from 'fs'
import { join } from 'path'
import { config } from 'dotenv'

// Load environment variables from .env.local
config({ path: '.env.local' })

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is not set')
}

const sql = neon(databaseUrl)

async function runMigration() {
  console.log('🚀 Starting migration 013: Add Loops contact tracking...')
  
  try {
    // Read the SQL migration file
    const migrationPath = join(process.cwd(), 'scripts/migrations/013_add_loops_contact_tracking.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf-8')
    
    // Split by semicolons and execute each statement individually
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))
    
    console.log(`📝 Found ${statements.length} statements to execute...`)
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (!statement) continue
      
      try {
        const result = await sql.unsafe(statement)
        console.log(`✅ Statement ${i + 1}/${statements.length} executed`)
        if (i < 3) {
          // Log first few statements for debugging
          console.log(`   SQL: ${statement.substring(0, 100)}...`)
        }
      } catch (error: any) {
        // Ignore "already exists" errors for IF NOT EXISTS
        if (
          error.message?.includes('already exists') ||
          error.message?.includes('duplicate') ||
          error.message?.includes('column') && error.message?.includes('already') ||
          error.code === '42P07' || // relation already exists
          error.code === '42710' || // duplicate object
          error.code === '42701' // duplicate column
        ) {
          console.log(`⚠️ Statement ${i + 1} already applied (skipping): ${error.message}`)
        } else {
          console.error(`❌ Error in statement ${i + 1}:`, error.message)
          console.error(`   SQL: ${statement.substring(0, 200)}`)
          console.error(`   Full error:`, error)
          throw error
        }
      }
    }
    
    console.log('✅ Migration 013 completed successfully!')
    
    // Verify the columns were added
    console.log('🔍 Verifying columns were added...')
    const verification = await sql`
      SELECT 
        table_name,
        column_name, 
        data_type,
        is_nullable
      FROM information_schema.columns
      WHERE table_name IN ('freebie_subscribers', 'blueprint_subscribers')
      AND (column_name LIKE '%loops%' OR column_name LIKE '%synced%')
      ORDER BY table_name, column_name
    `
    
    console.log('\n📊 Verification Results:')
    if (verification.length > 0) {
      console.table(verification)
      console.log(`\n✅ Found ${verification.length} Loops-related columns`)
      
      // Check for specific columns
      const expectedColumns = [
        'loops_contact_id',
        'synced_to_loops',
        'loops_synced_at'
      ]
      
      const freebieColumns = verification.filter((v: any) => v.table_name === 'freebie_subscribers')
      const blueprintColumns = verification.filter((v: any) => v.table_name === 'blueprint_subscribers')
      
      console.log(`\n📋 freebie_subscribers: ${freebieColumns.length} columns`)
      console.log(`📋 blueprint_subscribers: ${blueprintColumns.length} columns`)
      
      if (freebieColumns.length === 3 && blueprintColumns.length === 3) {
        console.log('✅ All 6 Loops columns found (3 per table)')
      } else {
        console.warn(`⚠️ Expected 3 columns per table, found: freebie=${freebieColumns.length}, blueprint=${blueprintColumns.length}`)
      }
    } else {
      console.warn('⚠️ No Loops columns found. Migration may have failed silently.')
    }
    
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message)
    console.error(error)
    process.exit(1)
  }
}

runMigration()

