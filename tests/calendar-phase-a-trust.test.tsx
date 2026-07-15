import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  getUserByAuthId: vi.fn(),
  logAnalyticsEvent: vi.fn(),
  sql: vi.fn(),
}))

vi.mock("@/lib/auth-helper", () => ({
  getAuthenticatedUser: mocks.auth,
}))

vi.mock("@/lib/user-mapping", () => ({
  getUserByAuthId: mocks.getUserByAuthId,
}))

vi.mock("@/lib/db/client", () => ({
  sql: mocks.sql,
}))

vi.mock("@/lib/analytics/events", () => ({
  logAnalyticsEvent: mocks.logAnalyticsEvent,
}))

vi.mock("@/components/feed-planner/feed-gallery-selector", () => ({
  FeedGallerySelector: () => null,
}))

vi.mock("@/components/feed-planner/feed-post-card", () => ({
  default: ({ onUpdate }: { onUpdate?: (post: { id: number; caption: string }) => void }) => (
    <button onClick={() => onUpdate?.({ id: 7, caption: "Updated caption" })}>Update post</button>
  ),
}))

function queryText(strings: TemplateStringsArray): string {
  return Array.from(strings).join("__VALUE__")
}

describe("Calendar Phase A trust repairs", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    mocks.auth.mockResolvedValue({ user: { id: "auth-7" }, error: null })
    mocks.getUserByAuthId.mockResolvedValue({ id: 77 })
    mocks.logAnalyticsEvent.mockResolvedValue({ ok: true })
  })

  it("keeps the post overlay open and passes the updated post to its owner", async () => {
    const { default: FeedModals } = await import("@/components/feed-planner/feed-modals")
    const onClosePost = vi.fn()
    const onUpdate = vi.fn()

    render(
      <FeedModals
        selectedPost={{ id: 7, caption: "Old caption", image_url: null }}
        showGallery={null}
        showProfileGallery={false}
        feedId={12}
        feedData={{ feed: { id: 12 } }}
        onClosePost={onClosePost}
        onCloseGallery={vi.fn()}
        onCloseProfileGallery={vi.fn()}
        onShowGallery={vi.fn()}
        onUpdate={onUpdate}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: "Update post" }))

    await waitFor(() => expect(onUpdate).toHaveBeenCalledWith({ id: 7, caption: "Updated caption" }))
    expect(onClosePost).not.toHaveBeenCalled()
  })

  it("marks only a post owned by the signed-in database user with a real timestamp", async () => {
    const queries: string[] = []
    const values: unknown[][] = []
    mocks.sql.mockImplementation((strings: TemplateStringsArray, ...params: unknown[]) => {
      queries.push(queryText(strings))
      values.push(params)
      return [{ id: 9, is_posted: true, posted_at: new Date("2026-07-14T08:00:00Z") }]
    })

    const { POST } = await import("@/app/api/feed/[feedId]/mark-posted/route")
    const response = await POST(
      new Request("http://localhost/api/feed/12/mark-posted", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ postId: 9, isPosted: true }),
      }) as any,
      { params: Promise.resolve({ feedId: "12" }) },
    )

    expect(response.status).toBe(200)
    expect(mocks.getUserByAuthId).toHaveBeenCalledWith("auth-7")
    expect(queries[0]).toContain("FROM feed_layouts")
    expect(queries[0]).toContain("user_id")
    expect(values[0].some((value) => value instanceof Date)).toBe(true)
    expect(values[0]).not.toContain("NOW()")
    expect(mocks.logAnalyticsEvent).toHaveBeenCalledWith({
      eventName: "calendar_post_published",
      userId: "77",
      path: "/app?view=calendar",
      properties: { feedId: 12, postId: 9 },
    })
  })

  it("does not report success when the owned post update matches nothing", async () => {
    mocks.sql.mockResolvedValue([])
    const { POST } = await import("@/app/api/feed/[feedId]/mark-posted/route")
    const response = await POST(
      new Request("http://localhost/api/feed/12/mark-posted", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ postId: 999, isPosted: true }),
      }) as any,
      { params: Promise.resolve({ feedId: "12" }) },
    )

    expect(response.status).toBe(404)
  })

  it("keeps a successful posted action successful when analytics is unavailable", async () => {
    mocks.sql.mockResolvedValue([
      { id: 9, is_posted: true, posted_at: new Date("2026-07-14T08:00:00Z") },
    ])
    mocks.logAnalyticsEvent.mockRejectedValue(new Error("analytics unavailable"))

    const { POST } = await import("@/app/api/feed/[feedId]/mark-posted/route")
    const response = await POST(
      new Request("http://localhost/api/feed/12/mark-posted", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ postId: 9, isPosted: true }),
      }) as any,
      { params: Promise.resolve({ feedId: "12" }) },
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({ success: true })
  })
})
