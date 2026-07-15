import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  queueAllImagesForFeed: vi.fn(),
  sql: vi.fn(),
}))

vi.mock("@/lib/db/client", () => ({ sql: mocks.sql }))
vi.mock("@/lib/feed-planner/queue-images", () => ({
  queueAllImagesForFeed: mocks.queueAllImagesForFeed,
}))
vi.mock("@/lib/feed-planner/write-auto-draft", () => ({ currentPeriodMonth: () => "2026-07" }))

function queryText(strings: TemplateStringsArray): string {
  return Array.from(strings).join("__VALUE__")
}

describe("delivered month coordinator", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    process.env.CALENDAR_DELIVERED_MONTH_ENABLED = "true"
    process.env.CALENDAR_PREGEN_WEEKLY_CAP = "1"
    process.env.CALENDAR_PREGEN_RUN_CAP = "10"
    process.env.NEXT_PUBLIC_APP_URL = "https://sselfie.ai"
    mocks.queueAllImagesForFeed.mockResolvedValue({ queuedCount: 1, failedCount: 0 })
  })

  afterEach(() => {
    delete process.env.CALENDAR_DELIVERED_MONTH_ENABLED
    delete process.env.CALENDAR_PREGEN_WEEKLY_CAP
    delete process.env.CALENDAR_PREGEN_RUN_CAP
    delete process.env.NEXT_PUBLIC_APP_URL
  })

  it("enforces the weekly cap once per member even when duplicate current layouts exist", async () => {
    let targetQuery = 0
    mocks.sql.mockImplementation((strings: TemplateStringsArray) => {
      const query = queryText(strings)
      if (query.includes("GROUP BY fl.id")) {
        return [
          {
            feed_layout_id: 12,
            user_id: 77,
            supabase_user_id: "auth-77",
            stack_auth_id: null,
            weekly_used: 0,
          },
          {
            feed_layout_id: 13,
            user_id: 77,
            supabase_user_id: "auth-77",
            stack_auth_id: null,
            weekly_used: 0,
          },
        ]
      }
      if (query.includes("SELECT id") && query.includes("FROM feed_posts")) {
        targetQuery += 1
        return [{ id: 90 + targetQuery }]
      }
      return []
    })

    const { runDeliveredMonthTopUp } = await import("@/lib/feed-planner/delivered-month")
    const result = await runDeliveredMonthTopUp()

    expect(result).toMatchObject({ queued: 1, failed: 0 })
    expect(mocks.queueAllImagesForFeed).toHaveBeenCalledOnce()
  })
})
