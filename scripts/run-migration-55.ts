import { neon } from '@neondatabase/serverless'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const sql = neon(process.env.DATABASE_URL!)

async function runMigration() {
  console.log('🔄 Running migration 55: Add selfie guide progress columns to freebie_subscribers\n')

  try {
    console.log('1. Adding guide_chapter_index column...')
    await sql`ALTER TABLE freebie_subscribers ADD COLUMN IF NOT EXISTS guide_chapter_index integer DEFAULT 0`
    console.log('   ✅ Done')

    console.log('2. Adding guide_challenge_day column...')
    await sql`ALTER TABLE freebie_subscribers ADD COLUMN IF NOT EXISTS guide_challenge_day integer DEFAULT 0`
    console.log('   ✅ Done')

    console.log('3. Adding guide_completed_at column...')
    await sql`ALTER TABLE freebie_subscribers ADD COLUMN IF NOT EXISTS guide_completed_at timestamptz`
    console.log('   ✅ Done')

    console.log('4. Adding guide_challenge_completed_at column...')
    await sql`ALTER TABLE freebie_subscribers ADD COLUMN IF NOT EXISTS guide_challenge_completed_at timestamptz`
    console.log('   ✅ Done')

    console.log('5. Creating partial index on guide_completed_at...')
    await sql`
      CREATE INDEX IF NOT EXISTS idx_freebie_subscribers_guide_completed
        ON freebie_subscribers (guide_completed_at)
        WHERE guide_completed_at IS NOT NULL
    `
    console.log('   ✅ Done')

    console.log('\n🔍 Verifying columns exist...')
    const cols = await sql`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'freebie_subscribers'
        AND column_name IN ('guide_chapter_index', 'guide_challenge_day', 'guide_completed_at', 'guide_challenge_completed_at')
      ORDER BY column_name
    `
    cols.forEach((col: any) => {
      console.log(`   ✅ ${col.column_name}: ${col.data_type} (default: ${col.column_default ?? 'null'})`)
    })

    if (cols.length === 4) {
      console.log('\n✅ Migration 55 completed successfully!')
    } else {
      console.log(`\n⚠️  Warning: expected 4 columns, found ${cols.length}`)
    }
  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message)
    process.exit(1)
  }
}

runMigration().catch(console.error)
