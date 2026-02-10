import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { sendEmail } from "@/lib/email/send-email"
import { createCronLogger } from "@/lib/cron-logger"
import { logAdminError } from "@/lib/admin-error-log"
import { generateWelcomeDay0, generateWelcomeDay3, generateWelcomeDay7 } from "@/lib/email/templates/welcome-sequence"
import { generateBlueprintFollowupDay0Email } from "@/lib/email/templates/blueprint-followup-day-0"
import { enqueueAndProcessMarketingRun } from "@/lib/email/marketing-runner"
import { MARKETING_SEGMENTS } from "@/lib/email/config"

const FREE_BLUEPRINT_WELCOME_SUBJECT = "Your Brand Blueprint is Here!"
const FIRST_NAME_PLACEHOLDER = "{{{FIRST_NAME|friend}}}"
const EMAIL_PLACEHOLDER = "{{{EMAIL}}}"

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
      freeBlueprintDay0: { found: 0, sent: 0, failed: 0, skipped: 0 },
    }

    try {
      // Get users who need Day 0 email (signed up in last 2 hours and have active subscription)
      const day0Users = await sql`
        SELECT DISTINCT u.email, u.display_name as first_name, u.id, u.created_at
        FROM users u
        INNER JOIN subscriptions s ON u.id = s.user_id::varchar
        LEFT JOIN email_logs el
          ON el.user_email = u.email
         AND el.email_type = 'welcome-day-0'
         AND (
           el.status IN ('sent', 'delivered')
           OR (el.status = 'queued' AND el.sent_at > NOW() - INTERVAL '2 hours')
         )
        WHERE u.created_at <= NOW()
        AND u.created_at > NOW() - INTERVAL '2 hours'
        AND s.status = 'active'
        AND s.product_type IN ('sselfie_studio_membership', 'brand_studio_membership')
        AND s.is_test_mode = false
        AND el.id IS NULL
      `

      // Get users who need Day 3 email (signed up 3 days ago)
      const day3Users = await sql`
        SELECT DISTINCT u.email, u.display_name as first_name, u.id, u.created_at
        FROM users u
        INNER JOIN subscriptions s ON u.id = s.user_id::varchar
        LEFT JOIN email_logs el
          ON el.user_email = u.email
         AND el.email_type = 'welcome-day-3'
         AND (
           el.status IN ('sent', 'delivered')
           OR (el.status = 'queued' AND el.sent_at > NOW() - INTERVAL '2 hours')
         )
        WHERE u.created_at <= NOW() - INTERVAL '3 days'
        AND u.created_at > NOW() - INTERVAL '10 days'
        AND s.status = 'active'
        AND s.product_type IN ('sselfie_studio_membership', 'brand_studio_membership')
        AND s.is_test_mode = false
        AND el.id IS NULL
      `

      // Get users who need Day 7 email (signed up 7 days ago)
      const day7Users = await sql`
        SELECT DISTINCT u.email, u.display_name as first_name, u.id, u.created_at
        FROM users u
        INNER JOIN subscriptions s ON u.id = s.user_id::varchar
        LEFT JOIN email_logs el
          ON el.user_email = u.email
         AND el.email_type = 'welcome-day-7'
         AND (
           el.status IN ('sent', 'delivered')
           OR (el.status = 'queued' AND el.sent_at > NOW() - INTERVAL '2 hours')
         )
        WHERE u.created_at <= NOW() - INTERVAL '7 days'
        AND u.created_at > NOW() - INTERVAL '21 days'
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

      // Send Day 0 emails (paid members only)
      if (day0Users.length > 0) {
        try {
          if (!MARKETING_SEGMENTS.welcomeDay0) {
            throw new Error("RESEND_SEGMENT_WELCOME_DAY_0 not configured")
          }

          const contacts = day0Users.map((user: any) => ({
            email: user.email,
            firstName: user.first_name,
          }))
          const day0Emails = day0Users.map((user: any) => user.email)

          const emailContent = generateWelcomeDay0({
            firstName: FIRST_NAME_PLACEHOLDER,
            campaignId: day0CampaignId,
          })

          await enqueueAndProcessMarketingRun({
            sequenceKey: "welcome-day-0",
            emailType: "welcome-day-0",
            tagKey: "sequence_welcome_day_0",
            segmentId: MARKETING_SEGMENTS.welcomeDay0,
            campaignKey: "welcome-day-0",
            subject: emailContent.subject,
            html: emailContent.html,
            text: emailContent.text,
            campaignId: day0CampaignId,
            recipients: contacts,
          })

          results.day0.sent = day0Users.length
        } catch (error) {
          console.error("[Welcome Sequence] Failed to send Day 0 broadcast:", error)
          results.day0.failed = day0Users.length
        }
      }

      // Send Day 3 emails
      if (day3Users.length > 0) {
        try {
          if (!MARKETING_SEGMENTS.welcomeDay3) {
            throw new Error("RESEND_SEGMENT_WELCOME_DAY_3 not configured")
          }

          const contacts = day3Users.map((user: any) => ({
            email: user.email,
            firstName: user.first_name,
          }))
          const day3Emails = day3Users.map((user: any) => user.email)

          const emailContent = generateWelcomeDay3({
            firstName: FIRST_NAME_PLACEHOLDER,
            campaignId: day3CampaignId,
          })

          await enqueueAndProcessMarketingRun({
            sequenceKey: "welcome-day-3",
            emailType: "welcome-day-3",
            tagKey: "sequence_welcome_day_3",
            segmentId: MARKETING_SEGMENTS.welcomeDay3,
            campaignKey: "welcome-day-3",
            subject: emailContent.subject,
            html: emailContent.html,
            text: emailContent.text,
            campaignId: day3CampaignId,
            recipients: contacts,
          })

          results.day3.sent = day3Users.length
        } catch (error) {
          console.error("[Welcome Sequence] Failed to send Day 3 broadcast:", error)
          results.day3.failed = day3Users.length
        }
      }

      // Send Day 7 emails
      if (day7Users.length > 0) {
        try {
          if (!MARKETING_SEGMENTS.welcomeDay7) {
            throw new Error("RESEND_SEGMENT_WELCOME_DAY_7 not configured")
          }

          const contacts = day7Users.map((user: any) => ({
            email: user.email,
            firstName: user.first_name,
          }))

          const emailContent = generateWelcomeDay7({
            firstName: FIRST_NAME_PLACEHOLDER,
            campaignId: day7CampaignId,
          })

          await enqueueAndProcessMarketingRun({
            sequenceKey: "welcome-day-7",
            emailType: "welcome-day-7",
            tagKey: "sequence_welcome_day_7",
            segmentId: MARKETING_SEGMENTS.welcomeDay7,
            campaignKey: "welcome-day-7",
            subject: emailContent.subject,
            html: emailContent.html,
            text: emailContent.text,
            campaignId: day7CampaignId,
            recipients: contacts,
          })

          results.day7.sent = day7Users.length
        } catch (error) {
          console.error("[Welcome Sequence] Failed to send Day 7 broadcast:", error)
          results.day7.failed = day7Users.length
        }
      }

      // Send Day 0 emails for FREE blueprint users (no active subscription, no paid blueprint)
      const hasIsPaidColumn = await sql`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'blueprint_subscribers'
          AND column_name = 'is_paid'
        LIMIT 1
      `

      const freeBlueprintSubscribers = hasIsPaidColumn.length > 0
        ? await sql`
            SELECT
              bs.id,
              bs.email,
              bs.name,
              bs.form_data,
              bs.created_at
            FROM blueprint_subscribers bs
            LEFT JOIN users u ON (u.id = bs.user_id OR LOWER(u.email) = LOWER(bs.email))
            LEFT JOIN subscriptions s ON s.user_id = u.id AND s.status = 'active'
            LEFT JOIN email_logs el
              ON el.user_email = bs.email
             AND el.email_type = 'blueprint-followup-day-0'
             AND (
               el.status IN ('sent', 'delivered')
               OR (el.status = 'queued' AND el.sent_at > NOW() - INTERVAL '2 hours')
             )
            WHERE (bs.is_paid = FALSE OR bs.is_paid IS NULL)
              AND (bs.paid_blueprint_purchased IS NULL OR bs.paid_blueprint_purchased = FALSE)
              AND (bs.welcome_email_sent = FALSE OR bs.welcome_email_sent IS NULL)
              AND bs.created_at <= NOW()
              AND bs.created_at > NOW() - INTERVAL '7 days'
              AND s.id IS NULL
              AND el.id IS NULL
            ORDER BY bs.created_at ASC
          `
        : await sql`
            SELECT
              bs.id,
              bs.email,
              bs.name,
              bs.form_data,
              bs.created_at
            FROM blueprint_subscribers bs
            LEFT JOIN users u ON (u.id = bs.user_id OR LOWER(u.email) = LOWER(bs.email))
            LEFT JOIN subscriptions s ON s.user_id = u.id AND s.status = 'active'
            LEFT JOIN email_logs el
              ON el.user_email = bs.email
             AND el.email_type = 'blueprint-followup-day-0'
             AND (
               el.status IN ('sent', 'delivered')
               OR (el.status = 'queued' AND el.sent_at > NOW() - INTERVAL '2 hours')
             )
            WHERE (bs.paid_blueprint_purchased IS NULL OR bs.paid_blueprint_purchased = FALSE)
              AND (bs.welcome_email_sent = FALSE OR bs.welcome_email_sent IS NULL)
              AND bs.created_at <= NOW()
              AND bs.created_at > NOW() - INTERVAL '7 days'
              AND s.id IS NULL
              AND el.id IS NULL
            ORDER BY bs.created_at ASC
          `

      results.freeBlueprintDay0.found = freeBlueprintSubscribers.length

      for (const subscriber of freeBlueprintSubscribers) {
        try {
          const firstName = subscriber.name?.split(" ")[0] || undefined
          const emailContent = generateBlueprintFollowupDay0Email({
            firstName,
            email: subscriber.email,
            formData: subscriber.form_data || undefined,
          })

          const sendResult = await sendEmail({
            to: subscriber.email,
            subject: FREE_BLUEPRINT_WELCOME_SUBJECT,
            html: emailContent.html,
            text: emailContent.text,
            from: "Sandra from SSELFIE <hello@sselfie.ai>",
            emailType: "blueprint-followup-day-0",
          })

          if (sendResult.success) {
            await sql`
              UPDATE blueprint_subscribers
              SET
                welcome_email_sent = TRUE,
                welcome_email_sent_at = NOW(),
                updated_at = NOW()
              WHERE id = ${subscriber.id}
            `
            results.freeBlueprintDay0.sent++
          } else {
            results.freeBlueprintDay0.failed++
          }
        } catch (error) {
          console.error(`Failed to send free blueprint Day 0 to ${subscriber.email}:`, error)
          results.freeBlueprintDay0.failed++
        }
      }

      console.log("[Welcome Sequence] Results:", results)

      const totalSent = results.day0.sent + results.day3.sent + results.day7.sent + results.freeBlueprintDay0.sent
      const totalFailed = results.day0.failed + results.day3.failed + results.day7.failed + results.freeBlueprintDay0.failed

      await cronLogger.success({
        day0Sent: results.day0.sent,
        day0Failed: results.day0.failed,
        day3Sent: results.day3.sent,
        day3Failed: results.day3.failed,
        day7Sent: results.day7.sent,
        day7Failed: results.day7.failed,
        freeBlueprintDay0Sent: results.freeBlueprintDay0.sent,
        freeBlueprintDay0Failed: results.freeBlueprintDay0.failed,
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
      console.error("[Welcome Sequence] Error in email sending:", error)
      await cronLogger.error(error, {})
      await logAdminError({
        toolName: "cron:welcome-sequence:email-sending",
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
