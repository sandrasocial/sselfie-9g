import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

describe("Blueprint cleanup audit", () => {
  it("documents Blueprint as a Feed Planner support system, not a deletion candidate", () => {
    const audit = readFileSync("docs/funnel/SSELFIE-2026-BLUEPRINT-AUDIT.md", "utf8")

    expect(audit).toContain("Feed Planner / 30-Day Content Planner")
    expect(audit).toContain("paid Blueprint buyers must keep access")
    expect(audit).toContain("Do not delete Blueprint internals yet")
    expect(audit).toContain("paid_blueprint")
  })

  it("keeps the active Blueprint delivery surfaces referenced in the audit", () => {
    const audit = readFileSync("docs/funnel/SSELFIE-2026-BLUEPRINT-AUDIT.md", "utf8")

    expect(audit).toContain("app/checkout/blueprint/page.tsx")
    expect(audit).toContain("app/feed-planner/page.tsx")
    expect(audit).toContain("lib/feed-planner/access-control.ts")
    expect(audit).toContain("app/api/webhooks/stripe/route.ts")
    expect(audit).toContain("app/api/cron/blueprint-followup-sequence/route.ts")
  })
})
