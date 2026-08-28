// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { readFileSync } from "node:fs"
import { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  getUser: vi.fn(),
}))

vi.mock("@supabase/ssr", () => ({
  createServerClient: mocks.createServerClient,
}))

describe("Supabase middleware analytics identity isolation", () => {
  it("keeps the shared identity helper compatible with the Edge runtime", () => {
    const source = readFileSync(
      new URL("../lib/analytics/identity-cookies.ts", import.meta.url),
      "utf8"
    )

    expect(source).not.toMatch(/from ["'](?:node:)?crypto["']/)
    expect(source).toContain("globalThis.crypto.randomUUID()")
  })

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://supabase.test"
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-test-key"
    mocks.createServerClient.mockReturnValue({ auth: { getUser: mocks.getUser } })
  })

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  })

  it("rotates identity for every terminal error on an existing session", async () => {
    const { updateSession } = await import("@/lib/supabase/middleware")

    for (const code of [
      "refresh_token_not_found",
      "refresh_token_already_used",
      "session_expired",
      "session_not_found",
      "bad_jwt",
    ]) {
      mocks.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: { code, message: code },
      })
      const response = await updateSession(
        new NextRequest("https://sselfie.ai/app", {
          headers: {
            cookie:
              "sb-project-ref-auth-token=stale-session; sselfie_analytics_generation=55555555-5555-4555-8555-555555555555",
          },
        })
      )
      const cookies = response.headers.get("set-cookie") || ""

      expect(cookies).toContain("sb-project-ref-auth-token=")
      expect(cookies).toContain("sselfie_anon_id_55555555555545558555555555555555=")
      expect(cookies).not.toContain("sselfie_anon_id=")
      expect(cookies).toContain("sselfie_posthog_reset=1")
      expect(cookies).toContain("Max-Age=31536000")
      expect(cookies).toContain("HttpOnly")
    }
  })

  it("does not rotate a genuinely anonymous request with a terminal error", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: null },
      error: { code: "session_not_found", message: "Session not found" },
    })
    const { updateSession } = await import("@/lib/supabase/middleware")

    const response = await updateSession(new NextRequest("https://sselfie.ai/app"))

    expect(response.headers.get("set-cookie")).toBeNull()
  })

  it("does not rotate an existing session for a transient auth error", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: null },
      error: { code: "network_error", message: "Temporary network error" },
    })
    const { updateSession } = await import("@/lib/supabase/middleware")

    const response = await updateSession(
      new NextRequest("https://sselfie.ai/app", {
        headers: { cookie: "sb-project-ref-auth-token=current-session" },
      })
    )

    expect(response.headers.get("set-cookie")).toBeNull()
  })

  it("rejects auth cookies refreshed by an older browser generation", async () => {
    const { updateSession } = await import("@/lib/supabase/middleware")

    const response = await updateSession(
      new NextRequest("https://sselfie.ai/api/analytics/event", {
        headers: {
          cookie: [
            "sb-project-ref-auth-token=late-refreshed-session",
            "sselfie_analytics_generation=77777777-7777-4777-8777-777777777777",
            "sselfie_supabase_session_generation=66666666-6666-4666-8666-666666666666",
          ].join("; "),
        },
      })
    )

    const cookies = response.headers.get("set-cookie") || ""
    expect(mocks.createServerClient).not.toHaveBeenCalled()
    expect(cookies).toContain("sb-project-ref-auth-token=")
    expect(cookies).toContain("Max-Age=0")
    expect(cookies).toContain(
      "sselfie_supabase_session_generation=77777777-7777-4777-8777-777777777777"
    )
  })

  it("tags refreshed auth cookies with the request generation", async () => {
    mocks.createServerClient.mockImplementation((_url, _key, options) => ({
      auth: {
        getUser: async () => {
          options.cookies.setAll([
            {
              name: "sb-project-ref-auth-token",
              value: "refreshed-session",
              options: {},
            },
          ])
          return { data: { user: { id: "user-123", email: "user@example.com" } }, error: null }
        },
      },
    }))
    const { updateSession } = await import("@/lib/supabase/middleware")

    const response = await updateSession(
      new NextRequest("https://sselfie.ai/app", {
        headers: {
          cookie:
            "sb-project-ref-auth-token=current-session; sselfie_analytics_generation=88888888-8888-4888-8888-888888888888",
        },
      })
    )

    const cookies = response.headers.get("set-cookie") || ""
    expect(cookies).toContain("sb-project-ref-auth-token=refreshed-session")
    expect(cookies).toContain(
      "sselfie_supabase_session_generation=88888888-8888-4888-8888-888888888888"
    )
  })

  it("preserves the old session for the logout handler before cleanup", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: { id: "user-123", email: "user@example.com" } },
      error: null,
    })
    const { updateSession } = await import("@/lib/supabase/middleware")

    const response = await updateSession(
      new NextRequest("https://sselfie.ai/api/auth/logout", {
        method: "POST",
        headers: {
          cookie: [
            "sb-project-ref-auth-token=current-session",
            "sselfie_analytics_generation=99999999-9999-4999-8999-999999999999",
            "sselfie_supabase_session_generation=88888888-8888-4888-8888-888888888888",
          ].join("; "),
        },
      })
    )

    expect(mocks.createServerClient).toHaveBeenCalledOnce()
    expect(mocks.getUser).toHaveBeenCalledOnce()
    expect(response.headers.get("set-cookie")).toBeNull()
  })
})
