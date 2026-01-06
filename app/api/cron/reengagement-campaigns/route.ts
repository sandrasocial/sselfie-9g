import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { getSegmentMembers } from "@/lib/email/segmentation"
import { sendEmail } from "@/lib/email/send-email"
import { createCronLogger } from "@/lib/cron-logger"
import { generateReengagementDay0, generateReengagementDay7, generateReengagementDay14 } from "@/lib/email/templates/reengagement-sequence"
import { logAdminError } from "@/lib/admin-error-log"

const sql = neon(process.env.DATABASE_URL!)

/**
 * Re-Engagement Campaigns - Resend Direct Sends
 * 
 * Sends re-engagement emails directly via Resend API.
 * Targets inactive users based on segments and sends Day 0, 7, 14 sequence.
 * 
 * Runs daily at 12 PM UTC
 */
export async function GET(request: Request) {
  const cronLogger = createCronLogger("reengagement-campaigns")
  await cronLogger.start()

  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET

    const isProduction = process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production"

    if (isProduction && cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        console.error("[v0] [Re-Engagement] Unauthorized")
        await cronLogger.error(new Error("Unauthorized"), { reason: "Invalid CRON_SECRET" })
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    }

    console.log("[v0] [Re-Engagement] Starting re-engagement campaign check...")

    const results = {
      day0: { found: 0, sent: 0, failed: 0, skipped: 0 },
      day7: { found: 0, sent: 0, failed: 0, skipped: 0 },
      day14: { found: 0, sent: 0, failed: 0, skipped: 0 },
      errors: [] as Array<{ email: string; day: number; error: string }>,
    }

    // Day 0: Find users who haven't been active in 30+ days and haven't received Day 0 email
    const day0Users = await sql`
      SELECT DISTINCT u.email, u.first_name, u.id
      FROM users u
      INNER JOIN subscriptions s ON u.id = s.user_id::varchar
      LEFT JOIN email_logs el_day0 ON el_day0.user_email = u.email AND el_day0.email_type = 'reengagement-day-0'
      WHERE s.status = 'active'
      AND s.product_type IN ('sselfie_studio_membership', 'brand_studio_membership')
      AND s.is_test_mode = false
      AND u.last_activity_at < NOW() - INTERVAL '30 days'
      AND el_day0.id IS NULL
      LIMIT 100
    `

    results.day0.found = day0Users.length
    console.log(`[v0] [Re-Engagement] Found ${day0Users.length} users for Day 0 email`)

    for (const user of day0Users) {
      try {
        // Check if already sent (dedupe)
        const existingLog = await sql`
          SELECT id FROM email_logs
          WHERE user_email = ${user.email}
          AND email_type = 'reengagement-day-0'
          LIMIT 1
        `
        if (existingLog.length > 0) {
          results.day0.skipped++
          continue
        }

        const emailContent = generateReengagementDay0({
          firstName: user.first_name || undefined,
        })

        const sendResult = await sendEmail({
          to: user.email,
          subject: emailContent.subject || "Haven't seen you in a while... 👀",
          html: emailContent.html,
          text: emailContent.text,
          from: "Sandra from SSELFIE <hello@sselfie.ai>",
          emailType: "reengagement-day-0",
        })

        if (sendResult.success) {
          // Email is already logged by sendEmail via email_logs
          results.day0.sent++
          console.log(`[v0] [Re-Engagement] ✅ Sent Day 0 email to ${user.email}`)
        } else {
          throw new Error(sendResult.error || 'Failed to send email')
        }
      } catch (error: any) {
        results.day0.failed++
        results.errors.push({
          email: user.email,
          day: 0,
          error: error.message || "Unknown error",
        })
        console.error(`[v0] [Re-Engagement] ❌ Failed to send Day 0 email to ${user.email}:`, error)
        await logAdminError({
          toolName: "cron:reengagement-campaigns:day-0",
          error: error instanceof Error ? error : new Error(error.message || "Unknown error"),
          context: { userEmail: user.email, userId: user.id },
        }).catch(() => {})
      }
    }

    // Day 7: Find users who received Day 0 email 7 days ago
    const day7Users = await sql`
      SELECT DISTINCT u.email, u.first_name, u.id, el_day0.sent_at as day0_sent_at
      FROM users u
      INNER JOIN subscriptions s ON u.id = s.user_id::varchar
      INNER JOIN email_logs el_day0 ON el_day0.user_email = u.email AND el_day0.email_type = 'reengagement-day-0'
      LEFT JOIN email_logs el_day7 ON el_day7.user_email = u.email AND el_day7.email_type = 'reengagement-day-7'
      WHERE s.status = 'active'
      AND s.product_type IN ('sselfie_studio_membership', 'brand_studio_membership')
      AND s.is_test_mode = false
      AND el_day0.sent_at <= NOW() - INTERVAL '7 days'
      AND el_day0.sent_at > NOW() - INTERVAL '8 days'
      AND el_day7.id IS NULL
      LIMIT 100
    `

    results.day7.found = day7Users.length
    console.log(`[v0] [Re-Engagement] Found ${day7Users.length} users for Day 7 email`)

    for (const user of day7Users) {
      try {
        const emailContent = generateReengagementDay7({
          firstName: user.first_name || undefined,
        })

        const sendResult = await sendEmail({
          to: user.email,
          subject: emailContent.subject || "What You're Missing",
          html: emailContent.html,
          text: emailContent.text,
          from: "Sandra from SSELFIE <hello@sselfie.ai>",
          emailType: "reengagement-day-7",
        })

        if (sendResult.success) {
          results.day7.sent++
          console.log(`[v0] [Re-Engagement] ✅ Sent Day 7 email to ${user.email}`)
        } else {
          throw new Error(sendResult.error || 'Failed to send email')
        }
      } catch (error: any) {
        results.day7.failed++
        results.errors.push({
          email: user.email,
          day: 7,
          error: error.message || "Unknown error",
        })
        console.error(`[v0] [Re-Engagement] ❌ Failed to send Day 7 email to ${user.email}:`, error)
        await logAdminError({
          toolName: "cron:reengagement-campaigns:day-7",
          error: error instanceof Error ? error : new Error(error.message || "Unknown error"),
          context: { userEmail: user.email, userId: user.id },
        }).catch(() => {})
      }
    }

    // Day 14: Find users who received Day 0 email 14 days ago
    const day14Users = await sql`
      SELECT DISTINCT u.email, u.first_name, u.id, el_day0.sent_at as day0_sent_at
      FROM users u
      INNER JOIN subscriptions s ON u.id = s.user_id::varchar
      INNER JOIN email_logs el_day0 ON el_day0.user_email = u.email AND el_day0.email_type = 'reengagement-day-0'
      LEFT JOIN email_logs el_day14 ON el_day14.user_email = u.email AND el_day14.email_type = 'reengagement-day-14'
      WHERE s.status = 'active'
      AND s.product_type IN ('sselfie_studio_membership', 'brand_studio_membership')
      AND s.is_test_mode = false
      AND el_day0.sent_at <= NOW() - INTERVAL '14 days'
      AND el_day0.sent_at > NOW() - INTERVAL '15 days'
      AND el_day14.id IS NULL
      LIMIT 100
    `

    results.day14.found = day14Users.length
    console.log(`[v0] [Re-Engagement] Found ${day14Users.length} users for Day 14 email`)

    for (const user of day14Users) {
      try {
        const emailContent = generateReengagementDay14({
          firstName: user.first_name || undefined,
        })

        const sendResult = await sendEmail({
          to: user.email,
          subject: emailContent.subject || "Comeback Offer: 50% Off",
          html: emailContent.html,
          text: emailContent.text,
          from: "Sandra from SSELFIE <hello@sselfie.ai>",
          emailType: "reengagement-day-14",
        })

        if (sendResult.success) {
          results.day14.sent++
          console.log(`[v0] [Re-Engagement] ✅ Sent Day 14 email to ${user.email}`)
        } else {
          throw new Error(sendResult.error || 'Failed to send email')
        }
      } catch (error: any) {
        results.day14.failed++
        results.errors.push({
          email: user.email,
          day: 14,
          error: error.message || "Unknown error",
        })
        console.error(`[v0] [Re-Engagement] ❌ Failed to send Day 14 email to ${user.email}:`, error)
        await logAdminError({
          toolName: "cron:reengagement-campaigns:day-14",
          error: error instanceof Error ? error : new Error(error.message || "Unknown error"),
          context: { userEmail: user.email, userId: user.id },
        }).catch(() => {})
      }
    }

    const totalSent = results.day0.sent + results.day7.sent + results.day14.sent
    const totalFailed = results.day0.failed + results.day7.failed + results.day14.failed

    console.log(`[v0] [Re-Engagement] Completed: ${totalSent} sent, ${totalFailed} failed`)

    await cronLogger.success({
      day0Sent: results.day0.sent,
      day0Failed: results.day0.failed,
      day7Sent: results.day7.sent,
      day7Failed: results.day7.failed,
      day14Sent: results.day14.sent,
      day14Failed: results.day14.failed,
      totalSent,
      totalFailed,
    })

    return NextResponse.json({
      success: true,
      day0: results.day0,
      day7: results.day7,
      day14: results.day14,
      totalSent,
      totalFailed,
      errors: results.errors.slice(0, 10),
    })
  } catch (error: any) {
    console.error("[v0] [Re-Engagement] Error:", error)
    await cronLogger.error(error, {})
    await logAdminError({
      toolName: "cron:reengagement-campaigns",
      error: error instanceof Error ? error : new Error(String(error)),
      context: {},
    }).catch(() => {})
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
