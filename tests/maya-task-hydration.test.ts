import { describe, expect, it } from "vitest"

import { shouldSkipMayaTaskHistoryLookup } from "@/lib/app-v3/maya/task-hydration"

describe("Maya task history hydration", () => {
  it("starts a newly created Create task immediately instead of waiting for impossible history", () => {
    expect(
      shouldSkipMayaTaskHistoryLookup({
        taskId: "maya-task-new",
        sessionStartedAt: 2_000,
        conciergeMountedAt: 1_000,
        hasLocalSnapshot: false,
      })
    ).toBe(true)
  })

  it("still hydrates restored, Calendar, learning, and locally saved tasks", () => {
    const base = {
      sessionStartedAt: 500,
      conciergeMountedAt: 1_000,
      hasLocalSnapshot: false,
    }

    expect(shouldSkipMayaTaskHistoryLookup({ ...base, taskId: "maya-task-restored" })).toBe(false)
    expect(shouldSkipMayaTaskHistoryLookup({ ...base, taskId: "maya-calendar-v1-7-8" })).toBe(false)
    expect(shouldSkipMayaTaskHistoryLookup({ ...base, taskId: "maya-learning-v1-14-140" })).toBe(
      false
    )
    expect(
      shouldSkipMayaTaskHistoryLookup({
        taskId: "maya-task-new",
        sessionStartedAt: 2_000,
        conciergeMountedAt: 1_000,
        hasLocalSnapshot: true,
      })
    ).toBe(false)
  })
})
