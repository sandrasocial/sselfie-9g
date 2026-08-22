// @vitest-environment node

import { readFileSync } from "node:fs"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { hasSubscriptionAccess } from "@/lib/membership-access-policy"

const mocks = vi.hoisted(() => ({ sql: vi.fn() }))
vi.mock("@/lib/db/client", () => ({ sql: mocks.sql }))

const futurePeriodEnd = "2099-01-01T00:00:00.000Z"
const pastPeriodEnd = "2020-01-01T00:00:00.000Z"

describe("shared membership access policy", () => {
  it.each(["active", "trialing"])("allows Stripe %s membership status", status => {
    expect(hasSubscriptionAccess({ status, current_period_end: pastPeriodEnd })).toBe(true)
  })

  it("keeps an active cancel-at-period-end subscription accessible", () => {
    expect(
      hasSubscriptionAccess({
        status: "active",
        cancel_at_period_end: true,
        current_period_end: futurePeriodEnd,
      })
    ).toBe(true)
  })

  it.each(["canceled", "cancelled", "past_due"])(
    "allows deliberately supported %s grace access only through the current period",
    status => {
      expect(hasSubscriptionAccess({ status, current_period_end: futurePeriodEnd })).toBe(true)
      expect(hasSubscriptionAccess({ status, current_period_end: pastPeriodEnd })).toBe(false)
    }
  )

  it.each(["unpaid", "expired", null])("denies %s membership status", status => {
    expect(hasSubscriptionAccess({ status, current_period_end: futurePeriodEnd })).toBe(false)
  })
})

describe("getSuiteAccess uses the shared membership policy", () => {
  beforeEach(() => {
    vi.resetModules()
    mocks.sql.mockReset()
  })

  it.each([
    { status: "trialing", current_period_end: futurePeriodEnd },
    { status: "active", cancel_at_period_end: true, current_period_end: futurePeriodEnd },
    { status: "canceled", current_period_end: futurePeriodEnd },
    { status: "past_due", current_period_end: futurePeriodEnd },
  ])("grants member access for $status membership", async row => {
    mocks.sql.mockResolvedValueOnce([
      { product_type: "sselfie_studio_membership", trial_ends_at: null, ...row },
    ])

    const { getSuiteAccess } = await import("@/lib/trial/suite-trial")

    await expect(getSuiteAccess("member-1")).resolves.toMatchObject({ level: "member" })
  })

  it("does not grant member access after grace expires", async () => {
    mocks.sql.mockResolvedValueOnce([
      {
        product_type: "sselfie_studio_membership",
        status: "canceled",
        current_period_end: pastPeriodEnd,
        trial_ends_at: null,
      },
      {
        product_type: "starter_kit",
        status: "completed",
        current_period_end: null,
        trial_ends_at: null,
      },
    ])

    const { getSuiteAccess } = await import("@/lib/trial/suite-trial")

    await expect(getSuiteAccess("member-1")).resolves.not.toMatchObject({ level: "member" })
  })

  it("keeps Maya Essential generation access but excludes its Pro-only Calendar", async () => {
    mocks.sql.mockResolvedValueOnce([
      {
        product_type: "sselfie_studio_membership",
        plan: "maya_essential_pilot",
        status: "active",
        current_period_end: futurePeriodEnd,
        trial_ends_at: null,
      },
    ])

    const { getSuiteAccess, isMayaEssentialOnlyAccess } = await import("@/lib/trial/suite-trial")

    const access = await getSuiteAccess("essential-1")
    expect(access).toMatchObject({
      level: "member",
      calendarIncluded: false,
    })
    expect(isMayaEssentialOnlyAccess(access)).toBe(true)
    expect(isMayaEssentialOnlyAccess({ level: "member", fullAppIncluded: false })).toBe(true)
  })

  it.each([
    {
      source: "a full SUITE membership",
      vaultIncludedBySuite: true,
      extra: {
        product_type: "sselfie_studio_membership",
        plan: "monthly",
        status: "active",
        current_period_end: futurePeriodEnd,
        trial_ends_at: null,
      },
    },
    {
      source: "an active SUITE trial",
      vaultIncludedBySuite: false,
      extra: {
        product_type: "suite_trial",
        plan: "suite_trial",
        status: "active",
        current_period_end: null,
        trial_ends_at: futurePeriodEnd,
      },
    },
    {
      source: "an active visibility-bundle pass",
      vaultIncludedBySuite: true,
      extra: {
        product_type: "selfie_visibility_bundle_pass",
        plan: "selfie_visibility_bundle_pass",
        status: "active",
        current_period_end: null,
        trial_ends_at: futurePeriodEnd,
      },
    },
  ])(
    "unions full surfaces from $source with Maya Essential without inventing Vault access",
    async ({ extra, vaultIncludedBySuite }) => {
      mocks.sql.mockResolvedValueOnce([
        {
          product_type: "sselfie_studio_membership",
          plan: "maya_essential_pilot",
          status: "active",
          current_period_end: futurePeriodEnd,
          trial_ends_at: null,
        },
        extra,
      ])

      const { getSuiteAccess } = await import("@/lib/trial/suite-trial")

      await expect(getSuiteAccess("mixed-owner")).resolves.toMatchObject({
        level: "member",
        calendarIncluded: true,
        fullAppIncluded: true,
        vaultIncludedBySuite,
      })
    }
  )

  it("does not query Stripe-only fields that are absent from the production subscriptions table", () => {
    const source = readFileSync("lib/trial/suite-trial.ts", "utf8")
    const select = source.match(/SELECT product_type[\s\S]*?FROM subscriptions/)?.[0] || ""

    expect(select).toContain("current_period_end")
    expect(select).not.toContain("cancel_at_period_end")
  })
})
