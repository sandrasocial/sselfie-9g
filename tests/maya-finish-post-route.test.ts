import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getAuthenticatedUser: vi.fn(),
  getUserByAuthId: vi.fn(),
  getUserPersonalBrand: vi.fn(),
  generateInstagramCaption: vi.fn(),
}))

vi.mock("@/lib/auth-helper", () => ({
  getAuthenticatedUser: mocks.getAuthenticatedUser,
}))
vi.mock("@/lib/user-mapping", () => ({
  getUserByAuthId: mocks.getUserByAuthId,
}))
vi.mock("@/lib/data/maya", () => ({
  getUserPersonalBrand: mocks.getUserPersonalBrand,
}))
vi.mock("@/lib/feed-planner/caption-writer", () => ({
  generateInstagramCaption: mocks.generateInstagramCaption,
}))

describe("Maya finish-post route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getAuthenticatedUser.mockResolvedValue({
      user: { id: "auth-user" },
      error: null,
    })
    mocks.getUserByAuthId.mockResolvedValue({ id: "member-123" })
    mocks.getUserPersonalBrand.mockResolvedValue({
      target_audience: "Women building a personal brand",
      brand_voice: "Warm and direct",
      content_pillars: ["Visibility"],
    })
    mocks.generateInstagramCaption.mockResolvedValue({ caption: "A useful finished caption." })
  })

  it("returns a ready caption without reading or mutating Feed Planner", async () => {
    const { POST } = await import("@/app/api/app-v3/maya/finish-post/route")
    const response = await POST(
      new Request("https://www.sselfie.ai/api/app-v3/maya/finish-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format: "carousel",
          conceptTitle: "The selfie angle that helps",
          conceptDescription: "A practical teaching post.",
          captionContext: "Show the useful angle clearly.",
        }),
      })
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ caption: "A useful finished caption." })
    expect(mocks.generateInstagramCaption).toHaveBeenCalledWith(
      expect.objectContaining({
        shotType: "carousel",
        captionType: "value",
        contentPillar: "The selfie angle that helps",
      })
    )
  })

  it("rejects an unsupported format before caption generation", async () => {
    const { POST } = await import("@/app/api/app-v3/maya/finish-post/route")
    const response = await POST(
      new Request("https://www.sselfie.ai/api/app-v3/maya/finish-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format: "calendar" }),
      })
    )

    expect(response.status).toBe(400)
    expect(mocks.generateInstagramCaption).not.toHaveBeenCalled()
  })
})
