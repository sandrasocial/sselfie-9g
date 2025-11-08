import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL || "")

export async function GET() {
  try {
    console.log("[v0] Beta users API: Fetching real user count")

    const result = await sql`
      SELECT COUNT(DISTINCT u.id) as real_user_count
      FROM users u
      INNER JOIN user_models um ON u.id = um.user_id
      WHERE um.training_status = 'completed'
    `

    const realUserCount = Number.parseInt(result[0]?.real_user_count || "0")
    const betaLimit = 100
    const remaining = Math.max(0, betaLimit - realUserCount)
    const percentageFilled = Math.min(100, (realUserCount / betaLimit) * 100)
    const shouldUpdatePricing = realUserCount >= betaLimit

    const recentRealUsers = await sql`
      SELECT 
        u.email,
        u.created_at,
        um.training_status,
        s.plan,
        s.status
      FROM users u
      INNER JOIN user_models um ON u.id = um.user_id
      LEFT JOIN subscriptions s ON u.id = s.user_id
      WHERE um.training_status = 'completed'
      ORDER BY u.created_at DESC
      LIMIT 10
    `

    console.log("[v0] Beta users API: Success", {
      realUserCount,
      remaining,
      shouldUpdatePricing,
    })

    return NextResponse.json({
      betaCount: realUserCount,
      betaLimit,
      remaining,
      percentageFilled,
      shouldUpdatePricing,
      recentBetaUsers: recentRealUsers.map((user) => ({
        email: user.email,
        joinedAt: user.created_at,
        plan: user.plan || "one-time",
        status: user.status || "active",
        hasTrainedModel: user.training_status === "completed",
      })),
    })
  } catch (error) {
    console.error("[v0] Beta users API error:", error)
    return NextResponse.json({ error: "Failed to fetch beta user data" }, { status: 500 })
  }
}
