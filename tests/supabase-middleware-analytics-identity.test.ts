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
          headers: { cookie: "sb-project-ref-auth-token=stale-session" },
        })
      )
      const cookies = response.headers.get("set-cookie") || ""

      expect(cookies).toContain("sb-project-ref-auth-token=")
      expect(cookies).toContain("sselfie_anon_id=")
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
})
