import { beforeEach, describe, expect, it, vi } from "vitest"

const mockSql = vi.fn()
const mockPersist = vi.fn()
const mockMerge = vi.fn()
const mockResolveLandingSnapshot = vi.fn()
const mockGetLatestTrends = vi.fn()
const mockGenerateInstagramCaption = vi.fn()
const mockGenerateText = vi.fn()

vi.mock("@/lib/db/client", () => ({
  sql: mockSql,
}))

vi.mock("ai", () => ({
  generateText: mockGenerateText,
}))

vi.mock("@/lib/maya/openrouter", () => ({
  createMayaOpenRouterModel: () => "feed_planner",
}))

vi.mock("@/lib/maya/personal-pages", () => ({
  persistMayaAssetAsPersonalPage: mockPersist,
}))

vi.mock("@/lib/maya/memory-store", () => ({
  mergeMayaMemoryData: mockMerge,
}))

vi.mock("@/lib/maya/page-generation/snapshot-resolver", () => ({
  resolveMayaLandingSnapshot: mockResolveLandingSnapshot,
}))

vi.mock("@/lib/maya/calendar-trends", () => ({
  getLatestMayaInstagramTrendSignals: mockGetLatestTrends,
  getDefaultMayaInstagramTrendSignals: vi.fn(() => ({
    generatedAt: "2026-01-01T00:00:00.000Z",
    sourceUrls: ["https://creators.instagram.com/"],
    hookPatterns: ["Save this for your next content week."],
    ctaPatterns: ["Comment PLAN for the next step."],
    hashtagSets: ["#contentstrategy #instagramtips #personalbrand"],
    formatNotes: ["Lead with a strong hook in line one."],
  })),
}))

vi.mock("@/lib/feed-planner/caption-writer", async () => {
  const actual = await vi.importActual<typeof import("@/lib/feed-planner/caption-writer")>(
    "@/lib/feed-planner/caption-writer",
  )
  return {
    ...actual,
    generateInstagramCaption: mockGenerateInstagramCaption,
  }
})

describe("maya calendar asset generation", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()

    mockPersist.mockResolvedValue({
      liveUrl: "/p/sandra/calendar-v2",
      ownerSlug: "sandra",
      slug: "calendar-v2",
      version: 1,
    })

    mockResolveLandingSnapshot.mockResolvedValue({
      userId: "42",
      snapshot: {
        offerBrief: { prefill: {} },
        memoryData: {},
      },
      brandProfile: {},
      memoryOfferBrief: {},
      resolvedOffer: "Studio Membership",
      resolvedAudience: "Female founders",
      resolvedTransformation: "Consistent content that converts",
      resolvedStyle: "Dark editorial",
      resolvedProofPoints: "",
      resolvedCta: "Join Studio",
      missingCriticalFields: [],
    })

    mockGetLatestTrends.mockResolvedValue({
      generatedAt: "2026-03-05T00:00:00.000Z",
      sourceUrls: ["https://creators.instagram.com/"],
      hookPatterns: ["I almost quit before this changed everything"],
      ctaPatterns: ["Comment PLAN and I’ll send the template"],
      hashtagSets: ["#contentstrategy #instagramgrowth #storyselling"],
      formatNotes: ["Blend reels, carousels, and static posts for mixed intent."],
    })

    mockSql.mockResolvedValue([])

    mockGenerateText.mockResolvedValue({
      text: JSON.stringify(
        Array.from({ length: 9 }, (_, i) => ({
          id: `post-${i + 1}`,
          dayLabel: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday", "Bonus A", "Bonus B"][i],
          postType: ["Reel", "Carousel", "Post"][i % 3],
          hook: "Save this for your next content week.",
          direction: "Tell a real moment where your audience felt stuck before finding your approach.",
          cta: "Comment PLAN and I'll send the template",
          caption:
            "This is a story-led caption with enough words to feel human and strategic for a calendar.\n\nTell me if you want the full framework.",
          hashtags: "#personalbrand #contentstrategy #instagramtips #storytelling #creatorbusiness",
          hasImage: i < 2,
          imageIndex: i < 2 ? i : undefined,
        })),
      ),
    })

    mockGenerateInstagramCaption.mockResolvedValue({
      caption:
        "POST CONTEXT: ignored\n\n" +
        "This is a story-led caption with enough words to feel human and strategic for a calendar.\n\n" +
        "Tell me if you want the full framework.\n\n" +
        "#personalbrand #contentstrategy #instagramtips #storytelling #creatorbusiness #growthhacks",
    })
  })

  it("builds instagram-style calendar html with copy-ready captions", async () => {
    const { createMayaGeneratedAsset } = await import("@/lib/maya/asset-generation")

    const asset = await createMayaGeneratedAsset({
      userId: "42",
      assetType: "calendar",
      instruction:
        "### Create a content calendar for my membership launch with viral hooks and story captions",
    })

    expect(asset.title).toContain("Instagram Calendar")
    expect(asset.title).not.toContain("###")
    expect(asset.previewText).toContain("IG calendar")
    expect(asset.previewHtml).toContain("Copy Caption")
    expect(asset.previewHtml).toContain("IG mix: reels + carousels + post")
    expect(asset.previewHtml).toContain("FEED GRID PREVIEW")
    expect(asset.previewHtml).not.toContain("01 — CURRENT INSTAGRAM DIRECTION")
    expect(asset.previewHtml).toContain("TEXT OVERLAY")
    expect(asset.previewHtml).toContain("carousel-slide")
    expect(asset.previewHtml).toContain("hero-fullbleed")
    expect(asset.previewHtml).toContain("Read full caption")
    expect(asset.previewHtml).toMatch(/#personalbrand|creatorbusiness|contentstrategy/)
    expect(asset.previewHtml).not.toContain("#growthhacks")
    expect(asset.previewData?.kind).toBe("calendar")
    if (asset.previewData?.kind === "calendar") {
      expect(asset.previewData.posts.length).toBeGreaterThan(0)
      expect(asset.previewData.posts[0]?.dayLabel).toBe("Monday")
    }
    expect(mockGenerateText).toHaveBeenCalled()
    expect(asset.url).toBe("/p/sandra/calendar-v2")
  })
})
