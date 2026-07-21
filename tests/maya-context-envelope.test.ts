// @vitest-environment node

import { describe, expect, it } from "vitest"

import {
  calendarMayaTaskId,
  createMayaContextEnvelope,
  mayaContextMatchesCalendarPost,
  sanitizeMayaContextEnvelope,
} from "@/lib/app-v3/maya/context-envelope"

describe("MayaContextEnvelope", () => {
  it("creates a versioned Create task without copying stable member data", () => {
    const context = createMayaContextEnvelope({
      taskId: "task-create-1",
      job: "create_content",
      surface: "create",
      startedAt: "2026-07-21T10:00:00.000Z",
    })

    expect(context).toEqual({
      schemaVersion: 1,
      taskId: "task-create-1",
      job: "create_content",
      surface: "create",
      startedAt: "2026-07-21T10:00:00.000Z",
    })
    expect(context).not.toHaveProperty("email")
    expect(context).not.toHaveProperty("brandProfile")
    expect(context).not.toHaveProperty("entitlements")
    expect(context).not.toHaveProperty("memberMemory")
  })

  it("keys Calendar task identity to the exact grid and post", () => {
    expect(calendarMayaTaskId(101, 707)).toBe("maya-calendar-v1-101-707")
    expect(calendarMayaTaskId(101, 708)).not.toBe(calendarMayaTaskId(101, 707))

    const context = createMayaContextEnvelope({
      taskId: calendarMayaTaskId(101, 707),
      job: "finish_calendar_post",
      surface: "calendar",
      feedId: 101,
      postId: 707,
      postPosition: 7,
      startedAt: "2026-07-21T10:00:00.000Z",
    })

    expect(mayaContextMatchesCalendarPost(context, 101, 707)).toBe(true)
    expect(mayaContextMatchesCalendarPost(context, 101, 708)).toBe(false)
  })

  it("carries inspiration only when the member explicitly chose to carry it", () => {
    expect(
      sanitizeMayaContextEnvelope({
        schemaVersion: 1,
        taskId: "task-1",
        job: "create_content",
        surface: "create",
        inspirationRef: {
          url: "https://example.com/inspiration.jpg",
          explicitlyCarried: false,
        },
        startedAt: "2026-07-21T10:00:00.000Z",
      })
    ).toEqual(
      expect.objectContaining({
        inspirationRef: { explicitlyCarried: false },
      })
    )

    expect(
      sanitizeMayaContextEnvelope({
        schemaVersion: 1,
        taskId: "task-2",
        job: "create_content",
        surface: "create",
        inspirationRef: {
          url: "https://example.com/inspiration.jpg",
          explicitlyCarried: true,
        },
        startedAt: "2026-07-21T10:00:00.000Z",
      })
    ).toEqual(
      expect.objectContaining({
        inspirationRef: {
          url: "https://example.com/inspiration.jpg",
          explicitlyCarried: true,
        },
      })
    )
  })

  it("rejects ambiguous or malformed targets instead of guessing", () => {
    expect(
      sanitizeMayaContextEnvelope({
        schemaVersion: 1,
        taskId: "task-calendar",
        job: "finish_calendar_post",
        surface: "calendar",
        feedId: 101,
        startedAt: "2026-07-21T10:00:00.000Z",
      })
    ).toBeNull()

    expect(
      sanitizeMayaContextEnvelope({
        schemaVersion: 1,
        taskId: "task-bad",
        job: "create_content",
        surface: "calendar",
        startedAt: "not-a-date",
      })
    ).toBeNull()
  })
})
