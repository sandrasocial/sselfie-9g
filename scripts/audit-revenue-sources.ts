import { neon } from '@neondatabase/serverless'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const sql = neon(process.env.DATABASE_URL!)

function fmtDate(value: any) {
  if (!value) return 'unknown'
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toISOString().slice(0, 10)
}

async function hasTable(tableName: string) {
  const rows = await sql`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = ${tableName}
    ) AS exists
  `
  return Boolean(rows[0]?.exists)
}

async function auditRevenueSources() {
  console.log('💰 REVENUE SOURCES AUDIT\n')
  console.log('='.repeat(60))
  const stripePaymentsTableExists = await hasTable('stripe_payments')
  
  // 1. Credit Transactions Schema
  console.log('\n1. CREDIT_TRANSACTIONS TABLE SCHEMA:')
  try {
    const schema = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'credit_transactions'
      ORDER BY ordinal_position
    `
    schema.forEach(col => {
      console.log(`   ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(nullable)' : '(required)'}`)
    })
  } catch (error: any) {
    console.log('   ERROR:', error.message)
  }
  
  // 2. Transaction Types
  console.log('\n2. TRANSACTION TYPES IN CREDIT_TRANSACTIONS:')
  try {
    const transactionTypes = await sql`
      SELECT 
        transaction_type,
        COUNT(*) as count,
        COUNT(DISTINCT user_id) as unique_users
      FROM credit_transactions
      GROUP BY transaction_type
      ORDER BY count DESC
    `
    transactionTypes.forEach(row => {
      console.log(`   ${row.transaction_type}: ${row.count} transactions, ${row.unique_users} unique users`)
    })
  } catch (error: any) {
    console.log('   ERROR:', error.message)
  }
  
  // 3. Purchase transactions (one-time payments)
  console.log('\n3. PURCHASE TRANSACTIONS (One-time payments):')
  try {
    const purchases = await sql`
      SELECT 
        COUNT(*) as total_purchases,
        COUNT(DISTINCT user_id) as unique_buyers,
        SUM(amount) as total_credits_purchased,
        COUNT(*) FILTER (WHERE stripe_payment_id IS NOT NULL AND btrim(stripe_payment_id) <> '') as with_stripe_id,
        COUNT(*) FILTER (WHERE stripe_payment_id IS NULL OR btrim(stripe_payment_id) = '') as missing_stripe_id,
        COUNT(*) FILTER (
          WHERE (stripe_payment_id IS NULL OR btrim(stripe_payment_id) = '')
            AND COALESCE(reference_id, '') LIKE 'legacy_unlinked_non_stripe%'
        ) as tagged_legacy_missing,
        COUNT(*) FILTER (
          WHERE (stripe_payment_id IS NULL OR btrim(stripe_payment_id) = '')
            AND COALESCE(reference_id, '') NOT LIKE 'legacy_unlinked_non_stripe%'
        ) as active_missing_unlinked,
        COUNT(*) FILTER (WHERE is_test_mode = TRUE) as test_mode,
        COUNT(*) FILTER (WHERE is_test_mode = FALSE) as live_mode,
        COUNT(*) FILTER (WHERE is_test_mode IS NULL) as unknown_mode
      FROM credit_transactions
      WHERE transaction_type = 'purchase'
    `
    const p: any = purchases[0]
    console.log(`   Total purchase transactions: ${p.total_purchases}`)
    console.log(`   Unique buyers: ${p.unique_buyers}`)
    console.log(`   Total credits purchased: ${p.total_credits_purchased}`)
    console.log(`   With Stripe payment ID: ${p.with_stripe_id}`)
    console.log(`   Missing Stripe payment ID: ${p.missing_stripe_id}`)
    console.log(`   Missing Stripe payment ID (tagged legacy non-stripe): ${p.tagged_legacy_missing}`)
    console.log(`   Missing Stripe payment ID (active unresolved): ${p.active_missing_unlinked}`)
    console.log(`   Test mode: ${p.test_mode}`)
    console.log(`   Live mode: ${p.live_mode}`)
    console.log(`   Unknown mode: ${p.unknown_mode}`)

    const recentMissing = await sql`
      SELECT
        COUNT(*) FILTER (
          WHERE created_at >= NOW() - INTERVAL '30 days'
            AND (stripe_payment_id IS NULL OR btrim(stripe_payment_id) = '')
            AND (is_test_mode = FALSE OR is_test_mode IS NULL)
            AND COALESCE(reference_id, '') NOT LIKE 'legacy_unlinked_non_stripe%'
        ) AS live_missing_30d,
        COUNT(*) FILTER (
          WHERE created_at >= NOW() - INTERVAL '30 days'
            AND stripe_payment_id IS NOT NULL
            AND btrim(stripe_payment_id) <> ''
            AND (is_test_mode = FALSE OR is_test_mode IS NULL)
        ) AS live_linked_30d
      FROM credit_transactions
      WHERE transaction_type = 'purchase'
    `
    console.log(`   Live purchase linkage (30d): ${recentMissing[0].live_linked_30d} linked / ${recentMissing[0].live_missing_30d} missing`)
  } catch (error: any) {
    console.log('   ERROR:', error.message)
  }

  console.log('\n3b. PURCHASE LINKAGE QUALITY:')
  try {
    const missingByProduct = await sql`
      SELECT
        COALESCE(product_type, 'NULL') as product_type,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE stripe_payment_id IS NULL OR btrim(stripe_payment_id) = '') as missing_stripe_id
      FROM credit_transactions
      WHERE transaction_type = 'purchase'
      GROUP BY COALESCE(product_type, 'NULL')
      ORDER BY total DESC
    `
    console.log('   Missing stripe_payment_id by product_type:')
    missingByProduct.forEach((row: any) => {
      console.log(`   - ${row.product_type}: ${row.missing_stripe_id}/${row.total}`)
    })

    const weeklyLinkage = await sql`
      SELECT
        date_trunc('week', created_at)::date as week,
        COUNT(*) as purchases,
        COUNT(*) FILTER (WHERE stripe_payment_id IS NOT NULL AND btrim(stripe_payment_id) <> '') as with_stripe_id,
        COUNT(*) FILTER (WHERE stripe_payment_id IS NULL OR btrim(stripe_payment_id) = '') as missing_stripe_id
      FROM credit_transactions
      WHERE transaction_type = 'purchase'
      GROUP BY week
      ORDER BY week DESC
      LIMIT 12
    `
    console.log('   Weekly purchase linkage (latest 12 weeks):')
    weeklyLinkage.forEach((row: any) => {
      console.log(`   - ${fmtDate(row.week)}: ${row.with_stripe_id}/${row.purchases} linked, ${row.missing_stripe_id} missing`)
    })

    if (stripePaymentsTableExists) {
      const linkageToStripeTable = await sql`
        SELECT
          COUNT(*) FILTER (WHERE ct.stripe_payment_id IS NOT NULL AND btrim(ct.stripe_payment_id) <> '') as with_id,
          COUNT(*) FILTER (
            WHERE ct.stripe_payment_id IS NOT NULL
              AND btrim(ct.stripe_payment_id) <> ''
              AND EXISTS (
                SELECT 1 FROM stripe_payments sp
                WHERE sp.stripe_payment_id = ct.stripe_payment_id
              )
          ) as matched,
          COUNT(*) FILTER (
            WHERE ct.stripe_payment_id IS NOT NULL
              AND btrim(ct.stripe_payment_id) <> ''
              AND NOT EXISTS (
                SELECT 1 FROM stripe_payments sp
                WHERE sp.stripe_payment_id = ct.stripe_payment_id
              )
          ) as orphan
        FROM credit_transactions ct
        WHERE ct.transaction_type = 'purchase'
      `
      const l: any = linkageToStripeTable[0]
      console.log(`   Purchases with stripe_payment_id: ${l.with_id}`)
      console.log(`   Matching stripe_payments rows: ${l.matched}`)
      console.log(`   Orphan stripe_payment_id rows: ${l.orphan}`)
    }
  } catch (error: any) {
    console.log('   ERROR:', error.message)
  }
  
  // 4. Subscription grants (monthly recurring)
  console.log('\n4. SUBSCRIPTION GRANT TRANSACTIONS (Monthly recurring):')
  try {
    const subscriptionGrants = await sql`
      SELECT 
        COUNT(*) as total_grants,
        COUNT(DISTINCT user_id) as unique_users,
        SUM(amount) as total_credits_granted
      FROM credit_transactions
      WHERE transaction_type = 'subscription_grant'
    `
    const sg = subscriptionGrants[0]
    console.log(`   Total subscription grants: ${sg.total_grants}`)
    console.log(`   Unique users: ${sg.unique_users}`)
    console.log(`   Total credits granted: ${sg.total_credits_granted}`)
  } catch (error: any) {
    console.log('   ERROR:', error.message)
  }
  
  // 5. Active subscriptions count
  console.log('\n5. ACTIVE SUBSCRIPTIONS:')
  try {
    const activeSubs = await sql`
      SELECT 
        COUNT(*) as total_active,
        COUNT(*) FILTER (WHERE is_test_mode = FALSE OR is_test_mode IS NULL) as live_active,
        COUNT(*) FILTER (WHERE is_test_mode = TRUE) as test_active,
        COUNT(DISTINCT user_id) as unique_users
      FROM subscriptions
      WHERE status = 'active'
    `
    const as = activeSubs[0]
    console.log(`   Total active subscriptions: ${as.total_active}`)
    console.log(`   Live subscriptions: ${as.live_active}`)
    console.log(`   Test subscriptions: ${as.test_active}`)
    console.log(`   Unique users: ${as.unique_users}`)
  } catch (error: any) {
    console.log('   ERROR:', error.message)
  }
  
  // 6. All paying customers (subscriptions + one-time purchases)
  console.log('\n6. TOTAL PAYING CUSTOMERS:')
  try {
    // Users with active subscriptions
    const subscriptionCustomers = await sql`
      SELECT DISTINCT user_id
      FROM subscriptions
      WHERE status = 'active'
        AND (is_test_mode = FALSE OR is_test_mode IS NULL)
    `
    
    // Users with purchase transactions
    const purchaseCustomers = await sql`
      SELECT DISTINCT user_id
      FROM credit_transactions
      WHERE transaction_type = 'purchase'
        AND stripe_payment_id IS NOT NULL
        AND (is_test_mode = FALSE OR is_test_mode IS NULL)
    `
    
    // Combine both sets
    const allPayingCustomers = new Set([
      ...subscriptionCustomers.map((r: any) => r.user_id),
      ...purchaseCustomers.map((r: any) => r.user_id)
    ])
    
    console.log(`   Users with active subscriptions: ${subscriptionCustomers.length}`)
    console.log(`   Users with one-time purchases: ${purchaseCustomers.length}`)
    console.log(`   TOTAL UNIQUE PAYING CUSTOMERS: ${allPayingCustomers.size}`)
  } catch (error: any) {
    console.log('   ERROR:', error.message)
  }
  
  // 7. Revenue truth boundary
  console.log('\n7. REVENUE TRUTH BOUNDARY:')
  console.log('   MRR is unavailable from credit_transactions. Use the live Stripe subscription audit.')
  console.log('   One-time money truth comes from qualifying stripe_payments, not credit estimates.')
  
  // 8. Users who bought but don't have subscriptions
  console.log('\n8. USERS WHO BOUGHT ONE-TIME BUT NO SUBSCRIPTION:')
  try {
    const oneTimeOnly = await sql`
      SELECT
        ct.user_id,
        COUNT(ct.id) as purchase_count,
        SUM(ct.amount) as total_credits_purchased
      FROM credit_transactions ct
      WHERE ct.transaction_type = 'purchase'
        AND ct.stripe_payment_id IS NOT NULL
        AND (ct.is_test_mode = FALSE OR ct.is_test_mode IS NULL)
        AND NOT EXISTS (
          SELECT 1 FROM subscriptions s 
          WHERE s.user_id = ct.user_id 
          AND s.status = 'active'
          AND (s.is_test_mode = FALSE OR s.is_test_mode IS NULL)
        )
      GROUP BY ct.user_id
      ORDER BY purchase_count DESC
      LIMIT 10
    `
    console.log(`   Found ${oneTimeOnly.length} users who bought one-time but have no active subscription`)
    if (oneTimeOnly.length > 0) {
      const purchases = oneTimeOnly.reduce((sum: number, row: any) => sum + Number(row.purchase_count || 0), 0)
      const credits = oneTimeOnly.reduce((sum: number, row: any) => sum + Number(row.total_credits_purchased || 0), 0)
      console.log(`   Aggregate top-cohort activity: ${purchases} purchase(s), ${credits} credits`)
    }
  } catch (error: any) {
    console.log('   ERROR:', error.message)
  }
  
  console.log('\n' + '='.repeat(60))
  console.log('✅ Revenue audit complete\n')
}

auditRevenueSources().catch(console.error)
