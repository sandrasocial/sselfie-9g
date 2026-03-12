import { type NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"
import { buildReferralLink, ensureUserReferralCode } from "@/lib/referrals/codes"


/**
 * GET /api/referrals/generate-code
 * 
 * Generates and saves a unique referral code for the authenticated user
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

    const referralCode = await ensureUserReferralCode(neonUser.id, neonUser.email, neonUser.referral_code)
    const referralLink = buildReferralLink(referralCode)

    console.log(`[v0] ✅ Generated referral code for user ${neonUser.id}: ${referralCode}`)

    return NextResponse.json({
      success: true,
      referralCode,
      referralLink,
    })
  } catch (error) {
    console.error("[v0] Error generating referral code:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate referral code" },
      { status: 500 },
    )
  }
}
