import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"
import { PRICING_PRODUCTS } from "@/lib/products"

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

    // Get total users
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
      const product = PRICING_PRODUCTS.find((p) => p.type === sub.product_type)
      if (product) {
        const priceDollars = product.priceInCents / 100
        const revenue = Number(sub.count) * priceDollars
        
        // MRR only includes recurring subscriptions (not one-time sessions)
        if (sub.product_type === "sselfie_studio_membership" || sub.product_type === "brand_studio_membership") {
          mrr += revenue
        }
        
        activeSubscriptions += Number(sub.count)
      }
    })

    // Get total revenue from credit transactions
    const totalRevenueData = await sql`
      SELECT 
        SUM(amount)::int as total_revenue
      FROM credit_transactions
      WHERE transaction_type = 'purchase'
        AND (is_test_mode = FALSE OR is_test_mode IS NULL)
        AND stripe_payment_id IS NOT NULL
    `

    // Calculate conversion rate (users who signed up in last 30 days and made a purchase)
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

    const stats = {
      totalUsers: Number(usersResult[0]?.total_users || 0),
      activeSubscriptions,
      mrr: Math.round(mrr),
      totalRevenue: Number(totalRevenueData[0]?.total_revenue || 0) / 100, // Convert cents to dollars
      conversionRate
    }

    console.log("[Dashboard Stats] Real data fetched:", stats)

    return NextResponse.json(stats)
  } catch (error) {
    console.error("[Dashboard Stats] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
