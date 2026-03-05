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

describe("maya asset generation v2", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    process.env.FEATURE_MAYA_PAGE_RENDERER_V2 = "true"

    mockPersist.mockResolvedValue({
      liveUrl: "/p/sandra/landing-v2",
      ownerSlug: "sandra",
      slug: "landing-v2",
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

    mockSql.mockResolvedValueOnce([{ memory_data: { generated_assets: [] } }])
  })

  it("creates clean v2 landing assets from noisy instructions", async () => {
    const { createMayaGeneratedAsset } = await import("@/lib/maya/asset-generation")

    const asset = await createMayaGeneratedAsset({
      userId: "42",
      assetType: "page",
      instruction:
        "### **Create** a landing page --- [CREATE_ASSET] for my offer 🚀 with noisy markdown and junk",
    })

    expect(asset.title).not.toContain("###")
    expect(asset.title).not.toContain("**")
    expect(asset.previewHtml).toContain("<h1>")
    expect(asset.previewHtml).not.toContain("[CREATE_ASSET")
    expect(asset.url).toBe("/p/sandra/landing-v2")
    expect(asset.blueprint).toBeTruthy()
  })
})
