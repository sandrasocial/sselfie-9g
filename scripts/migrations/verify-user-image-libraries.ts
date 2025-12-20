/**
 * Verify user_image_libraries table was created successfully
 */

import { neon } from '@neondatabase/serverless'
import { config } from 'dotenv'

// Load environment variables
config({ path: '.env.local' })
config({ path: '.env' })

async function verifyTable() {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set')
  }

  const sql = neon(databaseUrl)

  console.log('[VERIFY] Checking user_image_libraries table...')

  try {
    // Check if table exists
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_image_libraries'
      )
    `
    
    if (!tableExists[0]?.exists) {
      console.error('[VERIFY] ❌ Table does not exist')
      process.exit(1)
    }
    
    console.log('[VERIFY] ✓ Table exists')
    
    // Check columns
    const columns = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'user_image_libraries'
      ORDER BY ordinal_position
    `
    
    console.log('[VERIFY] Columns:')
    columns.forEach((col: any) => {
      console.log(`  - ${col.column_name} (${col.data_type})`)
    })
    
    // Check indexes
    const indexes = await sql`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
      AND tablename = 'user_image_libraries'
    `
    
    console.log('[VERIFY] Indexes:')
    indexes.forEach((idx: any) => {
      console.log(`  - ${idx.indexname}`)
    })
    
    // Check triggers
    const triggers = await sql`
      SELECT trigger_name, event_manipulation
      FROM information_schema.triggers
      WHERE event_object_schema = 'public'
      AND event_object_table = 'user_image_libraries'
    `
    
    console.log('[VERIFY] Triggers:')
    triggers.forEach((trg: any) => {
      console.log(`  - ${trg.trigger_name} (${trg.event_manipulation})`)
    })
    
    console.log('[VERIFY] ✅ Table verification completed successfully')
  } catch (error: any) {
    console.error('[VERIFY] ❌ Verification failed:', error)
    throw error
  }
}

verifyTable()
  .then(() => {
    console.log('[VERIFY] Done')
    process.exit(0)
  })
  .catch((error) => {
    console.error('[VERIFY] Error:', error)
    process.exit(1)
  })







