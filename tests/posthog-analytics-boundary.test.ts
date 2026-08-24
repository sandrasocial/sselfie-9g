// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  after: vi.fn(),
  capturePostHogEvent: vi.fn(),
  ensureAnalyticsSchema: vi.fn(),
  getDb: vi.fn(),
  sql: vi.fn(),
}))

vi.mock("server-only", () => ({}))
vi.mock("next/server", () => ({ after: mocks.after }))
vi.mock("@/lib/analytics/schema", () => ({
  ensureAnalyticsSchema: mocks.ensureAnalyticsSchema,
}))
vi.mock("@/lib/db/client", () => ({ getDb: mocks.getDb }))
vi.mock("@/lib/analytics/posthog", async importOriginal => {
  const actual = await importOriginal<typeof import("@/lib/analytics/posthog")>()
  return { ...actual, capturePostHogEvent: mocks.capturePostHogEvent }
})

describe("Neon-to-PostHog delivery boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.ensureAnalyticsSchema.mockResolvedValue(undefined)
    mocks.getDb.mockReturnValue(mocks.sql)
    mocks.sql.mockResolvedValue([])
    mocks.capturePostHogEvent.mockResolvedValue({ sent: true })
  })

  it("commits the Neon event before scheduling detached provider delivery", async () => {
    let providerCallback: (() => unknown) | undefined
    mocks.after.mockImplementation(callback => {
      providerCallback = callback
    })

    const { logAnalyticsEvent } = await import("@/lib/analytics/events")
    await expect(
      logAnalyticsEvent({
        eventName: "suite_image_generated",
        userId: "user-123",
        properties: { provider: "replicate" },
      })
    ).resolves.toEqual({ ok: true })

    expect(mocks.sql).toHaveBeenCalledOnce()
    expect(mocks.after).toHaveBeenCalledOnce()
    expect(mocks.capturePostHogEvent).not.toHaveBeenCalled()

    await providerCallback?.()
    expect(mocks.capturePostHogEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventName: "suite_image_generated", userId: "user-123" })
    )
  })

  it("does not create a provider-only event when the Neon write fails", async () => {
    mocks.sql.mockRejectedValue(new Error("neon unavailable"))

    const { logAnalyticsEvent } = await import("@/lib/analytics/events")
    await expect(
      logAnalyticsEvent({ eventName: "suite_image_generated", anonId: "anon-123" })
    ).resolves.toEqual({ ok: false, error: "neon unavailable" })

    expect(mocks.after).not.toHaveBeenCalled()
    expect(mocks.capturePostHogEvent).not.toHaveBeenCalled()
  })
})
