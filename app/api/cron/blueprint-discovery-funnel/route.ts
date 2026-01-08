// Blueprint Discovery Funnel Automation
import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { sendEmail } from "@/lib/email/send-email"
import { createCronLogger } from "@/lib/cron-logger"
import { getAllResendContacts } from "@/lib/audience/segment-sync"
import {
  generateBlueprintDiscovery1Email,
  generateBlueprintDiscovery2Email,
  generateBlueprintDiscovery3Email,
  generateBlueprintDiscovery4Email,
  generateBlueprintDiscovery5Email,
} from "@/lib/email/templates/blueprint-discovery-sequence"
import { logAdminError } from "@/lib/admin-error-log"

const sql = neon(process.env.DATABASE_URL!)

/**
 * Blueprint Discovery Funnel - Resend Direct Sends
 * 
 * Sends discovery funnel emails to ALL subscribers (except blueprint_subscribers).
 * These users have NOT completed the blueprint yet.
 * 
 * GET /api/cron/blueprint-discovery-funnel
 * 
 * Protected by CRON_SECRET environment variable
 * Runs daily at 12 PM UTC
 * 
 * Email sequence:
 * - Email 1 (Day 0): "Remember the selfie guide? Here's what's next." → Blueprint signup
 * - Email 2 (Day 3): "Your blueprint is ready" → Only if blueprint completed
 * - Email 3 (Day 5): "Meet Maya" → Only if grid generated
 * - Email 4 (Day 7): "See how creators use Maya" → Only if signed up
 * - Email 5 (Day 10): "Your free grid is ready" → Only if engaged with Maya
 * 
 * Logic:
 * - Fetches all contacts from Resend
 * - Excludes blueprint_subscribers (they've already done it)
 * - Excludes users with active subscriptions
 * - Excludes users who received reactivation/re-engagement/win-back emails
 * - Sends emails sequentially based on completion status
 */
export async function GET(request: Request) {
  const cronLogger = createCronLogger("blueprint-discovery-funnel")
  await cronLogger.start()

  try {
    // Check if discovery funnel is enabled
    const discoveryEnabled = process.env.BLUEPRINT_DISCOVERY_FUNNEL_ENABLED === "true"

    if (!discoveryEnabled) {
      console.log("[v0] [CRON] ⚠️ Blueprint discovery funnel disabled (BLUEPRINT_DISCOVERY_FUNNEL_ENABLED=false)")
      await cronLogger.success({
        message: "Disabled - BLUEPRINT_DISCOVERY_FUNNEL_ENABLED=false",
        skipped: true,
      })
      return NextResponse.json({
        success: true,
        enabled: false,
        message: "Blueprint discovery funnel disabled",
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

    console.log("[v0] [CRON] Starting blueprint discovery funnel...")

    // Fetch all contacts from Resend
    const allContacts = await getAllResendContacts()
    console.log(`[v0] [CRON] Fetched ${allContacts.length} total contacts from Resend`)

    // Get emails from all contacts
    const allEmails = allContacts.map((c) => c.email).filter(Boolean)

    if (allEmails.length === 0) {
      console.log("[v0] [CRON] No contacts found in Resend")
      await cronLogger.success({
        found: 0,
        sent: 0,
        skipped: 0,
      })
      return NextResponse.json({
        success: true,
        message: "No contacts found",
        summary: {
          found: 0,
          sent: 0,
          skipped: 0,
        },
      })
    }

    // Get user data from database
    const dbUsers = await sql`
      SELECT DISTINCT
        u.email,
        u.display_name,
        u.id,
        u.last_login_at
      FROM users u
      WHERE u.email = ANY(${allEmails})
        AND u.email IS NOT NULL
        AND u.email != ''
    `

    // Create email map for quick lookup
    const emailToUser = new Map(dbUsers.map((u: any) => [u.email, u]))

    // EXCLUDE blueprint_subscribers (they've already done it)
    const blueprintSubscribers = await sql`
      SELECT DISTINCT email
      FROM blueprint_subscribers
      WHERE email = ANY(${allEmails})
    `
    const blueprintSubscriberEmails = new Set(blueprintSubscribers.map((b: any) => b.email))
    console.log(`[v0] [CRON] Excluded ${blueprintSubscriberEmails.size} blueprint subscribers`)

    // Exclude users with active subscriptions
    const activeSubscribers = await sql`
      SELECT DISTINCT u.email
      FROM users u
      INNER JOIN subscriptions s ON u.id = s.user_id::varchar
      WHERE u.email = ANY(${allEmails})
        AND s.status = 'active'
        AND s.is_test_mode = false
    `
    const activeSubscriberEmails = new Set(activeSubscribers.map((s: any) => s.email))
    console.log(`[v0] [CRON] Excluded ${activeSubscriberEmails.size} active subscribers`)

    // Exclude users who received reactivation emails in last 90 days
    const reactivationRecipients = await sql`
      SELECT DISTINCT user_email
      FROM email_logs
      WHERE user_email = ANY(${allEmails})
        AND email_type LIKE 'reactivation-day-%'
        AND sent_at > NOW() - INTERVAL '90 days'
    `
    const reactivationEmails = new Set(reactivationRecipients.map((r: any) => r.user_email))
    console.log(`[v0] [CRON] Excluded ${reactivationEmails.size} reactivation recipients`)

    // Exclude users who received re-engagement emails in last 90 days
    const reengagementRecipients = await sql`
      SELECT DISTINCT user_email
      FROM email_logs
      WHERE user_email = ANY(${allEmails})
        AND email_type IN ('reengagement-day-0', 'reengagement-day-7', 'reengagement-day-14')
        AND sent_at > NOW() - INTERVAL '90 days'
    `
    const reengagementEmails = new Set(reengagementRecipients.map((r: any) => r.user_email))
    console.log(`[v0] [CRON] Excluded ${reengagementEmails.size} re-engagement recipients`)

    // Exclude users who received win-back emails in last 90 days
    const winbackRecipients = await sql`
      SELECT DISTINCT user_email
      FROM email_logs
      WHERE user_email = ANY(${allEmails})
        AND email_type = 'win-back-offer'
        AND sent_at > NOW() - INTERVAL '90 days'
    `
    const winbackEmails = new Set(winbackRecipients.map((r: any) => r.user_email))
    console.log(`[v0] [CRON] Excluded ${winbackEmails.size} win-back recipients`)

    // Filter eligible subscribers (all except blueprint_subscribers and exclusions)
    const eligibleEmails = allEmails.filter(
      (email) =>
        !blueprintSubscriberEmails.has(email) &&
        !activeSubscriberEmails.has(email) &&
        !reactivationEmails.has(email) &&
        !reengagementEmails.has(email) &&
        !winbackEmails.has(email),
    )

    console.log(
      `[v0] [CRON] Eligible subscribers: ${eligibleEmails.length} (excluded ${blueprintSubscriberEmails.size} blueprint subscribers, ${activeSubscriberEmails.size} active subscribers, ${reactivationEmails.size} reactivation recipients, ${reengagementEmails.size} re-engagement recipients, ${winbackEmails.size} win-back recipients)`,
    )

    const results = {
      email1: { found: 0, sent: 0, failed: 0, skipped: 0 },
      email2: { found: 0, sent: 0, failed: 0, skipped: 0 },
      email3: { found: 0, sent: 0, failed: 0, skipped: 0 },
      email4: { found: 0, sent: 0, failed: 0, skipped: 0 },
      email5: { found: 0, sent: 0, failed: 0, skipped: 0 },
      errors: [] as Array<{ email: string; emailNum: number; error: string }>,
    }

    // Email 1: Find users who haven't received Email 1 and haven't completed blueprint
    const email1Eligible = await sql`
      SELECT DISTINCT el.user_email
      FROM (SELECT unnest(${eligibleEmails}::text[]) as user_email) el
      LEFT JOIN email_logs el_email1 ON el_email1.user_email = el.user_email AND el_email1.email_type = 'blueprint-discovery-1'
      LEFT JOIN blueprint_subscribers bs ON bs.email = el.user_email
      WHERE el_email1.id IS NULL
        AND bs.id IS NULL
      LIMIT 100
    `

    results.email1.found = email1Eligible.length
    console.log(`[v0] [CRON] Found ${email1Eligible.length} users for Email 1`)

    for (const row of email1Eligible) {
      const email = row.user_email
      try {
        // Double-check deduplication
        const existingLog = await sql`
          SELECT id FROM email_logs
          WHERE user_email = ${email}
          AND email_type = 'blueprint-discovery-1'
          LIMIT 1
        `
        if (existingLog.length > 0) {
          results.email1.skipped++
          continue
        }

        const user = emailToUser.get(email)
        const firstName = user?.display_name?.split(" ")[0] || undefined
        const emailContent = generateBlueprintDiscovery1Email({
          firstName,
          recipientEmail: email,
        })

        const sendResult = await sendEmail({
          to: email,
          subject: emailContent.subject || "Remember the selfie guide? Here's what's next.",
          html: emailContent.html,
          text: emailContent.text,
          from: "Sandra from SSELFIE <hello@sselfie.ai>",
          emailType: "blueprint-discovery-1",
        })

        if (sendResult.success) {
          results.email1.sent++
          console.log(`[v0] [CRON] ✅ Sent Email 1 to ${email}`)
        } else {
          throw new Error(sendResult.error || "Failed to send email")
        }
      } catch (error: any) {
        results.email1.failed++
        results.errors.push({
          email,
          emailNum: 1,
          error: error.message || "Unknown error",
        })
        console.error(`[v0] [CRON] ❌ Failed to send Email 1 to ${email}:`, error)
        await logAdminError({
          toolName: "cron:blueprint-discovery-funnel:email-1",
          error: error instanceof Error ? error : new Error(error.message || "Unknown error"),
          context: { email },
        }).catch(() => {})
      }
    }

    // Email 2: Find blueprint_subscribers who completed blueprint 3 days ago, haven't received Email 2
    // Note: These users ARE in blueprint_subscribers (they completed it), so we query that table directly
    const email2Eligible = await sql`
      SELECT DISTINCT bs.email, bs.blueprint_completed_at
      FROM blueprint_subscribers bs
      LEFT JOIN email_logs el_email2 ON el_email2.user_email = bs.email AND el_email2.email_type = 'blueprint-discovery-2'
      LEFT JOIN subscriptions s ON s.user_id = (SELECT id::varchar FROM users WHERE email = bs.email LIMIT 1)
      WHERE bs.blueprint_completed = true
        AND bs.email = ANY(${allEmails})
        AND (s.status IS NULL OR s.status != 'active' OR s.is_test_mode = true)
        AND bs.blueprint_completed_at <= NOW() - INTERVAL '3 days'
        AND bs.blueprint_completed_at > NOW() - INTERVAL '4 days'
        AND el_email2.id IS NULL
      LIMIT 100
    `

    results.email2.found = email2Eligible.length
    console.log(`[v0] [CRON] Found ${email2Eligible.length} users for Email 2`)

    for (const row of email2Eligible) {
      const email = row.email
      try {
        const existingLog = await sql`
          SELECT id FROM email_logs
          WHERE user_email = ${email}
          AND email_type = 'blueprint-discovery-2'
          LIMIT 1
        `
        if (existingLog.length > 0) {
          results.email2.skipped++
          continue
        }

        const user = emailToUser.get(email)
        const firstName = user?.display_name?.split(" ")[0] || undefined
        const emailContent = generateBlueprintDiscovery2Email({
          firstName,
          recipientEmail: email,
        })

        const sendResult = await sendEmail({
          to: email,
          subject: emailContent.subject || "Your blueprint is ready — here's what you can do with it.",
          html: emailContent.html,
          text: emailContent.text,
          from: "Sandra from SSELFIE <hello@sselfie.ai>",
          emailType: "blueprint-discovery-2",
        })

        if (sendResult.success) {
          results.email2.sent++
          console.log(`[v0] [CRON] ✅ Sent Email 2 to ${email}`)
        } else {
          throw new Error(sendResult.error || "Failed to send email")
        }
      } catch (error: any) {
        results.email2.failed++
        results.errors.push({
          email,
          emailNum: 2,
          error: error.message || "Unknown error",
        })
        console.error(`[v0] [CRON] ❌ Failed to send Email 2 to ${email}:`, error)
        await logAdminError({
          toolName: "cron:blueprint-discovery-funnel:email-2",
          error: error instanceof Error ? error : new Error(error.message || "Unknown error"),
          context: { email },
        }).catch(() => {})
      }
    }

    // Email 3: Find blueprint_subscribers who generated grid 5 days ago, haven't received Email 3
    const email3Eligible = await sql`
      SELECT DISTINCT bs.email, bs.grid_generated_at
      FROM blueprint_subscribers bs
      LEFT JOIN email_logs el_email3 ON el_email3.user_email = bs.email AND el_email3.email_type = 'blueprint-discovery-3'
      LEFT JOIN subscriptions s ON s.user_id = (SELECT id::varchar FROM users WHERE email = bs.email LIMIT 1)
      WHERE bs.grid_generated = true
        AND bs.email = ANY(${allEmails})
        AND (s.status IS NULL OR s.status != 'active' OR s.is_test_mode = true)
        AND bs.grid_generated_at <= NOW() - INTERVAL '5 days'
        AND bs.grid_generated_at > NOW() - INTERVAL '6 days'
        AND el_email3.id IS NULL
      LIMIT 100
    `

    results.email3.found = email3Eligible.length
    console.log(`[v0] [CRON] Found ${email3Eligible.length} users for Email 3`)

    for (const row of email3Eligible) {
      const email = row.email
      try {
        const existingLog = await sql`
          SELECT id FROM email_logs
          WHERE user_email = ${email}
          AND email_type = 'blueprint-discovery-3'
          LIMIT 1
        `
        if (existingLog.length > 0) {
          results.email3.skipped++
          continue
        }

        const user = emailToUser.get(email)
        const firstName = user?.display_name?.split(" ")[0] || undefined
        const emailContent = generateBlueprintDiscovery3Email({
          firstName,
          recipientEmail: email,
        })

        const sendResult = await sendEmail({
          to: email,
          subject: emailContent.subject || "Meet Maya — your AI creative director.",
          html: emailContent.html,
          text: emailContent.text,
          from: "Sandra from SSELFIE <hello@sselfie.ai>",
          emailType: "blueprint-discovery-3",
        })

        if (sendResult.success) {
          results.email3.sent++
          console.log(`[v0] [CRON] ✅ Sent Email 3 to ${email}`)
        } else {
          throw new Error(sendResult.error || "Failed to send email")
        }
      } catch (error: any) {
        results.email3.failed++
        results.errors.push({
          email,
          emailNum: 3,
          error: error.message || "Unknown error",
        })
        console.error(`[v0] [CRON] ❌ Failed to send Email 3 to ${email}:`, error)
        await logAdminError({
          toolName: "cron:blueprint-discovery-funnel:email-3",
          error: error instanceof Error ? error : new Error(error.message || "Unknown error"),
          context: { email },
        }).catch(() => {})
      }
    }

    // Email 4: Find blueprint_subscribers who signed up (converted_to_user) 7 days ago, haven't received Email 4
    const email4Eligible = await sql`
      SELECT DISTINCT bs.email, bs.converted_at
      FROM blueprint_subscribers bs
      INNER JOIN users u ON u.email = bs.email
      LEFT JOIN email_logs el_email4 ON el_email4.user_email = bs.email AND el_email4.email_type = 'blueprint-discovery-4'
      LEFT JOIN subscriptions s ON s.user_id = u.id::varchar
      WHERE bs.converted_to_user = true
        AND bs.email = ANY(${allEmails})
        AND (s.status IS NULL OR s.status != 'active' OR s.is_test_mode = true)
        AND bs.converted_at <= NOW() - INTERVAL '7 days'
        AND bs.converted_at > NOW() - INTERVAL '8 days'
        AND el_email4.id IS NULL
      LIMIT 100
    `

    results.email4.found = email4Eligible.length
    console.log(`[v0] [CRON] Found ${email4Eligible.length} users for Email 4`)

    for (const row of email4Eligible) {
      const email = row.email
      try {
        const existingLog = await sql`
          SELECT id FROM email_logs
          WHERE user_email = ${email}
          AND email_type = 'blueprint-discovery-4'
          LIMIT 1
        `
        if (existingLog.length > 0) {
          results.email4.skipped++
          continue
        }

        const user = emailToUser.get(email)
        const firstName = user?.display_name?.split(" ")[0] || undefined
        const emailContent = generateBlueprintDiscovery4Email({
          firstName,
          recipientEmail: email,
        })

        const sendResult = await sendEmail({
          to: email,
          subject: emailContent.subject || "See how creators use Maya to plan their feeds.",
          html: emailContent.html,
          text: emailContent.text,
          from: "Sandra from SSELFIE <hello@sselfie.ai>",
          emailType: "blueprint-discovery-4",
        })

        if (sendResult.success) {
          results.email4.sent++
          console.log(`[v0] [CRON] ✅ Sent Email 4 to ${email}`)
        } else {
          throw new Error(sendResult.error || "Failed to send email")
        }
      } catch (error: any) {
        results.email4.failed++
        results.errors.push({
          email,
          emailNum: 4,
          error: error.message || "Unknown error",
        })
        console.error(`[v0] [CRON] ❌ Failed to send Email 4 to ${email}:`, error)
        await logAdminError({
          toolName: "cron:blueprint-discovery-funnel:email-4",
          error: error instanceof Error ? error : new Error(error.message || "Unknown error"),
          context: { email },
        }).catch(() => {})
      }
    }

    // Email 5: Find users who engaged with Maya (sent messages) 10 days ago, haven't received Email 5
    // These users should be from blueprint_subscribers who converted
    const email5Eligible = await sql`
      SELECT DISTINCT u.email, MIN(mcm.created_at) as first_message_at
      FROM users u
      INNER JOIN blueprint_subscribers bs ON bs.email = u.email
      INNER JOIN maya_chats mc ON mc.user_id = u.id::varchar
      INNER JOIN maya_chat_messages mcm ON mcm.chat_id = mc.id
      LEFT JOIN email_logs el_email5 ON el_email5.user_email = u.email AND el_email5.email_type = 'blueprint-discovery-5'
      LEFT JOIN subscriptions s ON s.user_id = u.id::varchar
      WHERE u.email = ANY(${allEmails})
        AND mcm.role = 'user'
        AND (s.status IS NULL OR s.status != 'active' OR s.is_test_mode = true)
        AND mcm.created_at <= NOW() - INTERVAL '10 days'
        AND mcm.created_at > NOW() - INTERVAL '11 days'
        AND el_email5.id IS NULL
      GROUP BY u.email
      HAVING COUNT(mcm.id) > 0
      LIMIT 100
    `

    results.email5.found = email5Eligible.length
    console.log(`[v0] [CRON] Found ${email5Eligible.length} users for Email 5`)

    for (const row of email5Eligible) {
      const email = row.email
      try {
        const existingLog = await sql`
          SELECT id FROM email_logs
          WHERE user_email = ${email}
          AND email_type = 'blueprint-discovery-5'
          LIMIT 1
        `
        if (existingLog.length > 0) {
          results.email5.skipped++
          continue
        }

        const user = emailToUser.get(email)
        const firstName = user?.display_name?.split(" ")[0] || undefined
        const emailContent = generateBlueprintDiscovery5Email({
          firstName,
          recipientEmail: email,
        })

        const sendResult = await sendEmail({
          to: email,
          subject: emailContent.subject || "Your free grid is ready — want to generate more?",
          html: emailContent.html,
          text: emailContent.text,
          from: "Sandra from SSELFIE <hello@sselfie.ai>",
          emailType: "blueprint-discovery-5",
        })

        if (sendResult.success) {
          results.email5.sent++
          console.log(`[v0] [CRON] ✅ Sent Email 5 to ${email}`)
        } else {
          throw new Error(sendResult.error || "Failed to send email")
        }
      } catch (error: any) {
        results.email5.failed++
        results.errors.push({
          email,
          emailNum: 5,
          error: error.message || "Unknown error",
        })
        console.error(`[v0] [CRON] ❌ Failed to send Email 5 to ${email}:`, error)
        await logAdminError({
          toolName: "cron:blueprint-discovery-funnel:email-5",
          error: error instanceof Error ? error : new Error(error.message || "Unknown error"),
          context: { email },
        }).catch(() => {})
      }
    }

    const totalSent =
      results.email1.sent +
      results.email2.sent +
      results.email3.sent +
      results.email4.sent +
      results.email5.sent
    const totalFailed =
      results.email1.failed +
      results.email2.failed +
      results.email3.failed +
      results.email4.failed +
      results.email5.failed
    const totalSkipped =
      results.email1.skipped +
      results.email2.skipped +
      results.email3.skipped +
      results.email4.skipped +
      results.email5.skipped

    console.log(
      `[v0] [CRON] Blueprint discovery funnel completed: ${totalSent} sent, ${totalFailed} failed, ${totalSkipped} skipped`,
    )

    await cronLogger.success({
      email1Sent: results.email1.sent,
      email1Failed: results.email1.failed,
      email1Skipped: results.email1.skipped,
      email2Sent: results.email2.sent,
      email2Failed: results.email2.failed,
      email2Skipped: results.email2.skipped,
      email3Sent: results.email3.sent,
      email3Failed: results.email3.failed,
      email3Skipped: results.email3.skipped,
      email4Sent: results.email4.sent,
      email4Failed: results.email4.failed,
      email4Skipped: results.email4.skipped,
      email5Sent: results.email5.sent,
      email5Failed: results.email5.failed,
      email5Skipped: results.email5.skipped,
      totalSent,
      totalFailed,
      totalSkipped,
    })

    return NextResponse.json({
      success: true,
      message: `Blueprint discovery funnel sent: ${totalSent} successful, ${totalFailed} failed, ${totalSkipped} skipped`,
      summary: {
        email1: results.email1,
        email2: results.email2,
        email3: results.email3,
        email4: results.email4,
        email5: results.email5,
        totalSent,
        totalFailed,
        totalSkipped,
      },
      errors: results.errors.slice(0, 10), // Limit errors in response
      totalErrors: results.errors.length,
    })
  } catch (error: any) {
    console.error("[v0] [CRON] Error in blueprint discovery funnel cron:", error)
    await cronLogger.error(error, {})
    await logAdminError({
      toolName: "cron:blueprint-discovery-funnel",
      error: error instanceof Error ? error : new Error(String(error)),
      context: {},
    }).catch(() => {})
    return NextResponse.json(
      {
        success: false,
        error: "Failed to run blueprint discovery funnel cron",
        details: error.message || "Unknown error",
      },
      { status: 500 },
    )
  }
}
