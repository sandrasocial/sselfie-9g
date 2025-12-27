import { neon } from '@neondatabase/serverless'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const sql = neon(process.env.DATABASE_URL!)

async function auditRevenueSources() {
  console.log('💰 REVENUE SOURCES AUDIT\n')
  console.log('='.repeat(60))
  
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
        COUNT(*) FILTER (WHERE stripe_payment_id IS NOT NULL) as with_stripe_id,
        COUNT(*) FILTER (WHERE is_test_mode = TRUE OR is_test_mode IS NULL) as test_mode,
        COUNT(*) FILTER (WHERE is_test_mode = FALSE) as live_mode
      FROM credit_transactions
      WHERE transaction_type = 'purchase'
    `
    const p = purchases[0]
    console.log(`   Total purchase transactions: ${p.total_purchases}`)
    console.log(`   Unique buyers: ${p.unique_buyers}`)
    console.log(`   Total credits purchased: ${p.total_credits_purchased}`)
    console.log(`   With Stripe payment ID: ${p.with_stripe_id}`)
    console.log(`   Test mode: ${p.test_mode}`)
    console.log(`   Live mode: ${p.live_mode}`)
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
  
  // 7. Revenue breakdown by source
  console.log('\n7. REVENUE BREAKDOWN (estimated):')
  try {
    // Note: We can't calculate exact revenue without Stripe API, but we can estimate
    // This assumes $29/month for subscriptions and estimates based on credits for purchases
    const activeSubs = await sql`
      SELECT COUNT(*) as count
      FROM subscriptions
      WHERE status = 'active'
        AND (is_test_mode = FALSE OR is_test_mode IS NULL)
    `
    
    const mrr = activeSubs[0].count * 29 // Assuming $29/month
    console.log(`   Monthly Recurring Revenue (MRR): $${mrr} (${activeSubs[0].count} active subscriptions × $29)`)
    console.log(`   Note: One-time revenue requires Stripe API integration for exact amounts`)
  } catch (error: any) {
    console.log('   ERROR:', error.message)
  }
  
  // 8. Users who bought but don't have subscriptions
  console.log('\n8. USERS WHO BOUGHT ONE-TIME BUT NO SUBSCRIPTION:')
  try {
    const oneTimeOnly = await sql`
      SELECT 
        ct.user_id,
        u.email,
        COUNT(ct.id) as purchase_count,
        SUM(ct.amount) as total_credits_purchased
      FROM credit_transactions ct
      INNER JOIN users u ON u.id = ct.user_id
      WHERE ct.transaction_type = 'purchase'
        AND ct.stripe_payment_id IS NOT NULL
        AND (ct.is_test_mode = FALSE OR ct.is_test_mode IS NULL)
        AND NOT EXISTS (
          SELECT 1 FROM subscriptions s 
          WHERE s.user_id = ct.user_id 
          AND s.status = 'active'
          AND (s.is_test_mode = FALSE OR s.is_test_mode IS NULL)
        )
      GROUP BY ct.user_id, u.email
      ORDER BY purchase_count DESC
      LIMIT 10
    `
    console.log(`   Found ${oneTimeOnly.length} users who bought one-time but have no active subscription`)
    if (oneTimeOnly.length > 0) {
      console.log('   Top examples:')
      oneTimeOnly.slice(0, 5).forEach((row: any) => {
        console.log(`   - ${row.email}: ${row.purchase_count} purchase(s), ${row.total_credits_purchased} credits`)
      })
    }
  } catch (error: any) {
    console.log('   ERROR:', error.message)
  }
  
  console.log('\n' + '='.repeat(60))
  console.log('✅ Revenue audit complete\n')
}

auditRevenueSources().catch(console.error)

