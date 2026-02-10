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
import { enqueueAndProcessMarketingRun } from "@/lib/email/marketing-runner"
import { MARKETING_SEGMENTS } from "@/lib/email/config"

const sql = neon(process.env.DATABASE_URL!)

const FIRST_NAME_PLACEHOLDER = "{{{FIRST_NAME|friend}}}"
const EMAIL_PLACEHOLDER = "{{{EMAIL}}}"

/**
 * Blueprint Followup Sequence - Resend Broadcasts (Marketing)
 * 
 * Sends blueprint followup emails using Resend Broadcast API.
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

    // Verify paid blueprint email columns exist before processing
    // This prevents SQL errors if migration hasn't been run
    try {
      const schemaCheck = await sql`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'blueprint_subscribers'
          AND column_name IN ('day_1_paid_email_sent', 'day_3_paid_email_sent', 'day_7_paid_email_sent')
      `
      
      if (schemaCheck.length < 3) {
        const missingColumns = ['day_1_paid_email_sent', 'day_3_paid_email_sent', 'day_7_paid_email_sent']
          .filter(col => !schemaCheck.some((c: any) => c.column_name === col))
        
        const errorMessage = `Paid blueprint email columns missing. Migration not applied. Missing: ${missingColumns.join(', ')}`
        console.error(`[v0] [CRON] ❌ ${errorMessage}`)
        
        await logAdminError({
          toolName: "cron:send-blueprint-followups:schema-check",
          error: new Error(errorMessage),
          context: { missingColumns },
        }).catch(() => {})
        
        await cronLogger.error(new Error(errorMessage), { 
          reason: "Missing database columns",
          missingColumns 
        })
        
        // Return success but indicate skipped
        return NextResponse.json({
          success: true,
          message: "Skipped paid blueprint emails due to missing schema. Migration required.",
          skipped: true,
          missingColumns,
        })
      }
    } catch (schemaError: any) {
      // If schema check itself fails, log and skip paid emails
      const errorMessage = `Failed to verify paid blueprint email columns: ${schemaError.message}`
      console.error(`[v0] [CRON] ❌ ${errorMessage}`)
      
      await logAdminError({
        toolName: "cron:send-blueprint-followups:schema-check",
        error: schemaError instanceof Error ? schemaError : new Error(errorMessage),
        context: { originalError: schemaError.message },
      }).catch(() => {})
      
      await cronLogger.error(new Error(errorMessage), { 
        reason: "Schema verification failed",
        originalError: schemaError.message 
      })
      
      // Return success but indicate skipped
      return NextResponse.json({
        success: true,
        message: "Skipped paid blueprint emails due to schema verification failure.",
        skipped: true,
        error: schemaError.message,
      })
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
      LEFT JOIN email_logs el ON el.user_email = bs.email
        AND el.email_type = 'blueprint-followup-day-3'
        AND (
          el.status IN ('sent', 'delivered')
          OR (el.status = 'queued' AND el.sent_at > NOW() - INTERVAL '2 hours')
        )
      WHERE bs.day_3_email_sent = FALSE
        AND bs.created_at <= NOW() - INTERVAL '3 days'
        AND bs.welcome_email_sent = TRUE
        AND el.id IS NULL
      ORDER BY bs.created_at ASC
    `

    results.day3.found = day3Subscribers.length
    console.log(`[v0] [CRON] Found ${day3Subscribers.length} subscribers for Day 3 email`)

    if (day3Subscribers.length > 0) {
      try {
        if (!MARKETING_SEGMENTS.blueprintDay3) {
          throw new Error("RESEND_SEGMENT_BLUEPRINT_DAY_3 not configured")
        }

        const contacts = day3Subscribers.map((subscriber: any) => ({
          email: subscriber.email,
          firstName: subscriber.name?.split(" ")[0],
        }))
        const day3Ids = day3Subscribers.map((subscriber: any) => subscriber.id)

        const emailContent = generateBlueprintFollowupDay3Email({
          firstName: FIRST_NAME_PLACEHOLDER,
          email: EMAIL_PLACEHOLDER,
        })

        await enqueueAndProcessMarketingRun({
          sequenceKey: "blueprint-followup-day-3",
          emailType: "blueprint-followup-day-3",
          tagKey: "sequence_blueprint_day_3",
          segmentId: MARKETING_SEGMENTS.blueprintDay3,
          campaignKey: "blueprint-followup-day-3",
          subject: "3 Ways to Use Your Blueprint This Week",
          html: emailContent.html,
          text: emailContent.text,
          recipients: contacts,
        })

        await sql`
          UPDATE blueprint_subscribers
          SET 
            day_3_email_sent = TRUE,
            day_3_email_sent_at = NOW(),
            updated_at = NOW()
          WHERE id = ANY(${day3Ids})
        `

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
          toolName: "cron:send-blueprint-followups:day-3",
          error: error instanceof Error ? error : new Error(error.message || "Unknown error"),
          context: { recipients: day3Subscribers.length },
        }).catch(() => {})
      }
    }

    // Day 7 emails: 7 days after created_at, not yet sent, check email_logs for duplicates
    const day7Subscribers = await sql`
      SELECT bs.id, bs.email, bs.name, bs.form_data, bs.created_at
      FROM blueprint_subscribers bs
      LEFT JOIN email_logs el ON el.user_email = bs.email
        AND el.email_type = 'blueprint-followup-day-7'
        AND (
          el.status IN ('sent', 'delivered')
          OR (el.status = 'queued' AND el.sent_at > NOW() - INTERVAL '2 hours')
        )
      WHERE bs.day_7_email_sent = FALSE
        AND bs.created_at <= NOW() - INTERVAL '7 days'
        AND bs.welcome_email_sent = TRUE
        AND el.id IS NULL
      ORDER BY bs.created_at ASC
    `

    results.day7.found = day7Subscribers.length
    console.log(`[v0] [CRON] Found ${day7Subscribers.length} subscribers for Day 7 email`)

    if (day7Subscribers.length > 0) {
      try {
        if (!MARKETING_SEGMENTS.blueprintDay7) {
          throw new Error("RESEND_SEGMENT_BLUEPRINT_DAY_7 not configured")
        }

        const contacts = day7Subscribers.map((subscriber: any) => ({
          email: subscriber.email,
          firstName: subscriber.name?.split(" ")[0],
        }))
        const day7Ids = day7Subscribers.map((subscriber: any) => subscriber.id)

        const emailContent = generateBlueprintFollowupDay7Email({
          firstName: FIRST_NAME_PLACEHOLDER,
          email: EMAIL_PLACEHOLDER,
        })

        await enqueueAndProcessMarketingRun({
          sequenceKey: "blueprint-followup-day-7",
          emailType: "blueprint-followup-day-7",
          tagKey: "sequence_blueprint_day_7",
          segmentId: MARKETING_SEGMENTS.blueprintDay7,
          campaignKey: "blueprint-followup-day-7",
          subject: "This Could Be You",
          html: emailContent.html,
          text: emailContent.text,
          recipients: contacts,
        })

        await sql`
          UPDATE blueprint_subscribers
          SET 
            day_7_email_sent = TRUE,
            day_7_email_sent_at = NOW(),
            updated_at = NOW()
          WHERE id = ANY(${day7Ids})
        `

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
          toolName: "cron:send-blueprint-followups:day-7",
          error: error instanceof Error ? error : new Error(error.message || "Unknown error"),
          context: { recipients: day7Subscribers.length },
        }).catch(() => {})
      }
    }

    // Day 14 emails: 14 days after created_at, not yet sent, check email_logs for duplicates
    const day14Subscribers = await sql`
      SELECT bs.id, bs.email, bs.name, bs.form_data, bs.created_at
      FROM blueprint_subscribers bs
      LEFT JOIN email_logs el ON el.user_email = bs.email
        AND el.email_type = 'blueprint-followup-day-14'
        AND (
          el.status IN ('sent', 'delivered')
          OR (el.status = 'queued' AND el.sent_at > NOW() - INTERVAL '2 hours')
        )
      WHERE bs.day_14_email_sent = FALSE
        AND bs.created_at <= NOW() - INTERVAL '14 days'
        AND bs.welcome_email_sent = TRUE
        AND el.id IS NULL
      ORDER BY bs.created_at ASC
    `

    results.day14.found = day14Subscribers.length
    console.log(`[v0] [CRON] Found ${day14Subscribers.length} subscribers for Day 14 email`)

    if (day14Subscribers.length > 0) {
      try {
        if (!MARKETING_SEGMENTS.blueprintDay14) {
          throw new Error("RESEND_SEGMENT_BLUEPRINT_DAY_14 not configured")
        }

        const contacts = day14Subscribers.map((subscriber: any) => ({
          email: subscriber.email,
          firstName: subscriber.name?.split(" ")[0],
        }))
        const day14Ids = day14Subscribers.map((subscriber: any) => subscriber.id)

        const emailContent = generateBlueprintFollowupDay14Email({
          firstName: FIRST_NAME_PLACEHOLDER,
          email: EMAIL_PLACEHOLDER,
        })

        await enqueueAndProcessMarketingRun({
          sequenceKey: "blueprint-followup-day-14",
          emailType: "blueprint-followup-day-14",
          tagKey: "sequence_blueprint_day_14",
          segmentId: MARKETING_SEGMENTS.blueprintDay14,
          campaignKey: "blueprint-followup-day-14",
          subject: "Still thinking about it? Here's $10 off 💕",
          html: emailContent.html,
          text: emailContent.text,
          recipients: contacts,
        })

        await sql`
          UPDATE blueprint_subscribers
          SET 
            day_14_email_sent = TRUE,
            day_14_email_sent_at = NOW(),
            updated_at = NOW()
          WHERE id = ANY(${day14Ids})
        `

        results.day14.sent = day14Subscribers.length
      } catch (error: any) {
        results.day14.failed = day14Subscribers.length
        results.errors.push({
          email: "broadcast",
          day: 14,
          error: error.message || "Unknown error",
        })
        console.error("[v0] [CRON] ❌ Failed to send Day 14 broadcast:", error)
        await logAdminError({
          toolName: "cron:send-blueprint-followups:day-14",
          error: error instanceof Error ? error : new Error(error.message || "Unknown error"),
          context: { recipients: day14Subscribers.length },
        }).catch(() => {})
      }
    }

    // Day 1 paid emails: 24h after paid_blueprint_purchased_at, not yet sent, exclude active Studio members
    const day1PaidSubscribers = await sql`
      SELECT 
        bs.id, 
        bs.email, 
        bs.name, 
        bs.access_token,
        bs.paid_blueprint_purchased_at
      FROM blueprint_subscribers bs
      LEFT JOIN email_logs el ON el.user_email = bs.email
        AND el.email_type = 'paid-blueprint-day-1'
        AND (
          el.status IN ('sent', 'delivered')
          OR (el.status = 'queued' AND el.sent_at > NOW() - INTERVAL '2 hours')
        )
      LEFT JOIN users u ON u.email = bs.email
      LEFT JOIN subscriptions s ON s.user_id = u.id 
        AND s.product_type = 'sselfie_studio_membership' 
        AND s.status = 'active'
      WHERE bs.paid_blueprint_purchased = TRUE
        AND bs.day_1_paid_email_sent = FALSE
        AND bs.paid_blueprint_purchased_at <= NOW() - INTERVAL '1 day'
        AND el.id IS NULL
        AND s.id IS NULL
      ORDER BY bs.paid_blueprint_purchased_at ASC
    `

    results.paidDay1.found = day1PaidSubscribers.length
    console.log(`[v0] [CRON] Found ${day1PaidSubscribers.length} paid blueprint subscribers for Day 1 email`)

    for (const subscriber of day1PaidSubscribers) {
      try {
        // Check if already sent (dedupe check)
        const existingLog = await sql`
          SELECT id FROM email_logs
          WHERE user_email = ${subscriber.email}
          AND email_type = 'paid-blueprint-day-1'
          AND (
            status IN ('sent', 'delivered')
            OR (status = 'queued' AND sent_at > NOW() - INTERVAL '2 hours')
          )
          LIMIT 1
        `
        if (existingLog.length > 0) {
          results.paidDay1.skipped++
          continue
        }

        if (!subscriber.access_token) {
          console.log(`[v0] [CRON] ⚠️ Subscriber ${subscriber.email} missing access_token, skipping`)
          results.paidDay1.skipped++
          continue
        }

        const firstName = subscriber.name?.split(" ")[0] || undefined
        const emailContent = generatePaidBlueprintDay1Email({
          firstName,
          email: subscriber.email,
          accessToken: subscriber.access_token,
        })

        const sendResult = await sendEmail({
          to: subscriber.email,
          subject: PAID_BLUEPRINT_DAY1_SUBJECT,
          html: emailContent.html,
          text: emailContent.text,
          from: "Sandra from SSELFIE <hello@sselfie.ai>",
          emailType: "paid-blueprint-day-1",
        })

        if (sendResult.success) {
          // Mark as sent
          await sql`
            UPDATE blueprint_subscribers
            SET 
              day_1_paid_email_sent = TRUE,
              day_1_paid_email_sent_at = NOW(),
              updated_at = NOW()
            WHERE id = ${subscriber.id}
          `
          results.paidDay1.sent++
          console.log(`[v0] [CRON] ✅ Sent Paid Blueprint Day 1 email to ${subscriber.email}`)
        } else {
          throw new Error(sendResult.error || 'Failed to send email')
        }
      } catch (error: any) {
        results.paidDay1.failed++
        results.errors.push({
          email: subscriber.email,
          day: 1,
          error: error.message || "Unknown error",
        })
        console.error(`[v0] [CRON] ❌ Failed to send Paid Blueprint Day 1 email to ${subscriber.email}:`, error)
        await logAdminError({
          toolName: "cron:send-blueprint-followups:paid-day-1",
          error: error instanceof Error ? error : new Error(error.message || "Unknown error"),
          context: { subscriberEmail: subscriber.email, subscriberId: subscriber.id },
        }).catch(() => {})
      }
    }

    // Day 3 paid emails: 72h after paid_blueprint_purchased_at, not yet sent, exclude active Studio members
    const day3PaidSubscribers = await sql`
      SELECT 
        bs.id, 
        bs.email, 
        bs.name, 
        bs.access_token,
        bs.paid_blueprint_purchased_at
      FROM blueprint_subscribers bs
      LEFT JOIN email_logs el ON el.user_email = bs.email
        AND el.email_type = 'paid-blueprint-day-3'
        AND (
          el.status IN ('sent', 'delivered')
          OR (el.status = 'queued' AND el.sent_at > NOW() - INTERVAL '2 hours')
        )
      LEFT JOIN users u ON u.email = bs.email
      LEFT JOIN subscriptions s ON s.user_id = u.id 
        AND s.product_type = 'sselfie_studio_membership' 
        AND s.status = 'active'
      WHERE bs.paid_blueprint_purchased = TRUE
        AND bs.day_3_paid_email_sent = FALSE
        AND bs.paid_blueprint_purchased_at <= NOW() - INTERVAL '3 days'
        AND el.id IS NULL
        AND s.id IS NULL
      ORDER BY bs.paid_blueprint_purchased_at ASC
    `

    results.paidDay3.found = day3PaidSubscribers.length
    console.log(`[v0] [CRON] Found ${day3PaidSubscribers.length} paid blueprint subscribers for Day 3 email`)

    for (const subscriber of day3PaidSubscribers) {
      try {
        // Check if already sent (dedupe check)
        const existingLog = await sql`
          SELECT id FROM email_logs
          WHERE user_email = ${subscriber.email}
          AND email_type = 'paid-blueprint-day-3'
          AND (
            status IN ('sent', 'delivered')
            OR (status = 'queued' AND sent_at > NOW() - INTERVAL '2 hours')
          )
          LIMIT 1
        `
        if (existingLog.length > 0) {
          results.paidDay3.skipped++
          continue
        }

        if (!subscriber.access_token) {
          console.log(`[v0] [CRON] ⚠️ Subscriber ${subscriber.email} missing access_token, skipping`)
          results.paidDay3.skipped++
          continue
        }

        const firstName = subscriber.name?.split(" ")[0] || undefined
        const emailContent = generatePaidBlueprintDay3Email({
          firstName,
          email: subscriber.email,
          accessToken: subscriber.access_token,
        })

        const sendResult = await sendEmail({
          to: subscriber.email,
          subject: PAID_BLUEPRINT_DAY3_SUBJECT,
          html: emailContent.html,
          text: emailContent.text,
          from: "Sandra from SSELFIE <hello@sselfie.ai>",
          emailType: "paid-blueprint-day-3",
        })

        if (sendResult.success) {
          // Mark as sent
          await sql`
            UPDATE blueprint_subscribers
            SET 
              day_3_paid_email_sent = TRUE,
              day_3_paid_email_sent_at = NOW(),
              updated_at = NOW()
            WHERE id = ${subscriber.id}
          `
          results.paidDay3.sent++
          console.log(`[v0] [CRON] ✅ Sent Paid Blueprint Day 3 email to ${subscriber.email}`)
        } else {
          throw new Error(sendResult.error || 'Failed to send email')
        }
      } catch (error: any) {
        results.paidDay3.failed++
        results.errors.push({
          email: subscriber.email,
          day: 3,
          error: error.message || "Unknown error",
        })
        console.error(`[v0] [CRON] ❌ Failed to send Paid Blueprint Day 3 email to ${subscriber.email}:`, error)
        await logAdminError({
          toolName: "cron:send-blueprint-followups:paid-day-3",
          error: error instanceof Error ? error : new Error(error.message || "Unknown error"),
          context: { subscriberEmail: subscriber.email, subscriberId: subscriber.id },
        }).catch(() => {})
      }
    }

    // Day 7 paid emails: 168h after paid_blueprint_purchased_at, not yet sent, exclude active Studio members
    const day7PaidSubscribers = await sql`
      SELECT 
        bs.id, 
        bs.email, 
        bs.name, 
        bs.access_token,
        bs.paid_blueprint_purchased_at
      FROM blueprint_subscribers bs
      LEFT JOIN email_logs el ON el.user_email = bs.email
        AND el.email_type = 'paid-blueprint-day-7'
        AND (
          el.status IN ('sent', 'delivered')
          OR (el.status = 'queued' AND el.sent_at > NOW() - INTERVAL '2 hours')
        )
      LEFT JOIN users u ON u.email = bs.email
      LEFT JOIN subscriptions s ON s.user_id = u.id 
        AND s.product_type = 'sselfie_studio_membership' 
        AND s.status = 'active'
      WHERE bs.paid_blueprint_purchased = TRUE
        AND bs.day_7_paid_email_sent = FALSE
        AND bs.paid_blueprint_purchased_at <= NOW() - INTERVAL '7 days'
        AND el.id IS NULL
        AND s.id IS NULL
      ORDER BY bs.paid_blueprint_purchased_at ASC
    `

    results.paidDay7.found = day7PaidSubscribers.length
    console.log(`[v0] [CRON] Found ${day7PaidSubscribers.length} paid blueprint subscribers for Day 7 email`)

    for (const subscriber of day7PaidSubscribers) {
      try {
        // Check if already sent (dedupe check)
        const existingLog = await sql`
          SELECT id FROM email_logs
          WHERE user_email = ${subscriber.email}
          AND email_type = 'paid-blueprint-day-7'
          AND (
            status IN ('sent', 'delivered')
            OR (status = 'queued' AND sent_at > NOW() - INTERVAL '2 hours')
          )
          LIMIT 1
        `
        if (existingLog.length > 0) {
          results.paidDay7.skipped++
          continue
        }

        if (!subscriber.access_token) {
          console.log(`[v0] [CRON] ⚠️ Subscriber ${subscriber.email} missing access_token, skipping`)
          results.paidDay7.skipped++
          continue
        }

        const firstName = subscriber.name?.split(" ")[0] || undefined
        const emailContent = generatePaidBlueprintDay7Email({
          firstName,
          email: subscriber.email,
          accessToken: subscriber.access_token,
        })

        const sendResult = await sendEmail({
          to: subscriber.email,
          subject: PAID_BLUEPRINT_DAY7_SUBJECT,
          html: emailContent.html,
          text: emailContent.text,
          from: "Sandra from SSELFIE <hello@sselfie.ai>",
          emailType: "paid-blueprint-day-7",
        })

        if (sendResult.success) {
          // Mark as sent
          await sql`
            UPDATE blueprint_subscribers
            SET 
              day_7_paid_email_sent = TRUE,
              day_7_paid_email_sent_at = NOW(),
              updated_at = NOW()
            WHERE id = ${subscriber.id}
          `
          results.paidDay7.sent++
          console.log(`[v0] [CRON] ✅ Sent Paid Blueprint Day 7 email to ${subscriber.email}`)
        } else {
          throw new Error(sendResult.error || 'Failed to send email')
        }
      } catch (error: any) {
        results.paidDay7.failed++
        results.errors.push({
          email: subscriber.email,
          day: 7,
          error: error.message || "Unknown error",
        })
        console.error(`[v0] [CRON] ❌ Failed to send Paid Blueprint Day 7 email to ${subscriber.email}:`, error)
        await logAdminError({
          toolName: "cron:send-blueprint-followups:paid-day-7",
          error: error instanceof Error ? error : new Error(error.message || "Unknown error"),
          context: { subscriberEmail: subscriber.email, subscriberId: subscriber.id },
        }).catch(() => {})
      }
    }

    const totalSent = results.day3.sent + results.day7.sent + results.day14.sent + results.paidDay1.sent + results.paidDay3.sent + results.paidDay7.sent
    const totalFailed = results.day3.failed + results.day7.failed + results.day14.failed + results.paidDay1.failed + results.paidDay3.failed + results.paidDay7.failed
    const totalSkipped = results.day3.skipped + results.day7.skipped + results.day14.skipped + results.paidDay1.skipped + results.paidDay3.skipped + results.paidDay7.skipped

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
      paidDay1Sent: results.paidDay1.sent,
      paidDay1Failed: results.paidDay1.failed,
      paidDay1Skipped: results.paidDay1.skipped,
      paidDay3Sent: results.paidDay3.sent,
      paidDay3Failed: results.paidDay3.failed,
      paidDay3Skipped: results.paidDay3.skipped,
      paidDay7Sent: results.paidDay7.sent,
      paidDay7Failed: results.paidDay7.failed,
      paidDay7Skipped: results.paidDay7.skipped,
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
        paidDay1: results.paidDay1,
        paidDay3: results.paidDay3,
        paidDay7: results.paidDay7,
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
