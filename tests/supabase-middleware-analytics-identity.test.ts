// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  getUser: vi.fn(),
}))

vi.mock("@supabase/ssr", () => ({
  createServerClient: mocks.createServerClient,
}))

describe("Supabase middleware analytics identity isolation", () => {
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

  it("rotates anonymous identity when a stale session is cleared implicitly", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: null },
      error: { code: "refresh_token_not_found", message: "Refresh Token Not Found" },
    })
    const { updateSession } = await import("@/lib/supabase/middleware")

    const response = await updateSession(new NextRequest("https://sselfie.ai/app"))
    const cookies = response.headers.get("set-cookie") || ""

    expect(cookies).toContain("sselfie_anon_id=")
    expect(cookies).toContain("sselfie_posthog_reset=1")
    expect(cookies).toContain("HttpOnly")
  })
})
