// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({
  ensureAnalyticsSchema: vi.fn(),
  getDb: vi.fn(),
  checkRateLimit: vi.fn(),
  createServerClient: vi.fn(),
}))

vi.mock("server-only", () => ({}))
vi.mock("@/lib/analytics/schema", () => ({
  ensureAnalyticsSchema: mocks.ensureAnalyticsSchema,
}))
vi.mock("@/lib/db/client", () => ({ getDb: mocks.getDb }))
vi.mock("@/lib/rate-limit-api", () => ({ checkRateLimit: mocks.checkRateLimit }))
vi.mock("@/lib/supabase/server", () => ({ createServerClient: mocks.createServerClient }))
vi.mock("@/lib/user-mapping", () => ({ getUserByAuthId: vi.fn() }))

describe("public analytics route server-only event boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.checkRateLimit.mockResolvedValue({ success: true })
    mocks.createServerClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    })
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
