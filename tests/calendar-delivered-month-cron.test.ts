import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  draftMonthPlanForUser: vi.fn(),
  getFeedPlannerAccess: vi.fn(),
  queueAllImagesForFeed: vi.fn(),
  sql: vi.fn(),
}))

vi.mock("@/lib/db/client", () => ({ sql: mocks.sql }))
vi.mock("@/lib/feed-planner/auto-draft", () => ({
  draftMonthPlanForUser: mocks.draftMonthPlanForUser,
}))
vi.mock("@/lib/feed-planner/access-control", () => ({
  getFeedPlannerAccess: mocks.getFeedPlannerAccess,
}))
vi.mock("@/lib/feed-planner/queue-images", () => ({
  queueAllImagesForFeed: mocks.queueAllImagesForFeed,
}))

describe("delivered month cron flag", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-07-15T06:00:00Z"))
    process.env.CRON_SECRET = "cron-secret"
    delete process.env.CALENDAR_DELIVERED_MONTH_ENABLED
    delete process.env.FEED_PLAN_MONTHLY_DRAFT_DISABLED
  })

  afterEach(() => {
    vi.useRealTimers()
    delete process.env.CRON_SECRET
    delete process.env.CALENDAR_DELIVERED_MONTH_ENABLED
  })

  it("does no database, drafting, or generation work on a daily non-monthly run while disabled", async () => {
    const { GET } = await import("@/app/api/cron/feed-plan-monthly-draft/route")
    const response = await GET(
      new Request("http://localhost/api/cron/feed-plan-monthly-draft", {
        headers: { authorization: "Bearer cron-secret" },
      }) as any,
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ skipped: true, reason: "monthly_window" })
    expect(mocks.sql).not.toHaveBeenCalled()
    expect(mocks.draftMonthPlanForUser).not.toHaveBeenCalled()
    expect(mocks.queueAllImagesForFeed).not.toHaveBeenCalled()
  })
})
