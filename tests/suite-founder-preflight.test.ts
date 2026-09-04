// @vitest-environment node

import fs from "node:fs"
import { spawnSync } from "node:child_process"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("@/lib/db/client", () => ({ sql: { query: vi.fn() } }))
vi.mock("@/lib/stripe", () => ({
  stripe: { subscriptions: { retrieve: vi.fn() }, invoices: { retrieve: vi.fn() } },
}))
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }))

import {
  createSuiteFounderPreflightReport,
  digestEvidence,
  normalizeSuiteFounderAcademyOwnership,
  type SuiteFounderAutomaticEvidence,
  type SuiteFounderHumanEvidencePacket,
} from "@/lib/integrations/suite-founder-preflight"
import {
  createSuiteFounderPreflightFromCurrentSources,
  type SuiteFounderPreflightDependencies,
} from "@/lib/integrations/suite-founder-preflight-report"
import { projectAcademyProductRegistry } from "@/lib/academy-entitlements"
import { resolveSuiteProviderPilotConfig } from "@/lib/integrations/suite-provider-pilot"

const NOW = new Date("2026-08-21T12:00:00.000Z")
const PERIOD_START = 1787227200
const PERIOD_END = 1789905600
const ENV = {
  FEATURE_SUITE_PROVIDER_PILOT_SHADOW_ENABLED: "true",
  SUITE_PROVIDER_PILOT_MODE: "founder_only",
  SUITE_PROVIDER_PILOT_USER_IDS: "founder_opaque_1",
  SUITE_PROVIDER_PILOT_PROVIDER: "skool",
  SUITE_PROVIDER_PILOT_RESOURCE_ID: "community_sselfie",
  ADMIN_EMAIL: "founder@example.invalid",
  STRIPE_SSELFIE_STUDIO_MEMBERSHIP_PRICE_ID: "price_suite_monthly",
}
const HASH = `sha256:${"a".repeat(64)}`
const PACKET: SuiteFounderHumanEvidencePacket = {
  version: 1,
  provider: "skool",
  resourceId: "community_sselfie",
  founderUserId: "founder_opaque_1",
  providerIdentityArtifactDigest: HASH,
  providerTermsArtifactDigest: HASH,
  providerPrivacyArtifactDigest: HASH,
  providerRemovalArtifactDigest: HASH,
  dataCategories: ["email_address"],
  consent: {
    artifactDigest: HASH,
    capturedAt: "2026-08-21T10:00:00.000Z",
    expiresAt: "2026-08-22T10:00:00.000Z",
    withdrawnAt: null,
    checkAt: NOW.toISOString(),
  },
  providerCapability: {
    artifactDigest: HASH,
    verifiedAt: "2026-08-21T10:00:00.000Z",
    expiresAt: "2026-08-22T10:00:00.000Z",
    identityMethod: "manual_verified_email_match",
    deliveryMethod: "manual_invite",
    inviteSupported: true,
    observedStatusMethod: "manual_provider_dashboard",
    pendingInviteRevokeSupported: true,
    activeMemberRemovalSupported: true,
    replayPolicy: "manual_single_attempt",
    statusReadSupported: true,
    absenceConfirmationSupported: true,
    credentialMode: "attended_provider_session",
    rateLimitPolicy: "single_manual_action",
    killSwitch: "no_dispatch_without_new_approval",
  },
  rollback: { owner: "sandra", method: "manual_provider_removal", slaHours: 24 },
}

function evidence(
  overrides: Partial<SuiteFounderAutomaticEvidence> = {}
): SuiteFounderAutomaticEvidence {
  return {
    core: {
      state: "available",
      value: {
        configuredUserCount: 1,
        founderIdentityUserCount: 1,
        founderIdentityMatchesConfiguredUser: true,
        userId: "founder_opaque_1",
        userEmailDigest: digestEvidence("founder@example.invalid"),
        authUserId: "auth_opaque_1",
        passwordSetupComplete: false,
        subscriptionCount: 1,
        subscriptionIdDigest: digestEvidence("sub_private_1"),
        subscriptionIdPrivate: "sub_private_1",
        stripeCustomerIdPrivate: "cus_private_1",
        planId: "monthly",
        status: "active",
        isTestMode: false,
        currentPeriodStartEpoch: PERIOD_START,
        currentPeriodEndEpoch: PERIOD_END,
        paymentCount: 1,
        paymentAmountCents: 2900,
        paymentCurrency: "eur",
        paymentSubscriptionIdPrivate: "sub_private_1",
        paymentInvoiceIdPrivate: "in_private_1",
      },
    },
    stripe: {
      state: "available",
      value: {
        subscriptionIdDigest: digestEvidence("sub_private_1"),
        livemode: true,
        status: "active",
        customerMatches: true,
        priceConfigured: true,
        metadataMatches: true,
        cancelAtPeriodEnd: false,
        cancelAt: null,
        canceledAt: null,
        endedAt: null,
        pauseCollection: false,
        currentPeriodStartEpoch: PERIOD_START,
        currentPeriodEndEpoch: PERIOD_END,
        latestInvoiceAssociationMatches: true,
        invoiceStatus: "paid",
        invoicePaidAt: PERIOD_START,
        amountPaid: 2900,
        amountRemaining: 0,
        collectionMethod: "charge_automatically",
      },
    },
    auth: {
      state: "available",
      value: {
        userExists: true,
        authIdMatches: true,
        emailMatches: true,
        confirmed: true,
        banned: false,
        passwordState: "recovery_required",
      },
    },
    credits: {
      state: "available",
      value: { walletRows: 1, walletBalance: 20, totalPurchased: 2, totalUsed: 23, ledgerRows: 50 },
    },
    academyUserEntitlements: { state: "available", value: { productIds: [] } },
    academyCoursePurchases: { state: "available", value: { productIds: [] } },
    academyLegacySubscriptions: { state: "available", value: { productIds: [] } },
    academyStripePayments: { state: "available", value: { productIds: [] } },
    academyCatalog: {
      state: "available",
      value: {
        membershipProductIds: ["what_to_say", "show_up", "get_paid"],
      },
    },
    maya: {
      state: "available",
      value: {
        mayaChats: 0,
        mayaMessages: 0,
        mayaMemories: 0,
        mayaCompletedModels: 0,
        mayaBrandAssets: 0,
        mayaUploads: 0,
        mayaProducedAssets: 0,
        mayaBrandProfiles: 0,
        mayaOpenDrafts: 1,
      },
    },
    integrations: {
      state: "available",
      value: { externalAccounts: 0, provisioningStates: 0, outboxRows: 0 },
    },
    ...overrides,
  }
}

function queryFixture(): SuiteFounderPreflightDependencies["query"] {
  return vi.fn(async (query: string) => {
    if (query.includes("FROM user_entitlements")) return []
    if (query.includes("FROM academy_course_purchases")) return []
    if (query.includes("SELECT DISTINCT product_type AS product_id FROM subscriptions")) return []
    if (query.includes("SELECT DISTINCT product_type, metadata->>'product_id'")) return []
    if (query.includes("FROM academy_products"))
      return [
        { id: "what_to_say", active: true, membership_included: true },
        { id: "show_up", active: true, membership_included: true },
        { id: "get_paid", active: true, membership_included: true },
      ]
    if (query.includes("FROM users WHERE id"))
      return [
        {
          id: "founder_opaque_1",
          email: "founder@example.invalid",
          supabase_user_id: "auth_opaque_1",
          password_setup_complete: false,
        },
      ]
    if (query.includes("LOWER(email)")) return [{ id: "founder_opaque_1" }]
    if (query.includes("FROM subscriptions"))
      return [
        {
          stripe_subscription_id: "sub_private_1",
          stripe_customer_id: "cus_private_1",
          plan: "monthly",
          status: "active",
          is_test_mode: false,
          period_start_epoch: PERIOD_START,
          period_end_epoch: PERIOD_END,
        },
      ]
    if (query.includes("FROM stripe_payments"))
      return [
        {
          stripe_subscription_id: "sub_private_1",
          stripe_invoice_id: "in_private_1",
          amount_cents: 2900,
          currency: "eur",
        },
      ]
    if (query.includes("FROM user_credits"))
      return [
        { wallet_rows: 1, wallet_balance: 20, total_purchased: 2, total_used: 23, ledger_rows: 50 },
      ]
    if (query.includes("maya_chats"))
      return [
        {
          maya_chats: 0,
          maya_messages: 0,
          maya_memories: 0,
          maya_completed_models: 0,
          maya_brand_assets: 0,
          maya_uploads: 0,
          maya_produced_assets: 0,
          maya_brand_profiles: 0,
          maya_open_drafts: 1,
        },
      ]
    if (query.includes("external_accounts"))
      return [{ external_accounts: 0, provisioning_states: 0, outbox_rows: 0 }]
    throw new Error(`unexpected query ${query}`)
  })
}

function dependencies(): SuiteFounderPreflightDependencies {
  return {
    query: queryFixture(),
    retrieveSubscription: vi.fn(
      async () =>
        ({
          id: "sub_private_1",
          livemode: true,
          status: "active",
          customer: "cus_private_1",
          metadata: { product_type: "sselfie_studio_membership", plan: "monthly" },
          cancel_at_period_end: false,
          cancel_at: null,
          canceled_at: null,
          ended_at: null,
          pause_collection: null,
          items: {
            data: [
              {
                price: { id: "price_suite_monthly" },
                current_period_start: PERIOD_START,
                current_period_end: PERIOD_END,
              },
            ],
          },
          latest_invoice: {
            id: "in_private_1",
            livemode: true,
            status: "paid",
            paid: false,
            parent: { subscription_details: { subscription: "sub_private_1" } },
            status_transitions: { paid_at: PERIOD_START },
            amount_paid: 2900,
            amount_remaining: 0,
            collection_method: "charge_automatically",
          },
        }) as any
    ),
    retrieveInvoice: vi.fn(),
    getAuthUserById: vi.fn(async () => ({
      id: "auth_opaque_1",
      email: "founder@example.invalid",
      email_confirmed_at: "2026-01-01T00:00:00Z",
      banned_until: null,
    })),
  }
}

describe("SUITE founder preflight", () => {
  beforeEach(() => vi.clearAllMocks())

  it("does no DB, Stripe or Auth reads when disabled or not exact founder_only", async () => {
    const deps = dependencies()
    for (const env of [
      { ...ENV, FEATURE_SUITE_PROVIDER_PILOT_SHADOW_ENABLED: "false" },
      { ...ENV, SUITE_PROVIDER_PILOT_MODE: "cohort", SUITE_PROVIDER_PILOT_USER_IDS: "u1,u2,u3" },
    ]) {
      const report = await createSuiteFounderPreflightFromCurrentSources({
        env,
        humanEvidence: PACKET,
        observedAt: NOW,
        dependencies: deps,
      })
      expect(["disabled", "blocked"]).toContain(report.state)
    }
    expect(deps.query).not.toHaveBeenCalled()
    expect(deps.retrieveSubscription).not.toHaveBeenCalled()
    expect(deps.getAuthUserById).not.toHaveBeenCalled()
  })

  it("becomes ready only for exact automatic and human evidence while keeping every effect off", () => {
    const report = createSuiteFounderPreflightReport({
      config: resolveSuiteProviderPilotConfig(ENV),
      evidence: evidence(),
      humanEvidence: PACKET,
      observedAt: NOW,
    })
    expect(report).toMatchObject({
      state: "ready_for_sandra_approval",
      approvalState: "not_requested",
      proposal: null,
      externalEffectsAllowed: false,
      adapterEnablementAllowed: false,
      dispatchAllowed: false,
      passwordState: "recovery_required",
      blockers: [],
    })
    expect(report.approvalSummary).toMatchObject({
      artifactDigests: { providerCapability: HASH, consent: HASH },
      dataCategories: ["email_address"],
      providerCapability: {
        inviteSupported: true,
        absenceConfirmationSupported: true,
        replayPolicy: "manual_single_attempt",
      },
      rollback: { owner: "sandra", method: "manual_provider_removal", slaHours: 24 },
    })
    expect(JSON.stringify(report)).toContain('"approvalSummary"')
    expect(JSON.stringify(report)).not.toMatch(/sub_private|cus_private|in_private|founder@example/)
  })

  it("allows recovery_required but surfaces it, and ignores Clover invoice.paid boolean", async () => {
    const report = await createSuiteFounderPreflightFromCurrentSources({
      env: ENV,
      humanEvidence: PACKET,
      observedAt: NOW,
      dependencies: dependencies(),
    })
    expect(report.state).toBe("ready_for_sandra_approval")
    expect(report.passwordState).toBe("recovery_required")
  })

  it("accepts a paid current renewal invoice without conflating it with the initial payment", async () => {
    const deps = dependencies()
    const subscription = await deps.retrieveSubscription("fixture")
    ;(deps.retrieveSubscription as any).mockResolvedValue({
      ...subscription,
      latest_invoice: {
        ...(subscription.latest_invoice as object),
        id: "in_current_renewal",
      },
    })
    const report = await createSuiteFounderPreflightFromCurrentSources({
      env: ENV,
      humanEvidence: PACKET,
      observedAt: NOW,
      dependencies: deps,
    })
    expect(report.state).toBe("ready_for_sandra_approval")
  })

  it("uses observedAt for the Auth ban decision", async () => {
    const deps = dependencies()
    ;(deps.getAuthUserById as any).mockResolvedValue({
      id: "auth_opaque_1",
      email: "founder@example.invalid",
      email_confirmed_at: "2026-01-01T00:00:00Z",
      banned_until: "2026-08-21T10:00:00.000Z",
    })
    const report = await createSuiteFounderPreflightFromCurrentSources({
      env: ENV,
      humanEvidence: PACKET,
      observedAt: NOW,
      dependencies: deps,
    })
    expect(report.state).toBe("ready_for_sandra_approval")
  })

  it("preserves a runtime source failure as unavailable rather than zero", async () => {
    const deps = dependencies()
    const original = deps.query
    deps.query = vi.fn(async (query, params) => {
      if (query.includes("maya_chats")) throw new Error("relation unavailable")
      return original(query, params)
    })
    const report = await createSuiteFounderPreflightFromCurrentSources({
      env: ENV,
      humanEvidence: PACKET,
      observedAt: NOW,
      dependencies: deps,
    })
    expect(report.state).toBe("blocked")
    expect(report.blockers).toContain("maya_unavailable")
    expect(report.baselines).toBeNull()
  })

  it.each([
    ["FROM user_entitlements", "academyUserEntitlements_unavailable"],
    ["FROM academy_course_purchases", "academyCoursePurchases_unavailable"],
    [
      "SELECT DISTINCT product_type AS product_id FROM subscriptions",
      "academyLegacySubscriptions_unavailable",
    ],
    ["SELECT DISTINCT product_type, metadata->>'product_id'", "academyStripePayments_unavailable"],
    ["FROM academy_products", "academyCatalog_unavailable"],
  ])("fails closed when strict Academy source %s is unavailable", async (needle, blocker) => {
    const deps = dependencies()
    const original = deps.query
    deps.query = vi.fn(async (query, params) => {
      if (query.includes(needle)) throw new Error("source unavailable")
      return original(query, params)
    })
    const report = await createSuiteFounderPreflightFromCurrentSources({
      env: ENV,
      humanEvidence: PACKET,
      observedAt: NOW,
      dependencies: deps,
    })
    expect(report.state).toBe("blocked")
    expect(report.blockers).toContain(blocker)
    expect(report.baselines).toBeNull()
  })

  it("uses explicit UTC conversion for timestamp-without-time-zone periods", async () => {
    const deps = dependencies()
    await createSuiteFounderPreflightFromCurrentSources({
      env: ENV,
      humanEvidence: PACKET,
      observedAt: NOW,
      dependencies: deps,
    })
    const sql = (deps.query as any).mock.calls.map((call: unknown[]) => call[0]).join("\n")
    expect(sql).toContain("current_period_start AT TIME ZONE 'UTC'")
    expect(sql).toContain("current_period_end AT TIME ZONE 'UTC'")
    expect(sql).toContain("status = 'active'")
    expect(sql).toContain("source <> 'membership'")
    expect(sql).toContain("FROM maya_chat_messages m JOIN maya_chats c")
    expect(sql).toContain("training_status = 'completed'")
    expect(sql).not.toContain("FROM maya_messages")
    const integrationCall = (deps.query as any).mock.calls.find((call: unknown[]) =>
      String(call[0]).includes("external_accounts")
    )
    expect(integrationCall[1]).toEqual(["founder_opaque_1", "skool"])
    expect(String(integrationCall[0])).toContain("provider = $2")
  })

  it.each([
    ["core", { state: "unavailable", reason: "db" }],
    ["stripe", { state: "unavailable", reason: "stripe" }],
    ["auth", { state: "unavailable", reason: "auth" }],
    ["credits", { state: "unavailable", reason: "db" }],
    ["academyUserEntitlements", { state: "unavailable", reason: "db" }],
    ["academyCoursePurchases", { state: "unavailable", reason: "db" }],
    ["academyLegacySubscriptions", { state: "unavailable", reason: "db" }],
    ["academyStripePayments", { state: "unavailable", reason: "db" }],
    ["academyCatalog", { state: "unavailable", reason: "db" }],
    ["maya", { state: "unavailable", reason: "db" }],
    ["integrations", { state: "unavailable", reason: "db" }],
  ])("blocks when strict %s evidence is unavailable", (key, unavailable) => {
    const report = createSuiteFounderPreflightReport({
      config: resolveSuiteProviderPilotConfig(ENV),
      evidence: evidence({ [key]: unavailable }),
      humanEvidence: PACKET,
      observedAt: NOW,
    })
    expect(report.state).toBe("blocked")
    expect(report.blockers).toContain(`${key}_unavailable`)
  })

  it("blocks all local, Stripe, Auth and preexisting-state mismatches", () => {
    const broken = evidence()
    if (broken.core.state === "available") broken.core.value.planId = "maya_essential_pilot"
    if (broken.stripe.state === "available") {
      broken.stripe.value.cancelAtPeriodEnd = true
      broken.stripe.value.invoiceStatus = "open"
    }
    if (broken.auth.state === "available") broken.auth.value.emailMatches = false
    if (broken.integrations.state === "available") broken.integrations.value.outboxRows = 1
    const report = createSuiteFounderPreflightReport({
      config: resolveSuiteProviderPilotConfig(ENV),
      evidence: broken,
      humanEvidence: PACKET,
      observedAt: NOW,
    })
    expect(report.blockers).toEqual(
      expect.arrayContaining([
        "subscription_not_stable_full_suite",
        "stripe_subscription_scheduled_or_paused",
        "latest_invoice_not_confirmed_paid",
        "auth_identity_not_recoverable",
        "preexisting_integration_state",
      ])
    )
  })

  it("requires exact artifact digests and never treats the packet as approval", () => {
    const report = createSuiteFounderPreflightReport({
      config: resolveSuiteProviderPilotConfig(ENV),
      evidence: evidence(),
      humanEvidence: { ...PACKET, consent: { ...PACKET.consent, artifactDigest: "approved" } },
      observedAt: NOW,
    })
    expect(report.state).toBe("blocked")
    expect(report.approvalState).toBe("not_requested")
    expect(report.blockers).toContain("human_evidence_packet_invalid_or_missing")
  })

  it("requires real provider data categories and current unwithdrawn evidence", () => {
    for (const packet of [
      { ...PACKET, dataCategories: ["email_address", "provider_membership_status"] },
      { ...PACKET, dataCategories: 7 },
      { ...PACKET, consent: { ...PACKET.consent, withdrawnAt: "2026-08-21T11:00:00.000Z" } },
      {
        ...PACKET,
        providerCapability: { ...PACKET.providerCapability, expiresAt: NOW.toISOString() },
      },
    ]) {
      const report = createSuiteFounderPreflightReport({
        config: resolveSuiteProviderPilotConfig(ENV),
        evidence: evidence(),
        humanEvidence: packet,
        observedAt: NOW,
      })
      expect(report.state).toBe("blocked")
      expect(report.blockers).toContain("human_evidence_packet_invalid_or_missing")
    }
  })

  it.each([
    ["artifactDigest", "bad"],
    ["identityMethod", "api_email_lookup"],
    ["deliveryMethod", "automated_invite"],
    ["inviteSupported", false],
    ["observedStatusMethod", "webhook"],
    ["pendingInviteRevokeSupported", false],
    ["activeMemberRemovalSupported", false],
    ["replayPolicy", "retry"],
    ["statusReadSupported", false],
    ["absenceConfirmationSupported", false],
    ["credentialMode", "api_token"],
    ["rateLimitPolicy", "automatic"],
    ["killSwitch", "enabled"],
  ])("blocks a wrong provider capability %s", (field, value) => {
    const report = createSuiteFounderPreflightReport({
      config: resolveSuiteProviderPilotConfig(ENV),
      evidence: evidence(),
      humanEvidence: {
        ...PACKET,
        providerCapability: { ...PACKET.providerCapability, [field]: value },
      },
      observedAt: NOW,
    })
    expect(report.state).toBe("blocked")
    expect(report.approvalSummary).toBeNull()
  })

  it("blocks every missing provider capability field", () => {
    for (const field of Object.keys(PACKET.providerCapability)) {
      const providerCapability = { ...PACKET.providerCapability } as Record<string, unknown>
      delete providerCapability[field]
      const report = createSuiteFounderPreflightReport({
        config: resolveSuiteProviderPilotConfig(ENV),
        evidence: evidence(),
        humanEvidence: { ...PACKET, providerCapability },
        observedAt: NOW,
      })
      expect(report.state, field).toBe("blocked")
    }
  })

  it.each([
    ["future check", { consent: { ...PACKET.consent, checkAt: "2026-08-21T12:01:00.000Z" } }],
    ["stale check", { consent: { ...PACKET.consent, checkAt: "2026-08-21T11:54:59.000Z" } }],
    ["old consent", { consent: { ...PACKET.consent, capturedAt: "2026-08-20T11:59:59.000Z" } }],
    [
      "five-minute check with capture 24 hours before check",
      {
        consent: {
          ...PACKET.consent,
          checkAt: "2026-08-21T11:55:00.000Z",
          capturedAt: "2026-08-20T11:55:00.000Z",
          expiresAt: "2026-08-21T12:01:00.000Z",
        },
      },
    ],
    [
      "long consent validity",
      { consent: { ...PACKET.consent, expiresAt: "2026-08-22T10:00:01.000Z" } },
    ],
    [
      "old capability",
      {
        providerCapability: {
          ...PACKET.providerCapability,
          verifiedAt: "2026-08-20T11:59:59.000Z",
        },
      },
    ],
    [
      "long capability validity",
      {
        providerCapability: { ...PACKET.providerCapability, expiresAt: "2026-08-22T10:00:01.000Z" },
      },
    ],
  ])("blocks %s evidence", (_label, override) => {
    const report = createSuiteFounderPreflightReport({
      config: resolveSuiteProviderPilotConfig(ENV),
      evidence: evidence(),
      humanEvidence: { ...PACKET, ...override },
      observedAt: NOW,
    })
    expect(report.state).toBe("blocked")
  })

  it("projects historical, Stripe-only and alias-expanded Academy ownership", () => {
    const historical = evidence({
      academyLegacySubscriptions: {
        state: "available",
        value: { productIds: ["visibility_suite"] },
      },
    })
    const historicalReport = createSuiteFounderPreflightReport({
      config: resolveSuiteProviderPilotConfig(ENV),
      evidence: historical,
      humanEvidence: PACKET,
      observedAt: NOW,
    })
    expect(historicalReport.baselines).toMatchObject({
      academyLegacySubscriptionProducts: 1,
      academyAccessibleProducts: 8,
    })
    expect(historicalReport.academyAccessSummary).toMatchObject({
      directProductCount: 1,
      expandedProductCount: 8,
      accessibleProductCount: 8,
      membershipActive: true,
    })

    const stripeOnly = evidence({
      academyStripePayments: { state: "available", value: { productIds: ["prompt_vault"] } },
    })
    expect(
      createSuiteFounderPreflightReport({
        config: resolveSuiteProviderPilotConfig(ENV),
        evidence: stripeOnly,
        humanEvidence: PACKET,
        observedAt: NOW,
      }).baselines
    ).toMatchObject({ academyStripePaymentProducts: 1, academyAccessibleProducts: 4 })

    const alias = evidence({
      academyCoursePurchases: {
        state: "available",
        value: { productIds: ["selfie_visibility_bundle"] },
      },
    })
    expect(
      createSuiteFounderPreflightReport({
        config: resolveSuiteProviderPilotConfig(ENV),
        evidence: alias,
        humanEvidence: PACKET,
        observedAt: NOW,
      }).academyAccessSummary
    ).toMatchObject({ directProductCount: 1, expandedProductCount: 7, accessibleProductCount: 10 })
  })

  it("normalizes strict historical and Stripe-only source rows from current SQL", async () => {
    const deps = dependencies()
    const original = deps.query
    deps.query = vi.fn(async (query, params) => {
      if (query.includes("SELECT DISTINCT product_type AS product_id FROM subscriptions"))
        return [{ product_id: "visibility_suite" }, { product_id: "vault_maya" }]
      if (query.includes("SELECT DISTINCT product_type, metadata->>'product_id'"))
        return [
          { product_type: "academy_mini_product", metadata_product_id: "prompt_vault" },
          { product_type: "academy_mini_product", metadata_product_id: "unknown" },
        ]
      return original(query, params)
    })
    const report = await createSuiteFounderPreflightFromCurrentSources({
      env: ENV,
      humanEvidence: PACKET,
      observedAt: NOW,
      dependencies: deps,
    })
    expect(report.state).toBe("ready_for_sandra_approval")
    expect(report.baselines).toMatchObject({
      academyLegacySubscriptionProducts: 1,
      academyStripePaymentProducts: 1,
      academyAccessibleProducts: 20,
    })
  })

  it("uses exact Academy default plus DB merge parity for empty and partial registries", () => {
    const emptyMembership = projectAcademyProductRegistry([])
      .filter(product => product.active && product.membershipIncluded)
      .map(product => product.id)
      .sort()
    expect(emptyMembership).toEqual([
      "ai_photo_prompts",
      "ai_photo_refresh",
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
      "selfie_ai_photos_kit",
      "selfie_guide",
      "selfie_guide_bundle",
      "selfie_to_brand_shoot_system",
      "show_up",
      "starter_kit",
      "visibility_suite",
      "what_to_say",
    ])
    const partial = projectAcademyProductRegistry([
      {
        id: "what_to_say",
        slug: "what-to-say",
        title: "What To Say",
        type: "course",
        membership_included: false,
        purchasable: false,
        stripe_price_id: null,
        active: true,
        sort_order: 10,
        delivery_kind: "academy_course",
        access_target: "what_to_say",
      },
    ])
    const partialMembership = partial
      .filter(product => product.active && product.membershipIncluded)
      .map(product => product.id)
    expect(partialMembership).not.toContain("what_to_say")
    expect(partialMembership).toHaveLength(emptyMembership.length - 1)
  })

  it.each([
    ["empty", [], 20],
    [
      "partial authoritative exclusion",
      [
        {
          id: "what_to_say",
          slug: "what-to-say",
          title: "What To Say",
          type: "course",
          membership_included: false,
          purchasable: false,
          stripe_price_id: null,
          active: true,
          sort_order: 10,
          delivery_kind: "academy_course",
          access_target: "what_to_say",
        },
      ],
      19,
    ],
  ])(
    "applies %s Academy DB evidence through the canonical projection",
    async (_label, rows, expected) => {
      const deps = dependencies()
      const original = deps.query
      deps.query = vi.fn(async (query, params) =>
        query.includes("FROM academy_products") ? rows : original(query, params)
      )
      const report = await createSuiteFounderPreflightFromCurrentSources({
        env: ENV,
        humanEvidence: PACKET,
        observedAt: NOW,
        dependencies: deps,
      })
      expect(report.state).toBe("ready_for_sandra_approval")
      expect(report.baselines?.academyMembershipCatalogProducts).toBe(expected)
      expect(report.academyAccessSummary?.accessibleProductCount).toBe(expected)
    }
  )

  it("filters unknown Academy IDs, membership containers, and adversarial purchased-product metadata", () => {
    expect(
      normalizeSuiteFounderAcademyOwnership({
        source: "legacy_subscription",
        productId: "arbitrary_product",
      })
    ).toBeNull()
    expect(
      normalizeSuiteFounderAcademyOwnership({
        source: "legacy_subscription",
        productId: "sselfie_studio_membership",
      })
    ).toBeNull()
    expect(
      normalizeSuiteFounderAcademyOwnership({
        source: "stripe_payment",
        productId: "academy_mini_product",
        purchasedProductId: "unknown",
      })
    ).toBeNull()
    expect(
      normalizeSuiteFounderAcademyOwnership({
        source: "user_entitlement",
        productId: "prompt_vault",
        purchasedProductId: "visibility_suite",
      })
    ).toBe("prompt_vault")
    expect(
      normalizeSuiteFounderAcademyOwnership({
        source: "user_entitlement",
        productId: "what_to_say",
        purchasedProductId: "visibility_suite",
      })
    ).toBe("visibility_suite")
  })

  it("changes the packet digest for any baseline or human evidence change", () => {
    const first = createSuiteFounderPreflightReport({
      config: resolveSuiteProviderPilotConfig(ENV),
      evidence: evidence(),
      humanEvidence: PACKET,
      observedAt: NOW,
    })
    const changedEvidence = evidence()
    if (changedEvidence.maya.state === "available") changedEvidence.maya.value.mayaOpenDrafts++
    const second = createSuiteFounderPreflightReport({
      config: resolveSuiteProviderPilotConfig(ENV),
      evidence: changedEvidence,
      humanEvidence: PACKET,
      observedAt: NOW,
    })
    const third = createSuiteFounderPreflightReport({
      config: resolveSuiteProviderPilotConfig(ENV),
      evidence: evidence(),
      humanEvidence: { ...PACKET, rollback: { ...PACKET.rollback, slaHours: 25 } },
      observedAt: NOW,
    })
    expect(new Set([first.evidenceDigest, second.evidenceDigest, third.evidenceDigest]).size).toBe(
      3
    )
  })

  it("contains only SELECT evidence and no runtime/control-plane/customer effects", () => {
    const reportSource = fs.readFileSync(
      "lib/integrations/suite-founder-preflight-report.ts",
      "utf8"
    )
    const cliSource = fs.readFileSync("scripts/report-suite-founder-preflight.ts", "utf8")
    expect(reportSource).not.toMatch(/\b(?:INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\b/i)
    expect(reportSource).not.toMatch(
      /recordControlPlaneIntent|claimIntegrationWork|sendEmail|fetch\s*\(/
    )
    expect(cliSource).not.toMatch(/--record|writeFile|providerReference|external_account_id/)
  })

  it("starts through the attended package command and exits nonzero unless ready", () => {
    const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"))
    expect(packageJson.scripts["suite:founder-preflight"]).toBe(
      "node --conditions=react-server --import tsx scripts/report-suite-founder-preflight.ts"
    )
    const result = spawnSync("pnpm", ["suite:founder-preflight"], {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        ...process.env,
        FEATURE_SUITE_PROVIDER_PILOT_SHADOW_ENABLED: "false",
      },
    })
    expect(result.status).toBe(1)
    expect(result.stdout).toContain('"state": "disabled"')
    expect(result.stderr).not.toMatch(/server-only|Client Component/)
  })
})
