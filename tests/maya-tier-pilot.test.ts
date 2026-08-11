// @vitest-environment node

import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

import {
  MAYA_TIER_PILOT,
  classifyMayaTierPilotAudience,
  evaluateMayaTierPilot,
} from "@/lib/business/maya-tier-pilot"
import { getProductById } from "@/lib/products"

describe("private Maya tier pilot", () => {
  it("tests one focused job at two monthly price points without creating a public tier", () => {
    expect(MAYA_TIER_PILOT.status).toBe("preparation-only")
    expect(MAYA_TIER_PILOT.maxCohort).toBe(20)
    expect(MAYA_TIER_PILOT.job).toContain("one selfie")
    expect(MAYA_TIER_PILOT.tiers).toEqual([
      expect.objectContaining({ id: "essential", priceEurMonthly: 29, includedCredits: 30 }),
      expect.objectContaining({ id: "pro", priceEurMonthly: 97, includedCredits: 100 }),
    ])
    expect(MAYA_TIER_PILOT.annual).toMatchObject({ priceEur: 970, status: "held" })

    expect(getProductById("maya_essential")).toBeUndefined()
    expect(getProductById("maya_essential_pilot")).toBeUndefined()
  })

  it("excludes protected, unsafe, unknown and recently mailed buyers before applying the cap", () => {
    const now = new Date("2026-08-20T09:00:00.000Z")
    const candidates = [
      {
        email: "eligible@example.com",
        isCommerceBuyer: true,
        hasProtectedAccess: false,
        marketingPermissionKnown: true,
        lastPurchaseAt: "2026-08-01T09:00:00.000Z",
      },
      {
        email: "member@example.com",
        isCommerceBuyer: true,
        hasProtectedAccess: true,
        marketingPermissionKnown: true,
      },
      {
        email: "unsubscribed@example.com",
        isCommerceBuyer: true,
        hasProtectedAccess: false,
        marketingPermissionKnown: true,
        unsubscribed: true,
      },
      {
        email: "bounced@example.com",
        isCommerceBuyer: true,
        hasProtectedAccess: false,
        marketingPermissionKnown: true,
        latestDeliveryStatus: "bounced",
      },
      {
        email: "unknown@example.com",
        isCommerceBuyer: true,
        hasProtectedAccess: false,
        marketingPermissionKnown: false,
      },
      {
        email: "internal@sselfie.ai",
        isCommerceBuyer: true,
        hasProtectedAccess: false,
        marketingPermissionKnown: true,
        isMarketingTestOrInternal: true,
      },
      {
        email: "cooldown@example.com",
        isCommerceBuyer: true,
        hasProtectedAccess: false,
        marketingPermissionKnown: true,
        lastMarketingDeliveryAt: "2026-08-18T09:01:00.000Z",
      },
    ]

    const result = classifyMayaTierPilotAudience({ candidates, now })
    expect(result.eligible.map(candidate => candidate.email)).toEqual(["eligible@example.com"])
    expect(result.excluded).toMatchObject({
      protected_access: 1,
      unsubscribed: 1,
      bounced_or_suppressed: 1,
      permission_unavailable: 1,
      test_or_internal: 1,
      marketing_cooldown: 1,
    })
  })

  it("hard-caps the cohort at 20 after ranking the newest eligible buyers first", () => {
    const candidates = Array.from({ length: 25 }, (_, index) => ({
      email: `buyer-${index}@example.com`,
      isCommerceBuyer: true,
      hasProtectedAccess: false,
      marketingPermissionKnown: true,
      lastPurchaseAt: new Date(Date.UTC(2026, 7, index + 1)).toISOString(),
    }))

    const result = classifyMayaTierPilotAudience({
      candidates,
      now: new Date("2026-09-01T09:00:00.000Z"),
    })
    expect(result.eligible).toHaveLength(20)
    expect(result.eligible[0]?.email).toBe("buyer-24@example.com")
    expect(result.excluded.audience_cap).toBe(5)
  })

  it("keeps price evidence separate from repeat-value evidence", () => {
    expect(evaluateMayaTierPilot({
      essentialPurchases: 3,
      proPurchases: 0,
      firstOutcomeMaturePurchases: 3,
      firstOutcomesWithin48h: 3,
      secondOutcomeMaturePurchases: 3,
      secondOutcomesWithin10d: 3,
    })).toMatchObject({
      paidGate: "pass",
      firstOutcomeGate: "pass",
      repeatGate: "pass",
      recommendation: "validate-essential-candidate",
    })

    expect(evaluateMayaTierPilot({
      essentialPurchases: 3,
      proPurchases: 1,
      firstOutcomeMaturePurchases: 3,
      firstOutcomesWithin48h: 3,
      secondOutcomeMaturePurchases: 3,
      secondOutcomesWithin10d: 0,
    }).recommendation).toBe("fix-recurring-job")
  })

  it("ships only an aggregate, read-only cohort audit", () => {
    const script = readFileSync("scripts/audit-maya-tier-pilot-cohort.ts", "utf8")
    for (const forbidden of [
      "INSERT ", "UPDATE ", "DELETE ", "CREATE TABLE", "ALTER TABLE",
      "contacts.segments.add", "broadcasts.create", "emails.send",
    ]) expect(script).not.toContain(forbidden)
    expect(script).toContain("cohortFingerprint")
    expect(script).not.toContain("console.log(candidate.email)")
    expect(script).not.toContain("console.log(result.eligible)")
  })
})
