/**
 * Verify Studio Pro tables exist
 */

import { neon } from '@neondatabase/serverless'

async function verifyTables() {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set')
  }

  const sql = neon(databaseUrl)

  console.log('[VERIFY] Checking if Studio Pro tables exist...')

  const tables = [
    'user_avatar_images',
    'brand_assets',
    'brand_kits',
    'user_pro_preferences',
    'pro_workflows',
    'pro_generations',
    'user_pro_setup',
  ]

  for (const tableName of tables) {
    try {
      const result = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = ${tableName}
        )
      `
      const exists = result[0]?.exists || false
      console.log(`[VERIFY] ${tableName}: ${exists ? '✓ EXISTS' : '✗ MISSING'}`)
    } catch (error: any) {
      console.error(`[VERIFY] Error checking ${tableName}:`, error.message)
    }
  }
}

verifyTables()
  .then(() => {
    console.log('[VERIFY] Done')
    process.exit(0)
  })
  .catch((error) => {
    console.error('[VERIFY] Error:', error)
    process.exit(1)
  })


























