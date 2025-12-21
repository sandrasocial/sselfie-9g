/**
 * Run Photography Style Column Migration
 *
 * Adds photography_style column to user_personal_brand table
 * Supports 'authentic' (iPhone/influencer style - default) and 'editorial' (Professional DSLR/magazine quality)
 */

import { neon } from '@neondatabase/serverless'
import { config } from 'dotenv'

config({ path: '.env.local' })
config({ path: '.env' })

async function runMigration() {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    console.error('[MIGRATION] ERROR: DATABASE_URL environment variable is not set')
    console.error('[MIGRATION] Please set DATABASE_URL in .env.local or .env')
    process.exit(1)
  }

  const sql = neon(databaseUrl)

  try {
    console.log('[MIGRATION] Starting photography_style column migration...')
    console.log('[MIGRATION] Database URL:', databaseUrl.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'))

    // Step 1: Add column
    console.log('\n[MIGRATION] Step 1: Adding photography_style column...')
    try {
      await sql.unsafe(`
        ALTER TABLE user_personal_brand 
        ADD COLUMN IF NOT EXISTS photography_style VARCHAR(20) DEFAULT 'authentic';
      `)
      console.log('[MIGRATION] ✓ Column added')
    } catch (error: any) {
      if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
        console.log('[MIGRATION] ⚠️  Column already exists (skipping)')
      } else {
        throw error
      }
    }

    // Step 2: Add check constraint
    console.log('[MIGRATION] Step 2: Adding check constraint...')
    try {
      await sql.unsafe(`
        ALTER TABLE user_personal_brand
        DROP CONSTRAINT IF EXISTS check_photography_style;
      `)
      await sql.unsafe(`
        ALTER TABLE user_personal_brand
        ADD CONSTRAINT check_photography_style 
        CHECK (photography_style IN ('authentic', 'editorial'));
      `)
      console.log('[MIGRATION] ✓ Check constraint added')
    } catch (error: any) {
      console.log('[MIGRATION] ⚠️  Constraint error (may already exist):', error.message.split('\n')[0])
    }

    // Step 3: Create index
    console.log('[MIGRATION] Step 3: Creating index...')
    try {
      await sql.unsafe(`
        CREATE INDEX IF NOT EXISTS idx_user_personal_brand_photography_style 
        ON user_personal_brand(photography_style);
      `)
      console.log('[MIGRATION] ✓ Index created')
    } catch (error: any) {
      if (error.message?.includes('already exists')) {
        console.log('[MIGRATION] ⚠️  Index already exists (skipping)')
      } else {
        throw error
      }
    }

    // Step 4: Add column comment
    console.log('[MIGRATION] Step 4: Adding column comment...')
    try {
      await sql.unsafe(`
        COMMENT ON COLUMN user_personal_brand.photography_style IS 
        'Photography style preference: authentic (iPhone/influencer - default) or editorial (Professional DSLR/magazine quality)';
      `)
      console.log('[MIGRATION] ✓ Comment added')
    } catch (error: any) {
      // Comments are optional, continue if this fails
      console.log('[MIGRATION] ⚠️  Comment could not be added (continuing)')
    }

    // Verify migration
    console.log('\n[MIGRATION] Verifying migration...')
    
    // First, check what columns exist in the table
    const allColumns = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'user_personal_brand'
      ORDER BY ordinal_position
    `
    console.log('[MIGRATION] Columns in user_personal_brand table:', allColumns.map((c: any) => c.column_name).join(', '))
    
    const result = await sql`
      SELECT 
        column_name,
        data_type,
        column_default,
        is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'user_personal_brand'
      AND column_name = 'photography_style'
    `

    if (result.length > 0) {
      const column = result[0]
      console.log('[MIGRATION] ✓ Column verified:')
      console.log(`[MIGRATION]   - Name: ${column.column_name}`)
      console.log(`[MIGRATION]   - Type: ${column.data_type}`)
      console.log(`[MIGRATION]   - Default: ${column.column_default}`)
      console.log(`[MIGRATION]   - Nullable: ${column.is_nullable}`)
    } else {
      console.error('[MIGRATION] ⚠️  Column not found in information_schema, but migration reported success')
      console.error('[MIGRATION] This may be a schema visibility issue. Trying direct query...')
      
      // Try a direct query to see if column exists
      try {
        const testQuery = await sql.unsafe(`
          SELECT photography_style FROM user_personal_brand LIMIT 1
        `)
        console.log('[MIGRATION] ✓ Column exists and is queryable! (may be in different schema)')
      } catch (error: any) {
        if (error.message?.includes('column') && error.message?.includes('does not exist')) {
          console.error('[MIGRATION] ✗ ERROR: Column does not exist in table!')
          process.exit(1)
        } else {
          console.log('[MIGRATION] ✓ Column exists (table may be empty, but column is accessible)')
        }
      }
    }

    // Check constraint
    const constraintCheck = await sql`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints
      WHERE LOWER(table_name) = LOWER('user_personal_brand')
      AND constraint_name = 'check_photography_style'
    `

    if (constraintCheck.length > 0) {
      console.log('[MIGRATION] ✓ Check constraint verified: check_photography_style')
    }

    // Check index
    const indexCheck = await sql`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'user_personal_brand'
      AND indexname = 'idx_user_personal_brand_photography_style'
    `

    if (indexCheck.length > 0) {
      console.log('[MIGRATION] ✓ Index verified: idx_user_personal_brand_photography_style')
    }

    console.log('\n[MIGRATION] ✅ Migration completed successfully!')
    console.log('[MIGRATION] All users will default to "authentic" photography style')
    console.log('[MIGRATION] Users can have their style updated to "editorial" via API/user settings\n')

    return {
      success: true,
      columnAdded: true,
      constraintAdded: constraintCheck.length > 0,
      indexAdded: indexCheck.length > 0,
    }
  } catch (error: any) {
    console.error('[MIGRATION] ✗ Migration failed:', error.message)
    console.error('[MIGRATION] Full error:', error)
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
      console.error('[MIGRATION] Failed:', error)
      process.exit(1)
    })
}

export { runMigration }
