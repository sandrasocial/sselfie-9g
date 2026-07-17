import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  getUserByAuthId: vi.fn(),
  sql: vi.fn(),
  generateInstagramCaption: vi.fn(),
}))

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: vi.fn(async () => ({ auth: { getUser: mocks.getUser } })),
}))
vi.mock("@/lib/user-mapping", () => ({ getUserByAuthId: mocks.getUserByAuthId }))
vi.mock("@/lib/db/client", () => ({ sql: mocks.sql }))
vi.mock("@/lib/feed-planner/caption-writer", () => ({
  generateInstagramCaption: mocks.generateInstagramCaption,
}))

function queryText(strings: TemplateStringsArray): string {
  return Array.from(strings).join("__VALUE__")
}

describe("Calendar caption regeneration truth gate", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    mocks.getUser.mockResolvedValue({ data: { user: { id: "auth-1" } } })
    mocks.getUserByAuthId.mockResolvedValue({ id: 7 })
    mocks.sql.mockImplementation((strings: TemplateStringsArray) => {
      const query = queryText(strings)
      if (query.includes("FROM feed_posts fp")) {
        return [
          {
            id: 91,
            position: 1,
            post_type: "portrait",
            content_pillar: "Personal perspective",
            caption: "A made-up story from an older model response.",
            prompt: null,
            user_id: 7,
          },
        ]
      }
      if (query.includes("FROM feed_posts")) return []
      if (query.includes("FROM user_personal_brand")) return []
      return []
    })
  })

  it("does not treat an existing caption as verified personal-story context", async () => {
    mocks.generateInstagramCaption.mockResolvedValue({ caption: "Another invented story" })
    const { POST } = await import("@/app/api/feed/[feedId]/regenerate-caption/route")

    const request = new Request("http://localhost/api/feed/12/regenerate-caption", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId: 91 }),
    })
    const response = await POST(request as never, { params: { feedId: "12" } })

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toMatchObject({ code: "STORY_CONTEXT_REQUIRED" })
    expect(mocks.generateInstagramCaption).not.toHaveBeenCalled()
  })
})
