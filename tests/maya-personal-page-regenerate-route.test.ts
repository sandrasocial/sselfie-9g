import { beforeEach, describe, expect, it, vi } from "vitest"

const mockRegenerate = vi.fn()
const mockLogEvent = vi.fn()

vi.mock("@/lib/maya/asset-generation", () => ({
  regenerateMayaPersonalPageById: mockRegenerate,
}))

vi.mock("@/lib/analytics/events", () => ({
  logAnalyticsEvent: mockLogEvent,
}))

vi.mock("@/lib/auth/with-auth", () => ({
  withAuth: (handler: any) => {
    return (request: Request, params: any) => handler({ user: { id: "42" } }, params)
  },
}))

describe("POST /api/maya/personal-pages/[pageId]/regenerate", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it("returns regenerate payload and logs analytics", async () => {
    mockRegenerate.mockResolvedValue({
      success: true,
      assetId: "maya_page_abc",
      pageId: "maya_page_abc",
      liveUrl: "/p/sandra/landing-v2",
      version: 2,
      updatedAt: "2026-03-05T00:00:00.000Z",
    })

    const { POST } = await import("@/app/api/maya/personal-pages/[pageId]/regenerate/route")

    const response = await POST(new Request("http://localhost:3000"), {
      params: Promise.resolve({ pageId: "maya_page_abc" }),
    })

    expect(response.status).toBe(200)
    const payload = await response.json()
    expect(payload.success).toBe(true)
    expect(payload.pageId).toBe("maya_page_abc")
    expect(mockRegenerate).toHaveBeenCalledWith({ userId: "42", pageId: "maya_page_abc" })
    expect(mockLogEvent).toHaveBeenCalled()
  })
})
