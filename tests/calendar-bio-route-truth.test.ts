// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  getUserByAuthId: vi.fn(),
  generateInstagramBio: vi.fn(),
  sql: vi.fn(),
}))

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: vi.fn(async () => ({ auth: { getUser: mocks.getUser } })),
}))
vi.mock("@/lib/user-mapping", () => ({ getUserByAuthId: mocks.getUserByAuthId }))
vi.mock("@/lib/instagram-bio-strategist/bio-logic", () => ({
  generateInstagramBio: mocks.generateInstagramBio,
}))
vi.mock("@/lib/db/client", () => ({ sql: mocks.sql }))

function queryText(strings: TemplateStringsArray): string {
  return Array.from(strings).join("__VALUE__")
}

describe("Calendar bio route grounding", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    mocks.getUser.mockResolvedValue({ data: { user: { id: "auth-7" } } })
    mocks.getUserByAuthId.mockResolvedValue({ id: 7 })
    mocks.generateInstagramBio.mockResolvedValue({
      success: true,
      bio: "Wellness for busy mothers | Simple routines | 4-week coaching",
    })
    mocks.sql.mockImplementation((strings: TemplateStringsArray) => {
      const query = queryText(strings)
      if (query.includes("FROM feed_layouts")) {
        return [{ id: 12, user_id: 7, brand_vibe: "warm", business_type: "coach" }]
      }
      if (query.includes("FROM user_personal_brand")) {
        return [
          {
            brand_voice: "warm and direct",
            brand_vibe: "natural",
            business_type: "wellness coach",
            target_audience: "women",
            ideal_audience: "busy mothers",
            current_situation: "four-week morning routine coaching program",
            content_pillars: [],
            business_goals: "enroll coaching clients",
          },
        ]
      }
      if (query.includes("FROM instagram_bios")) return []
      return []
    })
  })

  it("passes the saved Calendar audience and current offer to the bio strategist", async () => {
    const { POST } = await import("@/app/api/feed/[feedId]/generate-bio/route")
    const response = await POST(new Request("http://localhost") as never, {
      params: { feedId: "12" },
    })

    expect(response.status).toBe(200)
    expect(mocks.generateInstagramBio).toHaveBeenCalledWith(
      expect.objectContaining({
        targetAudience: "busy mothers",
        currentOfferFocus: "four-week morning routine coaching program",
      })
    )
  })
})
