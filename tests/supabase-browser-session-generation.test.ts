// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  createBrowserClient: vi.fn(),
  onAuthStateChange: vi.fn(),
}))

vi.mock("@supabase/ssr", () => ({
  createBrowserClient: mocks.createBrowserClient,
}))

describe("browser Supabase session generation", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    document.cookie = "sselfie_analytics_generation=11111111-1111-4111-8111-111111111111; Path=/"
    document.cookie =
      "sselfie_supabase_session_generation=11111111-1111-4111-8111-111111111111; Path=/"
    mocks.createBrowserClient.mockReturnValue({
      auth: { onAuthStateChange: mocks.onAuthStateChange },
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("tags a late browser refresh before Supabase can persist its session", async () => {
    let resolveRefresh: ((response: Response) => void) | undefined
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(
      () =>
        new Promise<Response>(resolve => {
          resolveRefresh = resolve
        })
    )
    const { createClient } = await import("@/lib/supabase/client")
    createClient()

    const options = mocks.createBrowserClient.mock.calls[0]?.[2]
    document.cookie = "sselfie_analytics_generation=22222222-2222-4222-8222-222222222222; Path=/"
    const refresh = options.global.fetch(
      "https://supabase.test/auth/v1/token?grant_type=refresh_token"
    )

    resolveRefresh?.(
      new Response(
        JSON.stringify({
          access_token: "new-access-token",
          refresh_token: "new-refresh-token",
          expires_in: 3600,
        }),
        { status: 200 }
      )
    )
    await refresh

    // The fetch wrapper returns to the SDK only after the old generation is
    // visible, so Supabase cannot expose its refreshed cookies first.
    expect(document.cookie).toContain(
      "sselfie_supabase_session_generation=11111111-1111-4111-8111-111111111111"
    )
    expect(fetchSpy).toHaveBeenCalledOnce()
  })

  it("does not retag the session for a malformed successful response", async () => {
    let resolveRefresh: ((response: Response) => void) | undefined
    vi.spyOn(globalThis, "fetch").mockImplementation(
      () =>
        new Promise<Response>(resolve => {
          resolveRefresh = resolve
        })
    )
    const { createClient } = await import("@/lib/supabase/client")
    createClient()

    const options = mocks.createBrowserClient.mock.calls[0]?.[2]
    const refresh = options.global.fetch(
      "https://supabase.test/auth/v1/token?grant_type=refresh_token"
    )

    document.cookie =
      "sselfie_supabase_session_generation=22222222-2222-4222-8222-222222222222; Path=/"
    resolveRefresh?.(new Response("{}", { status: 200 }))
    await refresh

    expect(document.cookie).toContain(
      "sselfie_supabase_session_generation=22222222-2222-4222-8222-222222222222"
    )
  })

  it("does not retag the session when a refresh request fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 401 }))
    const { createClient } = await import("@/lib/supabase/client")
    createClient()

    document.cookie = "sselfie_analytics_generation=22222222-2222-4222-8222-222222222222; Path=/"
    document.cookie =
      "sselfie_supabase_session_generation=22222222-2222-4222-8222-222222222222; Path=/"

    const options = mocks.createBrowserClient.mock.calls[0]?.[2]
    await options.global.fetch("https://supabase.test/auth/v1/token?grant_type=refresh_token")

    expect(document.cookie).toContain(
      "sselfie_supabase_session_generation=22222222-2222-4222-8222-222222222222"
    )
  })

  it("tags a genuine browser sign-in with the current generation", async () => {
    document.cookie = "sselfie_supabase_session_generation=; Path=/; Max-Age=0"
    const { createClient } = await import("@/lib/supabase/client")
    createClient()

    const authCallback = mocks.onAuthStateChange.mock.calls[0]?.[0]
    authCallback("SIGNED_IN")

    expect(document.cookie).toContain(
      "sselfie_supabase_session_generation=11111111-1111-4111-8111-111111111111"
    )
  })

  it("retags a genuine sign-in after account deletion clears the old marker", async () => {
    const { clearCurrentSupabaseSessionGeneration, createClient } =
      await import("@/lib/supabase/client")
    createClient()

    clearCurrentSupabaseSessionGeneration()
    document.cookie = "sselfie_analytics_generation=22222222-2222-4222-8222-222222222222; Path=/"
    const authCallback = mocks.onAuthStateChange.mock.calls[0]?.[0]
    authCallback("SIGNED_IN")

    expect(document.cookie).toContain(
      "sselfie_supabase_session_generation=22222222-2222-4222-8222-222222222222"
    )
  })

  it("preserves the old marker when SIGNED_IN recovers a stored session", async () => {
    const { createClient } = await import("@/lib/supabase/client")
    createClient()

    document.cookie = "sselfie_analytics_generation=22222222-2222-4222-8222-222222222222; Path=/"
    const authCallback = mocks.onAuthStateChange.mock.calls[0]?.[0]
    authCallback("SIGNED_IN")

    expect(document.cookie).toContain(
      "sselfie_supabase_session_generation=11111111-1111-4111-8111-111111111111"
    )
  })
})
