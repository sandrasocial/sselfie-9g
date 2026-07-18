import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  getUserByAuthId: vi.fn(),
  sql: vi.fn(),
}))

vi.mock("@/lib/auth-helper", () => ({ getAuthenticatedUser: mocks.auth }))
vi.mock("@/lib/user-mapping", () => ({ getUserByAuthId: mocks.getUserByAuthId }))
vi.mock("@/lib/db/client", () => ({ sql: mocks.sql }))

const queryText = (strings: TemplateStringsArray) => Array.from(strings).join("__VALUE__")

describe("Calendar Maya generation status", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    mocks.auth.mockResolvedValue({ user: { id: "auth-77" }, error: null })
    mocks.getUserByAuthId.mockResolvedValue({ id: 77 })
  })

  it("marks only the owned selected post as creating", async () => {
    const queries: string[] = []
    const values: unknown[][] = []
    mocks.sql.mockImplementation((strings: TemplateStringsArray, ...params: unknown[]) => {
      const query = queryText(strings)
      queries.push(query)
      values.push(params)
      if (query.includes("FROM feed_layouts")) return [{ id: 12, user_id: 77 }]
      if (query.includes("UPDATE feed_posts")) {
        return [
          { id: 9, position: 2, generation_status: "generating", prediction_id: "maya:req-12345" },
        ]
      }
      return []
    })

    const { POST } = await import("@/app/api/feed/[feedId]/maya-generation/route")
    const response = await POST(
      new Request("http://localhost/api/feed/12/maya-generation", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "start", postId: 9, requestId: "req-12345" }),
      }),
      { params: Promise.resolve({ feedId: "12" }) }
    )

    expect(response.status).toBe(200)
    expect(queries.some(query => query.includes("generation_status = 'generating'"))).toBe(true)
    expect(queries.some(query => query.includes("user_id ="))).toBe(true)
    expect(values.flat()).toContain("maya:req-12345")
  })

  it("treats an old failure callback as stale instead of overwriting newer work", async () => {
    let updateCalls = 0
    mocks.sql.mockImplementation((strings: TemplateStringsArray) => {
      const query = queryText(strings)
      if (query.includes("FROM feed_layouts")) return [{ id: 12, user_id: 77 }]
      if (query.includes("UPDATE feed_posts")) {
        updateCalls += 1
        return []
      }
      if (query.includes("FROM feed_posts")) {
        return [
          {
            id: 9,
            image_url: null,
            generation_status: "generating",
            prediction_id: "maya:new-request",
          },
        ]
      }
      return []
    })

    const { POST } = await import("@/app/api/feed/[feedId]/maya-generation/route")
    const response = await POST(
      new Request("http://localhost/api/feed/12/maya-generation", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "fail", postId: 9, requestId: "old-request" }),
      }),
      { params: Promise.resolve({ feedId: "12" }) }
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({ success: true, stale: true })
    expect(updateCalls).toBe(1)
  })
})
