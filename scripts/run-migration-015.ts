import { neon } from '@neondatabase/serverless'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: '.env.local' })

const sql = neon(process.env.DATABASE_URL!)

async function runMigration() {
  console.log('🔄 Running migration: Add product_type to credit_transactions\n')
  
  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, 'migrations', '015_add_product_type_to_credit_transactions.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8')
    
    console.log('📄 Migration file loaded\n')
    console.log('Executing migration...\n')
    
    // Execute the migration SQL statement by statement
    // First, add the column
    console.log('1. Adding product_type column...')
    try {
      await sql`ALTER TABLE credit_transactions ADD COLUMN IF NOT EXISTS product_type TEXT`
      console.log('   ✅ Column added (or already exists)')
    } catch (error: any) {
      if (error.message?.includes('already exists')) {
        console.log('   ⚠️  Column already exists')
      } else {
        throw error
      }
    }
    
    // Add index
    console.log('\n2. Creating index...')
    try {
      await sql`CREATE INDEX IF NOT EXISTS idx_credit_transactions_product_type ON credit_transactions(product_type)`
      console.log('   ✅ Index created (or already exists)')
    } catch (error: any) {
      if (error.message?.includes('already exists')) {
        console.log('   ⚠️  Index already exists')
      } else {
        throw error
      }
    }
    
    // Update existing records - one-time sessions
    console.log('\n3. Updating existing one-time session purchases...')
    const updateSessions = await sql`
      UPDATE credit_transactions
      SET product_type = 'one_time_session'
      WHERE transaction_type = 'purchase'
        AND product_type IS NULL
        AND (
          description LIKE '%One-Time%'
          OR description LIKE '%one-time%'
          OR description LIKE '%Session%'
          OR description LIKE '%session%'
        )
    `
    console.log(`   ✅ Updated ${updateSessions.count || 0} records`)
    
    // Update existing records - credit top-ups
    console.log('\n4. Updating existing credit top-up purchases...')
    const updateTopups = await sql`
      UPDATE credit_transactions
      SET product_type = 'credit_topup'
      WHERE transaction_type = 'purchase'
        AND product_type IS NULL
        AND (
          description LIKE '%top-up%'
          OR description LIKE '%Top-Up%'
          OR description LIKE '%topup%'
          OR description LIKE '%Credit top-up%'
        )
    `
    console.log(`   ✅ Updated ${updateTopups.count || 0} records`)
    
    // Verify the migration
    console.log('\n🔍 Verifying migration...\n')
    const verifyResult = await sql`
      SELECT
        product_type,
        COUNT(*) as count
      FROM credit_transactions
      WHERE transaction_type = 'purchase'
      GROUP BY product_type
    `
    
    console.log('Purchase transactions by product_type:')
    verifyResult.forEach((row: any) => {
      console.log(`   ${row.product_type || 'NULL'}: ${row.count}`)
    })
    
    // Check if column exists
    const columnCheck = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'credit_transactions'
        AND column_name = 'product_type'
    `
    
    if (columnCheck.length > 0) {
      console.log('\n✅ Migration completed successfully!')
      console.log(`   Column 'product_type' exists: ${columnCheck[0].column_name} (${columnCheck[0].data_type})`)
    } else {
      console.log('\n⚠️  Warning: Column check failed')
    }
    
    console.log('\n' + '='.repeat(60))
    
  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message)
    console.error(error)
    process.exit(1)
  }
}

runMigration().catch(console.error)

