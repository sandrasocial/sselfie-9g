import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

describe("funnel cleanup evidence", () => {
  it("loads route-level analytics evidence without changing route behavior", () => {
    const evidence = readFileSync("lib/funnel/cleanup-evidence.ts", "utf8")

    expect(evidence).toContain("getFunnelCleanupEvidence")
    expect(evidence).toContain("analytics_events")
    expect(evidence).toContain("checkout_attribution")
    expect(evidence).toContain("events30d")
    expect(evidence).toContain("events90d")
    expect(evidence).toContain("uniqueActors30d")
    expect(evidence).toContain("uniqueActors90d")
    expect(evidence).toContain("checkoutCompletions90d")
    expect(evidence).toContain("revenue90dCents")
    expect(evidence).toContain("cleanupScore")
    expect(evidence).toContain("scoreLabel")
    expect(evidence).toContain("latestSeenAt")
    expect(evidence).not.toContain("redirect(")
  })
})
