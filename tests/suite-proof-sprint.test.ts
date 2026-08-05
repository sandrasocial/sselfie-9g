import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"

import { classifySuiteProofSprintAudience } from "@/lib/email/campaigns/suite-proof-sprint-audience"
import {
  getSuiteProofSprintCheckoutUrl,
  SUITE_PROOF_SPRINT,
} from "@/lib/email/campaigns/suite-proof-sprint-plan"
import { generateSuiteProofSprintEmail } from "@/lib/email/templates/suite-proof-sprint"

describe("SUITE proof sprint", () => {
  it("cannot become approval-ready without real proof", () => {
    const draft = generateSuiteProofSprintEmail({ firstName: "Lovely" })
    expect(draft.status).toBe("needs-proof")
    expect(draft.html).toContain("add one approved before-and-after proof image")

    const ready = generateSuiteProofSprintEmail({
      firstName: "Lovely",
      proof: {
        imageUrl: "https://example.com/approved-proof.jpg",
        imageAlt: "One source selfie beside three connected finished photos",
        useContext: "I used these three photos together for one real week of content.",
      },
    })
    expect(ready.status).toBe("ready-for-approval")
    expect(ready.html).toContain("https://example.com/approved-proof.jpg")
    expect(ready.text).toContain("one real week of content")
  })

  it("uses the existing annual price and tracked annual checkout", () => {
    expect(SUITE_PROOF_SPRINT.annualPriceEur).toBe(970)
    expect(readFileSync("lib/products.ts", "utf8")).toMatch(
      /id: "sselfie_studio_membership_annual",[\s\S]*?priceInCents: 97000/
    )
    const url = new URL(getSuiteProofSprintCheckoutUrl())
    expect(url.pathname).toBe("/checkout/membership")
    expect(url.searchParams.get("interval")).toBe("year")
    expect(url.searchParams.get("utm_campaign")).toBe("suite_proof_sprint_high_intent")
  })

  it("stays review-only until Sandra approves the proof and exact words", () => {
    const vercel = readFileSync("vercel.json", "utf8")
    const launchRunner = readFileSync(
      "lib/email/campaigns/vault-maya-launch-runner.ts",
      "utf8"
    )
    expect(vercel).not.toContain("suite-proof-sprint")
    expect(launchRunner).not.toContain("suite_proof_sprint_high_intent")

    const draft = generateSuiteProofSprintEmail()
    expect(draft.text).toContain("There is no deadline on this")
    expect(draft.text).not.toMatch(/ends today|final hours|price changes/i)
  })

  it("keeps protected, unsubscribed and recently mailed contacts out", () => {
    const now = new Date("2026-08-05T12:00:00.000Z")
    const result = classifySuiteProofSprintAudience({
      now,
      cooldownHours: 48,
      maxAudience: 2,
      candidates: [
        { email: "eligible@example.com", isCommerceBuyer: true, hasProtectedAccess: false, lastPurchaseAt: "2026-08-04T12:00:00.000Z" },
        { email: "member@example.com", isCommerceBuyer: true, hasProtectedAccess: true },
        { email: "unsubscribed@example.com", isCommerceBuyer: true, hasProtectedAccess: false, unsubscribed: true },
        { email: "cooldown@example.com", isCommerceBuyer: true, hasProtectedAccess: false, lastMarketingDeliveryAt: "2026-08-04T12:00:00.000Z" },
        { email: "not-a-buyer@example.com", isCommerceBuyer: false, hasProtectedAccess: false },
      ],
    })

    expect(result.eligible.map(candidate => candidate.email)).toEqual(["eligible@example.com"])
    expect(result.excluded.protected_access).toBe(1)
    expect(result.excluded.unsubscribed).toBe(1)
    expect(result.excluded.marketing_cooldown).toBe(1)
    expect(result.excluded.not_commerce_buyer).toBe(1)
  })

  it("caps the audience after ranking the newest buyers first", () => {
    const result = classifySuiteProofSprintAudience({
      now: new Date("2026-08-05T12:00:00.000Z"),
      cooldownHours: 48,
      maxAudience: 1,
      candidates: [
        { email: "older@example.com", isCommerceBuyer: true, hasProtectedAccess: false, lastPurchaseAt: "2026-06-01T00:00:00.000Z" },
        { email: "newer@example.com", isCommerceBuyer: true, hasProtectedAccess: false, lastPurchaseAt: "2026-08-01T00:00:00.000Z" },
      ],
    })

    expect(result.eligible.map(candidate => candidate.email)).toEqual(["newer@example.com"])
    expect(result.excluded.audience_cap).toBe(1)
  })
})
