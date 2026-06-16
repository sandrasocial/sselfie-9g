import { beforeEach, describe, expect, it, vi } from "vitest"

const mockRateLimit = vi.fn()
const mockGetAuthenticatedUser = vi.fn()
const mockGetEffectiveNeonUser = vi.fn()
const mockStartTrainedModelGeneration = vi.fn()
const mockCheckTrainedModelGeneration = vi.fn()

class MockTrainedModelGenerationError extends Error {
  status: number
  payload: Record<string, unknown>

  constructor(message: string, status = 500, payload: Record<string, unknown> = {}) {
    super(message)
    this.status = status
    this.payload = payload
  }
}

vi.mock("@/lib/rate-limit-api", () => ({
  rateLimit: mockRateLimit,
}))

vi.mock("@/lib/auth-helper", () => ({
  getAuthenticatedUser: mockGetAuthenticatedUser,
}))

vi.mock("@/lib/simple-impersonation", () => ({
  getEffectiveNeonUser: mockGetEffectiveNeonUser,
}))

vi.mock("@/lib/maya/trained-model-generation-service", () => ({
  startTrainedModelGeneration: mockStartTrainedModelGeneration,
  checkTrainedModelGeneration: mockCheckTrainedModelGeneration,
  TrainedModelGenerationError: MockTrainedModelGenerationError,
}))

describe("app-v3 custom trained-model API routes", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()

    mockRateLimit.mockResolvedValue({ success: true })
    mockGetAuthenticatedUser.mockResolvedValue({ user: { id: "auth-user-1" }, error: null })
    mockGetEffectiveNeonUser.mockResolvedValue({ id: "neon-user-1" })
    mockStartTrainedModelGeneration.mockResolvedValue({
      generationId: 42,
      predictionId: "pred_custom_123",
      creditsDeducted: 1,
      newBalance: 8,
    })
    mockCheckTrainedModelGeneration.mockResolvedValue({
      status: "succeeded",
      imageUrl: "https://blob.example.com/generated.png",
      aiImageId: 88,
    })
  })

  it("starts trained-model generation through the app-v3 wrapper", async () => {
    const { POST } = await import("@/app/api/app-v3/maya/custom-model/generate/route")

    const response = await POST(
      new Request("http://localhost/api/app-v3/maya/custom-model/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          conceptTitle: "Marble cafe portrait",
          conceptPrompt: "editorial portrait in a marble cafe",
          category: "portrait",
        }),
      }) as any,
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({
      success: true,
      generationId: 42,
      predictionId: "pred_custom_123",
      status: "processing",
      creditsDeducted: 1,
      newBalance: 8,
    })
    expect(mockStartTrainedModelGeneration).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "neon-user-1",
        conceptTitle: "Marble cafe portrait",
        source: "app-v3-custom-model",
      }),
    )
  })

  it("passes structured service errors through unchanged", async () => {
    mockStartTrainedModelGeneration.mockRejectedValue(
      new MockTrainedModelGenerationError("No trained model", 409, {
        error: "No trained model found. Please complete training first.",
        code: "training_required",
      }),
    )
    const { POST } = await import("@/app/api/app-v3/maya/custom-model/generate/route")

    const response = await POST(
      new Request("http://localhost/api/app-v3/maya/custom-model/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          conceptTitle: "Portrait",
          conceptPrompt: "editorial portrait",
        }),
      }) as any,
    )
    const body = await response.json()

    expect(response.status).toBe(409)
    expect(body.code).toBe("training_required")
  })

  it("checks trained-model generation through the authenticated app-v3 wrapper", async () => {
    const { GET } = await import("@/app/api/app-v3/maya/custom-model/check/route")

    const response = await GET(
      new Request(
        "http://localhost/api/app-v3/maya/custom-model/check?predictionId=pred_custom_123&generationId=42",
      ) as any,
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.imageUrl).toBe("https://blob.example.com/generated.png")
    expect(mockCheckTrainedModelGeneration).toHaveBeenCalledWith({
      userId: "neon-user-1",
      predictionId: "pred_custom_123",
      generationId: "42",
      source: "app_v3_custom_model",
    })
  })
})
