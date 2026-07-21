import { NextResponse } from "next/server"
import { createHash } from "node:crypto"

import { logAnalyticsEvent } from "@/lib/analytics/events"
import {
  AI_PHOTOSHOOT_AUDIENCE,
  buildAiPhotoshootEmailTags,
  buildAiPhotoshootResendTags,
} from "@/lib/audience/ai-photoshoot-segment"
import { createCronLogger } from "@/lib/cron-logger"
import { sql } from "@/lib/db/client"
import { envFlag } from "@/lib/env-flags"
import { getFirstNameForEmail } from "@/lib/email/recipient-name"
import { sendEmail } from "@/lib/email/send-email"
import { stripe } from "@/lib/stripe"
import { addContactToSegment, updateContactTags } from "@/lib/resend/manage-contact"
import {
  generatePromptVaultCheckoutRecoveryEmail,
  generatePromptVaultRecovery2Email,
  generatePromptVaultRecovery3Email,
  PROMPT_VAULT_CHECKOUT_RECOVERY_EMAIL_TYPE,
  PROMPT_VAULT_CHECKOUT_RECOVERY_2_EMAIL_TYPE,
  PROMPT_VAULT_CHECKOUT_RECOVERY_3_EMAIL_TYPE,
} from "@/lib/email/templates/prompt-vault-checkout-recovery"
import { ensureRevenueEngineSchema } from "@/lib/revenue-engine/checkout-attribution"

export const dynamic = "force-dynamic"
export const maxDuration = 60

const FROM_EMAIL = "Sandra from SSELFIE <hello@sselfie.ai>"
const REPLY_TO_EMAIL = "hello@sselfie.ai"

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

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
const SEND_DELAY_MS = 650
const HYDRATE_EMAIL_LIMIT = 50
const HYDRATE_RECHECK_AFTER_HOURS = 12
const HYDRATE_MAX_ATTEMPTS = 3
const PROMPT_VAULT_RECOVERY_STAGE_2_SENT_AT = "recovery_email_2_sent_at"
const PROMPT_VAULT_RECOVERY_STAGE_3_SENT_AT = "recovery_email_3_sent_at"

function recoveryIdempotencyKey(emailType: string, email: string): string {
  const recipientHash = createHash("sha256")
    .update(email.trim().toLowerCase())
    .digest("hex")
    .slice(0, 24)
  return `prompt-vault-recovery:${emailType}:${recipientHash}`
}

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
    ALTER TABLE checkout_attribution
    ADD COLUMN IF NOT EXISTS recovery_email_2_sent_at TIMESTAMPTZ
  `
  await sql`
    ALTER TABLE checkout_attribution
    ADD COLUMN IF NOT EXISTS recovery_email_3_sent_at TIMESTAMPTZ
  `
  await sql`
    CREATE INDEX IF NOT EXISTS checkout_attribution_email_hydration_idx
    ON checkout_attribution (product_type, status, email_hydration_checked_at, created_at DESC)
  `

  // Preserve already-sent stages when the durable columns are introduced. email_logs remains
  // delivery evidence; the per-session markers make candidate claiming atomic across cron retries.
  await sql`
    UPDATE checkout_attribution ca
    SET recovery_email_2_sent_at = (
      SELECT MIN(el.sent_at)
      FROM email_logs el
      WHERE LOWER(BTRIM(el.user_email)) = LOWER(BTRIM(ca.user_email))
        AND el.email_type = ${PROMPT_VAULT_CHECKOUT_RECOVERY_2_EMAIL_TYPE}
        AND el.status IN ('sent', 'delivered', 'suppressed')
        AND el.sent_at >= ca.recovery_email_sent_at
        AND el.sent_at <= ca.recovery_email_sent_at + INTERVAL '14 days'
    )
    WHERE ca.product_type = 'prompt_vault'
      AND ca.recovery_email_2_sent_at IS NULL
      AND ca.recovery_email_sent_at IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM email_logs el
        WHERE LOWER(BTRIM(el.user_email)) = LOWER(BTRIM(ca.user_email))
          AND el.email_type = ${PROMPT_VAULT_CHECKOUT_RECOVERY_2_EMAIL_TYPE}
          AND el.status IN ('sent', 'delivered', 'suppressed')
          AND el.sent_at >= ca.recovery_email_sent_at
          AND el.sent_at <= ca.recovery_email_sent_at + INTERVAL '14 days'
      )
  `
  await sql`
    UPDATE checkout_attribution ca
    SET recovery_email_3_sent_at = (
      SELECT MIN(el.sent_at)
      FROM email_logs el
      WHERE LOWER(BTRIM(el.user_email)) = LOWER(BTRIM(ca.user_email))
        AND el.email_type = ${PROMPT_VAULT_CHECKOUT_RECOVERY_3_EMAIL_TYPE}
        AND el.status IN ('sent', 'delivered', 'suppressed')
        AND el.sent_at >= ca.recovery_email_sent_at
        AND el.sent_at <= ca.recovery_email_sent_at + INTERVAL '14 days'
    )
    WHERE ca.product_type = 'prompt_vault'
      AND ca.recovery_email_3_sent_at IS NULL
      AND ca.recovery_email_sent_at IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM email_logs el
        WHERE LOWER(BTRIM(el.user_email)) = LOWER(BTRIM(ca.user_email))
          AND el.email_type = ${PROMPT_VAULT_CHECKOUT_RECOVERY_3_EMAIL_TYPE}
          AND el.status IN ('sent', 'delivered', 'suppressed')
          AND el.sent_at >= ca.recovery_email_sent_at
          AND el.sent_at <= ca.recovery_email_sent_at + INTERVAL '14 days'
      )
  `
}

async function hydrateMissingCheckoutEmails() {
  await ensureRecoveryHydrationSchema()

  const sessions = (await sql`
    SELECT session_id, email_hydration_attempts
    FROM checkout_attribution
    WHERE product_type = 'prompt_vault'
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
      console.error("[prompt-vault-recovery] Failed to hydrate Stripe checkout email:", {
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
      WHERE product_type = 'prompt_vault'
        AND status = 'started'
        AND user_email IS NOT NULL
        AND BTRIM(user_email) <> ''
        AND recovery_email_sent_at IS NULL
        AND created_at <= NOW() - INTERVAL '1 hour'
        AND created_at > NOW() - INTERVAL '7 days'
        AND NOT EXISTS (
          SELECT 1
          FROM stripe_payments sp
          WHERE LOWER(BTRIM(sp.customer_email)) = LOWER(BTRIM(checkout_attribution.user_email))
            AND sp.product_type = 'prompt_vault'
            AND sp.status IN ('succeeded', 'paid')
            AND (sp.is_test_mode = FALSE OR sp.is_test_mode IS NULL)
        )
        AND NOT EXISTS (
          SELECT 1
          FROM email_logs el
          WHERE LOWER(BTRIM(el.user_email)) = LOWER(BTRIM(checkout_attribution.user_email))
            AND el.email_type = ${PROMPT_VAULT_CHECKOUT_RECOVERY_EMAIL_TYPE}
            AND el.status IN ('sent', 'delivered', 'suppressed')
            AND el.sent_at > NOW() - INTERVAL '7 days'
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

// EMAIL-02: follow-up touches at +24h and +72h after the first recovery email. Klaviyo
// benchmark: 3-email recovery sequences recover ~6.5x the revenue of a single email.
// Hard buyer guard on stripe_payments (money truth) so no buyer ever gets a recovery email,
// even when they purchased through a different checkout session.
type FollowupStage = {
  emailType: string
  sentAtColumn:
    | typeof PROMPT_VAULT_RECOVERY_STAGE_2_SENT_AT
    | typeof PROMPT_VAULT_RECOVERY_STAGE_3_SENT_AT
  /** Hours after the stage-1 recovery email before this touch becomes eligible. */
  afterHours: number
  /** This stage only goes to people who already received the named earlier touch. */
  requiresEmailType: string
  generate: (input: { firstName: string; recipientEmail?: string | null }) => {
    subject: string
    html: string
    text: string
  }
}

const FOLLOWUP_STAGES: FollowupStage[] = [
  {
    emailType: PROMPT_VAULT_CHECKOUT_RECOVERY_2_EMAIL_TYPE,
    sentAtColumn: PROMPT_VAULT_RECOVERY_STAGE_2_SENT_AT,
    afterHours: 24,
    requiresEmailType: PROMPT_VAULT_CHECKOUT_RECOVERY_EMAIL_TYPE,
    generate: generatePromptVaultRecovery2Email,
  },
  {
    emailType: PROMPT_VAULT_CHECKOUT_RECOVERY_3_EMAIL_TYPE,
    sentAtColumn: PROMPT_VAULT_RECOVERY_STAGE_3_SENT_AT,
    afterHours: 72,
    requiresEmailType: PROMPT_VAULT_CHECKOUT_RECOVERY_2_EMAIL_TYPE,
    generate: generatePromptVaultRecovery3Email,
  },
]

async function getFollowupCandidates(stage: FollowupStage): Promise<RecoveryCandidate[]> {
  return (await sql`
    WITH eligible AS (
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
      FROM checkout_attribution ca
      WHERE product_type = 'prompt_vault'
        AND status = 'abandoned'
        AND user_email IS NOT NULL
        AND BTRIM(user_email) <> ''
        AND recovery_email_sent_at IS NOT NULL
        AND recovery_email_sent_at <= NOW() - (${`${stage.afterHours} hours`}::interval)
        AND recovery_email_sent_at > NOW() - INTERVAL '14 days'
        AND (
          (${stage.sentAtColumn} = ${PROMPT_VAULT_RECOVERY_STAGE_2_SENT_AT} AND recovery_email_2_sent_at IS NULL)
          OR
          (${stage.sentAtColumn} = ${PROMPT_VAULT_RECOVERY_STAGE_3_SENT_AT} AND recovery_email_3_sent_at IS NULL)
        )
        AND NOT EXISTS (
          SELECT 1
          FROM stripe_payments sp
          WHERE LOWER(BTRIM(sp.customer_email)) = LOWER(BTRIM(ca.user_email))
            AND sp.product_type = 'prompt_vault'
            AND sp.status IN ('succeeded', 'paid')
            AND (sp.is_test_mode = FALSE OR sp.is_test_mode IS NULL)
        )
        AND EXISTS (
          SELECT 1
          FROM email_logs prev
          WHERE LOWER(BTRIM(prev.user_email)) = LOWER(BTRIM(ca.user_email))
            AND prev.email_type = ${stage.requiresEmailType}
            AND prev.status IN ('sent', 'delivered')
            AND prev.sent_at > NOW() - INTERVAL '14 days'
        )
        AND NOT EXISTS (
          SELECT 1
          FROM email_logs el
          WHERE LOWER(BTRIM(el.user_email)) = LOWER(BTRIM(ca.user_email))
            AND el.email_type = ${stage.emailType}
            AND el.status IN ('sent', 'delivered', 'suppressed')
            AND el.sent_at > NOW() - INTERVAL '30 days'
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
    FROM eligible
    WHERE email_rank = 1
    ORDER BY created_at ASC
    LIMIT 50
  `) as RecoveryCandidate[]
}

async function hasSuccessfulPromptVaultPayment(email: string): Promise<boolean> {
  const rows = await sql`
    SELECT 1
    FROM stripe_payments
    WHERE LOWER(BTRIM(customer_email)) = LOWER(BTRIM(${email}))
      AND product_type = 'prompt_vault'
      AND status IN ('succeeded', 'paid')
      AND (is_test_mode = FALSE OR is_test_mode IS NULL)
    LIMIT 1
  `

  return rows.length > 0
}

async function markRecoveryResolvedByPurchase(candidate: RecoveryCandidate) {
  await sql`
    UPDATE checkout_attribution
    SET
      status = 'abandoned',
      recovered_at = COALESCE(recovered_at, NOW()),
      updated_at = NOW()
    WHERE session_id = ${candidate.session_id}
      AND status <> 'completed'
  `
}

async function claimFollowupStage(
  candidate: RecoveryCandidate,
  stage: FollowupStage
): Promise<boolean> {
  const claimed =
    stage.sentAtColumn === PROMPT_VAULT_RECOVERY_STAGE_2_SENT_AT
      ? await sql`
        UPDATE checkout_attribution
        SET recovery_email_2_sent_at = NOW(), updated_at = NOW()
        WHERE session_id = ${candidate.session_id}
          AND recovery_email_2_sent_at IS NULL
        RETURNING session_id
      `
      : await sql`
        UPDATE checkout_attribution
        SET recovery_email_3_sent_at = NOW(), updated_at = NOW()
        WHERE session_id = ${candidate.session_id}
          AND recovery_email_3_sent_at IS NULL
        RETURNING session_id
      `

  return claimed.length > 0
}

async function releaseFollowupStageClaim(candidate: RecoveryCandidate, stage: FollowupStage) {
  if (stage.sentAtColumn === PROMPT_VAULT_RECOVERY_STAGE_2_SENT_AT) {
    await sql`
      UPDATE checkout_attribution
      SET recovery_email_2_sent_at = NULL, updated_at = NOW()
      WHERE session_id = ${candidate.session_id}
    `
    return
  }

  await sql`
    UPDATE checkout_attribution
    SET recovery_email_3_sent_at = NULL, updated_at = NOW()
    WHERE session_id = ${candidate.session_id}
  `
}

async function sendFollowupStage(stage: FollowupStage) {
  const candidates = await getFollowupCandidates(stage)
  const results = { found: candidates.length, sent: 0, failed: 0 }

  for (const candidate of candidates) {
    if (await hasSuccessfulPromptVaultPayment(candidate.user_email)) {
      await markRecoveryResolvedByPurchase(candidate)
      continue
    }

    if (!(await claimFollowupStage(candidate, stage))) {
      continue
    }

    const firstName = getFirstNameForEmail({ email: candidate.user_email })
    const email = stage.generate({ firstName, recipientEmail: candidate.user_email })

    const sent = await sendEmail({
      to: candidate.user_email,
      from: FROM_EMAIL,
      replyTo: REPLY_TO_EMAIL,
      subject: email.subject,
      html: email.html,
      text: email.text,
      emailType: stage.emailType,
      tags: ["prompt-vault", "checkout-recovery"],
      marketing: true,
      idempotencyKey: recoveryIdempotencyKey(stage.emailType, candidate.user_email),
    })

    if (sent.success) {
      results.sent += 1
      await logAnalyticsEvent({
        eventName: "prompt_vault_checkout_recovery_sent",
        path: "/api/cron/prompt-vault-checkout-recovery",
        utm: {
          source: candidate.utm_source,
          medium: candidate.utm_medium,
          campaign: candidate.utm_campaign,
          content: candidate.utm_content,
        },
        properties: {
          session_id: candidate.session_id,
          stage: stage.emailType,
          source: candidate.source,
          campaign_id: candidate.campaign_id,
          buyer_stage: candidate.buyer_stage,
        },
      })
    } else {
      results.failed += 1
      await releaseFollowupStageClaim(candidate, stage)
    }

    await sleep(SEND_DELAY_MS)
  }

  return results
}

async function markRecoverySent(candidate: RecoveryCandidate, messageId?: string) {
  await sql`
    UPDATE checkout_attribution
    SET
      status = 'abandoned',
      recovery_email_sent_at = NOW(),
      recovery_email_type = ${PROMPT_VAULT_CHECKOUT_RECOVERY_EMAIL_TYPE},
      recovery_email_message_id = ${messageId || null},
      updated_at = NOW()
    WHERE session_id = ${candidate.session_id}
  `

  await logAnalyticsEvent({
    eventName: "prompt_vault_checkout_recovery_sent",
    path: "/api/cron/prompt-vault-checkout-recovery",
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

async function tagRecoveryCandidate(candidate: RecoveryCandidate) {
  await sql`
    UPDATE freebie_subscribers
    SET
      email_tags = (
        SELECT ARRAY(
          SELECT DISTINCT tag
          FROM UNNEST(COALESCE(email_tags, ARRAY[]::text[]) || ${buildAiPhotoshootEmailTags([], ["abandoned"])}::text[]) AS tag
          WHERE tag IS NOT NULL AND tag <> ''
        )
      ),
      updated_at = NOW()
    WHERE LOWER(BTRIM(email)) = LOWER(BTRIM(${candidate.user_email}))
  `

  await updateContactTags(candidate.user_email, {
    ...buildAiPhotoshootResendTags("abandoned"),
    prompt_vault_checkout_abandoned: "true",
  }).catch(error => {
    console.error("[prompt-vault-recovery] Failed to tag Resend contact:", error)
  })

  const aiPhotoshootSegmentId = process.env[AI_PHOTOSHOOT_AUDIENCE.resendSegmentEnvKey]
  if (aiPhotoshootSegmentId) {
    await addContactToSegment(candidate.user_email, aiPhotoshootSegmentId).catch(error => {
      console.error(
        "[prompt-vault-recovery] Failed to add contact to AI Photoshoot segment:",
        error
      )
    })
  }
}

export async function GET(request: Request) {
  const cronLogger = createCronLogger("prompt-vault-checkout-recovery")
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

    if (!envFlag("PROMPT_VAULT_CHECKOUT_RECOVERY_ENABLED")) {
      const summary = { enabled: false, found: 0, sent: 0, failed: 0, hydrated: 0 }
      await cronLogger.success(summary)
      return NextResponse.json({ success: true, ...summary })
    }

    const dryRun = new URL(request.url).searchParams.get("dry_run") === "1"
    if (dryRun) {
      await ensureRecoveryHydrationSchema()
      const candidates = await getRecoveryCandidates()
      const followups: Record<string, { found: number; sent: number; failed: number }> = {}

      if (envFlag("PROMPT_VAULT_RECOVERY_FOLLOWUPS_ENABLED")) {
        for (const stage of FOLLOWUP_STAGES) {
          const stageCandidates = await getFollowupCandidates(stage)
          followups[stage.emailType] = {
            found: stageCandidates.length,
            sent: 0,
            failed: 0,
          }
        }
      }

      const summary = {
        enabled: true,
        dryRun: true,
        found: candidates.length,
        sent: 0,
        failed: 0,
        hydrated: 0,
        followups,
      }
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
      followups: null as Record<string, { found: number; sent: number; failed: number }> | null,
    }

    for (const candidate of candidates) {
      if (await hasSuccessfulPromptVaultPayment(candidate.user_email)) {
        await markRecoveryResolvedByPurchase(candidate)
        continue
      }

      const firstName = getFirstNameForEmail({
        email: candidate.user_email,
      })
      const email = generatePromptVaultCheckoutRecoveryEmail({
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
        emailType: PROMPT_VAULT_CHECKOUT_RECOVERY_EMAIL_TYPE,
        tags: ["prompt-vault", "checkout-recovery"],
        marketing: true,
        idempotencyKey: recoveryIdempotencyKey(
          PROMPT_VAULT_CHECKOUT_RECOVERY_EMAIL_TYPE,
          candidate.user_email
        ),
      })

      if (sent.success) {
        results.sent += 1
        await markRecoverySent(candidate, sent.messageId)
        await tagRecoveryCandidate(candidate)
      } else {
        results.failed += 1
      }

      await sleep(SEND_DELAY_MS)
    }

    // Stages 2 + 3 gated separately: copy is Sandra-approval-gated, flip the env to go live.
    if (envFlag("PROMPT_VAULT_RECOVERY_FOLLOWUPS_ENABLED")) {
      results.followups = {}
      for (const stage of FOLLOWUP_STAGES) {
        results.followups[stage.emailType] = await sendFollowupStage(stage)
      }
    }

    await cronLogger.success(results)
    return NextResponse.json({ success: true, ...results })
  } catch (error: unknown) {
    await cronLogger.error(error, { step: "prompt-vault-checkout-recovery" })
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Checkout recovery cron failed",
      },
      { status: 500 }
    )
  }
}
