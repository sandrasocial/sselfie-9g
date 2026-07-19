// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  verifyOtp: vi.fn(),
  syncUserWithNeon: vi.fn(),
}))

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    getAll: vi.fn(() => []),
    set: vi.fn(),
  })),
}))

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({ auth: { verifyOtp: mocks.verifyOtp } })),
}))

vi.mock("@/lib/user-sync", () => ({
  syncUserWithNeon: mocks.syncUserWithNeon,
}))

describe("email confirmation account provisioning", () => {
  beforeEach(() => {
    vi.resetModules()
    mocks.verifyOtp.mockReset()
    mocks.syncUserWithNeon.mockReset()
  })

  it("creates the Neon application user before sending a confirmed signup into the app", async () => {
    mocks.verifyOtp.mockResolvedValue({
      data: {
        user: {
          id: "auth-new-member",
          email: "new-member@example.com",
          user_metadata: { name: "New Member" },
        },
      },
      error: null,
    })
    mocks.syncUserWithNeon.mockResolvedValue({ id: "neon-new-member" })

    const { GET } = await import("@/app/auth/confirm/route")
    const response = await GET(
      new Request(
        "https://sselfie.ai/auth/confirm?token_hash=valid-token&type=signup&next=%2Fapp"
      ) as never
    )

    expect(mocks.syncUserWithNeon).toHaveBeenCalledWith(
      "auth-new-member",
      "new-member@example.com",
      "New Member"
    )
    expect(response.headers.get("location")).toBe("https://sselfie.ai/app")
  })
})
