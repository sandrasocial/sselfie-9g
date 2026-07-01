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
import { generateFreeUserDay5Email } from "@/lib/email/templates/free-user-day5"
import { generateFreeUserDay10Email } from "@/lib/email/templates/free-user-day10"
import { logAdminError } from "@/lib/admin-error-log"
import { EMAIL_CONFIG } from "@/lib/email/config"

/**
 * Onboarding Sequence - direct per-member sends (BRIDGE-01, 2026-06-11)
 *
 * Sends onboarding emails to new Studio members via direct Resend sends.
 * Previously used the Broadcast API with RESEND_SEGMENT_ONBOARDING_DAY_* env vars;
 * those were never configured in production, which 503'd this entire route daily
 * and silently blocked ALL lifecycle emails below, not just Day 0/2/7.
 *
 * GET /api/cron/onboarding-sequence
 *
 * Protected by CRON_SECRET environment variable
 * Runs daily at 10 AM UTC (same as other email sequences)
 *
 * Logic:
 * - Targets users with active Studio subscriptions
 * - Uses subscription.created_at to determine days since joining Studio
 * - Idempotency via email_logs (sendEmail writes the row when emailType is set)
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

    console.log("[v0] [CRON] Starting onboarding email sequence...")

    const results = {
      day0: { found: 0, sent: 0, failed: 0, skipped: 0 },
      day2: { found: 0, sent: 0, failed: 0, skipped: 0 },
      day7: { found: 0, sent: 0, failed: 0, skipped: 0 },
      firstGenNudge: { found: 0, sent: 0, failed: 0 },
      postActivation: { found: 0, sent: 0, failed: 0 },
      freeWelcome: { found: 0, sent: 0, failed: 0 },
      freeDay5: { found: 0, sent: 0, failed: 0 },
      freeDay10: { found: 0, sent: 0, failed: 0 },
      errors: [] as Array<{ email: string; day: number | string; error: string }>,
    }

    // Onboarding Email Sequence Automation - Day 0 emails: subscription created in last 24 hours.
    // 24h window (not 2h) so Studio members are caught regardless of what time they subscribed.
    // Idempotency is handled by the email_logs LEFT JOIN - if the row exists we skip.
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
          el.status IN ('sent', 'delivered', 'suppressed')
          OR (el.status = 'queued' AND el.sent_at > NOW() - INTERVAL '24 hours')
        )
      WHERE s.status = 'active'
        AND s.product_type = 'sselfie_studio_membership'
        AND s.is_test_mode = false
        AND s.created_at <= NOW()
        AND s.created_at > NOW() - INTERVAL '24 hours'
        AND u.email IS NOT NULL
        AND u.email != ''
        AND el.id IS NULL
      ORDER BY subscription_created_at ASC
    `

    results.day0.found = day0Users.length
    console.log(`[v0] [CRON] Found ${day0Users.length} users for Day 0 onboarding email`)

    for (const user of day0Users as any[]) {
      try {
        const firstName = user.display_name?.split(" ")[0] || undefined
        const emailContent = generateOnboardingDay0Email({ firstName })

        const result = await sendEmail({
          to: user.email,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
          emailType: "onboarding-day-0",
          from: EMAIL_CONFIG.marketing.from,
          replyTo: EMAIL_CONFIG.marketing.replyTo,
          tags: ["lifecycle", "onboarding-day-0"],
          marketing: true,
        })

        if (result.success) {
          results.day0.sent++
          console.log(`[v0] [CRON] ✅ Day 0 onboarding sent to ${user.email}`)
        } else {
          results.day0.failed++
          results.errors.push({ email: user.email, day: 0, error: result.error || "unknown" })
          console.error(`[v0] [CRON] ❌ Day 0 onboarding failed for ${user.email}:`, result.error)
        }
      } catch (err: any) {
        results.day0.failed++
        results.errors.push({ email: user.email, day: 0, error: err.message || "unknown" })
        console.error(`[v0] [CRON] ❌ Day 0 onboarding exception for ${user.email}:`, err)
      }
      // Rate-limit: 150ms between sends to respect Resend limits
      await new Promise((r) => setTimeout(r, 150))
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
          el.status IN ('sent', 'delivered', 'suppressed')
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
      ORDER BY subscription_created_at ASC
    `

    results.day2.found = day2Users.length
    console.log(`[v0] [CRON] Found ${day2Users.length} users for Day 2 onboarding email`)

    for (const user of day2Users as any[]) {
      try {
        const firstName = user.display_name?.split(" ")[0] || undefined
        const emailContent = generateOnboardingDay2Email({ firstName })

        const result = await sendEmail({
          to: user.email,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
          emailType: "onboarding-day-2",
          from: EMAIL_CONFIG.marketing.from,
          replyTo: EMAIL_CONFIG.marketing.replyTo,
          tags: ["lifecycle", "onboarding-day-2"],
          marketing: true,
        })

        if (result.success) {
          results.day2.sent++
          console.log(`[v0] [CRON] ✅ Day 2 onboarding sent to ${user.email}`)
        } else {
          results.day2.failed++
          results.errors.push({ email: user.email, day: 2, error: result.error || "unknown" })
          console.error(`[v0] [CRON] ❌ Day 2 onboarding failed for ${user.email}:`, result.error)
        }
      } catch (err: any) {
        results.day2.failed++
        results.errors.push({ email: user.email, day: 2, error: err.message || "unknown" })
        console.error(`[v0] [CRON] ❌ Day 2 onboarding exception for ${user.email}:`, err)
      }
      await new Promise((r) => setTimeout(r, 150))
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
          el.status IN ('sent', 'delivered', 'suppressed')
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
      ORDER BY subscription_created_at ASC
    `

    results.day7.found = day7Users.length
    console.log(`[v0] [CRON] Found ${day7Users.length} users for Day 7 onboarding email`)

    for (const user of day7Users as any[]) {
      try {
        const firstName = user.display_name?.split(" ")[0] || undefined
        const emailContent = generateOnboardingDay7Email({ firstName })

        const result = await sendEmail({
          to: user.email,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
          emailType: "onboarding-day-7",
          from: EMAIL_CONFIG.marketing.from,
          replyTo: EMAIL_CONFIG.marketing.replyTo,
          tags: ["lifecycle", "onboarding-day-7"],
          marketing: true,
        })

        if (result.success) {
          results.day7.sent++
          console.log(`[v0] [CRON] ✅ Day 7 onboarding sent to ${user.email}`)
        } else {
          results.day7.failed++
          results.errors.push({ email: user.email, day: 7, error: result.error || "unknown" })
          console.error(`[v0] [CRON] ❌ Day 7 onboarding failed for ${user.email}:`, result.error)
        }
      } catch (err: any) {
        results.day7.failed++
        results.errors.push({ email: user.email, day: 7, error: err.message || "unknown" })
        console.error(`[v0] [CRON] ❌ Day 7 onboarding exception for ${user.email}:`, err)
      }
      await new Promise((r) => setTimeout(r, 150))
    }

    // Behavioral nudge: users created 24–48h ago who have zero image generations.
    // Fires regardless of subscription status - targets any user (free or paid) who has
    // not yet made their first photo. No longer gated on credit_transactions bonus rows,
    // since free signups may receive bonus credits through a direct balance update rather
    // than via a credit_transactions row.
    // Idempotency: email_logs guard with email_type = 'welcome-first-generation-nudge'.
    const firstGenNudgeUsers = await sql`
      SELECT DISTINCT
        u.id,
        u.email,
        u.display_name,
        u.created_at
      FROM users u
      WHERE u.created_at BETWEEN NOW() - INTERVAL '48 hours' AND NOW() - INTERVAL '24 hours'
        AND u.email IS NOT NULL
        AND u.email != ''
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
          from: EMAIL_CONFIG.marketing.from,
          replyTo: EMAIL_CONFIG.marketing.replyTo,
          tags: ["lifecycle", "first-gen-nudge"],
          marketing: true,
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
        u.created_at,
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
          from: EMAIL_CONFIG.marketing.from,
          replyTo: EMAIL_CONFIG.marketing.replyTo,
          tags: ["lifecycle", "post-activation-upgrade"],
          marketing: true,
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

    // Free user Day 0 welcome: new signups (0–24h) who are not Studio members and have not
    // already received a purchase-confirmation email (Selfie Guide, Blueprint, etc.).
    // This closes the gap where free signups received no email after March 9 cleanup.
    // Idempotency: email_logs guard with email_type = 'free-user-welcome-day0'.
    const freeWelcomeUsers = await sql`
      SELECT DISTINCT
        u.id,
        u.email,
        u.display_name,
        u.created_at
      FROM users u
      WHERE u.created_at >= NOW() - INTERVAL '24 hours'
        AND u.email IS NOT NULL
        AND u.email != ''
        AND NOT EXISTS (
          SELECT 1 FROM subscriptions s
          WHERE s.user_id = u.id
            AND s.product_type = 'sselfie_studio_membership'
            AND s.status = 'active'
        )
        AND NOT EXISTS (
          SELECT 1 FROM email_logs el
          WHERE el.user_email = u.email
            AND el.email_type IN (
              'free-user-welcome-day0',
              'selfie-guide-activation-day0',
              'selfie_guide_delivery',
              'paid-blueprint-delivery',
              'onboarding-day-0'
            )
        )
      ORDER BY u.created_at DESC
    `

    results.freeWelcome.found = freeWelcomeUsers.length
    console.log(`[v0] [CRON] Found ${freeWelcomeUsers.length} free users for Day 0 welcome email`)

    for (const user of freeWelcomeUsers as any[]) {
      try {
        const firstName = user.display_name?.split(" ")[0] || undefined
        const emailContent = generateWelcomeFirstGenerationFollowupEmail({ firstName })

        const result = await sendEmail({
          to: user.email,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
          emailType: "free-user-welcome-day0",
          from: EMAIL_CONFIG.marketing.from,
          replyTo: EMAIL_CONFIG.marketing.replyTo,
          tags: ["lifecycle", "free-welcome-day0"],
          marketing: true,
        })

        if (result.success) {
          results.freeWelcome.sent++
          console.log(`[v0] [CRON] ✅ Free user Day 0 welcome sent to ${user.email}`)
        } else {
          results.freeWelcome.failed++
          results.errors.push({ email: user.email, day: "free-welcome-day0", error: result.error || "unknown" })
          console.error(`[v0] [CRON] ❌ Free user Day 0 welcome failed for ${user.email}:`, result.error)
        }
      } catch (err: any) {
        results.freeWelcome.failed++
        results.errors.push({ email: user.email, day: "free-welcome-day0", error: err.message || "unknown" })
        console.error(`[v0] [CRON] ❌ Free user Day 0 welcome exception for ${user.email}:`, err)
      }
      await new Promise((r) => setTimeout(r, 150))
    }

    // ── Free user Day 5: signed up 5-15 days ago, not subscribed, no day-5 email yet ──
    const freeDay5Users = await sql`
      SELECT DISTINCT
        u.id,
        u.email,
        u.display_name,
        u.created_at
      FROM users u
      WHERE u.created_at <= NOW() - INTERVAL '5 days'
        AND u.created_at > NOW() - INTERVAL '15 days'
        AND u.email IS NOT NULL
        AND u.email != ''
        AND NOT EXISTS (
          SELECT 1 FROM subscriptions s
          WHERE s.user_id = u.id
            AND s.product_type = 'sselfie_studio_membership'
            AND s.status IN ('active', 'trialing')
        )
        AND NOT EXISTS (
          SELECT 1 FROM email_logs el
          WHERE el.user_email = u.email
            AND el.email_type = 'free-user-day5'
        )
      ORDER BY u.created_at DESC
      LIMIT 100
    `

    results.freeDay5.found = freeDay5Users.length
    console.log(`[v0] [CRON] Found ${freeDay5Users.length} free users for Day 5 email`)

    for (const user of freeDay5Users as any[]) {
      try {
        const firstName = user.display_name?.split(" ")[0] || undefined
        const emailContent = generateFreeUserDay5Email({ firstName })

        const result = await sendEmail({
          to: user.email,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
          emailType: "free-user-day5",
          from: EMAIL_CONFIG.marketing.from,
          replyTo: EMAIL_CONFIG.marketing.replyTo,
          tags: ["lifecycle", "free-day5"],
          marketing: true,
        })

        if (result.success) {
          results.freeDay5.sent++
          console.log(`[v0] [CRON] ✅ Free user Day 5 sent to ${user.email}`)
        } else {
          results.freeDay5.failed++
          results.errors.push({ email: user.email, day: "free-day5", error: result.error || "unknown" })
          console.error(`[v0] [CRON] ❌ Free user Day 5 failed for ${user.email}:`, result.error)
        }
      } catch (err: any) {
        results.freeDay5.failed++
        results.errors.push({ email: user.email, day: "free-day5", error: err.message || "unknown" })
        console.error(`[v0] [CRON] ❌ Free user Day 5 exception for ${user.email}:`, err)
      }
      await new Promise((r) => setTimeout(r, 150))
    }

    // ── Free user Day 10: signed up 10-25 days ago, not subscribed, no day-10 email yet ──
    const freeDay10Users = await sql`
      SELECT DISTINCT
        u.id,
        u.email,
        u.display_name,
        u.created_at
      FROM users u
      WHERE u.created_at <= NOW() - INTERVAL '10 days'
        AND u.created_at > NOW() - INTERVAL '25 days'
        AND u.email IS NOT NULL
        AND u.email != ''
        AND NOT EXISTS (
          SELECT 1 FROM subscriptions s
          WHERE s.user_id = u.id
            AND s.product_type = 'sselfie_studio_membership'
            AND s.status IN ('active', 'trialing')
        )
        AND NOT EXISTS (
          SELECT 1 FROM email_logs el
          WHERE el.user_email = u.email
            AND el.email_type = 'free-user-day10'
        )
      ORDER BY u.created_at DESC
      LIMIT 100
    `

    results.freeDay10.found = freeDay10Users.length
    console.log(`[v0] [CRON] Found ${freeDay10Users.length} free users for Day 10 email`)

    for (const user of freeDay10Users as any[]) {
      try {
        const firstName = user.display_name?.split(" ")[0] || undefined
        const emailContent = generateFreeUserDay10Email({ firstName })

        const result = await sendEmail({
          to: user.email,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
          emailType: "free-user-day10",
          from: EMAIL_CONFIG.marketing.from,
          replyTo: EMAIL_CONFIG.marketing.replyTo,
          tags: ["lifecycle", "free-day10"],
          marketing: true,
        })

        if (result.success) {
          results.freeDay10.sent++
          console.log(`[v0] [CRON] ✅ Free user Day 10 sent to ${user.email}`)
        } else {
          results.freeDay10.failed++
          results.errors.push({ email: user.email, day: "free-day10", error: result.error || "unknown" })
          console.error(`[v0] [CRON] ❌ Free user Day 10 failed for ${user.email}:`, result.error)
        }
      } catch (err: any) {
        results.freeDay10.failed++
        results.errors.push({ email: user.email, day: "free-day10", error: err.message || "unknown" })
        console.error(`[v0] [CRON] ❌ Free user Day 10 exception for ${user.email}:`, err)
      }
      await new Promise((r) => setTimeout(r, 150))
    }

    const totalSent = results.day0.sent + results.day2.sent + results.day7.sent + results.firstGenNudge.sent + results.postActivation.sent + results.freeWelcome.sent + results.freeDay5.sent + results.freeDay10.sent
    const totalFailed = results.day0.failed + results.day2.failed + results.day7.failed + results.firstGenNudge.failed + results.postActivation.failed + results.freeWelcome.failed + results.freeDay5.failed + results.freeDay10.failed
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
      freeWelcomeSent: results.freeWelcome.sent,
      freeWelcomeFailed: results.freeWelcome.failed,
      freeDay5Sent: results.freeDay5.sent,
      freeDay5Failed: results.freeDay5.failed,
      freeDay10Sent: results.freeDay10.sent,
      freeDay10Failed: results.freeDay10.failed,
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
        freeWelcome: results.freeWelcome,
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
