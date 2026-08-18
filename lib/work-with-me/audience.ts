export const WORK_WITH_ME_PRIVATE_AUDIENCE = {
  status: "preparation-only",
  maxCandidates: 10,
  minFitScore: 8,
  marketingCooldownHours: 72,
  firstPaidGate: 2,
  totalFoundingPlaces: 5,
  job: "Build a personal AI team around an established business so recurring work no longer depends on the founder for every first step.",
} as const

export type WorkWithMeAudienceCandidate = {
  userId: string
  email: string
  hasPaid: boolean
  repeatBuyerOrHighValue: boolean
  active90d: boolean
  activeMember: boolean
  existingBusinessSignal: boolean
  founderBottleneckSignal: boolean
  audienceDefined: boolean
  publicBusiness: boolean
  usedAiContent: boolean
  marketingPermissionKnown: boolean
  unsubscribed?: boolean
  latestDeliveryStatus?: string | null
  lastMarketingDeliveryAt?: string | null
  lastPurchaseAt?: string | null
  isMarketingTestOrInternal?: boolean
  hasOpenWorkWithMeApplication?: boolean
}

export type WorkWithMeAudienceExclusion =
  | "invalid_or_duplicate"
  | "not_existing_buyer"
  | "missing_problem_fit"
  | "below_fit_threshold"
  | "permission_unavailable"
  | "test_or_internal"
  | "unsubscribed"
  | "bounced_or_suppressed"
  | "marketing_cooldown"
  | "already_in_pipeline"
  | "audience_cap"

export function scoreWorkWithMeCandidate(candidate: WorkWithMeAudienceCandidate): number {
  return (
    (candidate.hasPaid ? 2 : 0) +
    (candidate.repeatBuyerOrHighValue ? 1 : 0) +
    (candidate.active90d ? 1 : 0) +
    (candidate.activeMember ? 1 : 0) +
    (candidate.existingBusinessSignal ? 2 : 0) +
    (candidate.founderBottleneckSignal ? 2 : 0) +
    (candidate.audienceDefined ? 1 : 0) +
    (candidate.publicBusiness ? 1 : 0) +
    (candidate.usedAiContent ? 1 : 0)
  )
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function timestamp(value?: string | null) {
  const parsed = value ? new Date(value).getTime() : 0
  return Number.isFinite(parsed) ? parsed : 0
}

function strongestFirst(a: WorkWithMeAudienceCandidate, b: WorkWithMeAudienceCandidate) {
  return (
    scoreWorkWithMeCandidate(b) - scoreWorkWithMeCandidate(a) ||
    timestamp(b.lastPurchaseAt) - timestamp(a.lastPurchaseAt) ||
    normalizeEmail(a.email).localeCompare(normalizeEmail(b.email))
  )
}

export function classifyWorkWithMeAudience(input: {
  candidates: WorkWithMeAudienceCandidate[]
  now: Date
}) {
  if (!Number.isFinite(input.now.getTime())) throw new Error("A valid audit time is required")

  const excluded: Record<WorkWithMeAudienceExclusion, number> = {
    invalid_or_duplicate: 0,
    not_existing_buyer: 0,
    missing_problem_fit: 0,
    below_fit_threshold: 0,
    permission_unavailable: 0,
    test_or_internal: 0,
    unsubscribed: 0,
    bounced_or_suppressed: 0,
    marketing_cooldown: 0,
    already_in_pipeline: 0,
    audience_cap: 0,
  }
  const seen = new Set<string>()
  const eligible: WorkWithMeAudienceCandidate[] = []
  const cooldownMs = WORK_WITH_ME_PRIVATE_AUDIENCE.marketingCooldownHours * 60 * 60 * 1000

  for (const candidate of [...input.candidates].sort(strongestFirst)) {
    const email = normalizeEmail(candidate.email)
    if (!isEmail(email) || seen.has(email)) {
      excluded.invalid_or_duplicate += 1
      continue
    }
    seen.add(email)
    if (!candidate.hasPaid) {
      excluded.not_existing_buyer += 1
      continue
    }
    if (!candidate.existingBusinessSignal || !candidate.founderBottleneckSignal) {
      excluded.missing_problem_fit += 1
      continue
    }
    if (scoreWorkWithMeCandidate(candidate) < WORK_WITH_ME_PRIVATE_AUDIENCE.minFitScore) {
      excluded.below_fit_threshold += 1
      continue
    }
    if (candidate.hasOpenWorkWithMeApplication) {
      excluded.already_in_pipeline += 1
      continue
    }
    if (candidate.isMarketingTestOrInternal) {
      excluded.test_or_internal += 1
      continue
    }
    if (!candidate.marketingPermissionKnown) {
      excluded.permission_unavailable += 1
      continue
    }
    if (candidate.unsubscribed) {
      excluded.unsubscribed += 1
      continue
    }
    if (
      /^(bounced|suppressed|complained|failed)$/i.test(String(candidate.latestDeliveryStatus || ""))
    ) {
      excluded.bounced_or_suppressed += 1
      continue
    }
    const lastDelivery = timestamp(candidate.lastMarketingDeliveryAt)
    if (lastDelivery && input.now.getTime() - lastDelivery < cooldownMs) {
      excluded.marketing_cooldown += 1
      continue
    }
    if (eligible.length >= WORK_WITH_ME_PRIVATE_AUDIENCE.maxCandidates) {
      excluded.audience_cap += 1
      continue
    }
    eligible.push({ ...candidate, email })
  }

  return { eligible, excluded }
}
