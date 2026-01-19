/**
 * FIX B7: Multi-Subscription Drift Detection Script
 * 
 * Audits for users with multiple active subscriptions (which could cause
 * double-charging or incorrect credit grants).
 * 
 * This is a read-only diagnostic script.
 * 
 * Usage: npx tsx scripts/audit-multi-subscriptions.ts
 */

import { neon } from "@neondatabase/serverless"
import Stripe from "stripe"
import { config } from "dotenv"
import { resolve } from "path"

// Load environment variables
config({ path: resolve(process.cwd(), ".env.local") })

const sql = neon(process.env.DATABASE_URL!)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia",
})

interface MultiSubscriptionIssue {
  userId: string
  email: string
  stripeCustomerId: string | null
  dbSubscriptions: Array<{
    id: number
    productType: string
    status: string
    stripeSubscriptionId: string
    currentPeriodStart: Date
    currentPeriodEnd: Date
  }>
  stripeSubscriptions: Array<{
    id: string
    status: string
    priceId: string
    amount: number
    currentPeriodStart: Date
    currentPeriodEnd: Date
  }>
  issue: string
}

async function findUsersWithMultipleDbSubscriptions() {
  const results = await sql`
    SELECT 
      user_id,
      COUNT(*) as subscription_count
    FROM subscriptions
    WHERE status = 'active'
    GROUP BY user_id
    HAVING COUNT(*) > 1
  `
  
  return results.map(r => r.user_id as string)
}

async function getUserSubscriptionDetails(userId: string) {
  // Get user info
  const userInfo = await sql`
    SELECT email, stripe_customer_id
    FROM users
    WHERE id = ${userId}
    LIMIT 1
  `
  
  if (userInfo.length === 0) {
    return null
  }
  
  const user = userInfo[0]
  
  // Get DB subscriptions
  const dbSubs = await sql`
    SELECT 
      id,
      product_type,
      status,
      stripe_subscription_id,
      current_period_start,
      current_period_end
    FROM subscriptions
    WHERE user_id = ${userId}
    AND status = 'active'
    ORDER BY created_at DESC
  `
  
  // Get Stripe subscriptions (if customer ID exists)
  let stripeSubs: any[] = []
  if (user.stripe_customer_id) {
    try {
      const subscriptions = await stripe.subscriptions.list({
        customer: user.stripe_customer_id as string,
        status: 'active',
        limit: 100,
      })
      stripeSubs = subscriptions.data
    } catch (error: any) {
      console.error(`Error fetching Stripe subscriptions for customer ${user.stripe_customer_id}:`, error.message)
    }
  }
  
  return {
    userId,
    email: user.email as string,
    stripeCustomerId: user.stripe_customer_id as string | null,
    dbSubscriptions: dbSubs.map(s => ({
      id: s.id as number,
      productType: s.product_type as string,
      status: s.status as string,
      stripeSubscriptionId: s.stripe_subscription_id as string,
      currentPeriodStart: new Date(s.current_period_start as any),
      currentPeriodEnd: new Date(s.current_period_end as any),
    })),
    stripeSubscriptions: stripeSubs.map(s => ({
      id: s.id,
      status: s.status,
      priceId: s.items.data[0]?.price.id || 'unknown',
      amount: s.items.data[0]?.price.unit_amount || 0,
      currentPeriodStart: new Date(s.current_period_start * 1000),
      currentPeriodEnd: new Date(s.current_period_end * 1000),
    })),
  }
}

async function main() {
  console.log("=" .repeat(80))
  console.log("🔍 MULTI-SUBSCRIPTION DRIFT DETECTION AUDIT")
  console.log("=" .repeat(80))
  console.log()
  
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL not set")
    process.exit(1)
  }
  
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error("❌ STRIPE_SECRET_KEY not set")
    process.exit(1)
  }
  
  console.log("✅ Database and Stripe connections configured")
  console.log()
  
  // Find users with multiple active subscriptions in DB
  console.log("Checking for users with multiple active subscriptions in database...")
  const multiSubUserIds = await findUsersWithMultipleDbSubscriptions()
  
  if (multiSubUserIds.length === 0) {
    console.log("✅ No users found with multiple active subscriptions in database")
  } else {
    console.log(`⚠️ Found ${multiSubUserIds.length} user(s) with multiple active subscriptions:`)
    console.log()
  }
  
  const issues: MultiSubscriptionIssue[] = []
  
  for (const userId of multiSubUserIds) {
    const details = await getUserSubscriptionDetails(userId)
    
    if (!details) {
      continue
    }
    
    console.log(`User: ${details.email} (${details.userId})`)
    console.log(`  Stripe Customer: ${details.stripeCustomerId || 'None'}`)
    console.log(`  DB Subscriptions: ${details.dbSubscriptions.length}`)
    
    for (const sub of details.dbSubscriptions) {
      console.log(`    - ${sub.productType} (${sub.status})`)
      console.log(`      Stripe Sub ID: ${sub.stripeSubscriptionId}`)
      console.log(`      Period: ${sub.currentPeriodStart.toISOString().split('T')[0]} to ${sub.currentPeriodEnd.toISOString().split('T')[0]}`)
    }
    
    console.log(`  Stripe Subscriptions: ${details.stripeSubscriptions.length}`)
    
    for (const sub of details.stripeSubscriptions) {
      console.log(`    - ${sub.id} (${sub.status})`)
      console.log(`      Price: ${sub.priceId} ($${(sub.amount / 100).toFixed(2)})`)
      console.log(`      Period: ${sub.currentPeriodStart.toISOString().split('T')[0]} to ${sub.currentPeriodEnd.toISOString().split('T')[0]}`)
    }
    
    // Determine issue type
    let issue = ""
    if (details.dbSubscriptions.length > details.stripeSubscriptions.length) {
      issue = "More subscriptions in DB than Stripe (possible orphaned records)"
    } else if (details.dbSubscriptions.length < details.stripeSubscriptions.length) {
      issue = "More subscriptions in Stripe than DB (possible sync issue)"
    } else {
      issue = "Multiple active subscriptions (user may be charged multiple times)"
    }
    
    issues.push({
      ...details,
      issue,
    })
    
    console.log(`  ⚠️ Issue: ${issue}`)
    console.log()
  }
  
  // Check for orphaned Stripe subscriptions (active in Stripe but not in DB)
  console.log("=" .repeat(80))
  console.log("Checking for orphaned Stripe subscriptions...")
  console.log("=" .repeat(80))
  console.log()
  
  // Get all active subscriptions from Stripe
  const allActiveSubscriptions = await stripe.subscriptions.list({
    status: 'active',
    limit: 100,
  })
  
  let orphanedCount = 0
  for (const stripeSub of allActiveSubscriptions.data) {
    const customerId = typeof stripeSub.customer === 'string' 
      ? stripeSub.customer 
      : stripeSub.customer?.id
    
    if (!customerId) continue
    
    // Check if this subscription exists in our DB
    const dbRecord = await sql`
      SELECT id, user_id
      FROM subscriptions
      WHERE stripe_subscription_id = ${stripeSub.id}
      LIMIT 1
    `
    
    if (dbRecord.length === 0) {
      orphanedCount++
      console.log(`⚠️ Orphaned subscription found:`)
      console.log(`  Stripe Sub ID: ${stripeSub.id}`)
      console.log(`  Customer: ${customerId}`)
      console.log(`  Status: ${stripeSub.status}`)
      console.log(`  Price: ${stripeSub.items.data[0]?.price.id} ($${((stripeSub.items.data[0]?.price.unit_amount || 0) / 100).toFixed(2)})`)
      console.log(`  ⚠️ NOT FOUND in database - this customer may not be receiving credits`)
      console.log()
    }
  }
  
  if (orphanedCount === 0) {
    console.log("✅ No orphaned subscriptions found")
  } else {
    console.log(`⚠️ Found ${orphanedCount} orphaned subscription(s) in Stripe`)
  }
  console.log()
  
  // Summary
  console.log("=" .repeat(80))
  console.log("SUMMARY")
  console.log("=" .repeat(80))
  console.log()
  
  if (issues.length === 0 && orphanedCount === 0) {
    console.log("✅ No subscription drift issues detected")
  } else {
    console.log("⚠️ Issues detected:")
    console.log(`  - ${issues.length} user(s) with multiple active subscriptions`)
    console.log(`  - ${orphanedCount} orphaned subscription(s) in Stripe`)
    console.log()
    console.log("Recommended actions:")
    console.log("  1. Review each case manually")
    console.log("  2. Cancel duplicate subscriptions in Stripe Dashboard")
    console.log("  3. Update DB records to match Stripe state")
    console.log("  4. Issue refunds if user was double-charged")
  }
  
  console.log()
  console.log("=" .repeat(80))
  console.log("RESULTS (JSON)")
  console.log("=" .repeat(80))
  console.log()
  console.log(JSON.stringify({
    multiSubscriptionIssues: issues,
    orphanedSubscriptions: orphanedCount,
    timestamp: new Date().toISOString(),
  }, null, 2))
}

main().catch(error => {
  console.error("Fatal error:", error)
  process.exit(1)
})
