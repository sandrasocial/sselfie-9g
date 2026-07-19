import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  getUserByAuthId: vi.fn(),
  generateInstagramCaption: vi.fn(),
  sql: vi.fn(),
}))

vi.mock("@/lib/auth-helper", () => ({
  getAuthenticatedUser: mocks.auth,
}))

vi.mock("@/lib/user-mapping", () => ({
  getUserByAuthId: mocks.getUserByAuthId,
}))

vi.mock("@/lib/db/client", () => ({
  sql: mocks.sql,
}))

vi.mock("@/lib/feed-planner/caption-writer", () => ({
  generateInstagramCaption: mocks.generateInstagramCaption,
}))

function queryText(strings: TemplateStringsArray): string {
  return Array.from(strings).join("__VALUE__")
}

describe("Calendar ready-post captions", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    mocks.auth.mockResolvedValue({ user: { id: "auth-77" }, error: null })
    mocks.getUserByAuthId.mockResolvedValue({ id: 77 })
    mocks.generateInstagramCaption.mockResolvedValue({
      caption: "A personal, ready-to-post caption.",
    })
  })

  it("drafts a caption when a member adds a photo to an empty manual post", async () => {
    const queries: string[] = []
    const values: unknown[][] = []
    mocks.sql.mockImplementation((strings: TemplateStringsArray, ...params: unknown[]) => {
      const query = queryText(strings)
      queries.push(query)
      values.push(params)
      if (query.includes("FROM feed_layouts")) return [{ id: 12, user_id: 77 }]
      if (query.includes("FROM feed_posts") && query.includes("SELECT")) {
        return [
          {
            id: 9,
            feed_layout_id: 12,
            position: 2,
            post_type: "selfie",
            content_pillar: null,
            caption: null,
          },
        ]
      }
      if (query.includes("FROM user_personal_brand")) {
        return [
          {
            brand_voice: "warm",
            brand_vibe: "editorial",
            business_type: "coach",
            target_audience: "women",
            content_pillars: [],
          },
        ]
      }
      if (query.includes("UPDATE feed_posts")) {
        return [
          {
            id: 9,
            image_url: "https://example.com/photo.jpg",
            caption: "A personal, ready-to-post caption.",
          },
        ]
      }
      return []
    })

    const { POST } = await import("@/app/api/feed/[feedId]/replace-post-image/route")
    const response = await POST(
      new Request("http://localhost/api/feed/12/replace-post-image", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ postId: 9, imageUrl: "https://example.com/photo.jpg" }),
      }),
      { params: Promise.resolve({ feedId: "12" }) }
    )

    expect(response.status).toBe(200)
    expect(mocks.generateInstagramCaption).toHaveBeenCalledTimes(1)
    expect(queries.some(query => query.includes("CASE") && query.includes("caption"))).toBe(true)
    expect(values.flat()).toContain("A personal, ready-to-post caption.")
    await expect(response.json()).resolves.toMatchObject({ captionStatus: "ready" })
  })

  it("preserves a caption the member already wrote", async () => {
    mocks.sql.mockImplementation((strings: TemplateStringsArray) => {
      const query = queryText(strings)
      if (query.includes("FROM feed_layouts")) return [{ id: 12, user_id: 77 }]
      if (query.includes("FROM feed_posts") && query.includes("SELECT")) {
        return [
          {
            id: 9,
            feed_layout_id: 12,
            position: 2,
            post_type: "selfie",
            content_pillar: "Story",
            caption: "My own words",
          },
        ]
      }
      if (query.includes("UPDATE feed_posts")) {
        return [{ id: 9, image_url: "https://example.com/photo.jpg", caption: "My own words" }]
      }
      return []
    })

    const { POST } = await import("@/app/api/feed/[feedId]/replace-post-image/route")
    const response = await POST(
      new Request("http://localhost/api/feed/12/replace-post-image", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ postId: 9, imageUrl: "https://example.com/photo.jpg" }),
      }),
      { params: Promise.resolve({ feedId: "12" }) }
    )

    expect(response.status).toBe(200)
    expect(mocks.generateInstagramCaption).not.toHaveBeenCalled()
    await expect(response.json()).resolves.toMatchObject({ captionStatus: "preserved" })
  })

  it("keeps carousel slides ordered and uses slide one as the cover", async () => {
    const values: unknown[][] = []
    mocks.sql.mockImplementation((strings: TemplateStringsArray, ...params: unknown[]) => {
      const query = queryText(strings)
      values.push(params)
      if (query.includes("FROM feed_layouts")) return [{ id: 12, user_id: 77 }]
      if (query.includes("FROM feed_posts") && query.includes("SELECT")) {
        return [
          {
            id: 9,
            feed_layout_id: 12,
            position: 2,
            post_type: "detail",
            content_pillar: "Teaching",
            caption: "A useful carousel",
          },
        ]
      }
      if (query.includes("UPDATE feed_posts")) {
        return [
          {
            id: 9,
            image_url: "https://example.com/slide-1.jpg",
            media_urls: [
              "https://example.com/slide-1.jpg",
              "https://example.com/slide-2.jpg",
            ],
            caption: "A useful carousel",
          },
        ]
      }
      return []
    })

    const { POST } = await import("@/app/api/feed/[feedId]/replace-post-image/route")
    const response = await POST(
      new Request("http://localhost/api/feed/12/replace-post-image", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          postId: 9,
          imageUrl: "https://example.com/slide-1.jpg",
          imageUrls: [
            "https://example.com/slide-1.jpg",
            "https://example.com/slide-2.jpg",
          ],
        }),
      }),
      { params: Promise.resolve({ feedId: "12" }) }
    )

    expect(response.status).toBe(200)
    expect(values.flat()).toContain("https://example.com/slide-1.jpg")
    expect(values.flat()).toContain(
      JSON.stringify([
        "https://example.com/slide-1.jpg",
        "https://example.com/slide-2.jpg",
      ])
    )
    await expect(response.json()).resolves.toMatchObject({
      post: {
        image_url: "https://example.com/slide-1.jpg",
        media_urls: ["https://example.com/slide-1.jpg", "https://example.com/slide-2.jpg"],
      },
    })
  })

  it("still saves the photo when caption generation fails", async () => {
    mocks.generateInstagramCaption.mockRejectedValue(new Error("caption provider unavailable"))
    mocks.sql.mockImplementation((strings: TemplateStringsArray) => {
      const query = queryText(strings)
      if (query.includes("FROM feed_layouts")) return [{ id: 12, user_id: 77 }]
      if (query.includes("FROM feed_posts") && query.includes("SELECT")) {
        return [
          {
            id: 9,
            feed_layout_id: 12,
            position: 2,
            post_type: "selfie",
            content_pillar: null,
            caption: null,
          },
        ]
      }
      if (query.includes("FROM user_personal_brand")) return []
      if (query.includes("UPDATE feed_posts")) {
        return [{ id: 9, image_url: "https://example.com/photo.jpg", caption: null }]
      }
      return []
    })

    const { POST } = await import("@/app/api/feed/[feedId]/replace-post-image/route")
    const response = await POST(
      new Request("http://localhost/api/feed/12/replace-post-image", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ postId: 9, imageUrl: "https://example.com/photo.jpg" }),
      }),
      { params: Promise.resolve({ feedId: "12" }) }
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      captionStatus: "unavailable",
    })
  })

  it("rejects a late Maya result when a newer Calendar request owns the slot", async () => {
    let updateCalled = false
    mocks.sql.mockImplementation((strings: TemplateStringsArray) => {
      const query = queryText(strings)
      if (query.includes("FROM feed_layouts")) return [{ id: 12, user_id: 77 }]
      if (query.includes("FROM feed_posts") && query.includes("SELECT")) {
        return [
          {
            id: 9,
            feed_layout_id: 12,
            position: 2,
            post_type: "selfie",
            content_pillar: "Authority",
            caption: "A planned post",
            prediction_id: "maya:new-request-123",
          },
        ]
      }
      if (query.includes("UPDATE feed_posts")) updateCalled = true
      return []
    })

    const { POST } = await import("@/app/api/feed/[feedId]/replace-post-image/route")
    const response = await POST(
      new Request("http://localhost/api/feed/12/replace-post-image", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          postId: 9,
          imageUrl: "https://example.com/late.jpg",
          generationRequestId: "old-request-123",
        }),
      }),
      { params: Promise.resolve({ feedId: "12" }) }
    )

    expect(response.status).toBe(409)
    expect(updateCalled).toBe(false)
    expect(mocks.generateInstagramCaption).not.toHaveBeenCalled()
  })

  it("does not fail image generation when the automatic caption cannot be saved", async () => {
    mocks.sql.mockImplementation((strings: TemplateStringsArray) => {
      const query = queryText(strings)
      if (query.includes("FROM user_personal_brand")) return []
      if (query.includes("FROM feed_posts") && query.includes("SELECT")) return []
      if (query.includes("UPDATE feed_posts")) throw new Error("database write unavailable")
      return []
    })

    const { ensureReadyPostCaption } = await import("@/lib/feed-planner/ready-post-caption")
    await expect(
      ensureReadyPostCaption({
        userId: 77,
        post: {
          id: 9,
          feed_layout_id: 12,
          position: 2,
          post_type: "selfie",
          caption: null,
        },
      })
    ).resolves.toEqual({ caption: null, status: "unavailable" })
  })
})
