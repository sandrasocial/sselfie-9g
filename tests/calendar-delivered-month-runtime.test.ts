import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  checkCredits: vi.fn(),
  deductCredits: vi.fn(),
  refundCredits: vi.fn(),
  generateWithNanoBanana: vi.fn(),
  getFeedStyleV2ByName: vi.fn(),
  getUserByAuthId: vi.fn(),
  selectPromptForPosition: vi.fn(),
  sql: vi.fn(),
}))

vi.mock("@/lib/db/client", () => ({ sql: mocks.sql }))
vi.mock("@/lib/user-mapping", () => ({ getUserByAuthId: mocks.getUserByAuthId }))
vi.mock("@/lib/credits", () => ({
  CREDIT_COSTS: { IMAGE: 1 },
  checkCredits: mocks.checkCredits,
  deductCredits: mocks.deductCredits,
  refundCredits: mocks.refundCredits,
}))
vi.mock("@/lib/replicate-client", () => ({
  getReplicateClient: () => ({ predictions: { create: vi.fn() } }),
}))
vi.mock("@/lib/nano-banana-client", () => ({
  generateWithNanoBanana: mocks.generateWithNanoBanana,
  getStudioProCreditCost: () => 2,
}))
vi.mock("@/lib/feed-planner/feed-style-prompt-loader", () => ({
  getFeedStyleV2ByName: mocks.getFeedStyleV2ByName,
}))
vi.mock("@/lib/feed-planner/feed-style-generation", () => ({
  selectPromptForPosition: mocks.selectPromptForPosition,
}))

function queryText(strings: TemplateStringsArray): string {
  return Array.from(strings).join("__VALUE__")
}

function installSuccessfulSql() {
  const queries: string[] = []
  mocks.sql.mockImplementation((strings: TemplateStringsArray) => {
    const query = queryText(strings)
    queries.push(query)
    if (query.includes("SELECT id, position, prompt")) {
      return [
        {
          id: 91,
          position: 1,
          prompt: "A complete editorial portrait prompt with natural window light",
          post_type: "selfie",
          caption: "Ready to post",
          content_pillar: "Visibility",
          generation_status: "pending",
          prediction_id: null,
          image_url: null,
          generation_mode: "pro",
          pro_mode_type: "workbench",
        },
      ]
    }
    if (query.includes("SELECT color_palette")) {
      return [{ feed_style: "Dark & Moody", feed_style_variation_id: 4 }]
    }
    if (query.includes("SELECT image_url") && query.includes("user_avatar_images")) {
      return [{ image_url: "https://example.com/selfie.jpg" }]
    }
    if (query.includes("SELECT primary_color")) return []
    if (query.includes("RETURNING id")) return [{ id: 91 }]
    return []
  })
  return queries
}

describe("delivered month runtime money and recovery", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getUserByAuthId.mockResolvedValue({ id: 77 })
    mocks.checkCredits.mockResolvedValue(true)
    mocks.deductCredits.mockResolvedValue({ success: true, newBalance: 18 })
    mocks.refundCredits.mockResolvedValue({ success: true, newBalance: 20, refunded: true })
    mocks.generateWithNanoBanana.mockResolvedValue({ predictionId: "pregen-91" })
    mocks.getFeedStyleV2ByName.mockResolvedValue({ id: 8, enabled: true })
    mocks.selectPromptForPosition.mockResolvedValue({
      prompt_text: "A complete curated feed-style portrait prompt with natural window light",
    })
  })

  it("creates a marked pre-generation without checking or deducting member credits", async () => {
    const queries = installSuccessfulSql()
    const { queueAllImagesForFeed } = await import("@/lib/feed-planner/queue-images")

    const result = await queueAllImagesForFeed(
      12,
      "auth-77",
      "https://sselfie.ai",
      undefined,
      undefined,
      {
        postIds: [91],
        chargeCredits: false,
        markPregenerated: true,
        forceProMode: true,
        identityReferencesOnly: true,
        useCuratedFeedStylePrompts: true,
      }
    )

    expect(result).toMatchObject({ queuedCount: 1, failedCount: 0 })
    expect(mocks.checkCredits).not.toHaveBeenCalled()
    expect(mocks.deductCredits).not.toHaveBeenCalled()
    expect(queries.some(query => query.includes("pregenerated = TRUE"))).toBe(true)
  })

  it("keeps the default member generation path charged exactly once", async () => {
    const queries = installSuccessfulSql()
    const { queueAllImagesForFeed } = await import("@/lib/feed-planner/queue-images")

    const result = await queueAllImagesForFeed(12, "auth-77", "https://sselfie.ai")

    expect(result).toMatchObject({ queuedCount: 1, failedCount: 0 })
    expect(mocks.checkCredits).toHaveBeenCalledOnce()
    expect(mocks.deductCredits).toHaveBeenCalledOnce()
    expect(mocks.deductCredits).toHaveBeenCalledWith(
      77,
      2,
      "image",
      "Feed Planner image (post 1)",
      expect.stringMatching(/^feed-queue-91-/)
    )
    expect(queries.some(query => query.includes("pregenerated = TRUE"))).toBe(false)
  })

  it("resets a failed pre-generation slot instead of leaving it generating", async () => {
    const queries = installSuccessfulSql()
    mocks.generateWithNanoBanana.mockRejectedValue(new Error("provider unavailable"))
    const { queueAllImagesForFeed } = await import("@/lib/feed-planner/queue-images")

    const result = await queueAllImagesForFeed(
      12,
      "auth-77",
      "https://sselfie.ai",
      undefined,
      undefined,
      {
        postIds: [91],
        chargeCredits: false,
        markPregenerated: true,
        forceProMode: true,
        identityReferencesOnly: true,
        useCuratedFeedStylePrompts: true,
      }
    )

    expect(result).toMatchObject({ queuedCount: 0, failedCount: 1 })
    expect(mocks.deductCredits).not.toHaveBeenCalled()
    expect(
      queries.some(
        query =>
          query.includes("generation_status = 'failed'") && query.includes("prediction_id = NULL")
      )
    ).toBe(true)
  })

  it("refunds a charged member when the provider cannot start the image", async () => {
    installSuccessfulSql()
    mocks.generateWithNanoBanana.mockRejectedValue(new Error("provider unavailable"))
    const { queueAllImagesForFeed } = await import("@/lib/feed-planner/queue-images")

    const result = await queueAllImagesForFeed(12, "auth-77", "https://sselfie.ai")

    expect(result).toMatchObject({ queuedCount: 0, failedCount: 1 })
    expect(mocks.deductCredits).toHaveBeenCalledOnce()
    expect(mocks.refundCredits).toHaveBeenCalledWith(
      77,
      2,
      "Feed Planner post 1 failed before delivery",
      expect.stringMatching(/^feed-queue-91-/)
    )
  })
})
