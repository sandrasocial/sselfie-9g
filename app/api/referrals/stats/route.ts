import { type NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

/**
 * GET /api/referrals/stats
 * 
 * Returns referral statistics for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(user.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Get user's referral code
    const userRecord = await sql`
      SELECT referral_code FROM users WHERE id = ${neonUser.id} LIMIT 1
    `

    const referralCode = userRecord[0]?.referral_code || null
    const referralLink = referralCode
      ? `${process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"}/?ref=${referralCode}`
      : null

    // Get referral statistics
    const stats = await sql`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
        COALESCE(SUM(credits_awarded_referrer), 0) as total_credits_earned
      FROM referrals
      WHERE referrer_id = ${neonUser.id}
    `

    const statsData = stats[0] || {
      pending_count: 0,
      completed_count: 0,
      total_credits_earned: 0,
    }

    return NextResponse.json({
      success: true,
      referralCode,
      referralLink,
      stats: {
        pending: Number(statsData.pending_count) || 0,
        completed: Number(statsData.completed_count) || 0,
        totalCreditsEarned: Number(statsData.total_credits_earned) || 0,
      },
    })
  } catch (error) {
    console.error("[v0] Error fetching referral stats:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch referral stats" },
      { status: 500 },
    )
  }
}
