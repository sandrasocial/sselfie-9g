import { type NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"
import { isReferralSignupEligible, trackReferralSignup } from "@/lib/referrals/service"


/**
 * POST /api/referrals/track
 * 
 * Tracks a referral for the authenticated user
 * Body: { referralCode: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(user.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    if (!isReferralSignupEligible(neonUser.created_at)) {
      return NextResponse.json(
        { error: "Referral tracking is only available right after signup" },
        { status: 409 },
      )
    }

    const body = await request.json()
    const { referralCode } = body

    if (!referralCode) {
      return NextResponse.json({ error: "Missing referralCode" }, { status: 400 })
    }

    const result = await trackReferralSignup({
      referralCode,
      referredUserId: neonUser.id,
    })

    if (!result.success && result.status === "invalid_code") {
      return NextResponse.json({ error: "Invalid referral code" }, { status: 404 })
    }

    if (!result.success && result.status === "self_referral") {
      return NextResponse.json({ error: "Cannot refer yourself" }, { status: 400 })
    }
    console.log(`[v0] ✅ Referral ${result.status}: ${result.referrerId} → ${neonUser.id}`)

    return NextResponse.json({
      success: true,
      status: result.status,
      referrerId: result.referrerId,
      welcomeCreditsGranted: result.welcomeCreditsGranted,
    })
  } catch (error) {
    console.error("[v0] Error tracking referral:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to track referral" },
      { status: 500 },
    )
  }
}
