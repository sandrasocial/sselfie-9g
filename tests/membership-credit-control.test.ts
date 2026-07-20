// @vitest-environment node

import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

import { calculateMonthlyCreditReset, MONTHLY_MEMBERSHIP_CREDITS } from "@/lib/credit-policy"

describe("membership credit control", () => {
  it("includes 100 credits per paid membership period", () => {
    expect(MONTHLY_MEMBERSHIP_CREDITS).toBe(100)

    const upgradeModal = readFileSync("components/upgrade/upgrade-modal.tsx", "utf8")
    expect(upgradeModal).toContain('targetTier === "sselfie_studio_membership" ? 100 : 50')
    expect(upgradeModal).not.toContain('targetTier === "sselfie_studio_membership" ? 200 : 50')
  })

  it("expires unused included credits while preserving unused purchased credits", () => {
    expect(
      calculateMonthlyCreditReset({
        currentBalance: 260,
        lifetimePurchasedCredits: 40,
      })
    ).toEqual({
      currentBalance: 260,
      purchasedCreditsPreserved: 40,
      newBalance: 140,
      ledgerDelta: -120,
    })
  })

  it("never resurrects purchased credits that have already been used", () => {
    expect(
      calculateMonthlyCreditReset({
        currentBalance: 25,
        lifetimePurchasedCredits: 80,
      })
    ).toEqual({
      currentBalance: 25,
      purchasedCreditsPreserved: 25,
      newBalance: 125,
      ledgerDelta: 100,
    })
  })

  it("does not let the safety cron issue grants on a rolling day window", () => {
    const source = readFileSync("app/api/cron/reconcile-credits/route.ts", "utf8")

    expect(source).not.toContain("INTERVAL '25 days'")
    expect(source).not.toContain("currentBalance + MONTHLY_CREDITS")
    expect(source).toContain("getAnnualMembershipPeriodsDue")
    expect(source).toContain("plan IN ('annual', 'founding_annual')")
    expect(source).toContain("row.billing_reference_id")
  })

  it("reserves legacy photoshoot credits before starting paid predictions", () => {
    const source = readFileSync("app/api/maya/create-photoshoot/route.ts", "utf8")
    const reserveIndex = source.indexOf("await deductCredits(")
    const providerIndex = source.indexOf("replicate.predictions.create(")

    expect(reserveIndex).toBeGreaterThanOrEqual(0)
    expect(providerIndex).toBeGreaterThan(reserveIndex)
    expect(source).toContain("await refundCredits(")
  })

  it("reserves single feed-image credits before starting a Replicate prediction", () => {
    const source = readFileSync("app/api/feed/[feedId]/generate-single/route.ts", "utf8")
    const replicateBranch = source.slice(source.indexOf("const replicate = getReplicateClient()"))

    expect(replicateBranch.indexOf("await deductCredits(")).toBeGreaterThanOrEqual(0)
    expect(replicateBranch.indexOf("replicate.predictions.create(")).toBeGreaterThan(
      replicateBranch.indexOf("await deductCredits(")
    )
    expect(replicateBranch).toContain("await refundCredits(")
  })

  it("does not let bulk feed generation deliver a paid prediction after a failed charge", () => {
    const source = readFileSync("lib/feed-planner/queue-images.ts", "utf8")

    expect(source).not.toContain("generated but credit charge failed (delivery not blocked)")
    expect(source).toContain("await refundCredits(")
  })
})
