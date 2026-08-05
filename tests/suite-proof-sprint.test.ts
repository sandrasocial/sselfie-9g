import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"

import { classifySuiteProofSprintAudience } from "@/lib/email/campaigns/suite-proof-sprint-audience"
import { classifySuiteProofSprintFullAudience } from "@/lib/email/campaigns/suite-proof-sprint-full-audience"
import {
  getSuiteProofSprintCheckoutUrl,
  SUITE_PROOF_SPRINT,
  SUITE_PROOF_SPRINT_REVIEW_PROOF,
} from "@/lib/email/campaigns/suite-proof-sprint-plan"
import { generateSuiteProofSprintEmail } from "@/lib/email/templates/suite-proof-sprint"
import { SUITE_PROOF_CAROUSEL_CAPTION_DRAFT } from "@/lib/email/campaigns/suite-proof-sprint-content"

describe("SUITE proof sprint", () => {
  it("cannot become approval-ready without real proof", () => {
    const draft = generateSuiteProofSprintEmail({ firstName: "Lovely" })
    expect(draft.status).toBe("needs-proof")
    expect(draft.html).toContain("add one approved source selfie")

    const ready = generateSuiteProofSprintEmail({
      firstName: "Lovely",
      proof: {
        sourceImage: {
          imageUrl: "https://example.com/source.jpg",
          imageAlt: "One source selfie",
        },
        resultImages: [1, 2, 3].map(index => ({
          imageUrl: `https://example.com/result-${index}.jpg`,
          imageAlt: `Connected finished photo ${index}`,
        })),
        useContext: "I used these three photos together for one real week of content.",
      },
    })
    expect(ready.status).toBe("ready-for-approval")
    expect(ready.html).toContain("https://example.com/source.jpg")
    expect(ready.html).toContain("https://example.com/result-3.jpg")
    expect(ready.text).toContain("one real week of content")
  })

  it("uses Sandra's supplied selfie, results, carousel and tutorial in the approval draft", () => {
    const draft = generateSuiteProofSprintEmail({
      firstName: "Lovely",
      proof: SUITE_PROOF_SPRINT_REVIEW_PROOF,
    })

    expect(draft.status).toBe("ready-for-approval")
    expect(draft.subject).toBe("I'm 40. Why am I trying to create content like I'm 20?")
    expect(draft.html).toContain(
      "https://sselfie.ai/campaigns/suite-proof-sprint/source-selfie.jpg"
    )
    expect(draft.html).toContain("marbella-result-3.jpg")
    expect(draft.html).toContain("carousel-1.jpg")
    expect(draft.html).not.toContain("carousel-8.jpg")
    expect(SUITE_PROOF_SPRINT_REVIEW_PROOF.carouselImages).toHaveLength(8)
    expect(draft.html).toContain("https://www.instagram.com/reel/DaWJo4hoB8n/")
    expect(draft.html).not.toContain("instagram-media")
    expect(SUITE_PROOF_CAROUSEL_CAPTION_DRAFT).toContain("Consistency beats perfect")
    expect(SUITE_PROOF_CAROUSEL_CAPTION_DRAFT).toContain("annual SSELFIE SUITE is €970")
    expect(SUITE_PROOF_CAROUSEL_CAPTION_DRAFT.length).toBeLessThan(2200)
  })

  it("uses a truthful permission reminder for the approved full-list version", () => {
    const draft = generateSuiteProofSprintEmail({
      firstName: "Lovely",
      proof: SUITE_PROOF_SPRINT_REVIEW_PROOF,
      recipientContext: "subscriber-or-buyer",
    })

    expect(draft.html).toContain(
      "joined the SSELFIE email list or previously bought a SSELFIE product"
    )
    expect(draft.html).not.toContain("because you previously bought a SSELFIE product")
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
    const launchRunner = readFileSync("lib/email/campaigns/vault-maya-launch-runner.ts", "utf8")
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
        {
          email: "eligible@example.com",
          isCommerceBuyer: true,
          hasProtectedAccess: false,
          lastPurchaseAt: "2026-08-04T12:00:00.000Z",
        },
        { email: "member@example.com", isCommerceBuyer: true, hasProtectedAccess: true },
        {
          email: "unsubscribed@example.com",
          isCommerceBuyer: true,
          hasProtectedAccess: false,
          unsubscribed: true,
        },
        {
          email: "cooldown@example.com",
          isCommerceBuyer: true,
          hasProtectedAccess: false,
          lastMarketingDeliveryAt: "2026-08-04T12:00:00.000Z",
        },
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
        {
          email: "older@example.com",
          isCommerceBuyer: true,
          hasProtectedAccess: false,
          lastPurchaseAt: "2026-06-01T00:00:00.000Z",
        },
        {
          email: "newer@example.com",
          isCommerceBuyer: true,
          hasProtectedAccess: false,
          lastPurchaseAt: "2026-08-01T00:00:00.000Z",
        },
      ],
    })

    expect(result.eligible.map(candidate => candidate.email)).toEqual(["newer@example.com"])
    expect(result.excluded.audience_cap).toBe(1)
  })

  it("builds the full-list cohort for the scheduled window without protected or recently mailed contacts", () => {
    const scheduledAt = new Date("2026-08-06T08:15:00.000Z")
    const result = classifySuiteProofSprintFullAudience({
      scheduledAt,
      cooldownHours: 48,
      maxAudience: 10_000,
      candidates: [
        {
          email: "cleared@example.com",
          hasProtectedAccess: false,
          lastMarketingDeliveryAt: "2026-08-04T08:03:00.000Z",
        },
        {
          email: "too-recent@example.com",
          hasProtectedAccess: false,
          lastMarketingDeliveryAt: "2026-08-04T09:00:00.000Z",
        },
        { email: "member@example.com", hasProtectedAccess: true },
        {
          email: "internal@sselfie.ai",
          hasProtectedAccess: false,
          isMarketingTestOrInternal: true,
        },
        { email: "unsubscribed@example.com", hasProtectedAccess: false, unsubscribed: true },
        {
          email: "bounced@example.com",
          hasProtectedAccess: false,
          latestDeliveryStatus: "bounced",
        },
      ],
    })

    expect(result.eligible.map(candidate => candidate.email)).toEqual(["cleared@example.com"])
    expect(result.excluded.marketing_cooldown).toBe(1)
    expect(result.excluded.protected_access).toBe(1)
    expect(result.excluded.test_or_internal).toBe(1)
    expect(result.excluded.unsubscribed).toBe(1)
    expect(result.excluded.bounced_or_suppressed).toBe(1)
  })
})
