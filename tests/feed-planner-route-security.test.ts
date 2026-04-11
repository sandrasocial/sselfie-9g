import { beforeEach, describe, expect, it, vi } from "vitest"

const mockGetAuthenticatedUserWithRetry = vi.fn()
const mockGetUserByAuthId = vi.fn()
const mockSql = vi.fn()

vi.mock("@/lib/auth-helper", () => ({
  getAuthenticatedUserWithRetry: mockGetAuthenticatedUserWithRetry,
}))

vi.mock("@/lib/user-mapping", () => ({
  getUserByAuthId: mockGetUserByAuthId,
}))

vi.mock("@/lib/db/client", () => ({
  sql: mockSql,
  getDb: () => mockSql,
}))

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn(async () => ({ data: { user: { id: "auth-user-1" } }, error: null })),
    },
  })),
}))

function asQuery(strings: TemplateStringsArray): string {
  return Array.from(strings).join("__VALUE__")
}

describe("Feed planner route security hardening", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    mockGetAuthenticatedUserWithRetry.mockResolvedValue({
      user: { id: "auth-user-1" },
      error: null,
    })
    mockGetUserByAuthId.mockResolvedValue({
      id: 42,
      email: "user@example.com",
    })
  })

  it("rejects expand-for-paid when feed does not belong to current user", async () => {
    mockSql.mockImplementation((strings: TemplateStringsArray) => {
      const query = asQuery(strings)
      if (query.includes("FROM feed_layouts")) return []
      return []
    })

    const { POST } = await import("@/app/api/feed/expand-for-paid/route")
    const req = new Request("http://localhost/api/feed/expand-for-paid", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ feedId: 999 }),
    })

    const res = await POST(req as any)
    expect(res.status).toBe(404)
  })

  it("requires authentication for feed PATCH bio updates", async () => {
    mockGetAuthenticatedUserWithRetry.mockResolvedValue({
      user: null,
      error: new Error("unauthorized"),
    })

    const { PATCH } = await import("@/app/api/feed/[feedId]/route")
    const req = new Request("http://localhost/api/feed/123", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ bio: "new bio" }),
    })

    const res = await PATCH(req as any, { params: Promise.resolve({ feedId: "123" }) })
    expect(res.status).toBe(401)
  })

  it("rejects delete when feed ownership check fails before child deletes", async () => {
    const seenQueries: string[] = []
    mockSql.mockImplementation((strings: TemplateStringsArray) => {
      const query = asQuery(strings)
      seenQueries.push(query)
      if (query.includes("SELECT id FROM feed_layouts")) return []
      return []
    })

    const { DELETE } = await import("@/app/api/feed/[feedId]/route")
    const req = new Request("http://localhost/api/feed/999", {
      method: "DELETE",
    })

    const res = await DELETE(req as any, { params: Promise.resolve({ feedId: "999" }) })
    expect(res.status).toBe(404)
    expect(seenQueries.some((q) => q.includes("DELETE FROM feed_posts"))).toBe(false)
  })
})
