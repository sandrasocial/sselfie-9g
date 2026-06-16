import { beforeEach, describe, expect, it, vi } from "vitest"

const mockCheckCredits = vi.fn()
const mockDeductCredits = vi.fn()
const mockGetUserCredits = vi.fn()
const mockGetDbClient = vi.fn()
const mockSql = vi.fn()
const mockReplicateCreate = vi.fn()
const mockReplicateGet = vi.fn()
const mockPut = vi.fn()
const mockHookMayaGeneration = vi.fn()
const mockLogTtfiCompletionOnFirstGallerySave = vi.fn()

vi.mock("@/lib/credits", () => ({
  checkCredits: mockCheckCredits,
  deductCredits: mockDeductCredits,
  getUserCredits: mockGetUserCredits,
  CREDIT_COSTS: {
    IMAGE: 1,
  },
}))

vi.mock("@/lib/db/client", () => ({
  getDbClient: mockGetDbClient,
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

vi.mock("@/lib/quality/hooks", () => ({
  hookMayaGeneration: mockHookMayaGeneration,
}))

vi.mock("@/lib/analytics/ttfi", () => ({
  logTtfiCompletionOnFirstGallerySave: mockLogTtfiCompletionOnFirstGallerySave,
}))

describe("app-v3 custom trained-model generation service", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    vi.unstubAllGlobals()

    mockGetDbClient.mockReturnValue(mockSql)
    mockCheckCredits.mockResolvedValue(true)
    mockDeductCredits.mockResolvedValue({ success: true, newBalance: 8 })
    mockGetUserCredits.mockResolvedValue(0)
    mockReplicateCreate.mockResolvedValue({ id: "pred_custom_123" })
    mockReplicateGet.mockResolvedValue({ status: "processing" })
    mockPut.mockResolvedValue({ url: "https://blob.example.com/generated.png" })
    mockHookMayaGeneration.mockResolvedValue(undefined)
    mockLogTtfiCompletionOnFirstGallerySave.mockResolvedValue(undefined)
  })

  it("starts a trained-model image generation with the user's completed model", async () => {
    mockSql
      .mockResolvedValueOnce([
        {
          gender: "female",
          ethnicity: "Nordic",
          trigger_word: "sandra",
          replicate_version_id: "owner/model:abc123",
          replicate_model_id: "owner/model",
          lora_scale: 0.9,
          lora_weights_url: "https://example.com/lora.safetensors",
        },
      ])
      .mockResolvedValueOnce([{ id: 42 }])

    const { startTrainedModelGeneration } = await import(
      "@/lib/maya/trained-model-generation-service"
    )

    const result = await startTrainedModelGeneration({
      userId: "user-1",
      conceptTitle: "Marble cafe portrait",
      conceptDescription: "A polished cafe portrait",
      conceptPrompt: "editorial portrait in a marble cafe",
      category: "portrait",
      referenceImageUrl: "https://example.com/inspo.jpg",
      source: "app-v3-custom-model",
    })

    expect(result.generationId).toBe(42)
    expect(result.predictionId).toBe("pred_custom_123")
    expect(mockDeductCredits).toHaveBeenCalledWith(
      "user-1",
      1,
      "image",
      "Generated: Marble cafe portrait",
    )
    expect(mockReplicateCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        version: "abc123",
        input: expect.objectContaining({
          prompt: expect.stringMatching(/^sandra, Nordic woman, editorial portrait/),
          hf_lora: "https://example.com/lora.safetensors",
          guidance_scale: 2.2,
          num_inference_steps: 40,
          extra_lora_scale: 0.08,
        }),
      }),
    )
    expect(mockReplicateCreate.mock.calls[0][0].input).not.toHaveProperty("image")
    expect(mockReplicateCreate.mock.calls[0][0].input.prompt).toContain("not plastic skin")
  })

  it("returns a structured training-required error when no completed model exists", async () => {
    mockSql.mockResolvedValueOnce([])

    const { startTrainedModelGeneration, TrainedModelGenerationError } = await import(
      "@/lib/maya/trained-model-generation-service"
    )

    try {
      await startTrainedModelGeneration({
        userId: "user-1",
        conceptTitle: "Portrait",
        conceptPrompt: "editorial portrait",
      })
      throw new Error("Expected training-required error")
    } catch (error) {
      expect(error).toBeInstanceOf(TrainedModelGenerationError)
      expect(error).toMatchObject({
        status: 409,
        payload: expect.objectContaining({
          code: "training_required",
          action: "open_training_upload",
        }),
      })
    }
  })

  it("saves a completed prediction only for the authenticated user's generation", async () => {
    mockReplicateGet.mockResolvedValue({
      status: "succeeded",
      output: "https://replicate.example.com/output.png",
    })
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: "OK",
        blob: async () => new Blob([new ArrayBuffer(2048)], { type: "image/png" }),
      }),
    )
    mockSql
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          user_id: "user-1",
          prompt: "sandra, woman, cafe portrait",
          description: "Cafe",
          category: "portrait",
          subcategory: "Marble cafe",
        },
      ])
      .mockResolvedValueOnce([{ count: 0 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 88 }])

    const { checkTrainedModelGeneration } = await import(
      "@/lib/maya/trained-model-generation-service"
    )

    const result = await checkTrainedModelGeneration({
      userId: "user-1",
      predictionId: "pred_custom_123",
      generationId: 42,
      source: "app_v3_custom_model",
    })

    expect(result).toEqual({
      status: "succeeded",
      imageUrl: "https://blob.example.com/generated.png",
      aiImageId: 88,
    })
    const updateSql = (mockSql.mock.calls[0][0] as TemplateStringsArray).join(" ")
    const selectSql = (mockSql.mock.calls[1][0] as TemplateStringsArray).join(" ")
    expect(updateSql).toContain("WHERE id =")
    expect(updateSql).toContain("AND user_id =")
    expect(selectSql).toContain("WHERE id =")
    expect(selectSql).toContain("AND user_id =")
  })
})
