import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

describe("growth intelligence synthetic-account filtering", () => {
  it("classifies smoke and test emails as synthetic", async () => {
    const { isSyntheticAnalyticsEmail } = await import("../scripts/_shared/synthetic-email-filter.mjs")

    expect(isSyntheticAnalyticsEmail("maya-page-fix-proof2-1773153581951@example.com")).toBe(true)
    expect(isSyntheticAnalyticsEmail("maya-inline-smoke-20260310-1@sselfie.test")).toBe(true)
    expect(isSyntheticAnalyticsEmail("playwright-runner@realbrand.com")).toBe(true)
    expect(isSyntheticAnalyticsEmail("sandra@sselfie.ai")).toBe(false)
  })

  it("applies the synthetic-user filter to live growth scripts", () => {
    const funnelDigest = readFileSync(resolve(process.cwd(), "scripts/funnel-digest.mjs"), "utf8")
    const cohortReport = readFileSync(resolve(process.cwd(), "scripts/cohort-report-weekly.mjs"), "utf8")

    expect(funnelDigest).toContain("LOWER(COALESCE(email, '')) NOT LIKE")
    expect(funnelDigest).toContain("%@example.com%")
    expect(funnelDigest).toContain("%@sselfie.test%")
    expect(cohortReport).toContain("LOWER(COALESCE(email, '')) NOT LIKE")
    expect(cohortReport).toContain("%@example.com%")
    expect(cohortReport).toContain("%@sselfie.test%")
  })
})
