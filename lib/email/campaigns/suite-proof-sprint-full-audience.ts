export type SuiteProofSprintFullAudienceCandidate = {
  email: string
  firstName?: string | null
  unsubscribed?: boolean
  hasProtectedAccess: boolean
  isMarketingTestOrInternal?: boolean
  latestDeliveryStatus?: string | null
  lastMarketingDeliveryAt?: string | null
}

export type SuiteProofSprintFullAudienceExclusionReason =
  | "invalid_email"
  | "protected_access"
  | "test_or_internal"
  | "unsubscribed"
  | "bounced_or_suppressed"
  | "marketing_cooldown"
  | "audience_cap"

export type SuiteProofSprintFullAudienceResult = {
  eligible: SuiteProofSprintFullAudienceCandidate[]
  excluded: Record<SuiteProofSprintFullAudienceExclusionReason, number>
}

function normalizedEmail(value: string): string {
  return value.trim().toLowerCase()
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export function classifySuiteProofSprintFullAudience(input: {
  candidates: SuiteProofSprintFullAudienceCandidate[]
  scheduledAt: Date
  cooldownHours: number
  maxAudience: number
}): SuiteProofSprintFullAudienceResult {
  const excluded: SuiteProofSprintFullAudienceResult["excluded"] = {
    invalid_email: 0,
    protected_access: 0,
    test_or_internal: 0,
    unsubscribed: 0,
    bounced_or_suppressed: 0,
    marketing_cooldown: 0,
    audience_cap: 0,
  }
  const seen = new Set<string>()
  const eligible: SuiteProofSprintFullAudienceCandidate[] = []
  const cooldownMs = Math.max(0, input.cooldownHours) * 60 * 60 * 1000

  for (const candidate of input.candidates) {
    const email = normalizedEmail(candidate.email)
    if (!isEmail(email) || seen.has(email)) {
      excluded.invalid_email += 1
      continue
    }
    seen.add(email)
    if (candidate.unsubscribed) {
      excluded.unsubscribed += 1
      continue
    }
    if (candidate.hasProtectedAccess) {
      excluded.protected_access += 1
      continue
    }
    if (candidate.isMarketingTestOrInternal) {
      excluded.test_or_internal += 1
      continue
    }
    if (/^(bounced|suppressed)$/i.test(String(candidate.latestDeliveryStatus || ""))) {
      excluded.bounced_or_suppressed += 1
      continue
    }

    const lastDelivery = candidate.lastMarketingDeliveryAt
      ? new Date(candidate.lastMarketingDeliveryAt).getTime()
      : Number.NaN
    if (Number.isFinite(lastDelivery) && input.scheduledAt.getTime() - lastDelivery < cooldownMs) {
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
