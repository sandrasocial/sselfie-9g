export const MAYA_ESSENTIAL_PILOT_PLAN = "maya_essential_pilot" as const
export const MAYA_PRO_PILOT_PLAN = "maya_pro_pilot" as const
export type MayaTierPilotPlan =
  | typeof MAYA_ESSENTIAL_PILOT_PLAN
  | typeof MAYA_PRO_PILOT_PLAN

type EnvLike = Record<string, string | undefined>

export const MAYA_TIER_PILOT = {
  campaignKey: "maya_tier_choice_pilot_2026_08",
  status: "preparation-only",
  maxCohort: 20,
  marketingCooldownHours: 72,
  job: "Bring Maya one selfie and one rough idea. Leave with one beautiful, personal post, the words, and the next step ready to use.",
  tiers: [
    {
      id: "essential",
      name: "Maya Essential",
      priceEurMonthly: 29,
      includedCredits: 30,
      promise: "The focused Maya job with controlled monthly usage.",
    },
    {
      id: "pro",
      name: "Maya Pro",
      priceEurMonthly: 97,
      includedCredits: 100,
      promise: "The focused Maya job with higher usage, Calendar, Gallery, and the member library.",
    },
  ],
  annual: {
    name: "Maya Pro Annual",
    priceEur: 970,
    status: "held",
    releaseGate: "Repeat weekly value and renewal intent must be demonstrated before it is offered.",
  },
  evidenceGates: {
    netMonthlyPurchases: 3,
    firstOutcomesWithin48h: 2,
    secondOutcomesWithin10d: 2,
  },
} as const

export function isMayaEssentialPlan(value: unknown): value is typeof MAYA_ESSENTIAL_PILOT_PLAN {
  return value === MAYA_ESSENTIAL_PILOT_PLAN
}

export function isMayaTierPilotPlan(value: unknown): value is MayaTierPilotPlan {
  return value === MAYA_ESSENTIAL_PILOT_PLAN || value === MAYA_PRO_PILOT_PLAN
}

function getPilotAllowlist(env: EnvLike): string[] {
  return Array.from(
    new Set(
      String(env.MAYA_TIER_PILOT_ALLOWLIST || "")
        .split(/[\n,]/)
        .map(normalizeEmail)
        .filter(isEmail),
    ),
  )
}

export function isMayaTierPilotCheckoutPrepared(env: EnvLike = process.env): boolean {
  const allowlist = getPilotAllowlist(env)
  return (
    env.MAYA_TIER_PILOT_CHECKOUT_ENABLED === "true" &&
    allowlist.length > 0 &&
    allowlist.length <= MAYA_TIER_PILOT.maxCohort
  )
}

export function creditGrantProductForMayaPlan(
  plan: unknown,
  productType: unknown,
): "sselfie_studio_membership" | "vault_maya" | "maya_essential" {
  if (isMayaEssentialPlan(plan)) return "maya_essential"
  return productType === "vault_maya" ? "vault_maya" : "sselfie_studio_membership"
}

export function assertMayaTierPilotCheckoutAllowed(input: {
  email?: string | null
  plan: MayaTierPilotPlan
  env?: EnvLike
}): { email: string; allowlistSize: number } {
  const env = input.env || process.env
  if (env.MAYA_TIER_PILOT_CHECKOUT_ENABLED !== "true") {
    throw new Error("The private Maya tier pilot is not open.")
  }

  const allowlist = getPilotAllowlist(env)
  if (allowlist.length === 0) {
    throw new Error("The private Maya tier pilot has no approved buyers.")
  }
  if (allowlist.length > MAYA_TIER_PILOT.maxCohort) {
    throw new Error(`The private Maya tier pilot allowlist contains more than ${MAYA_TIER_PILOT.maxCohort} buyers.`)
  }

  const email = normalizeEmail(input.email || "")
  if (!isEmail(email) || !allowlist.includes(email)) {
    throw new Error("This email is not approved for the private Maya tier pilot.")
  }

  return { email, allowlistSize: allowlist.length }
}

export type MayaTierPilotCandidate = {
  email: string
  isCommerceBuyer: boolean
  hasProtectedAccess: boolean
  marketingPermissionKnown: boolean
  unsubscribed?: boolean
  isMarketingTestOrInternal?: boolean
  latestDeliveryStatus?: string | null
  lastPurchaseAt?: string | null
  lastMarketingDeliveryAt?: string | null
}

export type MayaTierPilotExclusionReason =
  | "invalid_or_duplicate"
  | "not_commerce_buyer"
  | "protected_access"
  | "permission_unavailable"
  | "test_or_internal"
  | "unsubscribed"
  | "bounced_or_suppressed"
  | "marketing_cooldown"
  | "audience_cap"

export type MayaTierPilotAudienceResult = {
  eligible: MayaTierPilotCandidate[]
  excluded: Record<MayaTierPilotExclusionReason, number>
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function newestBuyerFirst(a: MayaTierPilotCandidate, b: MayaTierPilotCandidate): number {
  const aTime = a.lastPurchaseAt ? new Date(a.lastPurchaseAt).getTime() : 0
  const bTime = b.lastPurchaseAt ? new Date(b.lastPurchaseAt).getTime() : 0
  return bTime - aTime || normalizeEmail(a.email).localeCompare(normalizeEmail(b.email))
}

export function classifyMayaTierPilotAudience(input: {
  candidates: MayaTierPilotCandidate[]
  now: Date
}): MayaTierPilotAudienceResult {
  if (!Number.isFinite(input.now.getTime())) throw new Error("A valid audit time is required")

  const excluded: MayaTierPilotAudienceResult["excluded"] = {
    invalid_or_duplicate: 0,
    not_commerce_buyer: 0,
    protected_access: 0,
    permission_unavailable: 0,
    test_or_internal: 0,
    unsubscribed: 0,
    bounced_or_suppressed: 0,
    marketing_cooldown: 0,
    audience_cap: 0,
  }
  const seen = new Set<string>()
  const eligible: MayaTierPilotCandidate[] = []
  const cooldownMs = MAYA_TIER_PILOT.marketingCooldownHours * 60 * 60 * 1000

  for (const candidate of [...input.candidates].sort(newestBuyerFirst)) {
    const email = normalizeEmail(candidate.email)
    if (!isEmail(email) || seen.has(email)) {
      excluded.invalid_or_duplicate += 1
      continue
    }
    seen.add(email)
    if (!candidate.isCommerceBuyer) {
      excluded.not_commerce_buyer += 1
      continue
    }
    if (candidate.hasProtectedAccess) {
      excluded.protected_access += 1
      continue
    }
    if (!candidate.marketingPermissionKnown) {
      excluded.permission_unavailable += 1
      continue
    }
    if (candidate.isMarketingTestOrInternal) {
      excluded.test_or_internal += 1
      continue
    }
    if (candidate.unsubscribed) {
      excluded.unsubscribed += 1
      continue
    }
    if (/^(bounced|suppressed|complained)$/i.test(String(candidate.latestDeliveryStatus || ""))) {
      excluded.bounced_or_suppressed += 1
      continue
    }

    const lastDeliveryAt = candidate.lastMarketingDeliveryAt
      ? new Date(candidate.lastMarketingDeliveryAt).getTime()
      : Number.NaN
    if (Number.isFinite(lastDeliveryAt) && input.now.getTime() - lastDeliveryAt < cooldownMs) {
      excluded.marketing_cooldown += 1
      continue
    }
    if (eligible.length >= MAYA_TIER_PILOT.maxCohort) {
      excluded.audience_cap += 1
      continue
    }
    eligible.push({ ...candidate, email })
  }

  return { eligible, excluded }
}

export type MayaTierPilotEvidence = {
  essentialPurchases: number
  proPurchases: number
  firstOutcomeMaturePurchases: number
  firstOutcomesWithin48h: number
  secondOutcomeMaturePurchases: number
  secondOutcomesWithin10d: number
}

type GateResult = "pass" | "fail" | "immature"

export function evaluateMayaTierPilot(input: MayaTierPilotEvidence): {
  paidGate: GateResult
  firstOutcomeGate: GateResult
  repeatGate: GateResult
  recommendation:
    | "keep-pro"
    | "validate-essential-candidate"
    | "fix-recurring-job"
    | "fix-proof-or-offer"
    | "wait-for-mature-evidence"
} {
  const totalPurchases = Math.max(0, input.essentialPurchases) + Math.max(0, input.proPurchases)
  const paidGate: GateResult =
    totalPurchases >= MAYA_TIER_PILOT.evidenceGates.netMonthlyPurchases ? "pass" : "fail"
  const firstOutcomeGate: GateResult =
    input.firstOutcomeMaturePurchases < MAYA_TIER_PILOT.evidenceGates.firstOutcomesWithin48h
      ? "immature"
      : input.firstOutcomesWithin48h >= MAYA_TIER_PILOT.evidenceGates.firstOutcomesWithin48h
        ? "pass"
        : "fail"
  const repeatGate: GateResult =
    input.secondOutcomeMaturePurchases < MAYA_TIER_PILOT.evidenceGates.secondOutcomesWithin10d
      ? "immature"
      : input.secondOutcomesWithin10d >= MAYA_TIER_PILOT.evidenceGates.secondOutcomesWithin10d
        ? "pass"
        : "fail"

  if (firstOutcomeGate === "immature" || repeatGate === "immature") {
    return { paidGate, firstOutcomeGate, repeatGate, recommendation: "wait-for-mature-evidence" }
  }
  if (paidGate === "fail") {
    return { paidGate, firstOutcomeGate, repeatGate, recommendation: "fix-proof-or-offer" }
  }
  if (firstOutcomeGate === "fail" || repeatGate === "fail") {
    return { paidGate, firstOutcomeGate, repeatGate, recommendation: "fix-recurring-job" }
  }
  return {
    paidGate,
    firstOutcomeGate,
    repeatGate,
    recommendation:
      input.essentialPurchases > input.proPurchases ? "validate-essential-candidate" : "keep-pro",
  }
}
