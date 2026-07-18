// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  generateText: vi.fn(),
  sql: vi.fn(),
  createModel: vi.fn(() => "mock-instagram-bio-model"),
}))

vi.mock("server-only", () => ({}))
vi.mock("ai", () => ({ generateText: mocks.generateText }))
vi.mock("@/lib/db/client", () => ({ sql: mocks.sql }))
vi.mock("@/lib/maya/openrouter", () => ({
  createMayaOpenRouterModel: mocks.createModel,
  getMayaMaxTokensForTask: vi.fn(() => 1000),
}))

function queryText(strings: TemplateStringsArray): string {
  return Array.from(strings).join("__VALUE__")
}

describe("Calendar Instagram bio truth guard", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    mocks.createModel.mockReturnValue("mock-instagram-bio-model")
    mocks.sql.mockImplementation((strings: TemplateStringsArray) => {
      const query = queryText(strings)
      if (query.includes("FROM users")) return [{ display_name: "Maya", email: "maya@example.com" }]
      if (query.includes("FROM user_profiles")) return []
      if (query.includes("FROM brand_onboarding")) return []
      return []
    })
  })

  it("rewrites an invented free offer and uses the current Maya model route", async () => {
    mocks.generateText
      .mockResolvedValueOnce({
        text: "Helping busy moms feel better | Simple routines | Free 5-min guide below",
      })
      .mockResolvedValueOnce({
        text: "Simple wellness for busy moms | Routines that fit real life | 4-week coaching",
      })

    const { generateInstagramBio } = await import("@/lib/instagram-bio-strategist/bio-logic")
    const result = await generateInstagramBio({
      userId: "7",
      businessType: "wellness coach",
      brandVibe: "warm and practical",
      targetAudience: "busy mothers",
      currentOfferFocus: "four-week morning routine coaching program",
    })

    expect(result.success).toBe(true)
    expect(result.bio.toLowerCase()).not.toContain("free")
    expect(result.bio).toContain("4-week coaching")
    expect(mocks.generateText).toHaveBeenCalledTimes(2)
    expect(mocks.createModel).toHaveBeenCalledWith("instagram_bio")
    expect(mocks.generateText.mock.calls[0]?.[0]?.prompt).toContain(
      "four-week morning routine coaching program"
    )
    expect(mocks.generateText.mock.calls[0]?.[0]?.prompt).toContain("2026")
  })
})
