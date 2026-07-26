// @vitest-environment node

import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8")

describe("Maya operating layer Phase 5 readiness", () => {
  it("keeps multi-slide concepts on the proven one-step ConceptCard creation path", () => {
    const concierge = read("components/app-v3/maya-concierge.tsx")
    const conceptCard = read("components/app-v3/concept-card.tsx")

    expect(concierge).toContain("isMultiSlideCreation")
    expect(concierge).toContain("!isMultiSlideCreation")
    expect(conceptCard).toContain(
      '`Create this · ${estimatedCredits} ${estimatedCredits === 1 ? "credit" : "credits"}`'
    )
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
})
