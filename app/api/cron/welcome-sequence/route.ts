import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { sendEmail } from "@/lib/email/send-email"
import { createCronLogger } from "@/lib/cron-logger"
import { logAdminError } from "@/lib/admin-error-log"
import {
  generateWelcomeDay0,
  generateWelcomeDay3,
  generateWelcomeDay7,
  generateWelcomeDay14,
  generateWelcomeDay21,
  generateWelcomeDay28,
} from "@/lib/email/templates/welcome-sequence"
import { generateWelcomeFirstGenerationFollowupEmail } from "@/lib/email/templates/welcome-first-generation-followup"
import { generateMayaAcademyInactive48hEmail } from "@/lib/email/templates/maya-academy-inactive-48h"
import { generateBlueprintFollowupDay0Email } from "@/lib/email/templates/blueprint-followup-day-0"
import { enqueueAndProcessMarketingRun } from "@/lib/email/marketing-runner"
import { MARKETING_SEGMENTS } from "@/lib/email/config"

const FREE_BLUEPRINT_WELCOME_SUBJECT = "Your Brand Blueprint is Here!"
const FIRST_NAME_PLACEHOLDER = "{{{FIRST_NAME|friend}}}"
const EMAIL_PLACEHOLDER = "{{{EMAIL}}}"

const sql = neon(process.env.DATABASE_URL!)

/**
 * Welcome Sequence Cron Job
 * Sends emails to new paid members on Day 0, Day 3, Day 7, Day 14, Day 21, and Day 28
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
      day14: { sent: 0, failed: 0 },
      day21: { sent: 0, failed: 0 },
      day28: { sent: 0, failed: 0 },
      welcomeFirstGenerationFollowup: { found: 0, sent: 0, failed: 0 },
      mayaAcademyInactive48h: { found: 0, sent: 0, failed: 0 },
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

      const day14Users = await sql`
        SELECT DISTINCT u.email, u.display_name as first_name, u.id, u.created_at
        FROM users u
        INNER JOIN subscriptions s ON u.id = s.user_id::varchar
        LEFT JOIN email_logs el
          ON el.user_email = u.email
         AND el.email_type = 'welcome-day-14'
         AND (
           el.status IN ('sent', 'delivered')
           OR (el.status = 'queued' AND el.sent_at > NOW() - INTERVAL '2 hours')
         )
        WHERE u.created_at <= NOW() - INTERVAL '14 days'
        AND u.created_at > NOW() - INTERVAL '28 days'
        AND s.status = 'active'
        AND s.product_type IN ('sselfie_studio_membership', 'brand_studio_membership')
        AND s.is_test_mode = false
        AND el.id IS NULL
      `

      const day21Users = await sql`
        SELECT DISTINCT u.email, u.display_name as first_name, u.id, u.created_at
        FROM users u
        INNER JOIN subscriptions s ON u.id = s.user_id::varchar
        LEFT JOIN email_logs el
          ON el.user_email = u.email
         AND el.email_type = 'welcome-day-21'
         AND (
           el.status IN ('sent', 'delivered')
           OR (el.status = 'queued' AND el.sent_at > NOW() - INTERVAL '2 hours')
         )
        WHERE u.created_at <= NOW() - INTERVAL '21 days'
        AND u.created_at > NOW() - INTERVAL '35 days'
        AND s.status = 'active'
        AND s.product_type IN ('sselfie_studio_membership', 'brand_studio_membership')
        AND s.is_test_mode = false
        AND el.id IS NULL
      `

      const day28Users = await sql`
        SELECT DISTINCT u.email, u.display_name as first_name, u.id, u.created_at
        FROM users u
        INNER JOIN subscriptions s ON u.id = s.user_id::varchar
        LEFT JOIN email_logs el
          ON el.user_email = u.email
         AND el.email_type = 'welcome-day-28'
         AND (
           el.status IN ('sent', 'delivered')
           OR (el.status = 'queued' AND el.sent_at > NOW() - INTERVAL '2 hours')
         )
        WHERE u.created_at <= NOW() - INTERVAL '28 days'
        AND u.created_at > NOW() - INTERVAL '42 days'
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
      const day14CampaignId = await getCampaignId("welcome-day-14")
      const day21CampaignId = await getCampaignId("welcome-day-21")
      const day28CampaignId = await getCampaignId("welcome-day-28")

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

      // Send Day 14 emails
      if (day14Users.length > 0) {
        try {
          const segmentId = MARKETING_SEGMENTS.welcomeDay14 || MARKETING_SEGMENTS.welcomeDay7
          if (!segmentId) {
            throw new Error("RESEND_SEGMENT_WELCOME_DAY_14 (or fallback WELCOME_DAY_7) not configured")
          }

          const contacts = day14Users.map((user: any) => ({
            email: user.email,
            firstName: user.first_name,
          }))

          const emailContent = generateWelcomeDay14({
            firstName: FIRST_NAME_PLACEHOLDER,
            campaignId: day14CampaignId,
          })

          await enqueueAndProcessMarketingRun({
            sequenceKey: "welcome-day-14",
            emailType: "welcome-day-14",
            tagKey: "sequence_welcome_day_14",
            segmentId,
            campaignKey: "welcome-day-14",
            subject: emailContent.subject,
            html: emailContent.html,
            text: emailContent.text,
            campaignId: day14CampaignId,
            recipients: contacts,
          })

          results.day14.sent = day14Users.length
        } catch (error) {
          console.error("[Welcome Sequence] Failed to send Day 14 broadcast:", error)
          results.day14.failed = day14Users.length
        }
      }

      // Send Day 21 emails
      if (day21Users.length > 0) {
        try {
          const segmentId = MARKETING_SEGMENTS.welcomeDay21 || MARKETING_SEGMENTS.welcomeDay7
          if (!segmentId) {
            throw new Error("RESEND_SEGMENT_WELCOME_DAY_21 (or fallback WELCOME_DAY_7) not configured")
          }

          const contacts = day21Users.map((user: any) => ({
            email: user.email,
            firstName: user.first_name,
          }))

          const emailContent = generateWelcomeDay21({
            firstName: FIRST_NAME_PLACEHOLDER,
            campaignId: day21CampaignId,
          })

          await enqueueAndProcessMarketingRun({
            sequenceKey: "welcome-day-21",
            emailType: "welcome-day-21",
            tagKey: "sequence_welcome_day_21",
            segmentId,
            campaignKey: "welcome-day-21",
            subject: emailContent.subject,
            html: emailContent.html,
            text: emailContent.text,
            campaignId: day21CampaignId,
            recipients: contacts,
          })

          results.day21.sent = day21Users.length
        } catch (error) {
          console.error("[Welcome Sequence] Failed to send Day 21 broadcast:", error)
          results.day21.failed = day21Users.length
        }
      }

      // Send Day 28 emails
      if (day28Users.length > 0) {
        try {
          const segmentId = MARKETING_SEGMENTS.welcomeDay28 || MARKETING_SEGMENTS.welcomeDay7
          if (!segmentId) {
            throw new Error("RESEND_SEGMENT_WELCOME_DAY_28 (or fallback WELCOME_DAY_7) not configured")
          }

          const contacts = day28Users.map((user: any) => ({
            email: user.email,
            firstName: user.first_name,
          }))

          const emailContent = generateWelcomeDay28({
            firstName: FIRST_NAME_PLACEHOLDER,
            campaignId: day28CampaignId,
          })

          await enqueueAndProcessMarketingRun({
            sequenceKey: "welcome-day-28",
            emailType: "welcome-day-28",
            tagKey: "sequence_welcome_day_28",
            segmentId,
            campaignKey: "welcome-day-28",
            subject: emailContent.subject,
            html: emailContent.html,
            text: emailContent.text,
            campaignId: day28CampaignId,
            recipients: contacts,
          })

          results.day28.sent = day28Users.length
        } catch (error) {
          console.error("[Welcome Sequence] Failed to send Day 28 broadcast:", error)
          results.day28.failed = day28Users.length
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

      const welcomeFirstGenerationFollowupCandidates = await sql`
        SELECT
          u.id,
          u.email,
          u.display_name,
          ai.image_url,
          ai.created_at AS first_generated_at
        FROM users u
        INNER JOIN LATERAL (
          SELECT image_url, created_at
          FROM ai_images
          WHERE user_id = u.id
            AND image_url IS NOT NULL
            AND image_url <> ''
            AND generation_status = 'completed'
          ORDER BY created_at ASC
          LIMIT 1
        ) ai ON true
        LEFT JOIN subscriptions s
          ON s.user_id = u.id
         AND s.status = 'active'
         AND s.product_type IN ('sselfie_studio_membership', 'brand_studio_membership')
        LEFT JOIN email_logs el
          ON el.user_email = u.email
         AND el.email_type = 'welcome-first-generation-followup'
         AND el.status IN ('sent', 'delivered', 'queued')
        WHERE ai.created_at <= NOW() - INTERVAL '24 hours'
          AND ai.created_at > NOW() - INTERVAL '48 hours'
          AND s.id IS NULL
          AND el.id IS NULL
      `

      results.welcomeFirstGenerationFollowup.found = welcomeFirstGenerationFollowupCandidates.length

      for (const candidate of welcomeFirstGenerationFollowupCandidates) {
        try {
          const firstName = candidate.display_name?.split(" ")[0] || undefined
          const emailContent = generateWelcomeFirstGenerationFollowupEmail({
            firstName,
            generatedImageUrl: candidate.image_url || null,
          })

          const sendResult = await sendEmail({
            to: candidate.email,
            subject: emailContent.subject,
            html: emailContent.html,
            text: emailContent.text,
            from: "Sandra from SSELFIE <hello@sselfie.ai>",
            emailType: "welcome-first-generation-followup",
          })

          if (sendResult.success) {
            results.welcomeFirstGenerationFollowup.sent++
          } else {
            results.welcomeFirstGenerationFollowup.failed++
          }
        } catch (error) {
          console.error(
            `[Welcome Sequence] Failed to send welcome-first-generation-followup to ${candidate.email}:`,
            error,
          )
          results.welcomeFirstGenerationFollowup.failed++
        }
      }

      const mayaAcademyInactiveCandidates = await sql`
        SELECT
          u.id,
          u.email,
          u.display_name,
          MAX(ai.created_at) AS last_generated_at
        FROM users u
        INNER JOIN ai_images ai
          ON ai.user_id = u.id
         AND ai.generation_status = 'completed'
         AND ai.image_url IS NOT NULL
         AND ai.image_url <> ''
        LEFT JOIN feed_posts fp
          ON fp.user_id = u.id
        LEFT JOIN email_logs el
          ON el.user_email = u.email
         AND el.email_type = 'maya-academy-inactive-48h'
         AND el.status IN ('sent', 'delivered', 'queued')
        GROUP BY u.id, u.email, u.display_name, el.id
        HAVING MAX(ai.created_at) <= NOW() - INTERVAL '48 hours'
           AND MAX(ai.created_at) > NOW() - INTERVAL '96 hours'
           AND COUNT(fp.id) = 0
           AND el.id IS NULL
      `

      results.mayaAcademyInactive48h.found = mayaAcademyInactiveCandidates.length

      for (const candidate of mayaAcademyInactiveCandidates) {
        try {
          const firstName = candidate.display_name?.split(" ")[0] || undefined
          const emailContent = generateMayaAcademyInactive48hEmail({
            firstName,
          })

          const sendResult = await sendEmail({
            to: candidate.email,
            subject: emailContent.subject,
            html: emailContent.html,
            text: emailContent.text,
            from: "Sandra from SSELFIE <hello@sselfie.ai>",
            emailType: "maya-academy-inactive-48h",
          })

          if (sendResult.success) {
            results.mayaAcademyInactive48h.sent++
          } else {
            results.mayaAcademyInactive48h.failed++
          }
        } catch (error) {
          console.error(
            `[Welcome Sequence] Failed to send maya-academy-inactive-48h to ${candidate.email}:`,
            error,
          )
          results.mayaAcademyInactive48h.failed++
        }
      }

      console.log("[Welcome Sequence] Results:", results)

      const totalSent =
        results.day0.sent +
        results.day3.sent +
        results.day7.sent +
        results.day14.sent +
        results.day21.sent +
        results.day28.sent +
        results.welcomeFirstGenerationFollowup.sent +
        results.mayaAcademyInactive48h.sent +
        results.freeBlueprintDay0.sent
      const totalFailed =
        results.day0.failed +
        results.day3.failed +
        results.day7.failed +
        results.day14.failed +
        results.day21.failed +
        results.day28.failed +
        results.welcomeFirstGenerationFollowup.failed +
        results.mayaAcademyInactive48h.failed +
        results.freeBlueprintDay0.failed

      await cronLogger.success({
        day0Sent: results.day0.sent,
        day0Failed: results.day0.failed,
        day3Sent: results.day3.sent,
        day3Failed: results.day3.failed,
        day7Sent: results.day7.sent,
        day7Failed: results.day7.failed,
        day14Sent: results.day14.sent,
        day14Failed: results.day14.failed,
        day21Sent: results.day21.sent,
        day21Failed: results.day21.failed,
        day28Sent: results.day28.sent,
        day28Failed: results.day28.failed,
        welcomeFirstGenerationFollowupSent: results.welcomeFirstGenerationFollowup.sent,
        welcomeFirstGenerationFollowupFailed: results.welcomeFirstGenerationFollowup.failed,
        mayaAcademyInactive48hSent: results.mayaAcademyInactive48h.sent,
        mayaAcademyInactive48hFailed: results.mayaAcademyInactive48h.failed,
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
