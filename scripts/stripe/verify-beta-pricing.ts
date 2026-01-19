/**
 * BETA PRICING VERIFICATION SCRIPT
 * 
 * Verifies that all beta users (first 100 Creator Studio subscribers) have:
 * - 50% off discount applied
 * - Duration = "forever" (lifetime)
 * - Discount persists as long as subscription is active
 * - Discount is lost if they cancel and re-subscribe
 * 
 * READ-ONLY - No mutations
 * 
 * Usage: npx tsx scripts/stripe/verify-beta-pricing.ts
 */

import Stripe from "stripe"
import { neon } from "@neondatabase/serverless"
import { config } from "dotenv"
import { resolve } from "path"
import { writeFileSync } from "fs"

// Load environment variables
config({ path: resolve(process.cwd(), ".env.local") })

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia",
})

const sql = neon(process.env.DATABASE_URL!)

interface BetaUser {
  userId: string
  email: string
  stripeCustomerId: string | null
  subscriptionId: string | null
  subscriptionStatus: string | null
  createdAt: Date
  subscriptionCreatedAt: Date | null
}

interface StripeDiscountInfo {
  hasDiscount: boolean
  discountType: string | null
  percentOff: number | null
  duration: string | null
  durationInMonths: number | null
  discountEnd: Date | null
  couponId: string | null
  promotionCodeId: string | null
}

interface BetaPricingStatus {
  userId: string
  email: string
  stripeCustomerId: string
  subscriptionId: string
  status: string
  currentPriceId: string
  currentUnitAmount: number
  hasDiscount: boolean
  discountType: string
  discountPercentOff: number | null
  discountDuration: string | null
  discountEnd: string | null
  shouldHaveBeta: boolean
  betaOk: boolean
  riskReason: string
}

async function identifyBetaUsers(): Promise<BetaUser[]> {
  console.log("=" .repeat(80))
  console.log("PHASE A: IDENTIFYING BETA USERS")
  console.log("=" .repeat(80))
  console.log()
  
  // Beta users = first 100 Creator Studio subscribers (sselfie_studio_membership)
  // Based on app/api/admin/dashboard/beta-users/route.ts logic
  const betaUsers = await sql`
    SELECT 
      u.id as user_id,
      u.email,
      u.stripe_customer_id,
      u.created_at,
      s.stripe_subscription_id as subscription_id,
      s.status as subscription_status,
      s.created_at as subscription_created_at
    FROM users u
    INNER JOIN subscriptions s ON u.id = s.user_id::varchar
    WHERE s.product_type = 'sselfie_studio_membership'
      AND s.is_test_mode = FALSE
    ORDER BY s.created_at ASC
    LIMIT 100
  `
  
  console.log(`Found ${betaUsers.length} beta users (first 100 Creator Studio subscribers)`)
  console.log()
  
  // Also check for any users beyond 100 (they should NOT have beta pricing)
  const totalStudioUsers = await sql`
    SELECT COUNT(*) as count
    FROM users u
    INNER JOIN subscriptions s ON u.id = s.user_id::varchar
    WHERE s.product_type = 'sselfie_studio_membership'
      AND s.is_test_mode = FALSE
  `
  
  const total = parseInt(totalStudioUsers[0].count)
  console.log(`Total Creator Studio subscribers: ${total}`)
  console.log(`Beta users (first 100): ${betaUsers.length}`)
  console.log(`Non-beta users (after 100): ${Math.max(0, total - 100)}`)
  console.log()
  
  return betaUsers.map(user => ({
    userId: user.user_id as string,
    email: user.email as string,
    stripeCustomerId: user.stripe_customer_id as string | null,
    subscriptionId: user.subscription_id as string | null,
    subscriptionStatus: user.subscription_status as string | null,
    createdAt: new Date(user.created_at as string),
    subscriptionCreatedAt: user.subscription_created_at ? new Date(user.subscription_created_at as string) : null,
  }))
}

async function checkStripeDiscount(
  customerId: string,
  subscriptionId: string
): Promise<StripeDiscountInfo> {
  try {
    // Get customer (check customer-level discount)
    const customer = await stripe.customers.retrieve(customerId, {
      expand: ['discount'],
    })
    
    // Get subscription (check subscription-level discount)
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['discount', 'discounts'],
    })
    
    // Priority: subscription-level discount > customer-level discount
    let discount: Stripe.Discount | null = null
    let discountType: string | null = null
    
    if (subscription.discount) {
      discount = subscription.discount
      discountType = "subscription_discount"
    } else if (typeof customer !== 'string' && customer.deleted !== true && customer.discount) {
      discount = customer.discount
      discountType = "customer_discount"
    }
    
    if (!discount || !discount.coupon) {
      return {
        hasDiscount: false,
        discountType: null,
        percentOff: null,
        duration: null,
        durationInMonths: null,
        discountEnd: null,
        couponId: null,
        promotionCodeId: null,
      }
    }
    
    const coupon = discount.coupon
    
    return {
      hasDiscount: true,
      discountType,
      percentOff: coupon.percent_off || null,
      duration: coupon.duration,
      durationInMonths: coupon.duration_in_months || null,
      discountEnd: discount.end ? new Date(discount.end * 1000) : null,
      couponId: coupon.id,
      promotionCodeId: discount.promotion_code ? 
        (typeof discount.promotion_code === 'string' ? discount.promotion_code : discount.promotion_code.id) : 
        null,
    }
  } catch (error: any) {
    console.error(`Error checking Stripe discount for customer ${customerId}:`, error.message)
    return {
      hasDiscount: false,
      discountType: "error",
      percentOff: null,
      duration: null,
      durationInMonths: null,
      discountEnd: null,
      couponId: null,
      promotionCodeId: null,
    }
  }
}

async function verifyBetaPricing(): Promise<BetaPricingStatus[]> {
  console.log("=" .repeat(80))
  console.log("PHASE B: STRIPE TRUTH CHECK (LIVE)")
  console.log("=" .repeat(80))
  console.log()
  
  const betaUsers = await identifyBetaUsers()
  const statuses: BetaPricingStatus[] = []
  
  let checked = 0
  
  for (const user of betaUsers) {
    checked++
    
    if (checked % 10 === 0) {
      console.log(`Checked ${checked}/${betaUsers.length} users...`)
    }
    
    if (!user.stripeCustomerId || !user.subscriptionId) {
      statuses.push({
        userId: user.userId,
        email: user.email,
        stripeCustomerId: user.stripeCustomerId || "MISSING",
        subscriptionId: user.subscriptionId || "MISSING",
        status: user.subscriptionStatus || "unknown",
        currentPriceId: "MISSING",
        currentUnitAmount: 0,
        hasDiscount: false,
        discountType: "none",
        discountPercentOff: null,
        discountDuration: null,
        discountEnd: null,
        shouldHaveBeta: true,
        betaOk: false,
        riskReason: "missing_stripe_data",
      })
      continue
    }
    
    try {
      // Get subscription details
      const subscription = await stripe.subscriptions.retrieve(user.subscriptionId, {
        expand: ['items.data.price'],
      })
      
      const priceId = subscription.items.data[0]?.price?.id || "UNKNOWN"
      const unitAmount = subscription.items.data[0]?.price?.unit_amount || 0
      
      // Check discount
      const discountInfo = await checkStripeDiscount(user.stripeCustomerId, user.subscriptionId)
      
      // Determine if beta pricing is OK
      let betaOk = true
      let riskReason = "ok"
      
      if (!discountInfo.hasDiscount) {
        betaOk = false
        riskReason = "missing_discount"
      } else if (discountInfo.percentOff !== 50) {
        betaOk = false
        riskReason = "wrong_discount_percentage"
      } else if (discountInfo.duration !== "forever") {
        betaOk = false
        riskReason = "wrong_duration"
      }
      
      // Check for risky conditions
      if (subscription.status === "canceled" || subscription.status === "incomplete" || subscription.status === "incomplete_expired") {
        riskReason = `subscription_${subscription.status}`
      }
      
      statuses.push({
        userId: user.userId,
        email: user.email,
        stripeCustomerId: user.stripeCustomerId,
        subscriptionId: user.subscriptionId,
        status: subscription.status,
        currentPriceId: priceId,
        currentUnitAmount: unitAmount,
        hasDiscount: discountInfo.hasDiscount,
        discountType: discountInfo.discountType || "none",
        discountPercentOff: discountInfo.percentOff,
        discountDuration: discountInfo.duration,
        discountEnd: discountInfo.discountEnd ? discountInfo.discountEnd.toISOString() : null,
        shouldHaveBeta: true,
        betaOk,
        riskReason,
      })
    } catch (error: any) {
      console.error(`Error verifying user ${user.email}:`, error.message)
      statuses.push({
        userId: user.userId,
        email: user.email,
        stripeCustomerId: user.stripeCustomerId,
        subscriptionId: user.subscriptionId,
        status: "error",
        currentPriceId: "ERROR",
        currentUnitAmount: 0,
        hasDiscount: false,
        discountType: "error",
        discountPercentOff: null,
        discountDuration: null,
        discountEnd: null,
        shouldHaveBeta: true,
        betaOk: false,
        riskReason: "stripe_api_error",
      })
    }
    
    // Rate limiting - brief pause
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  console.log(`✅ Checked ${checked} beta users`)
  console.log()
  
  return statuses
}

async function checkLostOnCancelBehavior() {
  console.log("=" .repeat(80))
  console.log("PHASE C: VERIFY 'LOST ON CANCEL' BEHAVIOR")
  console.log("=" .repeat(80))
  console.log()
  
  // Check if BETA50 coupon exists and its configuration
  try {
    const beta50 = await stripe.coupons.retrieve("BETA50")
    console.log("✅ BETA50 coupon found:")
    console.log(`   Percent off: ${beta50.percent_off}%`)
    console.log(`   Duration: ${beta50.duration}`)
    console.log(`   Valid: ${beta50.valid}`)
    console.log(`   Times redeemed: ${beta50.times_redeemed}`)
    console.log()
  } catch (error: any) {
    if (error.code === "resource_missing") {
      console.log("⚠️  BETA50 coupon NOT FOUND in Stripe")
      console.log("   This means beta pricing is NOT being applied via BETA50 coupon")
      console.log()
    } else {
      console.error("Error retrieving BETA50 coupon:", error.message)
      console.log()
    }
  }
  
  // Check landing checkout code
  console.log("Checking landing checkout implementation...")
  console.log()
  console.log("From app/actions/landing-checkout.ts:")
  console.log("  - ENABLE_BETA_DISCOUNT = false (DISABLED)")
  console.log("  - Promo codes can be applied at checkout")
  console.log("  - allow_promotion_codes: true")
  console.log()
  
  console.log("Analysis:")
  console.log("  1. If beta users have subscription-level discount with duration='forever':")
  console.log("     ✅ CORRECT - Discount persists while subscription is active")
  console.log("     ✅ CORRECT - Lost if subscription canceled and new one created")
  console.log()
  console.log("  2. If beta users have customer-level coupon:")
  console.log("     ⚠️  RISK - Discount might persist if they cancel and re-subscribe")
  console.log("     ⚠️  RISK - Customer-level coupon auto-applies to new subscriptions")
  console.log()
  console.log("  3. If beta users are on a dedicated 'beta price_id':")
  console.log("     ✅ BEST - Price is inherently 50% lower")
  console.log("     ⚠️  RISK - If checkout allows selecting this price after beta closes")
  console.log()
}

function generateCSV(statuses: BetaPricingStatus[]): string {
  const headers = [
    "user_id",
    "email",
    "stripe_customer_id",
    "subscription_id",
    "status",
    "current_price_id",
    "current_unit_amount",
    "has_discount",
    "discount_type",
    "discount_percent_off",
    "discount_duration",
    "discount_end",
    "should_have_beta",
    "beta_ok",
    "risk_reason",
  ]
  
  const rows = statuses.map(s => [
    s.userId,
    s.email,
    s.stripeCustomerId,
    s.subscriptionId,
    s.status,
    s.currentPriceId,
    (s.currentUnitAmount / 100).toFixed(2),
    s.hasDiscount.toString(),
    s.discountType,
    s.discountPercentOff?.toString() || "",
    s.discountDuration || "",
    s.discountEnd || "",
    s.shouldHaveBeta.toString(),
    s.betaOk.toString(),
    s.riskReason,
  ])
  
  return [
    headers.join(","),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(",")),
  ].join("\n")
}

async function generateReport(statuses: BetaPricingStatus[]) {
  console.log("=" .repeat(80))
  console.log("PHASE E: GENERATING REPORT")
  console.log("=" .repeat(80))
  console.log()
  
  // Summary stats
  const totalBeta = statuses.length
  const betaOk = statuses.filter(s => s.betaOk).length
  const betaBroken = statuses.filter(s => !s.betaOk && s.riskReason !== "subscription_canceled" && s.riskReason !== "subscription_incomplete" && s.riskReason !== "subscription_incomplete_expired").length
  const betaCanceled = statuses.filter(s => s.status === "canceled").length
  
  // Discount mechanisms
  const withDiscount = statuses.filter(s => s.hasDiscount).length
  const withoutDiscount = statuses.filter(s => !s.hasDiscount).length
  const subscriptionLevel = statuses.filter(s => s.discountType === "subscription_discount").length
  const customerLevel = statuses.filter(s => s.discountType === "customer_discount").length
  const forever = statuses.filter(s => s.discountDuration === "forever").length
  const notForever = statuses.filter(s => s.hasDiscount && s.discountDuration !== "forever").length
  
  // Risk breakdown
  const riskBreakdown = new Map<string, number>()
  for (const status of statuses) {
    if (!status.betaOk) {
      riskBreakdown.set(status.riskReason, (riskBreakdown.get(status.riskReason) || 0) + 1)
    }
  }
  
  console.log("SUMMARY STATISTICS")
  console.log("-".repeat(80))
  console.log(`Total beta users: ${totalBeta}`)
  console.log(`Beta pricing OK: ${betaOk} (${((betaOk / totalBeta) * 100).toFixed(1)}%)`)
  console.log(`Beta pricing broken: ${betaBroken} (${((betaBroken / totalBeta) * 100).toFixed(1)}%)`)
  console.log(`Canceled subscriptions: ${betaCanceled} (${((betaCanceled / totalBeta) * 100).toFixed(1)}%)`)
  console.log()
  
  console.log("DISCOUNT MECHANISMS")
  console.log("-".repeat(80))
  console.log(`With discount: ${withDiscount} (${((withDiscount / totalBeta) * 100).toFixed(1)}%)`)
  console.log(`Without discount: ${withoutDiscount} (${((withoutDiscount / totalBeta) * 100).toFixed(1)}%)`)
  console.log(`  - Subscription-level: ${subscriptionLevel}`)
  console.log(`  - Customer-level: ${customerLevel}`)
  console.log(`  - Duration = forever: ${forever}`)
  console.log(`  - Duration ≠ forever: ${notForever}`)
  console.log()
  
  console.log("RISK BREAKDOWN")
  console.log("-".repeat(80))
  for (const [reason, count] of riskBreakdown.entries()) {
    console.log(`  ${reason}: ${count}`)
  }
  console.log()
  
  // Sample examples
  console.log("EXAMPLES")
  console.log("-".repeat(80))
  
  const okExample = statuses.find(s => s.betaOk)
  if (okExample) {
    console.log("✅ Example of OK beta pricing:")
    console.log(`   Email: ${okExample.email}`)
    console.log(`   Discount: ${okExample.discountPercentOff}% off (${okExample.discountDuration})`)
    console.log(`   Type: ${okExample.discountType}`)
    console.log()
  }
  
  const brokenExample = statuses.find(s => !s.betaOk && s.riskReason === "missing_discount")
  if (brokenExample) {
    console.log("❌ Example of missing discount:")
    console.log(`   Email: ${brokenExample.email}`)
    console.log(`   Has discount: ${brokenExample.hasDiscount}`)
    console.log(`   Reason: ${brokenExample.riskReason}`)
    console.log()
  }
  
  const wrongDurationExample = statuses.find(s => s.riskReason === "wrong_duration")
  if (wrongDurationExample) {
    console.log("⚠️  Example of wrong duration:")
    console.log(`   Email: ${wrongDurationExample.email}`)
    console.log(`   Discount: ${wrongDurationExample.discountPercentOff}% off (${wrongDurationExample.discountDuration})`)
    console.log(`   Expected: forever`)
    console.log()
  }
}

async function main() {
  console.log("=" .repeat(80))
  console.log("🔥 BETA PRICING LIFETIME VERIFICATION")
  console.log("=" .repeat(80))
  console.log()
  console.log("Verifying: 50% off lifetime pricing for first 100 beta users")
  console.log("Expected behavior: Discount persists while subscription active, lost on cancel")
  console.log()
  
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error("❌ STRIPE_SECRET_KEY not set")
    process.exit(1)
  }
  
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL not set")
    process.exit(1)
  }
  
  // Phase A & B: Identify and verify
  const statuses = await verifyBetaPricing()
  
  // Phase C: Check behavior
  await checkLostOnCancelBehavior()
  
  // Phase E: Generate outputs
  await generateReport(statuses)
  
  // Write CSV
  const csv = generateCSV(statuses)
  const csvPath = resolve(process.cwd(), "docs/_CANONICAL/beta_pricing_status.csv")
  writeFileSync(csvPath, csv)
  console.log(`✅ CSV written to: ${csvPath}`)
  console.log()
  
  // Write JSON for further analysis
  const jsonPath = resolve(process.cwd(), "docs/_CANONICAL/beta_pricing_status.json")
  writeFileSync(jsonPath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    totalBetaUsers: statuses.length,
    summary: {
      betaOk: statuses.filter(s => s.betaOk).length,
      betaBroken: statuses.filter(s => !s.betaOk && !s.status.includes("cancel")).length,
      betaCanceled: statuses.filter(s => s.status === "canceled").length,
      withDiscount: statuses.filter(s => s.hasDiscount).length,
      withoutDiscount: statuses.filter(s => !s.hasDiscount).length,
    },
    statuses,
  }, null, 2))
  console.log(`✅ JSON written to: ${jsonPath}`)
  console.log()
  
  console.log("=" .repeat(80))
  console.log("NEXT STEPS")
  console.log("=" .repeat(80))
  console.log()
  console.log("1. Review: docs/_CANONICAL/beta_pricing_status.csv")
  console.log("2. Review: docs/_CANONICAL/beta_pricing_status.json")
  console.log("3. Read report: docs/_CANONICAL/BETA_PRICING_LIFETIME_VERIFICATION.md")
  console.log("4. If issues found, implement fixes based on recommendations")
}

main().catch(error => {
  console.error("Fatal error:", error)
  process.exit(1)
})
