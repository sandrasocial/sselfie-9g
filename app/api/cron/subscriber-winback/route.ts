import { NextResponse } from "next/server"

import { createCronLogger } from "@/lib/cron-logger"
import { sql } from "@/lib/db/client"
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

// Subscriber win-back (EMAIL-03): 4 personal notes over ~3 weeks for subscribers with no opens
// or clicks in 60+ days, then an optional sunset (app-level unsubscribe) for the silent ones.
// Why: dormant subscribers drag sender reputation for the whole list; win-back recovers 10-20%
// and suppression protects deliverability for everyone who does read.
//
// Engagement truth: email_logs (opened_at / clicked_at via the Resend webhook). Audience is
// limited to people we actually send cron/lifecycle email to (>=2 sends in 90 days), so
// broadcast-only contacts - whose opens we don't track in email_logs - are never judged inactive.
//
// Gates: SUBSCRIBER_WINBACK_ENABLED (sends), SUBSCRIBER_WINBACK_SUNSET_ENABLED (suppression).
// Any open or click while in the sequence re-qualifies the subscriber automatically - every
// stage re-checks the same inactivity condition, so engaging exits the sequence.

export const dynamic = "force-dynamic"
export const maxDuration = 60

const FROM_EMAIL = "Sandra from SSELFIE <hello@sselfie.ai>"
const REPLY_TO_EMAIL = "hello@sselfie.ai"
const BATCH_LIMIT = 40
const SEND_DELAY_MS = 650
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

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
  { emailType: SUBSCRIBER_WINBACK_EMAIL_TYPES.reminder, afterDays: 0, requiresEmailType: null, generate: generateWinback1Email },
  { emailType: SUBSCRIBER_WINBACK_EMAIL_TYPES.value, afterDays: 5, requiresEmailType: SUBSCRIBER_WINBACK_EMAIL_TYPES.reminder, generate: generateWinback2Email },
  { emailType: SUBSCRIBER_WINBACK_EMAIL_TYPES.offer, afterDays: 7, requiresEmailType: SUBSCRIBER_WINBACK_EMAIL_TYPES.value, generate: generateWinback3Email },
  { emailType: SUBSCRIBER_WINBACK_EMAIL_TYPES.sunset, afterDays: 7, requiresEmailType: SUBSCRIBER_WINBACK_EMAIL_TYPES.offer, generate: generateWinback4Email },
]

/**
 * Inactive = we've mailed them (>=2 lifecycle sends in 90d, on the list 60d+) and they have
 * zero opens AND zero clicks in 60 days. Excludes active members and anyone who paid in 90d
 * (stripe_payments - money truth), plus anyone already in this win-back round (120d dedupe).
 */
async function getStageCandidates(stage: WinbackStage): Promise<Array<{ email: string }>> {
  return (await sql`
    WITH recipients AS (
      SELECT
        LOWER(BTRIM(user_email)) AS email,
        COUNT(*) FILTER (
          WHERE sent_at > NOW() - INTERVAL '90 days' AND status IN ('sent', 'delivered')
        ) AS recent_sends,
        MIN(sent_at) AS first_send,
        MAX(opened_at) AS last_open,
        MAX(clicked_at) AS last_click
      FROM email_logs
      WHERE user_email IS NOT NULL AND BTRIM(user_email) <> ''
      GROUP BY 1
    )
    SELECT r.email
    FROM recipients r
    WHERE r.recent_sends >= 2
      AND r.first_send <= NOW() - INTERVAL '60 days'
      AND (r.last_open IS NULL OR r.last_open <= NOW() - INTERVAL '60 days')
      AND (r.last_click IS NULL OR r.last_click <= NOW() - INTERVAL '60 days')
      AND NOT EXISTS (
        SELECT 1
        FROM stripe_payments sp
        WHERE LOWER(BTRIM(sp.customer_email)) = r.email
          AND sp.status IN ('succeeded', 'paid')
          AND sp.is_test_mode = FALSE
          AND sp.payment_date > NOW() - INTERVAL '90 days'
      )
      AND NOT EXISTS (
        SELECT 1
        FROM subscriptions s
        JOIN users u ON u.id = s.user_id
        WHERE LOWER(BTRIM(u.email)) = r.email
          AND s.status = 'active'
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
    LIMIT ${BATCH_LIMIT}
  `) as Array<{ email: string }>
}

async function runStage(stage: WinbackStage) {
  const candidates = await getStageCandidates(stage)
  const results = { found: candidates.length, sent: 0, failed: 0 }

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
    })

    if (sent.success) results.sent += 1
    else results.failed += 1

    await sleep(SEND_DELAY_MS)
  }

  return results
}

/**
 * Sunset: 7+ days after win-back email 4 with still zero engagement -> app-level unsubscribe
 * (every marketing send respects it) + a winback_sunset tag in Resend so broadcasts can
 * exclude them. Counted in dry-run mode whenever the sunset env is off.
 */
async function runSunset(apply: boolean) {
  const candidates = (await sql`
    WITH recipients AS (
      SELECT
        LOWER(BTRIM(user_email)) AS email,
        MAX(opened_at) AS last_open,
        MAX(clicked_at) AS last_click
      FROM email_logs
      WHERE user_email IS NOT NULL AND BTRIM(user_email) <> ''
      GROUP BY 1
    )
    SELECT r.email
    FROM recipients r
    WHERE (r.last_open IS NULL OR r.last_open <= NOW() - INTERVAL '60 days')
      AND (r.last_click IS NULL OR r.last_click <= NOW() - INTERVAL '60 days')
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
    LIMIT ${BATCH_LIMIT}
  `) as Array<{ email: string }>

  const results = { eligible: candidates.length, suppressed: 0, dryRun: !apply }
  if (!apply) return results

  for (const candidate of candidates) {
    await recordEmailUnsubscribe(createUnsubscribeToken(candidate.email), "winback_sunset")
    await updateContactTags(candidate.email, { winback_sunset: "true" }).catch((error) => {
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
        await cronLogger.error(new Error("Unauthorized"), { reason: "CRON_SECRET not set in production" })
        return NextResponse.json({ error: "Unauthorized: CRON_SECRET required in production" }, { status: 401 })
      }
      if (authHeader !== `Bearer ${cronSecret}`) {
        await cronLogger.error(new Error("Unauthorized"), { reason: "Invalid CRON_SECRET" })
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    }

    if (process.env.SUBSCRIBER_WINBACK_ENABLED !== "true") {
      const summary = { enabled: false }
      await cronLogger.success(summary)
      return NextResponse.json({ success: true, ...summary })
    }

    const results: Record<string, unknown> = { enabled: true }
    for (const stage of STAGES) {
      results[stage.emailType] = await runStage(stage)
    }
    results.sunset = await runSunset(process.env.SUBSCRIBER_WINBACK_SUNSET_ENABLED === "true")

    await cronLogger.success(results)
    return NextResponse.json({ success: true, ...results })
  } catch (error: unknown) {
    await cronLogger.error(error, { step: "subscriber-winback" })
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Subscriber win-back cron failed" },
      { status: 500 },
    )
  }
}
