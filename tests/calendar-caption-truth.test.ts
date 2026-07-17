import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  sql: vi.fn(),
  generateInstagramCaption: vi.fn(),
}))

vi.mock("@/lib/db/client", () => ({ sql: mocks.sql }))
vi.mock("@/lib/feed-planner/caption-writer", () => ({
  generateInstagramCaption: mocks.generateInstagramCaption,
  shouldRegenerateCaption: () => true,
  extractHashtagsFromCaption: () => [],
}))

function queryText(strings: TemplateStringsArray): string {
  return Array.from(strings).join("__VALUE__")
}

describe("Calendar caption truth", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.sql.mockImplementation((strings: TemplateStringsArray) => {
      const query = queryText(strings)
      if (query.includes("FROM feed_layouts")) return [{ id: 12 }]
      if (query.includes("FROM feed_posts") && query.includes("SELECT")) {
        return [
          {
            id: 91,
            position: 2,
            prompt: null,
            content_pillar: "Useful lesson",
            post_type: "portrait",
            caption: null,
          },
        ]
      }
      if (query.includes("FROM user_personal_brand")) {
        return [{ business_type: "Coach", target_audience: "women", content_pillars: [] }]
      }
      return []
    })
  })

  it("leaves the caption unfinished when the provider fails instead of saving filler", async () => {
    mocks.generateInstagramCaption.mockRejectedValue(new Error("provider unavailable"))
    const { generateAndStoreFeedCaptions } =
      await import("@/lib/feed-planner/generate-feed-captions")

    const result = await generateAndStoreFeedCaptions({ feedId: 12, userId: 7 })

    expect(result.captionsFailed).toBe(1)
    expect(result.failedPostIds).toEqual([91])
    expect(
      mocks.sql.mock.calls.some(([strings]) => queryText(strings).includes("UPDATE feed_posts"))
    ).toBe(false)
  })

  it("never turns an empty model response into a made-up fallback caption", async () => {
    mocks.generateInstagramCaption.mockResolvedValue({ caption: "" })
    const { generateAndStoreFeedCaptions } =
      await import("@/lib/feed-planner/generate-feed-captions")

    const result = await generateAndStoreFeedCaptions({ feedId: 12, userId: 7 })

    expect(result.captionsFailed).toBe(1)
    expect(
      mocks.sql.mock.calls.some(([strings]) => queryText(strings).includes("UPDATE feed_posts"))
    ).toBe(false)
  })

  it("marks a personal slot as needing the member's story instead of guessing one", async () => {
    mocks.sql.mockImplementation((strings: TemplateStringsArray) => {
      const query = queryText(strings)
      if (query.includes("FROM feed_layouts")) return [{ id: 12 }]
      if (query.includes("FROM feed_posts") && query.includes("SELECT")) {
        return [
          {
            id: 90,
            position: 1,
            prompt: null,
            content_pillar: "Personal perspective",
            post_type: "portrait",
            caption: null,
          },
        ]
      }
      if (query.includes("FROM user_personal_brand")) return [{ content_pillars: [] }]
      return []
    })
    const { generateAndStoreFeedCaptions } =
      await import("@/lib/feed-planner/generate-feed-captions")

    const result = await generateAndStoreFeedCaptions({ feedId: 12, userId: 7 })

    expect(result.captionsNeedStory).toBe(1)
    expect(result.needsStoryPostIds).toEqual([90])
    expect(mocks.generateInstagramCaption).not.toHaveBeenCalled()
  })
})
