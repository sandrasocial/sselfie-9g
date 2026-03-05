import { beforeEach, describe, expect, it, vi } from "vitest"

const mockSql = vi.fn()
const mockPersist = vi.fn()
const mockMerge = vi.fn()
const mockResolveLandingSnapshot = vi.fn()
const mockSelectLandingImages = vi.fn()

vi.mock("@/lib/db/client", () => ({
  sql: mockSql,
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

vi.mock("@/lib/maya/page-generation/image-selector", () => ({
  selectLandingImages: mockSelectLandingImages,
}))

describe("regenerateMayaPersonalPageById", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    process.env.FEATURE_MAYA_PAGE_RENDERER_V2 = "true"

    mockResolveLandingSnapshot.mockResolvedValue({
      userId: "42",
      snapshot: {
        offerBrief: { prefill: {} },
        memoryData: {},
      },
      brandProfile: {},
      memoryOfferBrief: {},
      resolvedOffer: "Studio Membership",
      resolvedAudience: "Women founders",
      resolvedTransformation: "Build a clear brand and sign clients",
      resolvedStyle: "Dark moody",
      resolvedProofPoints: "Proof one|Proof two",
      resolvedCta: "Join Studio",
      missingCriticalFields: [],
    })

    mockSelectLandingImages.mockResolvedValue({
      heroImageUrl: "https://example.com/hero.jpg",
      supportImageUrls: ["https://example.com/support.jpg"],
      rankedCandidates: [],
    })

    mockPersist.mockResolvedValue({
      liveUrl: "/p/sandra/landing-v2",
      ownerSlug: "sandra",
      slug: "landing-v2",
      version: 3,
    })

    mockSql
      .mockResolvedValueOnce([
        {
          id: "maya_page_abc",
          page_type: "landing",
          title: "Old title",
          page_jsonb: { instruction: "Create a page" },
        },
      ])
      .mockResolvedValueOnce([{ memory_data: { generated_assets: [] } }])
  })

  it("regenerates an existing personal page and returns updated metadata", async () => {
    const { regenerateMayaPersonalPageById } = await import("@/lib/maya/asset-generation")

    const result = await regenerateMayaPersonalPageById({
      userId: "42",
      pageId: "maya_page_abc",
    })

    expect(result.success).toBe(true)
    expect(result.assetId).toBe("maya_page_abc")
    expect(result.liveUrl).toBe("/p/sandra/landing-v2")
    expect(result.version).toBe(3)
    expect(mockPersist).toHaveBeenCalled()
    expect(mockMerge).toHaveBeenCalled()
  })
})
