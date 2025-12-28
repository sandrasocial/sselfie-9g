/**
 * Run migration 016: Add Flodesk sync tracking to users table
 * 
 * Usage: tsx scripts/run-migration-016.ts
 */

import * as dotenv from 'dotenv'
import { neon } from '@neondatabase/serverless'
import * as fs from 'fs'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: '.env.local' })

const sql = neon(process.env.DATABASE_URL!)

async function runMigration() {
  console.log('🔄 Running migration 016: Add Flodesk sync tracking to users table\n')

  try {
    // Read migration file
    const migrationPath = path.join(process.cwd(), 'scripts/migrations/016_add_flodesk_sync_tracking.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8')

    // Split into individual statements (semicolon-separated, but respect comments)
    // Separate schema changes from verification query
    const allStatements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    const schemaStatements = allStatements.filter(s => 
      !s.toUpperCase().startsWith('SELECT') && 
      !s.toUpperCase().startsWith('-- Verify')
    )
    const verificationQuery = allStatements.find(s => 
      s.toUpperCase().startsWith('SELECT')
    )

    // Execute schema changes first
    for (const statement of schemaStatements) {
      if (statement.trim().length === 0) continue
      
      try {
        await sql.unsafe(statement)
        console.log('✅ Executed:', statement.substring(0, 60) + '...')
      } catch (error: any) {
        // Ignore "already exists" errors for columns and indexes
        if (
          error.message?.includes('already exists') ||
          error.message?.includes('duplicate') ||
          (error.message?.includes('column') && error.message?.includes('already'))
        ) {
          console.log('⚠️  Skipped (already exists):', statement.substring(0, 60) + '...')
        } else {
          throw error
        }
      }
    }

    // Run verification query
    console.log('\n📊 Verification:')
    try {
      // Check if Flodesk columns exist and count synced users
      const verification = await sql`
        SELECT 
          COUNT(*) as total_users,
          COUNT(flodesk_subscriber_id) as synced_to_flodesk
        FROM users
      `
      
      if (verification.length > 0) {
        const stats = verification[0] as any
        console.log(`   Total users: ${stats.total_users || 0}`)
        console.log(`   Synced to Flodesk: ${stats.synced_to_flodesk || 0}`)
      }
    } catch (verifyError: any) {
      console.warn('⚠️  Verification query failed:', verifyError.message)
    }

    console.log('\n✅ Migration 016 completed successfully!\n')

  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message)
    console.error('Error details:', error)
    process.exit(1)
  }
}

runMigration()

