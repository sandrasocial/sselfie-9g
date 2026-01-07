import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { sendEmail } from "@/lib/email/send-email"
import { createCronLogger } from "@/lib/cron-logger"
import { generateNurtureDay1, generateNurtureDay5, generateNurtureDay10 } from "@/lib/email/templates/nurture-sequence"
import { logAdminError } from "@/lib/admin-error-log"

const sql = neon(process.env.DATABASE_URL!)

/**
 * Nurture Sequence Cron Job
 * Sends emails to freebie subscribers on Day 1, Day 5, and Day 10
 * Runs daily at 11 AM UTC
 */
export async function GET(request: Request) {
  const cronLogger = createCronLogger("nurture-sequence")
  await cronLogger.start()

  try {
    // Verify cron secret for security
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET

    const isProduction = process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production"

    if (isProduction && cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        console.error("[Nurture Sequence] Unauthorized: Invalid or missing CRON_SECRET")
        await cronLogger.error(new Error("Unauthorized"), { reason: "Invalid CRON_SECRET" })
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    } else if (!cronSecret && isProduction) {
      console.warn("[Nurture Sequence] WARNING: CRON_SECRET not set in production!")
    }

    console.log("[Nurture Sequence] Starting daily check...")

    const results = {
      day1: { sent: 0, failed: 0, skipped: 0 },
      day5: { sent: 0, failed: 0, skipped: 0 },
      day10: { sent: 0, failed: 0, skipped: 0 },
    }

    // Get freebie subscribers who need Day 1 email (signed up 1 day ago)
    const day1Subscribers = await sql`
      SELECT fs.id, fs.email, fs.name, fs.created_at
      FROM freebie_subscribers fs
      LEFT JOIN email_logs el ON el.user_email = fs.email AND el.email_type = 'nurture-day-1'
      WHERE fs.created_at >= NOW() - INTERVAL '1 day 2 hours'
      AND fs.created_at < NOW() - INTERVAL '1 day'
      AND el.id IS NULL
      ORDER BY fs.created_at ASC
    `

    console.log(`[Nurture Sequence] Found ${day1Subscribers.length} subscribers for Day 1 email`)

    for (const subscriber of day1Subscribers) {
      try {
        const firstName = subscriber.name?.split(" ")[0] || undefined
        const emailContent = generateNurtureDay1({
          firstName,
        })

        const result = await sendEmail({
          to: subscriber.email,
          subject: emailContent.subject || "Your First Day with SSELFIE",
          html: emailContent.html,
          text: emailContent.text,
          from: "Sandra from SSELFIE <hello@sselfie.ai>",
          emailType: "nurture-day-1",
        })

        if (result.success) {
          // Email is already logged by sendEmail function via email_logs
          results.day1.sent++
        } else {
          results.day1.failed++
          throw new Error(result.error || "Failed to send email")
        }
      } catch (error: any) {
        console.error(`Failed to send Day 1 to ${subscriber.email}:`, error)
        results.day1.failed++
        await logAdminError({
          toolName: "cron:nurture-sequence:day-1",
          error: error instanceof Error ? error : new Error(error.message || "Unknown error"),
          context: { subscriberEmail: subscriber.email, subscriberId: subscriber.id },
        }).catch(() => {})
      }
    }

    // Get freebie subscribers who need Day 5 email (signed up 5 days ago)
    const day5Subscribers = await sql`
      SELECT fs.id, fs.email, fs.name, fs.created_at
      FROM freebie_subscribers fs
      LEFT JOIN email_logs el ON el.user_email = fs.email AND el.email_type = 'nurture-day-5'
      WHERE fs.created_at >= NOW() - INTERVAL '5 days 2 hours'
      AND fs.created_at < NOW() - INTERVAL '5 days'
      AND el.id IS NULL
      ORDER BY fs.created_at ASC
    `

    console.log(`[Nurture Sequence] Found ${day5Subscribers.length} subscribers for Day 5 email`)

    for (const subscriber of day5Subscribers) {
      try {
        const firstName = subscriber.name?.split(" ")[0] || undefined
        const emailContent = generateNurtureDay5({
          firstName,
        })

        const result = await sendEmail({
          to: subscriber.email,
          subject: emailContent.subject || "How's It Going?",
          html: emailContent.html,
          text: emailContent.text,
          from: "Sandra from SSELFIE <hello@sselfie.ai>",
          emailType: "nurture-day-5",
        })

        if (result.success) {
          // Email is already logged by sendEmail function via email_logs
          results.day5.sent++
        } else {
          results.day5.failed++
          throw new Error(result.error || "Failed to send email")
        }
      } catch (error: any) {
        console.error(`Failed to send Day 5 to ${subscriber.email}:`, error)
        results.day5.failed++
        await logAdminError({
          toolName: "cron:nurture-sequence:day-5",
          error: error instanceof Error ? error : new Error(error.message || "Unknown error"),
          context: { subscriberEmail: subscriber.email, subscriberId: subscriber.id },
        }).catch(() => {})
      }
    }

    // Get freebie subscribers who need Day 10 email (signed up 10 days ago)
    const day10Subscribers = await sql`
      SELECT fs.id, fs.email, fs.name, fs.created_at
      FROM freebie_subscribers fs
      LEFT JOIN email_logs el ON el.user_email = fs.email AND el.email_type = 'nurture-day-10'
      WHERE fs.created_at >= NOW() - INTERVAL '10 days 2 hours'
      AND fs.created_at < NOW() - INTERVAL '10 days'
      AND el.id IS NULL
      ORDER BY fs.created_at ASC
    `

    console.log(`[Nurture Sequence] Found ${day10Subscribers.length} subscribers for Day 10 email`)

    for (const subscriber of day10Subscribers) {
      try {
        const firstName = subscriber.name?.split(" ")[0] || undefined
        const emailContent = generateNurtureDay10({
          firstName,
        })

        const result = await sendEmail({
          to: subscriber.email,
          subject: emailContent.subject || "Last Chance: Join Studio Today",
          html: emailContent.html,
          text: emailContent.text,
          from: "Sandra from SSELFIE <hello@sselfie.ai>",
          emailType: "nurture-day-10",
        })

        if (result.success) {
          // Email is already logged by sendEmail function via email_logs
          results.day10.sent++
        } else {
          results.day10.failed++
          throw new Error(result.error || "Failed to send email")
        }
      } catch (error: any) {
        console.error(`Failed to send Day 10 to ${subscriber.email}:`, error)
        results.day10.failed++
        await logAdminError({
          toolName: "cron:nurture-sequence:day-10",
          error: error instanceof Error ? error : new Error(error.message || "Unknown error"),
          context: { subscriberEmail: subscriber.email, subscriberId: subscriber.id },
        }).catch(() => {})
      }
    }

    console.log("[Nurture Sequence] Results:", results)

    const totalSent = results.day1.sent + results.day5.sent + results.day10.sent
    const totalFailed = results.day1.failed + results.day5.failed + results.day10.failed

    await cronLogger.success({
      day1Sent: results.day1.sent,
      day1Failed: results.day1.failed,
      day5Sent: results.day5.sent,
      day5Failed: results.day5.failed,
      day10Sent: results.day10.sent,
      day10Failed: results.day10.failed,
      totalSent,
      totalFailed,
    })

    return NextResponse.json({
      success: true,
      results,
      summary: {
        totalSent,
        totalFailed,
      },
    })
  } catch (error: any) {
    console.error("[Nurture Sequence] Error:", error)
    await cronLogger.error(error, {})
    await logAdminError({
      toolName: "cron:nurture-sequence",
      error: error instanceof Error ? error : new Error(String(error)),
      context: {},
    }).catch(() => {})
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to process nurture sequence",
      },
      { status: 500 }
    )
  }
}


