import { beforeEach, describe, expect, it, vi } from "vitest"

const mockSql = vi.fn()
const mockPersist = vi.fn()
const mockMerge = vi.fn()
const mockResolveLandingSnapshot = vi.fn()

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

describe("maya page fallback generation", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    delete process.env.FEATURE_MAYA_PAGE_RENDERER_V2

    mockPersist.mockResolvedValue({
      liveUrl: "/p/sandra/page-fallback",
      ownerSlug: "sandra",
      slug: "page-fallback",
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
      resolvedOffer: "Personal branding coaching",
      resolvedAudience: "Female coaches growing to consistent 10k months",
      resolvedTransformation: "Help women build a premium personal brand that attracts clients",
      resolvedStyle: "Luxury editorial",
      resolvedProofPoints: "",
      resolvedCta: "Book strategy call",
      missingCriticalFields: [],
    })

    mockSql.mockResolvedValue([])
  })

  it("builds fallback page titles from saved offer context instead of generic brief phrasing", async () => {
    const { createMayaGeneratedAsset } = await import("@/lib/maya/asset-generation")
    const { buildOfferBriefInstruction } = await import("@/lib/maya/offer-brief")

    const instruction = buildOfferBriefInstruction({
      assetType: "page",
      designStyle: "Luxury editorial",
      offerType: "Personal branding coaching",
      transformation: "Help women build a premium personal brand that attracts clients",
      pricePoint: "",
      formatAndDuration: "",
      idealClient: "Female coaches growing to consistent 10k months",
      biggestStruggle: "",
      uniqueMethod: "",
      proofPoints: "",
      callToAction: "Book strategy call",
    })

    const asset = await createMayaGeneratedAsset({
      userId: "42",
      assetType: "page",
      instruction,
    })

    expect(asset.title).not.toContain("high-converting")
    expect(asset.title).toContain("Help women build a premium personal brand")
    expect(asset.previewText).toContain("Personal branding coaching")
    expect(asset.previewHtml).toContain("Help women build a premium personal brand")
    expect(asset.url).toBe("/p/sandra/page-fallback")
  })
})
