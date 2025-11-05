import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    console.log("[v0] Beta users API: Fetching beta user count")

    // Count total users who have purchased (have subscriptions or credits)
    const result = await sql`
      SELECT COUNT(DISTINCT u.id) as beta_count
      FROM users u
      LEFT JOIN subscriptions s ON u.id = s.user_id
      LEFT JOIN credit_transactions ct ON u.id = ct.user_id
      WHERE u.created_at IS NOT NULL
      AND (s.id IS NOT NULL OR ct.id IS NOT NULL)
    `

    const betaCount = Number.parseInt(result[0]?.beta_count || "0")
    const betaLimit = 100
    const remaining = Math.max(0, betaLimit - betaCount)
    const percentageFilled = Math.min(100, (betaCount / betaLimit) * 100)
    const shouldUpdatePricing = betaCount >= betaLimit

    // Get recent beta users
    const recentBetaUsers = await sql`
      SELECT 
        u.email,
        u.created_at,
        s.plan,
        s.status
      FROM users u
      LEFT JOIN subscriptions s ON u.id = s.user_id
      WHERE u.created_at IS NOT NULL
      AND (s.id IS NOT NULL)
      ORDER BY u.created_at DESC
      LIMIT 10
    `

    console.log("[v0] Beta users API: Success", {
      betaCount,
      remaining,
      shouldUpdatePricing,
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
        plan: user.plan || "one-time",
        status: user.status || "active",
      })),
    })
  } catch (error) {
    console.error("[v0] Beta users API error:", error)
    return NextResponse.json({ error: "Failed to fetch beta user data" }, { status: 500 })
  }
}
