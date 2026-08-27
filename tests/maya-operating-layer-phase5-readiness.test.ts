// @vitest-environment node

import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8")

describe("Maya operating layer Phase 5 readiness", () => {
  it("keeps every creation on the proven one-step ConceptCard path and confirmations on mutations", () => {
    const concierge = read("components/app-v3/maya-concierge.tsx")
    const conceptCard = read("components/app-v3/concept-card.tsx")
    const shell = read("components/app-v3/app-v3-shell.tsx")

    expect(concierge).not.toContain("actionProtocolOwnsGeneration")
    expect(concierge).not.toContain("generationPreview")
    expect(conceptCard).toContain(
      '`Create this · ${estimatedCredits} ${estimatedCredits === 1 ? "credit" : "credits"}`'
    )
    expect(conceptCard).not.toContain("Create another · ${estimatedCredits}")
    expect(concierge).toContain('kind: "apply_to_post"')
    expect(shell).toContain("close()")
  })

  it("renders every graphic slide from its own brief and the original inspiration", () => {
    const route = read("app/api/app-v3/maya/generate/route.ts")

    expect(route).not.toContain("inspirationOverrideUrl")
    expect(route).not.toContain("heroDataUrl")
    expect(route).toMatch(
      /Promise\.all\(\s*graphicJobs\.map\(\(job, index\) => renderGraphicJob\(job, index\)\)\s*\)/
    )
  })

  it("records the final member decisions and completes an existing-asset Calendar job", () => {
    const concierge = read("components/app-v3/maya-concierge.tsx")
    const calendar = read("components/feed-planner/instagram-feed-view.tsx")
    const learn = read("components/app-v3/library-view.tsx")

    expect(concierge).toContain("recordMayaJobDecision(activeMayaJob)")
    expect(concierge).toContain(
      'finishMayaJob({ job: "finish_calendar_post", outcome: "completed" })'
    )
    expect(calendar).toContain('recordMayaJobDecision("improve_grid")')
    expect(learn).toContain('recordMayaJobDecision("learn_next")')
  })

  it("restores a saved Calendar result before changing the visible app surface", () => {
    const concierge = read("components/app-v3/maya-concierge.tsx")

    expect(concierge).toContain("restoresCalendarResult")
    expect(concierge).toContain("workspacePathRef.current =")
    expect(concierge).toContain("if (shouldOpenRestoredCalendar)")
    expect(concierge).toContain("window.requestAnimationFrame(() => onOpenCalendar?.())")
  })
})
