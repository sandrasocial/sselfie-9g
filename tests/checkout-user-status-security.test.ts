// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  sql: vi.fn(),
  retrieveSession: vi.fn(),
  getUserById: vi.fn(),
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
      },
    },
  }),
}))

function checkoutRequest(sessionId: string) {
  return new Request(`http://localhost/api/checkout/user-status?session_id=${sessionId}`)
}

describe("checkout user status account-setup safety", () => {
  beforeEach(() => {
    vi.resetModules()
    mocks.sql.mockReset()
    mocks.retrieveSession.mockReset()
    mocks.getUserById.mockReset()
    mocks.retrieveSession.mockResolvedValue({
      id: "cs_live_bundle",
      status: "complete",
      payment_status: "paid",
      customer_details: { email: "buyer@example.com" },
      customer_email: null,
    })
  })

  it("offers inline password setup only when Auth has this exact checkout marker", async () => {
    mocks.sql.mockResolvedValue([
      {
        email: "buyer@example.com",
        supabase_user_id: "auth_new_buyer",
        password_setup_complete: false,
      },
    ])
    mocks.getUserById.mockResolvedValue({
      data: {
        user: {
          id: "auth_new_buyer",
          app_metadata: {
            account_setup_checkout_session_id: "cs_live_bundle",
          },
          last_sign_in_at: null,
        },
      },
      error: null,
    })
    const { GET } = await import("@/app/api/checkout/user-status/route")

    const response = await GET(checkoutRequest("cs_live_bundle"))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      userInfo: { email: "buyer@example.com", hasAccount: false },
    })
  })

  it("routes a pre-existing unsigned-in Auth user to login or emailed recovery", async () => {
    mocks.sql.mockResolvedValue([
      {
        email: "buyer@example.com",
        supabase_user_id: "auth_existing_buyer",
        password_setup_complete: false,
      },
    ])
    mocks.getUserById.mockResolvedValue({
      data: {
        user: {
          id: "auth_existing_buyer",
          app_metadata: {},
          last_sign_in_at: null,
        },
      },
      error: null,
    })
    const { GET } = await import("@/app/api/checkout/user-status/route")

    const response = await GET(checkoutRequest("cs_live_bundle"))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      userInfo: { email: "buyer@example.com", hasAccount: true },
    })
  })

  it("does not expose inline setup when the marker belongs to another checkout", async () => {
    mocks.sql.mockResolvedValue([
      {
        email: "buyer@example.com",
        supabase_user_id: "auth_existing_buyer",
        password_setup_complete: false,
      },
    ])
    mocks.getUserById.mockResolvedValue({
      data: {
        user: {
          id: "auth_existing_buyer",
          app_metadata: {
            account_setup_checkout_session_id: "cs_live_another_checkout",
          },
          last_sign_in_at: null,
        },
      },
      error: null,
    })
    const { GET } = await import("@/app/api/checkout/user-status/route")

    const response = await GET(checkoutRequest("cs_live_bundle"))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      userInfo: { email: "buyer@example.com", hasAccount: true },
    })
  })

  it("keeps the One Selfie buyer waiting until all bundle assets and the SUITE pass exist", async () => {
    mocks.retrieveSession.mockResolvedValue({
      id: "cs_live_bundle",
      status: "complete",
      payment_status: "paid",
      customer_details: { email: "buyer@example.com" },
      customer_email: null,
      metadata: { product_type: "selfie_visibility_bundle" },
    })
    mocks.sql
      .mockResolvedValueOnce([
        {
          id: "neon_bundle_buyer",
          email: "buyer@example.com",
          supabase_user_id: "auth_new_buyer",
          password_setup_complete: false,
        },
      ])
      .mockResolvedValueOnce([{ bundle_ready: false }])

    const { GET } = await import("@/app/api/checkout/user-status/route")
    const response = await GET(checkoutRequest("cs_live_bundle"))

    expect(response.status).toBe(202)
    expect(await response.json()).toEqual({ userInfo: null })
    expect(mocks.getUserById).not.toHaveBeenCalled()
    expect(mocks.sql.mock.calls[1]?.slice(1)).toEqual([
      "neon_bundle_buyer",
      "neon_bundle_buyer",
    ])
  })

  it("releases the One Selfie success action after the complete bundle fulfillment marker", async () => {
    mocks.retrieveSession.mockResolvedValue({
      id: "cs_live_bundle",
      status: "complete",
      payment_status: "paid",
      customer_details: { email: "buyer@example.com" },
      customer_email: null,
      metadata: { product_type: "selfie_visibility_bundle" },
    })
    mocks.sql
      .mockResolvedValueOnce([
        {
          id: "neon_bundle_buyer",
          email: "buyer@example.com",
          supabase_user_id: "auth_new_buyer",
          password_setup_complete: false,
        },
      ])
      .mockResolvedValueOnce([{ bundle_ready: true }])
    mocks.getUserById.mockResolvedValue({
      data: {
        user: {
          id: "auth_new_buyer",
          app_metadata: { account_setup_checkout_session_id: "cs_live_bundle" },
          last_sign_in_at: null,
        },
      },
      error: null,
    })

    const { GET } = await import("@/app/api/checkout/user-status/route")
    const response = await GET(checkoutRequest("cs_live_bundle"))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      userInfo: { email: "buyer@example.com", hasAccount: false },
    })
    expect(mocks.sql.mock.calls[1]?.slice(1)).toEqual([
      "neon_bundle_buyer",
      "neon_bundle_buyer",
    ])
  })
})
