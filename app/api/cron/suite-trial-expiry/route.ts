// BRIDGE-01 Phase D - SUITE trial lifecycle cron (daily).
//
// 1. No-first-image nudge for active trials 36h+ in with no trial_first_generation.
// 2. Day-5 reminder ("2 days left") to active trials ending within 2 days.
// 3. TRIAL-CAP-01 (env-gated TRIAL_CAP_UPGRADE_EMAIL_ENABLED): one-time upgrade email the
//    moment a trial has burned the full 20-credit grant. Non-members only.
// 4. Expiry: flips overdue suite_trial rows to status='expired', zeroes the unspent part
//    of the 20-credit trial grant (credit_transactions type 'trial_expiry'), and sends the
//    trial-ended email.
//
// Idempotency: emails via email_logs (sendEmail writes the row when emailType is set,
// and we pre-check); the status flip and credit zeroing only ever run once per row
// because the WHERE clause requires status='active'.

import { NextResponse } from "next/server"
import { sql } from "@/lib/db/client"
import { sendEmail } from "@/lib/email/send-email"
import { createCronLogger } from "@/lib/cron-logger"
import {
  generateTrialCapUpgradeEmail,
  generateTrialDay3Email,
  generateTrialDay5Email,
  generateTrialEndedEmail,
  generateTrialNoFirstImageEmail,
  TRIAL_CAP_UPGRADE_EMAIL_TYPE,
  TRIAL_DAY3_EMAIL_TYPE,
} from "@/lib/email/templates/suite-trial"
import { TRIAL_CREDITS } from "@/lib/trial/suite-trial"
import { logAnalyticsEvent } from "@/lib/analytics/events"
import { EMAIL_CONFIG } from "@/lib/email/config"

export const dynamic = "force-dynamic"
export const maxDuration = 120

async function alreadyEmailed(email: string, emailType: string): Promise<boolean> {
  const rows = await sql`
    SELECT 1 FROM email_logs
    WHERE user_email = ${email}
      AND email_type = ${emailType}
      AND status IN ('sent', 'delivered')
    LIMIT 1
  `
  return rows.length > 0
}

export async function GET(request: Request) {
  const cronLogger = createCronLogger("suite-trial-expiry")
  await cronLogger.start()

  try {
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET
    const isProduction = process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production"

    if (isProduction) {
      if (!cronSecret) {
        await cronLogger.error(new Error("Unauthorized"), { reason: "CRON_SECRET not set in production" })
        return NextResponse.json({ error: "Unauthorized: CRON_SECRET required in production" }, { status: 401 })
      }
      if (authHeader !== `Bearer ${cronSecret}`) {
        await cronLogger.error(new Error("Unauthorized"), { reason: "Invalid CRON_SECRET" })
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    }

    const results = {
      noFirstImage: { sent: 0, failed: 0, skipped: 0 },
      day3: { sent: 0, failed: 0, skipped: 0 },
      day5: { sent: 0, failed: 0, skipped: 0 },
      trialCap: { enabled: false, sent: 0, failed: 0, skipped: 0 },
      expired: { flipped: 0, creditsZeroed: 0, emailed: 0, failed: 0 },
    }

    // ── Day 1.5-2 activation nudge: active trials that have not made their first image ──
    const noFirstImageTrials = await sql`
      SELECT s.user_id, u.email, u.display_name
      FROM subscriptions s
      JOIN users u ON u.id = s.user_id
      WHERE s.product_type = 'suite_trial'
        AND s.status = 'active'
        AND s.created_at <= NOW() - INTERVAL '36 hours'
        AND s.trial_ends_at > NOW() + INTERVAL '2 days'
        AND u.email IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM analytics_events ae
          WHERE ae.user_id = s.user_id::text
            AND ae.event_name = 'trial_first_generation'
          LIMIT 1
        )
    `

    for (const trial of noFirstImageTrials) {
      try {
        if (await alreadyEmailed(trial.email, "suite_trial_no_first_image")) {
          results.noFirstImage.skipped++
          continue
        }
        const email = generateTrialNoFirstImageEmail({
          customerName: trial.display_name,
          customerEmail: trial.email,
        })
        const result = await sendEmail({
          to: trial.email,
          subject: email.subject,
          html: email.html,
          text: email.text,
          emailType: "suite_trial_no_first_image",
          from: EMAIL_CONFIG.marketing.from,
          replyTo: EMAIL_CONFIG.marketing.replyTo,
          tags: ["suite-trial", "no-first-image"],
          marketing: true,
        })
        if (result.success) results.noFirstImage.sent++
        else results.noFirstImage.failed++
        await new Promise((r) => setTimeout(r, 150))
      } catch (e) {
        console.error(`[suite-trial-expiry] no-first-image send failed for ${trial.email}:`, e)
        results.noFirstImage.failed++
      }
    }

    // ── Day-3 momentum: active trials 3+ days in that DID make their first image get the
    //    "post one today" email. Mirror image of the no-first-image nudge: activated women
    //    previously heard nothing between first photo and "2 days left". Excludes trials
    //    ending within 2 days (the day-5 email owns that window) so nobody gets both at once. ──
    const day3Trials = await sql`
      SELECT s.user_id, u.email, u.display_name
      FROM subscriptions s
      JOIN users u ON u.id = s.user_id
      WHERE s.product_type = 'suite_trial'
        AND s.status = 'active'
        AND s.created_at <= NOW() - INTERVAL '3 days'
        AND s.trial_ends_at > NOW() + INTERVAL '2 days'
        AND u.email IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM analytics_events ae
          WHERE ae.user_id = s.user_id::text
            AND ae.event_name = 'trial_first_generation'
          LIMIT 1
        )
    `

    for (const trial of day3Trials) {
      try {
        if (await alreadyEmailed(trial.email, TRIAL_DAY3_EMAIL_TYPE)) {
          results.day3.skipped++
          continue
        }
        const email = generateTrialDay3Email({
          customerName: trial.display_name,
          customerEmail: trial.email,
        })
        const result = await sendEmail({
          to: trial.email,
          subject: email.subject,
          html: email.html,
          text: email.text,
          emailType: TRIAL_DAY3_EMAIL_TYPE,
          from: EMAIL_CONFIG.marketing.from,
          replyTo: EMAIL_CONFIG.marketing.replyTo,
          tags: ["suite-trial", "day3-post-one"],
          marketing: true,
        })
        if (result.success) results.day3.sent++
        else results.day3.failed++
        await new Promise((r) => setTimeout(r, 150))
      } catch (e) {
        console.error(`[suite-trial-expiry] day-3 send failed for ${trial.email}:`, e)
        results.day3.failed++
      }
    }

    // ── Day-5 reminder: active trials ending within the next 2 days ──
    const endingSoon = await sql`
      SELECT s.user_id, s.trial_ends_at, u.email, u.display_name
      FROM subscriptions s
      JOIN users u ON u.id = s.user_id
      WHERE s.product_type = 'suite_trial'
        AND s.status = 'active'
        AND s.trial_ends_at > NOW()
        AND s.trial_ends_at <= NOW() + INTERVAL '2 days'
        AND u.email IS NOT NULL
    `

    for (const trial of endingSoon) {
      try {
        if (await alreadyEmailed(trial.email, "suite_trial_day5")) {
          results.day5.skipped++
          continue
        }
        const endsOn = new Date(trial.trial_ends_at).toLocaleDateString("en-GB", {
          month: "long",
          day: "numeric",
        })
        const email = generateTrialDay5Email({
          customerName: trial.display_name,
          customerEmail: trial.email,
          endsOn,
        })
        const result = await sendEmail({
          to: trial.email,
          subject: email.subject,
          html: email.html,
          text: email.text,
          emailType: "suite_trial_day5",
          from: EMAIL_CONFIG.marketing.from,
          replyTo: EMAIL_CONFIG.marketing.replyTo,
          tags: ["suite-trial", "day5"],
          marketing: true,
        })
        if (result.success) results.day5.sent++
        else results.day5.failed++
        await new Promise((r) => setTimeout(r, 150))
      } catch (e) {
        console.error(`[suite-trial-expiry] day-5 send failed for ${trial.email}:`, e)
        results.day5.failed++
      }
    }

    // ── TRIAL-CAP-01: credits exhausted = maximum demonstrated value. One-time upgrade
    //    email at that moment. Gated by TRIAL_CAP_UPGRADE_EMAIL_ENABLED (default OFF).
    //    Candidates: trial users (active, or recently expired for the backlog of engaged
    //    trials that burned all 20 and lapsed) who used the full trial grant and hold no
    //    active membership. The 'trial_expiry' zeroing transaction is excluded from the
    //    usage sum so expired trials don't all look exhausted. Idempotent forever per user
    //    via email_logs (status IN sent/delivered/suppressed). Rows flipping to expired in
    //    THIS run are deferred to the next run so nobody gets two emails at once. ──
    results.trialCap.enabled = process.env.TRIAL_CAP_UPGRADE_EMAIL_ENABLED === "true"
    if (results.trialCap.enabled) {
      const cappedTrials = await sql`
        SELECT s.user_id, u.email, u.display_name
        FROM subscriptions s
        JOIN users u ON u.id = s.user_id
        WHERE s.product_type = 'suite_trial'
          AND s.status IN ('active', 'expired')
          AND s.created_at > NOW() - INTERVAL '60 days'
          AND (s.status = 'expired' OR s.trial_ends_at > NOW())
          AND u.email IS NOT NULL
          AND u.email NOT ILIKE '%@sselfie.ai'
          AND COALESCE(u.display_name, '') <> 'Smoke User'
          AND NOT EXISTS (
            SELECT 1 FROM subscriptions m
            WHERE m.user_id = s.user_id
              AND m.product_type = 'sselfie_studio_membership'
              AND m.status = 'active'
            LIMIT 1
          )
          AND (
            SELECT COALESCE(ABS(SUM(ct.amount)), 0)
            FROM credit_transactions ct
            WHERE ct.user_id::text = s.user_id::text
              AND ct.amount < 0
              AND ct.transaction_type <> 'trial_expiry'
              AND ct.created_at >= (
                SELECT MIN(g.created_at) FROM credit_transactions g
                WHERE g.user_id::text = s.user_id::text AND g.transaction_type = 'trial_grant'
              )
          ) >= ${TRIAL_CREDITS}
      `

      for (const trial of cappedTrials) {
        try {
          const prior = await sql`
            SELECT 1 FROM email_logs
            WHERE LOWER(user_email) = LOWER(${trial.email})
              AND email_type = ${TRIAL_CAP_UPGRADE_EMAIL_TYPE}
              AND status IN ('sent', 'delivered', 'suppressed')
            LIMIT 1
          `
          if (prior.length > 0) {
            results.trialCap.skipped++
            continue
          }
          const email = generateTrialCapUpgradeEmail({
            customerName: trial.display_name,
            customerEmail: trial.email,
          })
          const result = await sendEmail({
            to: trial.email,
            subject: email.subject,
            html: email.html,
            text: email.text,
            emailType: TRIAL_CAP_UPGRADE_EMAIL_TYPE,
            from: EMAIL_CONFIG.marketing.from,
            replyTo: EMAIL_CONFIG.marketing.replyTo,
            tags: ["suite-trial", "trial-cap-upgrade"],
            marketing: true,
          })
          if (result.success) results.trialCap.sent++
          else results.trialCap.failed++
          await new Promise((r) => setTimeout(r, 150))
        } catch (e) {
          console.error(`[suite-trial-expiry] trial-cap send failed for ${trial.email}:`, e)
          results.trialCap.failed++
        }
      }
    }

    // ── Expiry: flip overdue rows, zero unspent trial credits, send the ended email ──
    const overdue = await sql`
      UPDATE subscriptions s
      SET status = 'expired', updated_at = NOW()
      FROM users u
      WHERE u.id = s.user_id
        AND s.product_type = 'suite_trial'
        AND s.status = 'active'
        AND s.trial_ends_at <= NOW()
      RETURNING s.user_id, u.email, u.display_name
    `
    results.expired.flipped = overdue.length

    for (const trial of overdue) {
      const userId = String(trial.user_id)
      try {
        // Zero the unspent part of the trial grant: usage since the grant counts against
        // the 20, and we never take more than the current balance (top-ups stay hers).
        const usageRows = await sql`
          SELECT COALESCE(ABS(SUM(amount)), 0) AS used
          FROM credit_transactions
          WHERE user_id = ${userId}
            AND amount < 0
            AND created_at >= (
              SELECT MIN(created_at) FROM credit_transactions
              WHERE user_id = ${userId} AND transaction_type = 'trial_grant'
            )
        `
        const used = Number(usageRows[0]?.used || 0)
        const unspent = Math.max(0, TRIAL_CREDITS - used)
        if (unspent > 0) {
          const updated = await sql`
            UPDATE user_credits
            SET balance = GREATEST(0, balance - ${unspent}), updated_at = NOW()
            WHERE user_id = ${userId}
            RETURNING balance
          `
          if (updated.length > 0) {
            await sql`
              INSERT INTO credit_transactions (
                user_id, amount, transaction_type, description, balance_after, is_test_mode, created_at
              )
              VALUES (
                ${userId}, ${-unspent}, 'trial_expiry', 'SUITE trial ended: unused trial credits removed',
                ${Number(updated[0].balance)}, FALSE, NOW()
              )
            `
            results.expired.creditsZeroed++
            try {
              const { invalidateCreditCache } = await import("@/lib/credits-cached")
              await invalidateCreditCache(userId)
            } catch {
              /* cache only */
            }
          }
        }

        await logAnalyticsEvent({
          eventName: "trial_expired",
          userId,
          properties: { source: "suite-trial-expiry-cron" },
        }).catch(() => {})

        if (trial.email && !(await alreadyEmailed(trial.email, "suite_trial_ended"))) {
          const email = generateTrialEndedEmail({
            customerName: trial.display_name,
            customerEmail: trial.email,
          })
          const result = await sendEmail({
            to: trial.email,
            subject: email.subject,
            html: email.html,
            text: email.text,
            emailType: "suite_trial_ended",
            from: EMAIL_CONFIG.marketing.from,
            replyTo: EMAIL_CONFIG.marketing.replyTo,
            tags: ["suite-trial", "ended"],
            marketing: true,
          })
          if (result.success) results.expired.emailed++
          else results.expired.failed++
          await new Promise((r) => setTimeout(r, 150))
        }
      } catch (e) {
        console.error(`[suite-trial-expiry] expiry handling failed for user ${userId}:`, e)
        results.expired.failed++
      }
    }

    await cronLogger.success(results)
    return NextResponse.json({ success: true, results })
  } catch (error) {
    console.error("[suite-trial-expiry] cron failed:", error)
    await cronLogger.error(error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({ error: "Trial expiry cron failed" }, { status: 500 })
  }
}
