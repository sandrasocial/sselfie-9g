import "server-only"

import { isAdminEmail } from "@/lib/admin-feature-flags"

/**
 * One gate for every route that spends money on a language model.
 *
 * Image generation has been entitlement-gated since BRIDGE-01 Phase D, but the
 * conversational routes never were: /api/app-v3/maya/chat, /api/maya/chat and
 * /api/app-v3/maya/recommendations each authenticated the caller and then called
 * an LLM, with no membership check, no credit cost and no ceiling. Account
 * creation is free, so that made the most expensive surface in the product the
 * one anybody could use without paying.
 *
 * This is deliberately ONE shared helper rather than a third copy of the check.
 * The bug existed because the rule was a convention re-implemented per route —
 * so forgetting it failed open. A single import fails closed instead.
 *
 * WHO IS ALLOWED — parity with app/api/app-v3/maya/generate:
 *   member  paid SUITE membership, Stripe or Skool          → yes
 *   trial   active 7-day trial (a trial that cannot use      → yes
 *           Maya is not a trial)
 *   vault   paying Vault Maya subscriber                     → yes
 *   limited expired trial, one-time product owner            → NO
 *   none    free signup, no paid relationship                → NO
 *
 * Reading past conversations is unaffected: history is served by
 * /api/app-v3/maya/chats, a different route. This gate governs new inference only.
 */

export const MAYA_INFERENCE_LEVELS = ["member", "trial", "vault"] as const

export type MayaInferenceDenial = {
  allowed: false
  status: 403
  body: { error: string; code: "maya_membership_required"; action: "open_membership_checkout" }
}

export type MayaInferenceGrant = {
  allowed: true
  level: "admin" | "member" | "trial" | "vault"
}

export type MayaInferenceAccess = MayaInferenceGrant | MayaInferenceDenial

const DENIAL: MayaInferenceDenial = {
  allowed: false,
  status: 403,
  body: {
    error: "Maya is part of the SSELFIE membership. Join to keep creating with her.",
    code: "maya_membership_required",
    action: "open_membership_checkout",
  },
}

/**
 * Resolve whether this user may trigger new Maya inference.
 *
 * Fails CLOSED. If the entitlement lookup throws, access is denied rather than
 * granted — the opposite of the /app gate's old behaviour, and the right default
 * when the cost of being wrong is an unbounded provider bill.
 */
export async function requireMayaInferenceAccess(input: {
  neonUserId: string | number | null | undefined
  email?: string | null
}): Promise<MayaInferenceAccess> {
  if (input.email && isAdminEmail(input.email)) {
    return { allowed: true, level: "admin" }
  }

  if (!input.neonUserId) return DENIAL

  try {
    const { getSuiteAccess } = await import("@/lib/trial/suite-trial")
    const access = await getSuiteAccess(String(input.neonUserId))

    if ((MAYA_INFERENCE_LEVELS as readonly string[]).includes(access.level)) {
      return { allowed: true, level: access.level as MayaInferenceGrant["level"] }
    }
    return DENIAL
  } catch (error) {
    console.error("[maya] inference access check failed; denying:", error)
    return DENIAL
  }
}
