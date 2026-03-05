import { describe, expect, it } from "vitest"

import { composeMayaLandingCopy } from "@/lib/maya/page-generation/copy-composer"

const baseSnapshot: any = {
  userId: "user-1",
  snapshot: {
    offerBrief: { prefill: {} },
    memoryData: {},
  },
  brandProfile: {},
  memoryOfferBrief: {},
  resolvedOffer: "Studio Membership",
  resolvedAudience: "Women founders",
  resolvedTransformation: "Build a clear brand and sign premium clients",
  resolvedStyle: "Dark moody",
  resolvedProofPoints: "20 launches completed|Strong conversion lift",
  resolvedCta: "Join Studio",
  missingCriticalFields: [],
}

describe("maya landing copy composer", () => {
  it("generates structured blueprint", () => {
    const result = composeMayaLandingCopy({
      instruction: "Create a landing page",
      snapshot: baseSnapshot,
      heroImageUrl: "https://example.com/hero.jpg",
      supportImageUrls: ["https://example.com/support.jpg"],
    })

    expect(result.blueprint.hook.length).toBeGreaterThan(0)
    expect(result.blueprint.proofBullets.length).toBeGreaterThan(0)
    expect(result.blueprint.proofBullets.length).toBeLessThanOrEqual(3)
    expect(result.blueprint.ctaLabel).toBe("Join Studio")
  })

  it("falls back when banned phrases are present", () => {
    const result = composeMayaLandingCopy({
      instruction: "Create",
      snapshot: {
        ...baseSnapshot,
        resolvedTransformation: "Unlock your potential with this game-changer",
      },
      heroImageUrl: "",
      supportImageUrls: [],
    })

    expect(result.blueprint.hook).toBe("Build your next offer with clarity")
    expect(result.title).toBe("Landing Page")
  })
})
