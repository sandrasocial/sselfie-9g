// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => {
  const sql = vi.fn() as any
  const transaction = vi.fn() as any
  sql.transaction = transaction
  return { sql, transaction }
})

vi.mock("@/lib/db/client", () => ({ sql: mocks.sql }))

import { upsertStudioMembershipSubscription } from "@/lib/payments/lifecycle/upsert-studio-membership"

const baseMembership = {
  userId: "user_suite_1",
  productType: "sselfie_studio_membership" as const,
  plan: "monthly",
  status: "active",
  stripeSubscriptionId: "sub_suite_1",
  stripeCustomerId: "cus_suite_1",
  periodStart: 1_787_000_000,
  periodEnd: 1_789_592_000,
  isTestMode: false,
}

const shadowStart = {
  checkoutSessionId: "cs_suite_1",
  occurredAt: new Date("2026-08-21T10:00:00.000Z"),
}

function render(strings: TemplateStringsArray): string {
  return Array.from(strings).join(" ? ").replace(/\s+/g, " ").trim()
}

describe("SUITE membership-start shadow persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.sql.transaction = mocks.transaction
    mocks.sql.mockResolvedValue([{ id: "membership_1" }])
  })

  it("preserves the existing one-statement behavior when no shadow fact is requested", async () => {
    await upsertStudioMembershipSubscription(baseMembership)

    expect(mocks.sql).toHaveBeenCalledTimes(1)
    expect(mocks.transaction).not.toHaveBeenCalled()
    const sql = render(mocks.sql.mock.calls[0][0])
    expect(sql).toContain("pg_advisory_xact_lock")
    expect(sql).toContain("UPDATE subscriptions")
    expect(sql).not.toContain("business_events")
  })

  it("locks first, then atomically stores the exact membership and immutable event-only fact", async () => {
    const statements: string[] = []
    const values: unknown[][] = []
    mocks.transaction.mockImplementation((factory: (tx: any) => unknown[]) => {
      const queries = factory((strings: TemplateStringsArray, ...params: unknown[]) => {
        statements.push(render(strings))
        values.push(params)
        return { strings, params }
      })
      expect(queries).toHaveLength(2)
      return Promise.resolve([[], [{ membership_id: "membership_1", event_id: "event_1" }]])
    })

    await upsertStudioMembershipSubscription({
      ...baseMembership,
      shadowMembershipStarted: shadowStart,
    })

    expect(statements[0]).toContain("pg_advisory_xact_lock")
    expect(statements[0]).not.toContain("INSERT INTO business_events")
    expect(statements[1]).toContain("INSERT INTO business_events")
    expect(statements[1]).toContain("UPDATE subscriptions")
    expect(statements[1]).toContain("FROM event_fact")
    expect(statements[1]).toContain("ON CONFLICT (idempotency_key) DO UPDATE")
    expect(statements[1]).toContain("ELSE NULL")
    expect(statements[1]).not.toMatch(/integration_outbox|external_provisioning_states/i)

    const allValues = JSON.stringify(values.flat())
    expect(allValues).toContain("suite.membership_started.v1:sub_suite_1")
    expect(allValues).toContain("stripe_subscription")
    expect(allValues).toContain("sselfie_studio_membership")
    expect(allValues).toContain("cs_suite_1")
    expect(allValues).toContain("monthly")
    expect(allValues).toContain("2026-08-21T10:00:00.000Z")
    const attributes = JSON.parse(
      values
        .flat()
        .find(value =>
          String(value).includes('"membership_id":"sselfie_studio_membership"')
        ) as string
    )
    expect(attributes.effective_at).toBe("2026-08-21T10:00:00.000Z")
  })

  it("treats an immutable conflict as a retryable failure with no post-commit fallback", async () => {
    mocks.transaction.mockResolvedValue([[], []])

    await expect(
      upsertStudioMembershipSubscription({
        ...baseMembership,
        shadowMembershipStarted: shadowStart,
      })
    ).rejects.toThrow(/membership start/i)

    expect(mocks.sql).not.toHaveBeenCalled()
  })

  it("propagates transaction failure so neither side can be acknowledged independently", async () => {
    mocks.transaction.mockRejectedValue(new Error("subscription constraint failed"))

    await expect(
      upsertStudioMembershipSubscription({
        ...baseMembership,
        shadowMembershipStarted: shadowStart,
      })
    ).rejects.toThrow("subscription constraint failed")
  })

  it("uses one identical business key under concurrent exact replay", async () => {
    const observedValues: unknown[][] = []
    mocks.transaction.mockImplementation((factory: (tx: any) => unknown[]) => {
      factory((strings: TemplateStringsArray, ...values: unknown[]) => {
        observedValues.push(values)
        return { strings, values }
      })
      return Promise.resolve([[], [{ membership_id: "membership_1", event_id: "event_1" }]])
    })

    await Promise.all([
      upsertStudioMembershipSubscription({
        ...baseMembership,
        shadowMembershipStarted: shadowStart,
      }),
      upsertStudioMembershipSubscription({
        ...baseMembership,
        shadowMembershipStarted: shadowStart,
      }),
    ])

    const keys = observedValues
      .flat()
      .filter(value => value === "suite.membership_started.v1:sub_suite_1")
    expect(keys).toHaveLength(2)
  })

  it.each([
    [{ ...baseMembership, productType: "vault_maya" as const }, /SUITE/i],
    [{ ...baseMembership, isTestMode: true }, /live/i],
  ])("rejects ineligible shadow input before opening a transaction", async (membership, error) => {
    await expect(
      upsertStudioMembershipSubscription({
        ...membership,
        shadowMembershipStarted: shadowStart,
      })
    ).rejects.toThrow(error)
    expect(mocks.transaction).not.toHaveBeenCalled()
  })
})
