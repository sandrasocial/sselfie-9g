import { NextResponse } from "next/server"
import { createHash } from "node:crypto"

import { createCronLogger } from "@/lib/cron-logger"
import { sql } from "@/lib/db/client"
import { envFlag } from "@/lib/env-flags"
import { getFirstNameForEmail } from "@/lib/email/recipient-name"
import { sendEmail } from "@/lib/email/send-email"
import { createUnsubscribeToken, recordEmailUnsubscribe } from "@/lib/email/unsubscribe"
import { updateContactTags } from "@/lib/resend/manage-contact"
import {
  generateWinback1Email,
  generateWinback2Email,
  generateWinback3Email,
  generateWinback4Email,
  SUBSCRIBER_WINBACK_EMAIL_TYPES,
} from "@/lib/email/templates/subscriber-winback"

// Subscriber win-back (EMAIL-03): 4 personal notes over ~3 weeks for subscribers with no
// meaningful click activity in 60+ days, then an optional sunset (app-level unsubscribe).
//
// Engagement truth: clicked_at from lifecycle email is the explicit re-engagement signal.
// opened_at is intentionally not used as a stay signal because privacy features can generate
// opens without a human reading the message. Purchasers and active members are excluded.
// Audience is limited to people we actually send cron/lifecycle email to (>=2 sends in 90 days),
// so broadcast-only contacts are never judged inactive by this job.
//
// Gates: SUBSCRIBER_WINBACK_ENABLED (sends), SUBSCRIBER_WINBACK_SUNSET_ENABLED (suppression).
// Any click while in the sequence re-qualifies the subscriber automatically because every
// stage re-checks the same click inactivity condition.

export const dynamic = "force-dynamic"
export const maxDuration = 60

const FROM_EMAIL = "Sandra from SSELFIE <hello@sselfie.ai>"
const REPLY_TO_EMAIL = "hello@sselfie.ai"
const BATCH_LIMIT = 10
const MAX_EMAILS_PER_RUN = 20
const SUNSET_LIMIT = 10
const SEND_DELAY_MS = 650
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

type WinbackStage = {
  emailType: string
  /** Days after the previous stage's send before this one becomes eligible. */
  afterDays: number
  /** Previous stage that must have been delivered (null = sequence entry). */
  requiresEmailType: string | null
  generate: (input: { firstName: string; recipientEmail?: string | null }) => {
    subject: string
    html: string
    text: string
  }
}

const STAGES: WinbackStage[] = [
  {
    emailType: SUBSCRIBER_WINBACK_EMAIL_TYPES.reminder,
    afterDays: 0,
    requiresEmailType: null,
    generate: generateWinback1Email,
  },
  {
    emailType: SUBSCRIBER_WINBACK_EMAIL_TYPES.value,
    afterDays: 5,
    requiresEmailType: SUBSCRIBER_WINBACK_EMAIL_TYPES.reminder,
    generate: generateWinback2Email,
  },
  {
    emailType: SUBSCRIBER_WINBACK_EMAIL_TYPES.offer,
    afterDays: 7,
    requiresEmailType: SUBSCRIBER_WINBACK_EMAIL_TYPES.value,
    generate: generateWinback3Email,
  },
  {
    emailType: SUBSCRIBER_WINBACK_EMAIL_TYPES.sunset,
    afterDays: 7,
    requiresEmailType: SUBSCRIBER_WINBACK_EMAIL_TYPES.offer,
    generate: generateWinback4Email,
  },
]

/**
 * Inactive = we've mailed them (>=2 lifecycle sends in 90d, on the list 60d+) and they have
 * zero clicks in 60 days. Opens are diagnostic only. Excludes active members and anyone who
 * paid in 90d (stripe_payments - money truth), plus anyone already in this win-back round
 * (120d dedupe).
 */
function winbackIdempotencyKey(emailType: string, email: string): string {
  const recipientHash = createHash("sha256")
    .update(email.trim().toLowerCase())
    .digest("hex")
    .slice(0, 24)
  return `subscriber-winback:${emailType}:${recipientHash}`
}

async function getStageCandidates(
  stage: WinbackStage,
  limit: number
): Promise<Array<{ email: string }>> {
  return (await sql`
    WITH recipients AS (
      SELECT
        LOWER(BTRIM(user_email)) AS email,
        COUNT(*) FILTER (
          WHERE sent_at > NOW() - INTERVAL '90 days' AND status IN ('sent', 'delivered')
        ) AS recent_sends,
        MIN(sent_at) AS first_send,
        MAX(clicked_at) AS last_click
      FROM email_logs
      WHERE user_email IS NOT NULL AND BTRIM(user_email) <> ''
      GROUP BY 1
    )
    SELECT r.email
    FROM recipients r
    WHERE r.recent_sends >= 2
      AND r.first_send <= NOW() - INTERVAL '60 days'
      AND (r.last_click IS NULL OR r.last_click <= NOW() - INTERVAL '60 days')
      AND NOT EXISTS (
        SELECT 1
        FROM stripe_payments sp
        WHERE LOWER(BTRIM(sp.customer_email)) = r.email
          AND sp.status IN ('succeeded', 'paid')
          AND COALESCE(sp.is_test_mode, FALSE) = FALSE
          AND sp.payment_date > NOW() - INTERVAL '90 days'
      )
      AND NOT EXISTS (
        SELECT 1
        FROM subscriptions s
        JOIN users u ON u.id::varchar = s.user_id::varchar
        WHERE LOWER(BTRIM(u.email)) = r.email
          AND COALESCE(s.is_test_mode, FALSE) = FALSE
          AND s.product_type IN (
            'sselfie_studio_membership',
            'sselfie_studio_membership_annual',
            'brand_studio_membership',
            'pro',
            'vault_maya'
          )
          AND (
            s.status IN ('active', 'trialing')
            OR (
              s.status IN ('canceled', 'cancelled', 'past_due')
              AND s.current_period_end > NOW()
            )
          )
      )
      AND (
        ${stage.requiresEmailType}::text IS NULL
        OR EXISTS (
          SELECT 1
          FROM email_logs prev
          WHERE LOWER(BTRIM(prev.user_email)) = r.email
            AND prev.email_type = ${stage.requiresEmailType}
            AND prev.status IN ('sent', 'delivered')
            AND prev.sent_at <= NOW() - (${`${stage.afterDays} days`}::interval)
            AND prev.sent_at > NOW() - INTERVAL '60 days'
        )
      )
      AND NOT EXISTS (
        SELECT 1
        FROM email_logs el
        WHERE LOWER(BTRIM(el.user_email)) = r.email
          AND el.email_type = ${stage.emailType}
          AND el.status IN ('sent', 'delivered', 'suppressed')
          AND el.sent_at > NOW() - INTERVAL '120 days'
      )
    ORDER BY r.email ASC
    LIMIT ${limit}
  `) as Array<{ email: string }>
}

async function runStage(stage: WinbackStage, limit: number, dryRun: boolean) {
  const candidates = await getStageCandidates(stage, limit)
  const results = { found: candidates.length, sent: 0, failed: 0, dryRun }

  if (dryRun) return results

  for (const candidate of candidates) {
    const firstName = getFirstNameForEmail({ email: candidate.email })
    const email = stage.generate({ firstName, recipientEmail: candidate.email })

    const sent = await sendEmail({
      to: candidate.email,
      from: FROM_EMAIL,
      replyTo: REPLY_TO_EMAIL,
      subject: email.subject,
      html: email.html,
      text: email.text,
      emailType: stage.emailType,
      tags: ["subscriber-winback"],
      marketing: true,
      idempotencyKey: winbackIdempotencyKey(stage.emailType, candidate.email),
    })

    if (sent.success) results.sent += 1
    else results.failed += 1

    await sleep(SEND_DELAY_MS)
  }

  return results
}

/**
 * Final money/access guard for the seven-day sunset grace window. A subscriber who buys or
 * regains recurring product access after email 4 must remain marketable even if they never
 * click the win-back message itself.
 */
async function hasCurrentCustomerOrMembershipAccess(email: string): Promise<boolean> {
  const [purchase, membership] = await Promise.all([
    sql`
      SELECT 1
      FROM stripe_payments sp
      WHERE LOWER(BTRIM(sp.customer_email)) = LOWER(BTRIM(${email}))
        AND sp.status IN ('succeeded', 'paid')
        AND COALESCE(sp.is_test_mode, FALSE) = FALSE
        AND sp.payment_date > NOW() - INTERVAL '90 days'
      LIMIT 1
    `,
    sql`
      SELECT 1
      FROM subscriptions s
      JOIN users u ON u.id::varchar = s.user_id::varchar
      WHERE LOWER(BTRIM(u.email)) = LOWER(BTRIM(${email}))
        AND COALESCE(s.is_test_mode, FALSE) = FALSE
        AND s.product_type IN (
          'sselfie_studio_membership',
          'sselfie_studio_membership_annual',
          'brand_studio_membership',
          'pro',
          'vault_maya'
        )
        AND (
          s.status IN ('active', 'trialing')
          OR (
            s.status IN ('canceled', 'cancelled', 'past_due')
            AND s.current_period_end > NOW()
          )
        )
      LIMIT 1
    `,
  ])

  return purchase.length > 0 || membership.length > 0
}

/**
 * Sunset: 7+ days after win-back email 4 with still zero click engagement -> app-level
 * unsubscribe (every marketing send respects it) + a winback_sunset tag in Resend so broadcasts
 * can exclude them. Counted in dry-run mode whenever the sunset env is off.
 */
async function runSunset(apply: boolean, limit: number) {
  const candidates = (await sql`
    WITH recipients AS (
      SELECT
        LOWER(BTRIM(user_email)) AS email,
        MAX(clicked_at) AS last_click
      FROM email_logs
      WHERE user_email IS NOT NULL AND BTRIM(user_email) <> ''
      GROUP BY 1
    )
    SELECT r.email
    FROM recipients r
    WHERE (r.last_click IS NULL OR r.last_click <= NOW() - INTERVAL '60 days')
      AND EXISTS (
        SELECT 1
        FROM email_logs el
        WHERE LOWER(BTRIM(el.user_email)) = r.email
          AND el.email_type = ${SUBSCRIBER_WINBACK_EMAIL_TYPES.sunset}
          AND el.status IN ('sent', 'delivered')
          AND el.sent_at <= NOW() - INTERVAL '7 days'
          AND el.sent_at > NOW() - INTERVAL '60 days'
      )
      AND NOT EXISTS (
        SELECT 1
        FROM email_logs done
        WHERE LOWER(BTRIM(done.user_email)) = r.email
          AND done.email_type = 'subscriber-winback-sunset-applied'
      )
    ORDER BY r.email ASC
    LIMIT ${limit}
  `) as Array<{ email: string }>

  const results = { eligible: candidates.length, suppressed: 0, skippedCustomers: 0, dryRun: !apply }
  if (!apply) return results

  for (const candidate of candidates) {
    if (await hasCurrentCustomerOrMembershipAccess(candidate.email)) {
      results.skippedCustomers += 1
      continue
    }

    await recordEmailUnsubscribe(createUnsubscribeToken(candidate.email), "winback_sunset")
    await updateContactTags(candidate.email, { winback_sunset: "true" }).catch(error => {
      console.error("[subscriber-winback] Failed to tag sunset contact in Resend:", error)
    })
    // Marker row so a subscriber is only sunset once (and the count stays auditable).
    await sql`
      INSERT INTO email_logs (user_email, email_type, status, sent_at, created_at)
      VALUES (${candidate.email}, 'subscriber-winback-sunset-applied', 'sent', NOW(), NOW())
    `
    results.suppressed += 1
  }

  return results
}

export async function GET(request: Request) {
  const cronLogger = createCronLogger("subscriber-winback")
  await cronLogger.start()

  try {
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET
    const isProduction =
      process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production"

    if (isProduction) {
      if (!cronSecret) {
        await cronLogger.error(new Error("Unauthorized"), {
          reason: "CRON_SECRET not set in production",
        })
        return NextResponse.json(
          { error: "Unauthorized: CRON_SECRET required in production" },
          { status: 401 }
        )
      }
      if (authHeader !== `Bearer ${cronSecret}`) {
        await cronLogger.error(new Error("Unauthorized"), { reason: "Invalid CRON_SECRET" })
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    }

    if (!envFlag("SUBSCRIBER_WINBACK_ENABLED")) {
      const summary = { enabled: false }
      await cronLogger.success(summary)
      return NextResponse.json({ success: true, ...summary })
    }

    const dryRun = new URL(request.url).searchParams.get("dry_run") === "1"
    const results: Record<string, unknown> = { enabled: true, dryRun }
    let remainingSends = MAX_EMAILS_PER_RUN
    for (const stage of [...STAGES].reverse()) {
      if (remainingSends <= 0) {
        results[stage.emailType] = { found: 0, sent: 0, failed: 0, skippedForBudget: true }
        continue
      }

      const stageResult = await runStage(stage, Math.min(BATCH_LIMIT, remainingSends), dryRun)
      results[stage.emailType] = stageResult
      remainingSends -= stageResult.sent + stageResult.failed
    }
    results.remainingSends = remainingSends
    results.sunset = await runSunset(
      !dryRun && envFlag("SUBSCRIBER_WINBACK_SUNSET_ENABLED"),
      SUNSET_LIMIT
    )

    await cronLogger.success(results)
    return NextResponse.json({ success: true, ...results })
  } catch (error: unknown) {
    await cronLogger.error(error, { step: "subscriber-winback" })
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Subscriber win-back cron failed",
      },
      { status: 500 }
    )
  }
}
