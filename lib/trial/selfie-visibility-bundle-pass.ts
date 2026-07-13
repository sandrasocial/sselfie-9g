import "server-only"

import { sql } from "@/lib/db/client"

export const SELFIE_VISIBILITY_BUNDLE_PASS_PRODUCT_TYPE =
  "selfie_visibility_bundle_pass"
export const SELFIE_VISIBILITY_BUNDLE_PASS_DAYS = 30
export const SELFIE_VISIBILITY_BUNDLE_PASS_CREDITS = 200

const PASS_CREDIT_DESCRIPTION =
  "One Selfie Visibility Bundle: 30-day SUITE pass (200 credits)"
const PASS_EXPIRY_DESCRIPTION =
  "One Selfie Visibility Bundle access ended: unused pass credits removed"

export type SelfieVisibilityBundlePassGrant = {
  created: boolean
  passEndsAt: Date
  creditsGranted: number
}

/**
 * Grant the paid, fixed-duration SUITE access included in the bundle.
 *
 * This is deliberately separate from `suite_trial`: a prior free trial never blocks a paid
 * pass, and no Stripe subscription is created. Stripe replay protection is keyed to the payment,
 * not merely the user: an accidental second paid order extends the fixed pass and supplies the
 * second set of credits instead of silently taking payment for access the buyer cannot receive.
 * The pass update, balance change, and ledger entry are one atomic statement.
 */
export async function grantSelfieVisibilityBundlePass({
  userId,
  stripePaymentId,
  stripeCustomerId,
  isTestMode,
}: {
  userId: string
  stripePaymentId: string
  stripeCustomerId?: string | null
  isTestMode: boolean
}): Promise<SelfieVisibilityBundlePassGrant> {
  const grantRows = await sql`
    WITH lock_guard AS MATERIALIZED (
      SELECT pg_advisory_xact_lock(
        hashtext(${`${userId}:selfie_visibility_bundle_pass:${isTestMode}`})
      ) AS locked
    ),
    existing_grant AS MATERIALIZED (
      SELECT balance_after
      FROM credit_transactions, lock_guard
      WHERE user_id = ${userId}
        AND transaction_type = 'trial_grant'
        AND description = ${PASS_CREDIT_DESCRIPTION}
        AND stripe_payment_id = ${stripePaymentId}
        AND COALESCE(is_test_mode, FALSE) = ${isTestMode}
      ORDER BY created_at ASC
      LIMIT 1
    ),
    existing_pass AS MATERIALIZED (
      SELECT id, trial_ends_at
      FROM subscriptions, lock_guard
      WHERE user_id = ${userId}
        AND product_type = 'selfie_visibility_bundle_pass'
        AND COALESCE(is_test_mode, FALSE) = ${isTestMode}
      ORDER BY created_at ASC
      LIMIT 1
    ),
    pass_update AS (
      UPDATE subscriptions
      SET
        status = 'active',
        stripe_customer_id = COALESCE(${stripeCustomerId || null}, stripe_customer_id),
        trial_ends_at = GREATEST(trial_ends_at, NOW()) + INTERVAL '30 days',
        updated_at = NOW()
      WHERE id = (SELECT id FROM existing_pass)
        AND NOT EXISTS (SELECT 1 FROM existing_grant)
      RETURNING id, trial_ends_at
    ),
    pass_insert AS (
      INSERT INTO subscriptions (
        user_id,
        plan,
        status,
        product_type,
        stripe_customer_id,
        trial_ends_at,
        is_test_mode,
        created_at,
        updated_at
      )
      SELECT
        ${userId},
        'selfie_visibility_bundle_pass',
        'active',
        'selfie_visibility_bundle_pass',
        ${stripeCustomerId || null},
        NOW() + INTERVAL '30 days',
        ${isTestMode},
        NOW(),
        NOW()
      FROM lock_guard
      WHERE NOT EXISTS (SELECT 1 FROM existing_pass)
        AND NOT EXISTS (SELECT 1 FROM existing_grant)
      RETURNING id, trial_ends_at
    ),
    pass_result AS (
      SELECT id, trial_ends_at FROM pass_update
      UNION ALL
      SELECT id, trial_ends_at FROM pass_insert
    ),
    -- A paid pass replaces the free-trial clock. Keep whatever balance she already earned,
    -- but stop the old trial cron from later deducting credits or sending expiry emails.
    superseded_trial AS (
      UPDATE subscriptions st
      SET status = 'expired', updated_at = NOW()
      FROM pass_result
      WHERE st.user_id = ${userId}
        AND st.product_type = 'suite_trial'
        AND st.status = 'active'
        AND COALESCE(st.is_test_mode, FALSE) = ${isTestMode}
      RETURNING st.id
    ),
    supersede_result AS MATERIALIZED (
      SELECT COUNT(*)::int AS superseded_count
      FROM superseded_trial
    ),
    credit_update AS (
      INSERT INTO user_credits (
        user_id,
        balance,
        total_purchased,
        total_used,
        created_at,
        updated_at
      )
      SELECT
        ${userId},
        ${SELFIE_VISIBILITY_BUNDLE_PASS_CREDITS},
        ${SELFIE_VISIBILITY_BUNDLE_PASS_CREDITS},
        0,
        NOW(),
        NOW()
      FROM lock_guard, pass_result, supersede_result
      WHERE NOT EXISTS (SELECT 1 FROM existing_grant)
      ON CONFLICT (user_id)
      DO UPDATE SET
        balance = user_credits.balance + ${SELFIE_VISIBILITY_BUNDLE_PASS_CREDITS},
        total_purchased = user_credits.total_purchased + ${SELFIE_VISIBILITY_BUNDLE_PASS_CREDITS},
        updated_at = NOW()
      RETURNING balance
    ),
    grant_log AS (
      INSERT INTO credit_transactions (
        user_id,
        amount,
        transaction_type,
        description,
        stripe_payment_id,
        balance_after,
        is_test_mode,
        created_at
      )
      SELECT
        ${userId},
        ${SELFIE_VISIBILITY_BUNDLE_PASS_CREDITS},
        'trial_grant',
        ${PASS_CREDIT_DESCRIPTION},
        ${stripePaymentId},
        credit_update.balance,
        ${isTestMode},
        NOW()
      FROM credit_update
      RETURNING balance_after
    )
    SELECT TRUE AS created, grant_log.balance_after, pass_result.trial_ends_at
    FROM grant_log
    CROSS JOIN pass_result
    UNION ALL
    SELECT FALSE AS created, existing_grant.balance_after, existing_pass.trial_ends_at
    FROM existing_grant
    CROSS JOIN existing_pass
    LIMIT 1
  `

  if (grantRows.length === 0) {
    throw new Error("Could not grant the fixed SUITE pass credits")
  }

  const created = grantRows[0].created === true
  const rawEndsAt = grantRows[0].trial_ends_at
  if (!rawEndsAt) {
    throw new Error("Could not create the fixed SUITE pass")
  }
  const passEndsAt = new Date(rawEndsAt)
  if (created) {
    try {
      const { invalidateCreditCache } = await import("@/lib/credits-cached")
      await invalidateCreditCache(userId)
    } catch (error) {
      console.warn(
        "[selfie-visibility-bundle-pass] Could not invalidate the credit cache after grant:",
        error,
      )
    }
  }

  return {
    created,
    passEndsAt,
    creditsGranted: created ? SELFIE_VISIBILITY_BUNDLE_PASS_CREDITS : 0,
  }
}

/**
 * Expire one overdue paid pass and remove only the unused portion of the current paid-pass cycle.
 *
 * Usage is net of refunds and excludes purchases/top-ups, subscription grants, bonuses, and
 * other trial/pass grants. The subscription status flip, balance change, and expiry ledger row
 * happen in one SQL statement so a failure cannot leave an expired pass with credits half-cleaned.
 */
export async function expireSelfieVisibilityBundlePass({
  passId,
  userId,
  isTestMode = false,
}: {
  passId: string | number
  userId: string
  isTestMode?: boolean
}): Promise<{ expired: boolean; creditsRemoved: number; balanceAfter: number | null }> {
  const rows = await sql`
    WITH lock_guard AS MATERIALIZED (
      SELECT pg_advisory_xact_lock(
        hashtext(${`${userId}:selfie_visibility_bundle_pass:${isTestMode}`})
      ) AS locked
    ),
    locked_credit AS MATERIALIZED (
      SELECT uc.balance
      FROM user_credits uc, lock_guard
      WHERE uc.user_id = ${userId}
      FOR UPDATE
    ),
    pass_expiry AS (
      UPDATE subscriptions s
      SET status = 'expired', updated_at = NOW()
      FROM lock_guard
      LEFT JOIN locked_credit ON TRUE
      WHERE s.id = ${passId}
        AND s.user_id = ${userId}
        AND s.product_type = 'selfie_visibility_bundle_pass'
        AND s.status = 'active'
        AND s.trial_ends_at <= NOW()
        AND COALESCE(s.is_test_mode, FALSE) = ${isTestMode}
      RETURNING s.user_id
    ),
    previous_expiry AS MATERIALIZED (
      SELECT MAX(ct.created_at) AS expired_at
      FROM credit_transactions ct, pass_expiry
      WHERE ct.user_id = ${userId}
        AND ct.transaction_type = 'trial_expiry'
        AND ct.description = ${PASS_EXPIRY_DESCRIPTION}
        AND COALESCE(ct.is_test_mode, FALSE) = ${isTestMode}
    ),
    current_cycle_grants AS MATERIALIZED (
      SELECT ct.amount, ct.created_at
      FROM credit_transactions ct, previous_expiry, pass_expiry
      WHERE ct.user_id = ${userId}
        AND ct.transaction_type = 'trial_grant'
        AND ct.description = ${PASS_CREDIT_DESCRIPTION}
        AND COALESCE(ct.is_test_mode, FALSE) = ${isTestMode}
        AND (
          previous_expiry.expired_at IS NULL
          OR ct.created_at > previous_expiry.expired_at
        )
    ),
    cycle AS (
      SELECT
        COALESCE(SUM(amount), 0)::int AS total_granted,
        MIN(created_at) AS cycle_started_at
      FROM current_cycle_grants
    ),
    usage AS (
      SELECT
        cycle.total_granted,
        GREATEST(0, -COALESCE(SUM(ct.amount), 0))::int AS net_used
      FROM cycle
      LEFT JOIN credit_transactions ct
        ON ct.user_id = ${userId}
        AND ct.transaction_type IN ('image', 'training', 'animation', 'refund')
        AND COALESCE(ct.is_test_mode, FALSE) = ${isTestMode}
        AND cycle.cycle_started_at IS NOT NULL
        AND ct.created_at >= cycle.cycle_started_at
      GROUP BY cycle.total_granted
    ),
    deduction_target AS (
      SELECT
        usage.total_granted,
        usage.net_used,
        LEAST(
          COALESCE((SELECT balance FROM locked_credit), 0),
          GREATEST(
            0,
            usage.total_granted - LEAST(usage.total_granted, usage.net_used)
          )
        )::int AS credits_to_remove
      FROM usage, pass_expiry
    ),
    deduction AS (
      UPDATE user_credits uc
      SET
        balance = GREATEST(0, uc.balance - deduction_target.credits_to_remove),
        updated_at = NOW()
      FROM deduction_target, pass_expiry pe
      WHERE uc.user_id = ${userId}
        AND pe.user_id::text = uc.user_id::text
        AND deduction_target.credits_to_remove > 0
      RETURNING
        uc.balance AS balance_after,
        deduction_target.credits_to_remove AS credits_removed
    ),
    expiry_log AS (
      INSERT INTO credit_transactions (
        user_id,
        amount,
        transaction_type,
        description,
        balance_after,
        is_test_mode,
        created_at
      )
      SELECT
        ${userId},
        -COALESCE(deduction.credits_removed, 0),
        'trial_expiry',
        ${PASS_EXPIRY_DESCRIPTION},
        COALESCE(deduction.balance_after, locked_credit.balance, 0),
        ${isTestMode},
        NOW()
      FROM pass_expiry
      CROSS JOIN deduction_target
      LEFT JOIN deduction ON TRUE
      LEFT JOIN locked_credit ON TRUE
      RETURNING amount
    )
    SELECT
      EXISTS(SELECT 1 FROM pass_expiry) AS expired,
      COALESCE((SELECT total_granted FROM deduction_target), 0)::int AS total_granted,
      COALESCE((SELECT net_used FROM deduction_target), 0)::int AS net_used,
      COALESCE((SELECT credits_removed FROM deduction), 0)::int AS credits_removed,
      COALESCE(
        (SELECT balance_after FROM deduction),
        (SELECT balance FROM locked_credit)
      )::int AS balance_after
  `

  const expired = rows[0]?.expired === true
  const creditsRemoved = Number(rows[0]?.credits_removed || 0)
  const balanceAfter =
    rows[0]?.balance_after === null || rows[0]?.balance_after === undefined
      ? null
      : Number(rows[0].balance_after)

  if (expired && creditsRemoved > 0) {
    try {
      const { invalidateCreditCache } = await import("@/lib/credits-cached")
      await invalidateCreditCache(userId)
    } catch (error) {
      console.warn(
        "[selfie-visibility-bundle-pass] Could not invalidate the credit cache after expiry:",
        error,
      )
    }
  }

  return { expired, creditsRemoved, balanceAfter }
}
