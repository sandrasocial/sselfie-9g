import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

import { applyApprovedEmailPalette } from "@/lib/email/approved-email-palette"

function read(path: string) {
  return readFileSync(path, "utf8")
}

describe("approved marketing, checkout, and email palette", () => {
  it("normalizes legacy email presentation without changing copy or links", () => {
    const legacy =
      '<a href="https://sselfie.ai/app" style="background:#1c1917;border-radius:12px;color:#F8FAFA">Open SSELFIE</a>'
    const branded = applyApprovedEmailPalette(legacy)

    expect(branded).toContain('href="https://sselfie.ai/app"')
    expect(branded).toContain("Open SSELFIE")
    expect(branded).toContain("background:#09090B")
    expect(branded).toContain("color:#FAFAF9")
    expect(branded).toContain("border-radius:12px")
    expect(branded).not.toContain("#1c1917")
    expect(branded).not.toContain("#F8FAFA")
  })

  it("carries the approved signature and palette into shared public marketing", () => {
    const marketing = read("components/sselfie/public-marketing.tsx")

    expect(marketing).toContain("PublicNeonSignature")
    expect(marketing).toContain("Worth posting.")
    expect(marketing).toContain("var(--ss-brand-espresso)")
    expect(marketing).toContain('cream: "#FAFAF9"')
  })

  it("keeps checkout behavior in place while applying the approved masthead", () => {
    const checkout = read("app/checkout/page.tsx")
    const masthead = read("components/checkout/checkout-brand-masthead.tsx")

    expect(checkout).toContain("EmbeddedCheckoutProvider")
    expect(checkout).toContain("trackCheckoutStart")
    expect(checkout).toContain("CheckoutBrandMasthead")
    expect(checkout).toContain("#FAFAF9")
    expect(masthead).toContain("Worth posting.")
    expect(masthead).toContain("#F3E6CF")
    expect(masthead).toContain("#09090B")
  })
})
