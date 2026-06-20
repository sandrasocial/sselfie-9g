import { beforeEach, describe, expect, it, vi } from "vitest"

const mockCheckCredits = vi.fn()
const mockDeductCredits = vi.fn()
const mockGetUserCredits = vi.fn()
const mockAddCredits = vi.fn()
const mockGetDbClient = vi.fn()
const mockSql = vi.fn()
const mockGeneratePrompt = vi.fn()
const mockGetMayaUserSnapshot = vi.fn()
const mockReplicateCreate = vi.fn()
const mockReplicateGet = vi.fn()
const mockPut = vi.fn()
const mockGenerateMotionPromptWithVisionFallbacks = vi.fn()

vi.mock("@/lib/credits", () => ({
  checkCredits: mockCheckCredits,
  deductCredits: mockDeductCredits,
  getUserCredits: mockGetUserCredits,
  addCredits: mockAddCredits,
  CREDIT_COSTS: {
    ANIMATION: 3,
  },
}))

vi.mock("@/lib/db/client", () => ({
  getDbClient: mockGetDbClient,
}))

vi.mock("@/lib/generation/prompt", () => ({
  generatePrompt: mockGeneratePrompt,
}))

vi.mock("@/lib/maya/user-snapshot", () => ({
  getMayaUserSnapshot: mockGetMayaUserSnapshot,
}))

vi.mock("@/lib/maya/motion-prompt-llm", () => ({
  generateMotionPromptWithVisionFallbacks: mockGenerateMotionPromptWithVisionFallbacks,
}))

vi.mock("@/lib/replicate-client", () => ({
  getReplicateClient: () => ({
    predictions: {
      create: mockReplicateCreate,
      get: mockReplicateGet,
    },
  }),
}))

vi.mock("@vercel/blob", () => ({
  put: mockPut,
}))

describe("app-v3 video generation service", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    vi.unstubAllGlobals()

    mockCheckCredits.mockResolvedValue(true)
    mockDeductCredits.mockResolvedValue({ success: true, newBalance: 17 })
    mockGetUserCredits.mockResolvedValue(17)
    mockAddCredits.mockResolvedValue({ success: true, newBalance: 20 })
    mockGetDbClient.mockReturnValue(mockSql)
    mockSql.mockResolvedValue([{ id: 77 }])
    mockGeneratePrompt.mockResolvedValue({
      prompt:
        "natural blink, subtle breathing, gentle camera push-in, preserve identity, no subtitles",
      metadata: { builder: "video-authority-contextual-v1" },
    })
    mockGenerateMotionPromptWithVisionFallbacks.mockResolvedValue(
      "Face stays steady with a natural blink, soft breathing, and a gentle camera push-in."
    )
    mockGetMayaUserSnapshot.mockResolvedValue({
      memoryData: { user_preference_notes: ["cinematic and subtle"] },
      offerBrief: { prefill: {} },
      generation: { recommendedSource: "selfie" },
      uploads: { total: 1 },
    })
    mockReplicateCreate.mockResolvedValue({ id: "pred_video_123", status: "starting" })
    mockReplicateGet.mockResolvedValue({ status: "processing" })
    mockPut.mockResolvedValue({ url: "https://blob.example.com/video.mp4" })
  })

  it("starts image-to-video generation without requiring a trained model", async () => {
    const { startVideoGeneration } = await import("@/lib/maya/video-generation-service")

    const result = await startVideoGeneration({
      userId: "user-1",
      imageUrl: "https://cdn.example.com/source.png",
      motionPrompt: "slow camera push-in, natural blink",
      imageDescription: "Founder portrait in window light",
      category: "editorial",
    })

    expect(result).toEqual(
      expect.objectContaining({
        videoId: 77,
        predictionId: "pred_video_123",
        status: "processing",
        creditsDeducted: 3,
        newBalance: 17,
      })
    )
    expect(mockDeductCredits).toHaveBeenCalledWith("user-1", 3, "animation", "Animated image")
    expect(mockReplicateCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "wan-video/wan-2.5-i2v-fast",
        input: expect.objectContaining({
          image: "https://cdn.example.com/source.png",
          prompt: expect.stringContaining("Face stays steady"),
          negative_prompt: expect.stringContaining("subtitles"),
          duration: 5,
          resolution: "720p",
          enable_prompt_expansion: false,
        }),
      })
    )
    expect(mockGenerateMotionPromptWithVisionFallbacks).toHaveBeenCalledWith(
      expect.stringContaining("brand-safe motion director"),
      expect.stringContaining("Reference image is provided"),
      "https://cdn.example.com/source.png"
    )
    const insertSql = (mockSql.mock.calls[0][0] as TemplateStringsArray).join(" ")
    expect(insertSql).toContain("INSERT INTO generated_videos")
    expect(insertSql).not.toContain("user_models")
  })

  it("returns structured low-credit errors before creating a prediction", async () => {
    mockCheckCredits.mockResolvedValue(false)
    mockGetUserCredits.mockResolvedValue(1)

    const { startVideoGeneration } = await import("@/lib/maya/video-generation-service")

    await expect(
      startVideoGeneration({
        userId: "user-1",
        imageUrl: "https://cdn.example.com/source.png",
      })
    ).rejects.toMatchObject({
      status: 402,
      payload: expect.objectContaining({
        code: "insufficient_credits",
        current: 1,
      }),
    })
    expect(mockReplicateCreate).not.toHaveBeenCalled()
  })

  it("returns a clean validation error when no public source image is provided", async () => {
    const { startVideoGeneration } = await import("@/lib/maya/video-generation-service")

    await expect(
      startVideoGeneration({
        userId: "user-1",
        imageUrl: null,
      })
    ).rejects.toMatchObject({
      status: 400,
      payload: expect.objectContaining({
        error: "Missing image URL",
      }),
    })
    expect(mockDeductCredits).not.toHaveBeenCalled()
  })

  it("uploads a completed video and scopes updates to the authenticated user", async () => {
    mockReplicateGet.mockResolvedValue({
      status: "succeeded",
      output: "https://replicate.example.com/video.mp4",
    })
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: "OK",
        blob: async () => new Blob([new ArrayBuffer(2048)], { type: "video/mp4" }),
      })
    )
    mockSql.mockResolvedValueOnce([{ id: 77 }]).mockResolvedValueOnce([])

    const { checkVideoGeneration } = await import("@/lib/maya/video-generation-service")

    const result = await checkVideoGeneration({
      userId: "user-1",
      predictionId: "pred_video_123",
      videoId: 77,
    })

    expect(result).toEqual({
      status: "succeeded",
      videoUrl: "https://blob.example.com/video.mp4",
      progress: 100,
    })
    const ownerSql = (mockSql.mock.calls[0][0] as TemplateStringsArray).join(" ")
    expect(ownerSql).toContain("AND job_id =")
    const updateSql = (mockSql.mock.calls[1][0] as TemplateStringsArray).join(" ")
    expect(updateSql).toContain("WHERE id =")
    expect(updateSql).toContain("AND user_id =")
  })

  it("refunds credits once when Replicate marks the prediction failed", async () => {
    mockReplicateGet.mockResolvedValue({
      status: "failed",
      error: "An error occurred while processing your request (E002)",
    })
    mockSql.mockResolvedValueOnce([{ id: 77, status: "processing" }]).mockResolvedValueOnce([])

    const { checkVideoGeneration } = await import("@/lib/maya/video-generation-service")

    const result = await checkVideoGeneration({
      userId: "user-1",
      predictionId: "pred_video_123",
      videoId: 77,
    })

    expect(result).toEqual({
      status: "failed",
      error: "An error occurred while processing your request (E002)",
    })
    expect(mockAddCredits).toHaveBeenCalledWith(
      "user-1",
      3,
      "refund",
      "Refund for failed app-v3 video prediction: 77"
    )
    const updateSql = (mockSql.mock.calls[1][0] as TemplateStringsArray).join(" ")
    expect(updateSql).toContain("SET status = 'failed'")
  })

  it("does not refund a video row already marked failed", async () => {
    mockSql.mockResolvedValueOnce([
      {
        id: 77,
        status: "failed",
        error_message: "An error occurred while processing your request (E002)",
      },
    ])

    const { checkVideoGeneration } = await import("@/lib/maya/video-generation-service")

    const result = await checkVideoGeneration({
      userId: "user-1",
      predictionId: "pred_video_123",
      videoId: 77,
    })

    expect(result).toEqual({
      status: "failed",
      error: "An error occurred while processing your request (E002)",
    })
    expect(mockReplicateGet).not.toHaveBeenCalled()
    expect(mockAddCredits).not.toHaveBeenCalled()
  })
})
