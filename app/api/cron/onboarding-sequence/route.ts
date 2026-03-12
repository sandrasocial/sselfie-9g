// Onboarding Email Sequence Automation
import { NextResponse } from "next/server"
import { sql } from "@/lib/db/client"
import { sendEmail } from "@/lib/email/send-email"
import { createCronLogger } from "@/lib/cron-logger"
import { generateOnboardingDay0Email } from "@/lib/email/templates/onboarding-day-0"
import { generateOnboardingDay2Email } from "@/lib/email/templates/onboarding-day-2"
import { generateOnboardingDay7Email } from "@/lib/email/templates/onboarding-day-7"
import { generateWelcomeFirstGenerationFollowupEmail } from "@/lib/email/templates/welcome-first-generation-followup"
import { generatePostActivationUpgradeEmail } from "@/lib/email/templates/post-activation-upgrade"
import { logAdminError } from "@/lib/admin-error-log"
import { enqueueAndProcessMarketingRun } from "@/lib/email/marketing-runner"
import { MARKETING_SEGMENTS } from "@/lib/email/config"


const FIRST_NAME_PLACEHOLDER = "{{{FIRST_NAME|friend}}}"

/**
 * Onboarding Sequence - Resend Broadcasts (Marketing)
 * 
 * Sends onboarding emails to new Studio members via Broadcast API.
 * 
 * GET /api/cron/onboarding-sequence
 * 
 * Protected by CRON_SECRET environment variable
 * Runs daily at 10 AM UTC (same as other email sequences)
 * 
 * Email templates:
 * - Day 0: "Welcome to The Visibility Studio — let's make you visible"
 * - Day 2: "Your first shoot is waiting — let's make it feel like you"
 * - Day 7: "You're building your brand beautifully — keep showing up"
 * 
 * Logic:
 * - Targets users with active Studio subscriptions
 * - Uses subscription.created_at to determine days since joining Studio
 * - Skips users who already received onboarding emails
 */
export async function GET(request: Request) {
  const cronLogger = createCronLogger("onboarding-sequence")
  await cronLogger.start()

  try {
    // Onboarding Email Sequence Automation - Verify cron secret for security
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET

    const isProduction = process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production"

    if (isProduction) {
      if (!cronSecret) {
        console.error("[v0] [CRON] Unauthorized: CRON_SECRET not set in production")
        await cronLogger.error(new Error("Unauthorized"), { reason: "CRON_SECRET not set in production" })
        return NextResponse.json({ error: "Unauthorized: CRON_SECRET required in production" }, { status: 401 })
      }
      if (authHeader !== `Bearer ${cronSecret}`) {
        console.error("[v0] [CRON] Unauthorized: Invalid or missing CRON_SECRET")
        await cronLogger.error(new Error("Unauthorized"), { reason: "Invalid CRON_SECRET" })
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    }

    // In production, require onboarding segment IDs so the cron fails visibly instead of at send time
    const isProductionEnv = process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production"
    if (isProductionEnv) {
      const missing = []
      if (!MARKETING_SEGMENTS.onboardingDay0) missing.push("RESEND_SEGMENT_ONBOARDING_DAY_0")
      if (!MARKETING_SEGMENTS.onboardingDay2) missing.push("RESEND_SEGMENT_ONBOARDING_DAY_2")
      if (!MARKETING_SEGMENTS.onboardingDay7) missing.push("RESEND_SEGMENT_ONBOARDING_DAY_7")
      if (missing.length > 0) {
        await cronLogger.error(new Error("Onboarding segment env vars missing"), { missing })
        return NextResponse.json(
          {
            error: "Onboarding sequence cannot run: missing Resend segment configuration",
            missingEnvVars: missing,
            hint: "Set RESEND_SEGMENT_ONBOARDING_DAY_0, RESEND_SEGMENT_ONBOARDING_DAY_2, RESEND_SEGMENT_ONBOARDING_DAY_7 in Vercel (and create segments in Resend if needed).",
          },
          { status: 503 },
        )
      }
    }

    console.log("[v0] [CRON] Starting onboarding email sequence...")

    const results = {
      day0: { found: 0, sent: 0, failed: 0, skipped: 0 },
      day2: { found: 0, sent: 0, failed: 0, skipped: 0 },
      day7: { found: 0, sent: 0, failed: 0, skipped: 0 },
      firstGenNudge: { found: 0, sent: 0, failed: 0 },
      postActivation: { found: 0, sent: 0, failed: 0 },
      errors: [] as Array<{ email: string; day: number | string; error: string }>,
    }

    // Onboarding Email Sequence Automation - Day 0 emails: subscription created in last 2 hours
    const day0Users = await sql`
      SELECT DISTINCT 
        u.id,
        u.email,
        u.display_name,
        s.created_at as subscription_created_at
      FROM users u
      INNER JOIN subscriptions s ON u.id = s.user_id::varchar
      LEFT JOIN email_logs el ON el.user_email = u.email
        AND el.email_type = 'onboarding-day-0'
        AND (
          el.status IN ('sent', 'delivered')
          OR (el.status = 'queued' AND el.sent_at > NOW() - INTERVAL '2 hours')
        )
      WHERE s.status = 'active'
        AND s.product_type = 'sselfie_studio_membership'
        AND s.is_test_mode = false
        AND s.created_at <= NOW()
        AND s.created_at > NOW() - INTERVAL '2 hours'
        AND u.email IS NOT NULL
        AND u.email != ''
        AND el.id IS NULL
      ORDER BY s.created_at ASC
    `

    results.day0.found = day0Users.length
    console.log(`[v0] [CRON] Found ${day0Users.length} users for Day 0 onboarding email`)

    if (day0Users.length > 0) {
      try {
        if (!MARKETING_SEGMENTS.onboardingDay0) {
          throw new Error("RESEND_SEGMENT_ONBOARDING_DAY_0 not configured")
        }

        const contacts = day0Users.map((user: any) => ({
          email: user.email,
          firstName: user.display_name?.split(" ")[0],
        }))

        const emailContent = generateOnboardingDay0Email({
          firstName: FIRST_NAME_PLACEHOLDER,
        })

        await enqueueAndProcessMarketingRun({
          sequenceKey: "onboarding-day-0",
          emailType: "onboarding-day-0",
          tagKey: "sequence_onboarding_day_0",
          segmentId: MARKETING_SEGMENTS.onboardingDay0,
          campaignKey: "onboarding-day-0",
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
          recipients: contacts,
        })

        results.day0.sent = day0Users.length
      } catch (error: any) {
        results.day0.failed = day0Users.length
        results.errors.push({
          email: "broadcast",
          day: 0,
          error: error.message || "Unknown error",
        })
        console.error("[v0] [CRON] ❌ Failed to send Day 0 onboarding broadcast:", error)
        await logAdminError({
          toolName: "cron:onboarding-sequence:day-0",
          error: error instanceof Error ? error : new Error(error.message || "Unknown error"),
          context: { recipients: day0Users.length },
        }).catch(() => {})
      }
    }

    // Onboarding Email Sequence Automation - Day 2 emails: subscription created ~2 days ago (cap window to avoid very-late sends)
    const day2Users = await sql`
      SELECT DISTINCT 
        u.id,
        u.email,
        u.display_name,
        s.created_at as subscription_created_at
      FROM users u
      INNER JOIN subscriptions s ON u.id = s.user_id::varchar
      LEFT JOIN email_logs el ON el.user_email = u.email
        AND el.email_type = 'onboarding-day-2'
        AND (
          el.status IN ('sent', 'delivered')
          OR (el.status = 'queued' AND el.sent_at > NOW() - INTERVAL '2 hours')
        )
      WHERE s.status = 'active'
        AND s.product_type = 'sselfie_studio_membership'
        AND s.is_test_mode = false
        AND s.created_at <= NOW() - INTERVAL '2 days'
        AND s.created_at > NOW() - INTERVAL '10 days'
        AND u.email IS NOT NULL
        AND u.email != ''
        AND el.id IS NULL
      ORDER BY s.created_at ASC
    `

    results.day2.found = day2Users.length
    console.log(`[v0] [CRON] Found ${day2Users.length} users for Day 2 onboarding email`)

    if (day2Users.length > 0) {
      try {
        if (!MARKETING_SEGMENTS.onboardingDay2) {
          throw new Error("RESEND_SEGMENT_ONBOARDING_DAY_2 not configured")
        }

        const contacts = day2Users.map((user: any) => ({
          email: user.email,
          firstName: user.display_name?.split(" ")[0],
        }))

        const emailContent = generateOnboardingDay2Email({
          firstName: FIRST_NAME_PLACEHOLDER,
        })

        await enqueueAndProcessMarketingRun({
          sequenceKey: "onboarding-day-2",
          emailType: "onboarding-day-2",
          tagKey: "sequence_onboarding_day_2",
          segmentId: MARKETING_SEGMENTS.onboardingDay2,
          campaignKey: "onboarding-day-2",
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
          recipients: contacts,
        })

        results.day2.sent = day2Users.length
      } catch (error: any) {
        results.day2.failed = day2Users.length
        results.errors.push({
          email: "broadcast",
          day: 2,
          error: error.message || "Unknown error",
        })
        console.error("[v0] [CRON] ❌ Failed to send Day 2 onboarding broadcast:", error)
        await logAdminError({
          toolName: "cron:onboarding-sequence:day-2",
          error: error instanceof Error ? error : new Error(error.message || "Unknown error"),
          context: { recipients: day2Users.length },
        }).catch(() => {})
      }
    }

    // Onboarding Email Sequence Automation - Day 7 emails: subscription created ~7 days ago (cap window to avoid very-late sends)
    const day7Users = await sql`
      SELECT DISTINCT 
        u.id,
        u.email,
        u.display_name,
        s.created_at as subscription_created_at
      FROM users u
      INNER JOIN subscriptions s ON u.id = s.user_id::varchar
      LEFT JOIN email_logs el ON el.user_email = u.email
        AND el.email_type = 'onboarding-day-7'
        AND (
          el.status IN ('sent', 'delivered')
          OR (el.status = 'queued' AND el.sent_at > NOW() - INTERVAL '2 hours')
        )
      WHERE s.status = 'active'
        AND s.product_type = 'sselfie_studio_membership'
        AND s.is_test_mode = false
        AND s.created_at <= NOW() - INTERVAL '7 days'
        AND s.created_at > NOW() - INTERVAL '21 days'
        AND u.email IS NOT NULL
        AND u.email != ''
        AND el.id IS NULL
      ORDER BY s.created_at ASC
    `

    results.day7.found = day7Users.length
    console.log(`[v0] [CRON] Found ${day7Users.length} users for Day 7 onboarding email`)

    if (day7Users.length > 0) {
      try {
        if (!MARKETING_SEGMENTS.onboardingDay7) {
          throw new Error("RESEND_SEGMENT_ONBOARDING_DAY_7 not configured")
        }

        const contacts = day7Users.map((user: any) => ({
          email: user.email,
          firstName: user.display_name?.split(" ")[0],
        }))

        const emailContent = generateOnboardingDay7Email({
          firstName: FIRST_NAME_PLACEHOLDER,
        })

        await enqueueAndProcessMarketingRun({
          sequenceKey: "onboarding-day-7",
          emailType: "onboarding-day-7",
          tagKey: "sequence_onboarding_day_7",
          segmentId: MARKETING_SEGMENTS.onboardingDay7,
          campaignKey: "onboarding-day-7",
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
          recipients: contacts,
        })

        results.day7.sent = day7Users.length
      } catch (error: any) {
        results.day7.failed = day7Users.length
        results.errors.push({
          email: "broadcast",
          day: 7,
          error: error.message || "Unknown error",
        })
        console.error("[v0] [CRON] ❌ Failed to send Day 7 onboarding broadcast:", error)
        await logAdminError({
          toolName: "cron:onboarding-sequence:day-7",
          error: error instanceof Error ? error : new Error(error.message || "Unknown error"),
          context: { recipients: day7Users.length },
        }).catch(() => {})
      }
    }

    // Behavioral nudge: users created 24–48h ago who have bonus credits but zero image generations.
    // Fires regardless of subscription status — targets free users who never activated.
    // Idempotency: email_logs guard with email_type = 'welcome-first-generation-nudge'.
    const firstGenNudgeUsers = await sql`
      SELECT DISTINCT
        u.id,
        u.email,
        u.display_name
      FROM users u
      WHERE u.created_at BETWEEN NOW() - INTERVAL '48 hours' AND NOW() - INTERVAL '24 hours'
        AND u.email IS NOT NULL
        AND u.email != ''
        AND EXISTS (
          SELECT 1 FROM credit_transactions ct
          WHERE ct.user_id = u.id AND ct.transaction_type = 'bonus'
        )
        AND NOT EXISTS (
          SELECT 1 FROM generated_images gi WHERE gi.user_id = u.id
        )
        AND NOT EXISTS (
          SELECT 1 FROM ai_images ai
          WHERE ai.user_id = u.id
            AND (
              (ai.image_url IS NOT NULL AND ai.image_url <> '')
              OR ai.generation_status IN ('completed', 'succeeded', 'ready')
            )
        )
        AND NOT EXISTS (
          SELECT 1 FROM email_logs el
          WHERE el.user_email = u.email
            AND el.email_type = 'welcome-first-generation-nudge'
        )
      ORDER BY u.created_at DESC
    `

    results.firstGenNudge.found = firstGenNudgeUsers.length
    console.log(`[v0] [CRON] Found ${firstGenNudgeUsers.length} users for first-generation nudge email`)

    for (const user of firstGenNudgeUsers as any[]) {
      try {
        const firstName = user.display_name?.split(" ")[0] || undefined
        const emailContent = generateWelcomeFirstGenerationFollowupEmail({ firstName })

        const result = await sendEmail({
          to: user.email,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
          emailType: "welcome-first-generation-nudge",
          replyTo: "hello@sselfie.ai",
          tags: ["lifecycle", "first-gen-nudge"],
        })

        if (result.success) {
          results.firstGenNudge.sent++
          console.log(`[v0] [CRON] ✅ First-gen nudge sent to ${user.email}`)
        } else {
          results.firstGenNudge.failed++
          results.errors.push({ email: user.email, day: "first-gen-nudge", error: result.error || "unknown" })
          console.error(`[v0] [CRON] ❌ First-gen nudge failed for ${user.email}:`, result.error)
        }
      } catch (err: any) {
        results.firstGenNudge.failed++
        results.errors.push({ email: user.email, day: "first-gen-nudge", error: err.message || "unknown" })
        console.error(`[v0] [CRON] ❌ First-gen nudge exception for ${user.email}:`, err)
      }
      // Rate-limit: 150ms between sends to respect Resend limits
      await new Promise((r) => setTimeout(r, 150))
    }

    // Post-activation upgrade email: users who generated their first image 20-28h ago
    // but don't yet have a Studio subscription.
    // Idempotency: email_logs guard with email_type = 'post-activation-upgrade'.
    const postActivationUsers = await sql`
      SELECT DISTINCT
        u.id,
        u.email,
        u.display_name,
        (
          SELECT gi.selected_url FROM generated_images gi
          WHERE gi.user_id = u.id
            AND gi.selected_url IS NOT NULL
            AND gi.selected_url <> ''
          ORDER BY gi.created_at ASC
          LIMIT 1
        ) AS first_image_url
      FROM users u
      WHERE u.email IS NOT NULL
        AND u.email != ''
        AND EXISTS (
          SELECT 1 FROM generated_images gi
          WHERE gi.user_id = u.id
            AND gi.created_at BETWEEN NOW() - INTERVAL '28 hours' AND NOW() - INTERVAL '20 hours'
        )
        AND NOT EXISTS (
          SELECT 1 FROM subscriptions s
          WHERE s.user_id = u.id
            AND s.product_type = 'sselfie_studio_membership'
            AND s.status = 'active'
        )
        AND NOT EXISTS (
          SELECT 1 FROM email_logs el
          WHERE el.user_email = u.email
            AND el.email_type = 'post-activation-upgrade'
        )
      ORDER BY u.created_at DESC
      LIMIT 50
    `

    results.postActivation.found = postActivationUsers.length
    console.log(`[v0] [CRON] Found ${postActivationUsers.length} users for post-activation upgrade email`)

    for (const user of postActivationUsers as any[]) {
      try {
        const firstName = user.display_name?.split(" ")[0] || undefined
        const emailContent = generatePostActivationUpgradeEmail({
          firstName,
          generatedImageUrl: user.first_image_url || null,
        })

        const result = await sendEmail({
          to: user.email,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
          emailType: "post-activation-upgrade",
          replyTo: "hello@sselfie.ai",
          tags: ["lifecycle", "post-activation-upgrade"],
        })

        if (result.success) {
          results.postActivation.sent++
          console.log(`[v0] [CRON] ✅ Post-activation upgrade sent to ${user.email}`)
        } else {
          results.postActivation.failed++
          results.errors.push({ email: user.email, day: "post-activation", error: result.error || "unknown" })
          console.error(`[v0] [CRON] ❌ Post-activation upgrade failed for ${user.email}:`, result.error)
        }
      } catch (err: any) {
        results.postActivation.failed++
        results.errors.push({ email: user.email, day: "post-activation", error: err.message || "unknown" })
        console.error(`[v0] [CRON] ❌ Post-activation upgrade exception for ${user.email}:`, err)
      }
      await new Promise((r) => setTimeout(r, 150))
    }

    const totalSent = results.day0.sent + results.day2.sent + results.day7.sent + results.firstGenNudge.sent + results.postActivation.sent
    const totalFailed = results.day0.failed + results.day2.failed + results.day7.failed + results.firstGenNudge.failed + results.postActivation.failed
    const totalSkipped = results.day0.skipped + results.day2.skipped + results.day7.skipped

    console.log(
      `[v0] [CRON] Onboarding sequence completed: ${totalSent} sent, ${totalFailed} failed, ${totalSkipped} skipped`,
    )

    await cronLogger.success({
      day0Sent: results.day0.sent,
      day0Failed: results.day0.failed,
      day0Skipped: results.day0.skipped,
      day2Sent: results.day2.sent,
      day2Failed: results.day2.failed,
      day2Skipped: results.day2.skipped,
      day7Sent: results.day7.sent,
      day7Failed: results.day7.failed,
      day7Skipped: results.day7.skipped,
      firstGenNudgeSent: results.firstGenNudge.sent,
      firstGenNudgeFailed: results.firstGenNudge.failed,
      postActivationSent: results.postActivation.sent,
      postActivationFailed: results.postActivation.failed,
      totalSent,
      totalFailed,
      totalSkipped,
    })

    return NextResponse.json({
      success: true,
      message: `Onboarding emails sent: ${totalSent} successful, ${totalFailed} failed, ${totalSkipped} skipped`,
      summary: {
        day0: results.day0,
        day2: results.day2,
        day7: results.day7,
        firstGenNudge: results.firstGenNudge,
        postActivation: results.postActivation,
        totalSent,
        totalFailed,
        totalSkipped,
      },
      errors: results.errors.slice(0, 10), // Limit errors in response
      totalErrors: results.errors.length,
    })
  } catch (error: any) {
    console.error("[v0] [CRON] Error in onboarding sequence cron:", error)
    await cronLogger.error(error, {})
    await logAdminError({
      toolName: "cron:onboarding-sequence",
      error: error instanceof Error ? error : new Error(String(error)),
      context: {},
    }).catch(() => {})
    return NextResponse.json(
      {
        success: false,
        error: "Failed to run onboarding sequence cron",
        details: error.message || "Unknown error",
      },
      { status: 500 },
    )
  }
}
