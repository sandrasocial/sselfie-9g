// @vitest-environment node
import { NextRequest } from "next/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getLatestContentBriefJob: vi.fn(),
  loggerStart: vi.fn(),
  loggerSuccess: vi.fn(),
  loggerError: vi.fn(),
}))

vi.mock("@/lib/content-engine/brief-generator", () => ({
  generateContentBrief: vi.fn(),
  generateContentBriefResearchMemo: vi.fn(),
  generateDailyStoriesForBrief: vi.fn(),
}))

vi.mock("@/lib/analytics/reports", () => ({
  getLatestAnalyticsReports: vi.fn(),
  storeAnalyticsReport: vi.fn(),
}))

vi.mock("@/lib/content-engine/brief-jobs", () => ({
  claimNextContentBriefJob: vi.fn(),
  completeContentBriefJob: vi.fn(),
  failContentBriefJob: vi.fn(),
  getLatestContentBriefJob: mocks.getLatestContentBriefJob,
  markContentBriefJobPhase: vi.fn(),
}))

vi.mock("@/lib/cron-logger", () => ({
  createCronLogger: () => ({
    start: mocks.loggerStart,
    success: mocks.loggerSuccess,
    error: mocks.loggerError,
  }),
}))

import { GET } from "@/app/api/cron/content-brief-jobs/route"

describe("content-brief-jobs cron gate", () => {
  beforeEach(() => {
    process.env.CRON_SECRET = "cron-secret"
    delete process.env.CONTENT_BRIEF_ENABLED
    vi.clearAllMocks()
  })

  afterEach(() => {
    delete process.env.CRON_SECRET
    delete process.env.CONTENT_BRIEF_ENABLED
  })

  it("short-circuits before reading the queue when the retired pipeline is disabled", async () => {
    const request = new NextRequest("http://localhost/api/cron/content-brief-jobs", {
      headers: { authorization: "Bearer cron-secret" },
    })

    const response = await GET(request)

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      success: true,
      generated: false,
      skipped: "disabled",
    })
    expect(mocks.getLatestContentBriefJob).not.toHaveBeenCalled()
    expect(mocks.loggerSuccess).toHaveBeenCalledWith({
      generated: false,
      skipped: "disabled",
    })
  })
})
