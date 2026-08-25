// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({
  ensureAnalyticsSchema: vi.fn(),
  getDb: vi.fn(),
  checkRateLimit: vi.fn(),
  createServerClient: vi.fn(),
  getUserByAuthId: vi.fn(),
}))

vi.mock("server-only", () => ({}))
vi.mock("@/lib/analytics/schema", () => ({
  ensureAnalyticsSchema: mocks.ensureAnalyticsSchema,
}))
vi.mock("@/lib/db/client", () => ({ getDb: mocks.getDb }))
vi.mock("@/lib/rate-limit-api", () => ({ checkRateLimit: mocks.checkRateLimit }))
vi.mock("@/lib/supabase/server", () => ({ createServerClient: mocks.createServerClient }))
vi.mock("@/lib/user-mapping", () => ({ getUserByAuthId: mocks.getUserByAuthId }))

describe("public analytics route server-only event boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.checkRateLimit.mockResolvedValue({ success: true })
    mocks.createServerClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    })
  })

  it("returns a privacy-safe anonymous browser identity and durable cookie", async () => {
    const { GET } = await import("@/app/api/analytics/event/route")
    const response = await GET(new NextRequest("http://localhost/api/analytics/event"))

    const body = await response.json()
    expect(body).toMatchObject({ resetPostHog: false })
    expect(body.distinctId).toMatch(/^anon:[0-9a-f-]{36}$/)
    expect(response.headers.get("cache-control")).toBe("private, no-store")
    expect(response.headers.get("set-cookie")).toContain("sselfie_anon_id=")
    expect(response.headers.get("set-cookie")).toContain("HttpOnly")
  })

  it("rotates the anonymous identity after logout or account switching", async () => {
    const { GET } = await import("@/app/api/analytics/event/route")
    const response = await GET(
      new NextRequest("http://localhost/api/analytics/event?rotate_anonymous=1", {
        headers: { cookie: "sselfie_anon_id=old-shared-browser-id" },
      })
    )

    const body = await response.json()
    expect(body.distinctId).toMatch(/^anon:[0-9a-f-]{36}$/)
    expect(body.distinctId).not.toContain("old-shared-browser-id")
    expect(response.headers.get("set-cookie")).toContain("sselfie_anon_id=")
    expect(response.headers.get("set-cookie")).not.toContain("old-shared-browser-id")
  })

  it("joins an authenticated browser to the server-side Neon identity", async () => {
    mocks.createServerClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "auth-123" } } }) },
    })
    mocks.getUserByAuthId.mockResolvedValue({ id: "neon-456", email: "private@example.com" })

    const { GET } = await import("@/app/api/analytics/event/route")
    const response = await GET(new NextRequest("http://localhost/api/analytics/event"))

    await expect(response.json()).resolves.toEqual({
      distinctId: "user:neon-456",
      resetPostHog: false,
    })
    expect(mocks.getUserByAuthId).toHaveBeenCalledWith("auth-123")
    expect(response.headers.get("set-cookie")).not.toContain("private@example.com")
  })

  it("keeps capture disabled when an authenticated user cannot be mapped", async () => {
    mocks.createServerClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "auth-123" } } }) },
    })
    mocks.getUserByAuthId.mockRejectedValue(new Error("mapping unavailable"))

    const { GET } = await import("@/app/api/analytics/event/route")
    const response = await GET(
      new NextRequest("http://localhost/api/analytics/event", {
        headers: { cookie: "sselfie_anon_id=existing-anon" },
      })
    )

    await expect(response.json()).resolves.toEqual({
      distinctId: null,
      resetPostHog: false,
    })
    expect(response.headers.get("cache-control")).toBe("private, no-store")
    expect(response.headers.get("set-cookie")).toBeNull()
  })

  it("keeps GET and POST capture disabled when Supabase returns an auth error", async () => {
    mocks.createServerClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: new Error("auth provider unavailable"),
        }),
      },
    })

    const { GET, POST } = await import("@/app/api/analytics/event/route")
    const getResponse = await GET(new NextRequest("http://localhost/api/analytics/event"))
    const postResponse = await POST(
      new NextRequest("http://localhost/api/analytics/event", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ event: "landing_page_viewed" }),
      })
    )

    await expect(getResponse.json()).resolves.toEqual({
      distinctId: null,
      resetPostHog: false,
    })
    await expect(postResponse.json()).resolves.toEqual({
      ok: true,
      accepted: false,
      reason: "Identity unavailable",
    })
    expect(getResponse.headers.get("set-cookie")).toBeNull()
    expect(postResponse.headers.get("set-cookie")).toBeNull()
    expect(mocks.checkRateLimit).not.toHaveBeenCalled()
    expect(mocks.getDb).not.toHaveBeenCalled()
  })

  it("keeps the HTTP-only PostHog reset signal until the SDK acknowledges it", async () => {
    const { GET } = await import("@/app/api/analytics/event/route")
    const response = await GET(
      new NextRequest("http://localhost/api/analytics/event", {
        headers: {
          cookie: "sselfie_anon_id=rotated-id; sselfie_posthog_reset=1",
        },
      })
    )

    await expect(response.json()).resolves.toEqual({
      distinctId: "anon:rotated-id",
      resetPostHog: true,
    })
    expect(response.headers.get("set-cookie")).toBeNull()
  })

  it("does not clear the PostHog reset signal through a top-level GET", async () => {
    const { GET } = await import("@/app/api/analytics/event/route")
    const response = await GET(
      new NextRequest("http://localhost/api/analytics/event?ack_posthog_reset=1", {
        headers: {
          cookie: "sselfie_anon_id=rotated-id; sselfie_posthog_reset=1",
        },
      })
    )

    expect(await response.json()).toMatchObject({ resetPostHog: true })
    expect(response.headers.get("set-cookie")).toBeNull()
  })

  it("clears the PostHog reset signal only for a same-origin acknowledgement POST", async () => {
    const { POST } = await import("@/app/api/analytics/event/route")
    const response = await POST(
      new NextRequest("http://localhost/api/analytics/event", {
        method: "POST",
        headers: {
          cookie: "sselfie_anon_id=rotated-id; sselfie_posthog_reset=1",
          origin: "http://localhost",
          "x-sselfie-posthog-reset-ack": "1",
        },
      })
    )

    await expect(response.json()).resolves.toEqual({ ok: true })
    expect(response.headers.get("set-cookie")).toContain("sselfie_posthog_reset=")
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0")
  })

  it("clears an originless acknowledgement with a same-site browser signal", async () => {
    const { POST } = await import("@/app/api/analytics/event/route")
    const response = await POST(
      new NextRequest("http://localhost/api/analytics/event", {
        method: "POST",
        headers: {
          cookie: "sselfie_anon_id=rotated-id; sselfie_posthog_reset=1",
          "sec-fetch-site": "same-origin",
          "x-sselfie-posthog-reset-ack": "1",
        },
      })
    )

    await expect(response.json()).resolves.toEqual({ ok: true })
    expect(response.headers.get("set-cookie")).toContain("sselfie_posthog_reset=")
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0")
  })

  it("rejects an originless acknowledgement without a same-site browser signal", async () => {
    const { POST } = await import("@/app/api/analytics/event/route")
    const response = await POST(
      new NextRequest("http://localhost/api/analytics/event", {
        method: "POST",
        headers: {
          cookie: "sselfie_posthog_reset=1",
          "x-sselfie-posthog-reset-ack": "1",
        },
      })
    )

    expect(response.status).toBe(403)
    expect(response.headers.get("set-cookie")).toBeNull()
  })

  it("rejects a cross-origin reset acknowledgement without clearing the marker", async () => {
    const { POST } = await import("@/app/api/analytics/event/route")
    const response = await POST(
      new NextRequest("http://localhost/api/analytics/event", {
        method: "POST",
        headers: {
          cookie: "sselfie_posthog_reset=1",
          origin: "https://attacker.example",
          "x-sselfie-posthog-reset-ack": "1",
        },
      })
    )

    expect(response.status).toBe(403)
    expect(response.headers.get("set-cookie")).toBeNull()
  })

  it("rejects a forged durable Calendar completion before any analytics write", async () => {
    const { POST } = await import("@/app/api/analytics/event/route")
    const response = await POST(
      new NextRequest("http://localhost/api/analytics/event", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          event: "suite_ready_post_saved",
          properties: {
            ready_post_key: "forged",
            calendar_position: 1,
            scheduled_at: "2026-08-21",
          },
        }),
      })
    )

    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      accepted: false,
      reason: "Unsupported event",
    })
    expect(mocks.ensureAnalyticsSchema).not.toHaveBeenCalled()
    expect(mocks.getDb).not.toHaveBeenCalled()
  })

  it("rejects forged canonical and product-specific purchase revenue before any write", async () => {
    const { POST } = await import("@/app/api/analytics/event/route")
    for (const eventName of [
      "purchase",
      "prompt_vault_checkout_success",
      "starter_kit_checkout_success",
    ]) {
      const response = await POST(
        new NextRequest("http://localhost/api/analytics/event", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            event: eventName,
            properties: { value: 999999, product_type: "forged" },
          }),
        })
      )

      await expect(response.json()).resolves.toEqual({
        ok: true,
        accepted: false,
        reason: "Unsupported event",
      })
    }
    expect(mocks.ensureAnalyticsSchema).not.toHaveBeenCalled()
    expect(mocks.getDb).not.toHaveBeenCalled()
  })
})
