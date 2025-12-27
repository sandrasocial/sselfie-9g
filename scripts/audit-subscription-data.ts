import { neon } from '@neondatabase/serverless'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const sql = neon(process.env.DATABASE_URL!)

async function auditSubscriptionData() {
  console.log('🔍 SUBSCRIPTION DATA AUDIT\n')
  console.log('='.repeat(60))
  
  // 1. Total users
  const totalUsers = await sql`
    SELECT COUNT(*) as count FROM users
  `
  console.log(`\n1. TOTAL USERS: ${totalUsers[0].count}`)
  
  // 2. Users by test mode (if column exists)
  try {
    const usersByTestMode = await sql`
      SELECT 
        is_test_mode,
        COUNT(*) as count
      FROM users
      GROUP BY is_test_mode
    `
    console.log('\n2. USERS BY TEST MODE:')
    usersByTestMode.forEach(row => {
      console.log(`   ${row.is_test_mode ? 'TEST' : 'REAL'}: ${row.count}`)
    })
  } catch (error: any) {
    console.log('\n2. IS_TEST_MODE COLUMN: Does not exist in users table')
  }
  
  // 3. Total subscriptions
  const totalSubs = await sql`
    SELECT COUNT(*) as count FROM subscriptions
  `
  console.log(`\n3. TOTAL SUBSCRIPTIONS: ${totalSubs[0].count}`)
  
  // 4. Subscriptions by status (if status column exists)
  try {
    const subsByStatus = await sql`
      SELECT 
        status,
        COUNT(*) as count
      FROM subscriptions
      GROUP BY status
      ORDER BY count DESC
    `
    console.log('\n4. SUBSCRIPTIONS BY STATUS:')
    subsByStatus.forEach(row => {
      console.log(`   ${row.status || 'NULL'}: ${row.count}`)
    })
  } catch (error) {
    console.log('\n4. STATUS COLUMN: Does not exist in subscriptions table')
  }
  
  // 5. Subscriptions by test mode (if column exists)
  try {
    const subsByTestMode = await sql`
      SELECT 
        is_test_mode,
        COUNT(*) as count
      FROM subscriptions
      GROUP BY is_test_mode
    `
    console.log('\n5. SUBSCRIPTIONS BY TEST MODE:')
    subsByTestMode.forEach(row => {
      console.log(`   ${row.is_test_mode ? 'TEST' : 'REAL'}: ${row.count}`)
    })
  } catch (error: any) {
    console.log('\n5. IS_TEST_MODE COLUMN: Does not exist in subscriptions table')
  }
  
  // 6. Cancelled subscriptions (if cancelled_at exists)
  try {
    const cancelled = await sql`
      SELECT COUNT(*) as count 
      FROM subscriptions 
      WHERE cancelled_at IS NOT NULL
    `
    console.log(`\n6. CANCELLED SUBSCRIPTIONS: ${cancelled[0].count}`)
  } catch (error) {
    console.log('\n6. CANCELLED_AT COLUMN: Does not exist')
  }
  
  // 7. Active vs inactive (if is_active exists)
  try {
    const activeStatus = await sql`
      SELECT 
        is_active,
        COUNT(*) as count
      FROM subscriptions
      GROUP BY is_active
    `
    console.log('\n7. SUBSCRIPTIONS BY ACTIVE STATUS:')
    activeStatus.forEach(row => {
      console.log(`   ${row.is_active ? 'ACTIVE' : 'INACTIVE'}: ${row.count}`)
    })
  } catch (error) {
    console.log('\n7. IS_ACTIVE COLUMN: Does not exist')
  }
  
  // 8. Stripe subscription IDs
  const withStripeId = await sql`
    SELECT 
      COUNT(*) as count
    FROM subscriptions
    WHERE stripe_subscription_id IS NOT NULL
  `
  console.log(`\n8. SUBSCRIPTIONS WITH STRIPE ID: ${withStripeId[0].count}`)
  
  // 9. Users with subscriptions
  const usersWithSubs = await sql`
    SELECT COUNT(DISTINCT user_id) as count
    FROM subscriptions
  `
  console.log(`\n9. UNIQUE USERS WITH SUBSCRIPTIONS: ${usersWithSubs[0].count}`)
  
  // 10. Check subscription schema
  const schema = await sql`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'subscriptions'
    ORDER BY ordinal_position
  `
  console.log('\n10. SUBSCRIPTIONS TABLE SCHEMA:')
  schema.forEach(col => {
    console.log(`   ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(nullable)' : '(required)'}`)
  })
  
  console.log('\n' + '='.repeat(60))
  console.log('✅ Audit complete\n')
}

auditSubscriptionData().catch(console.error)

