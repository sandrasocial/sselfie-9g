/**
 * STRIPE AFFECTED USERS INVESTIGATION
 * 
 * DRY-RUN (READ-ONLY) script to identify users charged amounts that don't match
 * current intended pricing.
 * 
 * Produces:
 * - CSV of affected users with remediation recommendations
 * - Detailed JSON analysis
 * - Summary report
 * 
 * Usage: pnpm exec tsx scripts/stripe/find-affected-users.ts
 */

import Stripe from "stripe"
import { neon } from "@neondatabase/serverless"
import { config } from "dotenv"
import { resolve } from "path"
import { writeFileSync } from "fs"
import { PRICING_PRODUCTS } from "@/lib/products"

// Load environment variables
config({ path: resolve(process.cwd(), ".env.local") })

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia",
})

const sql = neon(process.env.DATABASE_URL!)

// Phase A: Expected Pricing Truth
interface ExpectedPricing {
  productType: string
  priceId: string
  expectedAmount: number
  expectedAmountFormatted: string
  expectedRecurring: boolean
  interval?: string
}

interface AffectedUser {
  userId: string | null
  email: string
  stripeCustomerId: string
  chargeId: string | null
  paymentIntentId: string | null
  invoiceId: string | null
  subscriptionId: string | null
  chargeAmount: number
  currency: string
  chargeDate: Date
  expectedAmount: number
  deltaAmount: number
  reason: string
  recommendedAction: string
  details: string
}

interface PaymentAnalysis {
  paymentId: string
  customerId: string
  amount: number
  currency: string
  date: Date
  productType: string | null
  priceId: string | null
  invoiceId: string | null
  subscriptionId: string | null
  billingReason: string | null
  isExpected: boolean
  issue: string | null
  expectedAmount: number | null
}

async function getExpectedPricing(): Promise<Map<string, ExpectedPricing>> {
  console.log("=" .repeat(80))
  console.log("PHASE A: DEFINING EXPECTED PRICING TRUTH")
  console.log("=" .repeat(80))
  console.log()
  
  const expectedPricing = new Map<string, ExpectedPricing>()
  
  // From lib/products.ts
  const configs = [
    {
      productType: "sselfie_studio_membership",
      envVar: "STRIPE_SSELFIE_STUDIO_MEMBERSHIP_PRICE_ID",
      expectedAmount: 9700,
      expectedRecurring: true,
      interval: "month",
    },
    {
      productType: "one_time_session",
      envVar: "STRIPE_ONE_TIME_SESSION_PRICE_ID",
      expectedAmount: 4900,
      expectedRecurring: false,
    },
    {
      productType: "paid_blueprint",
      envVar: "STRIPE_PAID_BLUEPRINT_PRICE_ID",
      expectedAmount: 4700,
      expectedRecurring: false,
    },
  ]
  
  for (const config of configs) {
    const priceId = process.env[config.envVar]
    
    if (!priceId) {
      console.log(`⚠️  ${config.envVar} not set - using expected amount only`)
      expectedPricing.set(config.productType, {
        productType: config.productType,
        priceId: "",
        expectedAmount: config.expectedAmount,
        expectedAmountFormatted: `$${(config.expectedAmount / 100).toFixed(2)}`,
        expectedRecurring: config.expectedRecurring,
        interval: config.interval,
      })
      continue
    }
    
    try {
      const price = await stripe.prices.retrieve(priceId)
      
      console.log(`✅ ${config.productType}:`)
      console.log(`   Price ID: ${priceId}`)
      console.log(`   Amount: $${(price.unit_amount || 0) / 100}`)
      console.log(`   Active: ${price.active}`)
      console.log(`   Expected: $${config.expectedAmount / 100}`)
      
      expectedPricing.set(config.productType, {
        productType: config.productType,
        priceId,
        expectedAmount: config.expectedAmount,
        expectedAmountFormatted: `$${(config.expectedAmount / 100).toFixed(2)}`,
        expectedRecurring: config.expectedRecurring,
        interval: config.interval,
      })
      
      if (price.unit_amount !== config.expectedAmount) {
        console.log(`   ⚠️  WARNING: Stripe amount ($${(price.unit_amount || 0) / 100}) does not match expected ($${config.expectedAmount / 100})`)
      }
    } catch (error: any) {
      console.log(`❌ ${config.productType}: Error retrieving price ${priceId} - ${error.message}`)
      expectedPricing.set(config.productType, {
        productType: config.productType,
        priceId: priceId,
        expectedAmount: config.expectedAmount,
        expectedAmountFormatted: `$${(config.expectedAmount / 100).toFixed(2)}`,
        expectedRecurring: config.expectedRecurring,
        interval: config.interval,
      })
    }
    
    console.log()
  }
  
  return expectedPricing
}

async function getStripePaymentsLast90Days(expectedPricing: Map<string, ExpectedPricing>): Promise<PaymentAnalysis[]> {
  console.log("=" .repeat(80))
  console.log("PHASE B: PULLING STRIPE REALITY (LAST 90 DAYS)")
  console.log("=" .repeat(80))
  console.log()
  
  const ninetyDaysAgo = Math.floor((Date.now() - 90 * 24 * 60 * 60 * 1000) / 1000)
  const payments: PaymentAnalysis[] = []
  
  // Get all payment intents
  console.log("Fetching payment intents...")
  let hasMorePaymentIntents = true
  let startingAfter: string | undefined = undefined
  let paymentIntentCount = 0
  
  while (hasMorePaymentIntents) {
    const paymentIntents = await stripe.paymentIntents.list({
      created: { gte: ninetyDaysAgo },
      limit: 100,
      starting_after: startingAfter,
    })
    
    for (const pi of paymentIntents.data) {
      if (pi.status !== "succeeded") continue
      
      paymentIntentCount++
      
      const productType = pi.metadata?.product_type || null
      const priceId = pi.metadata?.price_id || null
      
      let expectedAmount: number | null = null
      let isExpected = true
      let issue: string | null = null
      
      if (productType && expectedPricing.has(productType)) {
        const expected = expectedPricing.get(productType)!
        expectedAmount = expected.expectedAmount
        
        if (pi.amount !== expectedAmount) {
          isExpected = false
          issue = "AMOUNT_MISMATCH"
        }
        
        if (priceId && expected.priceId && priceId !== expected.priceId) {
          isExpected = false
          issue = issue ? `${issue},WRONG_PRICE_ID` : "WRONG_PRICE_ID"
        }
      }
      
      payments.push({
        paymentId: pi.id,
        customerId: typeof pi.customer === "string" ? pi.customer : pi.customer?.id || "",
        amount: pi.amount,
        currency: pi.currency,
        date: new Date(pi.created * 1000),
        productType,
        priceId,
        invoiceId: typeof pi.invoice === "string" ? pi.invoice : pi.invoice?.id || null,
        subscriptionId: null,
        billingReason: null,
        isExpected,
        issue,
        expectedAmount,
      })
    }
    
    hasMorePaymentIntents = paymentIntents.has_more
    if (hasMorePaymentIntents) {
      startingAfter = paymentIntents.data[paymentIntents.data.length - 1].id
    }
  }
  
  console.log(`✅ Found ${paymentIntentCount} succeeded payment intents`)
  console.log()
  
  // Get all invoices (for subscriptions)
  console.log("Fetching invoices...")
  let hasMoreInvoices = true
  startingAfter = undefined
  let invoiceCount = 0
  
  while (hasMoreInvoices) {
    const invoices = await stripe.invoices.list({
      created: { gte: ninetyDaysAgo },
      status: "paid",
      limit: 100,
      starting_after: startingAfter,
      expand: ["data.subscription", "data.lines.data.price"],
    })
    
    for (const invoice of invoices.data) {
      invoiceCount++
      
      const subscriptionId = typeof invoice.subscription === "string" 
        ? invoice.subscription 
        : invoice.subscription?.id || null
      
      const customerId = typeof invoice.customer === "string" 
        ? invoice.customer 
        : invoice.customer?.id || ""
      
      // Get product type from subscription metadata or invoice lines
      let productType: string | null = null
      let priceId: string | null = null
      
      if (invoice.subscription && typeof invoice.subscription !== "string") {
        productType = invoice.subscription.metadata?.product_type || null
      }
      
      // Get price from line items
      if (invoice.lines.data.length > 0) {
        const firstLine = invoice.lines.data[0]
        if (firstLine.price) {
          priceId = typeof firstLine.price === "string" ? firstLine.price : firstLine.price.id
        }
        
        // Try to infer product type from price if not in metadata
        if (!productType && priceId) {
          for (const [type, expected] of expectedPricing.entries()) {
            if (expected.priceId === priceId) {
              productType = type
              break
            }
          }
        }
      }
      
      let expectedAmount: number | null = null
      let isExpected = true
      let issue: string | null = null
      
      // Check for proration
      const billingReason = invoice.billing_reason || null
      if (billingReason === "subscription_update") {
        issue = "PRORATION"
        isExpected = false // Mark for review
      }
      
      // Check amount
      if (productType && expectedPricing.has(productType)) {
        const expected = expectedPricing.get(productType)!
        expectedAmount = expected.expectedAmount
        
        // For subscriptions, allow for proration
        if (billingReason !== "subscription_update" && invoice.amount_paid !== expectedAmount) {
          isExpected = false
          issue = issue ? `${issue},AMOUNT_MISMATCH` : "AMOUNT_MISMATCH"
        }
        
        if (priceId && expected.priceId && priceId !== expected.priceId) {
          isExpected = false
          issue = issue ? `${issue},WRONG_PRICE_ID` : "WRONG_PRICE_ID"
        }
      }
      
      // Check for discounts
      if (invoice.total_discount_amounts && invoice.total_discount_amounts.length > 0) {
        issue = issue ? `${issue},DISCOUNT_APPLIED` : "DISCOUNT_APPLIED"
      }
      
      const paymentIntentId = typeof invoice.payment_intent === "string"
        ? invoice.payment_intent
        : invoice.payment_intent?.id || null
      
      payments.push({
        paymentId: paymentIntentId || invoice.id,
        customerId,
        amount: invoice.amount_paid,
        currency: invoice.currency,
        date: new Date(invoice.created * 1000),
        productType,
        priceId,
        invoiceId: invoice.id,
        subscriptionId,
        billingReason,
        isExpected,
        issue,
        expectedAmount,
      })
    }
    
    hasMoreInvoices = invoices.has_more
    if (hasMoreInvoices) {
      startingAfter = invoices.data[invoices.data.length - 1].id
    }
  }
  
  console.log(`✅ Found ${invoiceCount} paid invoices`)
  console.log()
  
  return payments
}

async function crossCheckDatabase(payments: PaymentAnalysis[]): Promise<Map<string, any>> {
  console.log("=" .repeat(80))
  console.log("PHASE C: DATABASE CROSS-CHECK")
  console.log("=" .repeat(80))
  console.log()
  
  const customerToUserMap = new Map<string, any>()
  
  // Get all users with stripe customer IDs
  const users = await sql`
    SELECT id, email, stripe_customer_id
    FROM users
    WHERE stripe_customer_id IS NOT NULL
  `
  
  console.log(`Found ${users.length} users with Stripe customer IDs`)
  
  for (const user of users) {
    customerToUserMap.set(user.stripe_customer_id as string, {
      userId: user.id,
      email: user.email,
    })
  }
  
  // Check for users with multiple active subscriptions
  const multiSubUsers = await sql`
    SELECT user_id, COUNT(*) as count
    FROM subscriptions
    WHERE status = 'active'
    GROUP BY user_id
    HAVING COUNT(*) > 1
  `
  
  if (multiSubUsers.length > 0) {
    console.log(`⚠️  Found ${multiSubUsers.length} users with multiple active subscriptions`)
  }
  
  // Check stripe_payments table for unexpected amounts
  const unexpectedPayments = await sql`
    SELECT 
      sp.stripe_payment_id,
      sp.user_id,
      sp.amount_cents,
      sp.product_type,
      sp.payment_date,
      u.email
    FROM stripe_payments sp
    LEFT JOIN users u ON u.id = sp.user_id
    WHERE sp.status = 'succeeded'
    AND sp.is_test_mode = FALSE
    AND sp.payment_date >= NOW() - INTERVAL '90 days'
    AND sp.amount_cents NOT IN (4700, 4900, 9700)
    ORDER BY sp.payment_date DESC
  `
  
  console.log(`Found ${unexpectedPayments.length} payments with non-standard amounts in DB`)
  console.log()
  
  return customerToUserMap
}

async function generateAffectedUsersList(
  payments: PaymentAnalysis[],
  expectedPricing: Map<string, ExpectedPricing>,
  customerToUserMap: Map<string, any>
): Promise<AffectedUser[]> {
  console.log("=" .repeat(80))
  console.log("PHASE D: GENERATING AFFECTED USERS LIST")
  console.log("=" .repeat(80))
  console.log()
  
  const affectedUsers: AffectedUser[] = []
  
  for (const payment of payments) {
    if (payment.isExpected) continue
    if (!payment.issue) continue
    
    const user = customerToUserMap.get(payment.customerId)
    const deltaAmount = payment.expectedAmount 
      ? payment.amount - payment.expectedAmount 
      : 0
    
    let reason = "unknown"
    let recommendedAction = "contact_support"
    let details = ""
    
    // Classify reason
    if (payment.issue.includes("WRONG_PRICE_ID")) {
      reason = "wrong_price_id"
      if (deltaAmount > 0) {
        recommendedAction = "refund_partial"
        details = `Charged $${(payment.amount / 100).toFixed(2)}, should be $${((payment.expectedAmount || 0) / 100).toFixed(2)}. Overpaid by $${(deltaAmount / 100).toFixed(2)}.`
      } else if (deltaAmount < 0) {
        recommendedAction = "grandfather"
        details = `Charged $${(payment.amount / 100).toFixed(2)}, expected $${((payment.expectedAmount || 0) / 100).toFixed(2)}. Underpaid by $${(Math.abs(deltaAmount) / 100).toFixed(2)}. Grandfather at lower rate.`
      }
    } else if (payment.issue.includes("PRORATION")) {
      reason = "proration"
      recommendedAction = "no_action"
      details = `Proration charge from subscription update. Billing reason: ${payment.billingReason}`
    } else if (payment.issue.includes("DISCOUNT_APPLIED")) {
      reason = "coupon_discount"
      recommendedAction = "no_action"
      details = "Coupon or discount applied at checkout"
    } else if (payment.issue.includes("AMOUNT_MISMATCH")) {
      reason = "amount_mismatch"
      if (deltaAmount > 0) {
        recommendedAction = "refund_partial"
        details = `Amount mismatch. Charged $${(payment.amount / 100).toFixed(2)}, expected $${((payment.expectedAmount || 0) / 100).toFixed(2)}. Delta: $${(deltaAmount / 100).toFixed(2)}.`
      } else {
        recommendedAction = "no_action"
        details = `Amount mismatch but user paid less. Review case.`
      }
    }
    
    affectedUsers.push({
      userId: user?.userId || null,
      email: user?.email || `Unknown (${payment.customerId})`,
      stripeCustomerId: payment.customerId,
      chargeId: null,
      paymentIntentId: payment.paymentId,
      invoiceId: payment.invoiceId,
      subscriptionId: payment.subscriptionId,
      chargeAmount: payment.amount,
      currency: payment.currency,
      chargeDate: payment.date,
      expectedAmount: payment.expectedAmount || 0,
      deltaAmount,
      reason,
      recommendedAction,
      details,
    })
  }
  
  console.log(`Found ${affectedUsers.length} affected payments`)
  console.log()
  
  // Group by recommended action
  const actionGroups = new Map<string, number>()
  for (const user of affectedUsers) {
    actionGroups.set(user.recommendedAction, (actionGroups.get(user.recommendedAction) || 0) + 1)
  }
  
  console.log("Breakdown by recommended action:")
  for (const [action, count] of actionGroups.entries()) {
    console.log(`  ${action}: ${count}`)
  }
  console.log()
  
  return affectedUsers
}

function generateCSV(affectedUsers: AffectedUser[]): string {
  const headers = [
    "user_id",
    "email",
    "stripe_customer_id",
    "charge_id",
    "payment_intent_id",
    "invoice_id",
    "subscription_id",
    "charge_amount",
    "currency",
    "charge_date",
    "expected_amount",
    "delta_amount",
    "reason",
    "recommended_action",
    "details",
  ]
  
  const rows = affectedUsers.map(user => [
    user.userId || "",
    user.email,
    user.stripeCustomerId,
    user.chargeId || "",
    user.paymentIntentId || "",
    user.invoiceId || "",
    user.subscriptionId || "",
    (user.chargeAmount / 100).toFixed(2),
    user.currency,
    user.chargeDate.toISOString().split('T')[0],
    (user.expectedAmount / 100).toFixed(2),
    (user.deltaAmount / 100).toFixed(2),
    user.reason,
    user.recommendedAction,
    `"${user.details.replace(/"/g, '""')}"`,
  ])
  
  return [
    headers.join(","),
    ...rows.map(row => row.join(",")),
  ].join("\n")
}

async function main() {
  console.log("=" .repeat(80))
  console.log("🔍 STRIPE AFFECTED USERS INVESTIGATION")
  console.log("=" .repeat(80))
  console.log()
  console.log("Mode: DRY-RUN (READ-ONLY)")
  console.log()
  
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error("❌ STRIPE_SECRET_KEY not set")
    process.exit(1)
  }
  
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL not set")
    process.exit(1)
  }
  
  // Phase A
  const expectedPricing = await getExpectedPricing()
  
  // Phase B
  const payments = await getStripePaymentsLast90Days(expectedPricing)
  
  // Phase C
  const customerToUserMap = await crossCheckDatabase(payments)
  
  // Phase D
  const affectedUsers = await generateAffectedUsersList(payments, expectedPricing, customerToUserMap)
  
  // Generate outputs
  console.log("=" .repeat(80))
  console.log("GENERATING OUTPUTS")
  console.log("=" .repeat(80))
  console.log()
  
  const csv = generateCSV(affectedUsers)
  const csvPath = resolve(process.cwd(), "docs/_CANONICAL/stripe_refund_candidates.csv")
  writeFileSync(csvPath, csv)
  console.log(`✅ CSV written to: ${csvPath}`)
  
  const jsonPath = resolve(process.cwd(), "docs/_CANONICAL/stripe_affected_users_analysis.json")
  writeFileSync(jsonPath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    lookbackDays: 90,
    totalPayments: payments.length,
    affectedPayments: affectedUsers.length,
    affectedUsers,
    summary: {
      totalAffectedPayments: affectedUsers.length,
      totalRefundAmount: affectedUsers
        .filter(u => u.recommendedAction.includes("refund"))
        .reduce((sum, u) => sum + Math.abs(u.deltaAmount), 0) / 100,
      byAction: Array.from(
        affectedUsers.reduce((map, u) => {
          map.set(u.recommendedAction, (map.get(u.recommendedAction) || 0) + 1)
          return map
        }, new Map<string, number>())
      ).map(([action, count]) => ({ action, count })),
    },
  }, null, 2))
  console.log(`✅ JSON analysis written to: ${jsonPath}`)
  
  console.log()
  console.log("=" .repeat(80))
  console.log("SUMMARY")
  console.log("=" .repeat(80))
  console.log()
  console.log(`Total payments analyzed: ${payments.length}`)
  console.log(`Affected payments: ${affectedUsers.length}`)
  console.log()
  console.log("Next steps:")
  console.log("1. Review: docs/_CANONICAL/stripe_refund_candidates.csv")
  console.log("2. Review: docs/_CANONICAL/stripe_affected_users_analysis.json")
  console.log("3. Generate remediation report: docs/_CANONICAL/STRIPE_AFFECTED_USERS_REMEDIATION.md")
  console.log("4. If approved, run: pnpm exec tsx scripts/stripe/apply-refunds.ts")
}

main().catch(error => {
  console.error("Fatal error:", error)
  process.exit(1)
})
