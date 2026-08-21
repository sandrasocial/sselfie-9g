import "server-only"

import { hasSubscriptionAccess } from "@/lib/membership-access-policy"
import type { IntegrationProvider } from "./contracts"
import {
  createSuiteMembershipShadowReport,
  type SuiteMembershipShadowEventEvidence,
} from "./suite-membership-shadow-report"

type EnvLike = Record<string, string | undefined>

export type SuiteProviderPilotMode = "founder_only" | "cohort"

export type SuiteProviderPilotProvider = Extract<
  IntegrationProvider,
  "skool" | "studio_platform_partner"
>

export type SuiteProviderPilotConfig =
  | { state: "disabled" }
  | {
      state: "invalid"
      reason:
        | "invalid_user_count"
        | "invalid_pilot_mode"
        | "duplicate_user_id"
        | "invalid_user_id"
        | "invalid_provider"
        | "invalid_resource_id"
    }
  | {
      state: "ready"
      pilotMode: SuiteProviderPilotMode
      userIds: string[]
      provider: SuiteProviderPilotProvider
      resourceId: string
    }

export interface SuiteProviderPilotSubscriptionEvidence {
  subscriptionId: string
  userId: string
  productType: string
  planId: string
  status: string
  currentPeriodEnd: string | null
  isTestMode: boolean
}

export interface SuiteProviderPilotEvidence {
  state: "available"
  subscriptions: SuiteProviderPilotSubscriptionEvidence[]
  events: SuiteMembershipShadowEventEvidence[]
  positiveInitialPayments: SuiteProviderPilotInitialPaymentEvidence[]
  preexistingExternalUserIds: string[]
}

export interface SuiteProviderPilotInitialPaymentEvidence {
  userId: string
  subscriptionId: string
  invoiceId: string
  amountCents: number
  currency: string
  productType: string
  paymentType: string
  status: string
  isTestMode: boolean
  billingReason: string
}

export type SuiteProviderPilotEvidenceSnapshot =
  | SuiteProviderPilotEvidence
  | { state: "unavailable"; reason: string }
  | { state: "not_requested" }

export const SUITE_PROVIDER_PILOT_ROW_STATES = [
  "candidate_pending_live_verification",
  "missing_exact_subscription",
  "duplicate_exact_subscription",
  "unstable_access",
  "missing_positive_initial_payment",
  "ambiguous_positive_initial_payment",
  "immutable_conflict",
  "preexisting_external_state",
] as const

export type SuiteProviderPilotRowState = (typeof SUITE_PROVIDER_PILOT_ROW_STATES)[number]

export interface SuiteProviderPilotReportRow {
  userId: string
  state: SuiteProviderPilotRowState
  subscriptionId: string | null
  eventId: string | null
  evidenceOrigin: "compatible_shadow_event" | "positive_initial_payment" | null
  initialPaymentInvoiceId: string | null
  proposal: null
}

export const SUITE_PROVIDER_PILOT_REQUIRED_LIVE_CHECKS = [
  "stripe_cancel_at_period_end_false",
  "member_consent_confirmed",
  "provider_identity_confirmed",
] as const

export interface SuiteProviderPilotReport {
  version: 1
  status: "ok" | "failure"
  mode: "disabled" | "blocked" | "shadow"
  pilotMode: SuiteProviderPilotMode | null
  observedAt: string
  provider: SuiteProviderPilotProvider | null
  providerContractState: "unverified"
  externalEffectsAllowed: false
  requiredLiveChecks: typeof SUITE_PROVIDER_PILOT_REQUIRED_LIVE_CHECKS
  resourceId: string | null
  allowlistSize: number
  error?: "configuration_invalid" | "database_unavailable"
  configurationReason?: Extract<SuiteProviderPilotConfig, { state: "invalid" }>["reason"]
  rows: SuiteProviderPilotReportRow[]
  summary: Record<SuiteProviderPilotRowState, number>
}

const opaqueIdentifierPattern = /^[A-Za-z0-9_.:-]{1,256}$/

function emptySummary(): Record<SuiteProviderPilotRowState, number> {
  return {
    candidate_pending_live_verification: 0,
    missing_exact_subscription: 0,
    duplicate_exact_subscription: 0,
    unstable_access: 0,
    missing_positive_initial_payment: 0,
    ambiguous_positive_initial_payment: 0,
    immutable_conflict: 0,
    preexisting_external_state: 0,
  }
}

export function resolveSuiteProviderPilotConfig(env: EnvLike): SuiteProviderPilotConfig {
  if (env.FEATURE_SUITE_PROVIDER_PILOT_SHADOW_ENABLED !== "true") {
    return { state: "disabled" }
  }

  const pilotMode = env.SUITE_PROVIDER_PILOT_MODE
  if (pilotMode !== "founder_only" && pilotMode !== "cohort") {
    return { state: "invalid", reason: "invalid_pilot_mode" }
  }

  const rawUserIds = String(env.SUITE_PROVIDER_PILOT_USER_IDS || "")
    .split(/[\n,]/)
    .map(value => value.trim())
    .filter(Boolean)
  if (new Set(rawUserIds).size !== rawUserIds.length) {
    return { state: "invalid", reason: "duplicate_user_id" }
  }
  const validUserCount =
    pilotMode === "founder_only"
      ? rawUserIds.length === 1
      : rawUserIds.length >= 3 && rawUserIds.length <= 5
  if (!validUserCount) {
    return { state: "invalid", reason: "invalid_user_count" }
  }
  if (rawUserIds.some(value => !opaqueIdentifierPattern.test(value) || value.includes("@"))) {
    return { state: "invalid", reason: "invalid_user_id" }
  }

  const provider = env.SUITE_PROVIDER_PILOT_PROVIDER
  if (provider !== "skool" && provider !== "studio_platform_partner") {
    return { state: "invalid", reason: "invalid_provider" }
  }

  const resourceId = String(env.SUITE_PROVIDER_PILOT_RESOURCE_ID || "").trim()
  if (!opaqueIdentifierPattern.test(resourceId)) {
    return { state: "invalid", reason: "invalid_resource_id" }
  }

  return { state: "ready", pilotMode, userIds: [...rawUserIds].sort(), provider, resourceId }
}

function isStablePaidAccess(row: SuiteProviderPilotSubscriptionEvidence, now: Date): boolean {
  if (
    row.productType !== "sselfie_studio_membership" ||
    row.isTestMode ||
    row.status !== "active" ||
    !row.planId.trim() ||
    row.planId === "maya_essential_pilot" ||
    !row.currentPeriodEnd
  ) {
    return false
  }
  const periodEnd = new Date(row.currentPeriodEnd).getTime()
  return (
    Number.isFinite(periodEnd) &&
    periodEnd > now.getTime() &&
    hasSubscriptionAccess(
      {
        status: row.status,
        current_period_end: row.currentPeriodEnd,
      },
      now
    )
  )
}

function isExactPositiveInitialPayment(payment: SuiteProviderPilotInitialPaymentEvidence): boolean {
  return (
    payment.productType === "sselfie_studio_membership" &&
    payment.paymentType === "subscription" &&
    (payment.status === "paid" || payment.status === "succeeded") &&
    !payment.isTestMode &&
    payment.amountCents > 0 &&
    opaqueIdentifierPattern.test(payment.subscriptionId) &&
    opaqueIdentifierPattern.test(payment.invoiceId) &&
    payment.billingReason === "subscription_create" &&
    /^[a-z]{3}$/.test(payment.currency)
  )
}

export function projectSuiteProviderPilotCandidates(
  config: SuiteProviderPilotConfig,
  evidence: SuiteProviderPilotEvidence,
  now: Date
): SuiteProviderPilotReportRow[] {
  if (config.state !== "ready") return []

  const shadowReport = createSuiteMembershipShadowReport(
    {
      state: "available",
      subscriptions: evidence.subscriptions.map(row => ({
        subscriptionId: row.subscriptionId,
        userId: row.userId,
        planId: row.planId,
      })),
      events: evidence.events,
      positiveInitialPayments: [],
    },
    now
  )
  const shadowBySubscription = new Map(shadowReport.rows.map(row => [row.subscriptionId, row]))
  const preexisting = new Set(evidence.preexistingExternalUserIds)
  const paymentsBySubscription = new Map<string, SuiteProviderPilotInitialPaymentEvidence[]>()
  for (const payment of evidence.positiveInitialPayments) {
    if (!isExactPositiveInitialPayment(payment)) continue
    const payments = paymentsBySubscription.get(payment.subscriptionId) ?? []
    payments.push(payment)
    paymentsBySubscription.set(payment.subscriptionId, payments)
  }

  return config.userIds.map(userId => {
    const memberships = evidence.subscriptions
      .filter(row => row.userId === userId)
      .sort((left, right) => left.subscriptionId.localeCompare(right.subscriptionId))
    if (memberships.length === 0) {
      return {
        userId,
        state: "missing_exact_subscription",
        subscriptionId: null,
        eventId: null,
        evidenceOrigin: null,
        initialPaymentInvoiceId: null,
        proposal: null,
      }
    }
    if (memberships.length !== 1) {
      return {
        userId,
        state: "duplicate_exact_subscription",
        subscriptionId: memberships[0].subscriptionId,
        eventId: null,
        evidenceOrigin: null,
        initialPaymentInvoiceId: null,
        proposal: null,
      }
    }

    const membership = memberships[0]
    if (!isStablePaidAccess(membership, now)) {
      return {
        userId,
        state: "unstable_access",
        subscriptionId: membership.subscriptionId,
        eventId: null,
        evidenceOrigin: null,
        initialPaymentInvoiceId: null,
        proposal: null,
      }
    }

    const shadow = shadowBySubscription.get(membership.subscriptionId)
    const initialPayments = (paymentsBySubscription.get(membership.subscriptionId) ?? [])
      .filter(payment => payment.userId === userId)
      .sort((left, right) => left.invoiceId.localeCompare(right.invoiceId))
    if (initialPayments.length > 1) {
      return {
        userId,
        state: "ambiguous_positive_initial_payment",
        subscriptionId: membership.subscriptionId,
        eventId: shadow?.eventId ?? null,
        evidenceOrigin: null,
        initialPaymentInvoiceId: null,
        proposal: null,
      }
    }
    if (initialPayments.length === 0) {
      return {
        userId,
        state: "missing_positive_initial_payment",
        subscriptionId: membership.subscriptionId,
        eventId: shadow?.eventId ?? null,
        evidenceOrigin: null,
        initialPaymentInvoiceId: null,
        proposal: null,
      }
    }
    if (shadow && shadow.state !== "compatible" && shadow.state !== "qualification_unknown") {
      return {
        userId,
        state: "immutable_conflict",
        subscriptionId: membership.subscriptionId,
        eventId: shadow?.eventId ?? null,
        evidenceOrigin: null,
        initialPaymentInvoiceId: null,
        proposal: null,
      }
    }
    if (preexisting.has(userId)) {
      return {
        userId,
        state: "preexisting_external_state",
        subscriptionId: membership.subscriptionId,
        eventId: shadow?.eventId ?? null,
        evidenceOrigin: null,
        initialPaymentInvoiceId: null,
        proposal: null,
      }
    }

    return {
      userId,
      state: "candidate_pending_live_verification",
      subscriptionId: membership.subscriptionId,
      eventId: shadow?.eventId ?? null,
      evidenceOrigin:
        shadow?.state === "compatible" ? "compatible_shadow_event" : "positive_initial_payment",
      initialPaymentInvoiceId: initialPayments[0].invoiceId,
      proposal: null,
    }
  })
}

export function createSuiteProviderPilotReport(
  config: SuiteProviderPilotConfig,
  evidence: SuiteProviderPilotEvidenceSnapshot,
  now: Date
): SuiteProviderPilotReport {
  const observedAt = Number.isFinite(now.getTime()) ? now.toISOString() : new Date(0).toISOString()
  const summary = emptySummary()

  if (config.state === "disabled") {
    return {
      version: 1,
      status: "ok",
      mode: "disabled",
      pilotMode: null,
      observedAt,
      provider: null,
      providerContractState: "unverified",
      externalEffectsAllowed: false,
      requiredLiveChecks: SUITE_PROVIDER_PILOT_REQUIRED_LIVE_CHECKS,
      resourceId: null,
      allowlistSize: 0,
      rows: [],
      summary,
    }
  }
  if (config.state === "invalid") {
    return {
      version: 1,
      status: "failure",
      mode: "blocked",
      pilotMode: null,
      observedAt,
      provider: null,
      providerContractState: "unverified",
      externalEffectsAllowed: false,
      requiredLiveChecks: SUITE_PROVIDER_PILOT_REQUIRED_LIVE_CHECKS,
      resourceId: null,
      allowlistSize: 0,
      error: "configuration_invalid",
      configurationReason: config.reason,
      rows: [],
      summary,
    }
  }
  if (evidence.state !== "available") {
    return {
      version: 1,
      status: "failure",
      mode: "shadow",
      pilotMode: config.pilotMode,
      observedAt,
      provider: config.provider,
      providerContractState: "unverified",
      externalEffectsAllowed: false,
      requiredLiveChecks: SUITE_PROVIDER_PILOT_REQUIRED_LIVE_CHECKS,
      resourceId: config.resourceId,
      allowlistSize: config.userIds.length,
      error: "database_unavailable",
      rows: [],
      summary,
    }
  }

  const rows = projectSuiteProviderPilotCandidates(config, evidence, now)
  for (const row of rows) summary[row.state] += 1
  return {
    version: 1,
    status: "ok",
    mode: "shadow",
    pilotMode: config.pilotMode,
    observedAt,
    provider: config.provider,
    providerContractState: "unverified",
    externalEffectsAllowed: false,
    requiredLiveChecks: SUITE_PROVIDER_PILOT_REQUIRED_LIVE_CHECKS,
    resourceId: config.resourceId,
    allowlistSize: config.userIds.length,
    rows,
    summary,
  }
}

export function serializeSuiteProviderPilotReport(report: SuiteProviderPilotReport): string {
  return `${JSON.stringify(report, null, 2)}\n`
}
