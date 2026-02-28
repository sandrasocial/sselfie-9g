import { beforeEach, describe, expect, it, vi } from "vitest"

const mockRateLimit = vi.fn()
const mockGetUser = vi.fn()
const mockCreateServerClient = vi.fn()
const mockGetEffectiveNeonUser = vi.fn()
const mockCheckCredits = vi.fn()
const mockGetUserCredits = vi.fn()

vi.mock("@/lib/rate-limit-api", () => ({
  rateLimit: mockRateLimit,
}))

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: mockCreateServerClient,
}))

vi.mock("@/lib/simple-impersonation", () => ({
  getEffectiveNeonUser: mockGetEffectiveNeonUser,
}))

vi.mock("@/lib/credits", () => ({
  checkCredits: mockCheckCredits,
  deductCredits: vi.fn(),
  getUserCredits: mockGetUserCredits,
  CREDIT_COSTS: {
    TRAINING: 20,
  },
}))

vi.mock("@/lib/subscription", () => ({
  hasStudioMembership: vi.fn().mockResolvedValue(false),
}))

vi.mock("@/lib/db-singleton", () => ({
  getDbClient: vi.fn(() => vi.fn()),
}))

vi.mock("@/lib/data/training", () => ({
  createTrainingModel: vi.fn(),
}))

vi.mock("@/lib/replicate-client", () => ({
  getReplicateClient: vi.fn(),
  DEFAULT_TRAINING_PARAMS: {},
  getAdaptiveTrainingParams: vi.fn(),
}))

vi.mock("@/lib/storage", () => ({
  createTrainingZip: vi.fn(),
}))

describe("POST /api/training/start", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()

    mockRateLimit.mockResolvedValue({ success: true })

    mockGetUser.mockResolvedValue({
      data: { user: { id: "auth-user-1" } },
      error: null,
    })

    mockCreateServerClient.mockResolvedValue({
      auth: {
        getUser: mockGetUser,
      },
    })

    mockGetEffectiveNeonUser.mockResolvedValue({
      id: "neon-user-1",
      email: "sandra@example.com",
      display_name: "Sandra",
    })

    mockCheckCredits.mockResolvedValue(false)
    mockGetUserCredits.mockResolvedValue(2)
  })

  it("is credit-gated for non-members instead of membership-gated", async () => {
    const { POST } = await import("@/app/api/training/start/route")
    const request = new Request("http://localhost/api/training/start", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        modelName: "Test Model",
        modelType: "flux-dev-lora",
        gender: "female",
        imageUrls: ["https://example.com/1.jpg", "https://example.com/2.jpg"],
      }),
    })

    const response = await POST(request as any)
    const body = await response.json()

    expect(response.status).toBe(402)
    expect(body.error).toBe("Insufficient credits")
  })
})
