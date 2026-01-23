// Reactivation Campaigns Automation
import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { sendEmail } from "@/lib/email/send-email"
import { createCronLogger } from "@/lib/cron-logger"
import { getAllResendContacts } from "@/lib/audience/segment-sync"
import {
  generateReactivationDay0Email,
  generateReactivationDay2Email,
  generateReactivationDay5Email,
  generateReactivationDay7Email,
  generateReactivationDay10Email,
  generateReactivationDay14Email,
  generateReactivationDay20Email,
  generateReactivationDay25Email,
} from "@/lib/email/templates/reactivation-sequence"
import { logAdminError } from "@/lib/admin-error-log"
import { sendMarketingBroadcast, syncMarketingContacts } from "@/lib/email/marketing-sender"
import { MARKETING_SEGMENTS } from "@/lib/email/config"

const sql = neon(process.env.DATABASE_URL!)

const FIRST_NAME_PLACEHOLDER = "{{{FIRST_NAME|friend}}}"
const EMAIL_PLACEHOLDER = "{{{EMAIL}}}"

/**
 * Reactivation Campaigns - Resend Broadcasts (Marketing)
 * 
 * Sends reactivation emails to cold_users tagged subscribers in Resend.
 * These are users from last year's selfie guide who are NOT app customers.
 * 
 * GET /api/cron/reactivation-campaigns
 * 
 * Protected by CRON_SECRET environment variable
 * Runs daily at 11 AM UTC
 * 
 * 3-Phase Reactivation Campaign (8 emails over 25 days)
 * 
 * Phase 1: RECONNECT (Days 0-5)
 * - Day 0: "It's been a while 👋"
 * - Day 2: "Why professional selfies just got an upgrade"
 * - Day 5: "See how creators are building their brand visuals in minutes"
 * 
 * Phase 2: DISCOVER (Days 7-14)
 * - Day 7: "Real photos. Real you. No filters."
 * - Day 10: "What creators are making inside SSELFIE Studio."
 * - Day 14: "You're invited — 25 credits to explore SSELFIE Studio."
 * 
 * Phase 3: CONVERT (Days 20-25)
 * - Day 20: "Your studio is ready — come see it."
 * - Day 25: "50% off your first month — this week only." (COMEBACK50)
 * 
 * Logic:
 * - Fetches all contacts from Resend with 'cold_users' tag
 * - Excludes users with active subscriptions
 * - Excludes users who received re-engagement emails
 * - Excludes users who received win-back emails
 * - Sends emails sequentially based on email_logs history
 */
export async function GET(request: Request) {
  const cronLogger = createCronLogger("reactivation-campaigns")
  await cronLogger.start()

  try {
    // Check if reactivation campaigns are enabled
    const reactivationEnabled = process.env.REACTIVATION_CAMPAIGNS_ENABLED === "true"

    if (!reactivationEnabled) {
      console.log("[v0] [CRON] ⚠️ Reactivation campaigns disabled (REACTIVATION_CAMPAIGNS_ENABLED=false)")
      await cronLogger.success({
        message: "Disabled - REACTIVATION_CAMPAIGNS_ENABLED=false",
        skipped: true,
      })
      return NextResponse.json({
        success: true,
        enabled: false,
        message: "Reactivation campaigns disabled",
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

    console.log("[v0] [CRON] Starting reactivation campaigns (3-Phase: 8 emails over 25 days)...")

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

    // Exclude users who received win-back emails in last 90 days
    const winbackRecipients = await sql`
      SELECT DISTINCT user_email
      FROM email_logs
      WHERE user_email = ANY(${coldEmails})
        AND email_type = 'win-back-offer'
        AND sent_at > NOW() - INTERVAL '90 days'
    `
    const winbackEmails = new Set(winbackRecipients.map((r: any) => r.user_email))

    // Filter eligible cold users
    const eligibleEmails = coldEmails.filter(
      (email) =>
        !activeSubscriberEmails.has(email) &&
        !reengagementEmails.has(email) &&
        !winbackEmails.has(email),
    )

    console.log(
      `[v0] [CRON] Eligible cold users: ${eligibleEmails.length} (excluded ${activeSubscriberEmails.size} active subscribers, ${reengagementEmails.size} re-engagement recipients, ${winbackEmails.size} win-back recipients)`,
    )

    const results = {
      day0: { found: 0, sent: 0, failed: 0, skipped: 0 },
      day2: { found: 0, sent: 0, failed: 0, skipped: 0 },
      day5: { found: 0, sent: 0, failed: 0, skipped: 0 },
      day7: { found: 0, sent: 0, failed: 0, skipped: 0 },
      day10: { found: 0, sent: 0, failed: 0, skipped: 0 },
      day14: { found: 0, sent: 0, failed: 0, skipped: 0 },
      day20: { found: 0, sent: 0, failed: 0, skipped: 0 },
      day25: { found: 0, sent: 0, failed: 0, skipped: 0 },
      errors: [] as Array<{ email: string; day: number; error: string }>,
    }

    const sendReactivationBroadcast = async (params: {
      dayKey: keyof typeof results
      dayNumber: number
      emails: string[]
      tagKey: string
      segmentId: string
      emailType: string
      emailContent: { html: string; text: string; subject?: string }
      subjectFallback: string
    }) => {
      if (params.emails.length === 0) return

      if (!params.segmentId) {
        throw new Error(`Missing segment id for ${params.emailType}`)
      }

      const contacts = params.emails.map((email) => ({
        email,
        firstName: emailToUser.get(email)?.display_name?.split(" ")[0],
      }))

      await syncMarketingContacts({
        tagKey: params.tagKey,
        tagValue: "true",
        segmentId: params.segmentId,
        contacts,
      })

      await sendMarketingBroadcast({
        campaignKey: params.emailType,
        segmentId: params.segmentId,
        subject: params.emailContent.subject || params.subjectFallback,
        html: params.emailContent.html,
        text: params.emailContent.text,
        estimatedRecipientCount: params.emails.length,
      })

      await sql`
        INSERT INTO email_logs (user_email, email_type, status, sent_at)
        SELECT unnest(${params.emails}::text[]), ${params.emailType}, 'sent', NOW()
      `

      await syncMarketingContacts({
        tagKey: params.tagKey,
        tagValue: "false",
        segmentId: params.segmentId,
        removeFromSegment: true,
        contacts,
      })

      results[params.dayKey].sent = params.emails.length
    }

    // Day 0: Find users who haven't received Day 0 email
    const day0Eligible = await sql`
      SELECT DISTINCT el.user_email
      FROM (SELECT unnest(${eligibleEmails}::text[]) as user_email) el
      LEFT JOIN email_logs el_day0 ON el_day0.user_email = el.user_email AND el_day0.email_type = 'reactivation-day-0'
      LEFT JOIN email_logs el_old ON el_old.user_email = el.user_email AND el_old.email_type IN ('cold-edu-day-1', 'cold-edu-day-3', 'cold-edu-day-7')
      WHERE el_day0.id IS NULL
        AND el_old.id IS NULL
      LIMIT 100
    `

    results.day0.found = day0Eligible.length
    console.log(`[v0] [CRON] Found ${day0Eligible.length} users for Day 0 email`)

    if (day0Eligible.length > 0) {
      try {
        const day0Emails = day0Eligible.map((row: any) => row.user_email)
        const emailContent = generateReactivationDay0Email({
          firstName: FIRST_NAME_PLACEHOLDER,
          recipientEmail: EMAIL_PLACEHOLDER,
        })

        await sendReactivationBroadcast({
          dayKey: "day0",
          dayNumber: 0,
          emails: day0Emails,
          tagKey: "sequence_reactivation_day_0",
          segmentId: MARKETING_SEGMENTS.reactivationDay0,
          emailType: "reactivation-day-0",
          emailContent,
          subjectFallback: "It's been a while — here's what I've been building",
        })
      } catch (error: any) {
        results.day0.failed = day0Eligible.length
        results.errors.push({
          email: "broadcast",
          day: 0,
          error: error.message || "Unknown error",
        })
        console.error("[v0] [CRON] ❌ Failed to send Day 0 broadcast:", error)
        await logAdminError({
          toolName: "cron:reactivation-campaigns:day-0",
          error: error instanceof Error ? error : new Error(error.message || "Unknown error"),
          context: { recipients: day0Eligible.length },
        }).catch(() => {})
      }
    }

    // Day 2: Find users who received Day 0 email 2 days ago
    const day2Eligible = await sql`
      SELECT DISTINCT el_day0.user_email, el_day0.sent_at as day0_sent_at
      FROM email_logs el_day0
      LEFT JOIN email_logs el_day2 ON el_day2.user_email = el_day0.user_email AND el_day2.email_type = 'reactivation-day-2'
      WHERE el_day0.email_type = 'reactivation-day-0'
        AND el_day0.user_email = ANY(${eligibleEmails})
        AND el_day0.sent_at <= NOW() - INTERVAL '2 days'
        AND el_day0.sent_at > NOW() - INTERVAL '3 days'
        AND el_day2.id IS NULL
      LIMIT 100
    `

    results.day2.found = day2Eligible.length
    console.log(`[v0] [CRON] Found ${day2Eligible.length} users for Day 2 email`)

    if (day2Eligible.length > 0) {
      try {
        const day2Emails = day2Eligible.map((row: any) => row.user_email)
        const emailContent = generateReactivationDay2Email({
          firstName: FIRST_NAME_PLACEHOLDER,
          recipientEmail: EMAIL_PLACEHOLDER,
        })

        await sendReactivationBroadcast({
          dayKey: "day2",
          dayNumber: 2,
          emails: day2Emails,
          tagKey: "sequence_reactivation_day_2",
          segmentId: MARKETING_SEGMENTS.reactivationDay2,
          emailType: "reactivation-day-2",
          emailContent,
          subjectFallback: "Why professional selfies just got an upgrade",
        })
      } catch (error: any) {
        results.day2.failed = day2Eligible.length
        results.errors.push({
          email: "broadcast",
          day: 2,
          error: error.message || "Unknown error",
        })
        console.error("[v0] [CRON] ❌ Failed to send Day 2 broadcast:", error)
        await logAdminError({
          toolName: "cron:reactivation-campaigns:day-2",
          error: error instanceof Error ? error : new Error(error.message || "Unknown error"),
          context: { recipients: day2Eligible.length },
        }).catch(() => {})
      }
    }

    // Day 5: Find users who received Day 0 email 5 days ago
    const day5Eligible = await sql`
      SELECT DISTINCT el_day0.user_email, el_day0.sent_at as day0_sent_at
      FROM email_logs el_day0
      LEFT JOIN email_logs el_day5 ON el_day5.user_email = el_day0.user_email AND el_day5.email_type = 'reactivation-day-5'
      WHERE el_day0.email_type = 'reactivation-day-0'
        AND el_day0.user_email = ANY(${eligibleEmails})
        AND el_day0.sent_at <= NOW() - INTERVAL '5 days'
        AND el_day0.sent_at > NOW() - INTERVAL '6 days'
        AND el_day5.id IS NULL
      LIMIT 100
    `

    results.day5.found = day5Eligible.length
    console.log(`[v0] [CRON] Found ${day5Eligible.length} users for Day 5 email`)

    if (day5Eligible.length > 0) {
      try {
        const day5Emails = day5Eligible.map((row: any) => row.user_email)
        const emailContent = generateReactivationDay5Email({
          firstName: FIRST_NAME_PLACEHOLDER,
          recipientEmail: EMAIL_PLACEHOLDER,
        })

        await sendReactivationBroadcast({
          dayKey: "day5",
          dayNumber: 5,
          emails: day5Emails,
          tagKey: "sequence_reactivation_day_5",
          segmentId: MARKETING_SEGMENTS.reactivationDay5,
          emailType: "reactivation-day-5",
          emailContent,
          subjectFallback: "See how creators are building their brand visuals in minutes",
        })
      } catch (error: any) {
        results.day5.failed = day5Eligible.length
        results.errors.push({
          email: "broadcast",
          day: 5,
          error: error.message || "Unknown error",
        })
        console.error("[v0] [CRON] ❌ Failed to send Day 5 broadcast:", error)
        await logAdminError({
          toolName: "cron:reactivation-campaigns:day-5",
          error: error instanceof Error ? error : new Error(error.message || "Unknown error"),
          context: { recipients: day5Eligible.length },
        }).catch(() => {})
      }
    }

    // Day 7: Find users who received Day 0 email 7 days ago
    const day7Eligible = await sql`
      SELECT DISTINCT el_day0.user_email, el_day0.sent_at as day0_sent_at
      FROM email_logs el_day0
      LEFT JOIN email_logs el_day7 ON el_day7.user_email = el_day0.user_email AND el_day7.email_type = 'reactivation-day-7'
      WHERE el_day0.email_type = 'reactivation-day-0'
        AND el_day0.user_email = ANY(${eligibleEmails})
        AND el_day0.sent_at <= NOW() - INTERVAL '7 days'
        AND el_day0.sent_at > NOW() - INTERVAL '8 days'
        AND el_day7.id IS NULL
      LIMIT 100
    `

    results.day7.found = day7Eligible.length
    console.log(`[v0] [CRON] Found ${day7Eligible.length} users for Day 7 email`)

    if (day7Eligible.length > 0) {
      try {
        const day7Emails = day7Eligible.map((row: any) => row.user_email)
        const emailContent = generateReactivationDay7Email({
          firstName: FIRST_NAME_PLACEHOLDER,
          recipientEmail: EMAIL_PLACEHOLDER,
        })

        await sendReactivationBroadcast({
          dayKey: "day7",
          dayNumber: 7,
          emails: day7Emails,
          tagKey: "sequence_reactivation_day_7",
          segmentId: MARKETING_SEGMENTS.reactivationDay7,
          emailType: "reactivation-day-7",
          emailContent,
          subjectFallback: "Real photos. Real you. No filters.",
        })
      } catch (error: any) {
        results.day7.failed = day7Eligible.length
        results.errors.push({
          email: "broadcast",
          day: 7,
          error: error.message || "Unknown error",
        })
        console.error("[v0] [CRON] ❌ Failed to send Day 7 broadcast:", error)
        await logAdminError({
          toolName: "cron:reactivation-campaigns:day-7",
          error: error instanceof Error ? error : new Error(error.message || "Unknown error"),
          context: { recipients: day7Eligible.length },
        }).catch(() => {})
      }
    }

    // Day 10: Find users who received Day 0 email 10 days ago
    const day10Eligible = await sql`
      SELECT DISTINCT el_day0.user_email, el_day0.sent_at as day0_sent_at
      FROM email_logs el_day0
      LEFT JOIN email_logs el_day10 ON el_day10.user_email = el_day0.user_email AND el_day10.email_type = 'reactivation-day-10'
      WHERE el_day0.email_type = 'reactivation-day-0'
        AND el_day0.user_email = ANY(${eligibleEmails})
        AND el_day0.sent_at <= NOW() - INTERVAL '10 days'
        AND el_day0.sent_at > NOW() - INTERVAL '11 days'
        AND el_day10.id IS NULL
      LIMIT 100
    `

    results.day10.found = day10Eligible.length
    console.log(`[v0] [CRON] Found ${day10Eligible.length} users for Day 10 email`)

    if (day10Eligible.length > 0) {
      try {
        const day10Emails = day10Eligible.map((row: any) => row.user_email)
        const emailContent = generateReactivationDay10Email({
          firstName: FIRST_NAME_PLACEHOLDER,
          recipientEmail: EMAIL_PLACEHOLDER,
        })

        await sendReactivationBroadcast({
          dayKey: "day10",
          dayNumber: 10,
          emails: day10Emails,
          tagKey: "sequence_reactivation_day_10",
          segmentId: MARKETING_SEGMENTS.reactivationDay10,
          emailType: "reactivation-day-10",
          emailContent,
          subjectFallback: "What creators are making inside SSELFIE Studio.",
        })
      } catch (error: any) {
        results.day10.failed = day10Eligible.length
        results.errors.push({
          email: "broadcast",
          day: 10,
          error: error.message || "Unknown error",
        })
        console.error("[v0] [CRON] ❌ Failed to send Day 10 broadcast:", error)
        await logAdminError({
          toolName: "cron:reactivation-campaigns:day-10",
          error: error instanceof Error ? error : new Error(error.message || "Unknown error"),
          context: { recipients: day10Eligible.length },
        }).catch(() => {})
      }
    }

    // Day 14: Find users who received Day 0 email 14 days ago
    const day14Eligible = await sql`
      SELECT DISTINCT el_day0.user_email, el_day0.sent_at as day0_sent_at
      FROM email_logs el_day0
      LEFT JOIN email_logs el_day14 ON el_day14.user_email = el_day0.user_email AND el_day14.email_type = 'reactivation-day-14'
      WHERE el_day0.email_type = 'reactivation-day-0'
        AND el_day0.user_email = ANY(${eligibleEmails})
        AND el_day0.sent_at <= NOW() - INTERVAL '14 days'
        AND el_day0.sent_at > NOW() - INTERVAL '15 days'
        AND el_day14.id IS NULL
      LIMIT 100
    `

    results.day14.found = day14Eligible.length
    console.log(`[v0] [CRON] Found ${day14Eligible.length} users for Day 14 email`)

    if (day14Eligible.length > 0) {
      try {
        const day14Emails = day14Eligible.map((row: any) => row.user_email)
        const emailContent = generateReactivationDay14Email({
          firstName: FIRST_NAME_PLACEHOLDER,
          recipientEmail: EMAIL_PLACEHOLDER,
        })

        await sendReactivationBroadcast({
          dayKey: "day14",
          dayNumber: 14,
          emails: day14Emails,
          tagKey: "sequence_reactivation_day_14",
          segmentId: MARKETING_SEGMENTS.reactivationDay14,
          emailType: "reactivation-day-14",
          emailContent,
          subjectFallback: "You're invited — 25 credits to explore SSELFIE Studio.",
        })
      } catch (error: any) {
        results.day14.failed = day14Eligible.length
        results.errors.push({
          email: "broadcast",
          day: 14,
          error: error.message || "Unknown error",
        })
        console.error("[v0] [CRON] ❌ Failed to send Day 14 broadcast:", error)
        await logAdminError({
          toolName: "cron:reactivation-campaigns:day-14",
          error: error instanceof Error ? error : new Error(error.message || "Unknown error"),
          context: { recipients: day14Eligible.length },
        }).catch(() => {})
      }
    }

    // Day 20: Find users who received Day 0 email 20 days ago
    const day20Eligible = await sql`
      SELECT DISTINCT el_day0.user_email, el_day0.sent_at as day0_sent_at
      FROM email_logs el_day0
      LEFT JOIN email_logs el_day20 ON el_day20.user_email = el_day0.user_email AND el_day20.email_type = 'reactivation-day-20'
      WHERE el_day0.email_type = 'reactivation-day-0'
        AND el_day0.user_email = ANY(${eligibleEmails})
        AND el_day0.sent_at <= NOW() - INTERVAL '20 days'
        AND el_day0.sent_at > NOW() - INTERVAL '21 days'
        AND el_day20.id IS NULL
      LIMIT 100
    `

    results.day20.found = day20Eligible.length
    console.log(`[v0] [CRON] Found ${day20Eligible.length} users for Day 20 email`)

    if (day20Eligible.length > 0) {
      try {
        const day20Emails = day20Eligible.map((row: any) => row.user_email)
        const emailContent = generateReactivationDay20Email({
          firstName: FIRST_NAME_PLACEHOLDER,
          recipientEmail: EMAIL_PLACEHOLDER,
        })

        await sendReactivationBroadcast({
          dayKey: "day20",
          dayNumber: 20,
          emails: day20Emails,
          tagKey: "sequence_reactivation_day_20",
          segmentId: MARKETING_SEGMENTS.reactivationDay20,
          emailType: "reactivation-day-20",
          emailContent,
          subjectFallback: "Your studio is ready — come see it.",
        })
      } catch (error: any) {
        results.day20.failed = day20Eligible.length
        results.errors.push({
          email: "broadcast",
          day: 20,
          error: error.message || "Unknown error",
        })
        console.error("[v0] [CRON] ❌ Failed to send Day 20 broadcast:", error)
        await logAdminError({
          toolName: "cron:reactivation-campaigns:day-20",
          error: error instanceof Error ? error : new Error(error.message || "Unknown error"),
          context: { recipients: day20Eligible.length },
        }).catch(() => {})
      }
    }

    // Day 25: Find users who received Day 0 email 25 days ago
    const day25Eligible = await sql`
      SELECT DISTINCT el_day0.user_email, el_day0.sent_at as day0_sent_at
      FROM email_logs el_day0
      LEFT JOIN email_logs el_day25 ON el_day25.user_email = el_day0.user_email AND el_day25.email_type = 'reactivation-day-25'
      WHERE el_day0.email_type = 'reactivation-day-0'
        AND el_day0.user_email = ANY(${eligibleEmails})
        AND el_day0.sent_at <= NOW() - INTERVAL '25 days'
        AND el_day0.sent_at > NOW() - INTERVAL '26 days'
        AND el_day25.id IS NULL
      LIMIT 100
    `

    results.day25.found = day25Eligible.length
    console.log(`[v0] [CRON] Found ${day25Eligible.length} users for Day 25 email`)

    if (day25Eligible.length > 0) {
      try {
        const day25Emails = day25Eligible.map((row: any) => row.user_email)
        const emailContent = generateReactivationDay25Email({
          firstName: FIRST_NAME_PLACEHOLDER,
          recipientEmail: EMAIL_PLACEHOLDER,
        })

        await sendReactivationBroadcast({
          dayKey: "day25",
          dayNumber: 25,
          emails: day25Emails,
          tagKey: "sequence_reactivation_day_25",
          segmentId: MARKETING_SEGMENTS.reactivationDay25,
          emailType: "reactivation-day-25",
          emailContent,
          subjectFallback: "50% off your first month — this week only.",
        })
      } catch (error: any) {
        results.day25.failed = day25Eligible.length
        results.errors.push({
          email: "broadcast",
          day: 25,
          error: error.message || "Unknown error",
        })
        console.error("[v0] [CRON] ❌ Failed to send Day 25 broadcast:", error)
        await logAdminError({
          toolName: "cron:reactivation-campaigns:day-25",
          error: error instanceof Error ? error : new Error(error.message || "Unknown error"),
          context: { recipients: day25Eligible.length },
        }).catch(() => {})
      }
    }

    const totalSent =
      results.day0.sent +
      results.day2.sent +
      results.day5.sent +
      results.day7.sent +
      results.day10.sent +
      results.day14.sent +
      results.day20.sent +
      results.day25.sent
    const totalFailed =
      results.day0.failed +
      results.day2.failed +
      results.day5.failed +
      results.day7.failed +
      results.day10.failed +
      results.day14.failed +
      results.day20.failed +
      results.day25.failed
    const totalSkipped =
      results.day0.skipped +
      results.day2.skipped +
      results.day5.skipped +
      results.day7.skipped +
      results.day10.skipped +
      results.day14.skipped +
      results.day20.skipped +
      results.day25.skipped

    console.log(
      `[v0] [CRON] Reactivation campaigns (3-Phase) completed: ${totalSent} sent, ${totalFailed} failed, ${totalSkipped} skipped`,
    )

    await cronLogger.success({
      day0Sent: results.day0.sent,
      day0Failed: results.day0.failed,
      day0Skipped: results.day0.skipped,
      day2Sent: results.day2.sent,
      day2Failed: results.day2.failed,
      day2Skipped: results.day2.skipped,
      day5Sent: results.day5.sent,
      day5Failed: results.day5.failed,
      day5Skipped: results.day5.skipped,
      day7Sent: results.day7.sent,
      day7Failed: results.day7.failed,
      day7Skipped: results.day7.skipped,
      day10Sent: results.day10.sent,
      day10Failed: results.day10.failed,
      day10Skipped: results.day10.skipped,
      day14Sent: results.day14.sent,
      day14Failed: results.day14.failed,
      day14Skipped: results.day14.skipped,
      day20Sent: results.day20.sent,
      day20Failed: results.day20.failed,
      day20Skipped: results.day20.skipped,
      day25Sent: results.day25.sent,
      day25Failed: results.day25.failed,
      day25Skipped: results.day25.skipped,
      totalSent,
      totalFailed,
      totalSkipped,
    })

    return NextResponse.json({
      success: true,
      message: `Reactivation campaigns (3-Phase) sent: ${totalSent} successful, ${totalFailed} failed, ${totalSkipped} skipped`,
      summary: {
        day0: results.day0,
        day2: results.day2,
        day5: results.day5,
        day7: results.day7,
        day10: results.day10,
        day14: results.day14,
        day20: results.day20,
        day25: results.day25,
        totalSent,
        totalFailed,
        totalSkipped,
      },
      errors: results.errors.slice(0, 10), // Limit errors in response
      totalErrors: results.errors.length,
    })
  } catch (error: any) {
    console.error("[v0] [CRON] Error in reactivation campaigns cron:", error)
    await cronLogger.error(error, {})
    await logAdminError({
      toolName: "cron:reactivation-campaigns",
      error: error instanceof Error ? error : new Error(String(error)),
      context: {},
    }).catch(() => {})
    return NextResponse.json(
      {
        success: false,
        error: "Failed to run reactivation campaigns cron",
        details: error.message || "Unknown error",
      },
      { status: 500 },
    )
  }
}
