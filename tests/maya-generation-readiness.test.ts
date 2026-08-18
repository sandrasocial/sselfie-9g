// @vitest-environment node

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { isConceptPlanReady } from "@/lib/app-v3/maya/concept-plan-readiness"

const concierge = readFileSync(join(process.cwd(), "components/app-v3/maya-concierge.tsx"), "utf8")

describe("Maya generation readiness", () => {
  it("unlocks only a completed, server-validated output for the visible format", () => {
    const plan = { format: "carousel", concepts: [{ id: "one" }] }

    expect(isConceptPlanReady({ input: plan }, "carousel", false)).toBe(false)
    expect(isConceptPlanReady({ rawInput: plan }, "carousel", false)).toBe(false)
    expect(isConceptPlanReady({ output: plan }, "photo", false)).toBe(false)
    expect(isConceptPlanReady({ output: plan }, "carousel", true)).toBe(false)
    expect(isConceptPlanReady({ output: plan }, "carousel", false)).toBe(true)
  })

  it("keeps streamed or invalid concept plans visible but not actionable", () => {
    expect(concierge).toContain("isConceptPlanReady")
    expect(concierge).toContain("Maya is finishing this plan. Create will unlock when it is ready.")
    expect(concierge).toMatch(/disabled=\{\s*!conceptPlanReady\s*\|\|/)
  })

  it("records safe diagnostics when a recovery is shown", () => {
    expect(concierge).toContain('phase: "chat_plan"')
    expect(concierge).toContain('phase: "generate_request"')
    expect(concierge).toContain('phase: "stream"')
    expect(concierge).toContain("response_status")
    expect(concierge).toContain("server_code")
    expect(concierge).toContain("plan_state")
  })
})
