import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { addCredits } from "@/lib/credits"
import { sendEmail } from "@/lib/email/send-email"
import { generateReferralRewardEmail } from "@/lib/email/templates/referral-reward"

const sql = neon(process.env.DATABASE_URL!)

/**
 * GET /api/cron/referral-rewards
 * 
 * Cron job to process pending referrals and grant bonus credits
 * Runs daily to check for referrals where referred user has made their first purchase
 * 
 * Protected with CRON_SECRET verification
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
      console.error("[v0] [CRON] CRON_SECRET not configured")
      return NextResponse.json({ error: "Cron secret not configured" }, { status: 500 })
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      console.error("[v0] [CRON] Unauthorized referral-rewards cron request")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] [CRON] Starting referral rewards processing...")

    // Check if referral bonuses are enabled
    const referralBonusesEnabled = process.env.REFERRAL_BONUSES_ENABLED === "true"

    if (!referralBonusesEnabled) {
      console.log("[v0] [CRON] ⚠️ Referral bonuses temporarily disabled (REFERRAL_BONUSES_ENABLED=false)")
      return NextResponse.json({
        success: true,
        enabled: false,
        message: "Referral bonuses temporarily disabled",
        processed: 0,
        errors: 0,
        details: [],
      })
    }

    // Find pending referrals where referred user has made a purchase
    const pendingReferrals = await sql`
      SELECT 
        r.id,
        r.referrer_id,
        r.referred_id,
        r.referral_code,
        r.credits_awarded_referred,
        u_referrer.email as referrer_email,
        u_referrer.display_name as referrer_name,
        u_referred.email as referred_email,
        u_referred.display_name as referred_name
      FROM referrals r
      INNER JOIN users u_referrer ON r.referrer_id = u_referrer.id
      INNER JOIN users u_referred ON r.referred_id = u_referred.id
      LEFT JOIN credit_transactions ct ON ct.user_id = u_referred.id AND ct.transaction_type = 'purchase'
      WHERE r.status = 'pending'
      AND ct.id IS NOT NULL
      LIMIT 100
    `

    console.log(`[v0] [CRON] Found ${pendingReferrals.length} pending referrals to process`)

    const results = {
      processed: 0,
      errors: 0,
      details: [] as Array<{ referralId: number; referrerId: string; referredId: string; success: boolean; error?: string }>,
    }

    for (const referral of pendingReferrals) {
      try {
        // Grant credits to referrer (50 credits) - already checked flag above
        const referrerResult = await addCredits(
          referral.referrer_id,
          50,
          "bonus",
          `Referral reward for ${referral.referred_name || referral.referred_email}`,
        )

        if (!referrerResult.success) {
          throw new Error(`Failed to grant credits to referrer: ${referrerResult.error}`)
        }

        // Note: Welcome credits (25) should already be granted when referral is tracked during signup
        // Only grant if somehow missed (fallback)
        if (referral.credits_awarded_referred === 0) {
          const referredResult = await addCredits(
            referral.referred_id,
            25,
            "bonus",
            "Welcome reward for signing up with referral",
          )

          if (referredResult.success) {
            console.log(`[v0] [CRON] ✅ Granted welcome credits (fallback) to referred user ${referral.referred_id}`)
          } else {
            console.error(`[v0] [CRON] ⚠️ Failed to grant welcome credits (fallback): ${referredResult.error}`)
            // Don't fail the whole process if welcome credits fail
          }
        }

        // Update referral status
        // Preserve existing credits_awarded_referred value (should be 25 from signup)
        await sql`
          UPDATE referrals
          SET 
            status = 'completed',
            credits_awarded_referrer = 50,
            credits_awarded_referred = COALESCE(credits_awarded_referred, 25),
            completed_at = NOW()
          WHERE id = ${referral.id}
        `

        // Send reward email to referrer
        try {
          const emailContent = generateReferralRewardEmail({
            firstName: referral.referrer_name?.split(" ")[0] || undefined,
            creditsAwarded: 50,
            referredUserName: referral.referred_name || undefined,
          })

          await sendEmail({
            to: referral.referrer_email,
            subject: emailContent.subject,
            html: emailContent.html,
            text: emailContent.text,
            from: "Maya from SSELFIE <hello@sselfie.ai>",
            emailType: "referral-reward",
          })

          console.log(`[v0] [CRON] ✅ Referral reward email sent to ${referral.referrer_email}`)
        } catch (emailError: any) {
          console.error(`[v0] [CRON] ⚠️ Failed to send referral reward email (non-critical):`, emailError.message)
          // Don't fail the process if email fails
        }

        results.processed++
        results.details.push({
          referralId: referral.id,
          referrerId: referral.referrer_id,
          referredId: referral.referred_id,
          success: true,
        })

        console.log(`[v0] [CRON] ✅ Processed referral ${referral.id}: ${referral.referrer_id} → ${referral.referred_id}`)
      } catch (error: any) {
        results.errors++
        results.details.push({
          referralId: referral.id,
          referrerId: referral.referrer_id,
          referredId: referral.referred_id,
          success: false,
          error: error.message,
        })
        console.error(`[v0] [CRON] ❌ Error processing referral ${referral.id}:`, error.message)
      }
    }

    console.log(`[v0] [CRON] Referral rewards processing complete: ${results.processed} processed, ${results.errors} errors`)

    return NextResponse.json({
      success: true,
      processed: results.processed,
      errors: results.errors,
      details: results.details,
    })
  } catch (error) {
    console.error("[v0] [CRON] Error in referral rewards cron:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process referral rewards" },
      { status: 500 },
    )
  }
}
