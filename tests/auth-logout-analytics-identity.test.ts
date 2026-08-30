// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

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
    expect(cookies).toMatch(/sselfie_posthog_reset=[0-9a-f-]{36}/)
    expect(cookies).toContain("Max-Age=31536000")
    expect(cookies).toContain("HttpOnly")
  })

  it("clears the local session before rotating when provider logout fails", async () => {
    mocks.signOut.mockResolvedValue({ error: new Error("provider unavailable") })
    const { POST } = await import("@/app/api/auth/logout/route")
    const response = await POST(
      new NextRequest("http://localhost/api/auth/logout", {
        method: "POST",
        headers: {
          cookie:
            "sb-project-ref-auth-token=stale-session; sselfie_analytics_generation=44444444-4444-4444-8444-444444444444",
        },
      })
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      success: true,
      providerRevocationPending: true,
    })
    const cookies = response.headers.get("set-cookie") || ""
    expect(cookies).toContain("sb-project-ref-auth-token=")
    expect(cookies).toContain("Max-Age=0")
    expect(cookies).toContain("sselfie_anon_id_44444444444444448444444444444444=")
    expect(cookies).toMatch(/sselfie_posthog_reset=[0-9a-f-]{36}/)
    expect(cookies).toContain(
      "sselfie_supabase_session_generation=44444444-4444-4444-8444-444444444444"
    )
  })

  it("clears the local session before rotating when logout setup throws", async () => {
    mocks.createServerClient.mockRejectedValue(new Error("provider unavailable"))
    const { POST } = await import("@/app/api/auth/logout/route")
    const response = await POST(
      new NextRequest("http://localhost/api/auth/logout", {
        method: "POST",
        headers: { cookie: "sb-project-ref-auth-token=stale-session" },
      })
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      success: true,
      providerRevocationPending: true,
    })
    const cookies = response.headers.get("set-cookie") || ""
    expect(cookies).toContain("sb-project-ref-auth-token=")
    expect(cookies).toContain("Max-Age=0")
    expect(cookies).toMatch(/sselfie_posthog_reset=[0-9a-f-]{36}/)
  })

  it("rotates only the current browser generation's anonymous cookie", async () => {
    const generation = "33333333-3333-4333-8333-333333333333"
    const { POST } = await import("@/app/api/auth/logout/route")
    const response = await POST(
      new NextRequest("http://localhost/api/auth/logout", {
        method: "POST",
        headers: {
          "x-sselfie-analytics-generation": generation,
          cookie:
            "sselfie_anon_id_11111111111141118111111111111111=stale; sselfie_anon_id_33333333333343338333333333333333=current",
        },
      })
    )

    const cookies = response.headers.get("set-cookie") || ""
    expect(cookies).toContain("sselfie_anon_id_33333333333343338333333333333333=")
    expect(cookies).not.toContain("sselfie_anon_id=")
    expect(cookies).toContain("sselfie_anon_id_11111111111141118111111111111111=")
    expect(cookies).toContain("Max-Age=0")
  })
})
