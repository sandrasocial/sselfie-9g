import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import {
  getExplicitCalendarCreativeContext,
  shouldUseCalendarCreativeContext,
} from "@/lib/app-v3/maya/calendar-context-policy"

describe("Maya Calendar context policy", () => {
  it("keeps dormant Calendar styling out of ordinary Maya creation", () => {
    expect(shouldUseCalendarCreativeContext(null)).toBe(false)
    expect(
      shouldUseCalendarCreativeContext({
        schemaVersion: 1,
        taskId: "maya-task-create",
        job: "create_content",
        surface: "create",
        startedAt: "2026-08-14T10:00:00.000Z",
      })
    ).toBe(false)
  })

  it("allows Calendar context only for an explicit Calendar task", () => {
    expect(
      shouldUseCalendarCreativeContext({
        schemaVersion: 1,
        taskId: "maya-calendar-v1-10-20",
        job: "finish_calendar_post",
        surface: "calendar",
        feedId: 10,
        postId: 20,
        startedAt: "2026-08-14T10:00:00.000Z",
      })
    ).toBe(true)
  })

  it("rejects a generic create job even when a stale client labels its surface Calendar", () => {
    expect(
      shouldUseCalendarCreativeContext({
        schemaVersion: 1,
        taskId: "maya-task-stale",
        job: "create_content",
        surface: "calendar",
        startedAt: "2026-08-14T10:00:00.000Z",
      })
    ).toBe(false)
  })

  it("rejects a Calendar task whose id does not match its feed and post", () => {
    expect(
      shouldUseCalendarCreativeContext({
        schemaVersion: 1,
        taskId: "maya-calendar-v1-10-99",
        job: "finish_calendar_post",
        surface: "calendar",
        feedId: 10,
        postId: 20,
        startedAt: "2026-08-14T10:00:00.000Z",
      })
    ).toBe(false)
  })

  it("fails closed for malformed client context", () => {
    expect(
      shouldUseCalendarCreativeContext({
        schemaVersion: 1,
        job: "finish_calendar_post",
        surface: "calendar",
      })
    ).toBe(false)
  })

  it("carries explicit task context to the server instead of inferring Calendar use", () => {
    const concierge = readFileSync("components/app-v3/maya-concierge.tsx", "utf8")
    const route = readFileSync("app/api/app-v3/maya/chat/route.ts", "utf8")
    const aesthetics = readFileSync("components/app-v3/aesthetics.ts", "utf8")

    expect(concierge).toContain("mayaContext: session.mayaContext ?? null")
    expect(route).toContain("getExplicitCalendarCreativeContext(body?.mayaContext)")
    expect(route).toContain("const calendarAccess = await getFeedPlannerAccess(memoryUserId)")
    expect(route).toContain("if (!calendarAccess.isMembership && !calendarAccess.isPaidBlueprint)")
    expect(route).toContain("AND id = ${calendarCreativeContext.feedId}")
    expect(route).toContain('if (calendarCreativeContext && toolAllowed("show_feed_plan")) {')
    expect(route).toContain("tools.show_feed_plan = showFeedPlan")
    expect(route).toContain(
      "appendCalendarSystemContext(system, memoryUserId, calendarCreativeContext)"
    )
    expect(route).toContain('String(activePost.caption || "").slice(0, 2200)')
    expect(route).toContain(
      'activePost.has_image ? " and remember that its photo is already selected"'
    )
    expect(route).toContain(': " and do not assume a photo has been selected"')
    expect(route).toContain("calendar: Boolean(calendarCreativeContext)")
    expect(route).not.toContain("if (memoryUserId && !generalConversation) {")
    expect(route).not.toContain("recent activity, and content calendar")
    expect(route).not.toContain("postingCadencePerWeek")
    expect(route).not.toContain("feedStyle) when she expresses")
    expect(aesthetics).not.toContain("recent activity, and content calendar")

    const persona = readFileSync("lib/maya/general-assistant-persona.ts", "utf8")
    expect(persona).not.toContain("and Calendar when it is relevant")
    expect(persona).not.toContain("Calendar placement")

    const memberContext = readFileSync("lib/maya/get-user-context.ts", "utf8")
    expect(memberContext).not.toContain(
      "If the user asks for a content calendar, use this brief before asking repeated questions."
    )
    expect(memberContext).toContain(
      'if (activeAssetContext && activeAssetContext.assetType !== "calendar")'
    )
  })

  it("returns the exact owned feed context needed by the route", () => {
    const context = getExplicitCalendarCreativeContext({
      schemaVersion: 1,
      taskId: "maya-calendar-v1-10-20",
      job: "finish_calendar_post",
      surface: "calendar",
      feedId: 10,
      postId: 20,
      startedAt: "2026-08-14T10:00:00.000Z",
    })

    expect(context).toMatchObject({ feedId: 10, postId: 20 })
  })
})
