import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  capturePersistedPostHogEvent: vi.fn(),
  ensureAnalyticsSchema: vi.fn(),
  transaction: vi.fn(),
}))

vi.mock("@/lib/analytics/schema", () => ({
  ensureAnalyticsSchema: mocks.ensureAnalyticsSchema,
}))
vi.mock("@/lib/analytics/events", () => ({
  capturePersistedPostHogEvent: mocks.capturePersistedPostHogEvent,
}))
vi.mock("server-only", () => ({}))
vi.mock("@/lib/db/client", () => ({
  sql: { transaction: mocks.transaction },
}))

type Query = { text: string; values: unknown[] }

describe("atomic Maya ready-post persistence", () => {
  const queries: Query[] = []

  beforeEach(() => {
    vi.clearAllMocks()
    queries.length = 0
    mocks.ensureAnalyticsSchema.mockResolvedValue(undefined)
    mocks.transaction.mockImplementation(async (factory: (tx: any) => unknown[]) => {
      const tx = (strings: TemplateStringsArray, ...values: unknown[]) => {
        const query = { text: strings.join("?"), values }
        queries.push(query)
        return query
      }
      factory(tx)
      return [
        [],
        [],
        [
          {
            position: 4,
            scheduled_at: "2026-08-24",
            already_placed: false,
          },
        ],
      ]
    })
  })

  it("locks first, resolves ordered owned assets, and commits the Calendar row with one new fact", async () => {
    const { saveMayaReadyPost } = await import("@/lib/app-v3/maya/ready-post")
    await expect(
      saveMayaReadyPost({
        userId: "member-123",
        assetIds: [88, 89],
        finishedCaption: "The exact caption.\n\nKeep this spacing.",
        conceptTitle: "The finished post",
        periodMonth: "2026-08",
        feedStyle: "editorial",
        feedStyleVariationId: "editorial-v1",
      })
    ).resolves.toEqual({
      position: 4,
      scheduledAt: "2026-08-24",
      caption: "The exact caption.\n\nKeep this spacing.",
      alreadyPlaced: false,
    })

    expect(queries).toHaveLength(3)
    expect(queries[0].text).toContain("pg_advisory_xact_lock")
    expect(queries[0].text).not.toContain("analytics_events")
    expect(queries[1].text).toContain("INSERT INTO feed_layouts")
    expect(queries[1].text).toContain("FROM ai_images")
    expect(queries[1].text).toContain("id = ANY(")
    expect(queries[1].text).not.toContain("INSERT INTO feed_posts")
    expect(queries[2].text).toContain("INNER JOIN ai_images image")
    expect(queries[2].text).toContain("image.user_id =")
    expect(queries[2].text).toContain("jsonb_agg(image_url ORDER BY ordinality)")
    expect(queries[2].text).toContain("UPDATE feed_posts")
    expect(queries[2].text).toContain("INSERT INTO feed_posts")
    expect(queries[2].text).toContain("'completed', assets.primary_image_url")
    expect(queries[2].text).toContain("INNER JOIN feed_posts post")
    expect(queries[2].text).toContain("post.caption =")
    expect(queries[2].text).toContain("post.media_urls")
    expect(queries[2].text).toContain("INSERT INTO analytics_events")
    expect(queries[2].text).toContain("'suite_ready_post_saved'")
    expect(queries[2].text).toContain("'ready_post_key', ?::text")
    expect(mocks.capturePersistedPostHogEvent).toHaveBeenCalledWith({
      eventName: "suite_ready_post_saved",
      idempotencyKey: expect.stringMatching(/^ready-post:[a-f0-9]{64}$/),
      userId: "member-123",
      path: "/app",
      properties: { image_count: 2, is_rerun: false },
    })
  })

  it("uses the complete media-and-caption fingerprint as the replay identity", async () => {
    const { normalizeReadyPostInput } = await import("@/lib/app-v3/maya/ready-post")
    const base = {
      userId: "member-123",
      assetIds: [88, 89],
      finishedCaption: "Caption",
      periodMonth: "2026-08",
      feedStyle: "editorial",
    }
    const first = normalizeReadyPostInput(base)
    expect(normalizeReadyPostInput({ ...base }).readyPostKey).toBe(first.readyPostKey)
    expect(normalizeReadyPostInput({ ...base, assetIds: [88, 90] }).readyPostKey).not.toBe(
      first.readyPostKey
    )
    expect(normalizeReadyPostInput({ ...base, finishedCaption: "Changed" }).readyPostKey).not.toBe(
      first.readyPostKey
    )
  })

  it("rejects empty captions and invalid, duplicate, or surplus assets before the transaction", async () => {
    const { saveMayaReadyPost } = await import("@/lib/app-v3/maya/ready-post")
    const base = {
      userId: "member-123",
      finishedCaption: "Caption",
      conceptTitle: "Post",
      periodMonth: "2026-08",
      feedStyle: "editorial",
    }
    await expect(saveMayaReadyPost({ ...base, assetIds: [88, 88] })).rejects.toThrow("distinct")
    await expect(
      saveMayaReadyPost({ ...base, assetIds: Array.from({ length: 11 }, (_, i) => i + 1) })
    ).rejects.toThrow("one to ten")
    await expect(
      saveMayaReadyPost({ ...base, assetIds: [88], finishedCaption: "   " })
    ).rejects.toThrow("finished caption")
    expect(mocks.transaction).not.toHaveBeenCalled()
  })

  it("propagates a transaction failure so neither the post nor completion fact can commit", async () => {
    mocks.transaction.mockRejectedValueOnce(new Error("analytics insert failed"))
    const { saveMayaReadyPost } = await import("@/lib/app-v3/maya/ready-post")
    await expect(
      saveMayaReadyPost({
        userId: "member-123",
        assetIds: [88],
        finishedCaption: "Caption",
        periodMonth: "2026-08",
        feedStyle: "editorial",
      })
    ).rejects.toThrow("analytics insert failed")
  })

  it("returns the original receipt when the durable business key already exists", async () => {
    mocks.transaction.mockImplementationOnce(async (factory: (tx: any) => unknown[]) => {
      const tx = (strings: TemplateStringsArray, ...values: unknown[]) => {
        const query = { text: strings.join("?"), values }
        queries.push(query)
        return query
      }
      factory(tx)
      return [[], [], [{ position: 4, scheduled_at: "2026-08-24", already_placed: true }]]
    })
    const { saveMayaReadyPost } = await import("@/lib/app-v3/maya/ready-post")
    await expect(
      saveMayaReadyPost({
        userId: "member-123",
        assetIds: [88],
        finishedCaption: "Caption",
        periodMonth: "2026-08",
        feedStyle: "editorial",
      })
    ).resolves.toMatchObject({ alreadyPlaced: true, position: 4 })
    expect(mocks.capturePersistedPostHogEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: "suite_ready_post_saved",
        idempotencyKey: expect.stringMatching(/^ready-post:[a-f0-9]{64}$/),
        properties: { image_count: 1, is_rerun: true },
      })
    )
  })
})
