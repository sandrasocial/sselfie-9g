import { beforeEach, describe, expect, it, vi } from "vitest"

const mockGetAuthenticatedUser = vi.fn()
const mockGetEffectiveNeonUser = vi.fn()
const mockSql = vi.fn()

vi.mock("@/lib/auth-helper", () => ({
  getAuthenticatedUser: mockGetAuthenticatedUser,
}))

vi.mock("@/lib/simple-impersonation", () => ({
  getEffectiveNeonUser: mockGetEffectiveNeonUser,
}))

vi.mock("@/lib/db/client", () => ({
  sql: mockSql,
}))

describe("POST /api/maya/pro/library/get fallback behavior", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()

    mockGetAuthenticatedUser.mockResolvedValue({
      user: { id: "auth-user-1" },
      error: null,
    })

    mockGetEffectiveNeonUser.mockResolvedValue({
      id: "neon-user-1",
    })
  })

  it("returns an empty library instead of 500 when user_image_libraries relation is missing", async () => {
    mockSql.mockRejectedValue(Object.assign(new Error('relation "user_image_libraries" does not exist'), { code: "42P01" }))

    const { POST } = await import("@/app/api/maya/pro/library/get/route")

    const request = new Request("http://localhost/api/maya/pro/library/get", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    })

    const response = await POST(request as any)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.selfies).toEqual([])
    expect(payload.products).toEqual([])
    expect(payload.people).toEqual([])
    expect(payload.vibes).toEqual([])
    expect(payload.current_intent).toBeNull()
  })

  it("returns an empty library instead of 500 when user_id type mismatch causes query operator failure", async () => {
    mockSql.mockRejectedValue(
      Object.assign(
        new Error('operator does not exist: uuid = integer'),
        { code: "42883" },
      ),
    )

    const { POST } = await import("@/app/api/maya/pro/library/get/route")

    const request = new Request("http://localhost/api/maya/pro/library/get", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    })

    const response = await POST(request as any)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.selfies).toEqual([])
    expect(payload.products).toEqual([])
    expect(payload.people).toEqual([])
    expect(payload.vibes).toEqual([])
    expect(payload.current_intent).toBeNull()
  })
})
