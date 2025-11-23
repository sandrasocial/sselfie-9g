import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"
import { stripe } from "@/lib/stripe"

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "ssa@ssasocial.com"

async function fetchStripeDataWithRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T | null> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn()
    } catch (error: any) {
      console.error(`[v0] Stripe API error (attempt ${i + 1}/${retries}):`, error.message)

      // Check if it's a rate limit error
      if (error.type === "StripeRateLimitError" || error.statusCode === 429) {
        if (i < retries - 1) {
          console.log(`[v0] Rate limited, retrying in ${delay}ms...`)
          await new Promise((resolve) => setTimeout(resolve, delay))
          delay *= 2 // Exponential backoff
          continue
        }
      }

      // For other errors, don't retry
      console.error("[v0] Stripe API error:", error)
      return null
    }
  }
  return null
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
    if (!neonUser || neonUser.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const sql = neon(process.env.DATABASE_URL || "")

    const [subscriptionsResult, creditPurchasesResult, revenueTrend, recentTransactions, userStats] = await Promise.all(
      [
        sql`
        SELECT 
          product_type,
          COUNT(*) as count,
          CASE 
            WHEN product_type = 'sselfie_studio_membership' THEN 9900
            WHEN product_type = 'one_time_session' THEN 4900
            ELSE 0
          END as price_cents
        FROM subscriptions
        WHERE status = 'active'
        AND is_test_mode = FALSE
        GROUP BY product_type
      `,
        sql`
        SELECT 
          COUNT(*) as total_purchases,
          SUM(amount) as total_credits_sold,
          SUM(amount) FILTER (WHERE stripe_payment_id IS NOT NULL) as real_credit_revenue_cents
        FROM credit_transactions
        WHERE transaction_type = 'purchase'
        AND stripe_payment_id IS NOT NULL
        AND is_test_mode = FALSE
      `,
        sql`
        SELECT 
          DATE_TRUNC('month', created_at) as month,
          COUNT(*) as purchases,
          SUM(amount) as credits_sold
        FROM credit_transactions
        WHERE transaction_type = 'purchase'
        AND created_at > NOW() - INTERVAL '6 months'
        AND is_test_mode = FALSE
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY month DESC
      `,
        sql`
        SELECT 
          ct.amount,
          ct.transaction_type,
          ct.description,
          ct.created_at,
          ct.stripe_payment_id,
          ct.is_test_mode,
          u.email as user_email
        FROM credit_transactions ct
        JOIN users u ON ct.user_id = u.id
        WHERE ct.stripe_payment_id IS NOT NULL
        AND ct.is_test_mode = FALSE
        ORDER BY ct.created_at DESC
        LIMIT 10
      `,
        sql`
        SELECT 
          COUNT(DISTINCT u.id) as total_users,
          COUNT(DISTINCT um.id) FILTER (WHERE um.training_status = 'completed') as users_with_models,
          COUNT(DISTINCT s.id) FILTER (WHERE s.status = 'active' AND s.is_test_mode = FALSE) as active_subscribers
        FROM users u
        LEFT JOIN user_models um ON um.user_id = u.id
        LEFT JOIN subscriptions s ON s.user_id = u.id
      `,
      ],
    )

    // Calculate MRR (Monthly Recurring Revenue)
    let mrr = 0
    const subscriptionBreakdown = subscriptionsResult.map((sub) => {
      const revenue = (Number(sub.count) * Number(sub.price_cents)) / 100
      if (sub.product_type === "sselfie_studio_membership") {
        mrr += revenue
      }
      return {
        productType: sub.product_type,
        count: Number(sub.count),
        revenue: revenue,
      }
    })

    const thirtyDaysAgo = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60

    // Fetch recent charges (30 days) with retry
    const charges = await fetchStripeDataWithRetry(() =>
      stripe.charges.list({
        limit: 100,
        created: { gte: thirtyDaysAgo },
      }),
    )

    const oneTimeRevenue = charges
      ? charges.data
          .filter((charge) => charge.paid && !charge.refunded && charge.livemode === true)
          .reduce((sum, charge) => sum + charge.amount, 0) / 100
      : 0

    // Fetch all charges with retry (but limit to reduce rate limiting)
    const allCharges = await fetchStripeDataWithRetry(() =>
      stripe.charges.list({
        limit: 100, // Keep limit reasonable to avoid rate limits
      }),
    )

    const totalRevenue = allCharges
      ? allCharges.data
          .filter((charge) => charge.paid && !charge.refunded && charge.livemode === true)
          .reduce((sum, charge) => sum + charge.amount, 0) / 100
      : 0

    const realCreditRevenue = Number(creditPurchasesResult[0]?.real_credit_revenue_cents || 0) / 100

    return NextResponse.json({
      mrr: Math.round(mrr),
      totalRevenue: Math.round(totalRevenue + mrr),
      oneTimeRevenue: Math.round(oneTimeRevenue),
      realCreditRevenue: Math.round(realCreditRevenue),
      subscriptionBreakdown,
      totalPurchases: Number(creditPurchasesResult[0]?.total_purchases || 0),
      totalCreditsSold: Number(creditPurchasesResult[0]?.total_credits_sold || 0),
      userStats: {
        totalUsers: Number(userStats[0]?.total_users || 0),
        usersWithModels: Number(userStats[0]?.users_with_models || 0),
        activeSubscribers: Number(userStats[0]?.active_subscribers || 0),
      },
      revenueTrend: revenueTrend.map((item) => ({
        month: item.month,
        purchases: Number(item.purchases),
        creditsSold: Number(item.credits_sold),
      })),
      recentTransactions: recentTransactions.map((tx) => ({
        amount: Number(tx.amount),
        type: tx.transaction_type,
        description: tx.description,
        userEmail: tx.user_email,
        stripePaymentId: tx.stripe_payment_id,
        timestamp: tx.created_at,
        isTestMode: tx.is_test_mode || false,
      })),
    })
  } catch (error) {
    console.error("[v0] Error fetching revenue data:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
