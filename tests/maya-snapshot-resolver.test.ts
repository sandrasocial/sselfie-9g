import { beforeEach, describe, expect, it, vi } from "vitest"

const mockSql = vi.fn()
const mockGetMayaUserSnapshot = vi.fn()

vi.mock("@/lib/db/client", () => ({
  sql: mockSql,
}))

vi.mock("@/lib/maya/user-snapshot", () => ({
  getMayaUserSnapshot: mockGetMayaUserSnapshot,
}))

describe("maya snapshot resolver", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it("resolves fields from memory + profile and reports no missing fields", async () => {
    mockGetMayaUserSnapshot.mockResolvedValue({
      userId: "42",
      offerBrief: {
        prefill: {
          offerType: "Membership",
          idealClient: "Women founders",
          transformation: "Sign better clients",
        },
      },
      activeAssetContext: null,
      memoryData: {
        latest_offer_brief: {
          offerType: "Studio Membership",
          idealClient: "Women founders",
          transformation: "Build an aligned brand",
          designStyle: "Dark moody",
        },
      },
    })

    mockSql.mockResolvedValueOnce([
      {
        data: {
          business_type: "Brand strategist",
          ideal_audience: "Women founders",
          audience_transformation: "Build an aligned brand",
          visual_aesthetic: "Luxury minimal",
        },
      },
    ])

    const { resolveMayaLandingSnapshot } = await import("@/lib/maya/page-generation/snapshot-resolver")
    const result = await resolveMayaLandingSnapshot("42")

    expect(result.resolvedOffer).toBe("Studio Membership")
    expect(result.resolvedAudience).toBe("Women founders")
    expect(result.resolvedTransformation).toBe("Build an aligned brand")
    expect(result.missingCriticalFields).toEqual([])
  })

  it("reports missing critical fields when context is sparse", async () => {
    mockGetMayaUserSnapshot.mockResolvedValue({
      userId: "42",
      offerBrief: { prefill: {} },
      activeAssetContext: null,
      memoryData: {},
    })

    mockSql.mockResolvedValueOnce([{ data: {} }])

    const { resolveMayaLandingSnapshot } = await import("@/lib/maya/page-generation/snapshot-resolver")
    const result = await resolveMayaLandingSnapshot("42")

    expect(result.missingCriticalFields).toEqual(["offer", "audience", "transformation"])
  })
})
