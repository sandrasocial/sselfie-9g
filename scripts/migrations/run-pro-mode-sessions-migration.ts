/**
 * Run Pro Mode Sessions Migration
 * 
 * Creates pro_mode_sessions table for Pro Mode
 */

import { neon } from '@neondatabase/serverless'
import { config } from 'dotenv'

// Load environment variables
config({ path: '.env.local' })
config({ path: '.env' })

async function runMigration() {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set')
  }

  const sql = neon(databaseUrl)

  console.log('[MIGRATION] Starting pro_mode_sessions table migration...')

  try {
    console.log('[MIGRATION] Creating pro_mode_sessions table...')
    
    // Create table
    await sql`
      CREATE TABLE IF NOT EXISTS pro_mode_sessions (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        chat_id INTEGER REFERENCES maya_chats(id) ON DELETE SET NULL,
        library_snapshot JSONB,
        concepts_generated INTEGER DEFAULT 0,
        images_generated INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `
    console.log('[MIGRATION] ✓ Table created')
    
    // Create index on user_id
    await sql`
      CREATE INDEX IF NOT EXISTS idx_pro_mode_sessions_user_id 
      ON pro_mode_sessions(user_id)
    `
    console.log('[MIGRATION] ✓ Index on user_id created')
    
    // Create index on chat_id
    await sql`
      CREATE INDEX IF NOT EXISTS idx_pro_mode_sessions_chat_id 
      ON pro_mode_sessions(chat_id)
    `
    console.log('[MIGRATION] ✓ Index on chat_id created')
    
    // Add comment
    await sql`
      COMMENT ON TABLE pro_mode_sessions IS 
      'Tracks Pro Mode sessions, library snapshots, and generation statistics per session.'
    `
    console.log('[MIGRATION] ✓ Comment added')
    
    console.log('[MIGRATION] ✅ pro_mode_sessions table migration completed successfully')
  } catch (error: any) {
    // Ignore "already exists" errors for CREATE TABLE IF NOT EXISTS
    if (
      error.message?.includes('already exists') ||
      error.message?.includes('duplicate') ||
      error.code === '42P07' // relation already exists
    ) {
      console.log('[MIGRATION] ⚠ Table already exists (skipping)')
    } else {
      console.error('[MIGRATION] ❌ Migration failed:', {
        error: error.message,
        code: error.code,
      })
      throw error
    }
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







