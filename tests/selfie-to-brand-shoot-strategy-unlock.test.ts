// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"

const sqlMock = vi.fn()

vi.mock("@/lib/db/client", () => ({
  sql: sqlMock,
}))

describe("Selfie to Brand Shoot strategy unlock", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it("loads a completed brand strategy without requiring a freebie_brand_strategies.user_id column", async () => {
    sqlMock.mockImplementation(async (strings: TemplateStringsArray) => {
      const query = strings.join("")
      if (query.includes("user_id")) {
        throw new Error('column "user_id" does not exist')
      }

      return [
        {
          name: "Harmony",
          business_type: "Luxury real estate",
          target_audience: "Tahoe and Reno buyers and sellers",
          brand_vibe: "polished",
          strategy_json: {
            positioning: ["A calm, editorial real estate presence for high-trust clients."],
            pillars: [
              {
                name: "Market Authority",
                description: "Clear local insight with a polished point of view.",
                postIdeas: ["Weekly Tahoe market note"],
              },
            ],
            voice: {
              tone: "Warm, polished, direct",
              do: "Sound calm and specific",
              avoid: "Generic luxury language",
              phrases: ["quiet confidence"],
            },
            captionStarters: ["The detail I would look at first:"],
          },
        },
      ]
    })

    const { getCourseBrandStrategy } = await import("@/lib/selfie-to-brand-shoot/brand-strategy")
    const strategy = await getCourseBrandStrategy("harmony@example.com", "user_123")

    expect(strategy).toMatchObject({
      name: "Harmony",
      businessType: "Luxury real estate",
      targetAudience: "Tahoe and Reno buyers and sellers",
      positioning: ["A calm, editorial real estate presence for high-trust clients."],
      voice: {
        tone: "Warm, polished, direct",
      },
    })
    expect(strategy?.pillars[0]?.name).toBe("Market Authority")
  })
})
