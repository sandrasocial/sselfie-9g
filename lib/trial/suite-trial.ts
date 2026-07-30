// BRIDGE-01 Phase D — SUITE 7-day trial.
//
// A trial is a subscriptions row with product_type='suite_trial' (status 'active' →
// 'expired') plus trial_ends_at. It is deliberately NOT a membership product type, so
// member counts and MRR (lib/revenue/*, Admin Data Contract) never see it. One trial per
// user, ever — including expired ones.

import { sql } from "@/lib/db/client"
import { addCredits } from "@/lib/credits"

export const TRIAL_DAYS = 7
export const TRIAL_CREDITS = 20

export type SuiteAccessLevel =
  | "member" // active paid membership — full app
  | "trial" // active trial — full app, badge + days left
  | "vault" // active Vault Maya tier — generation allowed, scoped vault surface only, never the full app
  | "limited" // expired trial or one-time owner with an account — shell, no generation
  | "none" // no relationship — app gate decides limited shell vs rollback behavior

export interface SuiteAccess {
  level: SuiteAccessLevel
  trialEndsAt: Date | null
  trialDaysLeft: number | null
}

/** One row per user, ever. Returns whether a NEW trial was created. */
export async function grantSuiteTrial(
  userId: string,
  source: string
): Promise<{ created: boolean; trialEndsAt: Date | null }> {
  const existing = await sql`
    SELECT id, trial_ends_at FROM subscriptions
    WHERE user_id = ${userId} AND product_type = 'suite_trial'
    LIMIT 1
  `
  if (existing.length > 0) {
    return {
      created: false,
      trialEndsAt: existing[0].trial_ends_at ? new Date(existing[0].trial_ends_at) : null,
    }
  }

  const inserted = await sql`
    INSERT INTO subscriptions (user_id, plan, status, product_type, trial_ends_at, created_at, updated_at)
    VALUES (${userId}, 'suite_trial', 'active', 'suite_trial', NOW() + INTERVAL '7 days', NOW(), NOW())
    RETURNING trial_ends_at
  `

  const grant = await addCredits(
    userId,
    TRIAL_CREDITS,
    "trial_grant",
    `SUITE trial: ${TRIAL_CREDITS} credits (${source})`
  )
  if (!grant.success) {
    console.error(`[suite-trial] credit grant failed for user ${userId}: ${grant.error}`)
  }

  return {
    created: true,
    trialEndsAt: inserted[0]?.trial_ends_at ? new Date(inserted[0].trial_ends_at) : null,
  }
}

/**
 * Resolve what the /app shell and generation APIs should allow for this Neon user.
 * "none" lets the app gate distinguish new free accounts from one-time owners.
 *
 * The paid One Selfie bundle pass intentionally resolves as member-level access while its fixed
 * 30-day window is active. This gives the buyer the full SUITE experience without presenting a
 * misleading free-trial badge or creating a recurring Stripe subscription.
 */
export async function getSuiteAccess(userId: string): Promise<SuiteAccess> {
  const rows = await sql`
    SELECT product_type, status, trial_ends_at
    FROM subscriptions
    WHERE user_id = ${userId}
      AND (is_test_mode = FALSE OR is_test_mode IS NULL)
      AND (
        (product_type = 'sselfie_studio_membership' AND status = 'active')
        OR (product_type = 'vault_maya' AND status = 'active')
        OR product_type = 'suite_trial'
        OR product_type = 'selfie_visibility_bundle_pass'
        OR (product_type IN ('starter_kit', 'selfie_guide', 'brand_strategy_pack', 'paid_blueprint') AND status IN ('active', 'completed'))
      )
  `

  if (rows.some((r) => r.product_type === "sselfie_studio_membership")) {
    return { level: "member", trialEndsAt: null, trialDaysLeft: null }
  }

  if (rows.some((r) => r.product_type === "vault_maya")) {
    return { level: "vault", trialEndsAt: null, trialDaysLeft: null }
  }

  const bundlePass = rows.find((r) => r.product_type === "selfie_visibility_bundle_pass")
  if (bundlePass?.trial_ends_at) {
    const endsAt = new Date(bundlePass.trial_ends_at)
    if (bundlePass.status === "active" && endsAt.getTime() > Date.now()) {
      return { level: "member", trialEndsAt: null, trialDaysLeft: null }
    }
  }

  const trial = rows.find((r) => r.product_type === "suite_trial")
  if (trial?.trial_ends_at) {
    const endsAt = new Date(trial.trial_ends_at)
    const msLeft = endsAt.getTime() - Date.now()
    if (trial.status === "active" && msLeft > 0) {
      return {
        level: "trial",
        trialEndsAt: endsAt,
        trialDaysLeft: Math.max(1, Math.ceil(msLeft / 86_400_000)),
      }
    }
    // Expired (or overdue-but-not-yet-flipped) trial → limited mode, photos stay hers.
    return { level: "limited", trialEndsAt: endsAt, trialDaysLeft: 0 }
  }

  // One-time owners with accounts also get the limited shell (Library shows what they own).
  if (rows.length > 0) {
    return { level: "limited", trialEndsAt: null, trialDaysLeft: null }
  }

  // No subscriptions relationship — entitlements can still mark her a product owner
  // (Vault/Masterclass live in academy entitlements, not subscriptions).
  try {
    const { getAcademyEntitlementState } = await import("@/lib/academy-entitlements")
    const state = await getAcademyEntitlementState(userId)
    if (state.explicitProductIds.length > 0) {
      return { level: "limited", trialEndsAt: null, trialDaysLeft: null }
    }
  } catch (e) {
    console.error("[suite-trial] entitlement fallback failed:", e)
  }

  return { level: "none", trialEndsAt: null, trialDaysLeft: null }
}

/** True when this user may call the generation APIs (member or active trial). */
export async function canGenerate(userId: string): Promise<boolean> {
  const access = await getSuiteAccess(userId)
  return access.level === "member" || access.level === "trial" || access.level === "vault"
}
