import { beforeEach, describe, expect, it, vi } from "vitest"

const mockSql = vi.fn()

vi.mock("@/lib/db/client", () => ({
  sql: mockSql,
}))

describe("getMayaUserSnapshot", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it("hydrates offer brief, uploads, generation source, and active asset context", async () => {
    mockSql.mockResolvedValueOnce([
      {
        memory_data: {
          latest_offer_brief: {
            offerType: "1:1 Coaching",
            transformation: "Sign premium clients",
            idealClient: "Female founders",
            pricePoint: "€497",
          },
          active_asset_context: {
            assetType: "page",
            assetLabel: "Landing Page",
            assetId: "maya_page_1",
            lastInstruction: "Refine hero section",
            updatedAt: "2026-03-04T10:00:00.000Z",
          },
        },
      },
    ])
    mockSql.mockResolvedValueOnce([
      {
        business_type: "Coaching",
        target_audience: "Women founders",
      },
    ])
    mockSql.mockResolvedValueOnce([{ value: 1 }])
    mockSql.mockResolvedValueOnce([
      {
        selfies: ["a", "b", "c"],
        products: ["p1"],
        people: [],
        vibes: [],
      },
    ])
    mockSql.mockResolvedValueOnce([{ count: 1 }])

    const { getMayaUserSnapshot } = await import("@/lib/maya/user-snapshot")
    const snapshot = await getMayaUserSnapshot("user-1")

    expect(snapshot.offerBrief.hasCoreFields).toBe(true)
    expect(snapshot.offerBrief.prefill.offerType).toBe("1:1 Coaching")
    expect(snapshot.uploads.selfies).toBe(3)
    expect(snapshot.uploads.products).toBe(1)
    expect(snapshot.uploads.total).toBe(4)
    expect(snapshot.generation.recommendedSource).toBe("custom_model")
    expect(snapshot.activeAssetContext?.assetId).toBe("maya_page_1")
  })

  it("falls back safely when upload library table has schema drift", async () => {
    mockSql.mockResolvedValueOnce([{ memory_data: {} }])
    mockSql.mockResolvedValueOnce([{ business_type: "Service" }])
    mockSql.mockResolvedValueOnce([])
    mockSql.mockRejectedValueOnce(
      Object.assign(new Error('relation "user_image_libraries" does not exist'), {
        code: "42P01",
      }),
    )
    mockSql.mockResolvedValueOnce([{ count: 0 }])

    const { getMayaUserSnapshot } = await import("@/lib/maya/user-snapshot")
    const snapshot = await getMayaUserSnapshot("user-2")

    expect(snapshot.uploads.total).toBe(0)
    expect(snapshot.uploads.hasAny).toBe(false)
    expect(snapshot.generation.recommendedSource).toBe("base_model")
    expect(snapshot.offerBrief.hasCoreFields).toBe(false)
  })

  it("continues hydrating uploads when brand snapshot has missing columns", async () => {
    mockSql.mockResolvedValueOnce([{ memory_data: {} }])
    mockSql.mockRejectedValueOnce(
      Object.assign(new Error('column "positioning_statement" does not exist'), {
        code: "42703",
      }),
    )
    mockSql.mockResolvedValueOnce([])
    mockSql.mockResolvedValueOnce([
      {
        selfies: ["s1", "s2"],
        products: ["p1"],
        people: [],
        vibes: [],
      },
    ])
    mockSql.mockResolvedValueOnce([{ count: 0 }])
    mockSql.mockResolvedValueOnce([
      {
        data: {
          target_audience: "Creators building personal brands",
        },
      },
    ])

    const { getMayaUserSnapshot } = await import("@/lib/maya/user-snapshot")
    const snapshot = await getMayaUserSnapshot("user-3")

    expect(snapshot.uploads.total).toBe(3)
    expect(snapshot.uploads.hasAny).toBe(true)
    expect(snapshot.generation.recommendedSource).toBe("selfies")
    expect(snapshot.offerBrief.prefill.idealClient).toBe("Creators building personal brands")
  })
})
