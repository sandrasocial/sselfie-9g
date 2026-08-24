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
    expect(body.distinctId).toMatch(/^anon:[0-9a-f-]{36}$/)
    expect(response.headers.get("cache-control")).toBe("private, no-store")
    expect(response.headers.get("set-cookie")).toContain("sselfie_anon_id=")
    expect(response.headers.get("set-cookie")).toContain("HttpOnly")
  })

  it("joins an authenticated browser to the server-side Neon identity", async () => {
    mocks.createServerClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "auth-123" } } }) },
    })
    mocks.getUserByAuthId.mockResolvedValue({ id: "neon-456", email: "private@example.com" })

    const { GET } = await import("@/app/api/analytics/event/route")
    const response = await GET(new NextRequest("http://localhost/api/analytics/event"))

    await expect(response.json()).resolves.toEqual({ distinctId: "user:neon-456" })
    expect(mocks.getUserByAuthId).toHaveBeenCalledWith("auth-123")
    expect(response.headers.get("set-cookie")).not.toContain("private@example.com")
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
})
