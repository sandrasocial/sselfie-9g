// @vitest-environment node

import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const read = (path: string) => readFileSync(path, "utf8")

describe("Calendar and Create share one Maya workspace", () => {
  it("opens the existing concierge from a selected Calendar post", () => {
    const types = read("components/app-v3/types.ts")
    const concierge = read("components/app-v3/concierge-context.tsx")
    const planner = read("components/app-v3/feed-planner-view.tsx")
    const nav = read("components/feed-planner/feed-nav-context.tsx")

    expect(types).toContain("export interface CalendarPostTarget")
    expect(types).toContain("calendarTarget?: CalendarPostTarget | null")
    expect(types).toContain("openForCalendarPost")
    expect(concierge).toContain("openForCalendarPost")
    expect(concierge).toContain("startedAt: prev.startedAt")
    expect(planner).toContain("useConcierge()")
    expect(planner).toContain("openForCalendarPost(target)")
    expect(nav).toContain("navigateToMaya?: (target?: CalendarPostTarget) => void")
  })

  it("removes the duplicate Calendar Maya only from the embedded Suite", () => {
    const calendar = read("components/feed-planner/instagram-feed-view.tsx")
    const shell = read("components/app-v3/app-v3-shell.tsx")

    expect(calendar).toContain("const usesSharedSuiteMaya = Boolean(feedNav?.navigateToMaya)")
    expect(calendar).toContain("!usesSharedSuiteMaya")
    expect(calendar).toContain("feedNav?.navigateToMaya?.(calendarPostTarget(post))")
    expect(shell).toContain('section === "create" || section === "calendar"')
    expect(shell).toContain("<MayaFloatingLauncher />")
    expect(shell).not.toContain('section !== "calendar" && <MayaFloatingLauncher')
  })

  it("persists the selected Calendar post through close, reopen, and reload", () => {
    const continuity = read("components/app-v3/continuity.ts")

    expect(continuity).toContain("function sanitizeCalendarPostTarget")
    expect(continuity).toContain(
      "calendarTarget: sanitizeCalendarPostTarget(session.calendarTarget)"
    )
  })

  it("restores an already-filled Calendar post when delivery is undone", () => {
    const concierge = read("components/app-v3/maya-concierge.tsx")
    const context = read("components/app-v3/concierge-context.tsx")

    expect(concierge).toContain("const restorePrevious = Boolean(target.delivery.previousImageUrl)")
    expect(concierge).toContain('restorePrevious ? "replace-post-image" : "remove-post-image"')
    expect(context).toContain("prev.calendarTarget.delivery?.previousImageUrl")
    expect(context).toContain("prev.calendarTarget.delivery?.previousAiImageId")
  })

  it("connects a Maya concept generation to the exact selected slot", () => {
    const maya = read("components/app-v3/maya-concierge.tsx")
    const replaceRoute = read("app/api/feed/[feedId]/replace-post-image/route.ts")

    expect(maya).toContain("beginCalendarGeneration")
    expect(maya).toContain("attachCalendarGeneration")
    expect(maya).toContain("failCalendarGeneration")
    expect(maya).toContain("generationRequestId")
    expect(maya).toContain("calendarSurfaceActive &&")
    expect(maya).toContain("/maya-generation")
    expect(maya).toContain("calendar:feed-updated")
    expect(replaceRoute).toContain("generationRequestId")
    expect(replaceRoute).toContain("prediction_id = NULL")
    expect(replaceRoute).toContain("This Calendar request is no longer active")
  })

  it("keeps server-backed creating and failed states reload-safe", () => {
    const statusRoute = read("app/api/feed/[feedId]/maya-generation/route.ts")
    const gridItem = read("components/feed-planner/feed-grid-item.tsx")

    expect(statusRoute).toContain("generation_status = 'generating'")
    expect(statusRoute).toContain("generation_status = 'failed'")
    expect(statusRoute).toContain("prediction_id =")
    expect(statusRoute).toContain("WHERE id =")
    expect(statusRoute).toContain("user_id =")
    expect(gridItem).toContain('predictionId.startsWith("maya:")')
    expect(gridItem).toContain("Ask Maya to try again")
  })
})
