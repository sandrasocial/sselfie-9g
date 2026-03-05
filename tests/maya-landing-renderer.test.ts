import { describe, expect, it } from "vitest"

import { renderMayaLandingHtml } from "@/lib/maya/page-generation/render-landing"

describe("maya landing renderer", () => {
  it("renders with locked tokens and typography", () => {
    const result = renderMayaLandingHtml({
      assetId: "maya_page_test",
      title: "Landing Page: Offer",
      previewText: "Drafted a page.",
      checkoutUrl: "https://sselfie.ai/checkout/membership",
      blueprint: {
        hook: "Build your next offer with clarity",
        truth: "A clear truth paragraph",
        proofBullets: ["Proof one", "Proof two"],
        ctaLabel: "Join Studio",
        ctaHref: "https://sselfie.ai/checkout/membership",
        heroImageUrl: "https://example.com/hero.jpg",
        supportImageUrls: ["https://example.com/support.jpg"],
        brandTone: "Scandinavian luxury",
      },
    })

    expect(result.html).toContain("#0a0a0a")
    expect(result.html).toContain("#ffffff")
    expect(result.html).toContain("#f5f5f5")
    expect(result.html).toContain("#666666")
    expect(result.html).toContain("#e5e5e5")
    expect(result.html).toContain("Cormorant Garamond")
    expect(result.html).toContain("Inter")
    expect(result.html).not.toContain("#C8A97E")
  })
})
