import { createHash } from "node:crypto"
import { NextResponse } from "next/server"

import { createCronLogger } from "@/lib/cron-logger"
import { sql } from "@/lib/db/client"
import { getFirstNameForEmail } from "@/lib/email/recipient-name"
import { sendEmail } from "@/lib/email/send-email"
import {
  generateHighIntentClickRecoveryEmail,
  HIGH_INTENT_EMAIL_TYPES,
  type HighIntentProduct,
} from "@/lib/email/templates/high-intent-click-recovery"
import { ensureRevenueEngineSchema } from "@/lib/revenue-engine/checkout-attribution"

export const dynamic = "force-dynamic"
export const maxDuration = 60

const FROM_EMAIL = "Sandra from SSELFIE <hello@sselfie.ai>"
const REPLY_TO_EMAIL = "hello@sselfie.ai"
const ROLLOUT_START = "2026-08-22T00:00:00Z"
const MIN_CLICK_AGE_HOURS = 18
const BATCH_LIMIT = 20
const SEND_DELAY_MS = 250

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

type Candidate = {
  email: string
  name: string | null
  product: HighIntentProduct
  clicked_at: string
}

function idempotencyKey(product: HighIntentProduct, email: string): string {
  const hash = createHash("sha256")
    .update(email.trim().toLowerCase())
    .digest("hex")
    .slice(0, 24)
  return `high-intent-click:${product}:${hash}`
}

async function getCandidates(): Promise<Candidate[]> {
  await ensureRevenueEngineSchema()

  return (await sql`
    WITH raw_clicks AS (
      SELECT
        LOWER(BTRIM(metadata->>'recipient_email')) AS email,
        COALESCE(
          metadata->'event_data'->'click'->>'link',
          metadata->'event_data'->>'link'
        ) AS clicked_link,
        created_at AS clicked_at
      FROM email_events
      WHERE event_type = 'email.clicked'
        AND created_at >= ${ROLLOUT_START}::timestamptz
        AND created_at >= NOW() - INTERVAL '7 days'
        AND created_at <= NOW() - (${`${MIN_CLICK_AGE_HOURS} hours`}::interval)
        AND metadata->>'recipient_email' IS NOT NULL
        AND BTRIM(metadata->>'recipient_email') <> ''
    ),
    classified AS (
      SELECT
        email,
        clicked_at,
        CASE
          WHEN clicked_link ILIKE '%/checkout/prompt-vault%'
            OR clicked_link ILIKE '%/prompt-vault%'
          THEN 'prompt_vault'
          WHEN clicked_link ILIKE '%/checkout/starter-kit%'
            OR clicked_link ILIKE '%/starter-kit%'
          THEN 'starter_kit'
          ELSE NULL
        END AS product
      FROM raw_clicks
      WHERE clicked_link IS NOT NULL
        AND clicked_link ILIKE '%sselfie.ai/%'
    ),
    latest_click AS (
      SELECT DISTINCT ON (email, product)
        email,
        product,
        clicked_at
      FROM classified
      WHERE product IS NOT NULL
      ORDER BY email, product, clicked_at DESC
    )
    SELECT
      click.email,
      COALESCE(
        NULLIF(BTRIM(fs.name), ''),
        NULLIF(BTRIM(u.display_name), '')
      ) AS name,
      click.product,
      click.clicked_at
    FROM latest_click click
    LEFT JOIN LATERAL (
      SELECT name
      FROM freebie_subscribers subscriber
      WHERE LOWER(BTRIM(subscriber.email)) = click.email
      ORDER BY subscriber.updated_at DESC NULLS LAST, subscriber.created_at DESC
      LIMIT 1
    ) fs ON TRUE
    LEFT JOIN LATERAL (
      SELECT display_name
      FROM users app_user
      WHERE LOWER(BTRIM(app_user.email)) = click.email
      ORDER BY app_user.updated_at DESC NULLS LAST, app_user.created_at DESC
      LIMIT 1
    ) u ON TRUE
    WHERE NOT EXISTS (
        SELECT 1
        FROM stripe_payments payment
        WHERE LOWER(BTRIM(payment.customer_email)) = click.email
          AND payment.product_type = click.product
          AND payment.status IN ('succeeded', 'paid')
          AND COALESCE(payment.is_test_mode, FALSE) = FALSE
      )
      -- If a checkout exists, the dedicated checkout-recovery system owns this person.
      AND NOT EXISTS (
        SELECT 1
        FROM checkout_attribution checkout
        WHERE LOWER(BTRIM(checkout.user_email)) = click.email
          AND checkout.product_type = click.product
          AND checkout.created_at >= click.clicked_at - INTERVAL '15 minutes'
      )
      AND NOT EXISTS (
        SELECT 1
        FROM email_logs email_log
        WHERE LOWER(BTRIM(email_log.user_email)) = click.email
          AND email_log.email_type = CASE
            WHEN click.product = 'prompt_vault' THEN ${HIGH_INTENT_EMAIL_TYPES.prompt_vault}
            ELSE ${HIGH_INTENT_EMAIL_TYPES.starter_kit}
          END
          AND email_log.status IN ('sent', 'delivered', 'suppressed')
          AND email_log.sent_at > NOW() - INTERVAL '30 days'
      )
    ORDER BY click.clicked_at ASC
    LIMIT ${BATCH_LIMIT}
  `) as Candidate[]
}

export async function GET(request: Request) {
  const logger = createCronLogger("high-intent-click-recovery")
  await logger.start()

  try {
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET
    const isProduction =
      process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production"

    if (isProduction && (!cronSecret || authHeader !== `Bearer ${cronSecret}`)) {
      await logger.error(new Error("Unauthorized"), { reason: "Invalid cron authorization" })
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const candidates = await getCandidates()
    const enabled = process.env.HIGH_INTENT_CLICK_RECOVERY_ENABLED === "true"
    const summary = {
      enabled,
      found: candidates.length,
      promptVault: candidates.filter(candidate => candidate.product === "prompt_vault").length,
      starterKit: candidates.filter(candidate => candidate.product === "starter_kit").length,
      sent: 0,
      failed: 0,
    }

    // Report-first rollout: scheduled production runs reveal cohort counts in cron logs,
    // but no email sends until HIGH_INTENT_CLICK_RECOVERY_ENABLED is explicitly enabled.
    if (!enabled) {
      await logger.success(summary)
      return NextResponse.json({ success: true, ...summary })
    }

    for (const candidate of candidates) {
      const firstName = getFirstNameForEmail({
        fullName: candidate.name,
        email: candidate.email,
      })
      const email = generateHighIntentClickRecoveryEmail({
        product: candidate.product,
        firstName,
      })
      const emailType = HIGH_INTENT_EMAIL_TYPES[candidate.product]

      const result = await sendEmail({
        to: candidate.email,
        from: FROM_EMAIL,
        replyTo: REPLY_TO_EMAIL,
        subject: email.subject,
        html: email.html,
        text: email.text,
        emailType,
        tags: ["lifecycle", "high-intent", "offer-click", candidate.product],
        marketing: true,
        idempotencyKey: idempotencyKey(candidate.product, candidate.email),
      })

      if (result.success) summary.sent += 1
      else summary.failed += 1

      await sleep(SEND_DELAY_MS)
    }

    await logger.success(summary)
    return NextResponse.json({ success: true, ...summary })
  } catch (error: unknown) {
    await logger.error(error, { step: "high-intent-click-recovery" })
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "High-intent click recovery failed",
      },
      { status: 500 },
    )
  }
}
