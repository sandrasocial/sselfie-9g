// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest"

const RESET_NONCE = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"

describe("browser analytics identity bootstrap", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it("shares the first identity request and completes it before the analytics POST", async () => {
    let resolveIdentity!: (response: Response) => void
    const identityResponse = new Promise<Response>(resolve => {
      resolveIdentity = resolve
    })
    const request = vi
      .fn<typeof fetch>()
      .mockImplementationOnce(() => identityResponse)
      .mockResolvedValueOnce(Response.json({ ok: true }))
    vi.stubGlobal("fetch", request)
    vi.stubGlobal("navigator", {})

    const { ensureAnalyticsBrowserIdentity, trackAnalyticsEvent } =
      await import("@/lib/analytics/client")
    const bootstrap = ensureAnalyticsBrowserIdentity()
    const tracking = trackAnalyticsEvent({ event: "activation_selfie_uploaded" })

    expect(request).toHaveBeenCalledTimes(1)
    expect(request.mock.calls[0][0]).toBe("/api/analytics/event")

    resolveIdentity(Response.json({ distinctId: "anon:shared-first-visit", resetPostHog: false }))
    await expect(bootstrap).resolves.toEqual({
      distinctId: "anon:shared-first-visit",
      resetPostHog: false,
      resetPostHogNonce: null,
    })
    await tracking

    expect(request).toHaveBeenCalledTimes(2)
    expect(request.mock.calls[1][0]).toBe("/api/analytics/event")
    expect(request.mock.calls[1][1]).toMatchObject({ method: "POST" })
  })

  it("seeds identity and sends a navigation-safe beacon before bootstrap starts", async () => {
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(
        Response.json({
          distinctId: "anon:33333333-3333-4333-8333-333333333333",
          resetPostHog: false,
        })
      )
    const sendBeacon = vi.fn().mockReturnValue(true)
    const setItem = vi.fn()
    const removeItem = vi.fn()
    let tabGeneration: string | null = null
    let tabRotation: string | null = null
    let cookie = ""
    vi.stubGlobal("fetch", request)
    vi.stubGlobal("navigator", { sendBeacon })
    vi.stubGlobal("window", {
      crypto: { randomUUID: () => "33333333-3333-4333-8333-333333333333" },
      sessionStorage: {
        getItem: (key: string) =>
          key === "sselfie_analytics_tab_generation" ? tabGeneration : tabRotation,
        setItem: (key: string, value: string) => {
          if (key === "sselfie_analytics_tab_generation") tabGeneration = value
          if (key === "sselfie_analytics_tab_rotation") tabRotation = value
          setItem(key, value)
        },
        removeItem: (key: string) => {
          if (key === "sselfie_analytics_tab_generation") tabGeneration = null
          if (key === "sselfie_analytics_tab_rotation") tabRotation = null
          removeItem(key)
        },
      },
      location: {
        pathname: "/vault-maya",
        search: "?utm_source=email",
        protocol: "https:",
      },
    })
    vi.stubGlobal("document", {
      get cookie() {
        return cookie
      },
      set cookie(value: string) {
        cookie = value
      },
    })

    const { trackAnalyticsEvent } = await import("@/lib/analytics/client")

    await trackAnalyticsEvent({
      event: "vault_maya_landing_cta_clicked",
      navigationSafe: true,
    })

    expect(request).not.toHaveBeenCalled()
    expect(cookie).toContain(
      "sselfie_analytics_generation=33333333-3333-4333-8333-333333333333"
    )
    expect(cookie).toContain("Secure")
    expect(setItem).toHaveBeenCalledWith(
      "sselfie_analytics_tab_generation",
      "33333333-3333-4333-8333-333333333333"
    )
    expect(setItem).toHaveBeenCalledWith("sselfie_analytics_tab_rotation", "")
    expect(sendBeacon).toHaveBeenCalledTimes(1)
    expect(sendBeacon).toHaveBeenCalledWith("/api/analytics/event", expect.any(Blob))
    const beacon = sendBeacon.mock.calls[0][1] as Blob
    await expect(beacon.text()).resolves.toContain(
      '"analytics_generation":"33333333-3333-4333-8333-333333333333"'
    )

    cookie = "sselfie_analytics_generation=44444444-4444-4444-8444-444444444444"
    const { ensureAnalyticsBrowserIdentity } = await import("@/lib/analytics/client")
    await expect(ensureAnalyticsBrowserIdentity()).resolves.toMatchObject({ distinctId: null })
    expect(tabGeneration).toBe("33333333-3333-4333-8333-333333333333")

    cookie = "sselfie_analytics_generation=44444444-4444-4444-8444-444444444444"
    await expect(ensureAnalyticsBrowserIdentity()).resolves.toMatchObject({
      distinctId: "anon:33333333-3333-4333-8333-333333333333",
    })

    expect(request).toHaveBeenNthCalledWith(
      1,
      "/api/analytics/event",
      expect.objectContaining({
        headers: {
          "x-sselfie-analytics-generation": "33333333-3333-4333-8333-333333333333",
        },
      })
    )
    expect(request).toHaveBeenNthCalledWith(
      2,
      "/api/analytics/event",
      expect.objectContaining({
        headers: {
          "x-sselfie-analytics-generation": "33333333-3333-4333-8333-333333333333",
        },
      })
    )
    expect(cookie).toBe(
      "sselfie_analytics_generation=44444444-4444-4444-8444-444444444444"
    )
    expect(tabGeneration).toBe("33333333-3333-4333-8333-333333333333")
    expect(removeItem).not.toHaveBeenCalled()

    await trackAnalyticsEvent({ event: "checkout_start" })
    expect(sendBeacon).toHaveBeenCalledTimes(2)
    const checkoutBeacon = sendBeacon.mock.calls[1][1] as Blob
    await expect(checkoutBeacon.text()).resolves.toContain(
      '"analytics_generation":"33333333-3333-4333-8333-333333333333"'
    )
  })

  it("clears the tab generation when analytics identity is invalidated", async () => {
    const removeItem = vi.fn()
    vi.stubGlobal("window", { sessionStorage: { removeItem } })

    const { invalidateAnalyticsBrowserIdentity } = await import("@/lib/analytics/client")
    invalidateAnalyticsBrowserIdentity()

    expect(removeItem).toHaveBeenCalledWith("sselfie_analytics_tab_generation")
    expect(removeItem).toHaveBeenCalledWith("sselfie_analytics_tab_rotation")
  })

  it("discards a stale tab generation when the shared rotation epoch changes", async () => {
    const stored = new Map<string, string>([
      ["sselfie_analytics_tab_generation", "33333333-3333-4333-8333-333333333333"],
      ["sselfie_analytics_tab_rotation", ""],
    ])
    let cookie =
      "sselfie_analytics_generation=44444444-4444-4444-8444-444444444444; " +
      "sselfie_analytics_rotation=55555555-5555-4555-8555-555555555555"
    vi.stubGlobal("window", {
      location: { protocol: "https:" },
      sessionStorage: {
        getItem: (key: string) => stored.get(key) ?? null,
        setItem: (key: string, value: string) => stored.set(key, value),
      },
    })
    vi.stubGlobal("document", {
      get cookie() {
        return cookie
      },
      set cookie(value: string) {
        const nextPair = value.split(";", 1)[0]
        const nextName = nextPair.split("=", 1)[0]
        const existing = cookie
          .split(";")
          .map(part => part.trim())
          .filter(part => part && !part.startsWith(`${nextName}=`))
        cookie = [...existing, nextPair].join("; ")
      },
    })

    const {
      analyticsBrowserGeneration,
      analyticsBrowserRotationEpoch,
      isAnalyticsRotationEpochCurrent,
    } =
      await import("@/lib/analytics/client")

    expect(isAnalyticsRotationEpochCurrent("")).toBe(false)
    expect(analyticsBrowserGeneration()).toBe("44444444-4444-4444-8444-444444444444")
    expect(analyticsBrowserRotationEpoch()).toBe("55555555-5555-4555-8555-555555555555")
    expect(isAnalyticsRotationEpochCurrent("55555555-5555-4555-8555-555555555555")).toBe(
      true
    )
    expect(stored.get("sselfie_analytics_tab_generation")).toBe(
      "44444444-4444-4444-8444-444444444444"
    )
    expect(stored.get("sselfie_analytics_tab_rotation")).toBe(
      "55555555-5555-4555-8555-555555555555"
    )
  })

  it("publishes a rotated generation before exposing its new epoch", async () => {
    const cookieWrites: string[] = []
    const randomUUID = vi
      .fn()
      .mockReturnValueOnce("55555555-5555-4555-8555-555555555555")
      .mockReturnValueOnce("44444444-4444-4444-8444-444444444444")
    vi.stubGlobal("window", {
      crypto: { randomUUID },
      location: { protocol: "https:" },
      sessionStorage: { setItem: vi.fn() },
    })
    vi.stubGlobal("document", {
      get cookie() {
        return cookieWrites.join("; ")
      },
      set cookie(value: string) {
        cookieWrites.push(value)
      },
    })

    const { rotateAnalyticsBrowserIdentity } = await import("@/lib/analytics/client")
    expect(rotateAnalyticsBrowserIdentity()).toBe("44444444-4444-4444-8444-444444444444")

    expect(cookieWrites[0]).toContain(
      "sselfie_analytics_generation=44444444-4444-4444-8444-444444444444"
    )
    expect(cookieWrites[1]).toContain(
      "sselfie_analytics_rotation=55555555-5555-4555-8555-555555555555"
    )
  })

  it("does not cache a transient null identity", async () => {
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(Response.json({ distinctId: "user:recovered", resetPostHog: false }))
    vi.stubGlobal("fetch", request)

    const { ensureAnalyticsBrowserIdentity } = await import("@/lib/analytics/client")

    await expect(ensureAnalyticsBrowserIdentity()).resolves.toEqual({
      distinctId: null,
      resetPostHog: false,
      resetPostHogNonce: null,
    })
    await expect(ensureAnalyticsBrowserIdentity()).resolves.toEqual({
      distinctId: "user:recovered",
      resetPostHog: false,
      resetPostHogNonce: null,
    })
    expect(request).toHaveBeenCalledTimes(2)
  })

  it("invalidates an in-flight identity so logout bootstrap starts a fresh request", async () => {
    let resolveStaleIdentity!: (response: Response) => void
    const staleIdentityResponse = new Promise<Response>(resolve => {
      resolveStaleIdentity = resolve
    })
    const request = vi
      .fn<typeof fetch>()
      .mockImplementationOnce(() => staleIdentityResponse)
      .mockResolvedValueOnce(
        Response.json({
          distinctId: "anon:after-logout",
          resetPostHog: true,
          resetPostHogNonce: RESET_NONCE,
        })
      )
    vi.stubGlobal("fetch", request)

    const { ensureAnalyticsBrowserIdentity, invalidateAnalyticsBrowserIdentity } =
      await import("@/lib/analytics/client")
    const stale = ensureAnalyticsBrowserIdentity()
    invalidateAnalyticsBrowserIdentity()
    const fresh = ensureAnalyticsBrowserIdentity()

    expect(request).toHaveBeenCalledTimes(2)
    resolveStaleIdentity(Response.json({ distinctId: "user:before-logout", resetPostHog: false }))
    await expect(stale).resolves.toMatchObject({ distinctId: "user:before-logout" })
    await expect(fresh).resolves.toEqual({
      distinctId: "anon:after-logout",
      resetPostHog: true,
      resetPostHogNonce: RESET_NONCE,
    })
    await expect(ensureAnalyticsBrowserIdentity()).resolves.toMatchObject({
      distinctId: "anon:after-logout",
    })
    expect(request).toHaveBeenCalledTimes(2)
  })

  it("acknowledges a PostHog reset with a same-origin custom-header POST", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 200 }))
    vi.stubGlobal("fetch", request)

    const { acknowledgePostHogReset } = await import("@/lib/analytics/client")

    await expect(acknowledgePostHogReset(RESET_NONCE)).resolves.toBe(true)
    expect(request).toHaveBeenCalledWith("/api/analytics/event", {
      method: "POST",
      headers: { "x-sselfie-posthog-reset-ack": RESET_NONCE },
      credentials: "same-origin",
      cache: "no-store",
      keepalive: true,
      signal: expect.any(AbortSignal),
    })
  })

  it("does not send a reset acknowledgement without a valid nonce", async () => {
    const request = vi.fn<typeof fetch>()
    vi.stubGlobal("fetch", request)

    const { acknowledgePostHogReset } = await import("@/lib/analytics/client")

    await expect(acknowledgePostHogReset("1")).resolves.toBe(false)
    expect(request).not.toHaveBeenCalled()
  })
})
