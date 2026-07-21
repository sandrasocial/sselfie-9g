// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest"

const { trackAnalyticsEvent } = vi.hoisted(() => ({
  trackAnalyticsEvent: vi.fn(async () => undefined),
}))
vi.mock("@/lib/analytics/client", () => ({ trackAnalyticsEvent }))

import {
  finishMayaJob,
  recordMayaJobDecision,
  recordMayaJobHandoff,
  startMayaJob,
} from "@/lib/app-v3/maya/job-analytics"

describe("Maya member-job analytics", () => {
  beforeEach(() => {
    trackAnalyticsEvent.mockClear()
    window.sessionStorage.clear()
  })

  it("pairs one anonymous start and finish without member-authored content", () => {
    const taskId = startMayaJob({
      job: "create_content",
      surface: "create",
      entry: "maya_recommendation",
      cohort: "admin",
    })
    recordMayaJobDecision("create_content")
    recordMayaJobHandoff("create_content")
    finishMayaJob({ job: "create_content", outcome: "completed", providerWaitMs: 1200 })

    expect(taskId).toBeTruthy()
    expect(trackAnalyticsEvent).toHaveBeenCalledTimes(2)
    expect(trackAnalyticsEvent.mock.calls[0][0]).toMatchObject({
      event: "suite_maya_job_started",
      properties: {
        task_id: taskId,
        job: "create_content",
        surface: "create",
        entry: "maya_recommendation",
      },
    })
    expect(trackAnalyticsEvent.mock.calls[1][0]).toMatchObject({
      event: "suite_maya_job_finished",
      properties: {
        task_id: taskId,
        outcome: "completed",
        provider_wait_ms: 1200,
        decision_count: 2,
        surface_handoff_count: 1,
      },
    })
    expect(JSON.stringify(trackAnalyticsEvent.mock.calls)).not.toContain("prompt")
    expect(window.sessionStorage.length).toBe(0)
  })

  it("deduplicates repeated starts for the same active job", () => {
    const first = startMayaJob({
      job: "learn_next",
      surface: "learn",
      entry: "what-to-post",
    })
    const second = startMayaJob({
      job: "learn_next",
      surface: "learn",
      entry: "what-to-post",
    })

    expect(second).toBe(first)
    expect(trackAnalyticsEvent).toHaveBeenCalledTimes(1)
  })

  it("remains fail-open when analytics rejects", async () => {
    trackAnalyticsEvent.mockRejectedValueOnce(new Error("analytics unavailable"))

    expect(() =>
      startMayaJob({
        job: "improve_grid",
        surface: "calendar",
        entry: "visual_direction",
      })
    ).not.toThrow()

    await Promise.resolve()
  })
})
