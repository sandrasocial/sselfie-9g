// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
  syncUserWithNeon: vi.fn(),
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { exchangeCodeForSession: mocks.exchangeCodeForSession },
  })),
}))

vi.mock("@/lib/db/client", () => ({ sql: vi.fn() }))
vi.mock("@/lib/user-sync", () => ({ syncUserWithNeon: mocks.syncUserWithNeon }))
vi.mock("@/lib/referrals/routing", () => ({ normalizeReferralCode: vi.fn(() => null) }))
vi.mock("@/lib/referrals/service", () => ({
  isReferralSignupEligible: vi.fn(() => false),
  trackReferralSignup: vi.fn(),
}))
vi.mock("@/lib/subscription", () => ({
  shouldEnforceLiveSubscriptionRows: vi.fn(() => true),
}))

describe("auth callback recovery routing", () => {
  beforeEach(() => {
    vi.resetModules()
    mocks.exchangeCodeForSession.mockReset()
    mocks.syncUserWithNeon.mockReset()
  })

  it("routes a callback without a code to recovery and preserves the intended page", async () => {
    const { GET } = await import("@/app/auth/callback/route")
    const response = await GET(
      new Request(
        "https://sselfie.ai/auth/callback?error=access_denied&error_description=Email+link+has+expired&next=%2Fapp"
      )
    )
    const location = new URL(response.headers.get("location")!)

    expect(location.pathname).toBe("/auth/error")
    expect(location.searchParams.get("error")).toBe("Email link has expired")
    expect(location.searchParams.get("next")).toBe("/app")
  })

  it("preserves the intended page when exchanging a PKCE code fails", async () => {
    mocks.exchangeCodeForSession.mockResolvedValue({
      data: { user: null },
      error: { message: "PKCE verifier not found" },
    })

    const { GET } = await import("@/app/auth/callback/route")
    const response = await GET(
      new Request("https://sselfie.ai/auth/callback?code=bad-code&next=%2Fapp")
    )
    const location = new URL(response.headers.get("location")!)

    expect(location.pathname).toBe("/auth/error")
    expect(location.searchParams.get("error")).toBe("PKCE verifier not found")
    expect(location.searchParams.get("next")).toBe("/app")
  })

  it("returns a signed-in member to the course that started authentication", async () => {
    mocks.exchangeCodeForSession.mockResolvedValue({
      data: {
        user: {
          id: "auth-user-1",
          email: "member@example.com",
          user_metadata: {},
          recovery_sent_at: null,
        },
      },
      error: null,
    })
    mocks.syncUserWithNeon.mockResolvedValue(null)

    const { GET } = await import("@/app/auth/callback/route")
    const intendedCourse = "/academy/access/editing-masterclass"
    const response = await GET(
      new Request(
        `https://sselfie.ai/auth/callback?code=valid-code&next=${encodeURIComponent(intendedCourse)}`
      )
    )

    expect(response.headers.get("location")).toBe(`https://sselfie.ai${intendedCourse}`)
  })
})
