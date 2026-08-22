import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getAuthenticatedUser: vi.fn(),
  getUserByAuthId: vi.fn(),
  getFeedPlannerAccess: vi.fn(),
  currentPeriodMonth: vi.fn(),
  generateInstagramCaption: vi.fn(),
  getUserPersonalBrand: vi.fn(),
  resolveFeedStyleForUser: vi.fn(),
  saveMayaReadyPost: vi.fn(),
  sql: vi.fn(),
}))

vi.mock("@/lib/auth-helper", () => ({ getAuthenticatedUser: mocks.getAuthenticatedUser }))
vi.mock("@/lib/user-mapping", () => ({ getUserByAuthId: mocks.getUserByAuthId }))
vi.mock("@/lib/feed-planner/access-control", () => ({
  getFeedPlannerAccess: mocks.getFeedPlannerAccess,
}))
vi.mock("@/lib/feed-planner/write-auto-draft", () => ({
  currentPeriodMonth: mocks.currentPeriodMonth,
}))
vi.mock("@/lib/feed-planner/caption-writer", () => ({
  generateInstagramCaption: mocks.generateInstagramCaption,
}))
vi.mock("@/lib/data/maya", () => ({ getUserPersonalBrand: mocks.getUserPersonalBrand }))
vi.mock("@/lib/feed-planner/resolve-feed-style", () => ({
  resolveFeedStyleForUser: mocks.resolveFeedStyleForUser,
}))
vi.mock("@/lib/app-v3/maya/ready-post", () => ({
  saveMayaReadyPost: mocks.saveMayaReadyPost,
}))
vi.mock("@/lib/db/client", () => ({ sql: mocks.sql }))

type SqlCall = { text: string; values: unknown[] }

describe("Maya durable ready-post handoff", () => {
  const sqlCalls: SqlCall[] = []

  beforeEach(() => {
    vi.clearAllMocks()
    sqlCalls.length = 0
    mocks.getAuthenticatedUser.mockResolvedValue({ user: { id: "auth-user" }, error: null })
    mocks.getUserByAuthId.mockResolvedValue({ id: "member-123" })
    mocks.getFeedPlannerAccess.mockResolvedValue({ isMembership: true, isPaidBlueprint: false })
    mocks.currentPeriodMonth.mockReturnValue("2026-08")
    mocks.generateInstagramCaption.mockResolvedValue({ caption: "A generated fallback." })
    mocks.getUserPersonalBrand.mockResolvedValue(null)
    mocks.resolveFeedStyleForUser.mockResolvedValue({
      feedStyle: "editorial",
      variationId: "editorial-v1",
    })
    mocks.saveMayaReadyPost.mockResolvedValue({
      position: 4,
      scheduledAt: "2026-08-24",
      caption: "The exact caption.\n\nKeep this spacing.",
      alreadyPlaced: false,
    })
    mocks.sql.mockImplementation(async (strings: TemplateStringsArray, ...values: unknown[]) => {
      const text = strings.join("?")
      sqlCalls.push({ text, values })
      if (
        text.includes("SELECT id, feed_style FROM feed_layouts") &&
        text.includes("period_month")
      ) {
        return [{ id: 17, feed_style: "editorial" }]
      }
      if (
        text.includes("SELECT id, position, scheduled_at") &&
        text.includes("image_url IS NULL")
      ) {
        return [
          {
            id: 31,
            position: 4,
            scheduled_at: "2026-08-24",
            content_pillar: "Visibility",
            caption: null,
          },
        ]
      }
      throw new Error(`Unexpected SQL in ready-post test: ${text}`)
    })
  })

  it("persists the exact finished caption and complete final media set without regenerating copy", async () => {
    const { POST } = await import("@/app/api/app-v3/maya/feed-plan/place-photo/route")
    const request = () =>
      new Request("https://www.sselfie.ai/api/app-v3/maya/feed-plan/place-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: "https://example.com/final-slide-1.png",
          assetIds: [88, 89],
          conceptTitle: "The finished post",
          finishedCaption: "The exact caption.\n\nKeep this spacing.",
        }),
      })

    const first = await POST(request())
    expect(first.status).toBe(200)
    await expect(first.json()).resolves.toEqual({
      position: 4,
      scheduledAt: "2026-08-24",
      caption: "The exact caption.\n\nKeep this spacing.",
      alreadyPlaced: false,
    })
    expect(mocks.saveMayaReadyPost).toHaveBeenCalledWith({
      userId: "member-123",
      assetIds: [88, 89],
      finishedCaption: "The exact caption.\n\nKeep this spacing.",
      conceptTitle: "The finished post",
      periodMonth: "2026-08",
      feedStyle: "editorial",
      feedStyleVariationId: "editorial-v1",
    })
    expect(mocks.generateInstagramCaption).not.toHaveBeenCalled()
    expect(mocks.sql).not.toHaveBeenCalled()
  })

  it("keeps unauthorized Calendar tiers write-free", async () => {
    mocks.getFeedPlannerAccess.mockResolvedValue({ isMembership: false, isPaidBlueprint: false })
    const { POST } = await import("@/app/api/app-v3/maya/feed-plan/place-photo/route")
    const response = await POST(
      new Request("https://www.sselfie.ai/api/app-v3/maya/feed-plan/place-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: "https://example.com/final.png",
          assetIds: [88],
          finishedCaption: "A finished caption.",
        }),
      })
    )

    expect(response.status).toBe(403)
    expect(mocks.sql).not.toHaveBeenCalled()
    expect(mocks.saveMayaReadyPost).not.toHaveBeenCalled()
  })

  it("keeps a missing finished caption out of Calendar", async () => {
    const { POST } = await import("@/app/api/app-v3/maya/feed-plan/place-photo/route")
    const response = await POST(
      new Request("https://www.sselfie.ai/api/app-v3/maya/feed-plan/place-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetIds: [88],
          finishedCaption: null,
        }),
      })
    )

    expect(response.status).toBe(422)
    expect(mocks.saveMayaReadyPost).not.toHaveBeenCalled()
    expect(mocks.sql).not.toHaveBeenCalled()
  })
})
