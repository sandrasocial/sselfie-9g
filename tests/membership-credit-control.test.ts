// @vitest-environment node

import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

import { calculateMonthlyCreditReset, MONTHLY_MEMBERSHIP_CREDITS } from "@/lib/credit-policy"
import { getProductById } from "@/lib/products"

describe("membership credit control", () => {
  it("includes 100 credits per paid membership period", () => {
    expect(MONTHLY_MEMBERSHIP_CREDITS).toBe(100)
    expect(getProductById("sselfie_studio_membership")?.credits).toBe(100)
    expect(getProductById("sselfie_studio_membership_annual")?.credits).toBe(100)

    const upgradeModal = readFileSync("components/upgrade/upgrade-modal.tsx", "utf8")
    expect(upgradeModal).toContain('targetTier === "sselfie_studio_membership" ? 100 : 50')
    expect(upgradeModal).not.toContain('targetTier === "sselfie_studio_membership" ? 200 : 50')
  })

  it("keeps every active membership and free-credit claim aligned with the live policy", () => {
    const joinPage = readFileSync("app/join/studio/page.tsx", "utf8")
    const account = readFileSync("components/app-v3/account-view.tsx", "utf8")
    const freeGeneration = readFileSync("app/api/feed/[feedId]/generate-single/route.ts", "utf8")
    const pricingCheck = readFileSync("scripts/verify-pricing-config.ts", "utf8")
    const brandKnowledge = readFileSync("scripts/seed-sselfie-brand-knowledge.sql", "utf8")

    expect(joinPage).toContain("100 creation credits that reset each billing month")
    expect(joinPage).not.toContain("200 creation credits that refill monthly")
    expect(account).toContain("Your included credits reset to 100 each billing month. Purchased top-ups stay.")
    expect(account).not.toContain("Your plan refills monthly.")
    expect(freeGeneration).toContain("Free accounts include two welcome credits.")
    expect(freeGeneration).not.toContain("Free users can generate one image")
    expect(pricingCheck).toContain("MONTHLY_MEMBERSHIP_CREDITS")
    expect(pricingCheck).not.toContain("Subscription credits correctly set to 200")
    expect(pricingCheck).not.toContain("should be 200")
    expect(brandKnowledge).toContain("Membership includes 100 credits per billing month")
    expect(brandKnowledge).not.toContain("Credits roll over monthly")
  })

  it("retires legacy repair scripts that used unsafe rolling-window logic", () => {
    for (const path of [
      "scripts/fix-missing-monthly-credits.ts",
      "scripts/fix-missing-monthly-credits-v2.ts",
      "scripts/fix-missing-monthly-credits-v3.ts",
      "scripts/remove-pre-payment-credits.ts",
    ]) {
      const source = readFileSync(path, "utf8")
      expect(source).toContain("RETIRED")
      expect(source).not.toContain("grantMonthlyCredits")
      expect(source).not.toContain("150 credits")
    }

    const manualSql = readFileSync("scripts/fix-subscription-manual.sql", "utf8")
    expect(manualSql).toContain("RETIRED")
    expect(manualSql).not.toContain("INSERT INTO subscriptions")
    expect(manualSql).not.toContain("UPDATE users")
  })

  it("preserves the separate 200-credit bundle and paid top-up promises", () => {
    const bundle = readFileSync("components/one-selfie/one-selfie-landing.tsx", "utf8")
    const products = readFileSync("lib/products.ts", "utf8")

    expect(bundle).toContain("30 days of SUITE with 200 credits")
    expect(products).toContain('displayName: "200 Credits Top-Up"')
  })

  it("keeps the live metadata remediation explicit, idempotent, and send-free", () => {
    const source = readFileSync("scripts/remediate-membership-credit-copy.ts", "utf8")

    expect(source).toContain('process.argv.includes("--apply")')
    expect(source).toContain('credits: "100"')
    expect(source).toContain("status = 'archived'")
    expect(source).toContain("is_current_version = false")
    expect(source).not.toContain("emails.send")
    expect(source).not.toContain("broadcasts.send")
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
