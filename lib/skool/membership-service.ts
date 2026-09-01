import { sql } from "@/lib/db/client"
import {
  SKOOL_GROUP_ID,
  SKOOL_MEMBERSHIP_CREDITS,
  SKOOL_PLAN_CODE,
  type SkoolMembershipEnvelope,
} from "@/lib/skool/membership-contract"

export type SkoolMembershipGrantResult = {
  replay: boolean
  creditsGranted: number
  balance: number
}

/**
 * Commit one externally verified membership and its initial monthly allocation.
 * The event claim, entitlement, wallet delta, and ledger row share one DB
 * transaction. Nothing here creates or changes a Stripe row.
 */
export async function grantSkoolMembership(input: {
  userId: string
  envelope: SkoolMembershipEnvelope
}): Promise<SkoolMembershipGrantResult> {
  const creditReference = `skool-membership-initial:${input.envelope.membershipKey}`
  const transactionRows = (await sql.transaction(tx => [
    tx`SELECT pg_advisory_xact_lock(hashtext(${input.envelope.membershipKey}))`,
    tx`
      WITH entitlement AS (
        INSERT INTO skool_membership_entitlements (
          membership_key, user_id, group_id, plan_code, access_status,
          reconciliation_status, consecutive_roster_misses, source_event_id,
          first_observed_at, last_observed_at, last_confirmed_at, updated_at
        )
        VALUES (
          ${input.envelope.membershipKey}, ${input.userId}, ${SKOOL_GROUP_ID},
          ${SKOOL_PLAN_CODE}, 'active', 'present', 0, ${input.envelope.dedupeKey},
          ${input.envelope.observedAt}, ${input.envelope.observedAt},
          ${input.envelope.observedAt}, NOW()
        )
        ON CONFLICT (membership_key) DO UPDATE SET
          reconciliation_status = 'present',
          consecutive_roster_misses = 0,
          last_observed_at = GREATEST(
            skool_membership_entitlements.last_observed_at,
            EXCLUDED.last_observed_at
          ),
          last_confirmed_at = GREATEST(
            skool_membership_entitlements.last_confirmed_at,
            EXCLUDED.last_confirmed_at
          ),
          updated_at = NOW()
        WHERE skool_membership_entitlements.user_id = EXCLUDED.user_id
          AND skool_membership_entitlements.group_id = EXCLUDED.group_id
          AND skool_membership_entitlements.plan_code = EXCLUDED.plan_code
        RETURNING membership_key
      ), event_claim AS (
        INSERT INTO skool_membership_events (
          dedupe_key, membership_key, event_type, observed_at
        )
        SELECT
          ${input.envelope.dedupeKey}, entitlement.membership_key,
          'membership.present', ${input.envelope.observedAt}
        FROM entitlement
        ON CONFLICT (dedupe_key) DO NOTHING
        RETURNING dedupe_key
      ), existing_grant AS (
        SELECT balance_after
        FROM credit_transactions
        WHERE user_id = ${input.userId}
          AND transaction_type = 'subscription_grant'
          AND reference_id = ${creditReference}
        ORDER BY id ASC
        LIMIT 1
      ), wallet AS (
        INSERT INTO user_credits (
          user_id, balance, total_purchased, total_used, created_at, updated_at
        )
        SELECT ${input.userId}, ${SKOOL_MEMBERSHIP_CREDITS},
               ${SKOOL_MEMBERSHIP_CREDITS}, 0, NOW(), NOW()
        FROM event_claim
        WHERE NOT EXISTS (SELECT 1 FROM existing_grant)
        ON CONFLICT (user_id) DO UPDATE SET
          balance = user_credits.balance + ${SKOOL_MEMBERSHIP_CREDITS},
          total_purchased = user_credits.total_purchased + ${SKOOL_MEMBERSHIP_CREDITS},
          updated_at = NOW()
        RETURNING balance
      ), ledger AS (
        INSERT INTO credit_transactions (
          user_id, amount, transaction_type, description, reference_id,
          stripe_payment_id, balance_after, is_test_mode, created_at
        )
        SELECT
          ${input.userId}, ${SKOOL_MEMBERSHIP_CREDITS}, 'subscription_grant',
          'Skool membership initial monthly allocation', ${creditReference},
          NULL, wallet.balance, FALSE, NOW()
        FROM wallet
        ON CONFLICT (user_id, reference_id)
          WHERE transaction_type = 'subscription_grant'
            AND reference_id LIKE 'skool-membership-initial:%'
        DO NOTHING
        RETURNING balance_after
      )
      SELECT
        EXISTS (SELECT 1 FROM entitlement) AS entitlement_upserted,
        EXISTS (SELECT 1 FROM event_claim) AS event_claimed,
        EXISTS (SELECT 1 FROM ledger) AS credits_granted,
        COALESCE(
          (SELECT balance_after FROM ledger),
          (SELECT balance_after FROM existing_grant),
          (SELECT balance FROM user_credits WHERE user_id = ${input.userId}),
          0
        ) AS balance
    `,
  ])) as unknown[]

  const rows = transactionRows[transactionRows.length - 1] as Array<Record<string, unknown>>
  const row = rows?.[0]
  if (!row || row.entitlement_upserted !== true) {
    throw new Error("SKOOL_ENTITLEMENT_CONFLICT")
  }

  const creditsGranted = row.credits_granted === true ? SKOOL_MEMBERSHIP_CREDITS : 0
  if (creditsGranted > 0) {
    try {
      const { invalidateCreditCache } = await import("@/lib/credits-cached")
      await invalidateCreditCache(input.userId)
    } catch {
      // The committed database balance is authoritative.
    }
  }

  return {
    replay: row.event_claimed !== true,
    creditsGranted,
    balance: Number(row.balance || 0),
  }
}

export async function hasActiveSkoolMembership(userId: string): Promise<boolean> {
  try {
    const rows = await sql`
      SELECT 1
      FROM skool_membership_entitlements
      WHERE user_id = ${userId}
        AND access_status = 'active'
        AND group_id = ${SKOOL_GROUP_ID}
        AND plan_code = ${SKOOL_PLAN_CODE}
      LIMIT 1
    `
    return rows.length > 0
  } catch {
    // Deploying application code before the additive migration must fail closed.
    return false
  }
}

/** Missing roster observations never revoke access; two misses only raise review. */
export async function recordSkoolRosterObservation(input: {
  membershipKey: string
  present: boolean
  observedAt: Date
}): Promise<{
  reconciliationStatus: "present" | "missing_unconfirmed" | "churn_review_required"
  consecutiveMisses: number
  accessRevoked: false
}> {
  const rows = await sql`
    UPDATE skool_membership_entitlements
    SET
      reconciliation_status = CASE
        WHEN ${input.present} THEN 'present'
        WHEN consecutive_roster_misses + 1 >= 2 THEN 'churn_review_required'
        ELSE 'missing_unconfirmed'
      END,
      consecutive_roster_misses = CASE
        WHEN ${input.present} THEN 0
        ELSE consecutive_roster_misses + 1
      END,
      last_observed_at = GREATEST(last_observed_at, ${input.observedAt.toISOString()}),
      last_confirmed_at = CASE
        WHEN ${input.present}
          THEN GREATEST(last_confirmed_at, ${input.observedAt.toISOString()})
        ELSE last_confirmed_at
      END,
      updated_at = NOW()
    WHERE membership_key = ${input.membershipKey}
      AND group_id = ${SKOOL_GROUP_ID}
      AND plan_code = ${SKOOL_PLAN_CODE}
    RETURNING reconciliation_status, consecutive_roster_misses
  `
  const row = rows[0]
  if (!row) throw new Error("SKOOL_MEMBERSHIP_NOT_FOUND")
  return {
    reconciliationStatus: row.reconciliation_status,
    consecutiveMisses: Number(row.consecutive_roster_misses),
    accessRevoked: false,
  }
}
