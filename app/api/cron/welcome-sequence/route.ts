import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { sendEmail } from "@/lib/email/send-email"
import { createCronLogger } from "@/lib/cron-logger"
import { logAdminError } from "@/lib/admin-error-log"
import { generateWelcomeDay0, generateWelcomeDay3, generateWelcomeDay7 } from "@/lib/email/templates/welcome-sequence"

const sql = neon(process.env.DATABASE_URL!)

/**
 * Welcome Sequence Cron Job
 * Sends emails to new paid members on Day 0, Day 3, and Day 7
 * Runs daily at 10 AM UTC
 */
export async function GET(request: Request) {
  const cronLogger = createCronLogger("welcome-sequence")
  await cronLogger.start()

  try {
    // Verify cron secret for security
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET

    const isProduction = process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production"

    if (isProduction && cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        console.error("[Welcome Sequence] Unauthorized: Invalid or missing CRON_SECRET")
        await cronLogger.error(new Error("Unauthorized"), { reason: "Invalid CRON_SECRET" })
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    } else if (!cronSecret && isProduction) {
      console.warn("[Welcome Sequence] WARNING: CRON_SECRET not set in production!")
    }

    console.log("[Welcome Sequence] Starting daily check...")

  const results = {
    day0: { sent: 0, failed: 0 },
    day3: { sent: 0, failed: 0 },
    day7: { sent: 0, failed: 0 },
  }

  try {
    // Get users who need Day 0 email (signed up in last 2 hours and have active subscription)
    const day0Users = await sql`
      SELECT DISTINCT u.email, u.first_name, u.id, u.created_at
      FROM users u
      INNER JOIN subscriptions s ON u.id = s.user_id::varchar
      LEFT JOIN email_logs el ON el.user_email = u.email AND el.email_type = 'welcome-day-0'
      WHERE u.created_at >= NOW() - INTERVAL '2 hours'
      AND u.created_at < NOW()
      AND s.status = 'active'
      AND s.product_type IN ('sselfie_studio_membership', 'brand_studio_membership')
      AND s.is_test_mode = false
      AND el.id IS NULL
    `

    // Get users who need Day 3 email (signed up 3 days ago)
    const day3Users = await sql`
      SELECT DISTINCT u.email, u.first_name, u.id, u.created_at
      FROM users u
      INNER JOIN subscriptions s ON u.id = s.user_id::varchar
      LEFT JOIN email_logs el ON el.user_email = u.email AND el.email_type = 'welcome-day-3'
      WHERE u.created_at >= NOW() - INTERVAL '3 days 2 hours'
      AND u.created_at < NOW() - INTERVAL '3 days'
      AND s.status = 'active'
      AND s.product_type IN ('sselfie_studio_membership', 'brand_studio_membership')
      AND s.is_test_mode = false
      AND el.id IS NULL
    `

    // Get users who need Day 7 email (signed up 7 days ago)
    const day7Users = await sql`
      SELECT DISTINCT u.email, u.first_name, u.id, u.created_at
      FROM users u
      INNER JOIN subscriptions s ON u.id = s.user_id::varchar
      LEFT JOIN email_logs el ON el.user_email = u.email AND el.email_type = 'welcome-day-7'
      WHERE u.created_at >= NOW() - INTERVAL '7 days 2 hours'
      AND u.created_at < NOW() - INTERVAL '7 days'
      AND s.status = 'active'
      AND s.product_type IN ('sselfie_studio_membership', 'brand_studio_membership')
      AND s.is_test_mode = false
      AND el.id IS NULL
    `

    // Get or create campaign records for tracking
    const getCampaignId = async (campaignType: string) => {
      const existing = await sql`
        SELECT id FROM admin_email_campaigns 
        WHERE campaign_type = ${campaignType} 
        LIMIT 1
      `
      if (existing.length > 0) return existing[0].id

      const newCampaign = await sql`
        INSERT INTO admin_email_campaigns (
          campaign_name, campaign_type, subject_line, body_html, body_text, status
        ) VALUES (
          ${campaignType}, ${campaignType}, ${campaignType}, '', '', 'active'
        )
        RETURNING id
      `
      return newCampaign[0].id
    }

    const day0CampaignId = await getCampaignId("welcome-day-0")
    const day3CampaignId = await getCampaignId("welcome-day-3")
    const day7CampaignId = await getCampaignId("welcome-day-7")

    // Send Day 0 emails
    for (const user of day0Users) {
      try {
        const emailContent = generateWelcomeDay0({
          firstName: user.first_name || undefined,
          campaignId: day0CampaignId,
        })

        const result = await sendEmail({
          to: user.email,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
          from: "Sandra from SSELFIE <hello@sselfie.ai>",
          emailType: "welcome-day-0",
          campaignId: day0CampaignId,
        })

        if (result.success) {
          // Email is already logged by sendEmail function via email_logs
          results.day0.sent++
        } else {
          results.day0.failed++
        }
      } catch (error) {
        console.error(`Failed to send Day 0 to ${user.email}:`, error)
        results.day0.failed++
      }
    }

    // Send Day 3 emails
    for (const user of day3Users) {
      try {
        const emailContent = generateWelcomeDay3({
          firstName: user.first_name || undefined,
          campaignId: day3CampaignId,
        })

        const result = await sendEmail({
          to: user.email,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
          from: "Sandra from SSELFIE <hello@sselfie.ai>",
          emailType: "welcome-day-3",
          campaignId: day3CampaignId,
        })

        if (result.success) {
          // Email is already logged by sendEmail function via email_logs
          results.day3.sent++
        } else {
          results.day3.failed++
        }
      } catch (error) {
        console.error(`Failed to send Day 3 to ${user.email}:`, error)
        results.day3.failed++
      }
    }

    // Send Day 7 emails
    for (const user of day7Users) {
      try {
        const emailContent = generateWelcomeDay7({
          firstName: user.first_name || undefined,
          campaignId: day7CampaignId,
        })

        const result = await sendEmail({
          to: user.email,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
          from: "Sandra from SSELFIE <hello@sselfie.ai>",
          emailType: "welcome-day-7",
          campaignId: day7CampaignId,
        })

        if (result.success) {
          // Email is already logged by sendEmail function via email_logs
          results.day7.sent++
        } else {
          results.day7.failed++
        }
      } catch (error) {
        console.error(`Failed to send Day 7 to ${user.email}:`, error)
        results.day7.failed++
      }
    }

    console.log("[Welcome Sequence] Results:", results)

    const totalSent = results.day0.sent + results.day3.sent + results.day7.sent
    const totalFailed = results.day0.failed + results.day3.failed + results.day7.failed

    await cronLogger.success({
      day0Sent: results.day0.sent,
      day0Failed: results.day0.failed,
      day3Sent: results.day3.sent,
      day3Failed: results.day3.failed,
      day7Sent: results.day7.sent,
      day7Failed: results.day7.failed,
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
    console.error("[Welcome Sequence] Error:", error)
    await cronLogger.error(error, {})
    await logAdminError({
      toolName: "cron:welcome-sequence",
      error: error instanceof Error ? error : new Error(String(error)),
      context: {},
    }).catch(() => {})
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to process welcome sequence",
      },
      { status: 500 }
    )
  }
  } catch (error: any) {
    console.error("[Welcome Sequence] Outer error:", error)
    await cronLogger.error(error, {})
    await logAdminError({
      toolName: "cron:welcome-sequence",
      error: error instanceof Error ? error : new Error(String(error)),
      context: {},
    }).catch(() => {})
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to process welcome sequence",
      },
      { status: 500 }
    )
  }
}

