import { NextResponse } from "next/server"

import { logAnalyticsEvent } from "@/lib/analytics/events"
import { campaignRecoveryEmail, CAMPAIGN_RECOVERY_EMAIL_TYPES } from "@/lib/campaign-outcome/recovery-emails"
import { createCronLogger } from "@/lib/cron-logger"
import { sql } from "@/lib/db/client"
import { EMAIL_CONFIG } from "@/lib/email/config"
import { getFirstNameForEmail } from "@/lib/email/recipient-name"
import { sendEmail } from "@/lib/email/send-email"
import { ensureRevenueEngineSchema } from "@/lib/revenue-engine/checkout-attribution"
import { stripe } from "@/lib/stripe"

export const dynamic = "force-dynamic"
export const maxDuration = 60

type RecoveryCandidate = {
  session_id: string
  user_email: string
  source: string | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  utm_content: string | null
  campaign_id: number | null
  buyer_stage: string | null
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

function enabled(): boolean {
  return (
    process.env.CAMPAIGN_OUTCOME_DISABLED === "false" &&
    process.env.CAMPAIGN_CHECKOUT_RECOVERY_DISABLED === "false"
  )
}

async function hydrateMissingEmails() {
  await ensureRevenueEngineSchema()
  const sessions = (await sql`
    SELECT session_id
    FROM checkout_attribution
    WHERE product_type = 'campaign_outcome'
      AND status = 'started'
      AND (user_email IS NULL OR BTRIM(user_email) = '')
      AND created_at <= NOW() - INTERVAL '1 hour'
      AND created_at > NOW() - INTERVAL '7 days'
    ORDER BY created_at ASC
    LIMIT 25
  `) as Array<{ session_id: string }>
  const result = { checked: sessions.length, hydrated: 0, unavailable: 0, failed: 0 }
  for (const session of sessions) {
    try {
      const checkout = await stripe.checkout.sessions.retrieve(session.session_id)
      const email = checkout.customer_details?.email?.trim() || checkout.customer_email?.trim()
      if (email) {
        await sql`
          UPDATE checkout_attribution
          SET user_email = ${email}, updated_at = NOW()
          WHERE session_id = ${session.session_id}
            AND (user_email IS NULL OR BTRIM(user_email) = '')
        `
        result.hydrated += 1
      } else {
        result.unavailable += 1
      }
    } catch (error) {
      result.failed += 1
      console.error("[campaign-recovery] Could not hydrate checkout email", {
        sessionId: session.session_id,
        error,
      })
    }
  }
  return result
}

async function candidatesFor(stage: 1 | 2 | 3): Promise<RecoveryCandidate[]> {
  await ensureRevenueEngineSchema()
  const emailType =
    stage === 1
      ? CAMPAIGN_RECOVERY_EMAIL_TYPES.oneHour
      : stage === 2
        ? CAMPAIGN_RECOVERY_EMAIL_TYPES.dayOne
        : CAMPAIGN_RECOVERY_EMAIL_TYPES.dayThree
  const priorType =
    stage === 2
      ? CAMPAIGN_RECOVERY_EMAIL_TYPES.oneHour
      : stage === 3
        ? CAMPAIGN_RECOVERY_EMAIL_TYPES.dayOne
        : null
  return (await sql`
    WITH eligible AS (
      SELECT
        ca.session_id,
        ca.user_email,
        ca.source,
        ca.utm_source,
        ca.utm_medium,
        ca.utm_campaign,
        ca.utm_content,
        ca.campaign_id,
        ca.buyer_stage,
        ROW_NUMBER() OVER (
          PARTITION BY LOWER(BTRIM(ca.user_email))
          ORDER BY ca.created_at ASC
        ) AS email_rank
      FROM checkout_attribution ca
      WHERE ca.product_type = 'campaign_outcome'
        AND ca.status IN ('started', 'abandoned')
        AND ca.user_email IS NOT NULL
        AND BTRIM(ca.user_email) <> ''
        AND (
          (${stage} = 1 AND ca.recovery_email_sent_at IS NULL
            AND ca.created_at <= NOW() - INTERVAL '1 hour')
          OR (${stage} = 2 AND ca.recovery_email_sent_at IS NOT NULL
            AND ca.recovery_email_sent_at <= NOW() - INTERVAL '24 hours')
          OR (${stage} = 3 AND ca.recovery_email_sent_at IS NOT NULL
            AND ca.recovery_email_sent_at <= NOW() - INTERVAL '72 hours')
        )
        AND ca.created_at > NOW() - INTERVAL '14 days'
        AND NOT EXISTS (
          SELECT 1
          FROM stripe_payments sp
          WHERE LOWER(BTRIM(sp.customer_email)) = LOWER(BTRIM(ca.user_email))
            AND sp.product_type = 'campaign_outcome'
            AND sp.status IN ('succeeded', 'paid')
            AND sp.is_test_mode = FALSE
        )
        AND NOT EXISTS (
          SELECT 1
          FROM email_logs sent
          WHERE LOWER(BTRIM(sent.user_email)) = LOWER(BTRIM(ca.user_email))
            AND sent.email_type = ${emailType}
            AND sent.status IN ('sent', 'delivered', 'suppressed')
            AND sent.sent_at > NOW() - INTERVAL '30 days'
        )
        AND (
          ${priorType}::text IS NULL
          OR EXISTS (
            SELECT 1
            FROM email_logs prior
            WHERE LOWER(BTRIM(prior.user_email)) = LOWER(BTRIM(ca.user_email))
              AND prior.email_type = ${priorType}
              AND prior.status IN ('sent', 'delivered')
              AND prior.sent_at > NOW() - INTERVAL '30 days'
          )
        )
    )
    SELECT session_id, user_email, source, utm_source, utm_medium, utm_campaign,
      utm_content, campaign_id, buyer_stage
    FROM eligible
    WHERE email_rank = 1
    ORDER BY session_id
    LIMIT 50
  `) as RecoveryCandidate[]
}

async function sendStage(stage: 1 | 2 | 3) {
  const candidates = await candidatesFor(stage)
  const result = { found: candidates.length, sent: 0, failed: 0 }
  for (const candidate of candidates) {
    const email = campaignRecoveryEmail({
      firstName: getFirstNameForEmail({ email: candidate.user_email }),
      email: candidate.user_email,
      stage,
    })
    const sent = await sendEmail({
      to: candidate.user_email,
      subject: email.subject,
      html: email.html,
      text: email.text,
      emailType: email.emailType,
      tags: ["campaign-outcome", "checkout-recovery"],
      from: EMAIL_CONFIG.marketing.from,
      replyTo: EMAIL_CONFIG.marketing.replyTo,
      marketing: true,
    })
    if (sent.success) {
      result.sent += 1
      if (stage === 1) {
        await sql`
          UPDATE checkout_attribution
          SET status = 'abandoned', recovery_email_sent_at = NOW(),
            recovery_email_type = ${email.emailType},
            recovery_email_message_id = ${sent.messageId || null}, updated_at = NOW()
          WHERE session_id = ${candidate.session_id}
        `
      }
      await logAnalyticsEvent({
        eventName: "campaign_checkout_recovery_sent",
        path: "/api/cron/campaign-checkout-recovery",
        utm: {
          source: candidate.utm_source,
          medium: candidate.utm_medium,
          campaign: candidate.utm_campaign,
          content: candidate.utm_content,
        },
        properties: {
          session_id: candidate.session_id,
          stage,
          source: candidate.source,
          campaign_id: candidate.campaign_id,
          buyer_stage: candidate.buyer_stage,
        },
      })
    } else {
      result.failed += 1
    }
    await sleep(250)
  }
  return result
}

export async function GET(request: Request) {
  const cronLogger = createCronLogger("campaign-checkout-recovery")
  await cronLogger.start()
  try {
    const isProduction =
      process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production"
    const cronSecret = process.env.CRON_SECRET
    if (
      isProduction &&
      (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`)
    ) {
      await cronLogger.error(new Error("Unauthorized"), { reason: "Invalid cron secret" })
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!enabled()) {
      const result = { enabled: false, hydration: null, stages: null }
      await cronLogger.success(result)
      return NextResponse.json({ success: true, ...result })
    }
    const hydration = await hydrateMissingEmails()
    const stages = {
      oneHour: await sendStage(1),
      dayOne: await sendStage(2),
      dayThree: await sendStage(3),
    }
    const result = { enabled: true, hydration, stages }
    await cronLogger.success(result)
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    await cronLogger.error(error, { step: "campaign-checkout-recovery" })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Campaign recovery failed" },
      { status: 500 }
    )
  }
}
