import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL || "")

export async function GET() {
  try {
    console.log("[v0] Beta users API: Fetching beta user count")

    // Since the beta is still active, everyone who subscribes gets the 50% discount
    const result = await sql`
      SELECT COUNT(*) as beta_count
      FROM users u
      INNER JOIN subscriptions s ON u.id = s.user_id::varchar
      WHERE s.product_type = 'sselfie_studio_membership'
        AND s.status = 'active'
        AND s.is_test_mode = FALSE
    `

    const betaCount = Number.parseInt(result[0]?.beta_count || "0")
    const betaLimit = 100
    const remaining = Math.max(0, betaLimit - betaCount)
    const percentageFilled = Math.min(100, (betaCount / betaLimit) * 100)
    const shouldUpdatePricing = betaCount >= betaLimit

    const recentBetaUsers = await sql`
      SELECT 
        u.email,
        u.created_at,
        s.status
      FROM users u
      INNER JOIN subscriptions s ON u.id = s.user_id::varchar
      WHERE s.product_type = 'sselfie_studio_membership'
        AND s.is_test_mode = FALSE
      ORDER BY u.created_at DESC
      LIMIT 10
    `

    const allBetaUsers = await sql`
      SELECT 
        u.email,
        u.created_at as joined_at,
        s.status,
        s.plan,
        COALESCE(SUM(ct.amount) / 100.0, 14.50) as revenue
      FROM users u
      INNER JOIN subscriptions s ON u.id = s.user_id::varchar
      LEFT JOIN credit_transactions ct ON u.id = ct.user_id AND ct.is_test_mode = FALSE
      WHERE s.product_type = 'sselfie_studio_membership'
        AND s.is_test_mode = FALSE
      GROUP BY u.id, u.email, u.created_at, s.status, s.plan
      ORDER BY u.created_at DESC
    `

    const formattedAllUsers = allBetaUsers.map((user: any) => ({
      email: user.email,
      joinedAt: user.joined_at,
      plan: user.plan || "sselfie_studio_membership",
      status: user.status,
      revenue: parseFloat(user.revenue) || 14.50,
    }))

    console.log("[v0] Beta users API: Success", {
      betaCount,
      remaining,
      shouldUpdatePricing,
      totalBetaUsers: allBetaUsers.length,
    })

    return NextResponse.json({
      betaCount,
      betaLimit,
      remaining,
      percentageFilled,
      shouldUpdatePricing,
      recentBetaUsers: recentBetaUsers.map((user) => ({
        email: user.email,
        joinedAt: user.created_at,
        plan: "sselfie_studio_membership",
        status: user.status,
      })),
      allBetaUsers: formattedAllUsers,
    })
  } catch (error) {
    console.error("[v0] Beta users API error:", error)
    return NextResponse.json(
      {
        betaCount: 0,
        betaLimit: 100,
        remaining: 100,
        percentageFilled: 0,
        shouldUpdatePricing: false,
        recentBetaUsers: [],
        allBetaUsers: [],
      },
      { status: 200 }
    )
  }
}
