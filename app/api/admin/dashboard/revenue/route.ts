import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"
import { stripe } from "@/lib/stripe"

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "ssa@ssasocial.com"

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

    // Get active subscriptions for MRR calculation
    const subscriptionsResult = await sql`
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
      GROUP BY product_type
    `

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

    // Get one-time credit purchases from transactions
    const creditPurchasesResult = await sql`
      SELECT 
        COUNT(*) as total_purchases,
        SUM(amount) as total_credits_sold,
        SUM(amount) FILTER (WHERE stripe_payment_id IS NOT NULL) as real_credit_revenue_cents
      FROM credit_transactions
      WHERE transaction_type = 'purchase'
      AND stripe_payment_id IS NOT NULL
    `

    // Get revenue from Stripe for one-time purchases (last 30 days)
    const thirtyDaysAgo = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60
    const charges = await stripe.charges.list({
      limit: 100,
      created: { gte: thirtyDaysAgo },
    })

    const oneTimeRevenue =
      charges.data.filter((charge) => charge.paid && !charge.refunded).reduce((sum, charge) => sum + charge.amount, 0) /
      100

    // Get total revenue from all time
    const allCharges = await stripe.charges.list({
      limit: 100,
    })

    const totalRevenue =
      allCharges.data
        .filter((charge) => charge.paid && !charge.refunded)
        .reduce((sum, charge) => sum + charge.amount, 0) / 100

    // Get revenue trend (last 6 months)
    const revenueTrend = await sql`
      SELECT 
        DATE_TRUNC('month', created_at) as month,
        COUNT(*) as purchases,
        SUM(amount) as credits_sold
      FROM credit_transactions
      WHERE transaction_type = 'purchase'
      AND created_at > NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month DESC
    `

    // Get recent transactions
    const recentTransactions = await sql`
      SELECT 
        ct.amount,
        ct.transaction_type,
        ct.description,
        ct.created_at,
        ct.stripe_payment_id,
        u.email as user_email
      FROM credit_transactions ct
      JOIN users u ON ct.user_id = u.id
      WHERE ct.stripe_payment_id IS NOT NULL
      ORDER BY ct.created_at DESC
      LIMIT 10
    `

    // Get stats for users with trained models
    const userStats = await sql`
      SELECT 
        COUNT(DISTINCT u.id) as total_users,
        COUNT(DISTINCT um.id) FILTER (WHERE um.training_status = 'completed') as users_with_models,
        COUNT(DISTINCT s.id) FILTER (WHERE s.status = 'active') as active_subscribers
      FROM users u
      LEFT JOIN user_models um ON um.user_id = u.id
      LEFT JOIN subscriptions s ON s.user_id = u.id
    `

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
      })),
    })
  } catch (error) {
    console.error("[v0] Error fetching revenue data:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
