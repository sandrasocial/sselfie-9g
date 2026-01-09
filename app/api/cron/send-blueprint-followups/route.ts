import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { sendEmail } from "@/lib/email/send-email"
import { createCronLogger } from "@/lib/cron-logger"
import { generateBlueprintFollowupDay3Email } from "@/lib/email/templates/blueprint-followup-day-3"
import { generateBlueprintFollowupDay7Email } from "@/lib/email/templates/blueprint-followup-day-7"
import { generateBlueprintFollowupDay14Email } from "@/lib/email/templates/blueprint-followup-day-14"
import { generatePaidBlueprintDay1Email, PAID_BLUEPRINT_DAY1_SUBJECT } from "@/lib/email/templates/paid-blueprint-day-1"
import { generatePaidBlueprintDay3Email, PAID_BLUEPRINT_DAY3_SUBJECT } from "@/lib/email/templates/paid-blueprint-day-3"
import { generatePaidBlueprintDay7Email, PAID_BLUEPRINT_DAY7_SUBJECT } from "@/lib/email/templates/paid-blueprint-day-7"
import { logAdminError } from "@/lib/admin-error-log"

const sql = neon(process.env.DATABASE_URL!)

/**
 * Blueprint Followup Sequence - Resend Direct Sends
 * 
 * Sends blueprint followup emails directly via Resend API.
 * 
 * GET /api/cron/send-blueprint-followups
 * 
 * Protected by CRON_SECRET environment variable
 * Runs daily at 10 AM UTC
 * 
 * Email templates:
 * - Day 3: "3 Ways to Use Your Blueprint This Week"
 * - Day 7: "This Could Be You"
 * - Day 14: "Still thinking about it? Here's $10 off 💕"
 */
export async function GET(request: Request) {
  const cronLogger = createCronLogger("send-blueprint-followups")
  await cronLogger.start()

  try {
    // Verify cron secret for security
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

    console.log("[v0] [CRON] Starting blueprint follow-up email sequence...")

    const results = {
      day3: { found: 0, sent: 0, failed: 0, skipped: 0 },
      day7: { found: 0, sent: 0, failed: 0, skipped: 0 },
      day14: { found: 0, sent: 0, failed: 0, skipped: 0 },
      paidDay1: { found: 0, sent: 0, failed: 0, skipped: 0 },
      paidDay3: { found: 0, sent: 0, failed: 0, skipped: 0 },
      paidDay7: { found: 0, sent: 0, failed: 0, skipped: 0 },
      errors: [] as Array<{ email: string; day: number; error: string }>,
    }

    // Day 3 emails: 3 days after created_at, not yet sent, check email_logs for duplicates
    const day3Subscribers = await sql`
      SELECT bs.id, bs.email, bs.name, bs.form_data, bs.created_at
      FROM blueprint_subscribers bs
      LEFT JOIN email_logs el ON el.user_email = bs.email AND el.email_type = 'blueprint-followup-day-3'
      WHERE bs.day_3_email_sent = FALSE
        AND bs.created_at <= NOW() - INTERVAL '3 days'
        AND bs.created_at > NOW() - INTERVAL '4 days'
        AND bs.welcome_email_sent = TRUE
        AND el.id IS NULL
      ORDER BY bs.created_at ASC
    `

    results.day3.found = day3Subscribers.length
    console.log(`[v0] [CRON] Found ${day3Subscribers.length} subscribers for Day 3 email`)

    for (const subscriber of day3Subscribers) {
      try {
        // Check if already sent (dedupe check)
        const existingLog = await sql`
          SELECT id FROM email_logs
          WHERE user_email = ${subscriber.email}
          AND email_type = 'blueprint-followup-day-3'
          LIMIT 1
        `
        if (existingLog.length > 0) {
          results.day3.skipped++
          continue
        }

        const firstName = subscriber.name?.split(" ")[0] || undefined
        const emailContent = generateBlueprintFollowupDay3Email({
          firstName,
          email: subscriber.email,
        })

        const sendResult = await sendEmail({
          to: subscriber.email,
          subject: "3 Ways to Use Your Blueprint This Week",
          html: emailContent.html,
          text: emailContent.text,
          from: "Sandra from SSELFIE <hello@sselfie.ai>",
          emailType: "blueprint-followup-day-3",
        })

        if (sendResult.success) {
          // Mark as sent
          await sql`
            UPDATE blueprint_subscribers
            SET 
              day_3_email_sent = TRUE,
              day_3_email_sent_at = NOW(),
              updated_at = NOW()
            WHERE id = ${subscriber.id}
          `
          // Email is already logged by sendEmail via email_logs
          results.day3.sent++
          console.log(`[v0] [CRON] ✅ Sent Day 3 email to ${subscriber.email}`)
        } else {
          throw new Error(sendResult.error || 'Failed to send email')
        }
      } catch (error: any) {
        results.day3.failed++
        results.errors.push({
          email: subscriber.email,
          day: 3,
          error: error.message || "Unknown error",
        })
        console.error(`[v0] [CRON] ❌ Failed to send Day 3 email to ${subscriber.email}:`, error)
        await logAdminError({
          toolName: "cron:send-blueprint-followups:day-3",
          error: error instanceof Error ? error : new Error(error.message || "Unknown error"),
          context: { subscriberEmail: subscriber.email, subscriberId: subscriber.id },
        }).catch(() => {})
      }
    }

    // Day 7 emails: 7 days after created_at, not yet sent, check email_logs for duplicates
    const day7Subscribers = await sql`
      SELECT bs.id, bs.email, bs.name, bs.form_data, bs.created_at
      FROM blueprint_subscribers bs
      LEFT JOIN email_logs el ON el.user_email = bs.email AND el.email_type = 'blueprint-followup-day-7'
      WHERE bs.day_7_email_sent = FALSE
        AND bs.created_at <= NOW() - INTERVAL '7 days'
        AND bs.created_at > NOW() - INTERVAL '8 days'
        AND bs.welcome_email_sent = TRUE
        AND el.id IS NULL
      ORDER BY bs.created_at ASC
    `

    results.day7.found = day7Subscribers.length
    console.log(`[v0] [CRON] Found ${day7Subscribers.length} subscribers for Day 7 email`)

    for (const subscriber of day7Subscribers) {
      try {
        // Check if already sent (dedupe check)
        const existingLog = await sql`
          SELECT id FROM email_logs
          WHERE user_email = ${subscriber.email}
          AND email_type = 'blueprint-followup-day-7'
          LIMIT 1
        `
        if (existingLog.length > 0) {
          results.day7.skipped++
          continue
        }

        const firstName = subscriber.name?.split(" ")[0] || undefined
        const emailContent = generateBlueprintFollowupDay7Email({
          firstName,
          email: subscriber.email,
        })

        const sendResult = await sendEmail({
          to: subscriber.email,
          subject: "This Could Be You",
          html: emailContent.html,
          text: emailContent.text,
          from: "Sandra from SSELFIE <hello@sselfie.ai>",
          emailType: "blueprint-followup-day-7",
        })

        if (sendResult.success) {
          // Mark as sent
          await sql`
            UPDATE blueprint_subscribers
            SET 
              day_7_email_sent = TRUE,
              day_7_email_sent_at = NOW(),
              updated_at = NOW()
            WHERE id = ${subscriber.id}
          `
          // Email is already logged by sendEmail via email_logs
          results.day7.sent++
          console.log(`[v0] [CRON] ✅ Sent Day 7 email to ${subscriber.email}`)
        } else {
          throw new Error(sendResult.error || 'Failed to send email')
        }
      } catch (error: any) {
        results.day7.failed++
        results.errors.push({
          email: subscriber.email,
          day: 7,
          error: error.message || "Unknown error",
        })
        console.error(`[v0] [CRON] ❌ Failed to send Day 7 email to ${subscriber.email}:`, error)
        await logAdminError({
          toolName: "cron:send-blueprint-followups:day-7",
          error: error instanceof Error ? error : new Error(error.message || "Unknown error"),
          context: { subscriberEmail: subscriber.email, subscriberId: subscriber.id },
        }).catch(() => {})
      }
    }

    // Day 14 emails: 14 days after created_at, not yet sent, check email_logs for duplicates
    const day14Subscribers = await sql`
      SELECT bs.id, bs.email, bs.name, bs.form_data, bs.created_at
      FROM blueprint_subscribers bs
      LEFT JOIN email_logs el ON el.user_email = bs.email AND el.email_type = 'blueprint-followup-day-14'
      WHERE bs.day_14_email_sent = FALSE
        AND bs.created_at <= NOW() - INTERVAL '14 days'
        AND bs.created_at > NOW() - INTERVAL '15 days'
        AND bs.welcome_email_sent = TRUE
        AND el.id IS NULL
      ORDER BY bs.created_at ASC
    `

    results.day14.found = day14Subscribers.length
    console.log(`[v0] [CRON] Found ${day14Subscribers.length} subscribers for Day 14 email`)

    for (const subscriber of day14Subscribers) {
      try {
        // Check if already sent (dedupe check)
        const existingLog = await sql`
          SELECT id FROM email_logs
          WHERE user_email = ${subscriber.email}
          AND email_type = 'blueprint-followup-day-14'
          LIMIT 1
        `
        if (existingLog.length > 0) {
          results.day14.skipped++
          continue
        }

        const firstName = subscriber.name?.split(" ")[0] || undefined
        const emailContent = generateBlueprintFollowupDay14Email({
          firstName,
          email: subscriber.email,
        })

        const sendResult = await sendEmail({
          to: subscriber.email,
          subject: "Still thinking about it? Here's $10 off 💕",
          html: emailContent.html,
          text: emailContent.text,
          from: "Sandra from SSELFIE <hello@sselfie.ai>",
          emailType: "blueprint-followup-day-14",
        })

        if (sendResult.success) {
          // Mark as sent
          await sql`
            UPDATE blueprint_subscribers
            SET 
              day_14_email_sent = TRUE,
              day_14_email_sent_at = NOW(),
              updated_at = NOW()
            WHERE id = ${subscriber.id}
          `
          // Email is already logged by sendEmail via email_logs
          results.day14.sent++
          console.log(`[v0] [CRON] ✅ Sent Day 14 email to ${subscriber.email}`)
        } else {
          throw new Error(sendResult.error || 'Failed to send email')
        }
      } catch (error: any) {
        results.day14.failed++
        results.errors.push({
          email: subscriber.email,
          day: 14,
          error: error.message || "Unknown error",
        })
        console.error(`[v0] [CRON] ❌ Failed to send Day 14 email to ${subscriber.email}:`, error)
        await logAdminError({
          toolName: "cron:send-blueprint-followups:day-14",
          error: error instanceof Error ? error : new Error(error.message || "Unknown error"),
          context: { subscriberEmail: subscriber.email, subscriberId: subscriber.id },
        }).catch(() => {})
      }
    }

    const totalSent = results.day3.sent + results.day7.sent + results.day14.sent
    const totalFailed = results.day3.failed + results.day7.failed + results.day14.failed
    const totalSkipped = results.day3.skipped + results.day7.skipped + results.day14.skipped

    console.log(
      `[v0] [CRON] Follow-up sequence completed: ${totalSent} sent, ${totalFailed} failed, ${totalSkipped} skipped`,
    )

    await cronLogger.success({
      day3Sent: results.day3.sent,
      day3Failed: results.day3.failed,
      day3Skipped: results.day3.skipped,
      day7Sent: results.day7.sent,
      day7Failed: results.day7.failed,
      day7Skipped: results.day7.skipped,
      day14Sent: results.day14.sent,
      day14Failed: results.day14.failed,
      day14Skipped: results.day14.skipped,
      totalSent,
      totalFailed,
      totalSkipped,
    })

    return NextResponse.json({
      success: true,
      message: `Blueprint follow-ups sent: ${totalSent} successful, ${totalFailed} failed, ${totalSkipped} skipped`,
      summary: {
        day3: results.day3,
        day7: results.day7,
        day14: results.day14,
        totalSent,
        totalFailed,
        totalSkipped,
      },
      errors: results.errors.slice(0, 10), // Limit errors in response
      totalErrors: results.errors.length,
    })
  } catch (error: any) {
    console.error("[v0] [CRON] Error in blueprint follow-up cron:", error)
    await cronLogger.error(error, {})
    await logAdminError({
      toolName: "cron:send-blueprint-followups",
      error: error instanceof Error ? error : new Error(String(error)),
      context: {},
    }).catch(() => {})
    return NextResponse.json(
      {
        success: false,
        error: "Failed to run blueprint follow-up cron",
        details: error.message || "Unknown error",
      },
      { status: 500 },
    )
  }
}
