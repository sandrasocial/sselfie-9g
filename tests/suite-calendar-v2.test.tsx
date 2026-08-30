import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  navigateToFeed: vi.fn(),
  navigateToMaya: vi.fn(),
  consumePendingSlot: vi.fn(),
  consumePendingApplyImage: vi.fn(),
  toast: vi.fn(),
  trackAnalyticsEvent: vi.fn(),
  feedNav: {
    feedId: null as number | null,
    pendingSlotPosition: null as number | null,
    pendingApplyImageUrl: null as string | null,
  },
}))

vi.mock("next/image", () => ({
  default: ({ fill: _fill, alt, ...props }: Record<string, unknown>) => (
    <img alt={typeof alt === "string" ? alt : ""} {...props} />
  ),
}))

vi.mock("@/components/feed-planner/feed-nav-context", () => ({
  useFeedNav: (() => {
    const stableNav = {
      get feedId() {
        return mocks.feedNav.feedId
      },
      get pendingSlotPosition() {
        return mocks.feedNav.pendingSlotPosition
      },
      get pendingApplyImageUrl() {
        return mocks.feedNav.pendingApplyImageUrl
      },
      navigateToFeed: mocks.navigateToFeed,
      navigateToMaya: mocks.navigateToMaya,
      consumePendingSlot: mocks.consumePendingSlot,
      consumePendingApplyImage: mocks.consumePendingApplyImage,
    }
    return () => stableNav
  })(),
}))

vi.mock("@/components/feed-planner/feed-gallery-selector", () => ({
  FeedGallerySelector: () => <div>Gallery selector</div>,
}))

vi.mock("@/hooks/use-toast", () => ({ toast: mocks.toast }))
vi.mock("@/lib/analytics/client", () => ({ trackAnalyticsEvent: mocks.trackAnalyticsEvent }))

const feed = { id: 12, title: "September grid", layout_type: "grid_3x3" }
const posts = Array.from({ length: 9 }, (_, index) => ({
  id: index + 101,
  position: index + 1,
  image_url: index === 0 ? "https://example.com/photo.jpg" : null,
  caption: index === 0 ? "A real caption" : null,
  scheduled_at: null,
  is_posted: false,
}))

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  })
}

describe("Suite Calendar 2.0", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.feedNav.feedId = null
    mocks.feedNav.pendingSlotPosition = null
    mocks.feedNav.pendingApplyImageUrl = null
    mocks.fetch.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url === "/api/feed/latest") return jsonResponse({ exists: true, feed, posts })
      if (url === "/api/feed/list") {
        return jsonResponse({
          feeds: [
            { ...feed, title: feed.title, image_count: 1, post_count: 9 },
            { id: 99, title: "Preview", layout_type: "preview", image_count: 1, post_count: 1 },
          ],
        })
      }
      if (url === "/api/feed/12/update-post" && init?.method === "PATCH") {
        return jsonResponse({ post: { ...posts[0], caption: "Updated caption" } })
      }
      return jsonResponse({})
    })
    global.fetch = mocks.fetch as unknown as typeof fetch
  })

  it("opens with the Instagram grid and keeps advanced planner surfaces out of the Suite", async () => {
    const { SuiteCalendar } = await import("@/components/app-v3/suite-calendar")
    render(<SuiteCalendar />)

    expect(await screen.findByRole("heading", { name: "September grid" })).toBeInTheDocument()
    expect(screen.getByRole("region", { name: "Instagram grid" })).toBeInTheDocument()
    expect(screen.getAllByRole("button", { name: /post \d/i })).toHaveLength(9)
    expect(screen.queryByText("Brand pillars")).not.toBeInTheDocument()
    expect(screen.queryByText("Content strategy")).not.toBeInTheDocument()
    expect(screen.queryByText("Bulk create")).not.toBeInTheDocument()
    expect(screen.queryByRole("option", { name: "Preview" })).not.toBeInTheDocument()
  })

  it("uses a contained full-photo preview and saves caption plus planned date together", async () => {
    const { SuiteCalendar } = await import("@/components/app-v3/suite-calendar")
    render(<SuiteCalendar />)

    fireEvent.click(await screen.findByRole("button", { name: "Edit post 1, Ready" }))
    const preview = screen.getByAltText("Post 1 preview")
    expect(preview).toHaveClass("object-contain")

    const caption = screen.getByPlaceholderText("Write what you want to say…")
    fireEvent.change(caption, { target: { value: "Updated caption" } })
    fireEvent.change(screen.getByLabelText("Planned date · optional"), {
      target: { value: "2026-09-08" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Save post" }))

    await waitFor(() => {
      expect(mocks.fetch).toHaveBeenCalledWith(
        "/api/feed/12/update-post",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({
            postId: 101,
            caption: "Updated caption",
            scheduledAt: "2026-09-08",
          }),
        })
      )
    })
  })

  it("creates an empty Maya-directed grid immediately instead of opening a setup wizard", async () => {
    mocks.fetch.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url === "/api/feed/latest") return jsonResponse({ exists: false })
      if (url === "/api/feed/list") return jsonResponse({ feeds: [] })
      if (url === "/api/feed/create-manual" && init?.method === "POST") {
        return jsonResponse({ feedId: 44 })
      }
      return jsonResponse({})
    })

    const { SuiteCalendar } = await import("@/components/app-v3/suite-calendar")
    render(<SuiteCalendar />)
    fireEvent.click(await screen.findByRole("button", { name: "Start my grid" }))

    await waitFor(() => {
      expect(mocks.fetch).toHaveBeenCalledWith(
        "/api/feed/create-manual",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ title: "My grid", directionMode: "maya" }),
        })
      )
      expect(mocks.navigateToFeed).toHaveBeenCalledWith(44, { openPosition: 1 })
    })
  })

  it("hands the exact selected post to Maya as a secondary action", async () => {
    const { SuiteCalendar } = await import("@/components/app-v3/suite-calendar")
    render(<SuiteCalendar />)
    fireEvent.click(await screen.findByRole("button", { name: "Edit post 1, Ready" }))
    fireEvent.click(screen.getByRole("button", { name: "Ask Maya about this post" }))

    expect(mocks.navigateToMaya).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: "calendar:12:101",
        feedId: 12,
        postId: 101,
        position: 1,
        requestedAction: "improve_caption",
      })
    )
  })
})
