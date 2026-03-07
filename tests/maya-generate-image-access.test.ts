import { beforeEach, describe, expect, it, vi } from "vitest"

const mockRateLimit = vi.fn()
const mockGetAuthenticatedUser = vi.fn()
const mockGetEffectiveNeonUser = vi.fn()
const mockCheckCredits = vi.fn()
const mockDeductCredits = vi.fn()
const mockGetUserCredits = vi.fn()
const mockGetDbClient = vi.fn()
const mockSql = vi.fn()
const mockReplicateCreate = vi.fn()
const mockGetReplicateClient = vi.fn()
const mockTriggerReferralEmailIfNeeded = vi.fn()

vi.mock("@/lib/rate-limit-api", () => ({
  rateLimit: mockRateLimit,
}))

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
  CREDIT_COSTS: {
    IMAGE: 1,
  },
}))

vi.mock("@/lib/db/client", () => ({
  getDbClient: mockGetDbClient,
}))

vi.mock("@/lib/replicate-client", () => ({
  getReplicateClient: mockGetReplicateClient,
}))

vi.mock("@/lib/referrals/trigger-referral-email", () => ({
  triggerReferralEmailIfNeeded: mockTriggerReferralEmailIfNeeded,
}))

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

describe("POST /api/maya/generate-image access and safety", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()

    mockRateLimit.mockResolvedValue({ success: true })
    mockGetAuthenticatedUser.mockResolvedValue({ user: { id: "auth-user-1" }, error: null })
    mockGetEffectiveNeonUser.mockResolvedValue({ id: "neon-user-1" })
    mockCheckCredits.mockResolvedValue(true)
    mockDeductCredits.mockResolvedValue({ success: true, newBalance: 9 })
    mockGetUserCredits.mockResolvedValue(0)
    mockGetDbClient.mockReturnValue(mockSql)
    mockGetReplicateClient.mockReturnValue({
      predictions: {
        create: mockReplicateCreate,
      },
    })
    mockReplicateCreate.mockResolvedValue({ id: "pred_123" })
    mockTriggerReferralEmailIfNeeded.mockResolvedValue(undefined)
  })

  it("allows credit-eligible non-members and does not leak full prompt", async () => {
    mockSql
      .mockResolvedValueOnce([
        {
          gender: "female",
          ethnicity: "nordic",
          trigger_word: "sandra",
          replicate_version_id: "owner/model:1234567890abcdef",
          replicate_model_id: "owner/model",
          training_status: "completed",
          lora_scale: 1,
          lora_weights_url: "https://example.com/lora.safetensors",
        },
      ])
      .mockResolvedValueOnce([{ id: 321 }])

    const { POST } = await import("@/app/api/maya/generate-image/route")
    const request = new Request("http://localhost/api/maya/generate-image", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        conceptTitle: "Editorial portrait",
        conceptDescription: "Test",
        conceptPrompt: "Luxury portrait in natural light",
        category: "portrait",
      }),
    })

    const response = await POST(request as any)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.predictionId).toBe("pred_123")
    expect(body).not.toHaveProperty("fluxPrompt")
  })

  it("returns structured training-required guidance when custom model is missing", async () => {
    mockSql.mockResolvedValueOnce([])

    const { POST } = await import("@/app/api/maya/generate-image/route")
    const request = new Request("http://localhost/api/maya/generate-image", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        conceptTitle: "Editorial portrait",
        conceptDescription: "Test",
        conceptPrompt: "Luxury portrait in natural light",
        category: "portrait",
      }),
    })

    const response = await POST(request as any)
    const body = await response.json()

    expect(response.status).toBe(409)
    expect(body.code).toBe("training_required")
    expect(body.action).toBe("open_training_upload")
  })

  it("returns structured credits-topup guidance on low credits", async () => {
    mockCheckCredits.mockResolvedValue(false)
    mockGetUserCredits.mockResolvedValue(0)

    const { POST } = await import("@/app/api/maya/generate-image/route")
    const request = new Request("http://localhost/api/maya/generate-image", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        conceptTitle: "Editorial portrait",
        conceptDescription: "Test",
        conceptPrompt: "Luxury portrait in natural light",
        category: "portrait",
      }),
    })

    const response = await POST(request as any)
    const body = await response.json()

    expect(response.status).toBe(402)
    expect(body.code).toBe("insufficient_credits")
    expect(body.action).toBe("open_credits_topup")
  })
})
