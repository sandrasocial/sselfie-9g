import { beforeEach, describe, expect, it, vi } from "vitest"

const mockSql = vi.fn()

vi.mock("@/lib/db/client", () => ({
  sql: mockSql,
}))

vi.mock("@/lib/auth/with-auth", () => ({
  withAuth: (handler: any) => {
    return async () => handler({ user: { id: "42" } })
  },
}))

describe("GET /api/studio/hub contract", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    delete process.env.NEXT_PUBLIC_FEATURE_MAYA_LANDING_PAGES_UI
  })

  it("returns page drafts alongside recent photos and videos when Maya pages are enabled", async () => {
    mockSql
      .mockResolvedValueOnce([
        {
          id: 9,
          title: "Launch Feed",
          status: "saved",
          layout_type: "grid_3x3",
          image_count: 7,
          post_count: 9,
          updated_at: "2026-03-05T08:00:00.000Z",
          created_at: "2026-03-05T08:00:00.000Z",
        },
      ])
      .mockResolvedValueOnce([
        {
          id: "page-1",
          title: "Studio Offer Page",
          page_type: "landing",
          status: "published",
          live_url: "/p/sandra/studio-offer",
          version: 3,
          updated_at: "2026-03-05T09:00:00.000Z",
        },
      ])
      .mockResolvedValueOnce([
        {
          id: "img-1",
          image_url: "https://cdn.example.com/photo.jpg",
          prompt: "Luxury portrait",
          source: "ai_images",
          created_at: "2026-03-05T08:00:00.000Z",
        },
      ])
      .mockResolvedValueOnce([
        {
          id: "vid-1",
          video_url: "https://cdn.example.com/video.mp4",
          image_source: "https://cdn.example.com/thumb.jpg",
          motion_prompt: "Subtle camera move",
          created_at: "2026-03-05T08:00:00.000Z",
        },
      ])
      .mockResolvedValueOnce([{ count: 4 }])
      .mockResolvedValueOnce([{ count: 2 }])
      .mockResolvedValueOnce([{ count: 1 }])

    const { GET } = await import("@/app/api/studio/hub/route")
    const response = await GET(new Request("http://localhost/api/studio/hub") as any)

    expect(response.status).toBe(200)
    const payload = await response.json()

    expect(payload.success).toBe(true)
    expect(payload.landingPagesPaused).toBe(false)
    expect(Array.isArray(payload.pages)).toBe(true)
    expect(payload.pages[0]).toMatchObject({
      id: "page-1",
      title: "Studio Offer Page",
      pageType: "landing",
    })
    expect(Array.isArray(payload.recentPhotos)).toBe(true)
    expect(Array.isArray(payload.recentVideos)).toBe(true)
    expect(payload.recentPhotos[0]?.imageUrl).toContain("photo.jpg")
    expect(payload.recentVideos[0]?.videoUrl).toContain("video.mp4")
    expect(payload.stats.pageCount).toBe(1)
  })
})
