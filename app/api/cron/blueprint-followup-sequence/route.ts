/**
 * Blueprint Follow-Up Sequence - 3-touch automated email flow for Feed Planner buyers
 *
 * Touch 1 (Day 1) → "Your Feed Blueprint is ready - start here"   - get them into the app
 * Touch 2 (Day 3) → "The one thing that makes feed planning click" - content theme tip
 * Touch 3 (Day 7) → "One week in - what's next?"                  - soft Studio upsell
 *
 * GET /api/cron/blueprint-followup-sequence
 * Protected by CRON_SECRET header (Bearer token, set by Vercel automatically for cron jobs)
 * Runs daily at 10:10 AM UTC (see vercel.json)
 *
 * Logic per paid_blueprint buyer:
 *   - days_since_purchase >= 1  AND no blueprint-followup-day1  in email_logs → send Day 1
 *   - days_since_purchase >= 3  AND has day1  AND no blueprint-followup-day3  → send Day 3
 *   - days_since_purchase >= 7  AND has day3  AND no blueprint-followup-day7  → send Day 7
 */

import { NextResponse } from "next/server"
import { sql } from "@/lib/db/client"
import { createCronLogger } from "@/lib/cron-logger"
import { logAdminError } from "@/lib/admin-error-log"
import { MARKETING_SEGMENTS } from "@/lib/email/config"
import { enqueueAndProcessMarketingRun } from "@/lib/email/marketing-runner"
import { generateBlueprintFollowupDay1Email } from "@/lib/email/templates/blueprint-followup-day1"
import { generateBlueprintFollowupDay3Email } from "@/lib/email/templates/blueprint-followup-day3"
import { generateBlueprintFollowupDay7Email } from "@/lib/email/templates/blueprint-followup-day7"

const FIRST_NAME_PLACEHOLDER = "{{{FIRST_NAME|friend}}}"

export async function GET(request: Request) {
  const cronLogger = createCronLogger("blueprint-followup-sequence")
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

    // Fail fast if segment IDs are missing - better than sending to wrong audience
    if (isProduction) {
      const missing: string[] = []
      if (!MARKETING_SEGMENTS.paidBlueprintDay1) missing.push("RESEND_SEGMENT_PAID_BLUEPRINT_DAY_1")
      if (!MARKETING_SEGMENTS.paidBlueprintDay3) missing.push("RESEND_SEGMENT_PAID_BLUEPRINT_DAY_3")
      if (!MARKETING_SEGMENTS.paidBlueprintDay7) missing.push("RESEND_SEGMENT_PAID_BLUEPRINT_DAY_7")
      if (missing.length > 0) {
        await cronLogger.error(new Error("Blueprint segment env vars missing"), { missing })
        return NextResponse.json(
          { error: "Blueprint follow-up sequence cannot run: missing segment configuration", missingEnvVars: missing },
          { status: 503 },
        )
      }
    }

    console.log("[blueprint-followup] Starting 3-touch follow-up sequence...")

    const results = {
      day1: { found: 0, sent: 0, failed: 0 },
      day3: { found: 0, sent: 0, failed: 0 },
      day7: { found: 0, sent: 0, failed: 0 },
      errors: [] as Array<{ touch: string; error: string }>,
    }

    // ─── Day 1 ────────────────────────────────────────────────────────────────
    // Target: purchased >= 1 day ago, within 5-day window, no day1 email yet
    const day1Users = await sql`
      SELECT DISTINCT
        u.id,
        u.email,
        u.display_name,
        s.created_at AS purchase_created_at
      FROM users u
      INNER JOIN subscriptions s ON u.id = s.user_id::varchar
      LEFT JOIN email_logs el ON el.user_email = u.email
        AND el.email_type = 'blueprint-followup-day1'
        AND (
          el.status IN ('sent', 'delivered')
          OR (el.status = 'queued' AND el.sent_at > NOW() - INTERVAL '2 hours')
        )
      WHERE s.product_type = 'paid_blueprint'
        AND s.is_test_mode = false
        AND s.created_at <= NOW() - INTERVAL '1 day'
        AND s.created_at > NOW() - INTERVAL '5 days'
        AND u.email IS NOT NULL
        AND u.email != ''
        AND el.id IS NULL
      ORDER BY purchase_created_at ASC
    `

    results.day1.found = day1Users.length
    console.log(`[blueprint-followup] Day 1: ${day1Users.length} candidates`)

    if (day1Users.length > 0) {
      try {
        const emailContent = generateBlueprintFollowupDay1Email({ firstName: FIRST_NAME_PLACEHOLDER })
        await enqueueAndProcessMarketingRun({
          sequenceKey: "blueprint-followup-day1",
          emailType: "blueprint-followup-day1",
          tagKey: "sequence_blueprint_followup_day1",
          segmentId: MARKETING_SEGMENTS.paidBlueprintDay1!,
          campaignKey: "blueprint-followup-day1",
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
          recipients: day1Users.map((u: any) => ({
            email: u.email,
            firstName: u.display_name?.split(" ")[0],
          })),
        })
        results.day1.sent = day1Users.length
      } catch (error: any) {
        results.day1.failed = day1Users.length
        results.errors.push({ touch: "day1", error: error.message || "Unknown error" })
        console.error("[blueprint-followup] ❌ Day 1 broadcast failed:", error)
        await logAdminError({
          toolName: "cron:blueprint-followup-sequence:day-1",
          error: error instanceof Error ? error : new Error(error.message || "Unknown error"),
          context: { recipients: day1Users.length },
        }).catch(() => {})
      }
    }

    // ─── Day 3 ────────────────────────────────────────────────────────────────
    // Target: purchased >= 3 days ago, within 10-day window, has day1, no day3 yet
    const day3Users = await sql`
      SELECT DISTINCT
        u.id,
        u.email,
        u.display_name,
        s.created_at AS purchase_created_at
      FROM users u
      INNER JOIN subscriptions s ON u.id = s.user_id::varchar
      INNER JOIN email_logs el_prev ON el_prev.user_email = u.email
        AND el_prev.email_type = 'blueprint-followup-day1'
        AND el_prev.status IN ('sent', 'delivered')
      LEFT JOIN email_logs el ON el.user_email = u.email
        AND el.email_type = 'blueprint-followup-day3'
        AND (
          el.status IN ('sent', 'delivered')
          OR (el.status = 'queued' AND el.sent_at > NOW() - INTERVAL '2 hours')
        )
      WHERE s.product_type = 'paid_blueprint'
        AND s.is_test_mode = false
        AND s.created_at <= NOW() - INTERVAL '3 days'
        AND s.created_at > NOW() - INTERVAL '10 days'
        AND u.email IS NOT NULL
        AND u.email != ''
        AND el.id IS NULL
      ORDER BY purchase_created_at ASC
    `

    results.day3.found = day3Users.length
    console.log(`[blueprint-followup] Day 3: ${day3Users.length} candidates`)

    if (day3Users.length > 0) {
      try {
        const emailContent = generateBlueprintFollowupDay3Email({ firstName: FIRST_NAME_PLACEHOLDER })
        await enqueueAndProcessMarketingRun({
          sequenceKey: "blueprint-followup-day3",
          emailType: "blueprint-followup-day3",
          tagKey: "sequence_blueprint_followup_day3",
          segmentId: MARKETING_SEGMENTS.paidBlueprintDay3!,
          campaignKey: "blueprint-followup-day3",
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
          recipients: day3Users.map((u: any) => ({
            email: u.email,
            firstName: u.display_name?.split(" ")[0],
          })),
        })
        results.day3.sent = day3Users.length
      } catch (error: any) {
        results.day3.failed = day3Users.length
        results.errors.push({ touch: "day3", error: error.message || "Unknown error" })
        console.error("[blueprint-followup] ❌ Day 3 broadcast failed:", error)
        await logAdminError({
          toolName: "cron:blueprint-followup-sequence:day-3",
          error: error instanceof Error ? error : new Error(error.message || "Unknown error"),
          context: { recipients: day3Users.length },
        }).catch(() => {})
      }
    }

    // ─── Day 7 ────────────────────────────────────────────────────────────────
    // Target: purchased >= 7 days ago, within 21-day window, has day3, no day7 yet
    const day7Users = await sql`
      SELECT DISTINCT
        u.id,
        u.email,
        u.display_name,
        s.created_at AS purchase_created_at
      FROM users u
      INNER JOIN subscriptions s ON u.id = s.user_id::varchar
      INNER JOIN email_logs el_prev ON el_prev.user_email = u.email
        AND el_prev.email_type = 'blueprint-followup-day3'
        AND el_prev.status IN ('sent', 'delivered')
      LEFT JOIN email_logs el ON el.user_email = u.email
        AND el.email_type = 'blueprint-followup-day7'
        AND (
          el.status IN ('sent', 'delivered')
          OR (el.status = 'queued' AND el.sent_at > NOW() - INTERVAL '2 hours')
        )
      WHERE s.product_type = 'paid_blueprint'
        AND s.is_test_mode = false
        AND s.created_at <= NOW() - INTERVAL '7 days'
        AND s.created_at > NOW() - INTERVAL '21 days'
        AND u.email IS NOT NULL
        AND u.email != ''
        AND el.id IS NULL
      ORDER BY purchase_created_at ASC
    `

    results.day7.found = day7Users.length
    console.log(`[blueprint-followup] Day 7: ${day7Users.length} candidates`)

    if (day7Users.length > 0) {
      try {
        const emailContent = generateBlueprintFollowupDay7Email({ firstName: FIRST_NAME_PLACEHOLDER })
        await enqueueAndProcessMarketingRun({
          sequenceKey: "blueprint-followup-day7",
          emailType: "blueprint-followup-day7",
          tagKey: "sequence_blueprint_followup_day7",
          segmentId: MARKETING_SEGMENTS.paidBlueprintDay7!,
          campaignKey: "blueprint-followup-day7",
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
          recipients: day7Users.map((u: any) => ({
            email: u.email,
            firstName: u.display_name?.split(" ")[0],
          })),
        })
        results.day7.sent = day7Users.length
      } catch (error: any) {
        results.day7.failed = day7Users.length
        results.errors.push({ touch: "day7", error: error.message || "Unknown error" })
        console.error("[blueprint-followup] ❌ Day 7 broadcast failed:", error)
        await logAdminError({
          toolName: "cron:blueprint-followup-sequence:day-7",
          error: error instanceof Error ? error : new Error(error.message || "Unknown error"),
          context: { recipients: day7Users.length },
        }).catch(() => {})
      }
    }

    const totalSent = results.day1.sent + results.day3.sent + results.day7.sent
    console.log(`[blueprint-followup] Done. Sent: ${totalSent}`, results)

    await cronLogger.success({
      day1: results.day1,
      day3: results.day3,
      day7: results.day7,
      totalSent,
      errors: results.errors.length,
    })

    return NextResponse.json({ success: true, results })
  } catch (error: any) {
    console.error("[blueprint-followup] ❌ Sequence crashed:", error)
    await cronLogger.error(error, { reason: "Blueprint follow-up sequence crashed" })
    return NextResponse.json({ error: error.message || "Failed to run blueprint follow-up sequence" }, { status: 500 })
  }
}
