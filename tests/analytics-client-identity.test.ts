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

  it("sends a navigation-safe beacon without waiting for identity bootstrap", async () => {
    const identityResponse = new Promise<Response>(() => {})
    const request = vi.fn<typeof fetch>().mockImplementation(() => identityResponse)
    const sendBeacon = vi.fn().mockReturnValue(true)
    vi.stubGlobal("fetch", request)
    vi.stubGlobal("navigator", { sendBeacon })
    vi.stubGlobal("window", {
      location: { pathname: "/vault-maya", search: "?utm_source=email" },
    })
    vi.stubGlobal("document", {
      cookie: "sselfie_analytics_generation=test-generation",
    })

    const { ensureAnalyticsBrowserIdentity, trackAnalyticsEvent } =
      await import("@/lib/analytics/client")
    void ensureAnalyticsBrowserIdentity()

    await trackAnalyticsEvent({
      event: "vault_maya_landing_cta_clicked",
      navigationSafe: true,
    })

    expect(request).toHaveBeenCalledTimes(1)
    expect(sendBeacon).toHaveBeenCalledTimes(1)
    expect(sendBeacon).toHaveBeenCalledWith("/api/analytics/event", expect.any(Blob))
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
