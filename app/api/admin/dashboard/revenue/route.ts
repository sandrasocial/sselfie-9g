import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"
import { stripe } from "@/lib/stripe"
import type Stripe from "stripe"

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

    // Get actual subscription prices from products config
    const { PRICING_PRODUCTS } = await import("@/lib/products")
    
    const subscriptionsResult = await sql`
      SELECT 
        product_type,
        COUNT(*) as count
      FROM subscriptions
      WHERE status = 'active'
      AND is_test_mode = FALSE
      GROUP BY product_type
    `

    // Calculate MRR (Monthly Recurring Revenue) using correct prices
    let mrr = 0
    const subscriptionBreakdown = subscriptionsResult.map((sub) => {
      // Get actual price from products config
      const product = PRICING_PRODUCTS.find((p) => p.type === sub.product_type)
      const priceCents = product?.priceInCents || 0
      const revenue = (Number(sub.count) * priceCents) / 100
      
      // MRR only includes recurring subscriptions (not one-time sessions)
      if (sub.product_type === "sselfie_studio_membership" || sub.product_type === "brand_studio_membership") {
        mrr += revenue
      }
      
      // Map product type to display tier name
      const tierMap: Record<string, string> = {
        sselfie_studio_membership: "Content Creator Studio",
        brand_studio_membership: "Brand Studio",
        one_time_session: "One-Time Session",
      }
      const tier = tierMap[sub.product_type] || sub.product_type
      
      return {
        productType: sub.product_type,
        tier: tier, // Add tier for frontend compatibility
        count: Number(sub.count),
        revenue: revenue,
        priceCents: priceCents,
      }
    })

    const creditPurchasesResult = await sql`
      SELECT 
        COUNT(*) as total_purchases,
        SUM(amount) as total_credits_sold,
        SUM(amount) FILTER (WHERE stripe_payment_id IS NOT NULL) as real_credit_revenue_cents
      FROM credit_transactions
      WHERE transaction_type = 'purchase'
      AND stripe_payment_id IS NOT NULL
      AND is_test_mode = FALSE
    `

    // Get ALL successful payments from Stripe (with pagination)
    // IMPORTANT: Stripe's list() only returns 100 items by default
    // We need to paginate to get ALL charges for accurate revenue
    const getAllCharges = async () => {
      let allCharges: Stripe.Charge[] = []
      let hasMore = true
      let startingAfter: string | undefined = undefined

      while (hasMore) {
        const charges = await stripe.charges.list({
          limit: 100,
          ...(startingAfter && { starting_after: startingAfter }),
        })

        allCharges = allCharges.concat(charges.data)
        hasMore = charges.has_more
        if (hasMore && charges.data.length > 0) {
          startingAfter = charges.data[charges.data.length - 1].id
        }
      }

      return allCharges
    }

    // Get all charges (paginated)
    const allCharges = await getAllCharges()

    // Filter for successful, non-refunded, production charges
    const successfulCharges = allCharges.filter(
      (charge) => charge.paid && !charge.refunded && charge.livemode === true,
    )

    // Total Revenue = Sum of all successful Stripe payments
    // NOTE: This already includes:
    // - Subscription payments (monthly recurring)
    // - One-time session payments
    // - Credit top-up purchases
    // DO NOT add MRR separately - that would double count subscription revenue!
    const totalRevenue = successfulCharges.reduce((sum, charge) => sum + charge.amount, 0) / 100

    // One-time revenue (last 30 days) - excludes subscription payments
    const thirtyDaysAgo = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60
    const oneTimeCharges = successfulCharges.filter(
      (charge) => charge.created >= thirtyDaysAgo && !charge.invoice, // Invoices are subscriptions
    )
    const oneTimeRevenue = oneTimeCharges.reduce((sum, charge) => sum + charge.amount, 0) / 100

    const revenueTrend = await sql`
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
    `

    const recentTransactions = await sql`
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
    `

    const userStats = await sql`
      SELECT 
        COUNT(DISTINCT u.id) as total_users,
        COUNT(DISTINCT um.id) FILTER (WHERE um.training_status = 'completed') as users_with_models,
        COUNT(DISTINCT s.id) FILTER (WHERE s.status = 'active' AND s.is_test_mode = FALSE) as active_subscribers
      FROM users u
      LEFT JOIN user_models um ON um.user_id = u.id
      LEFT JOIN subscriptions s ON s.user_id = u.id
    `

    const realCreditRevenue = Number(creditPurchasesResult[0]?.real_credit_revenue_cents || 0) / 100

    return NextResponse.json({
      mrr: Math.round(mrr * 100) / 100, // Keep 2 decimal places for MRR
      totalRevenue: Math.round(totalRevenue * 100) / 100, // Total from Stripe (already includes everything)
      oneTimeRevenue: Math.round(oneTimeRevenue * 100) / 100,
      realCreditRevenue: Math.round(realCreditRevenue * 100) / 100,
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
