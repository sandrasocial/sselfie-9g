import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { addCredits } from "@/lib/credits"

const sql = neon(process.env.DATABASE_URL!)

/**
 * POST /api/referrals/track
 * 
 * Tracks a referral when a new user signs up with a referral code
 * Body: { referralCode: string, referredUserId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { referralCode, referredUserId } = body

    if (!referralCode || !referredUserId) {
      return NextResponse.json({ error: "Missing referralCode or referredUserId" }, { status: 400 })
    }

    // Find referrer by referral code
    const referrer = await sql`
      SELECT id, email, display_name FROM users WHERE referral_code = ${referralCode} LIMIT 1
    `

    if (referrer.length === 0) {
      return NextResponse.json({ error: "Invalid referral code" }, { status: 404 })
    }

    const referrerId = referrer[0].id

    // Prevent self-referral
    if (referrerId === referredUserId) {
      return NextResponse.json({ error: "Cannot refer yourself" }, { status: 400 })
    }

    // Check if referral already exists
    const existing = await sql`
      SELECT id FROM referrals 
      WHERE referrer_id = ${referrerId} AND referred_id = ${referredUserId} 
      LIMIT 1
    `

    if (existing.length > 0) {
      return NextResponse.json({ error: "Referral already tracked" }, { status: 400 })
    }

    // Create referral record
    await sql`
      INSERT INTO referrals (referrer_id, referred_id, referral_code, status)
      VALUES (${referrerId}, ${referredUserId}, ${referralCode}, 'pending')
    `

    // Grant welcome credits to referred user immediately (25 credits)
    // Only if referral bonuses are enabled
    const referralBonusesEnabled = process.env.REFERRAL_BONUSES_ENABLED === "true"
    
    if (referralBonusesEnabled) {
      try {
        const welcomeResult = await addCredits(
          referredUserId,
          25,
          "bonus",
          "Welcome reward for signing up with referral",
        )

        if (welcomeResult.success) {
          // Update referral record with welcome credits
          await sql`
            UPDATE referrals
            SET credits_awarded_referred = 25
            WHERE referrer_id = ${referrerId} AND referred_id = ${referredUserId}
          `
          console.log(`[v0] ✅ Welcome credits (25) granted to referred user ${referredUserId}`)
        } else {
          console.error(`[v0] ⚠️ Failed to grant welcome credits: ${welcomeResult.error}`)
        }
      } catch (creditError: any) {
        console.error(`[v0] ⚠️ Error granting welcome credits (non-critical):`, creditError.message)
        // Don't fail referral tracking if credit grant fails
      }
    } else {
      console.log(`[v0] ⚠️ Referral bonuses disabled - skipping welcome credits grant`)
    }

    console.log(`[v0] ✅ Referral tracked: ${referrerId} → ${referredUserId} (code: ${referralCode})`)

    return NextResponse.json({
      success: true,
      referrerId,
      welcomeCreditsGranted: true,
    })
  } catch (error) {
    console.error("[v0] Error tracking referral:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to track referral" },
      { status: 500 },
    )
  }
}
