import { beforeEach, describe, expect, it, vi } from "vitest"

const sqlMock = vi.fn()
const neonFactoryMock = vi.fn(() => sqlMock)
const mockCreateServerClient = vi.fn()
const mockGetUserByAuthId = vi.fn()
const mockHasStudioMembership = vi.fn()
const mockGetUserProductAccess = vi.fn()

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
  getUserProductAccess: mockGetUserProductAccess,
}))

describe("academy monthly-drops access response", () => {
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
    mockGetUserProductAccess.mockResolvedValue(null)
  })

  it("returns a non-error payload for non-members so UI can render paywall state cleanly", async () => {
    mockHasStudioMembership.mockResolvedValueOnce(false)

    const { GET } = await import("@/app/api/academy/monthly-drops/route")
    const response = await GET(new Request("http://localhost/api/academy/monthly-drops") as any)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.hasAccess).toBe(false)
    expect(body.monthlyDrops).toEqual([])
    expect(sqlMock).not.toHaveBeenCalled()
  })
})
