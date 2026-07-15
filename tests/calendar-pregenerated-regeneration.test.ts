import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  checkCredits: vi.fn(),
  deductCredits: vi.fn(),
  generateWithNanoBanana: vi.fn(),
  getFeedPlannerAccess: vi.fn(),
  getFeedStyleV2ByName: vi.fn(),
  getUserByAuthId: vi.fn(),
  rateLimit: vi.fn(),
  selectPromptForPosition: vi.fn(),
  sql: vi.fn(),
}))

vi.mock("@/lib/auth-helper", () => ({
  getAuthenticatedUserWithRetry: mocks.auth,
  clearAuthCache: vi.fn(),
}))
vi.mock("@/lib/user-mapping", () => ({ getUserByAuthId: mocks.getUserByAuthId }))
vi.mock("@/lib/db/client", () => ({ sql: mocks.sql }))
vi.mock("@/lib/rate-limit", () => ({ checkGenerationRateLimit: mocks.rateLimit }))
vi.mock("@/lib/feed-planner/access-control", () => ({
  getFeedPlannerAccess: mocks.getFeedPlannerAccess,
}))
vi.mock("@/lib/credits", () => ({
  CREDIT_COSTS: { IMAGE: 1 },
  checkCredits: mocks.checkCredits,
  deductCredits: mocks.deductCredits,
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

describe("pregenerated slot regeneration", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    process.env.FEED_PLANNER_IMAGE_ENGINE = "nano-banana"
    mocks.auth.mockResolvedValue({ user: { id: "auth-77" }, error: null })
    mocks.getUserByAuthId.mockResolvedValue({ id: 77 })
    mocks.getFeedPlannerAccess.mockResolvedValue({
      canGenerateImages: true,
      isMembership: true,
      isPaidBlueprint: false,
      isFree: false,
    })
    mocks.rateLimit.mockResolvedValue({ success: true, remaining: 9, reset: Date.now() + 60_000 })
    mocks.checkCredits.mockResolvedValue(true)
    mocks.deductCredits.mockResolvedValue({ success: true, newBalance: 18 })
    mocks.generateWithNanoBanana.mockResolvedValue({ predictionId: "member-regen-91" })
    mocks.getFeedStyleV2ByName.mockResolvedValue({ id: 8, enabled: true })
    mocks.selectPromptForPosition.mockResolvedValue({
      prompt_text: "A complete curated portrait prompt with natural window light and texture",
    })
  })

  afterEach(() => {
    delete process.env.FEED_PLANNER_IMAGE_ENGINE
  })

  it("charges one normal generation for a reset pre-made slot and does not charge a retry", async () => {
    let predictionId: string | null = null
    let claimed = false
    mocks.sql.mockImplementation((strings: TemplateStringsArray) => {
      const query = queryText(strings)
      if (query.includes("SELECT * FROM feed_posts")) {
        return [
          {
            id: 91,
            feed_layout_id: 12,
            user_id: 77,
            position: 1,
            post_type: "selfie",
            content_pillar: "Visibility",
            generation_mode: "pro",
            generation_status: predictionId ? "generating" : "pending",
            prediction_id: predictionId,
            image_url: null,
            pregenerated: true,
          },
        ]
      }
      if (query.includes("UPDATE feed_posts") && query.includes("RETURNING id")) {
        if (claimed || predictionId) return []
        claimed = true
        return [{ id: 91 }]
      }
      if (query.includes("SELECT prediction_id, image_url")) {
        return [{ prediction_id: predictionId, image_url: null, generation_status: "generating" }]
      }
      if (query.includes("SELECT color_palette")) {
        return [
          {
            feed_style: "Dark & Moody",
            feed_style_variation_id: 4,
            period_month: "2026-07",
          },
        ]
      }
      if (query.includes("SELECT image_url, display_order")) {
        return [
          {
            image_url: "https://example.com/selfie.jpg",
            display_order: 1,
            uploaded_at: new Date("2026-07-01T00:00:00Z"),
          },
        ]
      }
      if (query.includes("SELECT primary_color")) return []
      if (query.includes("prediction_id =") && query.includes("generation_status = 'generating'")) {
        predictionId = "member-regen-91"
      }
      return []
    })

    const { POST } = await import("@/app/api/feed/[feedId]/generate-single/route")
    const request = () =>
      new Request("http://localhost/api/feed/12/generate-single", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ postId: 91, generationMode: "pro" }),
      }) as any

    const first = await POST(request(), { params: Promise.resolve({ feedId: "12" }) })
    const retry = await POST(request(), { params: Promise.resolve({ feedId: "12" }) })

    expect(first.status).toBe(200)
    expect(retry.status).toBe(200)
    await expect(retry.json()).resolves.toMatchObject({ alreadyGenerating: true })
    expect(mocks.deductCredits).toHaveBeenCalledOnce()
    expect(mocks.deductCredits).toHaveBeenCalledWith(
      "77",
      2,
      "image",
      "Feed post generation (Pro Mode) - selfie",
    )
  })
})
