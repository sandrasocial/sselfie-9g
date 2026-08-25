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

  it("registers lifecycle work before an unawaited caller can return", async () => {
    let providerCallback: (() => Promise<unknown>) | undefined
    mocks.after.mockImplementation(callback => {
      providerCallback = callback
    })
    let resolveNeon: ((value: unknown[]) => void) | undefined
    mocks.sql.mockReturnValue(
      new Promise(resolve => {
        resolveNeon = resolve
      })
    )

    const { logAnalyticsEvent } = await import("@/lib/analytics/events")
    const eventResult = logAnalyticsEvent({
      eventName: "suite_image_generated",
      userId: "user-123",
      properties: { provider: "replicate" },
    })

    expect(mocks.after).toHaveBeenCalledOnce()
    expect(mocks.capturePostHogEvent).not.toHaveBeenCalled()

    const providerResult = providerCallback?.()
    await vi.waitFor(() => expect(mocks.sql).toHaveBeenCalledOnce())
    expect(mocks.capturePostHogEvent).not.toHaveBeenCalled()

    resolveNeon?.([])
    await expect(eventResult).resolves.toEqual({ ok: true })
    await providerResult
    expect(mocks.capturePostHogEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventName: "suite_image_generated", userId: "user-123" })
    )
  })

  it("does not create a provider-only event when the Neon write fails", async () => {
    let providerCallback: (() => Promise<unknown>) | undefined
    mocks.after.mockImplementation(callback => {
      providerCallback = callback
    })
    mocks.sql.mockRejectedValue(new Error("neon unavailable"))

    const { logAnalyticsEvent } = await import("@/lib/analytics/events")
    await expect(
      logAnalyticsEvent({ eventName: "suite_image_generated", anonId: "anon-123" })
    ).resolves.toEqual({ ok: false, error: "neon unavailable" })

    expect(mocks.after).toHaveBeenCalledOnce()
    await providerCallback?.()
    expect(mocks.capturePostHogEvent).not.toHaveBeenCalled()
  })

  it("deduplicates a retried purchase before Neon and provider delivery", async () => {
    let providerCallback: (() => Promise<unknown>) | undefined
    mocks.after.mockImplementation(callback => {
      providerCallback = callback
    })
    mocks.sql.mockResolvedValue([])

    const { logAnalyticsEvent } = await import("@/lib/analytics/events")
    await expect(
      logAnalyticsEvent({
        eventName: "purchase",
        userId: "user-123",
        idempotencyKey: "purchase:pi_private_123",
        properties: { stripe_payment_id: "pi_private_123" },
      })
    ).resolves.toEqual({ ok: true })

    await providerCallback?.()
    expect(mocks.capturePostHogEvent).not.toHaveBeenCalled()
    const query = (mocks.sql.mock.calls[0][0] as TemplateStringsArray).join(" ")
    expect(query).toContain("ON CONFLICT (idempotency_key)")
    expect(query).toContain("RETURNING id")
    expect(mocks.sql.mock.calls[0].slice(1)).not.toContain("purchase:pi_private_123")
  })

  it("delivers the first idempotent purchase after storing only a hashed key", async () => {
    let providerCallback: (() => Promise<unknown>) | undefined
    mocks.after.mockImplementation(callback => {
      providerCallback = callback
    })
    mocks.sql.mockResolvedValue([{ id: 42 }])

    const { logAnalyticsEvent } = await import("@/lib/analytics/events")
    await expect(
      logAnalyticsEvent({
        eventName: "purchase",
        userId: "user-123",
        idempotencyKey: "purchase:pi_private_456",
        properties: { stripe_payment_id: "pi_private_456" },
      })
    ).resolves.toEqual({ ok: true })

    await providerCallback?.()
    expect(mocks.capturePostHogEvent).toHaveBeenCalledOnce()
    const values = mocks.sql.mock.calls[0].slice(1)
    expect(values).not.toContain("purchase:pi_private_456")
    expect(values).toContainEqual(expect.stringMatching(/^[a-f0-9]{64}$/))
  })

  it("delivers only the approved completion fact after durable persistence", async () => {
    let providerCallback: (() => Promise<unknown>) | undefined
    mocks.after.mockImplementation(callback => {
      providerCallback = callback
    })

    const { capturePersistedPostHogEvent } = await import("@/lib/analytics/events")
    capturePersistedPostHogEvent({
      eventName: "suite_ready_post_saved",
      userId: "user-123",
      properties: { image_count: 2 },
    })
    capturePersistedPostHogEvent({ eventName: "purchase", userId: "user-123" })

    expect(mocks.after).toHaveBeenCalledOnce()
    await providerCallback?.()
    expect(mocks.capturePostHogEvent).toHaveBeenCalledOnce()
    expect(mocks.capturePostHogEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventName: "suite_ready_post_saved", userId: "user-123" })
    )
  })
})
