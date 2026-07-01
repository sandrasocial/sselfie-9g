// BRIDGE-01 Phase D — Admin Data Contract guard for the SUITE trial.
// Trials are subscriptions rows (product_type='suite_trial') and must NEVER count as
// members or MRR. These tests pin the exclusions at the source level so a refactor that
// loosens a filter fails CI instead of inflating member counts.

import { describe, expect, it } from "vitest"
import { readFileSync } from "fs"
import path from "path"

import { isMembershipSubscription } from "@/lib/revenue/membership-subscription-filter"

describe("suite_trial never counts as membership (Admin Data Contract)", () => {
  it("isMembershipSubscription rejects a suite_trial-tagged subscription", () => {
    const trialLike = {
      livemode: true,
      metadata: { product_type: "suite_trial" },
      items: { data: [] },
    }
    expect(isMembershipSubscription(trialLike, ["price_membership"])).toBe(false)
  })

  it("isMembershipSubscription still accepts a real membership", () => {
    const member = {
      livemode: true,
      metadata: { product_type: "sselfie_studio_membership" },
      items: { data: [] },
    }
    expect(isMembershipSubscription(member, ["price_membership"])).toBe(true)
  })

  it("the /app gate resolves trials through getSuiteAccess, not the membership query", () => {
    const src = readFileSync(path.join(process.cwd(), "app/app/page.tsx"), "utf8")
    expect(src).toContain("getSuiteAccess")
  })

  it("trial rows use product_type='suite_trial' (never a membership type) in the grant", () => {
    const src = readFileSync(path.join(process.cwd(), "lib/trial/suite-trial.ts"), "utf8")
    expect(src).toContain("'suite_trial'")
    // The INSERT must not create membership rows.
    const insertStart = src.indexOf("INSERT INTO subscriptions")
    const insertBlock = src.slice(insertStart, src.indexOf("RETURNING", insertStart))
    expect(insertBlock).not.toContain("sselfie_studio_membership")
    expect(insertBlock).toContain("'suite_trial'")
  })

  it("generation routes enforce the trial/member lock server-side", () => {
    for (const route of [
      "app/api/app-v3/maya/generate/route.ts",
      "app/api/app-v3/maya/edit/route.ts",
    ]) {
      const src = readFileSync(path.join(process.cwd(), route), "utf8")
      expect(/canGenerate|getSuiteAccess/.test(src), `${route} resolves suite access`).toBe(true)
      expect(src, route).toContain("generation_locked")
    }
  })

  it("admin trial counters exclude test-mode subscription rows", () => {
    const src = readFileSync(path.join(process.cwd(), "lib/admin/home-report.ts"), "utf8")
    const trialQueryStart = src.indexOf("FROM subscriptions t")
    const trialQuery = src.slice(trialQueryStart, src.indexOf("`.catch", trialQueryStart))

    expect(trialQuery).toContain("WHERE t.product_type = 'suite_trial'")
    expect(trialQuery).toContain("(t.is_test_mode = FALSE OR t.is_test_mode IS NULL)")
    expect(trialQuery).toContain("(m.is_test_mode = FALSE OR m.is_test_mode IS NULL)")
  })

  it("legacy Stripe live metrics cannot calculate MRR from payment rows or list price", () => {
    const src = readFileSync(path.join(process.cwd(), "lib/stripe/stripe-live-metrics.ts"), "utf8")

    expect(src).toContain("getSingleSourceRevenueMetrics")
    expect(src).toContain("MRR is net of discounts")
    expect(src).not.toContain("getMRRFromDatabase")
    expect(src).not.toContain("PRICING_PRODUCTS")
  })

  it("revenue truth scorecard uses analytics_events event_name and anon_id naming", () => {
    const src = readFileSync(path.join(process.cwd(), "lib/admin/revenue-truth-scorecard.ts"), "utf8")

    expect(src).toContain("analytics_events")
    expect(src).toContain("event_name")
    expect(src).not.toContain("event_type")
    expect(src).not.toContain("anonymous_id")
  })
})
