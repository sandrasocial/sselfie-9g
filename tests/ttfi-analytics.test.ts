import { beforeEach, describe, expect, it, vi } from "vitest"

const mockLogAnalyticsEvent = vi.fn()
const mockSql = vi.fn()

vi.mock("@/lib/analytics/events", () => ({
  logAnalyticsEvent: mockLogAnalyticsEvent,
}))

vi.mock("@/lib/db", () => ({
  getDb: () => mockSql,
}))

describe("ttfi analytics helpers", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it("extracts the latest start timestamp from signup_to_first_gen start events", async () => {
    const { extractLatestTtfiStartTimestamp } = await import("@/lib/analytics/ttfi")
    const latest = extractLatestTtfiStartTimestamp([
      { created_at: "2026-02-28T10:00:00.000Z", properties: { stage: "complete" } },
      { created_at: "2026-02-28T10:02:00.000Z", properties: { stage: "start" } },
      { created_at: "2026-02-28T10:01:00.000Z", properties: { stage: "start" } },
    ])

    expect(latest?.toISOString()).toBe("2026-02-28T10:02:00.000Z")
  })

  it("computes TTFI seconds and minutes", async () => {
    const { buildTtfiCompletionMetrics } = await import("@/lib/analytics/ttfi")
    const metrics = buildTtfiCompletionMetrics({
      startAt: new Date("2026-02-28T10:00:00.000Z"),
      endAt: new Date("2026-02-28T10:05:00.000Z"),
    })

    expect(metrics.ttfi_seconds).toBe(300)
    expect(metrics.ttfi_minutes).toBe(5)
  })

  it("logs completion analytics only for first gallery image", async () => {
    const { logTtfiCompletionOnFirstGallerySave } = await import("@/lib/analytics/ttfi")

    mockSql.mockResolvedValueOnce([
      { created_at: "2026-02-28T10:00:00.000Z", properties: { stage: "start" } },
    ])

    const endAt = new Date("2026-02-28T10:05:00.000Z")

    const didLog = await logTtfiCompletionOnFirstGallerySave({
      userId: "user_123",
      source: "maya_check_generation",
      imageSource: "maya_chat",
      predictionId: "pred_123",
      isFirstGalleryImage: true,
      endAt,
    })

    expect(didLog).toBe(true)
    expect(mockLogAnalyticsEvent).toHaveBeenCalledTimes(1)
    expect(mockLogAnalyticsEvent).toHaveBeenCalledWith({
      eventName: "signup_to_first_gen",
      userId: "user_123",
      properties: expect.objectContaining({
        stage: "complete",
        source: "maya_check_generation",
        image_source: "maya_chat",
        prediction_id: "pred_123",
        ttfi_seconds: 300,
        ttfi_minutes: 5,
      }),
    })
  })

  it("does not log completion for non-first gallery images", async () => {
    const { logTtfiCompletionOnFirstGallerySave } = await import("@/lib/analytics/ttfi")

    const didLog = await logTtfiCompletionOnFirstGallerySave({
      userId: "user_123",
      source: "maya_check_generation",
      isFirstGalleryImage: false,
    })

    expect(didLog).toBe(false)
    expect(mockSql).not.toHaveBeenCalled()
    expect(mockLogAnalyticsEvent).not.toHaveBeenCalled()
  })
})
