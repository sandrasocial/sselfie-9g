import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  getUserByAuthId: vi.fn(),
  getFeedPlannerAccess: vi.fn(),
  draftMonthPlanForUser: vi.fn(),
}))

vi.mock("@/lib/auth-helper", () => ({ getAuthenticatedUser: mocks.auth }))
vi.mock("@/lib/user-mapping", () => ({ getUserByAuthId: mocks.getUserByAuthId }))
vi.mock("@/lib/feed-planner/access-control", () => ({
  getFeedPlannerAccess: mocks.getFeedPlannerAccess,
}))
vi.mock("@/lib/feed-planner/auto-draft", () => ({
  draftMonthPlanForUser: mocks.draftMonthPlanForUser,
}))

describe("Calendar Maya-plan access", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    mocks.auth.mockResolvedValue({ user: { id: "auth-77" }, error: null })
    mocks.getUserByAuthId.mockResolvedValue({ id: 77 })
  })

  it("does not create a full Maya month for a free account", async () => {
    mocks.getFeedPlannerAccess.mockResolvedValue({
      isFree: true,
      isMembership: false,
      isPaidBlueprint: false,
    })
    const { POST } = await import("@/app/api/app-v3/maya/feed-plan/draft/route")

    const response = await POST()

    expect(response.status).toBe(403)
    expect(mocks.draftMonthPlanForUser).not.toHaveBeenCalled()
  })

  it("allows an entitled member to explicitly ask Maya for a month", async () => {
    mocks.getFeedPlannerAccess.mockResolvedValue({
      isFree: false,
      isMembership: true,
      isPaidBlueprint: false,
    })
    mocks.draftMonthPlanForUser.mockResolvedValue({ created: true, feedLayoutId: 12, postCount: 9 })
    const { POST } = await import("@/app/api/app-v3/maya/feed-plan/draft/route")

    const response = await POST()

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({ created: true, feedLayoutId: 12 })
  })
})
