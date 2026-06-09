import { NextResponse } from "next/server"

import { logAnalyticsEvent } from "@/lib/analytics/events"
import { createCronLogger } from "@/lib/cron-logger"
import { sql } from "@/lib/db/client"
import { getFirstNameForEmail } from "@/lib/email/recipient-name"
import { sendEmail } from "@/lib/email/send-email"
import {
  generateStarterKitCheckoutRecoveryEmail,
  STARTER_KIT_CHECKOUT_RECOVERY_EMAIL_TYPE,
} from "@/lib/email/templates/starter-kit-checkout-recovery"
import { ensureRevenueEngineSchema } from "@/lib/revenue-engine/checkout-attribution"
import { stripe } from "@/lib/stripe"

export const dynamic = "force-dynamic"
export const maxDuration = 60

const FROM_EMAIL = "Sandra from SSELFIE <hello@sselfie.ai>"
const REPLY_TO_EMAIL = "hello@sselfie.ai"
const SEND_DELAY_MS = 650
const HYDRATE_EMAIL_LIMIT = 50
const HYDRATE_RECHECK_AFTER_HOURS = 12
const HYDRATE_MAX_ATTEMPTS = 3

type RecoveryCandidate = {
  session_id: string
  user_email: string
  source: string | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  utm_content: string | null
  campaign_id: number | null
  cta_keyword: string | null
  entry_post_slug: string | null
  buyer_stage: string | null
  created_at: string
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function ensureRecoveryHydrationSchema() {
  await ensureRevenueEngineSchema()

  await sql`
    ALTER TABLE checkout_attribution
    ADD COLUMN IF NOT EXISTS email_hydration_checked_at TIMESTAMPTZ
  `
  await sql`
    ALTER TABLE checkout_attribution
    ADD COLUMN IF NOT EXISTS email_hydration_attempts INTEGER NOT NULL DEFAULT 0
  `
  await sql`
    CREATE INDEX IF NOT EXISTS checkout_attribution_email_hydration_idx
    ON checkout_attribution (product_type, status, email_hydration_checked_at, created_at DESC)
  `
}

async function hydrateMissingCheckoutEmails() {
  await ensureRecoveryHydrationSchema()

  const sessions = (await sql`
    SELECT session_id, email_hydration_attempts
    FROM checkout_attribution
    WHERE product_type = 'starter_kit'
      AND status = 'started'
      AND (user_email IS NULL OR BTRIM(user_email) = '')
      AND recovery_email_sent_at IS NULL
      AND created_at <= NOW() - INTERVAL '1 hour'
      AND created_at > NOW() - INTERVAL '7 days'
      AND email_hydration_attempts < ${HYDRATE_MAX_ATTEMPTS}
      AND (
        email_hydration_checked_at IS NULL
        OR email_hydration_checked_at <= NOW() - (${`${HYDRATE_RECHECK_AFTER_HOURS} hours`}::interval)
      )
    ORDER BY created_at ASC
    LIMIT ${HYDRATE_EMAIL_LIMIT}
  `) as Array<{ session_id: string; email_hydration_attempts: number }>

  const results = { checked: sessions.length, hydrated: 0, unavailable: 0, failed: 0 }

  for (const session of sessions) {
    try {
      const checkoutSession = await stripe.checkout.sessions.retrieve(session.session_id)
      const email =
        checkoutSession.customer_details?.email?.trim() ||
        checkoutSession.customer_email?.trim() ||
        null

      if (email) {
        await sql`
          UPDATE checkout_attribution
          SET
            user_email = ${email},
            email_hydration_checked_at = NOW(),
            email_hydration_attempts = email_hydration_attempts + 1,
            updated_at = NOW()
          WHERE session_id = ${session.session_id}
            AND (user_email IS NULL OR BTRIM(user_email) = '')
        `
        results.hydrated += 1
      } else {
        await sql`
          UPDATE checkout_attribution
          SET
            email_hydration_checked_at = NOW(),
            email_hydration_attempts = email_hydration_attempts + 1,
            updated_at = NOW()
          WHERE session_id = ${session.session_id}
            AND (user_email IS NULL OR BTRIM(user_email) = '')
        `
        results.unavailable += 1
      }
    } catch (error) {
      results.failed += 1
      await sql`
        UPDATE checkout_attribution
        SET
          email_hydration_checked_at = NOW(),
          email_hydration_attempts = email_hydration_attempts + 1,
          updated_at = NOW()
        WHERE session_id = ${session.session_id}
          AND (user_email IS NULL OR BTRIM(user_email) = '')
      `
      console.error("[starter-kit-recovery] Failed to hydrate Stripe checkout email:", {
        sessionId: session.session_id,
        error,
      })
    }

    await sleep(SEND_DELAY_MS)
  }

  return results
}

async function getRecoveryCandidates(): Promise<RecoveryCandidate[]> {
  await ensureRevenueEngineSchema()

  return (await sql`
    WITH eligible_checkouts AS (
      SELECT
        session_id,
        user_email,
        source,
        utm_source,
        utm_medium,
        utm_campaign,
        utm_content,
        campaign_id,
        cta_keyword,
        entry_post_slug,
        buyer_stage,
        created_at,
        ROW_NUMBER() OVER (
          PARTITION BY LOWER(BTRIM(user_email))
          ORDER BY created_at ASC
        ) AS email_rank
      FROM checkout_attribution
      WHERE product_type = 'starter_kit'
        AND status = 'started'
        AND user_email IS NOT NULL
        AND BTRIM(user_email) <> ''
        AND recovery_email_sent_at IS NULL
        AND created_at <= NOW() - INTERVAL '1 hour'
        AND created_at > NOW() - INTERVAL '7 days'
        AND NOT EXISTS (
          SELECT 1
          FROM email_logs el
          WHERE LOWER(BTRIM(el.user_email)) = LOWER(BTRIM(checkout_attribution.user_email))
            AND el.email_type = ${STARTER_KIT_CHECKOUT_RECOVERY_EMAIL_TYPE}
            AND el.status IN ('sent', 'delivered', 'suppressed')
            AND el.sent_at > NOW() - INTERVAL '7 days'
        )
        AND NOT EXISTS (
          SELECT 1
          FROM freebie_subscribers fs
          WHERE LOWER(BTRIM(fs.email)) = LOWER(BTRIM(checkout_attribution.user_email))
            AND (
              fs.source = 'starter-kit-paid'
              OR 'starter-kit-paid' = ANY(COALESCE(fs.email_tags, ARRAY[]::text[]))
            )
        )
    )
    SELECT
      session_id,
      user_email,
      source,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
      campaign_id,
      cta_keyword,
      entry_post_slug,
      buyer_stage,
      created_at
    FROM eligible_checkouts
    WHERE email_rank = 1
    ORDER BY created_at ASC
    LIMIT 50
  `) as RecoveryCandidate[]
}

async function markRecoverySent(candidate: RecoveryCandidate, messageId?: string) {
  await sql`
    UPDATE checkout_attribution
    SET
      status = 'abandoned',
      recovery_email_sent_at = NOW(),
      recovery_email_type = ${STARTER_KIT_CHECKOUT_RECOVERY_EMAIL_TYPE},
      recovery_email_message_id = ${messageId || null},
      updated_at = NOW()
    WHERE session_id = ${candidate.session_id}
  `

  await logAnalyticsEvent({
    eventName: "starter_kit_checkout_recovery_sent",
    path: "/api/cron/starter-kit-checkout-recovery",
    utm: {
      source: candidate.utm_source,
      medium: candidate.utm_medium,
      campaign: candidate.utm_campaign,
      content: candidate.utm_content,
    },
    properties: {
      session_id: candidate.session_id,
      source: candidate.source,
      campaign_id: candidate.campaign_id,
      cta_keyword: candidate.cta_keyword,
      entry_post_slug: candidate.entry_post_slug,
      buyer_stage: candidate.buyer_stage,
    },
  })
}

export async function GET(request: Request) {
  const cronLogger = createCronLogger("starter-kit-checkout-recovery")
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
          { status: 401 },
        )
      }
      if (authHeader !== `Bearer ${cronSecret}`) {
        await cronLogger.error(new Error("Unauthorized"), { reason: "Invalid CRON_SECRET" })
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    }

    if (process.env.STARTER_KIT_CHECKOUT_RECOVERY_ENABLED !== "true") {
      const summary = { enabled: false, found: 0, sent: 0, failed: 0, hydrated: 0 }
      await cronLogger.success(summary)
      return NextResponse.json({ success: true, ...summary })
    }

    const hydration = await hydrateMissingCheckoutEmails()
    const candidates = await getRecoveryCandidates()
    const results = {
      enabled: true,
      found: candidates.length,
      sent: 0,
      failed: 0,
      hydration,
    }

    for (const candidate of candidates) {
      const firstName = getFirstNameForEmail({ email: candidate.user_email })
      const email = generateStarterKitCheckoutRecoveryEmail({
        firstName,
        recipientEmail: candidate.user_email,
      })

      const sent = await sendEmail({
        to: candidate.user_email,
        from: FROM_EMAIL,
        replyTo: REPLY_TO_EMAIL,
        subject: email.subject,
        html: email.html,
        text: email.text,
        emailType: STARTER_KIT_CHECKOUT_RECOVERY_EMAIL_TYPE,
        tags: ["starter-kit", "checkout-recovery"],
        marketing: true,
      })

      if (sent.success) {
        results.sent += 1
        await markRecoverySent(candidate, sent.messageId)
      } else {
        results.failed += 1
      }

      await sleep(SEND_DELAY_MS)
    }

    await cronLogger.success(results)
    return NextResponse.json({ success: true, ...results })
  } catch (error: unknown) {
    await cronLogger.error(error, { step: "starter-kit-checkout-recovery" })
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Checkout recovery cron failed",
      },
      { status: 500 },
    )
  }
}
