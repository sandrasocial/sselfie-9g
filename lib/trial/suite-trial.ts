// BRIDGE-01 Phase D — SUITE 7-day trial.
//
// A trial is a subscriptions row with product_type='suite_trial' (status 'active' →
// 'expired') plus trial_ends_at. It is deliberately NOT a membership product type, so
// member counts and MRR (lib/revenue/*, Admin Data Contract) never see it. One trial per
// user, ever — including expired ones.

import { sql } from "@/lib/db/client"
import { addCredits } from "@/lib/credits"
import { hasSubscriptionAccess } from "@/lib/membership-access-policy"
import { hasActiveSkoolMembership } from "@/lib/skool/membership-service"

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
  /** Calendar is part of full SUITE/Pro, bundle passes, and trials—not Maya Essential. */
  calendarIncluded: boolean
  /** Broader Work/Learn surfaces are provided by full SUITE, bundle passes, and trials. */
  fullAppIncluded: boolean
  /** Prompt Vault is included by full SUITE and bundle passes, never by trial alone. */
  vaultIncludedBySuite: boolean
  /** The paid-membership Vault notice belongs only to a full recurring membership. */
  fullMembershipIncluded: boolean
}

export function isMayaEssentialOnlyAccess(
  access: Pick<SuiteAccess, "level" | "fullAppIncluded">
): boolean {
  return access.level === "member" && !access.fullAppIncluded
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
    SELECT product_type, plan, status, current_period_end, trial_ends_at
    FROM subscriptions
    WHERE user_id = ${userId}
      AND (is_test_mode = FALSE OR is_test_mode IS NULL)
      AND (
        product_type IN ('sselfie_studio_membership', 'brand_studio_membership', 'pro')
        OR (product_type = 'vault_maya' AND status = 'active')
        OR product_type = 'suite_trial'
        OR product_type = 'selfie_visibility_bundle_pass'
        OR (product_type IN ('starter_kit', 'selfie_guide', 'brand_strategy_pack', 'paid_blueprint') AND status IN ('active', 'completed'))
      )
  `
  const hasActiveSkool = await hasActiveSkoolMembership(userId)

  // Entitlement precedence (Sandra, 2026-07-30): paid SUITE > active bundle pass >
  // active trial > Vault Maya. A HIGHER temporary tier must never be downgraded by a
  // vault_maya row, and when the temporary tier expires an active vault_maya keeps
  // studio access instead of falling to "limited".
  const activeMemberships = rows.filter(
    r =>
      ["sselfie_studio_membership", "brand_studio_membership", "pro"].includes(r.product_type) &&
      hasSubscriptionAccess(r)
  )
  const bundlePass = rows.find(r => r.product_type === "selfie_visibility_bundle_pass")
  const bundlePassEndsAt = bundlePass?.trial_ends_at ? new Date(bundlePass.trial_ends_at) : null
  const hasActiveBundlePass =
    bundlePass?.status === "active" &&
    bundlePassEndsAt !== null &&
    bundlePassEndsAt.getTime() > Date.now()
  const trial = rows.find(r => r.product_type === "suite_trial")
  const activeTrialEndsAt =
    trial?.trial_ends_at && trial.status === "active" ? new Date(trial.trial_ends_at) : null
  const hasActiveTrial = Boolean(activeTrialEndsAt && activeTrialEndsAt.getTime() > Date.now())
  const hasActiveFullMembership = activeMemberships.some(r => r.plan !== "maya_essential_pilot")
  const fullAppIncluded = hasActiveFullMembership || hasActiveBundlePass || hasActiveTrial
  const vaultIncludedBySuite = hasActiveFullMembership || hasActiveBundlePass

  if (hasActiveFullMembership) {
    return {
      level: "member",
      trialEndsAt: null,
      trialDaysLeft: null,
      calendarIncluded: fullAppIncluded,
      fullAppIncluded,
      vaultIncludedBySuite,
      fullMembershipIncluded: hasActiveFullMembership,
    }
  }

  // Skool is an independent paid-membership authority. It must unlock the same
  // canonical /app and generation path as a full Stripe membership without
  // creating a synthetic subscriptions row.
  if (hasActiveSkool) {
    return {
      level: "member",
      trialEndsAt: null,
      trialDaysLeft: null,
      calendarIncluded: true,
      fullAppIncluded: true,
      vaultIncludedBySuite: true,
      fullMembershipIncluded: true,
    }
  }

  // Maya Essential remains generation-only unless another full entitlement is active.
  if (activeMemberships.length > 0) {
    return {
      level: "member",
      trialEndsAt: null,
      trialDaysLeft: null,
      calendarIncluded: fullAppIncluded,
      fullAppIncluded,
      vaultIncludedBySuite,
      fullMembershipIncluded: false,
    }
  }

  if (hasActiveBundlePass) {
    return {
      level: "member",
      trialEndsAt: null,
      trialDaysLeft: null,
      calendarIncluded: true,
      fullAppIncluded: true,
      vaultIncludedBySuite: true,
      fullMembershipIncluded: false,
    }
  }

  if (activeTrialEndsAt && hasActiveTrial) {
    const msLeft = activeTrialEndsAt.getTime() - Date.now()
    return {
      level: "trial",
      trialEndsAt: activeTrialEndsAt,
      trialDaysLeft: Math.max(1, Math.ceil(msLeft / 86_400_000)),
      calendarIncluded: true,
      fullAppIncluded: true,
      vaultIncludedBySuite: false,
      fullMembershipIncluded: false,
    }
  }

  if (rows.some(r => r.product_type === "vault_maya")) {
    return {
      level: "vault",
      trialEndsAt: null,
      trialDaysLeft: null,
      calendarIncluded: false,
      fullAppIncluded: false,
      vaultIncludedBySuite: false,
      fullMembershipIncluded: false,
    }
  }

  if (trial?.trial_ends_at) {
    // Expired (or overdue-but-not-yet-flipped) trial → limited mode, photos stay hers.
    return {
      level: "limited",
      trialEndsAt: new Date(trial.trial_ends_at),
      trialDaysLeft: 0,
      calendarIncluded: false,
      fullAppIncluded: false,
      vaultIncludedBySuite: false,
      fullMembershipIncluded: false,
    }
  }

  // One-time owners with accounts also get the limited shell (Library shows what they own).
  if (
    rows.some(
      r => !["sselfie_studio_membership", "brand_studio_membership", "pro"].includes(r.product_type)
    )
  ) {
    return {
      level: "limited",
      trialEndsAt: null,
      trialDaysLeft: null,
      calendarIncluded: false,
      fullAppIncluded: false,
      vaultIncludedBySuite: false,
      fullMembershipIncluded: false,
    }
  }

  // No subscriptions relationship — entitlements can still mark her a product owner
  // (Vault/Masterclass live in academy entitlements, not subscriptions).
  try {
    const { getAcademyEntitlementState } = await import("@/lib/academy-entitlements")
    const state = await getAcademyEntitlementState(userId)
    if (state.explicitProductIds.length > 0) {
      return {
        level: "limited",
        trialEndsAt: null,
        trialDaysLeft: null,
        calendarIncluded: false,
        fullAppIncluded: false,
        vaultIncludedBySuite: false,
        fullMembershipIncluded: false,
      }
    }
  } catch (e) {
    console.error("[suite-trial] entitlement fallback failed:", e)
  }

  return {
    level: "none",
    trialEndsAt: null,
    trialDaysLeft: null,
    calendarIncluded: false,
    fullAppIncluded: false,
    vaultIncludedBySuite: false,
    fullMembershipIncluded: false,
  }
}

/** True when this user may call the generation APIs (member or active trial). */
export async function canGenerate(userId: string): Promise<boolean> {
  const access = await getSuiteAccess(userId)
  return access.level === "member" || access.level === "trial" || access.level === "vault"
}
