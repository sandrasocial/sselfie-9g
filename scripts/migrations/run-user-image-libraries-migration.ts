/**
 * Run User Image Libraries Migration
 * 
 * Creates user_image_libraries table for Pro Mode
 */

import { neon } from '@neondatabase/serverless'
import * as fs from 'fs'
import * as path from 'path'
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

  console.log('[MIGRATION] Starting user_image_libraries table migration...')

  try {
    console.log('[MIGRATION] Creating user_image_libraries table...')
    
    // Create table
    await sql`
      CREATE TABLE IF NOT EXISTS user_image_libraries (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        selfies JSONB DEFAULT '[]',
        products JSONB DEFAULT '[]',
        people JSONB DEFAULT '[]',
        vibes JSONB DEFAULT '[]',
        current_intent TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `
    console.log('[MIGRATION] ✓ Table created')
    
    // Create index
    await sql`
      CREATE INDEX IF NOT EXISTS idx_user_image_libraries_user_id 
      ON user_image_libraries(user_id)
    `
    console.log('[MIGRATION] ✓ Index created')
    
    // Create function (using unsafe for function definition with $$)
    try {
      await sql.unsafe(`
        CREATE OR REPLACE FUNCTION update_user_image_libraries_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `)
      console.log('[MIGRATION] ✓ Function created')
    } catch (error: any) {
      // Function might already exist, that's okay
      if (error.message?.includes('already exists')) {
        console.log('[MIGRATION] ⚠ Function already exists (skipping)')
      } else {
        throw error
      }
    }
    
    // Create trigger (using unsafe for EXECUTE FUNCTION)
    await sql.unsafe(`
      DROP TRIGGER IF EXISTS trigger_update_user_image_libraries_updated_at 
      ON user_image_libraries
    `)
    await sql.unsafe(`
      CREATE TRIGGER trigger_update_user_image_libraries_updated_at
      BEFORE UPDATE ON user_image_libraries
      FOR EACH ROW
      EXECUTE FUNCTION update_user_image_libraries_updated_at()
    `)
    console.log('[MIGRATION] ✓ Trigger created')
    
    // Add comment
    await sql`
      COMMENT ON TABLE user_image_libraries IS 
      'Persistent image libraries for Pro Mode users. Stores selfies, products, people, and vibes images organized by category.'
    `
    console.log('[MIGRATION] ✓ Comment added')

    console.log('[MIGRATION] ✅ user_image_libraries table migration completed successfully')
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







