import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getAuthenticatedUserWithRetry: vi.fn(),
  getUserByAuthId: vi.fn(),
  sql: vi.fn(),
}))

vi.mock("@/lib/auth-helper", () => ({
  getAuthenticatedUserWithRetry: mocks.getAuthenticatedUserWithRetry,
}))
vi.mock("@/lib/user-mapping", () => ({ getUserByAuthId: mocks.getUserByAuthId }))
vi.mock("@/lib/db/client", () => ({ getDb: () => mocks.sql }))

describe("Calendar post details route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getAuthenticatedUserWithRetry.mockResolvedValue({ user: { id: "auth-1" }, error: null })
    mocks.getUserByAuthId.mockResolvedValue({ id: 77 })
    mocks.sql.mockResolvedValue([
      { id: 101, feed_layout_id: 12, caption: "Updated", scheduled_at: "2026-09-08" },
    ])
  })

  it("validates the planned date before touching storage", async () => {
    const { PATCH } = await import("@/app/api/feed/[feedId]/update-post/route")
    const response = await PATCH(
      new Request("http://localhost/api/feed/12/update-post", {
        method: "PATCH",
        body: JSON.stringify({ postId: 101, caption: "Updated", scheduledAt: "next week" }),
      }) as never,
      { params: Promise.resolve({ feedId: "12" }) }
    )

    expect(response.status).toBe(400)
    expect(mocks.sql).not.toHaveBeenCalled()
  })

  it("returns the owner-scoped updated post", async () => {
    const { PATCH } = await import("@/app/api/feed/[feedId]/update-post/route")
    const response = await PATCH(
      new Request("http://localhost/api/feed/12/update-post", {
        method: "PATCH",
        body: JSON.stringify({ postId: 101, caption: "Updated", scheduledAt: "2026-09-08" }),
      }) as never,
      { params: Promise.resolve({ feedId: "12" }) }
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      success: true,
      post: expect.objectContaining({ id: 101, feed_layout_id: 12 }),
    })
    expect(mocks.sql).toHaveBeenCalledTimes(1)
  })
})
