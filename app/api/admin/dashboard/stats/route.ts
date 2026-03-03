import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { sql } from "@/lib/db/client"
import { PRICING_PRODUCTS } from "@/lib/products"
import { getSingleSourceRevenueMetrics } from "@/lib/revenue/single-source"
import { getDBRevenueMetrics } from "@/lib/revenue/db-revenue-metrics"

function getAdminEmail() {
  return String(process.env.ADMIN_EMAIL || "ssa@ssasocial.com").trim().toLowerCase()
}

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
    if (!neonUser || String(neonUser.email || "").trim().toLowerCase() !== getAdminEmail()) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }


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
        AND (
          product_type = 'paid_blueprint'
          OR (
            stripe_subscription_id IS NOT NULL
            AND BTRIM(stripe_subscription_id) <> ''
          )
        )
      GROUP BY product_type
    `

    let mrr = 0
    let activeSubscriptions = 0
    let activeBlueprintEntitlements = 0

    subscriptionsResult.forEach((sub: any) => {
      if (sub.product_type === "paid_blueprint") {
        activeBlueprintEntitlements += Number(sub.count || 0)
      }

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
        const isRecurringMembership =
          sub.product_type === "sselfie_studio_membership" ||
          sub.product_type === "brand_studio_membership" ||
          sub.product_type === "pro"

        if (isRecurringMembership) {
          mrr += revenue
          activeSubscriptions += Number(sub.count)
        }
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
          AND stripe_subscription_id IS NOT NULL
          AND BTRIM(stripe_subscription_id) <> ''
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

    const conversionOpsResult = await sql`
      SELECT
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '90 days')::int AS applications_90d,
        COUNT(*) FILTER (
          WHERE created_at > NOW() - INTERVAL '90 days'
            AND (
              COALESCE(qualified, FALSE) = TRUE
              OR pipeline_stage IN ('qualified_queue', 'contacted', 'call_booked', 'call_completed', 'offer_sent', 'closed_won')
            )
        )::int AS qualified_90d,
        COUNT(*) FILTER (WHERE call_booked_at > NOW() - INTERVAL '90 days')::int AS calls_booked_90d,
        COUNT(*) FILTER (WHERE offer_sent_at > NOW() - INTERVAL '90 days')::int AS offers_sent_90d,
        COUNT(*) FILTER (WHERE closed_at > NOW() - INTERVAL '90 days' AND pipeline_stage = 'closed_won')::int AS closed_won_90d,
        COALESCE(SUM(cash_collected_cents) FILTER (WHERE closed_at > NOW() - INTERVAL '90 days' AND pipeline_stage = 'closed_won'), 0)::bigint AS cash_90d_cents
      FROM brand_engine_applications
    `

    const membershipOpsResult = await sql`
      WITH membership_subs AS (
        SELECT *
        FROM subscriptions s
        WHERE COALESCE(s.product_type, '') IN ('sselfie_studio_membership', 'brand_studio_membership', 'pro')
          AND (s.is_test_mode = FALSE OR s.is_test_mode IS NULL)
      )
      SELECT
        COUNT(*) FILTER (WHERE status = 'active')::int AS active_now,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days')::int AS new_30d,
        COUNT(*) FILTER (
          WHERE LOWER(COALESCE(status, '')) IN ('canceled', 'cancelled')
            AND COALESCE(
              NULLIF(to_jsonb(membership_subs)->>'canceled_at', '')::timestamptz,
              NULLIF(to_jsonb(membership_subs)->>'cancelled_at', '')::timestamptz,
              updated_at,
              created_at
            ) > NOW() - INTERVAL '30 days'
        )::int AS churned_30d
      FROM membership_subs
    `

    // Log conversion rate details for verification
    console.log(`[Dashboard Stats] Conversion rate: ${paidUsers}/${totalUsers} = ${conversionRate}%`)
    
    // Get total revenue from database metrics (comprehensive, all payment types)
    const dbTotalRevenue = dbRevenueMetrics.totalRevenue

    // Get Stripe + DB single-source metrics (cached, 5-min TTL)
    let stripeMetrics
    try {
      stripeMetrics = await getSingleSourceRevenueMetrics()
    } catch (error: any) {
      console.error("[Dashboard Stats] Error fetching Stripe single-source metrics:", error.message || error)
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
    const finalActiveSubscriptions = stripeMetrics ? stripeMetrics.activeSubscriptions : dbActiveSubscriptions

    const stats = {
      totalUsers: Number(usersResult[0]?.total_users || 0),
      activeSubscriptions: finalActiveSubscriptions,
      activeRecurringSubscriptions: finalActiveSubscriptions,
      activeBlueprintEntitlements,
      mrr: finalMrr, // Use Stripe live MRR (real-time) or DB fallback
      totalRevenue: stripeMetrics?.totalRevenue || dbTotalRevenue,
      conversionRate,
      // Stripe live metrics (primary source of truth for revenue)
      stripeLive: stripeMetrics
        ? {
            activeSubscriptions: stripeMetrics.activeSubscriptions,
            totalSubscriptions: stripeMetrics.totalSubscriptions,
            canceledSubscriptions30d: stripeMetrics.canceledSubscriptions30d,
            totalRevenue: stripeMetrics.totalRevenue,
            mrr: stripeMetrics.mrr,
            oneTimeRevenue: stripeMetrics.oneTimeRevenue,
            creditPurchaseRevenue: stripeMetrics.creditPurchaseRevenue,
            newSubscribers30d: stripeMetrics.newSubscribers30d,
            newOneTimeBuyers30d: 0,
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
      conversionOps: {
        applications90d: Number(conversionOpsResult[0]?.applications_90d || 0),
        qualified90d: Number(conversionOpsResult[0]?.qualified_90d || 0),
        callsBooked90d: Number(conversionOpsResult[0]?.calls_booked_90d || 0),
        offersSent90d: Number(conversionOpsResult[0]?.offers_sent_90d || 0),
        closedWon90d: Number(conversionOpsResult[0]?.closed_won_90d || 0),
        cashCollected90dCents: Number(conversionOpsResult[0]?.cash_90d_cents || 0),
        activeMembershipsNow: Number(membershipOpsResult[0]?.active_now || 0),
        newMemberships30d: Number(membershipOpsResult[0]?.new_30d || 0),
        churnedMemberships30d: Number(membershipOpsResult[0]?.churned_30d || 0),
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
