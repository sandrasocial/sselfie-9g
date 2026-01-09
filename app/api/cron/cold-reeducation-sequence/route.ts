// Cold Re-education Sequence Automation
import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { sendEmail } from "@/lib/email/send-email"
import { createCronLogger } from "@/lib/cron-logger"
import { getAllResendContacts } from "@/lib/audience/segment-sync"
import { generateColdEduDay1Email } from "@/lib/email/templates/cold-edu-day-1"
import { generateColdEduDay3Email } from "@/lib/email/templates/cold-edu-day-3"
import { generateColdEduDay7Email } from "@/lib/email/templates/cold-edu-day-7"
import { logAdminError } from "@/lib/admin-error-log"

const sql = neon(process.env.DATABASE_URL!)

/**
 * Cold Re-education Sequence - Resend Direct Sends
 * 
 * Sends re-introduction emails to cold_users tagged subscribers in Resend.
 * These are users from last year's selfie guide who are NOT app customers.
 * 
 * GET /api/cron/cold-reeducation-sequence
 * 
 * Protected by CRON_SECRET environment variable
 * Runs daily at 11 AM UTC
 * 
 * Email templates:
 * - Day 1: "I disappeared for a while — here's why."
 * - Day 3: "From selfies to Studio — this is how it works."
 * - Day 7: "You're invited — your 30% creator restart."
 * 
 * Logic:
 * - Fetches all contacts from Resend with 'cold_users' tag
 * - Excludes users with active subscriptions
 * - Excludes users who received re-engagement emails
 * - Sends Day 1/3/7 emails based on email_logs history
 */
export async function GET(request: Request) {
  const cronLogger = createCronLogger("cold-reeducation-sequence")
  await cronLogger.start()

  try {
    // Check if cold education is enabled
    const coldEducationEnabled = process.env.COLD_EDUCATION_ENABLED === "true"

    if (!coldEducationEnabled) {
      console.log("[v0] [CRON] ⚠️ Cold education sequence disabled (COLD_EDUCATION_ENABLED=false)")
      await cronLogger.success({
        message: "Disabled - COLD_EDUCATION_ENABLED=false",
        skipped: true,
      })
      return NextResponse.json({
        success: true,
        enabled: false,
        message: "Cold education sequence disabled",
        skipped: true,
      })
    }

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

    console.log("[v0] [CRON] Starting cold re-education email sequence...")

    // Fetch all contacts from Resend
    const allContacts = await getAllResendContacts()
    console.log(`[v0] [CRON] Fetched ${allContacts.length} total contacts from Resend`)

    // Filter for cold_users tag
    const coldContacts = allContacts.filter((contact) => {
      const tags = contact.tags || []
      return tags.some((tag) => {
        if (typeof tag === "object" && tag.name && tag.value) {
          return tag.name === "cold_users" && tag.value === "true"
        }
        return tag === "cold_users"
      })
    })

    console.log(`[v0] [CRON] Found ${coldContacts.length} contacts with cold_users tag`)

    // Get emails from cold contacts
    const coldEmails = coldContacts.map((c) => c.email).filter(Boolean)

    if (coldEmails.length === 0) {
      console.log("[v0] [CRON] No cold users found in Resend")
      await cronLogger.success({
        found: 0,
        sent: 0,
        skipped: 0,
      })
      return NextResponse.json({
        success: true,
        message: "No cold users found",
        summary: {
          found: 0,
          sent: 0,
          skipped: 0,
        },
      })
    }

    // Get user data from database for cold emails
    const dbUsers = await sql`
      SELECT DISTINCT
        u.email,
        u.display_name,
        u.id,
        u.last_login_at
      FROM users u
      WHERE u.email = ANY(${coldEmails})
        AND u.email IS NOT NULL
        AND u.email != ''
    `

    // Create email map for quick lookup
    const emailToUser = new Map(dbUsers.map((u: any) => [u.email, u]))

    // Exclude users with active subscriptions
    const activeSubscribers = await sql`
      SELECT DISTINCT u.email
      FROM users u
      INNER JOIN subscriptions s ON u.id = s.user_id::varchar
      WHERE u.email = ANY(${coldEmails})
        AND s.status = 'active'
        AND s.is_test_mode = false
    `
    const activeSubscriberEmails = new Set(activeSubscribers.map((s: any) => s.email))

    // Exclude users who received re-engagement emails in last 90 days
    const reengagementRecipients = await sql`
      SELECT DISTINCT user_email
      FROM email_logs
      WHERE user_email = ANY(${coldEmails})
        AND email_type IN ('reengagement-day-0', 'reengagement-day-7', 'reengagement-day-14')
        AND sent_at > NOW() - INTERVAL '90 days'
    `
    const reengagementEmails = new Set(reengagementRecipients.map((r: any) => r.user_email))

    // Filter eligible cold users
    const eligibleEmails = coldEmails.filter(
      (email) => !activeSubscriberEmails.has(email) && !reengagementEmails.has(email),
    )

    console.log(
      `[v0] [CRON] Eligible cold users: ${eligibleEmails.length} (excluded ${activeSubscriberEmails.size} active subscribers, ${reengagementEmails.size} re-engagement recipients)`,
    )

    const results = {
      day1: { found: 0, sent: 0, failed: 0, skipped: 0 },
      day3: { found: 0, sent: 0, failed: 0, skipped: 0 },
      day7: { found: 0, sent: 0, failed: 0, skipped: 0 },
      errors: [] as Array<{ email: string; day: number; error: string }>,
    }

    // Day 1: Find users who haven't received Day 1 email
    const day1Eligible = await sql`
      SELECT DISTINCT el.user_email
      FROM (SELECT unnest(${eligibleEmails}::text[]) as user_email) el
      LEFT JOIN email_logs el_day1 ON el_day1.user_email = el.user_email AND el_day1.email_type = 'cold-edu-day-1'
      WHERE el_day1.id IS NULL
      LIMIT 100
    `

    results.day1.found = day1Eligible.length
    console.log(`[v0] [CRON] Found ${day1Eligible.length} users for Day 1 email`)

    for (const row of day1Eligible) {
      const email = row.user_email
      try {
        // Double-check deduplication
        const existingLog = await sql`
          SELECT id FROM email_logs
          WHERE user_email = ${email}
          AND email_type = 'cold-edu-day-1'
          LIMIT 1
        `
        if (existingLog.length > 0) {
          results.day1.skipped++
          continue
        }

        const user = emailToUser.get(email)
        const firstName = user?.display_name?.split(" ")[0] || undefined
        const emailContent = generateColdEduDay1Email({
          firstName,
          recipientEmail: email,
        })

        const sendResult = await sendEmail({
          to: email,
          subject: emailContent.subject || "I disappeared for a while — here's why.",
          html: emailContent.html,
          text: emailContent.text,
          from: "Sandra from SSELFIE <hello@sselfie.ai>",
          emailType: "cold-edu-day-1",
        })

        if (sendResult.success) {
          results.day1.sent++
          console.log(`[v0] [CRON] ✅ Sent Day 1 email to ${email}`)
        } else {
          throw new Error(sendResult.error || "Failed to send email")
        }
      } catch (error: any) {
        results.day1.failed++
        results.errors.push({
          email,
          day: 1,
          error: error.message || "Unknown error",
        })
        console.error(`[v0] [CRON] ❌ Failed to send Day 1 email to ${email}:`, error)
        await logAdminError({
          toolName: "cron:cold-reeducation-sequence:day-1",
          error: error instanceof Error ? error : new Error(error.message || "Unknown error"),
          context: { email },
        }).catch(() => {})
      }
    }

    // Day 3: Find users who received Day 1 email 3 days ago
    const day3Eligible = await sql`
      SELECT DISTINCT el_day1.user_email, el_day1.sent_at as day1_sent_at
      FROM email_logs el_day1
      LEFT JOIN email_logs el_day3 ON el_day3.user_email = el_day1.user_email AND el_day3.email_type = 'cold-edu-day-3'
      WHERE el_day1.email_type = 'cold-edu-day-1'
        AND el_day1.user_email = ANY(${eligibleEmails})
        AND el_day1.sent_at <= NOW() - INTERVAL '3 days'
        AND el_day1.sent_at > NOW() - INTERVAL '4 days'
        AND el_day3.id IS NULL
      LIMIT 100
    `

    results.day3.found = day3Eligible.length
    console.log(`[v0] [CRON] Found ${day3Eligible.length} users for Day 3 email`)

    for (const row of day3Eligible) {
      const email = row.user_email
      try {
        const existingLog = await sql`
          SELECT id FROM email_logs
          WHERE user_email = ${email}
          AND email_type = 'cold-edu-day-3'
          LIMIT 1
        `
        if (existingLog.length > 0) {
          results.day3.skipped++
          continue
        }

        const user = emailToUser.get(email)
        const firstName = user?.display_name?.split(" ")[0] || undefined
        const emailContent = generateColdEduDay3Email({
          firstName,
          recipientEmail: email,
        })

        const sendResult = await sendEmail({
          to: email,
          subject: emailContent.subject || "From selfies to Studio — this is how it works.",
          html: emailContent.html,
          text: emailContent.text,
          from: "Sandra from SSELFIE <hello@sselfie.ai>",
          emailType: "cold-edu-day-3",
        })

        if (sendResult.success) {
          results.day3.sent++
          console.log(`[v0] [CRON] ✅ Sent Day 3 email to ${email}`)
        } else {
          throw new Error(sendResult.error || "Failed to send email")
        }
      } catch (error: any) {
        results.day3.failed++
        results.errors.push({
          email,
          day: 3,
          error: error.message || "Unknown error",
        })
        console.error(`[v0] [CRON] ❌ Failed to send Day 3 email to ${email}:`, error)
        await logAdminError({
          toolName: "cron:cold-reeducation-sequence:day-3",
          error: error instanceof Error ? error : new Error(error.message || "Unknown error"),
          context: { email },
        }).catch(() => {})
      }
    }

    // Day 7: Find users who received Day 1 email 7 days ago
    const day7Eligible = await sql`
      SELECT DISTINCT el_day1.user_email, el_day1.sent_at as day1_sent_at
      FROM email_logs el_day1
      LEFT JOIN email_logs el_day7 ON el_day7.user_email = el_day1.user_email AND el_day7.email_type = 'cold-edu-day-7'
      WHERE el_day1.email_type = 'cold-edu-day-1'
        AND el_day1.user_email = ANY(${eligibleEmails})
        AND el_day1.sent_at <= NOW() - INTERVAL '7 days'
        AND el_day1.sent_at > NOW() - INTERVAL '8 days'
        AND el_day7.id IS NULL
      LIMIT 100
    `

    results.day7.found = day7Eligible.length
    console.log(`[v0] [CRON] Found ${day7Eligible.length} users for Day 7 email`)

    for (const row of day7Eligible) {
      const email = row.user_email
      try {
        const existingLog = await sql`
          SELECT id FROM email_logs
          WHERE user_email = ${email}
          AND email_type = 'cold-edu-day-7'
          LIMIT 1
        `
        if (existingLog.length > 0) {
          results.day7.skipped++
          continue
        }

        const user = emailToUser.get(email)
        const firstName = user?.display_name?.split(" ")[0] || undefined
        const emailContent = generateColdEduDay7Email({
          firstName,
          recipientEmail: email,
        })

        const sendResult = await sendEmail({
          to: email,
          subject: emailContent.subject || "You're invited — your 30% creator restart.",
          html: emailContent.html,
          text: emailContent.text,
          from: "Sandra from SSELFIE <hello@sselfie.ai>",
          emailType: "cold-edu-day-7",
        })

        if (sendResult.success) {
          results.day7.sent++
          console.log(`[v0] [CRON] ✅ Sent Day 7 email to ${email}`)
        } else {
          throw new Error(sendResult.error || "Failed to send email")
        }
      } catch (error: any) {
        results.day7.failed++
        results.errors.push({
          email,
          day: 7,
          error: error.message || "Unknown error",
        })
        console.error(`[v0] [CRON] ❌ Failed to send Day 7 email to ${email}:`, error)
        await logAdminError({
          toolName: "cron:cold-reeducation-sequence:day-7",
          error: error instanceof Error ? error : new Error(error.message || "Unknown error"),
          context: { email },
        }).catch(() => {})
      }
    }

    const totalSent = results.day1.sent + results.day3.sent + results.day7.sent
    const totalFailed = results.day1.failed + results.day3.failed + results.day7.failed
    const totalSkipped = results.day1.skipped + results.day3.skipped + results.day7.skipped

    console.log(
      `[v0] [CRON] Cold re-education sequence completed: ${totalSent} sent, ${totalFailed} failed, ${totalSkipped} skipped`,
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
      totalSent,
      totalFailed,
      totalSkipped,
    })

    return NextResponse.json({
      success: true,
      message: `Cold re-education sequence sent: ${totalSent} successful, ${totalFailed} failed, ${totalSkipped} skipped`,
      summary: {
        day1: results.day1,
        day3: results.day3,
        day7: results.day7,
        totalSent,
        totalFailed,
        totalSkipped,
      },
      errors: results.errors.slice(0, 10), // Limit errors in response
      totalErrors: results.errors.length,
    })
  } catch (error: any) {
    console.error("[v0] [CRON] Error in cold re-education sequence cron:", error)
    await cronLogger.error(error, {})
    await logAdminError({
      toolName: "cron:cold-reeducation-sequence",
      error: error instanceof Error ? error : new Error(String(error)),
      context: {},
    }).catch(() => {})
    return NextResponse.json(
      {
        success: false,
        error: "Failed to run cold re-education sequence cron",
        details: error.message || "Unknown error",
      },
      { status: 500 },
    )
  }
}
