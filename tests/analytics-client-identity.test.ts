// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest"

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
    })
    await tracking

    expect(request).toHaveBeenCalledTimes(2)
    expect(request.mock.calls[1][0]).toBe("/api/analytics/event")
    expect(request.mock.calls[1][1]).toMatchObject({ method: "POST" })
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
    })
    await expect(ensureAnalyticsBrowserIdentity()).resolves.toEqual({
      distinctId: "user:recovered",
      resetPostHog: false,
    })
    expect(request).toHaveBeenCalledTimes(2)
  })
})
