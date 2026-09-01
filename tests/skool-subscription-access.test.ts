// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  sql: vi.fn(),
  hasSkool: vi.fn(),
}))

vi.mock("@/lib/db/client", () => ({ sql: mocks.sql }))
vi.mock("@/lib/skool/membership-service", () => ({
  hasActiveSkoolMembership: mocks.hasSkool,
}))

describe("Skool membership access union", () => {
  beforeEach(() => {
    vi.resetModules()
    mocks.sql.mockReset()
    mocks.hasSkool.mockReset()
  })

  it("projects external access explicitly without a Stripe identifier", async () => {
    mocks.sql.mockResolvedValue([])
    mocks.hasSkool.mockResolvedValue(true)
    const { getUserMembershipAccess, getUserSubscription } = await import("@/lib/subscription")

    await expect(getUserSubscription("user_1")).resolves.toBeNull()
    await expect(getUserMembershipAccess("user_1")).resolves.toEqual({
      product_type: "skool_membership",
      plan: "skool_monthly",
      status: "active",
      stripe_subscription_id: null,
      stripe_customer_id: null,
      current_period_start: null,
      current_period_end: null,
      created_at: null,
      is_test_mode: false,
      access_source: "skool",
    })
  })

  it("preserves a real Stripe membership when both authorities are active", async () => {
    mocks.sql.mockResolvedValue([
      {
        product_type: "sselfie_studio_membership",
        plan: "monthly",
        status: "active",
        stripe_subscription_id: "sub_live",
        is_test_mode: false,
      },
    ])
    mocks.hasSkool.mockResolvedValue(true)
    const { getUserMembershipAccess } = await import("@/lib/subscription")

    await expect(getUserMembershipAccess("user_1")).resolves.toMatchObject({
      product_type: "sselfie_studio_membership",
      stripe_subscription_id: "sub_live",
      access_source: "stripe",
    })
  })

  it("does not let a lower-tier Stripe row mask full Skool membership", async () => {
    mocks.sql.mockResolvedValue([
      {
        product_type: "vault_maya",
        plan: "vault_monthly",
        status: "active",
        stripe_subscription_id: "sub_vault_live",
        is_test_mode: false,
      },
    ])
    mocks.hasSkool.mockResolvedValue(true)
    const { getUserMembershipAccess, hasFullAccess } = await import("@/lib/subscription")

    await expect(getUserMembershipAccess("user_1")).resolves.toMatchObject({
      product_type: "skool_membership",
      stripe_subscription_id: null,
      access_source: "skool",
    })
    await expect(hasFullAccess("user_1")).resolves.toBe(true)
  })

  it("preserves a lower-tier Stripe customer when no Skool entitlement exists", async () => {
    mocks.sql.mockResolvedValue([
      {
        product_type: "vault_maya",
        plan: "vault_monthly",
        status: "active",
        stripe_subscription_id: "sub_vault_live",
        is_test_mode: false,
      },
    ])
    mocks.hasSkool.mockResolvedValue(false)
    const { getUserMembershipAccess } = await import("@/lib/subscription")

    await expect(getUserMembershipAccess("user_1")).resolves.toMatchObject({
      product_type: "vault_maya",
      stripe_subscription_id: "sub_vault_live",
      access_source: "stripe",
    })
  })

  it("allows Studio checks from either valid authority", async () => {
    mocks.sql.mockResolvedValue([])
    mocks.hasSkool.mockResolvedValue(true)
    const { hasFullStudioMembership, hasStudioMembership } = await import("@/lib/subscription")

    await expect(hasStudioMembership("user_1")).resolves.toBe(true)
    await expect(hasFullStudioMembership("user_1")).resolves.toBe(true)
  })
})
