// @vitest-environment node

import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

import { resolveReconciledSubscriptionPlan } from "@/lib/payments/reconciled-subscription-plan"

describe("subscription reconciliation plan identity", () => {
  it.each([
    "annual",
    "founding_annual",
    "maya_essential_pilot",
    "maya_pro_pilot",
    "private_founder_plan",
  ])("preserves Stripe's stable %s metadata for a newly recovered row", plan => {
    expect(
      resolveReconciledSubscriptionPlan({
        metadata: { plan },
        productType: "sselfie_studio_membership",
      }),
    ).toBe(plan)
  })

  it("recovers annual identity from the annual product id", () => {
    expect(
      resolveReconciledSubscriptionPlan({
        metadata: { product_id: "sselfie_studio_membership_annual" },
        productType: "sselfie_studio_membership",
      }),
    ).toBe("annual")
  })

  it("uses product type only as the new-row fallback", () => {
    expect(
      resolveReconciledSubscriptionPlan({
        metadata: {},
        productType: "brand_studio_membership",
      }),
    ).toBe("brand_studio_membership")
  })

  it("never rewrites plan identity in reconciliation updates", () => {
    const source = readFileSync("app/api/cron/reconcile-subscriptions/route.ts", "utf8")
    const updateStatements = source.match(/UPDATE subscriptions[\s\S]*?RETURNING id/g) || []

    expect(updateStatements.length).toBeGreaterThan(0)
    for (const statement of updateStatements) {
      expect(statement).not.toMatch(/\bplan\s*=/)
      expect(statement).not.toMatch(/\bplan\s+IS DISTINCT FROM/)
      expect(statement).toMatch(/\bstatus\s*=/)
      expect(statement).toMatch(/\bstripe_customer_id\s*=/)
      expect(statement).toMatch(/\bcurrent_period_end\s*=/)
    }
  })
})
