import { NextResponse } from "next/server"

import { logAnalyticsEvent } from "@/lib/analytics/events"
import { createCronLogger } from "@/lib/cron-logger"
import { sql } from "@/lib/db/client"
import { envFlag } from "@/lib/env-flags"
import { getFirstNameForEmail } from "@/lib/email/recipient-name"
import { sendEmail } from "@/lib/email/send-email"
import {
  generateOneSelfieBundleCheckoutRecoveryEmail,
  ONE_SELFIE_BUNDLE_CHECKOUT_RECOVERY_EMAIL_TYPE,
} from "@/lib/email/templates/one-selfie-bundle-checkout-recovery"
import {
  generateStarterKitCheckoutRecovery2Email,
  generateStarterKitCheckoutRecoveryEmail,
  STARTER_KIT_CHECKOUT_RECOVERY_2_EMAIL_TYPE,
  STARTER_KIT_CHECKOUT_RECOVERY_EMAIL_TYPE,
} from "@/lib/email/templates/starter-kit-checkout-recovery"
import {
  getSelfieVisibilityBundleOfferStatus,
  SELFIE_VISIBILITY_BUNDLE_CLOSES_AT,
  SELFIE_VISIBILITY_BUNDLE_OPENS_AT,
} from "@/lib/launch/selfie-visibility-bundle"
import { ensureRevenueEngineSchema } from "@/lib/revenue-engine/checkout-attribution"
import { stripe } from "@/lib/stripe"

export const dynamic = "force-dynamic"
export const maxDuration = 60

const FROM_EMAIL = "Sandra from SSELFIE <hello@sselfie.ai>"
const REPLY_TO_EMAIL = "hello@sselfie.ai"
const SEND_DELAY_MS = 650
const HYDRATE_EMAIL_LIMIT = 50
const BUNDLE_RECOVERY_BATCH_LIMIT = 4
const RECOVERY_WORK_BUDGET_MS = 38_000
const RECOVERY_OPERATION_LIMIT = 16
const HYDRATE_RECHECK_AFTER_HOURS = 12
const HYDRATE_MAX_ATTEMPTS = 3

type RecoveryWorkBudget = {
  deadlineAt: number
  operationsRemaining: number
}

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

function createRecoveryWorkBudget(): RecoveryWorkBudget {
  return {
    deadlineAt: Date.now() + RECOVERY_WORK_BUDGET_MS,
    operationsRemaining: RECOVERY_OPERATION_LIMIT,
  }
}

function hasRecoveryBudget(budget: RecoveryWorkBudget): boolean {
  return budget.operationsRemaining > 0 && Date.now() < budget.deadlineAt
}

function claimRecoveryOperation(budget: RecoveryWorkBudget): boolean {
  if (!hasRecoveryBudget(budget)) return false
  budget.operationsRemaining -= 1
  return true
}

async function paceWithinRecoveryBudget(budget: RecoveryWorkBudget) {
  if (Date.now() + SEND_DELAY_MS < budget.deadlineAt) {
    await sleep(SEND_DELAY_MS)
  }
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
    CREATE INDEX IF NOT EXISTS checkout_attribution_email_hydration_idx
    ON checkout_attribution (product_type, status, email_hydration_checked_at, created_at DESC)
  `
}

async function hydrateMissingCheckoutEmails(budget: RecoveryWorkBudget) {
  if (!hasRecoveryBudget(budget)) {
    return { checked: 0, hydrated: 0, unavailable: 0, failed: 0, budgetExhausted: true }
  }
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

  const results = {
    checked: sessions.length,
    hydrated: 0,
    unavailable: 0,
    failed: 0,
    budgetExhausted: false,
  }

  for (const session of sessions) {
    if (!claimRecoveryOperation(budget)) {
      results.budgetExhausted = true
      break
    }
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

    await paceWithinRecoveryBudget(budget)
  }

  return results
}

async function hydrateMissingBundleCheckoutEmails(budget: RecoveryWorkBudget) {
  if (!hasRecoveryBudget(budget)) {
    return { checked: 0, hydrated: 0, unavailable: 0, failed: 0, budgetExhausted: true }
  }
  await ensureRecoveryHydrationSchema()

  const sessions = (await sql`
    SELECT session_id, email_hydration_attempts
    FROM checkout_attribution
    WHERE product_type = 'selfie_visibility_bundle'
      AND status = 'started'
      AND (user_email IS NULL OR BTRIM(user_email) = '')
      AND recovery_email_sent_at IS NULL
      AND created_at >= ${SELFIE_VISIBILITY_BUNDLE_OPENS_AT}::timestamptz
      AND created_at < ${SELFIE_VISIBILITY_BUNDLE_CLOSES_AT}::timestamptz
      AND created_at <= NOW() - INTERVAL '3 hours'
      AND email_hydration_attempts < ${HYDRATE_MAX_ATTEMPTS}
      AND (
        email_hydration_checked_at IS NULL
        OR email_hydration_checked_at <= NOW() - (${`${HYDRATE_RECHECK_AFTER_HOURS} hours`}::interval)
      )
    ORDER BY created_at ASC
    LIMIT ${BUNDLE_RECOVERY_BATCH_LIMIT}
  `) as Array<{ session_id: string; email_hydration_attempts: number }>

  const results = {
    checked: sessions.length,
    hydrated: 0,
    unavailable: 0,
    failed: 0,
    budgetExhausted: false,
  }

  for (const session of sessions) {
    if (!claimRecoveryOperation(budget)) {
      results.budgetExhausted = true
      break
    }
    try {
      const checkoutSession = await stripe.checkout.sessions.retrieve(session.session_id)
      const email =
        checkoutSession.customer_details?.email?.trim() ||
        checkoutSession.customer_email?.trim() ||
        null

      await sql`
        UPDATE checkout_attribution
        SET
          user_email = COALESCE(${email}, user_email),
          email_hydration_checked_at = NOW(),
          email_hydration_attempts = email_hydration_attempts + 1,
          updated_at = NOW()
        WHERE session_id = ${session.session_id}
          AND (user_email IS NULL OR BTRIM(user_email) = '')
      `

      if (email) {
        results.hydrated += 1
      } else {
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
      console.error("[one-selfie-bundle-recovery] Failed to hydrate Stripe checkout email:", {
        sessionId: session.session_id,
        error,
      })
    }

    await paceWithinRecoveryBudget(budget)
  }

  return results
}

async function getBundleRecoveryCandidates(): Promise<RecoveryCandidate[]> {
  await ensureRevenueEngineSchema()

  return (await sql`
    WITH eligible_checkouts AS (
      SELECT
        ca.session_id,
        ca.user_email,
        ca.source,
        ca.utm_source,
        ca.utm_medium,
        ca.utm_campaign,
        ca.utm_content,
        ca.campaign_id,
        ca.cta_keyword,
        ca.entry_post_slug,
        ca.buyer_stage,
        ca.created_at,
        ROW_NUMBER() OVER (
          PARTITION BY LOWER(BTRIM(ca.user_email))
          ORDER BY ca.created_at ASC
        ) AS email_rank
      FROM checkout_attribution ca
      WHERE ca.product_type = 'selfie_visibility_bundle'
        AND ca.status = 'started'
        AND ca.user_email IS NOT NULL
        AND BTRIM(ca.user_email) <> ''
        AND ca.recovery_email_sent_at IS NULL
        AND ca.created_at >= ${SELFIE_VISIBILITY_BUNDLE_OPENS_AT}::timestamptz
        AND ca.created_at < ${SELFIE_VISIBILITY_BUNDLE_CLOSES_AT}::timestamptz
        AND ca.created_at <= NOW() - INTERVAL '3 hours'
        AND NOT EXISTS (
          SELECT 1
          FROM email_logs el
          WHERE LOWER(BTRIM(el.user_email)) = LOWER(BTRIM(ca.user_email))
            AND el.email_type = ${ONE_SELFIE_BUNDLE_CHECKOUT_RECOVERY_EMAIL_TYPE}
            AND el.status IN ('sent', 'delivered', 'suppressed')
        )
        AND NOT EXISTS (
          SELECT 1
          FROM stripe_payments sp
          WHERE sp.product_type = 'selfie_visibility_bundle'
            AND sp.status IN ('succeeded', 'paid')
            AND sp.is_test_mode = FALSE
            AND (
              sp.checkout_session_id = ca.session_id
              OR LOWER(BTRIM(sp.customer_email)) = LOWER(BTRIM(ca.user_email))
            )
        )
        AND NOT EXISTS (
          SELECT 1
          FROM users u
          JOIN subscriptions s ON s.user_id = u.id
          WHERE LOWER(BTRIM(u.email)) = LOWER(BTRIM(ca.user_email))
            AND s.product_type IN ('sselfie_studio_membership', 'sselfie_studio_membership_annual', 'brand_studio_membership', 'pro')
            AND s.status = 'active'
            AND COALESCE(s.is_test_mode, FALSE) = FALSE
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
    LIMIT ${BUNDLE_RECOVERY_BATCH_LIMIT}
  `) as RecoveryCandidate[]
}

async function markBundleRecoverySent(candidate: RecoveryCandidate, messageId?: string) {
  await sql`
    UPDATE checkout_attribution
    SET
      status = 'abandoned',
      recovery_email_sent_at = NOW(),
      recovery_email_type = ${ONE_SELFIE_BUNDLE_CHECKOUT_RECOVERY_EMAIL_TYPE},
      recovery_email_message_id = ${messageId || null},
      updated_at = NOW()
    WHERE session_id = ${candidate.session_id}
      AND status = 'started'
      AND recovery_email_sent_at IS NULL
  `
}

async function sendBundleCheckoutRecovery(budget: RecoveryWorkBudget) {
  const offer = getSelfieVisibilityBundleOfferStatus(new Date())
  if (!offer.isOpen) {
    return {
      active: false,
      enabled: envFlag("ONE_SELFIE_BUNDLE_CHECKOUT_RECOVERY_ENABLED"),
      phase: offer.phase,
      found: 0,
      sent: 0,
      skippedPaidOrCompleted: 0,
      stoppedAtClose: false,
      failed: 0,
      hydration: { checked: 0, hydrated: 0, unavailable: 0, failed: 0, budgetExhausted: false },
      budgetExhausted: false,
    }
  }

  const hydration = await hydrateMissingBundleCheckoutEmails(budget)
  const candidates = hasRecoveryBudget(budget) ? await getBundleRecoveryCandidates() : []
  if (!envFlag("ONE_SELFIE_BUNDLE_CHECKOUT_RECOVERY_ENABLED")) {
    return {
      active: true,
      enabled: false,
      phase: offer.phase,
      found: candidates.length,
      sent: 0,
      skippedPaidOrCompleted: 0,
      stoppedAtClose: false,
      failed: 0,
      hydration,
      budgetExhausted: !hasRecoveryBudget(budget),
    }
  }

  const results = {
    active: true,
    enabled: true,
    phase: offer.phase,
    found: candidates.length,
    sent: 0,
    skippedPaidOrCompleted: 0,
    stoppedAtClose: false,
    failed: 0,
    hydration,
    budgetExhausted: false,
  }

  for (const candidate of candidates) {
    if (!claimRecoveryOperation(budget)) {
      results.budgetExhausted = true
      break
    }
    try {
      const checkoutSession = await stripe.checkout.sessions.retrieve(candidate.session_id)
      if (
        checkoutSession.payment_status === "paid" ||
        checkoutSession.status === "complete"
      ) {
        results.skippedPaidOrCompleted += 1
        await sql`
          UPDATE checkout_attribution
          SET status = 'completed', updated_at = NOW()
          WHERE session_id = ${candidate.session_id}
            AND status = 'started'
        `
        continue
      }

      const firstName = getFirstNameForEmail({ email: candidate.user_email })
      const email = generateOneSelfieBundleCheckoutRecoveryEmail({
        firstName,
        recipientEmail: candidate.user_email,
      })
      if (!getSelfieVisibilityBundleOfferStatus(new Date()).isOpen) {
        results.stoppedAtClose = true
        break
      }
      const sent = await sendEmail({
        to: candidate.user_email,
        from: FROM_EMAIL,
        replyTo: REPLY_TO_EMAIL,
        subject: email.subject,
        html: email.html,
        text: email.text,
        emailType: ONE_SELFIE_BUNDLE_CHECKOUT_RECOVERY_EMAIL_TYPE,
        tags: ["one-selfie-bundle", "checkout-recovery"],
        marketing: true,
      })

      if (sent.success) {
        results.sent += 1
        await markBundleRecoverySent(candidate, sent.messageId)
      } else {
        results.failed += 1
      }
    } catch (error) {
      results.failed += 1
      console.error("[one-selfie-bundle-recovery] Failed to verify or send:", {
        sessionId: candidate.session_id,
        error,
      })
    }

    await paceWithinRecoveryBudget(budget)
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

type FollowupStage = {
  emailType: string
  afterHours: number
  requiresEmailType: string
  generate: (input: { firstName: string; recipientEmail?: string | null }) => {
    subject: string
    html: string
    text: string
  }
}

const FOLLOWUP_STAGES: FollowupStage[] = [
  {
    emailType: STARTER_KIT_CHECKOUT_RECOVERY_2_EMAIL_TYPE,
    afterHours: 48,
    requiresEmailType: STARTER_KIT_CHECKOUT_RECOVERY_EMAIL_TYPE,
    generate: generateStarterKitCheckoutRecovery2Email,
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
      WHERE product_type = 'starter_kit'
        AND status = 'abandoned'
        AND user_email IS NOT NULL
        AND BTRIM(user_email) <> ''
        AND recovery_email_sent_at IS NOT NULL
        AND recovery_email_sent_at <= NOW() - (${`${stage.afterHours} hours`}::interval)
        AND recovery_email_sent_at > NOW() - INTERVAL '14 days'
        AND NOT EXISTS (
          SELECT 1
          FROM stripe_payments sp
          WHERE LOWER(BTRIM(sp.customer_email)) = LOWER(BTRIM(ca.user_email))
            AND sp.product_type = 'starter_kit'
            AND sp.status IN ('succeeded', 'paid')
            AND sp.is_test_mode = FALSE
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

async function sendFollowupStage(stage: FollowupStage, budget: RecoveryWorkBudget) {
  const candidates = hasRecoveryBudget(budget) ? await getFollowupCandidates(stage) : []
  const results = { found: candidates.length, sent: 0, failed: 0, budgetExhausted: false }

  for (const candidate of candidates) {
    if (!claimRecoveryOperation(budget)) {
      results.budgetExhausted = true
      break
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
      tags: ["starter-kit", "checkout-recovery"],
      marketing: true,
    })

    if (sent.success) {
      results.sent += 1
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
          stage: stage.emailType,
          source: candidate.source,
          campaign_id: candidate.campaign_id,
          buyer_stage: candidate.buyer_stage,
        },
      })
    } else {
      results.failed += 1
    }

    await paceWithinRecoveryBudget(budget)
  }

  return results
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
  const workBudget = createRecoveryWorkBudget()
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

    let bundleRecoveryError: unknown = null
    let bundleRecovery: Awaited<ReturnType<typeof sendBundleCheckoutRecovery>> | null = null
    try {
      bundleRecovery = await sendBundleCheckoutRecovery(workBudget)
    } catch (error) {
      bundleRecoveryError = error
      console.error("[one-selfie-bundle-recovery] Shared recovery job failed:", error)
    }

    if (!envFlag("STARTER_KIT_CHECKOUT_RECOVERY_ENABLED")) {
      if (bundleRecoveryError) throw bundleRecoveryError
      const summary = {
        enabled: false,
        found: 0,
        sent: 0,
        failed: 0,
        hydrated: 0,
        bundleRecovery,
      }
      await cronLogger.success(summary)
      return NextResponse.json({ success: true, ...summary })
    }

    const hydration = await hydrateMissingCheckoutEmails(workBudget)
    const candidates = hasRecoveryBudget(workBudget) ? await getRecoveryCandidates() : []
    const results = {
      enabled: true,
      found: candidates.length,
      sent: 0,
      failed: 0,
      hydration,
      bundleRecovery,
      budgetExhausted: false,
      followups: null as Record<string, { found: number; sent: number; failed: number; budgetExhausted: boolean }> | null,
    }

    for (const candidate of candidates) {
      if (!claimRecoveryOperation(workBudget)) {
        results.budgetExhausted = true
        break
      }
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

      await paceWithinRecoveryBudget(workBudget)
    }

    if (envFlag("STARTER_KIT_RECOVERY_FOLLOWUPS_ENABLED") && hasRecoveryBudget(workBudget)) {
      results.followups = {}
      for (const stage of FOLLOWUP_STAGES) {
        results.followups[stage.emailType] = await sendFollowupStage(stage, workBudget)
      }
    }

    results.budgetExhausted = results.budgetExhausted || !hasRecoveryBudget(workBudget)

    if (bundleRecoveryError) throw bundleRecoveryError

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
