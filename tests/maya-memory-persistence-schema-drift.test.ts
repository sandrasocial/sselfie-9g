import { beforeEach, describe, expect, it, vi } from "vitest"

const mockSql = vi.fn()
const mockPersistMayaAssetAsPersonalPage = vi.fn()

vi.mock("@/lib/db/client", () => ({
  sql: mockSql,
}))

vi.mock("@/lib/maya/personal-pages", () => ({
  persistMayaAssetAsPersonalPage: mockPersistMayaAssetAsPersonalPage,
}))

describe("Maya memory persistence schema drift", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    mockPersistMayaAssetAsPersonalPage.mockResolvedValue({
      liveUrl: "/p/creator-test/landing",
      ownerSlug: "creator-test",
      slug: "landing",
      version: 1,
    })
  })

  it("persists offer brief when ON CONFLICT(user_id) is unavailable", async () => {
    mockSql.mockRejectedValueOnce(
      Object.assign(new Error("there is no unique or exclusion constraint matching the ON CONFLICT specification"), {
        code: "42P10",
      }),
    )
    mockSql.mockResolvedValueOnce([])
    mockSql.mockResolvedValueOnce([])

    const { persistMayaOfferBrief } = await import("@/lib/maya/memory-layer")

    const result = await persistMayaOfferBrief("user-42", {
      offerType: "1:1 Coaching",
      transformation: "Book premium clients",
      idealClient: "Female founders",
      biggestStruggle: "Inconsistent content",
      uniqueMethod: "Maya Method",
      pricePoint: "€497",
      formatAndDuration: "6 weeks",
      proofPoints: "",
      callToAction: "",
    })

    expect(result.brief.offerType).toBe("1:1 Coaching")
    expect(mockSql).toHaveBeenCalledTimes(3)
  })

  it("creates a landing-page asset when memory upsert hits 42P10", async () => {
    mockSql.mockResolvedValueOnce([]) // generated_images
    mockSql.mockResolvedValueOnce([]) // ai_images
    mockSql.mockResolvedValueOnce([]) // brand_assets
    mockSql.mockResolvedValueOnce([]) // existing memory
    mockSql.mockRejectedValueOnce(
      Object.assign(new Error("there is no unique or exclusion constraint matching the ON CONFLICT specification"), {
        code: "42P10",
      }),
    )
    mockSql.mockResolvedValueOnce([]) // fallback update
    mockSql.mockResolvedValueOnce([]) // fallback insert

    const { createMayaGeneratedAsset } = await import("@/lib/maya/asset-generation")

    const asset = await createMayaGeneratedAsset({
      userId: "user-42",
      assetType: "page",
      instruction: "Create a clean luxury landing page for my coaching offer",
    })

    expect(asset.assetType).toBe("page")
    expect(asset.previewHtml.toLowerCase()).toContain("<!doctype html>")
    expect(asset.url).toBe("/p/creator-test/landing")
    expect(mockSql).toHaveBeenCalledTimes(7)
  })
})
