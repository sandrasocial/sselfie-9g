import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"
import { PRICING_PRODUCTS } from "@/lib/products"
import { getStripeLiveMetrics } from "@/lib/stripe/stripe-live-metrics"
import { getDBRevenueMetrics } from "@/lib/revenue/db-revenue-metrics"

const ADMIN_EMAIL = "ssa@ssasocial.com"

export async function GET() {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(user.id)
    if (!neonUser || neonUser.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const sql = neon(process.env.DATABASE_URL!)

    // Get total users (all users with email addresses)
    // This counts all registered users regardless of payment status
    const usersResult = await sql`
      SELECT COUNT(*)::int as total_users
      FROM users
      WHERE email IS NOT NULL
    `

    // Get active subscriptions and calculate MRR
    const subscriptionsResult = await sql`
      SELECT 
        product_type,
        COUNT(*)::int as count
      FROM subscriptions
      WHERE status = 'active'
        AND (is_test_mode = FALSE OR is_test_mode IS NULL)
      GROUP BY product_type
    `

    let mrr = 0
    let activeSubscriptions = 0

    subscriptionsResult.forEach((sub: any) => {
      // Handle legacy brand_studio_membership (no longer in PRICING_PRODUCTS)
      let priceCents: number
      if (sub.product_type === "brand_studio_membership") {
        // Legacy Brand Studio: $149/month (14900 cents)
        priceCents = 14900
      } else {
        const product = PRICING_PRODUCTS.find((p) => p.type === sub.product_type)
        priceCents = product?.priceInCents || 0
      }
      
      if (priceCents > 0) {
        const priceDollars = priceCents / 100
        const revenue = Number(sub.count) * priceDollars
        
        // MRR only includes recurring subscriptions (not one-time sessions)
        if (sub.product_type === "sselfie_studio_membership" || sub.product_type === "brand_studio_membership") {
          mrr += revenue
        }
        
        activeSubscriptions += Number(sub.count)
      }
    })

    // Get total revenue from database using comprehensive helper (prioritizes stripe_payments)
    // This ensures we get ALL revenue types: subscriptions, one-time, credits
    let dbRevenueMetrics
    try {
      dbRevenueMetrics = await getDBRevenueMetrics()
      console.log(`[Dashboard Stats] DB Revenue Metrics:`, {
        total: dbRevenueMetrics.totalRevenue,
        subscriptions: dbRevenueMetrics.subscriptionRevenue,
        oneTime: dbRevenueMetrics.oneTimeRevenue,
        credits: dbRevenueMetrics.creditPurchaseRevenue,
      })
    } catch (error: any) {
      console.error(`[Dashboard Stats] Error fetching DB revenue metrics:`, error.message)
      dbRevenueMetrics = {
        totalRevenue: 0,
        subscriptionRevenue: 0,
        oneTimeRevenue: 0,
        creditPurchaseRevenue: 0,
      }
    }

    // Calculate conversion rate (users who signed up in last 30 days and made a purchase)
    // Conversion = (paid users / total new users) * 100
    // Paid users = users with active subscriptions OR users with purchase transactions
    // Excludes test mode transactions
    const conversionData = await sql`
      WITH recent_users AS (
        SELECT id
        FROM users
        WHERE created_at > NOW() - INTERVAL '30 days'
          AND email IS NOT NULL
      ),
      paid_users AS (
        SELECT DISTINCT user_id::varchar
        FROM subscriptions
        WHERE status = 'active'
          AND (is_test_mode = FALSE OR is_test_mode IS NULL)
        UNION
        SELECT DISTINCT user_id::varchar
        FROM credit_transactions
        WHERE transaction_type = 'purchase'
          AND stripe_payment_id IS NOT NULL
          AND (is_test_mode = FALSE OR is_test_mode IS NULL)
      )
      SELECT 
        COUNT(DISTINCT ru.id)::int as total_users,
        COUNT(DISTINCT CASE WHEN pu.user_id IS NOT NULL THEN ru.id END)::int as paid_users
      FROM recent_users ru
      LEFT JOIN paid_users pu ON ru.id = pu.user_id
    `

    const totalUsers = Number(conversionData[0]?.total_users || 0)
    const paidUsers = Number(conversionData[0]?.paid_users || 0)
    const conversionRate = totalUsers > 0 
      ? Math.round((paidUsers / totalUsers) * 100) 
      : 0

    // Log conversion rate details for verification
    console.log(`[Dashboard Stats] Conversion rate: ${paidUsers}/${totalUsers} = ${conversionRate}%`)
    
    // Get total revenue from database metrics (comprehensive, all payment types)
    const dbTotalRevenue = dbRevenueMetrics.totalRevenue

    // Get Stripe live metrics (cached, 5-min TTL)
    // Use Promise.race with timeout to prevent hanging
    // Increased timeout since we optimized to use database for revenue (faster)
    let stripeMetrics
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Stripe metrics timeout")), 30000) // 30 second timeout (optimized queries)
      )
      stripeMetrics = await Promise.race([getStripeLiveMetrics(), timeoutPromise])
    } catch (error: any) {
      console.error("[Dashboard Stats] Error fetching Stripe live metrics:", error.message || error)
      // Don't block dashboard - return DB values only
      stripeMetrics = null
    }

    // Calculate DB-based metrics for comparison
    const dbMrr = Math.round(mrr)
    const dbActiveSubscriptions = activeSubscriptions
    // dbTotalRevenue already defined above (line 146)

    // Compare Stripe live vs DB values and log discrepancies
    if (stripeMetrics) {
      const mrrDiff = Math.abs(stripeMetrics.mrr - dbMrr)
      const mrrDiffPercent = dbMrr > 0 ? (mrrDiff / dbMrr) * 100 : 0
      
      const subsDiff = Math.abs(stripeMetrics.activeSubscriptions - dbActiveSubscriptions)
      const subsDiffPercent = dbActiveSubscriptions > 0 ? (subsDiff / dbActiveSubscriptions) * 100 : 0

      if (mrrDiffPercent > 5) {
        console.warn(
          `[Dashboard Stats] ⚠️ MRR discrepancy detected: Stripe=${stripeMetrics.mrr}, DB=${dbMrr}, Diff=${mrrDiffPercent.toFixed(1)}%`
        )
      }

      if (subsDiffPercent > 5) {
        console.warn(
          `[Dashboard Stats] ⚠️ Active subscriptions discrepancy: Stripe=${stripeMetrics.activeSubscriptions}, DB=${dbActiveSubscriptions}, Diff=${subsDiffPercent.toFixed(1)}%`
        )
      }
    }

    // Use Stripe live MRR as primary source (includes beta prices, discounts, etc.)
    // Fall back to DB calculation if Stripe data unavailable
    const finalMrr = stripeMetrics ? stripeMetrics.mrr : dbMrr
    const finalActiveSubscriptions = stripeMetrics 
      ? stripeMetrics.activeSubscriptions 
      : dbActiveSubscriptions

    const stats = {
      totalUsers: Number(usersResult[0]?.total_users || 0),
      activeSubscriptions: finalActiveSubscriptions,
      mrr: finalMrr, // Use Stripe live MRR (real-time) or DB fallback
      totalRevenue: stripeMetrics?.totalRevenue || dbTotalRevenue, // Prioritize Stripe live, fallback to DB
      conversionRate,
      // Stripe live metrics (primary source of truth for revenue)
      stripeLive: stripeMetrics
        ? {
            activeSubscriptions: stripeMetrics.activeSubscriptions,
            totalSubscriptions: stripeMetrics.totalSubscriptions,
            canceledSubscriptions30d: stripeMetrics.canceledSubscriptions30d,
            totalRevenue: stripeMetrics.totalRevenue,
            mrr: stripeMetrics.mrr, // Real-time from Stripe (includes beta prices, discounts)
            oneTimeRevenue: stripeMetrics.oneTimeRevenue,
            creditPurchaseRevenue: stripeMetrics.creditPurchaseRevenue,
            newSubscribers30d: stripeMetrics.newSubscribers30d,
            newOneTimeBuyers30d: stripeMetrics.newOneTimeBuyers30d,
            timestamp: stripeMetrics.timestamp,
            cached: stripeMetrics.cached,
          }
        : null,
      // DB values for comparison (estimated, may not include beta prices/discounts)
      dbValues: {
        mrr: dbMrr,
        activeSubscriptions: dbActiveSubscriptions,
        totalRevenue: dbTotalRevenue,
      },
    }

    console.log("[Dashboard Stats] Real data fetched:", {
      ...stats,
      stripeLive: stripeMetrics ? "present" : "missing",
    })

    return NextResponse.json(stats)
  } catch (error) {
    console.error("[Dashboard Stats] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
