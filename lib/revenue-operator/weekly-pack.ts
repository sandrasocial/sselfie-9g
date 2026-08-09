export type SourceState = "ok" | "unavailable" | "stale"

export type SourceName =
  | "stripe_payments"
  | "stripe_subscriptions"
  | "resend_broadcasts"
  | "analytics_events"
  | "checkout_attribution"
  | "maya_events"
  | "protected_operations"

export type SourceHealth = {
  source: SourceName
  status: SourceState
  checkedAt: string
  freshestRecordAt?: string | null
  affects?: string
}

export type CashComparison = {
  product: string
  currency: string
  currentPayments: number
  currentGrossMinor: number
  currentRefundedMinor: number
  currentNetMinor: number
  previousPayments: number
  previousGrossMinor: number
  previousRefundedMinor: number
  previousNetMinor: number
}

export type FunnelWindow = {
  leads: number
  promptCopies: number
  paidHandoffClicks: number
  vaultViews: number
  checkoutStarts: number
  qualifyingPayments: number
  campaignAttributedPayments: number
}

export type RevenueOperatorDecisionId =
  | "restore-money-truth"
  | "restore-customer-guard"
  | "activate-owned-commerce"
  | "repair-owned-commerce"
  | "restore-recurring-value-evidence"
  | "prove-maya-repeat-value"
  | "prepare-leveraged-pilot"

export type DecisionStatus = "in_progress" | "succeeded" | "failed" | "blocked"

export type RevenueOperatorDecision = {
  id: RevenueOperatorDecisionId
  priority: string
  evidence: string
  owner: "AI team"
  action: string
  successSignal: string
  failureSignal: string
  startedAt: string
  reviewAt: string
  status: DecisionStatus
  result: string | null
  terminalReason: string | null
}

export type PreviousDecision = Pick<
  RevenueOperatorDecision,
  "id" | "startedAt" | "reviewAt" | "status" | "result" | "terminalReason"
>

export type CompletedGate = {
  id: "owned-commerce-scored" | "owned-commerce" | "maya-paid-value"
  campaignKey: string
  completedAt: string
  evidence: string
}

export type MayaTestReadiness = {
  cohortSelected: boolean
  mayaHomeAccessVerified: boolean
  checkoutVerified: boolean
  defectGateClear: boolean
  invitationPrepared: boolean
}

export type RevenueOperatorInput = {
  asOf: string
  generatedAt: string
  windowDays: number
  sourceHealth: SourceHealth[]
  cash: CashComparison[]
  membership: {
    active: number
    discounted: number
    netMrrByCurrency: Record<string, number>
  } | null
  promptVault: {
    campaignKey: string
    exposureComplete: boolean
    measurementMaturesAt: string
    current: FunnelWindow
    previous: FunnelWindow
  } | null
  maya: {
    campaignKey: string
    activeAccessRows: number
    activeMembers: number
    jobsStarted: number
    jobsCompleted: number
    finishedPostJobs: number
    calendarPostsReady: number
    qualifyingMonthlyPurchases: number
    firstOutcomeMaturePurchases: number
    firstOutcomesWithin48h: number
    secondOutcomeMaturePurchases: number
    secondOutcomesWithin10d: number
  } | null
  operations: {
    openPaymentReviews: number
    failedProtectedJobs: number
    openBugs: number
    openMayaReleaseBlockers: number
    staleProtectedJobs: string[]
  } | null
  previousDecision: PreviousDecision | null
  completedGates: CompletedGate[]
  mayaTestReadiness: MayaTestReadiness
}

export type ComparisonWindows = {
  current: { start: string; end: string }
  previous: { start: string; end: string }
}

export type LargestLeak = {
  status: "available" | "unavailable"
  label: string
  evidence: string
}

export type RevenueOperatorPack = RevenueOperatorInput & {
  windows: ComparisonWindows
  decision: RevenueOperatorDecision
  largestLeak: LargestLeak
  completedWork: string
  outwardApprovalReady: boolean
  sandraActions: Array<{ title: string; reason: string }>
  terminalStatus: "Ready" | "Needs Sandra" | "Blocked"
}

const DAY_MS = 24 * 60 * 60 * 1000
const DECISION_IDS: ReadonlySet<string> = new Set<RevenueOperatorDecisionId>([
  "restore-money-truth",
  "restore-customer-guard",
  "activate-owned-commerce",
  "repair-owned-commerce",
  "restore-recurring-value-evidence",
  "prove-maya-repeat-value",
  "prepare-leveraged-pilot",
])
const DECISION_STATUSES: ReadonlySet<string> = new Set<DecisionStatus>([
  "in_progress",
  "succeeded",
  "failed",
  "blocked",
])
const COMPLETED_GATE_IDS: ReadonlySet<string> = new Set<CompletedGate["id"]>([
  "owned-commerce",
  "owned-commerce-scored",
  "maya-paid-value",
])

export function createComparisonWindows(asOf: Date, windowDays: number): ComparisonWindows {
  if (!Number.isFinite(asOf.getTime())) throw new Error("A valid as-of date is required")
  if (!Number.isInteger(windowDays) || windowDays < 1 || windowDays > 90) {
    throw new Error("windowDays must be an integer from 1 to 90")
  }
  const end = asOf.getTime()
  const currentStart = end - windowDays * DAY_MS
  const previousStart = currentStart - windowDays * DAY_MS
  return {
    current: { start: new Date(currentStart).toISOString(), end: asOf.toISOString() },
    previous: { start: new Date(previousStart).toISOString(), end: new Date(currentStart).toISOString() },
  }
}

function addDays(iso: string, days: number): string {
  return new Date(new Date(iso).getTime() + days * DAY_MS).toISOString()
}

function sourceIsHealthy(input: RevenueOperatorInput, source: SourceName): boolean {
  return input.sourceHealth.some(item => item.source === source && item.status === "ok")
}

function sourceProblem(input: RevenueOperatorInput, source: SourceName): SourceHealth | null {
  return input.sourceHealth.find(item => item.source === source && item.status !== "ok") || null
}

function hasCompletedGate(input: RevenueOperatorInput, id: CompletedGate["id"]): boolean {
  return input.completedGates.some(gate => gate.id === id)
}

function decision(input: RevenueOperatorInput, fields: Omit<RevenueOperatorDecision, "startedAt" | "reviewAt" | "status" | "result" | "terminalReason"> & {
  reviewAt?: string
  status?: DecisionStatus
  result?: string | null
  terminalReason?: string | null
}): RevenueOperatorDecision {
  return {
    ...fields,
    startedAt: input.asOf,
    reviewAt: fields.reviewAt || addDays(input.asOf, 7),
    status: fields.status || "in_progress",
    result: fields.result || null,
    terminalReason: fields.terminalReason || null,
  }
}

function restoreMoneyTruth(input: RevenueOperatorInput, problem: SourceHealth): RevenueOperatorDecision {
  return decision(input, {
    id: "restore-money-truth",
    priority: "Restore money truth before changing the commercial plan",
    evidence: `${problem.source} is ${problem.status}; cash and purchase gates are unavailable, not zero.`,
    owner: "AI team",
    action: "Repair or refresh the read-only Stripe reconciliation and rerun this same pack. Preserve the approved comeback priority meanwhile.",
    successSignal: "Live net payments reconcile to product and currency for both comparison windows.",
    failureSignal: "The source remains unavailable or stale and dependent conclusions stay suppressed.",
    status: "blocked",
    terminalReason: "The operator cannot make a money decision without reconciled live payment truth.",
  })
}

function restoreCustomerGuard(input: RevenueOperatorInput, problem: SourceHealth): RevenueOperatorDecision {
  return decision(input, {
    id: "restore-customer-guard",
    priority: "Restore the customer-money and fulfillment guard",
    evidence: `${problem.source} is ${problem.status}; no-incident cannot be inferred from a missing or late run.`,
    owner: "AI team",
    action: "Verify the protected payment and fulfillment jobs, resolve any failures, then rerun this pack without changing the commercial priority.",
    successSignal: "Every protected job is fresh and no unresolved payment or fulfillment incident remains.",
    failureSignal: "Any protected job remains missing, late, or failed at review time.",
    status: "blocked",
    terminalReason: "Commercial execution pauses when the customer-protection evidence is incomplete.",
  })
}

function canonicalPriorDecision(input: RevenueOperatorInput, previous: PreviousDecision): RevenueOperatorDecision | null {
  if (previous.status !== "in_progress") return null
  if (new Date(previous.reviewAt).getTime() <= new Date(input.asOf).getTime()) return null

  const definitions: Partial<Record<RevenueOperatorDecisionId, Omit<RevenueOperatorDecision, "id" | "startedAt" | "reviewAt" | "status" | "result" | "terminalReason">>> = {
    "activate-owned-commerce": {
      priority: "Finish the Prompt Vault comeback campaign",
      evidence: `The approved priority is still inside its decision window through ${previous.reviewAt}.`,
      owner: "AI team",
      action: "Continue and finish the existing campaign and measurement loop. Do not reset strategy mid-test.",
      successSignal: "At least 15 campaign-attributed, net qualifying Prompt Vault payments after the approved exposure.",
      failureSignal: "Fewer than 5 attributed payments after the full approved exposure, or a customer-access defect appears.",
    },
    "repair-owned-commerce": {
      priority: "Repair the measured Prompt Vault handoff before another exposure",
      evidence: `The measured event is complete and the repair window remains active through ${previous.reviewAt}.`,
      owner: "AI team",
      action: "Use the measured funnel to repair one specific stage. Do not schedule another exposure until the repaired path and its new campaign key are ready.",
      successSignal: "One measured stage repair is implemented, verified, and attached to a new bounded campaign key.",
      failureSignal: "The repair remains undefined, unverified, or expands into another product build.",
    },
    "prove-maya-repeat-value": {
      priority: "Prove Maya's finished-post job with the bounded buyer cohort",
      evidence: `The approved priority is still inside its decision window through ${previous.reviewAt}.`,
      owner: "AI team",
      action: "Continue the bounded value test; do not broaden Maya or change tiers mid-test.",
      successSignal: "Three qualifying monthly purchases, two first outcomes within 48 hours, and two second outcomes within ten days.",
      failureSignal: "The mature cohort does not finish and repeat the named job.",
    },
    "prepare-leveraged-pilot": {
      priority: "Prepare one bounded media or licensing pilot",
      evidence: `The approved priority is still inside its decision window through ${previous.reviewAt}.`,
      owner: "AI team",
      action: "Finish one buyer-specific opportunity pack without sending it before approval.",
      successSignal: "One cleared paid pilot with bounded scope, rights, delivery, and a reusable result.",
      failureSignal: "The pilot requires open-ended founder delivery or cannot support a truthful price.",
    },
  }
  const definition = definitions[previous.id]
  if (!definition) return null
  return {
    id: previous.id,
    ...definition,
    startedAt: previous.startedAt,
    reviewAt: previous.reviewAt,
    status: "in_progress",
    result: previous.result,
    terminalReason: previous.terminalReason,
  }
}

function currentVaultPayments(input: RevenueOperatorInput): number {
  return input.cash
    .filter(row => row.product === "Prompt Vault")
    .reduce((sum, row) => sum + row.currentPayments, 0)
}

function mayaGatePassed(input: RevenueOperatorInput): boolean {
  return Boolean(
    input.maya &&
    input.maya.qualifyingMonthlyPurchases >= 3 &&
    input.maya.firstOutcomeMaturePurchases >= 2 &&
    input.maya.firstOutcomesWithin48h >= 2 &&
    input.maya.secondOutcomeMaturePurchases >= 2 &&
    input.maya.secondOutcomesWithin10d >= 2
  )
}

function resolvePreviousDecision(input: RevenueOperatorInput): PreviousDecision | null {
  const previous = input.previousDecision
  if (!previous || previous.status !== "in_progress") return previous
  if (new Date(previous.reviewAt).getTime() > new Date(input.asOf).getTime()) return previous

  if (previous.id === "activate-owned-commerce") {
    const evidenceHealthy =
      sourceIsHealthy(input, "stripe_payments") &&
      sourceIsHealthy(input, "resend_broadcasts") &&
      sourceIsHealthy(input, "analytics_events") &&
      sourceIsHealthy(input, "checkout_attribution") &&
      Boolean(input.promptVault?.exposureComplete)
    if (!evidenceHealthy) {
      return {
        ...previous,
        status: "blocked",
        result: "The review window ended before complete attributed evidence was available.",
        terminalReason: "Missing or immature campaign evidence cannot be scored as failure or success.",
      }
    }
    const attributed = input.promptVault?.current.campaignAttributedPayments || 0
    const succeeded = attributed >= 15
    return {
      ...previous,
      status: succeeded ? "succeeded" : "failed",
      result: `${attributed} campaign-attributed net payment(s) were recorded at the decision gate.`,
      terminalReason: succeeded
        ? "The 15-payment attributed commerce gate passed."
        : "The full exposure completed below the 15-payment success gate.",
    }
  }

  if (previous.id === "prove-maya-repeat-value") {
    if (!sourceIsHealthy(input, "stripe_payments") || !sourceIsHealthy(input, "maya_events") || !input.maya) {
      return {
        ...previous,
        status: "blocked",
        result: "The review window ended without complete paid-value evidence.",
        terminalReason: "Missing evidence cannot be scored as a real zero.",
      }
    }
    const mature = input.maya.firstOutcomeMaturePurchases >= 2 && input.maya.secondOutcomeMaturePurchases >= 2
    if (!mature) {
      return {
        ...previous,
        status: "blocked",
        result: "The cohort had not matured through both outcome windows at review time.",
        terminalReason: "The Maya gate needs two mature 48-hour and ten-day purchase cohorts.",
      }
    }
    const succeeded = mayaGatePassed(input)
    return {
      ...previous,
      status: succeeded ? "succeeded" : "failed",
      result: `${input.maya.qualifyingMonthlyPurchases} purchase(s), ${input.maya.firstOutcomesWithin48h} first outcome(s), and ${input.maya.secondOutcomesWithin10d} second outcome(s).`,
      terminalReason: succeeded
        ? "All three mature paid-value gates passed."
        : "At least one mature Maya paid-value gate failed.",
    }
  }

  return previous
}

function decisionFrom(input: RevenueOperatorInput): RevenueOperatorDecision {
  const moneyProblem = sourceProblem(input, "stripe_payments")
  if (moneyProblem) return restoreMoneyTruth(input, moneyProblem)

  const guardProblem = sourceProblem(input, "protected_operations")
  if (guardProblem || !input.operations) {
    return restoreCustomerGuard(
      input,
      guardProblem || {
        source: "protected_operations",
        status: "unavailable",
        checkedAt: input.generatedAt,
      }
    )
  }

  if (input.operations.openPaymentReviews > 0 || input.operations.failedProtectedJobs > 0) {
    return decision(input, {
      id: "restore-customer-guard",
      priority: "Protect customer money and fulfillment",
      evidence: `${input.operations.openPaymentReviews} payment review(s) and ${input.operations.failedProtectedJobs} failed protected job(s) are open.`,
      owner: "AI team",
      action: "Resolve the payment or fulfillment boundary, verify affected access, and then resume the same commercial priority.",
      successSignal: "No unresolved payment reviews or failed protected jobs remain.",
      failureSignal: "Any customer still lacks paid access or a protected job remains failed at review time.",
      status: "blocked",
      terminalReason: "A customer-money or fulfillment incident overrides growth work.",
    })
  }

  const prior = input.previousDecision && canonicalPriorDecision(input, input.previousDecision)
  if (prior) return prior

  if (input.previousDecision?.status === "blocked") {
    const previous = input.previousDecision
    if (previous.id === "activate-owned-commerce") {
      return {
        ...decision(input, {
          id: "activate-owned-commerce",
          priority: "Restore complete Prompt Vault exposure evidence",
          evidence: previous.result || "The campaign review date passed without complete provider-verified exposure evidence.",
          owner: "AI team",
          action: "Verify the exact Resend broadcast states and mature response window. If delivery was cancelled or failed, define a new bounded exposure before scoring the campaign.",
          successSignal: "Every approved broadcast has a verified terminal provider state and the 72-hour response window is mature.",
          failureSignal: "Provider exposure remains missing, cancelled, failed, or immature.",
          status: "blocked",
          terminalReason: previous.terminalReason,
        }),
        startedAt: previous.startedAt,
        reviewAt: previous.reviewAt,
      }
    }
    if (previous.id === "prove-maya-repeat-value") {
      return {
        ...decision(input, {
          id: "prove-maya-repeat-value",
          priority: "Restore the mature Maya paid-value evidence",
          evidence: previous.result || "The Maya review date passed without a mature measurable cohort.",
          owner: "AI team",
          action: "Restore the cohort and mature outcome evidence without changing price or widening the product.",
          successSignal: "The paid cohort and both outcome windows are measurable and Stripe-reconciled.",
          failureSignal: "The cohort remains immature or unavailable.",
          status: "blocked",
          terminalReason: previous.terminalReason,
        }),
        startedAt: previous.startedAt,
        reviewAt: previous.reviewAt,
      }
    }
  }

  const vaultPayments = currentVaultPayments(input)
  const promptBehaviorHealthy = sourceIsHealthy(input, "analytics_events")
  const checkoutHealthy = sourceIsHealthy(input, "checkout_attribution")
  const exposureComplete = Boolean(input.promptVault?.exposureComplete)
  const attributedPayments = input.promptVault?.current.campaignAttributedPayments || 0
  const scoredCurrentVaultCampaign = input.completedGates.find(gate =>
    gate.id === "owned-commerce-scored" && gate.campaignKey === input.promptVault?.campaignKey
  )

  if (scoredCurrentVaultCampaign && !hasCompletedGate(input, "owned-commerce")) {
    return decision(input, {
      id: "repair-owned-commerce",
      priority: "Repair the measured Prompt Vault handoff before another exposure",
      evidence: `${scoredCurrentVaultCampaign.evidence} The success gate was 15. The result is persisted and will not be rescored from a rolling window.`,
      owner: "AI team",
      action: "Use the measured funnel to repair one specific stage. Do not schedule another exposure until the repaired path and its new campaign key are ready.",
      successSignal: "One measured stage repair is implemented, verified, and attached to a new bounded campaign key.",
      failureSignal: "The repair remains undefined, unverified, or expands into another product build.",
    })
  }

  if (!hasCompletedGate(input, "owned-commerce") && (!exposureComplete || vaultPayments < 15 || attributedPayments < 15)) {
    const dependentUnavailable = !promptBehaviorHealthy || !checkoutHealthy || !input.promptVault
    return decision(input, {
      id: "activate-owned-commerce",
      priority: "Finish the Prompt Vault comeback campaign",
      evidence: dependentUnavailable
        ? `${vaultPayments} net qualifying Prompt Vault payment(s) are known, while behavior or checkout evidence is unavailable or stale. The existing priority is preserved; missing evidence is not treated as zero.`
        : `${attributedPayments} campaign-attributed net payment(s) and ${vaultPayments} total net payment(s) were recorded in the current ${input.windowDays}-day window; the exposure is ${exposureComplete ? "complete" : "still running"}.`,
      owner: "AI team",
      action: dependentUnavailable
        ? "Restore the missing funnel evidence while preserving the current approved Prompt Vault work."
        : "Finish the approved tutorial, proof, email, attribution, checkout, and fulfillment loop around the existing $37 Prompt Vault.",
      successSignal: "At least 15 campaign-attributed, net qualifying Prompt Vault payments after the approved exposure.",
      failureSignal: "Fewer than 5 campaign-attributed payments after the full approved exposure, or a customer-access defect appears.",
      reviewAt: input.promptVault?.measurementMaturesAt,
    })
  }

  const recurringProblems = ["stripe_subscriptions", "maya_events"]
    .map(name => sourceProblem(input, name as SourceName))
    .filter((item): item is SourceHealth => Boolean(item))
  if (recurringProblems.length || !input.membership || !input.maya) {
    const problem = recurringProblems[0]
    return decision(input, {
      id: "restore-recurring-value-evidence",
      priority: "Restore Maya's paid-value evidence before changing tiers",
      evidence: problem
        ? `${problem.source} is ${problem.status}; paid value and repeat behavior are unavailable, not zero.`
        : "Maya's paid-value cohort is incomplete.",
      owner: "AI team",
      action: "Reconcile the bounded cohort to live Stripe and restore mature first- and second-outcome measurement.",
      successSignal: "Monthly purchases and mature 48-hour and ten-day outcome cohorts are available and Stripe-reconciled.",
      failureSignal: "The recurring-value gate remains unmeasurable at review time.",
      status: "blocked",
      terminalReason: "The operator cannot change membership direction without paid-value evidence.",
    })
  }

  if (!hasCompletedGate(input, "maya-paid-value") && !mayaGatePassed(input)) {
    return decision(input, {
      id: "prove-maya-repeat-value",
      priority: "Prove Maya's finished-post job with the bounded buyer cohort",
      evidence: `${input.maya.qualifyingMonthlyPurchases}/3 qualifying monthly purchase(s), ${input.maya.firstOutcomesWithin48h}/2 first outcome(s) within 48 hours across ${input.maya.firstOutcomeMaturePurchases} mature purchase(s), and ${input.maya.secondOutcomesWithin10d}/2 second outcome(s) within ten days across ${input.maya.secondOutcomeMaturePurchases} mature purchase(s).`,
      owner: "AI team",
      action: "Run the protected value test and improve the named job without broad tier expansion.",
      successSignal: "Three qualifying monthly purchases, two first outcomes within 48 hours, and two second outcomes within ten days.",
      failureSignal: "The mature cohort buys but does not finish and repeat the named job.",
    })
  }

  return decision(input, {
    id: "prepare-leveraged-pilot",
    priority: "Prepare one bounded media or licensing pilot",
    evidence: "The attributed commerce gate and all three mature Maya paid-value gates are supported.",
    owner: "AI team",
    action: "Prepare one buyer-specific opportunity, proof page, rate, and rights recommendation for Sandra's approval.",
    successSignal: "One cleared paid pilot with bounded scope, rights, delivery, and a reusable result.",
    failureSignal: "The pilot requires open-ended founder delivery or cannot support a truthful price.",
  })
}

function deriveLargestLeak(input: RevenueOperatorInput): LargestLeak {
  if (
    !input.promptVault ||
    !sourceIsHealthy(input, "analytics_events") ||
    !sourceIsHealthy(input, "checkout_attribution") ||
    !sourceIsHealthy(input, "stripe_payments")
  ) {
    return {
      status: "unavailable",
      label: "Funnel leak unavailable",
      evidence: "At least one behavior, checkout, or live payment source is unavailable or stale. No zero or conversion claim is inferred.",
    }
  }

  const stages = [
    ["paid handoff -> Vault", input.promptVault.current.paidHandoffClicks, input.promptVault.current.vaultViews],
    ["Vault -> checkout", input.promptVault.current.vaultViews, input.promptVault.current.checkoutStarts],
    ["checkout -> payment", input.promptVault.current.checkoutStarts, currentVaultPayments(input)],
  ] as const
  const ranked = stages
    .map(([label, from, to]) => ({ label, from, to, gap: Math.max(from - to, 0) }))
    .sort((a, b) => b.gap - a.gap)
  const largest = ranked[0]
  return {
    status: "available",
    label: largest.label,
    evidence: `${largest.from} distinct upstream actor/session(s) and ${largest.to} downstream outcome(s), a measurable stage gap of ${largest.gap}. Stage identities are deduplicated within each source, not claimed as a cross-device cohort.`,
  }
}

export function parsePreviousDecisionPack(value: unknown): PreviousDecision | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const root = value as Record<string, unknown>
  const candidate = root.decision
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return null
  const item = candidate as Record<string, unknown>
  const allowedKeys = new Set([
    "id", "priority", "evidence", "owner", "action", "successSignal", "failureSignal",
    "startedAt", "reviewAt", "status", "result", "terminalReason",
  ])
  if (Object.keys(item).some(key => !allowedKeys.has(key))) return null
  if (
    typeof item.id !== "string" ||
    !DECISION_IDS.has(item.id) ||
    typeof item.startedAt !== "string" ||
    !Number.isFinite(new Date(item.startedAt).getTime()) ||
    typeof item.reviewAt !== "string" ||
    !Number.isFinite(new Date(item.reviewAt).getTime()) ||
    typeof item.status !== "string" ||
    !DECISION_STATUSES.has(item.status)
  ) return null
  const result = item.result == null ? null : String(item.result).slice(0, 240)
  const terminalReason = item.terminalReason == null ? null : String(item.terminalReason).slice(0, 240)
  return {
    id: item.id as RevenueOperatorDecisionId,
    startedAt: item.startedAt,
    reviewAt: item.reviewAt,
    status: item.status as DecisionStatus,
    result,
    terminalReason,
  }
}

export function parseCompletedGatesPack(value: unknown): CompletedGate[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return []
  const root = value as Record<string, unknown>
  if (!Array.isArray(root.completedGates)) return []
  const result: CompletedGate[] = []
  for (const candidate of root.completedGates.slice(0, 10)) {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) continue
    const item = candidate as Record<string, unknown>
    const allowedKeys = new Set(["id", "campaignKey", "completedAt", "evidence"])
    if (Object.keys(item).some(key => !allowedKeys.has(key))) continue
    if (
      typeof item.id !== "string" ||
      !COMPLETED_GATE_IDS.has(item.id) ||
      typeof item.campaignKey !== "string" ||
      !item.campaignKey.trim() ||
      typeof item.completedAt !== "string" ||
      !Number.isFinite(new Date(item.completedAt).getTime()) ||
      typeof item.evidence !== "string"
    ) continue
    result.push({
      id: item.id as CompletedGate["id"],
      campaignKey: item.campaignKey.slice(0, 120),
      completedAt: item.completedAt,
      evidence: item.evidence.slice(0, 240),
    })
  }
  return result.filter((gate, index) =>
    result.findIndex(item => item.id === gate.id && item.campaignKey === gate.campaignKey) === index
  )
}

function deriveCompletedGates(input: RevenueOperatorInput): CompletedGate[] {
  const gates = [...input.completedGates]
  const add = (gate: CompletedGate) => {
    if (!gates.some(item => item.id === gate.id && item.campaignKey === gate.campaignKey)) gates.push(gate)
  }
  if (
    input.previousDecision?.id === "activate-owned-commerce" &&
    input.previousDecision.status === "succeeded" &&
    input.promptVault
  ) {
    add({
      id: "owned-commerce",
      campaignKey: input.promptVault.campaignKey,
      completedAt: input.asOf,
      evidence: input.previousDecision.terminalReason || "The attributed owned-commerce gate passed.",
    })
  }
  if (
    input.previousDecision?.id === "activate-owned-commerce" &&
    input.previousDecision.status === "failed" &&
    input.promptVault
  ) {
    add({
      id: "owned-commerce-scored",
      campaignKey: input.promptVault.campaignKey,
      completedAt: input.asOf,
      evidence: `${input.promptVault.current.campaignAttributedPayments} campaign-attributed net payment(s) were scored. ${input.previousDecision.terminalReason || "The owned-commerce exposure was below its success gate."}`,
    })
  }
  if (
    input.promptVault?.exposureComplete &&
    sourceIsHealthy(input, "stripe_payments") &&
    sourceIsHealthy(input, "resend_broadcasts") &&
    sourceIsHealthy(input, "analytics_events") &&
    sourceIsHealthy(input, "checkout_attribution")
  ) {
    add({
      id: "owned-commerce-scored",
      campaignKey: input.promptVault.campaignKey,
      completedAt: input.asOf,
      evidence: `${input.promptVault.current.campaignAttributedPayments} campaign-attributed net payments were scored after mature exposure.`,
    })
  }
  if (
    input.promptVault?.exposureComplete &&
    sourceIsHealthy(input, "stripe_payments") &&
    sourceIsHealthy(input, "resend_broadcasts") &&
    sourceIsHealthy(input, "analytics_events") &&
    sourceIsHealthy(input, "checkout_attribution") &&
    input.promptVault.current.campaignAttributedPayments >= 15
  ) {
    add({
      id: "owned-commerce",
      campaignKey: input.promptVault.campaignKey,
      completedAt: input.asOf,
      evidence: `${input.promptVault.current.campaignAttributedPayments} campaign-attributed net payments passed the mature owned-commerce gate.`,
    })
  }
  if (
    input.previousDecision?.id === "prove-maya-repeat-value" &&
    input.previousDecision.status === "succeeded" &&
    input.maya
  ) {
    add({
      id: "maya-paid-value",
      campaignKey: input.maya.campaignKey,
      completedAt: input.asOf,
      evidence: input.previousDecision.terminalReason || "The mature Maya paid-value gate passed.",
    })
  }
  if (
    input.maya &&
    sourceIsHealthy(input, "stripe_payments") &&
    sourceIsHealthy(input, "maya_events") &&
    mayaGatePassed(input)
  ) {
    add({
      id: "maya-paid-value",
      campaignKey: input.maya.campaignKey,
      completedAt: input.asOf,
      evidence: "All three mature Maya paid-value gates passed.",
    })
  }
  return gates
}

function deriveCompletedWork(input: RevenueOperatorInput): string {
  const problems = input.sourceHealth.filter(item => item.status !== "ok")
  if (problems.length) {
    return `Ran the aggregate evidence check; ${problems.map(item => `${item.source} is ${item.status}`).join(", ")}, so dependent conclusions were suppressed.`
  }
  return "Refreshed and reconciled the aggregate money, delivery, funnel, recurring-value, and customer-protection evidence for the weekly decision."
}

function mayaApprovalReady(input: RevenueOperatorInput): boolean {
  return hasCompletedGate(input, "owned-commerce-scored") && Object.values(input.mayaTestReadiness).every(Boolean)
}

export function buildRevenueOperatorPack(input: RevenueOperatorInput): RevenueOperatorPack {
  const asOf = new Date(input.asOf)
  if (!Number.isFinite(asOf.getTime())) throw new Error("A valid as-of date is required")
  const generatedAt = new Date(input.generatedAt)
  if (!Number.isFinite(generatedAt.getTime())) throw new Error("A valid generated-at date is required")
  const cash = [...input.cash]
    .map(row => ({ ...row, currency: row.currency.toUpperCase() }))
    .sort((a, b) => a.currency.localeCompare(b.currency) || a.product.localeCompare(b.product))
  const base = { ...input, asOf: asOf.toISOString(), generatedAt: generatedAt.toISOString(), cash }
  const withResolvedDecision = { ...base, previousDecision: resolvePreviousDecision(base) }
  const normalized = { ...withResolvedDecision, completedGates: deriveCompletedGates(withResolvedDecision) }
  const currentDecision = decisionFrom(normalized)
  const outwardApprovalReady = mayaApprovalReady(normalized) && currentDecision.id === "prove-maya-repeat-value"
  const sandraActions = outwardApprovalReady && currentDecision.status !== "blocked"
    ? [{ title: "Approve the prepared outward action", reason: currentDecision.priority }]
    : []
  return {
    ...normalized,
    windows: createComparisonWindows(asOf, input.windowDays),
    decision: currentDecision,
    largestLeak: deriveLargestLeak(normalized),
    completedWork: deriveCompletedWork(normalized),
    outwardApprovalReady,
    sandraActions,
    terminalStatus: currentDecision.status === "blocked"
      ? "Blocked"
      : sandraActions.length
        ? "Needs Sandra"
        : "Ready",
  }
}

function formatMinor(value: number, currency: string): string {
  const amount = value / 100
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount)
  } catch {
    return `${currency} ${amount.toFixed(2)}`
  }
}

export function renderRevenueOperatorMarkdown(pack: RevenueOperatorPack): string {
  const health = pack.sourceHealth.map(item =>
    `- ${item.source}: ${item.status}${item.freshestRecordAt ? `; freshest ${item.freshestRecordAt}` : ""}${item.affects ? ` (${item.affects})` : ""}`
  )
  const cash = pack.cash.length
    ? pack.cash.map(row =>
        `- ${row.product} · ${row.currency}: ${row.currentPayments} net payment(s), ${formatMinor(row.currentNetMinor, row.currency)} net (${formatMinor(row.currentGrossMinor, row.currency)} gross - ${formatMinor(row.currentRefundedMinor, row.currency)} refunded); previous ${row.previousPayments} / ${formatMinor(row.previousNetMinor, row.currency)} net.`
      )
    : ["- No net qualifying payments in either reconciled window."]
  const sandra = pack.sandraActions.length
    ? pack.sandraActions.map(action => `- ${action.title}: ${action.reason}`)
    : ["- None. The AI team owns the current action."]

  return [
    "# SSELFIE Revenue Operator",
    "",
    `Generated: ${pack.generatedAt}`,
    `Evidence as of: ${pack.asOf}`,
    `Current window: ${pack.windows.current.start} -> ${pack.windows.current.end}`,
    `Previous window: ${pack.windows.previous.start} -> ${pack.windows.previous.end}`,
    "",
    "## Source health",
    ...health,
    "",
    "## Cleared cash",
    ...cash,
    "",
    "## Recurring value",
    pack.membership
      ? `- ${pack.membership.active} active Stripe member(s); ${pack.membership.discounted} discounted; net MRR stays separated by currency: ${Object.entries(pack.membership.netMrrByCurrency).map(([currency, amount]) => `${currency} ${amount.toFixed(2)}`).join(" + ") || "none"}.`
      : "- Subscription truth unavailable.",
    pack.maya
      ? `- Maya active-access behavior: ${pack.maya.jobsCompleted}/${pack.maya.jobsStarted} jobs completed across ${pack.maya.activeMembers} active user(s); value-test gate ${pack.maya.qualifyingMonthlyPurchases}/3 purchases, ${pack.maya.firstOutcomesWithin48h}/2 first outcomes, ${pack.maya.secondOutcomesWithin10d}/2 second outcomes.`
      : "- Maya recurring-value evidence unavailable.",
    `- Maya invitation readiness: cohort ${pack.mayaTestReadiness.cohortSelected ? "ready" : "not ready"}; access ${pack.mayaTestReadiness.mayaHomeAccessVerified ? "verified" : "not verified"}; checkout ${pack.mayaTestReadiness.checkoutVerified ? "verified" : "not verified"}; defect gate ${pack.mayaTestReadiness.defectGateClear ? "clear" : "not clear"}; invitation ${pack.mayaTestReadiness.invitationPrepared ? "prepared" : "not prepared"}.`,
    pack.operations
      ? `- Guard: ${pack.operations.openPaymentReviews} payment review(s), ${pack.operations.failedProtectedJobs} failed protected job(s), ${pack.operations.staleProtectedJobs.length} stale protected job(s), ${pack.operations.openBugs} open bug report(s), ${pack.operations.openMayaReleaseBlockers} open Maya release blocker(s).`
      : "- Customer and fulfillment guard unavailable.",
    "",
    "## Largest measurable leak",
    `- ${pack.largestLeak.label}: ${pack.largestLeak.evidence}`,
    "",
    "## Work completed",
    `- ${pack.completedWork}`,
    "",
    "## One decision",
    `- Priority: ${pack.decision.priority}`,
    `- Evidence: ${pack.decision.evidence}`,
    `- AI action: ${pack.decision.action}`,
    `- Success: ${pack.decision.successSignal}`,
    `- Failure: ${pack.decision.failureSignal}`,
    `- Review: ${pack.decision.reviewAt}`,
    `- Decision state: ${pack.decision.status}`,
    "",
    "## Sandra",
    ...sandra,
    "",
    pack.terminalStatus,
    "",
  ].join("\n")
}
