// Freebie Nurture Automation
import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { sendEmail } from "@/lib/email/send-email"
import { createCronLogger } from "@/lib/cron-logger"
import { generateNurtureDay1Email } from "@/lib/email/templates/nurture-day-1"
import { generateNurtureDay3Email } from "@/lib/email/templates/nurture-day-3"
import { generateNurtureDay7Email } from "@/lib/email/templates/nurture-day-7"
import { generateUpsellDay10Email } from "@/lib/email/templates/upsell-day-10"
import { logAdminError } from "@/lib/admin-error-log"
import { enqueueAndProcessMarketingRun } from "@/lib/email/marketing-runner"
import { MARKETING_SEGMENTS } from "@/lib/email/config"

const sql = neon(process.env.DATABASE_URL!)

const FIRST_NAME_PLACEHOLDER = "{{{FIRST_NAME|friend}}}"
const EMAIL_PLACEHOLDER = "{{{EMAIL}}}"

/**
 * Freebie Nurture Sequence - Resend Broadcasts (Marketing)
 * 
 * Sends nurture sequence emails to freebie subscribers using Broadcast API.
 * 
 * GET /api/cron/nurture-sequence
 * 
 * Protected by CRON_SECRET environment variable
 * Runs daily at 10 AM UTC (same as blueprint followups)
 * 
 * Email templates:
 * - Day 1: "Your First Day with SSELFIE"
 * - Day 3: "How's It Going?"
 * - Day 7: "One Week In"
 * - Day 10: "Ready for the Next Level?"
 */
export async function GET(request: Request) {
  const cronLogger = createCronLogger("nurture-sequence")
  await cronLogger.start()

  try {
    // Freebie Nurture Automation - Verify cron secret for security
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET

    const isProduction = process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production"

    if (isProduction && cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        console.error("[v0] [CRON] Unauthorized: Invalid or missing CRON_SECRET")
        await cronLogger.error(new Error("Unauthorized"), { reason: "Invalid CRON_SECRET" })
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    } else if (!cronSecret && isProduction) {
      console.warn("[v0] [CRON] WARNING: CRON_SECRET not set in production!")
    }

    console.log("[v0] [CRON] Starting freebie nurture email sequence...")

    const results = {
      day1: { found: 0, sent: 0, failed: 0, skipped: 0 },
      day3: { found: 0, sent: 0, failed: 0, skipped: 0 },
      day7: { found: 0, sent: 0, failed: 0, skipped: 0 },
      day10: { found: 0, sent: 0, failed: 0, skipped: 0 },
      errors: [] as Array<{ email: string; day: number; error: string }>,
    }

    // Freebie Nurture Automation - Day 1 emails: 1 day after created_at, not yet sent, skip converted users
    const day1Subscribers = await sql`
      SELECT fs.id, fs.email, fs.name, fs.created_at
      FROM freebie_subscribers fs
      LEFT JOIN email_logs el
        ON el.user_email = fs.email
       AND el.email_type = 'nurture-day-1'
       AND (
         el.status IN ('sent', 'delivered')
         OR (el.status = 'queued' AND el.sent_at > NOW() - INTERVAL '2 hours')
       )
      WHERE fs.converted_to_user = FALSE
        AND fs.created_at <= NOW() - INTERVAL '1 day'
        AND el.id IS NULL
      ORDER BY fs.created_at ASC
    `

    results.day1.found = day1Subscribers.length
    console.log(`[v0] [CRON] Found ${day1Subscribers.length} subscribers for Day 1 email`)

    if (day1Subscribers.length > 0) {
      try {
        if (!MARKETING_SEGMENTS.nurtureDay1) {
          throw new Error("RESEND_SEGMENT_NURTURE_DAY_1 not configured")
        }

        const contacts = day1Subscribers.map((subscriber: any) => ({
          email: subscriber.email,
          firstName: subscriber.name?.split(" ")[0],
        }))
        const day1Ids = day1Subscribers.map((subscriber: any) => subscriber.id)

        const emailContent = generateNurtureDay1Email({
          firstName: FIRST_NAME_PLACEHOLDER,
          recipientEmail: EMAIL_PLACEHOLDER,
        })

        await enqueueAndProcessMarketingRun({
          sequenceKey: "nurture-day-1",
          emailType: "nurture-day-1",
          tagKey: "sequence_nurture_day_1",
          segmentId: MARKETING_SEGMENTS.nurtureDay1,
          campaignKey: "nurture-day-1",
          subject: "Your First Day with SSELFIE",
          html: emailContent.html,
          text: emailContent.text,
          recipients: contacts,
        })

        results.day1.sent = day1Subscribers.length
      } catch (error: any) {
        results.day1.failed = day1Subscribers.length
        results.errors.push({
          email: "broadcast",
          day: 1,
          error: error.message || "Unknown error",
        })
        console.error("[v0] [CRON] ❌ Failed to send Day 1 broadcast:", error)
        await logAdminError({
          toolName: "cron:nurture-sequence:day-1",
          error: error instanceof Error ? error : new Error(error.message || "Unknown error"),
          context: { recipients: day1Subscribers.length },
        }).catch(() => {})
      }
    }

    // Freebie Nurture Automation - Day 3 emails: 3 days after created_at, not yet sent, skip converted users
    const day3Subscribers = await sql`
      SELECT fs.id, fs.email, fs.name, fs.created_at
      FROM freebie_subscribers fs
      LEFT JOIN email_logs el
        ON el.user_email = fs.email
       AND el.email_type = 'nurture-day-3'
       AND (
         el.status IN ('sent', 'delivered')
         OR (el.status = 'queued' AND el.sent_at > NOW() - INTERVAL '2 hours')
       )
      WHERE fs.converted_to_user = FALSE
        AND fs.created_at <= NOW() - INTERVAL '3 days'
        AND el.id IS NULL
      ORDER BY fs.created_at ASC
    `

    results.day3.found = day3Subscribers.length
    console.log(`[v0] [CRON] Found ${day3Subscribers.length} subscribers for Day 3 email`)

    if (day3Subscribers.length > 0) {
      try {
        if (!MARKETING_SEGMENTS.nurtureDay3) {
          throw new Error("RESEND_SEGMENT_NURTURE_DAY_3 not configured")
        }

        const contacts = day3Subscribers.map((subscriber: any) => ({
          email: subscriber.email,
          firstName: subscriber.name?.split(" ")[0],
        }))
        const day3Ids = day3Subscribers.map((subscriber: any) => subscriber.id)

        const emailContent = generateNurtureDay3Email({
          firstName: FIRST_NAME_PLACEHOLDER,
          recipientEmail: EMAIL_PLACEHOLDER,
        })

        await enqueueAndProcessMarketingRun({
          sequenceKey: "nurture-day-3",
          emailType: "nurture-day-3",
          tagKey: "sequence_nurture_day_3",
          segmentId: MARKETING_SEGMENTS.nurtureDay3,
          campaignKey: "nurture-day-3",
          subject: "How's It Going?",
          html: emailContent.html,
          text: emailContent.text,
          recipients: contacts,
        })

        results.day3.sent = day3Subscribers.length
      } catch (error: any) {
        results.day3.failed = day3Subscribers.length
        results.errors.push({
          email: "broadcast",
          day: 3,
          error: error.message || "Unknown error",
        })
        console.error("[v0] [CRON] ❌ Failed to send Day 3 broadcast:", error)
        await logAdminError({
          toolName: "cron:nurture-sequence:day-3",
          error: error instanceof Error ? error : new Error(error.message || "Unknown error"),
          context: { recipients: day3Subscribers.length },
        }).catch(() => {})
      }
    }

    // Freebie Nurture Automation - Day 7 emails: 7 days after created_at, not yet sent, skip converted users
    const day7Subscribers = await sql`
      SELECT fs.id, fs.email, fs.name, fs.created_at
      FROM freebie_subscribers fs
      LEFT JOIN email_logs el
        ON el.user_email = fs.email
       AND el.email_type = 'nurture-day-7'
       AND (
         el.status IN ('sent', 'delivered')
         OR (el.status = 'queued' AND el.sent_at > NOW() - INTERVAL '2 hours')
       )
      WHERE fs.converted_to_user = FALSE
        AND fs.created_at <= NOW() - INTERVAL '7 days'
        AND el.id IS NULL
      ORDER BY fs.created_at ASC
    `

    results.day7.found = day7Subscribers.length
    console.log(`[v0] [CRON] Found ${day7Subscribers.length} subscribers for Day 7 email`)

    if (day7Subscribers.length > 0) {
      try {
        if (!MARKETING_SEGMENTS.nurtureDay7) {
          throw new Error("RESEND_SEGMENT_NURTURE_DAY_7 not configured")
        }

        const contacts = day7Subscribers.map((subscriber: any) => ({
          email: subscriber.email,
          firstName: subscriber.name?.split(" ")[0],
        }))
        const day7Ids = day7Subscribers.map((subscriber: any) => subscriber.id)

        const emailContent = generateNurtureDay7Email({
          firstName: FIRST_NAME_PLACEHOLDER,
          recipientEmail: EMAIL_PLACEHOLDER,
        })

        await enqueueAndProcessMarketingRun({
          sequenceKey: "nurture-day-7",
          emailType: "nurture-day-7",
          tagKey: "sequence_nurture_day_7",
          segmentId: MARKETING_SEGMENTS.nurtureDay7,
          campaignKey: "nurture-day-7",
          subject: "One Week In",
          html: emailContent.html,
          text: emailContent.text,
          recipients: contacts,
        })

        results.day7.sent = day7Subscribers.length
      } catch (error: any) {
        results.day7.failed = day7Subscribers.length
        results.errors.push({
          email: "broadcast",
          day: 7,
          error: error.message || "Unknown error",
        })
        console.error("[v0] [CRON] ❌ Failed to send Day 7 broadcast:", error)
        await logAdminError({
          toolName: "cron:nurture-sequence:day-7",
          error: error instanceof Error ? error : new Error(error.message || "Unknown error"),
          context: { recipients: day7Subscribers.length },
        }).catch(() => {})
      }
    }

    // Freebie Nurture Automation - Day 10 emails: 10 days after created_at, not yet sent, skip converted users
    const day10Subscribers = await sql`
      SELECT fs.id, fs.email, fs.name, fs.created_at
      FROM freebie_subscribers fs
      LEFT JOIN email_logs el
        ON el.user_email = fs.email
       AND el.email_type = 'nurture-day-10'
       AND (
         el.status IN ('sent', 'delivered')
         OR (el.status = 'queued' AND el.sent_at > NOW() - INTERVAL '2 hours')
       )
      WHERE fs.converted_to_user = FALSE
        AND fs.created_at <= NOW() - INTERVAL '10 days'
        AND el.id IS NULL
      ORDER BY fs.created_at ASC
    `

    results.day10.found = day10Subscribers.length
    console.log(`[v0] [CRON] Found ${day10Subscribers.length} subscribers for Day 10 email`)

    if (day10Subscribers.length > 0) {
      try {
        if (!MARKETING_SEGMENTS.nurtureDay10) {
          throw new Error("RESEND_SEGMENT_NURTURE_DAY_10 not configured")
        }

        const contacts = day10Subscribers.map((subscriber: any) => ({
          email: subscriber.email,
          firstName: subscriber.name?.split(" ")[0],
        }))
        const day10Ids = day10Subscribers.map((subscriber: any) => subscriber.id)

        const emailContent = generateUpsellDay10Email({
          firstName: FIRST_NAME_PLACEHOLDER,
          recipientEmail: EMAIL_PLACEHOLDER,
        })

        await enqueueAndProcessMarketingRun({
          sequenceKey: "nurture-day-10",
          emailType: "nurture-day-10",
          tagKey: "sequence_nurture_day_10",
          segmentId: MARKETING_SEGMENTS.nurtureDay10,
          campaignKey: "nurture-day-10",
          subject: "Ready for the Next Level?",
          html: emailContent.html,
          text: emailContent.text,
          recipients: contacts,
        })

        results.day10.sent = day10Subscribers.length
      } catch (error: any) {
        results.day10.failed = day10Subscribers.length
        results.errors.push({
          email: "broadcast",
          day: 10,
          error: error.message || "Unknown error",
        })
        console.error("[v0] [CRON] ❌ Failed to send Day 10 broadcast:", error)
        await logAdminError({
          toolName: "cron:nurture-sequence:day-10",
          error: error instanceof Error ? error : new Error(error.message || "Unknown error"),
          context: { recipients: day10Subscribers.length },
        }).catch(() => {})
      }
    }

    const totalSent = results.day1.sent + results.day3.sent + results.day7.sent + results.day10.sent
    const totalFailed = results.day1.failed + results.day3.failed + results.day7.failed + results.day10.failed
    const totalSkipped = results.day1.skipped + results.day3.skipped + results.day7.skipped + results.day10.skipped

    console.log(
      `[v0] [CRON] Freebie nurture sequence completed: ${totalSent} sent, ${totalFailed} failed, ${totalSkipped} skipped`,
    )

    await cronLogger.success({
      day1Sent: results.day1.sent,
      day1Failed: results.day1.failed,
      day1Skipped: results.day1.skipped,
      day3Sent: results.day3.sent,
      day3Failed: results.day3.failed,
      day3Skipped: results.day3.skipped,
      day7Sent: results.day7.sent,
      day7Failed: results.day7.failed,
      day7Skipped: results.day7.skipped,
      day10Sent: results.day10.sent,
      day10Failed: results.day10.failed,
      day10Skipped: results.day10.skipped,
      totalSent,
      totalFailed,
      totalSkipped,
    })

    return NextResponse.json({
      success: true,
      message: `Freebie nurture sequence sent: ${totalSent} successful, ${totalFailed} failed, ${totalSkipped} skipped`,
      summary: {
        day1: results.day1,
        day3: results.day3,
        day7: results.day7,
        day10: results.day10,
        totalSent,
        totalFailed,
        totalSkipped,
      },
      errors: results.errors.slice(0, 10), // Limit errors in response
      totalErrors: results.errors.length,
    })
  } catch (error: any) {
    console.error("[v0] [CRON] Error in freebie nurture sequence cron:", error)
    await cronLogger.error(error, {})
    await logAdminError({
      toolName: "cron:nurture-sequence",
      error: error instanceof Error ? error : new Error(String(error)),
      context: {},
    }).catch(() => {})
    return NextResponse.json(
      {
        success: false,
        error: "Failed to run freebie nurture sequence cron",
        details: error.message || "Unknown error",
      },
      { status: 500 },
    )
  }
}

