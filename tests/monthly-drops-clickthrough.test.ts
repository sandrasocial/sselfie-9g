import { beforeEach, describe, expect, it, vi } from "vitest"

const sqlMock = vi.fn()
const neonFactoryMock = vi.fn(() => sqlMock)
const mockCreateServerClient = vi.fn()
const mockGetUserByAuthId = vi.fn()
const mockHasStudioMembership = vi.fn()

vi.mock("@neondatabase/serverless", () => ({
  neon: neonFactoryMock,
}))

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: mockCreateServerClient,
}))

vi.mock("@/lib/user-mapping", () => ({
  getUserByAuthId: mockGetUserByAuthId,
}))

vi.mock("@/lib/subscription", () => ({
  hasStudioMembership: mockHasStudioMembership,
  getUserProductAccess: vi.fn().mockResolvedValue("sselfie_studio_membership"),
}))

describe("academy monthly drops pipeline", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()

    mockCreateServerClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "auth-user-1" } },
          error: null,
        }),
      },
    })

    mockGetUserByAuthId.mockResolvedValue({ id: "neon-user-1" })
    mockHasStudioMembership.mockResolvedValue(true)
  })

  it("deduplicates monthly drops rows after download tracking joins", async () => {
    sqlMock.mockResolvedValueOnce([
      { id: 101, title: "Drop A", downloaded: false },
      { id: 101, title: "Drop A", downloaded: true },
    ])

    const { GET } = await import("@/app/api/academy/monthly-drops/route")
    const response = await GET(new Request("http://localhost/api/academy/monthly-drops") as any)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.monthlyDrops).toHaveLength(1)
    expect(body.monthlyDrops[0].id).toBe(101)
    expect(body.monthlyDrops[0].downloaded).toBe(true)
  })

  it("treats duplicate download tracking inserts as idempotent success", async () => {
    sqlMock
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce(Object.assign(new Error("duplicate key value violates unique constraint"), { code: "23505" }))

    const { POST } = await import("@/app/api/academy/monthly-drops/[dropId]/download/route")
    const response = await POST(new Request("http://localhost/api/academy/monthly-drops/101/download", { method: "POST" }) as any, {
      params: { dropId: "101" },
    })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
  })
})
