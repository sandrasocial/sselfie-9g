/**
 * Repair Prompt Vault checkout attribution from already-recorded stripe_payments.
 *
 * This is intentionally narrow:
 * - Does not call Stripe
 * - Does not send emails
 * - Does not grant access or entitlements
 * - Only marks checkout_attribution rows completed when a succeeded Prompt Vault
 *   stripe_payments row already contains the matching checkout session id.
 *
 * Usage:
 *   DRY_RUN=true pnpm exec tsx scripts/backfill/repair-prompt-vault-checkout-attribution.ts
 *   pnpm exec tsx scripts/backfill/repair-prompt-vault-checkout-attribution.ts
 */

import { config } from "dotenv"
import { neon } from "@neondatabase/serverless"
import { join } from "path"

config({ path: join(process.cwd(), ".env.local") })
config({ path: join(process.cwd(), ".env") })

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL not set")
}

const sql = neon(DATABASE_URL)
const DRY_RUN = process.env.DRY_RUN === "true"

type Candidate = {
  session_id: string
  stripe_payment_id: string
  stripe_customer_id: string | null
  user_id: string | null
  amount_cents: number | null
  currency: string | null
  payment_date: string
  user_email: string | null
  email_type: string | null
  campaign_id: number | null
  recovery_email_sent_at: string | null
  status: string
}

async function getCandidates(): Promise<Candidate[]> {
  return (await sql`
    SELECT
      ca.session_id,
      sp.stripe_payment_id,
      sp.stripe_customer_id,
      COALESCE(NULLIF(sp.user_id, ''), ca.user_id) AS user_id,
      sp.amount_cents,
      sp.currency,
      sp.payment_date,
      ca.user_email,
      ca.email_type,
      ca.campaign_id,
      ca.recovery_email_sent_at,
      ca.status
    FROM stripe_payments sp
    INNER JOIN checkout_attribution ca
      ON ca.session_id = sp.metadata->>'stripe_session_id'
    WHERE (sp.product_type = 'prompt_vault' OR sp.payment_type = 'prompt_vault')
      AND sp.status = 'succeeded'
      AND ca.product_type = 'prompt_vault'
      AND ca.status <> 'completed'
    ORDER BY sp.payment_date ASC
  `) as Candidate[]
}

async function repairCheckoutAttribution(candidate: Candidate) {
  if (DRY_RUN) return

  await sql`
    UPDATE checkout_attribution
    SET
      status = 'completed',
      user_id = COALESCE(${candidate.user_id}, user_id),
      stripe_customer_id = COALESCE(${candidate.stripe_customer_id}, stripe_customer_id),
      stripe_payment_id = COALESCE(${candidate.stripe_payment_id}, stripe_payment_id),
      purchase_value_cents = COALESCE(${candidate.amount_cents}, purchase_value_cents),
      purchase_currency = COALESCE(${candidate.currency || "usd"}, purchase_currency),
      purchased_at = COALESCE(${candidate.payment_date}, purchased_at),
      recovered_at = CASE
        WHEN recovery_email_sent_at IS NOT NULL THEN COALESCE(recovered_at, ${candidate.payment_date})
        ELSE recovered_at
      END,
      updated_at = NOW()
    WHERE session_id = ${candidate.session_id}
  `
}

async function markEmailConversion(candidate: Candidate) {
  if (DRY_RUN || !candidate.user_email) return

  if (candidate.recovery_email_sent_at) {
    await sql`
      WITH candidate_log AS (
        SELECT id
        FROM email_logs
        WHERE LOWER(user_email) = LOWER(${candidate.user_email})
          AND email_type = 'prompt-vault-checkout-recovery'
          AND converted = false
          AND sent_at >= NOW() - INTERVAL '30 days'
        ORDER BY clicked_at DESC NULLS LAST, opened_at DESC NULLS LAST, sent_at DESC NULLS LAST
        LIMIT 1
      )
      UPDATE email_logs
      SET converted = true, converted_at = COALESCE(converted_at, NOW())
      WHERE id IN (SELECT id FROM candidate_log)
    `
  }

  if (candidate.email_type) {
    await sql`
      WITH candidate_log AS (
        SELECT id
        FROM email_logs
        WHERE LOWER(user_email) = LOWER(${candidate.user_email})
          AND email_type = ${candidate.email_type}
          AND converted = false
          AND sent_at >= NOW() - INTERVAL '30 days'
        ORDER BY clicked_at DESC NULLS LAST, opened_at DESC NULLS LAST, sent_at DESC NULLS LAST
        LIMIT 1
      )
      UPDATE email_logs
      SET converted = true, converted_at = COALESCE(converted_at, NOW())
      WHERE id IN (SELECT id FROM candidate_log)
    `
  }

  if (candidate.campaign_id) {
    await sql`
      UPDATE email_logs
      SET converted = true, converted_at = COALESCE(converted_at, NOW())
      WHERE LOWER(user_email) = LOWER(${candidate.user_email})
        AND campaign_id = ${candidate.campaign_id}
        AND converted = false
    `
  }
}

async function main() {
  const candidates = await getCandidates()

  console.log(
    JSON.stringify(
      {
        dryRun: DRY_RUN,
        candidates: candidates.length,
        sessions: candidates.map((candidate) => ({
          session_id: candidate.session_id,
          status: candidate.status,
          stripe_payment_id: candidate.stripe_payment_id,
          amount_cents: candidate.amount_cents,
          user_email: candidate.user_email ? candidate.user_email.replace(/^(.{2}).*(@.*)$/, "$1***$2") : null,
          email_type: candidate.email_type,
          recovery: Boolean(candidate.recovery_email_sent_at),
        })),
      },
      null,
      2,
    ),
  )

  for (const candidate of candidates) {
    await repairCheckoutAttribution(candidate)
    await markEmailConversion(candidate)
  }

  if (!DRY_RUN) {
    console.log(`Repaired ${candidates.length} Prompt Vault checkout attribution row(s).`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
