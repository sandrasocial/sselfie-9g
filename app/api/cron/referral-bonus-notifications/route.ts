import { NextResponse } from "next/server"

import { createCronLogger } from "@/lib/cron-logger"
import { sql } from "@/lib/db/client"
import { sendReferralBonusNotificationsForReferral } from "@/lib/referrals/notifications"

export async function GET(request: Request) {
  const cronLogger = createCronLogger("referral-bonus-notifications")
  await cronLogger.start()

  try {
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET
    const isProduction = process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production"

    if (isProduction) {
      if (!cronSecret) {
        await cronLogger.error(new Error("Unauthorized"), { reason: "CRON_SECRET not set in production" })
        return NextResponse.json({ error: "Unauthorized: CRON_SECRET required in production" }, { status: 401 })
      }

      if (authHeader !== `Bearer ${cronSecret}`) {
        await cronLogger.error(new Error("Unauthorized"), { reason: "Invalid CRON_SECRET" })
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    }

    const candidates = await sql`
      SELECT r.id
      FROM referrals r
      INNER JOIN users referrer ON referrer.id = r.referrer_id
      INNER JOIN users referred ON referred.id = r.referred_id
      WHERE (
        (
          COALESCE(r.credits_awarded_referred, 0) >= 25
          AND NOT EXISTS (
            SELECT 1
            FROM email_logs el
            WHERE el.user_email = referred.email
              AND el.email_type = 'referral-bonus-referred-' || r.id::text
              AND el.status IN ('sent', 'delivered')
          )
        )
        OR (
          COALESCE(r.credits_awarded_referrer, 0) >= 50
          AND NOT EXISTS (
            SELECT 1
            FROM email_logs el
            WHERE el.user_email = referrer.email
              AND el.email_type = 'referral-bonus-referrer-' || r.id::text
              AND el.status IN ('sent', 'delivered')
          )
        )
      )
      ORDER BY r.created_at ASC
      LIMIT 200
    `

    const results = {
      referralsChecked: candidates.length,
      referredSent: 0,
      referredSkipped: 0,
      referrerSent: 0,
      referrerSkipped: 0,
      failed: 0,
    }

    for (const candidate of candidates as Array<{ id: number }>) {
      const notificationResult = await sendReferralBonusNotificationsForReferral(Number(candidate.id))

      if (notificationResult.referred.status === "sent") {
        results.referredSent += 1
      } else if (notificationResult.referred.status !== "missing_bonus") {
        results.referredSkipped += 1
      }

      if (notificationResult.referrer.status === "sent") {
        results.referrerSent += 1
      } else if (notificationResult.referrer.status !== "missing_bonus") {
        results.referrerSkipped += 1
      }

      if (!notificationResult.referred.success && notificationResult.referred.status === "send_failed") {
        results.failed += 1
      }

      if (!notificationResult.referrer.success && notificationResult.referrer.status === "send_failed") {
        results.failed += 1
      }
    }

    await cronLogger.success(results)
    return NextResponse.json({ success: true, results })
  } catch (error) {
    await cronLogger.error(error, { step: "referral-bonus-notifications" })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process referral bonus notifications" },
      { status: 500 },
    )
  }
}
