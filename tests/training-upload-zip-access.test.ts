import { beforeEach, describe, expect, it, vi } from "vitest"

const mockGetUser = vi.fn()
const mockCreateServerClient = vi.fn()
const mockGetEffectiveNeonUser = vi.fn()
const mockCheckCredits = vi.fn()
const mockGetUserCredits = vi.fn()

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

vi.mock("@/lib/data/training", () => ({
  getOrCreateTrainingModel: vi.fn(),
}))

vi.mock("@/lib/replicate-client", () => ({
  getReplicateClient: vi.fn(),
  FLUX_LORA_TRAINER: "owner/model",
  FLUX_LORA_TRAINER_VERSION: "version",
  DEFAULT_TRAINING_PARAMS: {},
  getAdaptiveTrainingParams: vi.fn(),
}))

vi.mock("@vercel/blob", () => ({
  put: vi.fn(),
}))

vi.mock("@neondatabase/serverless", () => ({
  neon: vi.fn(() => vi.fn()),
}))

describe("POST /api/training/upload-zip", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()

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
    mockGetUserCredits.mockResolvedValue(3)
  })

  it("returns insufficient credits for non-members when credits are below training cost", async () => {
    const { POST } = await import("@/app/api/training/upload-zip/route")
    const formData = new FormData()
    formData.append("zipFile", new File(["test"], "training.zip", { type: "application/zip" }))
    formData.append("imageCount", "10")

    const request = {
      headers: {
        get: (header: string) => {
          if (header.toLowerCase() === "content-type") {
            return "multipart/form-data; boundary=test"
          }
          return null
        },
      },
      formData: async () => formData,
    } as unknown as Request

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(402)
    expect(body.error).toBe("Insufficient credits")
  })
})
