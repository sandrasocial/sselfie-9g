/**
 * Direct test to add and verify Loops columns
 */

import { neon } from '@neondatabase/serverless'
import { config } from 'dotenv'

config({ path: '.env.local' })

const sql = neon(process.env.DATABASE_URL!)

async function test() {
  try {
    console.log('Testing direct ALTER TABLE...\n')
    
    // Try adding one column directly
    console.log('1. Adding loops_contact_id to freebie_subscribers...')
    await sql.unsafe(`
      ALTER TABLE freebie_subscribers
      ADD COLUMN IF NOT EXISTS loops_contact_id VARCHAR(255)
    `)
    console.log('✅ Added loops_contact_id')
    
    // Check if it exists
    console.log('\n2. Checking if column exists...')
    const check = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'freebie_subscribers' 
      AND column_name = 'loops_contact_id'
    `
    console.log('Result:', check)
    
    if (check.length > 0) {
      console.log('✅ Column exists!')
    } else {
      console.log('❌ Column not found')
    }
    
  } catch (error: any) {
    console.error('Error:', error.message)
    console.error(error)
  }
}

test()

