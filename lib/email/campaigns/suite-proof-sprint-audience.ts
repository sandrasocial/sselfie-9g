export type SuiteProofSprintCandidate = {
  email: string
  firstName?: string | null
  unsubscribed?: boolean
  isCommerceBuyer: boolean
  hasProtectedAccess: boolean
  lastPurchaseAt?: string | null
  lastMarketingDeliveryAt?: string | null
}

export type SuiteProofSprintExclusionReason =
  | "invalid_email"
  | "not_commerce_buyer"
  | "protected_access"
  | "unsubscribed"
  | "marketing_cooldown"
  | "audience_cap"

export type SuiteProofSprintAudienceResult = {
  eligible: SuiteProofSprintCandidate[]
  excluded: Record<SuiteProofSprintExclusionReason, number>
}

function normalizedEmail(value: string): string {
  return value.trim().toLowerCase()
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function newestFirst(a: SuiteProofSprintCandidate, b: SuiteProofSprintCandidate): number {
  const aTime = a.lastPurchaseAt ? new Date(a.lastPurchaseAt).getTime() : 0
  const bTime = b.lastPurchaseAt ? new Date(b.lastPurchaseAt).getTime() : 0
  return bTime - aTime || normalizedEmail(a.email).localeCompare(normalizedEmail(b.email))
}

export function classifySuiteProofSprintAudience(input: {
  candidates: SuiteProofSprintCandidate[]
  now: Date
  cooldownHours: number
  maxAudience: number
}): SuiteProofSprintAudienceResult {
  const excluded: SuiteProofSprintAudienceResult["excluded"] = {
    invalid_email: 0,
    not_commerce_buyer: 0,
    protected_access: 0,
    unsubscribed: 0,
    marketing_cooldown: 0,
    audience_cap: 0,
  }
  const seen = new Set<string>()
  const eligible: SuiteProofSprintCandidate[] = []
  const cooldownMs = Math.max(0, input.cooldownHours) * 60 * 60 * 1000

  for (const candidate of [...input.candidates].sort(newestFirst)) {
    const email = normalizedEmail(candidate.email)
    if (!isEmail(email) || seen.has(email)) {
      excluded.invalid_email += 1
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
    if (candidate.unsubscribed) {
      excluded.unsubscribed += 1
      continue
    }

    const lastDelivery = candidate.lastMarketingDeliveryAt
      ? new Date(candidate.lastMarketingDeliveryAt).getTime()
      : Number.NaN
    if (Number.isFinite(lastDelivery) && input.now.getTime() - lastDelivery < cooldownMs) {
      excluded.marketing_cooldown += 1
      continue
    }

    if (eligible.length >= Math.max(0, input.maxAudience)) {
      excluded.audience_cap += 1
      continue
    }
    eligible.push({ ...candidate, email })
  }

  return { eligible, excluded }
}
