/**
 * Directly create user_pro_setup table
 */

import { neon } from '@neondatabase/serverless'

async function createTable() {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set')
  }

  const sql = neon(databaseUrl)

  console.log('[CREATE] Creating user_pro_setup table...')

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS user_pro_setup (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        has_completed_avatar_setup BOOLEAN DEFAULT false,
        has_completed_brand_setup BOOLEAN DEFAULT false,
        onboarding_completed_at TIMESTAMP,
        pro_features_unlocked BOOLEAN DEFAULT false,
        entry_selection TEXT CHECK (entry_selection IN ('just-me', 'me-product', 'editing', 'full-brand')),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `
    console.log('[CREATE] ✓ Table created')
    
    // Verify it exists
    const result = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_pro_setup'
      )
    `
    console.log('[CREATE] Verification:', result[0]?.exists ? '✓ EXISTS' : '✗ MISSING')
  } catch (error: any) {
    console.error('[CREATE] Error:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
    })
    throw error
  }
}

createTable()
  .then(() => {
    console.log('[CREATE] Done')
    process.exit(0)
  })
  .catch((error) => {
    console.error('[CREATE] Error:', error)
    process.exit(1)
  })






























