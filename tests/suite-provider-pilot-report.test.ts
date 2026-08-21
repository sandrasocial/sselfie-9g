// @vitest-environment node

import fs from "node:fs"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const mocks = vi.hoisted(() => ({ sql: vi.fn() as any }))
vi.mock("@/lib/db/client", () => ({ sql: mocks.sql }))

import {
  createSuiteProviderPilotReport,
  projectSuiteProviderPilotCandidates,
  resolveSuiteProviderPilotConfig,
  serializeSuiteProviderPilotReport,
  type SuiteProviderPilotEvidence,
} from "@/lib/integrations/suite-provider-pilot"
import { readSuiteProviderPilotEvidence } from "@/lib/integrations/suite-provider-pilot-report"

const NOW = new Date("2026-08-21T12:00:00.000Z")
const READY_ENV = {
  FEATURE_SUITE_PROVIDER_PILOT_SHADOW_ENABLED: "true",
  SUITE_PROVIDER_PILOT_USER_IDS: "user_1,user_2,user_3",
  SUITE_PROVIDER_PILOT_PROVIDER: "skool",
  SUITE_PROVIDER_PILOT_RESOURCE_ID: "community_sselfie",
}

function compatibleEvent(userId: string, subscriptionId: string) {
  return {
    eventId: `event_${userId}`,
    eventType: "membership_started",
    aggregateType: "stripe_subscription",
    aggregateId: subscriptionId,
    subjectType: "membership",
    subjectId: "sselfie_studio_membership",
    userId,
    sourceProvider: "stripe",
    sourceEventId: `cs_${userId}`,
    idempotencyKey: `suite.membership_started.v1:${subscriptionId}`,
    occurredAt: "2026-08-20T10:00:00.000Z",
    attributes: {
      membership_id: "sselfie_studio_membership",
      plan_id: "monthly",
      effective_at: "2026-08-20T10:00:00.000Z",
    },
  }
}

function initialPayment(userId: string, subscriptionId: string) {
  return {
    userId,
    subscriptionId,
    invoiceId: `in_${userId}`,
    amountCents: 2900,
    currency: "eur",
    productType: "sselfie_studio_membership",
    paymentType: "subscription",
    status: "succeeded",
    isTestMode: false,
    billingReason: "subscription_create",
  }
}

function availableEvidence(
  overrides: Partial<SuiteProviderPilotEvidence> = {}
): SuiteProviderPilotEvidence {
  const subscriptions = ["user_1", "user_2", "user_3"].map((userId, index) => ({
    subscriptionId: `sub_${index + 1}`,
    userId,
    productType: "sselfie_studio_membership",
    planId: "monthly",
    status: "active",
    currentPeriodEnd: "2026-09-21T12:00:00.000Z",
    isTestMode: false,
  }))
  return {
    state: "available",
    subscriptions,
    events: subscriptions.map(row => compatibleEvent(row.userId, row.subscriptionId)),
    positiveInitialPayments: subscriptions.map(row =>
      initialPayment(row.userId, row.subscriptionId)
    ),
    preexistingExternalUserIds: [],
    ...overrides,
  }
}

describe("SUITE provider pilot dark projection", () => {
  beforeEach(() => vi.clearAllMocks())

  it("is disabled unless the feature flag is exact true", () => {
    for (const value of [undefined, "false", "TRUE", "1", "on"]) {
      expect(
        resolveSuiteProviderPilotConfig({
          ...READY_ENV,
          FEATURE_SUITE_PROVIDER_PILOT_SHADOW_ENABLED: value,
        }).state
      ).toBe("disabled")
    }
  })

  it.each([
    ["user_1,user_2", "invalid_user_count"],
    ["user_1,user_2,user_3,user_4,user_5,user_6", "invalid_user_count"],
    ["user_1,user_2,user_2", "duplicate_user_id"],
    ["user_1,user_2,buyer@example.com", "invalid_user_id"],
    ["user_1,user_2,user 3", "invalid_user_id"],
  ])("fails closed for an invalid allowlist", (value, reason) => {
    expect(
      resolveSuiteProviderPilotConfig({ ...READY_ENV, SUITE_PROVIDER_PILOT_USER_IDS: value })
    ).toEqual({ state: "invalid", reason })
  })

  it("requires an exact provider and opaque resource id", () => {
    expect(
      resolveSuiteProviderPilotConfig({ ...READY_ENV, SUITE_PROVIDER_PILOT_PROVIDER: "studio" })
    ).toEqual({ state: "invalid", reason: "invalid_provider" })
    expect(
      resolveSuiteProviderPilotConfig({
        ...READY_ENV,
        SUITE_PROVIDER_PILOT_PROVIDER: "studio_platform_partner",
      })
    ).toMatchObject({ state: "ready", provider: "studio_platform_partner" })
    expect(
      resolveSuiteProviderPilotConfig({ ...READY_ENV, SUITE_PROVIDER_PILOT_RESOURCE_ID: "" })
    ).toEqual({ state: "invalid", reason: "invalid_resource_id" })
  })

  it("discovers only exact compatible stable paid memberships pending required live checks", () => {
    const config = resolveSuiteProviderPilotConfig(READY_ENV)
    const report = createSuiteProviderPilotReport(config, availableEvidence(), NOW)

    expect(report.status).toBe("ok")
    expect(report.mode).toBe("shadow")
    expect(report).toMatchObject({
      providerContractState: "unverified",
      externalEffectsAllowed: false,
      requiredLiveChecks: [
        "stripe_cancel_at_period_end_false",
        "member_consent_confirmed",
        "provider_identity_confirmed",
      ],
    })
    expect(report.rows.map(row => [row.userId, row.state])).toEqual([
      ["user_1", "candidate_pending_live_verification"],
      ["user_2", "candidate_pending_live_verification"],
      ["user_3", "candidate_pending_live_verification"],
    ])
    expect(report.rows[0].proposal).toBeNull()
    expect(report.rows[0].evidenceOrigin).toBe("compatible_shadow_event")
    expect(report.rows[0].initialPaymentInvoiceId).toBe("in_user_1")
    expect(serializeSuiteProviderPilotReport(report)).toBe(
      serializeSuiteProviderPilotReport(
        createSuiteProviderPilotReport(config, availableEvidence(), NOW)
      )
    )
  })

  it("accepts one exact live positive initial payment as a separately labeled origin", () => {
    const evidence = availableEvidence({
      events: [],
      positiveInitialPayments: [
        {
          userId: "user_1",
          subscriptionId: "sub_1",
          invoiceId: "in_initial_1",
          amountCents: 2900,
          currency: "eur",
          productType: "sselfie_studio_membership",
          paymentType: "subscription",
          status: "succeeded",
          isTestMode: false,
          billingReason: "subscription_create",
        },
      ],
    })
    const rows = projectSuiteProviderPilotCandidates(
      resolveSuiteProviderPilotConfig(READY_ENV),
      evidence,
      NOW
    )

    expect(rows[0]).toMatchObject({
      state: "candidate_pending_live_verification",
      evidenceOrigin: "positive_initial_payment",
      initialPaymentInvoiceId: "in_initial_1",
      proposal: null,
    })
    expect(rows[1].state).toBe("missing_positive_initial_payment")
  })

  it("blocks ambiguous positive initial payment evidence instead of selecting one", () => {
    const evidence = availableEvidence({
      events: [],
      positiveInitialPayments: [
        {
          userId: "user_1",
          subscriptionId: "sub_1",
          invoiceId: "in_initial_1",
          amountCents: 2900,
          currency: "eur",
          productType: "sselfie_studio_membership",
          paymentType: "subscription",
          status: "succeeded",
          isTestMode: false,
          billingReason: "subscription_create",
        },
        {
          userId: "user_1",
          subscriptionId: "sub_1",
          invoiceId: "in_initial_2",
          amountCents: 2900,
          currency: "eur",
          productType: "sselfie_studio_membership",
          paymentType: "subscription",
          status: "paid",
          isTestMode: false,
          billingReason: "subscription_create",
        },
      ],
    })

    expect(
      projectSuiteProviderPilotCandidates(
        resolveSuiteProviderPilotConfig(READY_ENV),
        evidence,
        NOW
      )[0]
    ).toMatchObject({
      state: "ambiguous_positive_initial_payment",
      evidenceOrigin: null,
      proposal: null,
    })
  })

  it("never promotes zero-value, test, or non-initial payment evidence", () => {
    const base = {
      userId: "user_1",
      subscriptionId: "sub_1",
      invoiceId: "in_invalid",
      amountCents: 2900,
      currency: "eur",
      productType: "sselfie_studio_membership",
      paymentType: "subscription",
      status: "succeeded",
      isTestMode: false,
      billingReason: "subscription_create",
    }
    for (const change of [
      { amountCents: 0 },
      { isTestMode: true },
      { status: "pending" },
      { billingReason: "subscription_cycle" },
      { productType: "vault_maya" },
    ]) {
      const evidence = availableEvidence({
        events: [],
        positiveInitialPayments: [{ ...base, ...change }],
      })
      expect(
        projectSuiteProviderPilotCandidates(
          resolveSuiteProviderPilotConfig(READY_ENV),
          evidence,
          NOW
        )[0].state
      ).toBe("missing_positive_initial_payment")
    }
  })

  it.each([
    [{ status: "trialing" }, "unstable_access"],
    [{ status: "past_due" }, "unstable_access"],
    [{ status: "canceled" }, "unstable_access"],
    [{ status: "unpaid" }, "unstable_access"],
    [{ status: "active", currentPeriodEnd: "2026-08-21T11:59:59.000Z" }, "unstable_access"],
    [{ status: "active", isTestMode: true }, "unstable_access"],
    [{ status: "active", planId: "maya_essential_pilot" }, "unstable_access"],
  ])("blocks unstable, grace, terminal, canceled, expired, and test access", (change, state) => {
    const evidence = availableEvidence()
    evidence.subscriptions[0] = { ...evidence.subscriptions[0], ...change }
    const rows = projectSuiteProviderPilotCandidates(
      resolveSuiteProviderPilotConfig(READY_ENV),
      evidence,
      NOW
    )
    expect(rows[0].state).toBe(state)
    expect(rows[0].proposal).toBeNull()
  })

  it("blocks missing, duplicate, conflicting, and preexisting external evidence", () => {
    const config = resolveSuiteProviderPilotConfig(READY_ENV)
    const evidence = availableEvidence()
    evidence.subscriptions = [
      ...evidence.subscriptions.filter(row => row.userId !== "user_1"),
      { ...evidence.subscriptions[1], userId: "user_2", subscriptionId: "sub_2_duplicate" },
    ]
    evidence.events = evidence.events.map(event =>
      event.userId === "user_3" ? { ...event, subjectId: "wrong_membership" } : event
    )
    evidence.preexistingExternalUserIds = ["user_3"]

    expect(
      projectSuiteProviderPilotCandidates(config, evidence, NOW).map(row => row.state)
    ).toEqual(["missing_exact_subscription", "duplicate_exact_subscription", "immutable_conflict"])

    const clean = availableEvidence({ preexistingExternalUserIds: ["user_1"] })
    expect(projectSuiteProviderPilotCandidates(config, clean, NOW)[0].state).toBe(
      "preexisting_external_state"
    )
  })

  it("never lets a compatible event replace missing money proof", () => {
    const config = resolveSuiteProviderPilotConfig(READY_ENV)
    const missing = availableEvidence({ positiveInitialPayments: [] })
    expect(projectSuiteProviderPilotCandidates(config, missing, NOW)[0]).toMatchObject({
      state: "missing_positive_initial_payment",
      evidenceOrigin: null,
      proposal: null,
    })
  })

  it("labels payment-only historical evidence while keeping the candidate pending", () => {
    const rows = projectSuiteProviderPilotCandidates(
      resolveSuiteProviderPilotConfig(READY_ENV),
      availableEvidence({ events: [] }),
      NOW
    )
    expect(rows[0]).toMatchObject({
      state: "candidate_pending_live_verification",
      evidenceOrigin: "positive_initial_payment",
      proposal: null,
    })
  })

  it("fails explicitly on source failure", () => {
    const config = resolveSuiteProviderPilotConfig(READY_ENV)

    const failure = createSuiteProviderPilotReport(
      config,
      { state: "unavailable", reason: "database unavailable" },
      NOW
    )
    expect(failure).toMatchObject({
      status: "failure",
      mode: "shadow",
      error: "database_unavailable",
      rows: [],
    })
    expect(Object.values(failure.summary).every(count => count === 0)).toBe(true)
  })

  it("does not query the database when disabled or invalid", async () => {
    await expect(
      readSuiteProviderPilotEvidence(resolveSuiteProviderPilotConfig({}))
    ).resolves.toEqual({
      state: "not_requested",
    })
    await expect(
      readSuiteProviderPilotEvidence(
        resolveSuiteProviderPilotConfig({
          ...READY_ENV,
          SUITE_PROVIDER_PILOT_PROVIDER: "studio",
        })
      )
    ).resolves.toEqual({ state: "not_requested" })
    expect(mocks.sql).not.toHaveBeenCalled()
  })

  it("fails the whole evidence snapshot when any SELECT source is unavailable", async () => {
    mocks.sql.mockRejectedValue(new Error("source unavailable"))
    await expect(
      readSuiteProviderPilotEvidence(resolveSuiteProviderPilotConfig(READY_ENV))
    ).resolves.toEqual({ state: "unavailable", reason: "database unavailable" })
    expect(mocks.sql).toHaveBeenCalledTimes(4)
  })

  it("returns an operator-safe configuration reason without echoing config values", () => {
    const report = createSuiteProviderPilotReport(
      resolveSuiteProviderPilotConfig({
        ...READY_ENV,
        SUITE_PROVIDER_PILOT_USER_IDS: "user_1,user_2",
      }),
      { state: "not_requested" },
      NOW
    )
    expect(report).toMatchObject({
      status: "failure",
      mode: "blocked",
      error: "configuration_invalid",
      configurationReason: "invalid_user_count",
      allowlistSize: 0,
    })
    expect(JSON.stringify(report)).not.toContain("user_1")
  })

  it("keeps the reader and CLI SELECT-only, PII-free, and disconnected from all effects", () => {
    const paths = [
      "lib/integrations/suite-provider-pilot.ts",
      "lib/integrations/suite-provider-pilot-report.ts",
      "scripts/report-suite-provider-pilot.ts",
    ]
    const source = paths.map(path => fs.readFileSync(path, "utf8")).join("\n")
    const readerSource = fs.readFileSync("lib/integrations/suite-provider-pilot-report.ts", "utf8")
    expect(source).toContain("SELECT")
    expect(source).not.toMatch(/\b(?:INSERT|UPDATE|DELETE|ALTER|DROP|TRUNCATE)\b/i)
    expect(source).not.toMatch(
      /recordControlPlaneIntent|claimIntegrationWork|completeIntegrationWork|failIntegrationWork/
    )
    expect(source).not.toMatch(/assertDesiredProvisioningInput|assertIntegrationOutboxInput/)
    expect(source).not.toMatch(/@\/lib\/(?:stripe|email|supabase)|fetch\s*\(|axios|resend/i)
    expect(source).not.toMatch(/customer_email|\bemail\b|\bname\b|\bphone\b/i)
    expect(source).not.toMatch(/app\/api|route\.ts|worker|cron/i)
    expect(readerSource).not.toContain("cancel_at_period_end")
    expect(source).toContain("metadata->>'billing_reason' = 'subscription_create'")
    expect(source).toContain("amount_cents > 0")
    expect(source).toContain("status IN ('paid', 'succeeded')")
  })
})
