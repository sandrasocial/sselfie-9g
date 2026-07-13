// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  sql: vi.fn(),
  retrieveSession: vi.fn(),
  getUserById: vi.fn(),
  updateUserById: vi.fn(),
  checkRateLimit: vi.fn(),
}))

vi.mock("@/lib/db/client", () => ({ sql: mocks.sql }))

vi.mock("@/lib/stripe", () => ({
  stripe: {
    checkout: {
      sessions: { retrieve: mocks.retrieveSession },
    },
  },
}))

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    auth: {
      admin: {
        getUserById: mocks.getUserById,
        updateUserById: mocks.updateUserById,
      },
    },
  }),
}))

vi.mock("@/lib/rate-limit-api", () => ({
  checkRateLimit: mocks.checkRateLimit,
}))

function accountRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/complete-account", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": "203.0.113.10, 10.0.0.1",
    },
    body: JSON.stringify(body),
  }) as any
}

describe("complete-account security", () => {
  beforeEach(() => {
    vi.resetModules()
    mocks.sql.mockReset()
    mocks.retrieveSession.mockReset()
    mocks.getUserById.mockReset()
    mocks.updateUserById.mockReset()
    mocks.checkRateLimit.mockReset()
    mocks.checkRateLimit.mockResolvedValue({
      success: true,
      limit: 5,
      remaining: 4,
      reset: Math.ceil(Date.now() / 1000) + 3600,
    })
    mocks.updateUserById.mockResolvedValue({ error: null })
  })

  it("rejects an unpaid checkout before looking up or changing an account", async () => {
    mocks.retrieveSession.mockResolvedValue({
      id: "cs_test_unpaid",
      status: "complete",
      payment_status: "unpaid",
      customer_details: { email: "buyer@example.com" },
      metadata: { product_type: "selfie_visibility_bundle" },
    })
    const { POST } = await import("@/app/api/complete-account/route")

    const response = await POST(
      accountRequest({
        session_id: "cs_test_unpaid",
        password: "safe-password-123",
        name: "Buyer",
      }),
    )

    expect(response.status).toBe(403)
    expect(mocks.sql).not.toHaveBeenCalled()
    expect(mocks.updateUserById).not.toHaveBeenCalled()
  })

  it("uses the paid Stripe session email and completes a first-time setup in the safe order", async () => {
    mocks.retrieveSession.mockResolvedValue({
      id: "cs_live_bundle",
      status: "complete",
      payment_status: "paid",
      customer_details: { email: "Buyer@Example.com" },
      customer_email: null,
      metadata: { product_type: "selfie_visibility_bundle" },
    })
    const callOrder: string[] = []
    mocks.updateUserById.mockImplementation(async () => {
      callOrder.push("auth")
      return { error: null }
    })
    mocks.sql.mockImplementationOnce(async (...args: unknown[]) => {
      expect(JSON.stringify(args)).toContain("buyer@example.com")
      expect(JSON.stringify(args)).not.toContain("attacker@example.com")
      return [
        {
          id: "neon_user_1",
          supabase_user_id: "auth_user_1",
          password_setup_complete: false,
        },
      ]
    })
    mocks.sql.mockImplementationOnce(async () => {
      callOrder.push("database")
      return []
    })
    mocks.getUserById.mockResolvedValue({
      data: {
        user: {
          id: "auth_user_1",
          app_metadata: {
            account_setup_checkout_session_id: "cs_live_bundle",
          },
        },
      },
      error: null,
    })
    const { POST } = await import("@/app/api/complete-account/route")

    const response = await POST(
      accountRequest({
        session_id: "cs_live_bundle",
        email: "attacker@example.com",
        password: "safe-password-123",
        name: "Buyer",
      }),
    )

    expect(response.status).toBe(200)
    expect(mocks.retrieveSession).toHaveBeenCalledWith("cs_live_bundle")
    expect(mocks.updateUserById).toHaveBeenCalledWith("auth_user_1", {
      password: "safe-password-123",
      email_confirm: true,
      app_metadata: {},
    })
    expect(callOrder).toEqual(["auth", "database"])
  })

  it("refuses to reset an account that already completed setup", async () => {
    mocks.retrieveSession.mockResolvedValue({
      id: "cs_live_existing",
      status: "complete",
      payment_status: "paid",
      customer_details: { email: "buyer@example.com" },
      metadata: { product_type: "selfie_visibility_bundle" },
    })
    mocks.sql.mockResolvedValueOnce([
      {
        id: "neon_user_1",
        supabase_user_id: "auth_user_1",
        password_setup_complete: true,
      },
    ])
    const { POST } = await import("@/app/api/complete-account/route")

    const response = await POST(
      accountRequest({
        session_id: "cs_live_existing",
        password: "safe-password-123",
        name: "Buyer",
      }),
    )

    expect(response.status).toBe(409)
    expect(mocks.updateUserById).not.toHaveBeenCalled()
  })

  it("rejects a false-flag established auth account without the exact checkout marker", async () => {
    mocks.retrieveSession.mockResolvedValue({
      id: "cs_live_attacker_purchase",
      status: "complete",
      payment_status: "paid",
      customer_details: { email: "established@example.com" },
      metadata: { product_type: "selfie_visibility_bundle" },
    })
    mocks.sql.mockResolvedValueOnce([
      {
        id: "neon_established",
        supabase_user_id: "auth_established",
        password_setup_complete: false,
      },
    ])
    mocks.getUserById.mockResolvedValue({
      data: {
        user: {
          id: "auth_established",
          app_metadata: {},
          last_sign_in_at: "2026-07-01T10:00:00.000Z",
        },
      },
      error: null,
    })
    const { POST } = await import("@/app/api/complete-account/route")

    const response = await POST(
      accountRequest({
        session_id: "cs_live_attacker_purchase",
        password: "attacker-password-123",
        name: "Attacker",
      }),
    )

    expect(response.status).toBe(409)
    expect(mocks.updateUserById).not.toHaveBeenCalled()
  })

  it("rejects a new auth account whose setup marker belongs to another checkout", async () => {
    mocks.retrieveSession.mockResolvedValue({
      id: "cs_live_second_checkout",
      status: "complete",
      payment_status: "paid",
      customer_details: { email: "buyer@example.com" },
      metadata: { product_type: "selfie_visibility_bundle" },
    })
    mocks.sql.mockResolvedValueOnce([
      {
        id: "neon_user_1",
        supabase_user_id: "auth_user_1",
        password_setup_complete: false,
      },
    ])
    mocks.getUserById.mockResolvedValue({
      data: {
        user: {
          id: "auth_user_1",
          app_metadata: {
            account_setup_checkout_session_id: "cs_live_original_checkout",
          },
        },
      },
      error: null,
    })
    const { POST } = await import("@/app/api/complete-account/route")

    const response = await POST(
      accountRequest({
        session_id: "cs_live_second_checkout",
        password: "safe-password-123",
        name: "Buyer",
      }),
    )

    expect(response.status).toBe(409)
    expect(mocks.updateUserById).not.toHaveBeenCalled()
  })

  it("rejects products that are not allowed to create an account", async () => {
    mocks.retrieveSession.mockResolvedValue({
      id: "cs_live_unknown",
      status: "complete",
      payment_status: "paid",
      customer_details: { email: "buyer@example.com" },
      metadata: { product_type: "unknown_product" },
    })
    const { POST } = await import("@/app/api/complete-account/route")

    const response = await POST(
      accountRequest({
        session_id: "cs_live_unknown",
        password: "safe-password-123",
        name: "Buyer",
      }),
    )

    expect(response.status).toBe(403)
    expect(mocks.sql).not.toHaveBeenCalled()
  })

  it("rate limits account setup attempts before retrieving Stripe data", async () => {
    mocks.checkRateLimit.mockResolvedValue({
      success: false,
      limit: 5,
      remaining: 0,
      reset: Math.ceil(Date.now() / 1000) + 1800,
    })
    const { POST } = await import("@/app/api/complete-account/route")

    const response = await POST(
      accountRequest({
        session_id: "cs_live_rate_limited",
        password: "safe-password-123",
        name: "Buyer",
      }),
    )

    expect(response.status).toBe(429)
    expect(mocks.retrieveSession).not.toHaveBeenCalled()
  })
})
