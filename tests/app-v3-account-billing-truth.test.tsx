// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { AccountView } from "@/components/app-v3/account-view"

const routeMocks = vi.hoisted(() => ({
  getAuthenticatedUser: vi.fn(),
  getUserIdFromSupabase: vi.fn(),
  sql: vi.fn(),
  getUserCredits: vi.fn(),
}))

vi.mock("@/lib/auth-helper", () => ({
  getAuthenticatedUser: routeMocks.getAuthenticatedUser,
}))

vi.mock("@/lib/user-mapping", () => ({
  getUserIdFromSupabase: routeMocks.getUserIdFromSupabase,
}))

vi.mock("@/lib/db/client", () => ({ sql: routeMocks.sql }))
vi.mock("@/lib/credits", () => ({ getUserCredits: routeMocks.getUserCredits }))
vi.mock("@/lib/subscription", () => ({
  shouldEnforceLiveSubscriptionRows: () => true,
}))
vi.mock("@/lib/admin-feature-flags", () => ({ isAdminEmail: () => false }))

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    const { fill: _fill, ...imgProps } = props
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...imgProps} />
  },
}))

describe("App v3 account billing truth", () => {
  beforeEach(() => {
    vi.resetModules()
    routeMocks.getAuthenticatedUser.mockReset()
    routeMocks.getUserIdFromSupabase.mockReset()
    routeMocks.sql.mockReset()
    routeMocks.getUserCredits.mockReset()
    routeMocks.getAuthenticatedUser.mockResolvedValue({
      user: { id: "auth_buyer", email: "buyer@example.com" },
      error: null,
    })
    routeMocks.getUserIdFromSupabase.mockResolvedValue("neon_buyer")
    routeMocks.getUserCredits.mockResolvedValue(184)
  })

  it("reports an active bundle pass as fixed access with an end date and no renewal", async () => {
    const passEndsAt = new Date(Date.now() + 20 * 86_400_000).toISOString()
    routeMocks.sql.mockResolvedValue([
      {
        plan: "selfie_visibility_bundle_pass",
        product_type: "selfie_visibility_bundle_pass",
        status: "active",
        current_period_end: null,
        trial_ends_at: passEndsAt,
      },
      {
        plan: "selfie_visibility_bundle",
        product_type: "selfie_visibility_bundle",
        status: "active",
        current_period_end: null,
        trial_ends_at: null,
      },
    ])
    const { GET } = await import("@/app/api/app-v3/account/route")

    const response = await GET()

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      plan: "One Selfie Visibility Bundle",
      status: "active",
      billingKind: "fixed_pass",
      renewsAt: null,
      accessEndsAt: passEndsAt,
      credits: 184,
    })
  })

  it("keeps lifetime bundle ownership truthful after the fixed pass ends", async () => {
    const passEndedAt = new Date(Date.now() - 2 * 86_400_000).toISOString()
    routeMocks.sql.mockResolvedValue([
      {
        plan: "selfie_visibility_bundle",
        product_type: "selfie_visibility_bundle",
        status: "active",
        current_period_end: null,
        trial_ends_at: null,
      },
      {
        plan: "selfie_visibility_bundle_pass",
        product_type: "selfie_visibility_bundle_pass",
        status: "expired",
        current_period_end: null,
        trial_ends_at: passEndedAt,
      },
    ])
    const { GET } = await import("@/app/api/app-v3/account/route")

    const response = await GET()

    expect(await response.json()).toMatchObject({
      plan: "One Selfie Visibility Bundle",
      status: "owned",
      billingKind: "one_time",
      renewsAt: null,
      accessEndsAt: passEndedAt,
    })
  })

  it("prioritizes a real recurring SUITE membership when the buyer also owns the bundle", async () => {
    const renewsAt = new Date(Date.now() + 300 * 86_400_000).toISOString()
    routeMocks.sql.mockResolvedValue([
      {
        plan: "annual",
        product_type: "sselfie_studio_membership",
        status: "active",
        current_period_end: renewsAt,
        trial_ends_at: null,
      },
      {
        plan: "selfie_visibility_bundle_pass",
        product_type: "selfie_visibility_bundle_pass",
        status: "active",
        current_period_end: null,
        trial_ends_at: new Date(Date.now() + 20 * 86_400_000).toISOString(),
      },
      {
        plan: "selfie_visibility_bundle",
        product_type: "selfie_visibility_bundle",
        status: "active",
        current_period_end: null,
        trial_ends_at: null,
      },
    ])
    const { GET } = await import("@/app/api/app-v3/account/route")

    const response = await GET()

    expect(await response.json()).toMatchObject({
      plan: "Annual",
      status: "active",
      billingKind: "recurring",
      renewsAt,
      accessEndsAt: null,
    })
  })

  it("never shows recurring billing or refill claims for a fixed bundle pass", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url === "/api/app-v3/account") {
        return {
          ok: true,
          json: async () => ({
            plan: "One Selfie Visibility Bundle",
            status: "active",
            billingKind: "fixed_pass",
            renewsAt: null,
            accessEndsAt: "2026-08-12T16:00:00.000Z",
            credits: 184,
            email: "buyer@example.com",
          }),
        } as Response
      }
      return {
        ok: true,
        json: async () => ({ images: [] }),
      } as Response
    })
    vi.stubGlobal("fetch", fetchMock)

    render(<AccountView firstName="Sandra" />)

    expect(await screen.findByText("One Selfie Visibility Bundle")).toBeTruthy()
    expect(screen.getByText(/does not renew/i)).toBeTruthy()
    expect(screen.getByText(/included 200 credits/i)).toBeTruthy()
    await waitFor(() => {
      expect(screen.queryByText("Manage billing")).toBeNull()
      expect(screen.queryByText("Your plan refills monthly.")).toBeNull()
    })
  })
})
