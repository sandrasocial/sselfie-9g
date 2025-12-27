/**
 * Verify Migration 013: Check if Loops columns were added
 */

import { neon } from '@neondatabase/serverless'
import { config } from 'dotenv'

config({ path: '.env.local' })

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is not set')
}

const sql = neon(databaseUrl)

async function verify() {
  console.log('🔍 Verifying Loops columns...\n')
  
  try {
    // Check freebie_subscribers - look for exact column names
    const freebieColumns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'freebie_subscribers'
      AND column_name IN ('loops_contact_id', 'synced_to_loops', 'loops_synced_at')
      ORDER BY column_name
    `
    
    console.log('📋 freebie_subscribers Loops columns:')
    if (freebieColumns.length > 0) {
      console.table(freebieColumns)
    } else {
      console.log('  ⚠️ No Loops columns found')
    }
    
    // Check blueprint_subscribers - look for exact column names
    const blueprintColumns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'blueprint_subscribers'
      AND column_name IN ('loops_contact_id', 'synced_to_loops', 'loops_synced_at')
      ORDER BY column_name
    `
    
    console.log('\n📋 blueprint_subscribers columns:')
    if (blueprintColumns.length > 0) {
      console.table(blueprintColumns)
    } else {
      console.log('  ⚠️ No Loops columns found')
    }
    
    // Summary
    console.log('\n📊 Summary:')
    console.log(`  freebie_subscribers: ${freebieColumns.length} Loops columns`)
    console.log(`  blueprint_subscribers: ${blueprintColumns.length} Loops columns`)
    
    if (freebieColumns.length === 3 && blueprintColumns.length === 3) {
      console.log('\n✅ All 6 Loops columns found (3 per table)')
    } else {
      console.log('\n⚠️ Expected 3 columns per table')
    }
    
  } catch (error: any) {
    console.error('❌ Verification failed:', error.message)
    process.exit(1)
  }
}

verify()

