import { beforeEach, describe, expect, it, vi } from "vitest"

const mockGetAuthenticatedUser = vi.fn()
const mockGetEffectiveNeonUser = vi.fn()
const mockCheckCredits = vi.fn()
const mockDeductCredits = vi.fn()
const mockGetUserCredits = vi.fn()
const mockGenerateWithNanoBanana = vi.fn()
const mockRoutePromptViaAuthority = vi.fn()
const mockSql = vi.fn()

vi.mock("@/lib/auth-helper", () => ({
  getAuthenticatedUser: mockGetAuthenticatedUser,
}))

vi.mock("@/lib/simple-impersonation", () => ({
  getEffectiveNeonUser: mockGetEffectiveNeonUser,
}))

vi.mock("@/lib/credits", () => ({
  checkCredits: mockCheckCredits,
  deductCredits: mockDeductCredits,
  getUserCredits: mockGetUserCredits,
}))

vi.mock("@/lib/nano-banana-client", () => ({
  generateWithNanoBanana: mockGenerateWithNanoBanana,
  getStudioProCreditCost: vi.fn(() => 2),
}))

vi.mock("@/lib/maya/prompt-authority", () => ({
  routeProModeImagePromptViaAuthority: mockRoutePromptViaAuthority,
}))

vi.mock("@/lib/db/client", () => ({
  sql: mockSql,
}))

vi.mock("@vercel/blob", () => ({
  put: vi.fn(),
}))

describe("POST /api/maya/pro/generate-image credit policy", () => {
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

    mockCheckCredits.mockResolvedValue(true)
    mockGetUserCredits.mockResolvedValue(2)

    mockRoutePromptViaAuthority.mockImplementation(({ fullPrompt }) => ({
      prompt: fullPrompt,
    }))

    mockSql.mockResolvedValue([{ id: 123 }])
  })

  it("deducts credits before starting async Pro generation", async () => {
    mockDeductCredits.mockResolvedValue({
      success: true,
      newBalance: 0,
    })

    mockGenerateWithNanoBanana.mockResolvedValue({
      predictionId: "pred_async_1",
      status: "processing",
    })

    const { POST } = await import("@/app/api/maya/pro/generate-image/route")

    const request = new Request("http://localhost/api/maya/pro/generate-image", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        fullPrompt: "Generate a premium portrait.",
        conceptTitle: "Test",
        linkedImages: ["https://example.com/selfie-1.png"],
        resolution: "2K",
        aspectRatio: "1:1",
      }),
    })

    const response = await POST(request as any)
    expect(response.status).toBe(200)
    expect(mockDeductCredits).toHaveBeenCalledTimes(1)
    expect(mockGenerateWithNanoBanana).toHaveBeenCalledTimes(1)
    expect(mockDeductCredits.mock.invocationCallOrder[0]).toBeLessThan(
      mockGenerateWithNanoBanana.mock.invocationCallOrder[0],
    )
  })

  it("blocks generation when credit deduction fails", async () => {
    mockDeductCredits.mockResolvedValue({
      success: false,
      newBalance: 0,
      error: "Insufficient credits. You have 0 credits but need 2.",
    })

    mockGenerateWithNanoBanana.mockResolvedValue({
      predictionId: "pred_should_not_start",
      status: "processing",
    })

    const { POST } = await import("@/app/api/maya/pro/generate-image/route")

    const request = new Request("http://localhost/api/maya/pro/generate-image", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        fullPrompt: "Generate a premium portrait.",
        conceptTitle: "Test",
        linkedImages: ["https://example.com/selfie-1.png"],
        resolution: "2K",
        aspectRatio: "1:1",
      }),
    })

    const response = await POST(request as any)
    expect(response.status).toBe(402)
    expect(mockGenerateWithNanoBanana).not.toHaveBeenCalled()
  })
})
