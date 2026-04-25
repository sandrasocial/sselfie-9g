import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

describe("2026 funnel report", () => {
  it("tracks the full opt-in to buyer return path", () => {
    const reports = readFileSync("lib/analytics/reports.ts", "utf8")
    const route = readFileSync("app/api/admin/analytics/funnel-2026/route.ts", "utf8")
    const page = readFileSync("app/admin/analytics/page.tsx", "utf8")

    expect(reports).toContain("generateFunnel2026Snapshot")
    expect(reports).toContain("selfie_guide_opt_in_success")
    expect(reports).toContain("selfie_guide_access_resolved")
    expect(reports).toContain("selfie_guide_upsell_click")
    expect(reports).toContain("starter_kit_access_opened")
    expect(reports).toContain("brand_strategy_pack_access_opened")
    expect(reports).toContain("academy_home_opened")
    expect(route).toContain("requireAdmin")
    expect(route).toContain("generateFunnel2026Snapshot")
    expect(page).toContain("2026 Funnel Snapshot")
    expect(page).toContain("Refresh 2026 Funnel")
  })
})
