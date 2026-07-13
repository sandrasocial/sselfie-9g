// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  sql: vi.fn(),
  findByEmail: vi.fn(),
  getUserById: vi.fn(),
  createUser: vi.fn(),
  generateLink: vi.fn(),
}))

vi.mock("@/lib/db/client", () => ({ sql: mocks.sql }))
vi.mock("@/lib/supabase/find-auth-user-by-email", () => ({
  findAuthUserByEmail: mocks.findByEmail,
}))
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    auth: {
      admin: {
        listUsers: vi.fn(),
        getUserById: mocks.getUserById,
        createUser: mocks.createUser,
        generateLink: mocks.generateLink,
      },
    },
  }),
}))

describe("existing Neon checkout account provisioning", () => {
  beforeEach(() => {
    vi.resetModules()
    Object.values(mocks).forEach(mock => mock.mockReset())
    mocks.sql.mockResolvedValue([])
    mocks.generateLink.mockResolvedValue({
      data: {
        properties: {
          action_link:
            "https://auth.example.com/verify?token=setup_token&type=recovery",
        },
      },
      error: null,
    })
  })

  it("creates and links Auth for an existing Neon lead with no Auth identity", async () => {
    mocks.findByEmail.mockResolvedValue(null)
    mocks.createUser.mockResolvedValue({
      data: {
        user: {
          id: "auth_new",
          email: "lead@example.com",
          last_sign_in_at: null,
          app_metadata: {
            account_setup_checkout_session_id: "cs_live_bundle",
          },
        },
      },
      error: null,
    })
    const { ensureExistingNeonPublicCheckoutAuth } = await import(
      "@/lib/payments/public-checkout-account"
    )

    const result = await ensureExistingNeonPublicCheckoutAuth({
      neonUserId: "neon_lead",
      currentSupabaseUserId: null,
      passwordSetupComplete: false,
      email: "Lead@Example.com",
      sessionId: "cs_live_bundle",
      stripeCustomerId: "cus_bundle",
      productType: "selfie_visibility_bundle",
      productId: "selfie_visibility_bundle",
      productionUrl: "https://www.sselfie.ai",
    })

    expect(mocks.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "lead@example.com",
        app_metadata: {
          account_setup_checkout_session_id: "cs_live_bundle",
        },
      }),
    )
    expect(mocks.generateLink).toHaveBeenCalled()
    expect(result).toMatchObject({
      supabaseUserId: "auth_new",
      shouldUseSetupLink: true,
    })
    expect(result.passwordSetupLink).toContain("/auth/confirm?token=setup_token")
    expect(mocks.sql).toHaveBeenCalled()
  })

  it("repairs a dangling Auth ID by finding and linking the live email account", async () => {
    mocks.getUserById
      .mockResolvedValueOnce({ data: { user: null }, error: { message: "not found" } })
      .mockResolvedValueOnce({
        data: {
          user: {
            id: "auth_live",
            email: "lead@example.com",
            last_sign_in_at: "2026-07-01T10:00:00.000Z",
            app_metadata: {},
          },
        },
        error: null,
      })
    mocks.findByEmail.mockResolvedValue({ id: "auth_live", email: "lead@example.com" })
    const { ensureExistingNeonPublicCheckoutAuth } = await import(
      "@/lib/payments/public-checkout-account"
    )

    const result = await ensureExistingNeonPublicCheckoutAuth({
      neonUserId: "neon_lead",
      currentSupabaseUserId: "auth_dangling",
      passwordSetupComplete: false,
      email: "lead@example.com",
      sessionId: "cs_live_bundle",
      stripeCustomerId: "cus_bundle",
      productType: "selfie_visibility_bundle",
      productId: "selfie_visibility_bundle",
      productionUrl: "https://www.sselfie.ai",
    })

    expect(result).toEqual({
      supabaseUserId: "auth_live",
      shouldUseSetupLink: false,
      passwordSetupLink: "",
    })
    expect(mocks.createUser).not.toHaveBeenCalled()
    expect(mocks.generateLink).not.toHaveBeenCalled()
    expect(mocks.sql).toHaveBeenCalledTimes(2)
  })

  it("keeps a valid mapped Auth account without creating or emailing another setup", async () => {
    mocks.getUserById.mockResolvedValue({
      data: {
        user: {
          id: "auth_existing",
          email: "buyer@example.com",
          last_sign_in_at: "2026-07-01T10:00:00.000Z",
          app_metadata: {},
        },
      },
      error: null,
    })
    const { ensureExistingNeonPublicCheckoutAuth } = await import(
      "@/lib/payments/public-checkout-account"
    )

    const result = await ensureExistingNeonPublicCheckoutAuth({
      neonUserId: "neon_existing",
      currentSupabaseUserId: "auth_existing",
      passwordSetupComplete: true,
      email: "buyer@example.com",
      sessionId: "cs_live_bundle",
      stripeCustomerId: "cus_bundle",
      productType: "selfie_visibility_bundle",
      productId: "selfie_visibility_bundle",
      productionUrl: "https://www.sselfie.ai",
    })

    expect(result.shouldUseSetupLink).toBe(false)
    expect(mocks.findByEmail).not.toHaveBeenCalled()
    expect(mocks.createUser).not.toHaveBeenCalled()
    expect(mocks.generateLink).not.toHaveBeenCalled()
  })
})
