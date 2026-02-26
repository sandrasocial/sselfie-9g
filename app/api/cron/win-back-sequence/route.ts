/**
 * Win-Back Sequence — 3-Touch Automated Email Flow
 *
 * Touch 1 (Day 3)  → "Something I want to say"  — honest check-in, takes ownership, no pitch
 * Touch 2 (Day 7)  → "This is different now"     — what's changed, soft offer
 * Touch 3 (Day 14) → "Leaving the door open"     — final, no pressure
 *
 * GET /api/cron/win-back-sequence
 * Protected by CRON_SECRET header
 * Runs daily at 10 AM UTC (see vercel.json)
 *
 * Logic per cancelled user:
 *   - days_since_cancel >= 3  AND no win-back-day3  in email_logs → send Day 3
 *   - days_since_cancel >= 7  AND has win-back-day3 AND no win-back-day7  → send Day 7
 *   - days_since_cancel >= 14 AND has win-back-day7 AND no win-back-day14 → send Day 14
 *   - Skip anyone who has reactivated (has an active subscription)
 */

import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { sendEmail } from "@/lib/email/send-email"
import { createCronLogger } from "@/lib/cron-logger"
import { generateWinBackDay3Email } from "@/lib/email/templates/win-back-day3"
import { generateWinBackDay7Email } from "@/lib/email/templates/win-back-day7"
import { generateWinBackDay14Email } from "@/lib/email/templates/win-back-day14"
import { logAdminError } from "@/lib/admin-error-log"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: Request) {
  const cronLogger = createCronLogger("win-back-sequence")
  await cronLogger.start()

  try {
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET
    const isProduction = process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production"

    if (isProduction && cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        console.error("[win-back] Unauthorized: Invalid or missing CRON_SECRET")
        await cronLogger.error(new Error("Unauthorized"), { reason: "Invalid CRON_SECRET" })
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    }

    console.log("[win-back] Starting 3-touch win-back sequence...")

    const results = {
      day3: { found: 0, sent: 0, failed: 0 },
      day7: { found: 0, sent: 0, failed: 0 },
      day14: { found: 0, sent: 0, failed: 0 },
      errors: [] as Array<{ email: string; touch: string; error: string }>,
    }

    // ─── Shared base query: cancelled users who haven't reactivated ───────────
    // updated_at is the proxy for canceled_at (set when status flips to 'canceled')

    // ── Touch 1: Day 3 ────────────────────────────────────────────────────────
    const day3Candidates = await sql`
      SELECT
        u.email,
        u.display_name,
        s.updated_at AS canceled_at
      FROM subscriptions s
      INNER JOIN users u ON u.id = s.user_id
      WHERE s.status = 'canceled'
        AND s.updated_at <= NOW() - INTERVAL '3 days'
        AND u.email IS NOT NULL
        AND u.email != ''
        -- Not yet sent Day 3
        AND NOT EXISTS (
          SELECT 1 FROM email_logs el
          WHERE el.user_email = u.email
            AND el.email_type = 'win-back-day3'
            AND el.status IN ('sent', 'delivered')
        )
        -- Has not reactivated
        AND NOT EXISTS (
          SELECT 1 FROM subscriptions s2
          WHERE s2.user_id = s.user_id
            AND s2.status = 'active'
        )
      ORDER BY s.updated_at ASC
      LIMIT 100
    `

    results.day3.found = day3Candidates.length
    console.log(`[win-back] Day 3 candidates: ${day3Candidates.length}`)

    for (const user of day3Candidates as any[]) {
      try {
        const email = generateWinBackDay3Email({
          firstName: user.display_name?.split(" ")[0],
          recipientEmail: user.email,
        })

        const result = await sendEmail({
          to: user.email,
          subject: email.subject,
          html: email.html,
          text: email.text,
          emailType: "win-back-day3",
          replyTo: "hello@sselfie.ai",
          tags: ["win-back", "win-back-day3"],
        })

        if (result.success) {
          results.day3.sent++
          console.log(`[win-back] ✅ Day 3 sent to ${user.email}`)
        } else {
          results.day3.failed++
          results.errors.push({ email: user.email, touch: "day3", error: result.error || "unknown" })
          console.error(`[win-back] ❌ Day 3 failed for ${user.email}:`, result.error)
        }
      } catch (err: any) {
        results.day3.failed++
        results.errors.push({ email: user.email, touch: "day3", error: err.message || "unknown" })
        console.error(`[win-back] ❌ Day 3 exception for ${user.email}:`, err)
      }

      // Gentle rate-limit between sends
      await new Promise((r) => setTimeout(r, 150))
    }

    // ── Touch 2: Day 7 ────────────────────────────────────────────────────────
    const day7Candidates = await sql`
      SELECT
        u.email,
        u.display_name,
        s.updated_at AS canceled_at
      FROM subscriptions s
      INNER JOIN users u ON u.id = s.user_id
      WHERE s.status = 'canceled'
        AND s.updated_at <= NOW() - INTERVAL '7 days'
        AND u.email IS NOT NULL
        AND u.email != ''
        -- Day 3 already sent
        AND EXISTS (
          SELECT 1 FROM email_logs el
          WHERE el.user_email = u.email
            AND el.email_type = 'win-back-day3'
            AND el.status IN ('sent', 'delivered')
        )
        -- Day 7 not yet sent
        AND NOT EXISTS (
          SELECT 1 FROM email_logs el
          WHERE el.user_email = u.email
            AND el.email_type = 'win-back-day7'
            AND el.status IN ('sent', 'delivered')
        )
        -- Has not reactivated
        AND NOT EXISTS (
          SELECT 1 FROM subscriptions s2
          WHERE s2.user_id = s.user_id
            AND s2.status = 'active'
        )
      ORDER BY s.updated_at ASC
      LIMIT 100
    `

    results.day7.found = day7Candidates.length
    console.log(`[win-back] Day 7 candidates: ${day7Candidates.length}`)

    const offerCode = process.env.WIN_BACK_PROMO_CODE || undefined

    for (const user of day7Candidates as any[]) {
      try {
        const email = generateWinBackDay7Email({
          firstName: user.display_name?.split(" ")[0],
          recipientEmail: user.email,
          offerCode,
        })

        const result = await sendEmail({
          to: user.email,
          subject: email.subject,
          html: email.html,
          text: email.text,
          emailType: "win-back-day7",
          replyTo: "hello@sselfie.ai",
          tags: ["win-back", "win-back-day7"],
        })

        if (result.success) {
          results.day7.sent++
          console.log(`[win-back] ✅ Day 7 sent to ${user.email}`)
        } else {
          results.day7.failed++
          results.errors.push({ email: user.email, touch: "day7", error: result.error || "unknown" })
          console.error(`[win-back] ❌ Day 7 failed for ${user.email}:`, result.error)
        }
      } catch (err: any) {
        results.day7.failed++
        results.errors.push({ email: user.email, touch: "day7", error: err.message || "unknown" })
        console.error(`[win-back] ❌ Day 7 exception for ${user.email}:`, err)
      }

      await new Promise((r) => setTimeout(r, 150))
    }

    // ── Touch 3: Day 14 ───────────────────────────────────────────────────────
    const day14Candidates = await sql`
      SELECT
        u.email,
        u.display_name,
        s.updated_at AS canceled_at
      FROM subscriptions s
      INNER JOIN users u ON u.id = s.user_id
      WHERE s.status = 'canceled'
        AND s.updated_at <= NOW() - INTERVAL '14 days'
        AND u.email IS NOT NULL
        AND u.email != ''
        -- Day 7 already sent
        AND EXISTS (
          SELECT 1 FROM email_logs el
          WHERE el.user_email = u.email
            AND el.email_type = 'win-back-day7'
            AND el.status IN ('sent', 'delivered')
        )
        -- Day 14 not yet sent
        AND NOT EXISTS (
          SELECT 1 FROM email_logs el
          WHERE el.user_email = u.email
            AND el.email_type = 'win-back-day14'
            AND el.status IN ('sent', 'delivered')
        )
        -- Has not reactivated
        AND NOT EXISTS (
          SELECT 1 FROM subscriptions s2
          WHERE s2.user_id = s.user_id
            AND s2.status = 'active'
        )
      ORDER BY s.updated_at ASC
      LIMIT 100
    `

    results.day14.found = day14Candidates.length
    console.log(`[win-back] Day 14 candidates: ${day14Candidates.length}`)

    for (const user of day14Candidates as any[]) {
      try {
        const email = generateWinBackDay14Email({
          firstName: user.display_name?.split(" ")[0],
          recipientEmail: user.email,
        })

        const result = await sendEmail({
          to: user.email,
          subject: email.subject,
          html: email.html,
          text: email.text,
          emailType: "win-back-day14",
          replyTo: "hello@sselfie.ai",
          tags: ["win-back", "win-back-day14"],
        })

        if (result.success) {
          results.day14.sent++
          console.log(`[win-back] ✅ Day 14 sent to ${user.email}`)
        } else {
          results.day14.failed++
          results.errors.push({ email: user.email, touch: "day14", error: result.error || "unknown" })
          console.error(`[win-back] ❌ Day 14 failed for ${user.email}:`, result.error)
        }
      } catch (err: any) {
        results.day14.failed++
        results.errors.push({ email: user.email, touch: "day14", error: err.message || "unknown" })
        console.error(`[win-back] ❌ Day 14 exception for ${user.email}:`, err)
      }

      await new Promise((r) => setTimeout(r, 150))
    }

    const totalSent = results.day3.sent + results.day7.sent + results.day14.sent
    const totalFailed = results.day3.failed + results.day7.failed + results.day14.failed

    console.log(
      `[win-back] ✅ Complete — Day3: ${results.day3.sent}/${results.day3.found} | Day7: ${results.day7.sent}/${results.day7.found} | Day14: ${results.day14.sent}/${results.day14.found}`,
    )

    await cronLogger.success({
      day3: results.day3,
      day7: results.day7,
      day14: results.day14,
      totalSent,
      totalFailed,
    })

    return NextResponse.json({
      success: true,
      results,
      totalSent,
      totalFailed,
      errors: results.errors.slice(0, 20),
    })
  } catch (error: any) {
    console.error("[win-back] Unhandled error:", error)
    await cronLogger.error(error, {})
    await logAdminError({
      toolName: "cron:win-back-sequence",
      error: error instanceof Error ? error : new Error(String(error)),
      context: {},
    }).catch(() => {})

    return NextResponse.json(
      { success: false, error: "Win-back cron failed", details: error.message },
      { status: 500 },
    )
  }
}
