import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { getSegmentMembers } from "@/lib/email/segmentation"
import { sendEmail } from "@/lib/email/send-email"
import { createCronLogger } from "@/lib/cron-logger"
import { generateReengagementDay0, generateReengagementDay7, generateReengagementDay14 } from "@/lib/email/templates/reengagement-sequence"
import { logAdminError } from "@/lib/admin-error-log"
import { sendMarketingBroadcast, syncMarketingContacts } from "@/lib/email/marketing-sender"
import { MARKETING_SEGMENTS } from "@/lib/email/config"

const sql = neon(process.env.DATABASE_URL!)

const FIRST_NAME_PLACEHOLDER = "{{{FIRST_NAME|friend}}}"

/**
 * Re-Engagement Campaigns - Resend Broadcasts (Marketing)
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
      SELECT DISTINCT u.email, u.display_name as first_name, u.id
      FROM users u
      INNER JOIN subscriptions s ON u.id = s.user_id::varchar
      LEFT JOIN email_logs el_day0 ON el_day0.user_email = u.email AND el_day0.email_type = 'reengagement-day-0'
      WHERE s.status = 'active'
      AND s.product_type IN ('sselfie_studio_membership', 'brand_studio_membership')
      AND s.is_test_mode = false
      AND (u.last_login_at < NOW() - INTERVAL '30 days' OR u.last_login_at IS NULL)
      AND el_day0.id IS NULL
      LIMIT 100
    `

    results.day0.found = day0Users.length
    console.log(`[v0] [Re-Engagement] Found ${day0Users.length} users for Day 0 email`)

    if (day0Users.length > 0) {
      try {
        if (!MARKETING_SEGMENTS.reengagementDay0) {
          throw new Error("RESEND_SEGMENT_REENGAGEMENT_DAY_0 not configured")
        }

        const contacts = day0Users.map((user: any) => ({
          email: user.email,
          firstName: user.first_name,
        }))
        const day0Emails = day0Users.map((user: any) => user.email)

        const emailContent = generateReengagementDay0({
          firstName: FIRST_NAME_PLACEHOLDER,
        })

        await syncMarketingContacts({
          tagKey: "sequence_reengagement_day_0",
          tagValue: "true",
          segmentId: MARKETING_SEGMENTS.reengagementDay0,
          contacts,
        })

        await sendMarketingBroadcast({
          campaignKey: "reengagement-day-0",
          segmentId: MARKETING_SEGMENTS.reengagementDay0,
          subject: emailContent.subject || "Haven't seen you in a while... 👀",
          html: emailContent.html,
          text: emailContent.text,
          estimatedRecipientCount: day0Users.length,
        })

        await sql`
          INSERT INTO email_logs (user_email, email_type, status, sent_at)
          SELECT unnest(${day0Emails}::text[]), 'reengagement-day-0', 'sent', NOW()
        `

        await syncMarketingContacts({
          tagKey: "sequence_reengagement_day_0",
          tagValue: "false",
          segmentId: MARKETING_SEGMENTS.reengagementDay0,
          removeFromSegment: true,
          contacts,
        })

        results.day0.sent = day0Users.length
      } catch (error: any) {
        results.day0.failed = day0Users.length
        results.errors.push({
          email: "broadcast",
          day: 0,
          error: error.message || "Unknown error",
        })
        console.error("[v0] [Re-Engagement] ❌ Failed to send Day 0 broadcast:", error)
        await logAdminError({
          toolName: "cron:reengagement-campaigns:day-0",
          error: error instanceof Error ? error : new Error(error.message || "Unknown error"),
          context: { recipients: day0Users.length },
        }).catch(() => {})
      }
    }

    // Day 7: Find users who received Day 0 email 7 days ago
    const day7Users = await sql`
      SELECT DISTINCT u.email, u.display_name as first_name, u.id, el_day0.sent_at as day0_sent_at
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

    if (day7Users.length > 0) {
      try {
        if (!MARKETING_SEGMENTS.reengagementDay7) {
          throw new Error("RESEND_SEGMENT_REENGAGEMENT_DAY_7 not configured")
        }

        const contacts = day7Users.map((user: any) => ({
          email: user.email,
          firstName: user.first_name,
        }))
        const day7Emails = day7Users.map((user: any) => user.email)

        const emailContent = generateReengagementDay7({
          firstName: FIRST_NAME_PLACEHOLDER,
        })

        await syncMarketingContacts({
          tagKey: "sequence_reengagement_day_7",
          tagValue: "true",
          segmentId: MARKETING_SEGMENTS.reengagementDay7,
          contacts,
        })

        await sendMarketingBroadcast({
          campaignKey: "reengagement-day-7",
          segmentId: MARKETING_SEGMENTS.reengagementDay7,
          subject: emailContent.subject || "What You're Missing",
          html: emailContent.html,
          text: emailContent.text,
          estimatedRecipientCount: day7Users.length,
        })

        await sql`
          INSERT INTO email_logs (user_email, email_type, status, sent_at)
          SELECT unnest(${day7Emails}::text[]), 'reengagement-day-7', 'sent', NOW()
        `

        await syncMarketingContacts({
          tagKey: "sequence_reengagement_day_7",
          tagValue: "false",
          segmentId: MARKETING_SEGMENTS.reengagementDay7,
          removeFromSegment: true,
          contacts,
        })

        results.day7.sent = day7Users.length
      } catch (error: any) {
        results.day7.failed = day7Users.length
        results.errors.push({
          email: "broadcast",
          day: 7,
          error: error.message || "Unknown error",
        })
        console.error("[v0] [Re-Engagement] ❌ Failed to send Day 7 broadcast:", error)
        await logAdminError({
          toolName: "cron:reengagement-campaigns:day-7",
          error: error instanceof Error ? error : new Error(error.message || "Unknown error"),
          context: { recipients: day7Users.length },
        }).catch(() => {})
      }
    }

    // Day 14: Find users who received Day 0 email 14 days ago
    const day14Users = await sql`
      SELECT DISTINCT u.email, u.display_name as first_name, u.id, el_day0.sent_at as day0_sent_at
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

    if (day14Users.length > 0) {
      try {
        if (!MARKETING_SEGMENTS.reengagementDay14) {
          throw new Error("RESEND_SEGMENT_REENGAGEMENT_DAY_14 not configured")
        }

        const contacts = day14Users.map((user: any) => ({
          email: user.email,
          firstName: user.first_name,
        }))
        const day14Emails = day14Users.map((user: any) => user.email)

        const emailContent = generateReengagementDay14({
          firstName: FIRST_NAME_PLACEHOLDER,
        })

        await syncMarketingContacts({
          tagKey: "sequence_reengagement_day_14",
          tagValue: "true",
          segmentId: MARKETING_SEGMENTS.reengagementDay14,
          contacts,
        })

        await sendMarketingBroadcast({
          campaignKey: "reengagement-day-14",
          segmentId: MARKETING_SEGMENTS.reengagementDay14,
          subject: emailContent.subject || "Comeback Offer: 50% Off",
          html: emailContent.html,
          text: emailContent.text,
          estimatedRecipientCount: day14Users.length,
        })

        await sql`
          INSERT INTO email_logs (user_email, email_type, status, sent_at)
          SELECT unnest(${day14Emails}::text[]), 'reengagement-day-14', 'sent', NOW()
        `

        await syncMarketingContacts({
          tagKey: "sequence_reengagement_day_14",
          tagValue: "false",
          segmentId: MARKETING_SEGMENTS.reengagementDay14,
          removeFromSegment: true,
          contacts,
        })

        results.day14.sent = day14Users.length
      } catch (error: any) {
        results.day14.failed = day14Users.length
        results.errors.push({
          email: "broadcast",
          day: 14,
          error: error.message || "Unknown error",
        })
        console.error("[v0] [Re-Engagement] ❌ Failed to send Day 14 broadcast:", error)
        await logAdminError({
          toolName: "cron:reengagement-campaigns:day-14",
          error: error instanceof Error ? error : new Error(error.message || "Unknown error"),
          context: { recipients: day14Users.length },
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
