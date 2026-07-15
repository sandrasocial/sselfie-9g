import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  deliveredMonthEnabled: vi.fn(),
  getUserByAuthId: vi.fn(),
  hasDeliveredMonthAccess: vi.fn(),
  sql: vi.fn(),
  toast: vi.fn(),
}))

vi.mock("@/lib/auth-helper", () => ({ getAuthenticatedUser: mocks.auth }))
vi.mock("@/lib/user-mapping", () => ({ getUserByAuthId: mocks.getUserByAuthId }))
vi.mock("@/lib/db/client", () => ({ sql: mocks.sql }))
vi.mock("@/lib/feed-planner/delivered-month", () => ({
  deliveredMonthEnabled: mocks.deliveredMonthEnabled,
  hasDeliveredMonthAccess: mocks.hasDeliveredMonthAccess,
}))
vi.mock("@/lib/feed-planner/write-auto-draft", () => ({ currentPeriodMonth: () => "2026-07" }))
vi.mock("@/hooks/use-toast", () => ({ toast: mocks.toast }))

function queryText(strings: TemplateStringsArray): string {
  return Array.from(strings).join("__VALUE__")
}

const todayPost = {
  id: 91,
  feedId: 12,
  caption: "A caption ready to publish",
  contentPillar: "Visibility",
  imageUrl: "https://example.com/calendar.png",
  scheduledAt: "2026-07-15T08:00:00.000Z",
  isToday: true,
}

describe("calendar Today endpoint", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    mocks.deliveredMonthEnabled.mockReturnValue(true)
    mocks.auth.mockResolvedValue({ user: { id: "auth-77" }, error: null })
    mocks.getUserByAuthId.mockResolvedValue({ id: 77 })
    mocks.hasDeliveredMonthAccess.mockResolvedValue(true)
  })

  it("returns only the signed-in owner's current ready post", async () => {
    let query = ""
    let values: unknown[] = []
    mocks.sql.mockImplementation((strings: TemplateStringsArray, ...params: unknown[]) => {
      query = queryText(strings)
      values = params
      return [
        {
          id: 91,
          feed_layout_id: 12,
          caption: todayPost.caption,
          content_pillar: todayPost.contentPillar,
          image_url: todayPost.imageUrl,
          scheduled_at: new Date(todayPost.scheduledAt),
          is_today: true,
        },
      ]
    })

    const { GET } = await import("@/app/api/feed-planner/today/route")
    const response = await GET()

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ enabled: true, post: todayPost })
    expect(query).toContain("fl.user_id")
    expect(values).toContain(77)
  })
})

describe("calendar Today strip at 375px", () => {
  const originalFetch = global.fetch
  const originalAnchorClick = HTMLAnchorElement.prototype.click
  const originalCreateObjectURL = URL.createObjectURL
  const originalRevokeObjectURL = URL.revokeObjectURL

  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 375 })
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    })
    HTMLAnchorElement.prototype.click = vi.fn()
    URL.createObjectURL = vi.fn(() => "blob:calendar")
    URL.revokeObjectURL = vi.fn()
  })

  afterEach(() => {
    global.fetch = originalFetch
    HTMLAnchorElement.prototype.click = originalAnchorClick
    URL.createObjectURL = originalCreateObjectURL
    URL.revokeObjectURL = originalRevokeObjectURL
  })

  it("keeps download, copy, and posted actions usable in the mobile layout", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url === "/api/feed-planner/today") {
        return new Response(JSON.stringify({ enabled: true, post: todayPost }), {
          status: 200,
          headers: { "content-type": "application/json" },
        })
      }
      if (url === todayPost.imageUrl) {
        return new Response(new Blob(["image"], { type: "image/png" }), { status: 200 })
      }
      if (url === "/api/feed/12/mark-posted") {
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        })
      }
      return new Response(null, { status: 404 })
    })
    global.fetch = fetchMock as typeof fetch

    const { CalendarTodayStrip } = await import("@/components/app-v3/calendar-today-strip")
    render(<CalendarTodayStrip />)

    const download = await screen.findByRole("button", { name: "Download" })
    const copy = screen.getByRole("button", { name: "Copy caption" })
    const markPosted = screen.getByRole("button", { name: "Mark as posted" })

    fireEvent.click(download)
    await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalledOnce())

    fireEvent.click(copy)
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith(todayPost.caption))

    fireEvent.click(markPosted)
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/feed/12/mark-posted",
        expect.objectContaining({ method: "POST" }),
      ),
    )
  })
})
