import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"
import { stripe } from "@/lib/stripe"

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

    // Get active subscriptions for MRR calculation
    const subscriptionsResult = await sql`
      SELECT 
        plan,
        COUNT(*) as count,
        CASE 
          WHEN plan = 'starter' THEN 4900
          WHEN plan = 'pro' THEN 9900
          WHEN plan = 'elite' THEN 19900
          ELSE 0
        END as price_cents
      FROM subscriptions
      WHERE status = 'active'
      GROUP BY plan
    `

    // Calculate MRR (Monthly Recurring Revenue)
    let mrr = 0
    const subscriptionBreakdown = subscriptionsResult.map((sub) => {
      const revenue = (Number(sub.count) * Number(sub.price_cents)) / 100
      mrr += revenue
      return {
        tier: sub.plan, // Using 'plan' from database but returning as 'tier' for consistency
        count: Number(sub.count),
        revenue: revenue,
      }
    })

    // Get one-time credit purchases from transactions
    const creditPurchasesResult = await sql`
      SELECT 
        COUNT(*) as total_purchases,
        SUM(amount) as total_credits_sold
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
        u.email as user_email
      FROM credit_transactions ct
      JOIN users u ON ct.user_id = u.id
      WHERE ct.transaction_type IN ('purchase', 'subscription_grant')
      ORDER BY ct.created_at DESC
      LIMIT 10
    `

    return NextResponse.json({
      mrr: Math.round(mrr),
      totalRevenue: Math.round(totalRevenue + mrr),
      oneTimeRevenue: Math.round(oneTimeRevenue),
      subscriptionBreakdown,
      totalPurchases: Number(creditPurchasesResult[0]?.total_purchases || 0),
      totalCreditsSold: Number(creditPurchasesResult[0]?.total_credits_sold || 0),
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
        timestamp: tx.created_at,
      })),
    })
  } catch (error) {
    console.error("[v0] Error fetching revenue data:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
