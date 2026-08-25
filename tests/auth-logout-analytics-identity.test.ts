// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  signOut: vi.fn(),
  createServerClient: vi.fn(),
}))

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: mocks.createServerClient,
}))

describe("logout analytics identity isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.signOut.mockResolvedValue({ error: null })
    mocks.createServerClient.mockResolvedValue({
      auth: { signOut: mocks.signOut },
    })
  })

  it("rotates the anonymous identity and signals a persisted PostHog reset", async () => {
    const { POST } = await import("@/app/api/auth/logout/route")
    const response = await POST()

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ success: true })
    const cookies = response.headers.get("set-cookie") || ""
    expect(cookies).toContain("sselfie_anon_id=")
    expect(cookies).toContain("sselfie_posthog_reset=1")
    expect(cookies).toContain("Max-Age=31536000")
    expect(cookies).toContain("HttpOnly")
  })
})
