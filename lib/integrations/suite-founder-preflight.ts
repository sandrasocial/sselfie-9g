import { createHash } from "node:crypto"

import type { SuiteProviderPilotConfig, SuiteProviderPilotProvider } from "./suite-provider-pilot"

const OPAQUE = /^[A-Za-z0-9_.:-]{1,256}$/
const DIGEST = /^sha256:[a-f0-9]{64}$/

export type EvidenceSource<T> =
  | { state: "available"; value: T }
  | { state: "unavailable"; reason: string }

export interface SuiteFounderCoreEvidence {
  configuredUserCount: number
  founderIdentityUserCount: number
  founderIdentityMatchesConfiguredUser: boolean
  userId: string
  userEmailDigest: string
  authUserId: string | null
  passwordSetupComplete: boolean
  subscriptionCount: number
  subscriptionIdDigest: string
  subscriptionIdPrivate: string
  stripeCustomerIdPrivate: string
  planId: string
  status: string
  isTestMode: boolean
  currentPeriodStartEpoch: number
  currentPeriodEndEpoch: number
  paymentCount: number
  paymentAmountCents: number
  paymentCurrency: string
  paymentSubscriptionIdPrivate: string
  paymentInvoiceIdPrivate: string
}

export interface SuiteFounderStripeEvidence {
  subscriptionIdDigest: string
  livemode: boolean
  status: string
  customerMatches: boolean
  priceConfigured: boolean
  metadataMatches: boolean
  cancelAtPeriodEnd: boolean
  cancelAt: number | null
  canceledAt: number | null
  endedAt: number | null
  pauseCollection: boolean
  currentPeriodStartEpoch: number
  currentPeriodEndEpoch: number
  latestInvoiceAssociationMatches: boolean
  invoiceStatus: string
  invoicePaidAt: number
  amountPaid: number
  amountRemaining: number
  collectionMethod: string
}

export interface SuiteFounderAuthEvidence {
  userExists: boolean
  authIdMatches: boolean
  emailMatches: boolean
  confirmed: boolean
  banned: boolean
  passwordState: "password_ready" | "recovery_required"
}

export interface SuiteFounderBaseline {
  walletRows: number
  walletBalance: number
  totalPurchased: number
  totalUsed: number
  ledgerRows: number
  academyUserEntitlementProducts: number
  academyCoursePurchaseProducts: number
  academyLegacySubscriptionProducts: number
  academyStripePaymentProducts: number
  academyAccessibleProducts: number
  academyMembershipCatalogProducts: number
  mayaChats: number
  mayaMessages: number
  mayaMemories: number
  mayaCompletedModels: number
  mayaBrandAssets: number
  mayaUploads: number
  mayaProducedAssets: number
  mayaBrandProfiles: number
  mayaOpenDrafts: number
  externalAccounts: number
  provisioningStates: number
  outboxRows: number
}

export interface SuiteFounderAutomaticEvidence {
  core: EvidenceSource<SuiteFounderCoreEvidence>
  stripe: EvidenceSource<SuiteFounderStripeEvidence>
  auth: EvidenceSource<SuiteFounderAuthEvidence>
  credits: EvidenceSource<
    Pick<
      SuiteFounderBaseline,
      "walletRows" | "walletBalance" | "totalPurchased" | "totalUsed" | "ledgerRows"
    >
  >
  academyUserEntitlements: EvidenceSource<{ productIds: string[] }>
  academyCoursePurchases: EvidenceSource<{ productIds: string[] }>
  academyLegacySubscriptions: EvidenceSource<{ productIds: string[] }>
  academyStripePayments: EvidenceSource<{ productIds: string[] }>
  academyCatalog: EvidenceSource<{ membershipProductIds: string[] }>
  maya: EvidenceSource<
    Pick<
      SuiteFounderBaseline,
      | "mayaChats"
      | "mayaMessages"
      | "mayaMemories"
      | "mayaCompletedModels"
      | "mayaBrandAssets"
      | "mayaUploads"
      | "mayaProducedAssets"
      | "mayaBrandProfiles"
      | "mayaOpenDrafts"
    >
  >
  integrations: EvidenceSource<
    Pick<SuiteFounderBaseline, "externalAccounts" | "provisioningStates" | "outboxRows">
  >
}

export const SUITE_FOUNDER_DATA_CATEGORIES = [
  "email_address",
  "display_name",
  "profile_image",
  "provider_membership_status",
] as const

export const SUITE_FOUNDER_KNOWN_ACADEMY_PRODUCT_IDS = [
  "ai_photo_prompts",
  "ai_photo_refresh",
  "brand_strategy_pack",
  "branded_by_sselfie",
  "caption_sprint",
  "concept_cards_pack",
  "editing_masterclass",
  "feed_reset_9grid",
  "get_paid",
  "masterclass",
  "presets_bundle",
  "presets_single",
  "prompt_vault",
  "selfie_guide",
  "selfie_guide_bundle",
  "selfie_to_brand_shoot_system",
  "selfie_visibility_bundle",
  "show_up",
  "starter_kit",
  "visibility_suite",
  "what_to_say",
] as const

export interface SuiteFounderHumanEvidencePacket {
  version: 1
  provider: SuiteProviderPilotProvider
  resourceId: string
  founderUserId: string
  providerIdentityArtifactDigest: string
  providerTermsArtifactDigest: string
  providerPrivacyArtifactDigest: string
  providerRemovalArtifactDigest: string
  dataCategories: string[]
  consent: {
    artifactDigest: string
    capturedAt: string
    expiresAt: string
    withdrawnAt: null
    checkAt: string
  }
  providerCapability: {
    artifactDigest: string
    verifiedAt: string
    expiresAt: string
    identityMethod: "manual_verified_email_match"
    deliveryMethod: "manual_invite"
    inviteSupported: true
    observedStatusMethod: "manual_provider_dashboard"
    pendingInviteRevokeSupported: true
    activeMemberRemovalSupported: true
    replayPolicy: "manual_single_attempt"
    statusReadSupported: true
    absenceConfirmationSupported: true
    credentialMode: "attended_provider_session"
    rateLimitPolicy: "single_manual_action"
    killSwitch: "no_dispatch_without_new_approval"
  }
  rollback: {
    owner: "sandra"
    method: "manual_provider_removal"
    slaHours: number
  }
}

export interface SuiteFounderApprovalSummary {
  artifactDigests: {
    providerIdentity: string
    providerTerms: string
    providerPrivacy: string
    providerRemoval: string
    consent: string
    providerCapability: string
  }
  dataCategories: string[]
  consent: Pick<
    SuiteFounderHumanEvidencePacket["consent"],
    "capturedAt" | "expiresAt" | "withdrawnAt" | "checkAt"
  >
  providerCapability: SuiteFounderHumanEvidencePacket["providerCapability"]
  rollback: SuiteFounderHumanEvidencePacket["rollback"]
}

export interface SuiteFounderPreflightReport {
  version: 1
  state: "disabled" | "blocked" | "ready_for_sandra_approval"
  pilotMode: "founder_only" | null
  observedAt: string
  provider: SuiteProviderPilotProvider | null
  resourceId: string | null
  founderUserId: string | null
  approvalState: "not_requested"
  proposal: null
  externalEffectsAllowed: false
  adapterEnablementAllowed: false
  dispatchAllowed: false
  passwordState: "password_ready" | "recovery_required" | null
  blockers: string[]
  baselines: SuiteFounderBaseline | null
  academyAccessSummary: SuiteFounderAcademyAccessSummary | null
  approvalSummary: SuiteFounderApprovalSummary | null
  evidenceDigest: string
}

export interface SuiteFounderAcademyAccessSummary {
  membershipActive: boolean
  directProductCount: number
  directProductDigest: string
  expandedProductCount: number
  expandedProductDigest: string
  accessibleProductCount: number
  accessibleProductDigest: string
}

const PROVIDER_MINIMUM_DATA_CATEGORIES: Record<SuiteProviderPilotProvider, readonly string[]> = {
  skool: ["email_address"],
  studio_platform_partner: ["email_address"],
}

const MAX_CHECK_AGE_MS = 5 * 60 * 1000
const MAX_EVIDENCE_AGE_MS = 24 * 60 * 60 * 1000
const MAX_EVIDENCE_VALIDITY_MS = 24 * 60 * 60 * 1000

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonical(entry)}`)
      .join(",")}}`
  }
  return JSON.stringify(value)
}

export function digestEvidence(value: unknown): string {
  return `sha256:${createHash("sha256").update(canonical(value)).digest("hex")}`
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

export function validateSuiteFounderHumanEvidencePacket(
  value: unknown,
  config: Extract<SuiteProviderPilotConfig, { state: "ready" }>,
  observedAt: Date
): value is SuiteFounderHumanEvidencePacket {
  if (
    !isPlainObject(value) ||
    !isPlainObject(value.rollback) ||
    !isPlainObject(value.consent) ||
    !isPlainObject(value.providerCapability)
  )
    return false
  const packet = value as unknown as SuiteFounderHumanEvidencePacket
  const exactKeys = [
    "consent",
    "dataCategories",
    "founderUserId",
    "provider",
    "providerCapability",
    "providerIdentityArtifactDigest",
    "providerPrivacyArtifactDigest",
    "providerRemovalArtifactDigest",
    "providerTermsArtifactDigest",
    "resourceId",
    "rollback",
    "version",
  ]
  if (Object.keys(value).sort().join("|") !== exactKeys.sort().join("|")) return false
  if (
    Object.keys(value.consent).sort().join("|") !==
      ["artifactDigest", "capturedAt", "checkAt", "expiresAt", "withdrawnAt"].sort().join("|") ||
    Object.keys(value.providerCapability).sort().join("|") !==
      [
        "activeMemberRemovalSupported",
        "absenceConfirmationSupported",
        "artifactDigest",
        "credentialMode",
        "deliveryMethod",
        "expiresAt",
        "identityMethod",
        "inviteSupported",
        "killSwitch",
        "observedStatusMethod",
        "pendingInviteRevokeSupported",
        "rateLimitPolicy",
        "replayPolicy",
        "statusReadSupported",
        "verifiedAt",
      ]
        .sort()
        .join("|") ||
    Object.keys(value.rollback).sort().join("|") !== ["method", "owner", "slaHours"].join("|")
  )
    return false
  if (
    packet.version !== 1 ||
    packet.provider !== config.provider ||
    packet.resourceId !== config.resourceId ||
    packet.founderUserId !== config.userIds[0] ||
    !OPAQUE.test(packet.resourceId) ||
    !OPAQUE.test(packet.founderUserId) ||
    !Array.isArray(packet.dataCategories)
  )
    return false
  const digests = [
    packet.providerIdentityArtifactDigest,
    packet.providerTermsArtifactDigest,
    packet.providerPrivacyArtifactDigest,
    packet.providerRemovalArtifactDigest,
    packet.consent.artifactDigest,
    packet.providerCapability.artifactDigest,
  ]
  if (digests.some(value => !DIGEST.test(value))) return false
  const categories = [...packet.dataCategories].sort()
  if (
    categories.length === 0 ||
    new Set(categories).size !== categories.length ||
    categories.some(
      category => !(SUITE_FOUNDER_DATA_CATEGORIES as readonly string[]).includes(category)
    ) ||
    canonical(categories) !==
      canonical([...PROVIDER_MINIMUM_DATA_CATEGORIES[packet.provider]].sort())
  )
    return false
  const observed = observedAt.getTime()
  const captured = Date.parse(packet.consent.capturedAt)
  const consentExpiry = Date.parse(packet.consent.expiresAt)
  const check = Date.parse(packet.consent.checkAt)
  const capabilityVerified = Date.parse(packet.providerCapability.verifiedAt)
  const capabilityExpiry = Date.parse(packet.providerCapability.expiresAt)
  const timestamps: Array<[string, number]> = [
    [packet.consent.capturedAt, captured],
    [packet.consent.expiresAt, consentExpiry],
    [packet.consent.checkAt, check],
    [packet.providerCapability.verifiedAt, capabilityVerified],
    [packet.providerCapability.expiresAt, capabilityExpiry],
  ]
  if (
    timestamps.some(
      ([value, timestamp]) =>
        !Number.isFinite(timestamp) || new Date(timestamp).toISOString() !== value
    ) ||
    captured > check ||
    check > observed ||
    observed - check > MAX_CHECK_AGE_MS ||
    observed - captured > MAX_EVIDENCE_AGE_MS ||
    consentExpiry <= observed ||
    consentExpiry <= captured ||
    consentExpiry - captured > MAX_EVIDENCE_VALIDITY_MS ||
    packet.consent.withdrawnAt !== null ||
    capabilityVerified > observed ||
    observed - capabilityVerified > MAX_EVIDENCE_AGE_MS ||
    capabilityExpiry <= observed ||
    capabilityExpiry <= capabilityVerified ||
    capabilityExpiry - capabilityVerified > MAX_EVIDENCE_VALIDITY_MS ||
    packet.providerCapability.identityMethod !== "manual_verified_email_match" ||
    packet.providerCapability.deliveryMethod !== "manual_invite" ||
    packet.providerCapability.inviteSupported !== true ||
    packet.providerCapability.observedStatusMethod !== "manual_provider_dashboard" ||
    packet.providerCapability.pendingInviteRevokeSupported !== true ||
    packet.providerCapability.activeMemberRemovalSupported !== true ||
    packet.providerCapability.replayPolicy !== "manual_single_attempt" ||
    packet.providerCapability.statusReadSupported !== true ||
    packet.providerCapability.absenceConfirmationSupported !== true ||
    packet.providerCapability.credentialMode !== "attended_provider_session" ||
    packet.providerCapability.rateLimitPolicy !== "single_manual_action" ||
    packet.providerCapability.killSwitch !== "no_dispatch_without_new_approval" ||
    packet.rollback.owner !== "sandra" ||
    packet.rollback.method !== "manual_provider_removal" ||
    !Number.isInteger(packet.rollback.slaHours) ||
    packet.rollback.slaHours < 1 ||
    packet.rollback.slaHours > 168
  )
    return false
  return true
}

function approvalSummary(packet: SuiteFounderHumanEvidencePacket): SuiteFounderApprovalSummary {
  return {
    artifactDigests: {
      providerIdentity: packet.providerIdentityArtifactDigest,
      providerTerms: packet.providerTermsArtifactDigest,
      providerPrivacy: packet.providerPrivacyArtifactDigest,
      providerRemoval: packet.providerRemovalArtifactDigest,
      consent: packet.consent.artifactDigest,
      providerCapability: packet.providerCapability.artifactDigest,
    },
    dataCategories: [...packet.dataCategories].sort(),
    consent: {
      capturedAt: packet.consent.capturedAt,
      expiresAt: packet.consent.expiresAt,
      withdrawnAt: packet.consent.withdrawnAt,
      checkAt: packet.consent.checkAt,
    },
    providerCapability: { ...packet.providerCapability },
    rollback: { ...packet.rollback },
  }
}

const ACADEMY_ACCESS_ALIASES: Record<string, readonly string[]> = {
  selfie_guide_bundle: ["selfie_guide", "brand_strategy_pack"],
  selfie_visibility_bundle: [
    "masterclass",
    "starter_kit",
    "prompt_vault",
    "brand_strategy_pack",
    "branded_by_sselfie",
    "editing_masterclass",
  ],
  selfie_to_brand_shoot_system: ["brand_strategy_pack"],
  masterclass: ["brand_strategy_pack", "branded_by_sselfie", "editing_masterclass"],
  visibility_suite: [
    "what_to_say",
    "show_up",
    "get_paid",
    "concept_cards_pack",
    "caption_sprint",
    "feed_reset_9grid",
    "ai_photo_refresh",
  ],
}

const KNOWN_ACADEMY_IDS = new Set<string>(SUITE_FOUNDER_KNOWN_ACADEMY_PRODUCT_IDS)

export function normalizeSuiteFounderAcademyOwnership(input: {
  source: "user_entitlement" | "course_purchase" | "legacy_subscription" | "stripe_payment"
  productId: string
  purchasedProductId?: string | null
}): string | null {
  let productId = input.productId
  if (
    input.source === "user_entitlement" &&
    input.purchasedProductId === "visibility_suite" &&
    (productId === "visibility_suite" ||
      (ACADEMY_ACCESS_ALIASES.visibility_suite || []).includes(productId))
  )
    productId = "visibility_suite"
  if (input.source === "stripe_payment" && productId === "academy_mini_product")
    productId = input.purchasedProductId || ""
  return KNOWN_ACADEMY_IDS.has(productId) ? productId : null
}

function academyProjection(input: {
  userEntitlementProductIds: string[]
  coursePurchaseProductIds: string[]
  legacySubscriptionProductIds: string[]
  stripePaymentProductIds: string[]
  membershipProductIds: string[]
  membershipActive: boolean
}): {
  baseline: Pick<
    SuiteFounderBaseline,
    | "academyUserEntitlementProducts"
    | "academyCoursePurchaseProducts"
    | "academyLegacySubscriptionProducts"
    | "academyStripePaymentProducts"
    | "academyAccessibleProducts"
    | "academyMembershipCatalogProducts"
  >
  summary: SuiteFounderAcademyAccessSummary
} {
  const directSources = [
    input.userEntitlementProductIds,
    input.coursePurchaseProductIds,
    input.legacySubscriptionProductIds,
    input.stripePaymentProductIds,
  ]
  const direct = new Set(directSources.flat())
  const accessible = new Set(direct)
  for (const productId of direct)
    for (const alias of ACADEMY_ACCESS_ALIASES[productId] || []) accessible.add(alias)
  const expanded = new Set(accessible)
  if (input.membershipActive)
    for (const productId of input.membershipProductIds) accessible.add(productId)
  const sortedDirect = [...direct].sort()
  const sortedExpanded = [...expanded].sort()
  const sortedAccessible = [...accessible].sort()
  return {
    baseline: {
      academyUserEntitlementProducts: new Set(directSources[0]).size,
      academyCoursePurchaseProducts: new Set(directSources[1]).size,
      academyLegacySubscriptionProducts: new Set(directSources[2]).size,
      academyStripePaymentProducts: new Set(directSources[3]).size,
      academyAccessibleProducts: sortedAccessible.length,
      academyMembershipCatalogProducts: new Set(input.membershipProductIds).size,
    },
    summary: {
      membershipActive: input.membershipActive,
      directProductCount: sortedDirect.length,
      directProductDigest: digestEvidence(sortedDirect),
      expandedProductCount: sortedExpanded.length,
      expandedProductDigest: digestEvidence(sortedExpanded),
      accessibleProductCount: sortedAccessible.length,
      accessibleProductDigest: digestEvidence(sortedAccessible),
    },
  }
}

function allNonNegative(value: object): boolean {
  return Object.values(value).every(
    entry => typeof entry === "number" && Number.isInteger(entry) && entry >= 0
  )
}

export function createSuiteFounderPreflightReport(input: {
  config: SuiteProviderPilotConfig
  evidence: SuiteFounderAutomaticEvidence | null
  humanEvidence: unknown
  observedAt: Date
}): SuiteFounderPreflightReport {
  const base = {
    version: 1 as const,
    pilotMode: null as "founder_only" | null,
    observedAt: input.observedAt.toISOString(),
    provider: null as SuiteProviderPilotProvider | null,
    resourceId: null as string | null,
    founderUserId: null as string | null,
    approvalState: "not_requested" as const,
    proposal: null,
    externalEffectsAllowed: false as const,
    adapterEnablementAllowed: false as const,
    dispatchAllowed: false as const,
    passwordState: null as "password_ready" | "recovery_required" | null,
    baselines: null as SuiteFounderBaseline | null,
    academyAccessSummary: null as SuiteFounderAcademyAccessSummary | null,
    approvalSummary: null as SuiteFounderApprovalSummary | null,
  }
  if (input.config.state === "disabled") {
    const material = { ...base, state: "disabled", blockers: [] }
    return { ...material, state: "disabled", evidenceDigest: digestEvidence(material) }
  }
  if (input.config.state !== "ready" || input.config.pilotMode !== "founder_only") {
    const material = { ...base, state: "blocked", blockers: ["invalid_founder_only_configuration"] }
    return { ...material, state: "blocked", evidenceDigest: digestEvidence(material) }
  }
  base.pilotMode = "founder_only"
  base.provider = input.config.provider
  base.resourceId = input.config.resourceId
  base.founderUserId = input.config.userIds[0]
  const blockers: string[] = []
  const evidence = input.evidence
  if (!evidence) blockers.push("automatic_evidence_not_requested")
  const sources = evidence ? Object.entries(evidence) : []
  for (const [name, source] of sources) {
    if (source.state === "unavailable") blockers.push(`${name}_unavailable`)
  }
  if (evidence?.core.state === "available") {
    const core = evidence.core.value
    if (core.configuredUserCount !== 1) blockers.push("local_user_not_unique")
    if (core.founderIdentityUserCount !== 1 || !core.founderIdentityMatchesConfiguredUser)
      blockers.push("founder_binding_mismatch")
    if (core.userId !== input.config.userIds[0] || !core.authUserId)
      blockers.push("local_identity_mismatch")
    if (
      core.subscriptionCount !== 1 ||
      !core.subscriptionIdPrivate ||
      !core.stripeCustomerIdPrivate
    )
      blockers.push("canonical_subscription_not_unique")
    if (
      core.planId === "maya_essential_pilot" ||
      !core.planId ||
      core.status !== "active" ||
      core.isTestMode
    )
      blockers.push("subscription_not_stable_full_suite")
    if (
      !(
        core.currentPeriodStartEpoch > 0 &&
        core.currentPeriodEndEpoch > input.observedAt.getTime() / 1000
      )
    )
      blockers.push("local_period_invalid")
    if (
      core.paymentCount !== 1 ||
      core.paymentAmountCents <= 0 ||
      !core.paymentInvoiceIdPrivate ||
      !/^[a-z]{3}$/.test(core.paymentCurrency)
    )
      blockers.push("initial_payment_not_exact")
    if (core.paymentSubscriptionIdPrivate !== core.subscriptionIdPrivate)
      blockers.push("payment_subscription_mismatch")
  }
  if (evidence?.stripe.state === "available" && evidence.core.state === "available") {
    const stripe = evidence.stripe.value
    const core = evidence.core.value
    if (
      !stripe.livemode ||
      stripe.status !== "active" ||
      !stripe.customerMatches ||
      !stripe.priceConfigured ||
      !stripe.metadataMatches
    )
      blockers.push("stripe_subscription_mismatch")
    if (
      stripe.cancelAtPeriodEnd ||
      stripe.cancelAt !== null ||
      stripe.canceledAt !== null ||
      stripe.endedAt !== null ||
      stripe.pauseCollection
    )
      blockers.push("stripe_subscription_scheduled_or_paused")
    if (
      stripe.currentPeriodStartEpoch !== core.currentPeriodStartEpoch ||
      stripe.currentPeriodEndEpoch !== core.currentPeriodEndEpoch
    )
      blockers.push("stripe_period_mismatch")
    if (
      !stripe.latestInvoiceAssociationMatches ||
      stripe.invoiceStatus !== "paid" ||
      stripe.invoicePaidAt <= 0 ||
      stripe.amountPaid <= 0 ||
      stripe.amountRemaining !== 0 ||
      stripe.collectionMethod !== "charge_automatically"
    )
      blockers.push("latest_invoice_not_confirmed_paid")
  }
  if (evidence?.auth.state === "available") {
    const auth = evidence.auth.value
    base.passwordState = auth.passwordState
    if (
      !auth.userExists ||
      !auth.authIdMatches ||
      !auth.emailMatches ||
      !auth.confirmed ||
      auth.banned
    )
      blockers.push("auth_identity_not_recoverable")
  }
  if (
    evidence &&
    evidence.credits.state === "available" &&
    evidence.academyUserEntitlements.state === "available" &&
    evidence.academyCoursePurchases.state === "available" &&
    evidence.academyLegacySubscriptions.state === "available" &&
    evidence.academyStripePayments.state === "available" &&
    evidence.academyCatalog.state === "available" &&
    evidence.maya.state === "available" &&
    evidence.integrations.state === "available"
  ) {
    const academy = academyProjection({
      userEntitlementProductIds: evidence.academyUserEntitlements.value.productIds,
      coursePurchaseProductIds: evidence.academyCoursePurchases.value.productIds,
      legacySubscriptionProductIds: evidence.academyLegacySubscriptions.value.productIds,
      stripePaymentProductIds: evidence.academyStripePayments.value.productIds,
      membershipProductIds: evidence.academyCatalog.value.membershipProductIds,
      membershipActive:
        evidence.core.state === "available" &&
        evidence.core.value.status === "active" &&
        !evidence.core.value.isTestMode,
    })
    const baselines: SuiteFounderBaseline = {
      ...evidence.credits.value,
      ...academy.baseline,
      ...evidence.maya.value,
      ...evidence.integrations.value,
    }
    base.baselines = baselines
    base.academyAccessSummary = academy.summary
    if (!allNonNegative(baselines)) blockers.push("baseline_invalid")
    if (baselines.externalAccounts || baselines.provisioningStates || baselines.outboxRows)
      blockers.push("preexisting_integration_state")
  }
  if (validateSuiteFounderHumanEvidencePacket(input.humanEvidence, input.config, input.observedAt))
    base.approvalSummary = approvalSummary(input.humanEvidence)
  else blockers.push("human_evidence_packet_invalid_or_missing")
  const uniqueBlockers = [...new Set(blockers)].sort()
  const material = {
    ...base,
    state: uniqueBlockers.length ? "blocked" : "ready_for_sandra_approval",
    blockers: uniqueBlockers,
    automaticEvidence: evidence,
    humanEvidence: input.humanEvidence,
  }
  return {
    ...base,
    state: uniqueBlockers.length ? "blocked" : "ready_for_sandra_approval",
    blockers: uniqueBlockers,
    evidenceDigest: digestEvidence(material),
  }
}

export function serializeSuiteFounderPreflightReport(report: SuiteFounderPreflightReport): string {
  return `${JSON.stringify(report, null, 2)}\n`
}
