import { beforeEach, describe, expect, it, vi } from "vitest"

const mockGetAuthenticatedUser = vi.fn()
const mockGetEffectiveNeonUser = vi.fn()
const mockGetDb = vi.fn()
const mockSql = vi.fn()

vi.mock("@/lib/auth-helper", () => ({
  getAuthenticatedUser: mockGetAuthenticatedUser,
}))

vi.mock("@/lib/simple-impersonation", () => ({
  getEffectiveNeonUser: mockGetEffectiveNeonUser,
}))

vi.mock("@/lib/db", () => ({
  getDb: mockGetDb,
}))

describe("GET /api/onboarding/academy-journey-state", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()

    mockGetAuthenticatedUser.mockResolvedValue({
      user: { id: "auth-user-1" },
      error: null,
    })

    mockGetEffectiveNeonUser.mockResolvedValue({
      id: "user-1",
      email: "sandra@example.com",
    })

    mockGetDb.mockReturnValue(mockSql)
  })

  it("returns 200 with safe defaults when journey queries fail", async () => {
    mockSql.mockRejectedValueOnce(new Error("db unavailable"))

    const { GET } = await import("@/app/api/onboarding/academy-journey-state/route")
    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.generationCount).toBe(0)
    expect(body.hasContentPlan).toBe(false)
    expect(body.hoursSinceLastActive).toBeNull()
    expect(body.showAfterFirstGenerationPrompt).toBe(false)
    expect(body.showAfterThreeGenerationsPrompt).toBe(false)
    expect(body.shouldSendInactive48hEmail).toBe(false)
  })

  it("returns computed prompt state when counts are available", async () => {
    mockSql
      .mockResolvedValueOnce([{ count: 1 }]) // ai_images
      .mockResolvedValueOnce([{ count: 0 }]) // generated_images
      .mockResolvedValueOnce([{ count: 0 }]) // feed_posts
      .mockResolvedValueOnce([{ hours_since: 1 }]) // activity

    const { GET } = await import("@/app/api/onboarding/academy-journey-state/route")
    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.generationCount).toBe(1)
    expect(body.showAfterFirstGenerationPrompt).toBe(true)
    expect(body.showAfterThreeGenerationsPrompt).toBe(false)
  })
})

