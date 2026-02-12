import { neon } from '@neondatabase/serverless'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const sql = neon(process.env.DATABASE_URL!)

async function getColumns(tableName: string) {
  const rows = await sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = ${tableName}
    ORDER BY ordinal_position
  `
  return new Set(rows.map((r: any) => r.column_name))
}

async function auditSubscriptionData() {
  console.log('🔍 SUBSCRIPTION DATA AUDIT\n')
  console.log('='.repeat(60))
  const userCols = await getColumns('users')
  const subCols = await getColumns('subscriptions')
  
  // 1. Total users
  const totalUsers = await sql`
    SELECT COUNT(*) as count FROM users
  `
  console.log(`\n1. TOTAL USERS: ${totalUsers[0].count}`)
  
  // 2. Users by test mode (if column exists)
  if (userCols.has('is_test_mode')) {
    const usersByTestMode = await sql`
      SELECT 
        is_test_mode,
        COUNT(*) as count
      FROM users
      GROUP BY is_test_mode
    `
    console.log('\n2. USERS BY TEST MODE:')
    usersByTestMode.forEach((row: any) => {
      console.log(`   ${row.is_test_mode ? 'TEST' : 'REAL'}: ${row.count}`)
    })
  } else {
    console.log('\n2. IS_TEST_MODE COLUMN: Not in users schema')
  }
  
  // 3. Total subscriptions
  const totalSubs = await sql`
    SELECT COUNT(*) as count FROM subscriptions
  `
  console.log(`\n3. TOTAL SUBSCRIPTIONS: ${totalSubs[0].count}`)
  
  // 4. Subscriptions by status (if status column exists)
  if (subCols.has('status')) {
    const subsByStatus = await sql`
      SELECT 
        status,
        COUNT(*) as count
      FROM subscriptions
      GROUP BY status
      ORDER BY count DESC
    `
    console.log('\n4. SUBSCRIPTIONS BY STATUS:')
    subsByStatus.forEach((row: any) => {
      console.log(`   ${row.status || 'NULL'}: ${row.count}`)
    })
  } else {
    console.log('\n4. STATUS COLUMN: Not in subscriptions schema')
  }
  
  // 5. Subscriptions by test mode (if column exists)
  if (subCols.has('is_test_mode')) {
    const subsByTestMode = await sql`
      SELECT 
        is_test_mode,
        COUNT(*) as count
      FROM subscriptions
      GROUP BY is_test_mode
    `
    console.log('\n5. SUBSCRIPTIONS BY TEST MODE:')
    subsByTestMode.forEach((row: any) => {
      console.log(`   ${row.is_test_mode ? 'TEST' : 'REAL'}: ${row.count}`)
    })
  } else {
    console.log('\n5. IS_TEST_MODE COLUMN: Not in subscriptions schema')
  }
  
  // 6. Cancelled subscriptions (if cancelled_at exists)
  if (subCols.has('cancelled_at')) {
    const cancelled = await sql`
      SELECT COUNT(*) as count 
      FROM subscriptions 
      WHERE cancelled_at IS NOT NULL
    `
    console.log(`\n6. CANCELLED SUBSCRIPTIONS (cancelled_at): ${cancelled[0].count}`)
  } else if (subCols.has('canceled_at')) {
    const canceled = await sql`
      SELECT COUNT(*) as count 
      FROM subscriptions 
      WHERE canceled_at IS NOT NULL
    `
    console.log(`\n6. CANCELED SUBSCRIPTIONS (canceled_at): ${canceled[0].count}`)
  } else if (subCols.has('status')) {
    const canceledByStatus = await sql`
      SELECT COUNT(*) as count
      FROM subscriptions
      WHERE status = 'canceled'
    `
    console.log(`\n6. CANCELED SUBSCRIPTIONS (status='canceled' proxy): ${canceledByStatus[0].count}`)
  } else {
    console.log('\n6. CANCELED SUBSCRIPTIONS: unavailable')
  }
  
  // 7. Active vs inactive (if is_active exists)
  if (subCols.has('is_active')) {
    const activeStatus = await sql`
      SELECT 
        is_active,
        COUNT(*) as count
      FROM subscriptions
      GROUP BY is_active
    `
    console.log('\n7. SUBSCRIPTIONS BY ACTIVE STATUS:')
    activeStatus.forEach((row: any) => {
      console.log(`   ${row.is_active ? 'ACTIVE' : 'INACTIVE'}: ${row.count}`)
    })
  } else if (subCols.has('status')) {
    const activeProxy = await sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE status <> 'active' OR status IS NULL) as inactive_or_other
      FROM subscriptions
    `
    console.log('\n7. SUBSCRIPTIONS BY ACTIVE PROXY (status-derived):')
    console.log(`   ACTIVE (status='active'): ${activeProxy[0].active}`)
    console.log(`   INACTIVE/OTHER: ${activeProxy[0].inactive_or_other}`)
  } else {
    console.log('\n7. ACTIVE STATUS: unavailable')
  }
  
  // 8. Stripe subscription IDs
  if (subCols.has('stripe_subscription_id')) {
    const stripeCoverage = await sql`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE stripe_subscription_id IS NOT NULL AND btrim(stripe_subscription_id) <> '') as with_id,
        COUNT(*) FILTER (WHERE stripe_subscription_id IS NULL OR btrim(stripe_subscription_id) = '') as missing_id
      FROM subscriptions
    `
    console.log(`\n8. SUBSCRIPTIONS WITH STRIPE ID: ${stripeCoverage[0].with_id}/${stripeCoverage[0].total}`)
    console.log(`   Missing Stripe ID: ${stripeCoverage[0].missing_id}`)

    const missingByProduct = await sql`
      SELECT
        COALESCE(product_type, 'NULL') as product_type,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE stripe_subscription_id IS NULL OR btrim(stripe_subscription_id) = '') as missing_id
      FROM subscriptions
      GROUP BY COALESCE(product_type, 'NULL')
      ORDER BY total DESC
    `
    console.log('   Missing by product_type:')
    missingByProduct.forEach((row: any) => {
      console.log(`   - ${row.product_type}: ${row.missing_id}/${row.total}`)
    })
  } else {
    console.log('\n8. STRIPE SUBSCRIPTION ID COLUMN: Not in subscriptions schema')
  }
  
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
