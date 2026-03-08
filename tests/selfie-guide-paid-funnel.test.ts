// @vitest-environment node
import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

import { getProductById } from "@/lib/products"

const ROOT = process.cwd()

describe("selfie guide paid funnel", () => {
  it("registers the guide bundle as a pricing product", () => {
    const product = getProductById("selfie_guide_bundle")

    expect(product).toBeDefined()
    expect(product?.type).toBe("selfie_guide_bundle")
    expect(product?.priceInCents).toBe(2700)
  })

  it("registers selfie guide as a pricing product", () => {
    const product = getProductById("selfie_guide")

    expect(product).toBeDefined()
    expect(product?.type).toBe("selfie_guide")
    expect(product?.priceInCents).toBe(1700)
    expect(product?.features).toEqual(
      expect.arrayContaining([
        "Interactive checklists for every step",
        "7-Day Selfie Challenge",
        "Lightroom preset pack bonus",
      ]),
    )
  })

  it("uses dedicated Stripe price environment variables for guide and bundle checkout", () => {
    const stripeActionContents = fs.readFileSync(path.join(ROOT, "app/actions/stripe.ts"), "utf8")

    expect(stripeActionContents).toContain("STRIPE_PRICE_SELFIE_GUIDE")
    expect(stripeActionContents).toContain("STRIPE_PRICE_SELFIE_GUIDE_BUNDLE")
  })

  it("ships a dedicated checkout chooser and paid landing page", () => {
    const checkoutRoutePath = path.join(ROOT, "app/checkout/selfie-guide/page.tsx")
    const landingContents = fs.readFileSync(path.join(ROOT, "app/selfie-guide/page.tsx"), "utf8")
    const checkoutContents = fs.readFileSync(checkoutRoutePath, "utf8")

    expect(fs.existsSync(checkoutRoutePath)).toBe(true)
    expect(landingContents).toContain("One Good Selfie. Your Entire Brand.")
    expect(landingContents).not.toContain("SelfieGuideLanding")
    expect(checkoutContents).toContain("Guide + Brand Strategy Bundle")
    expect(checkoutContents).toContain("plan=bundle")
    expect(checkoutContents).toContain("selfie_guide_bundle")
  })

  it("fulfills guide and bundle purchases with delivery and access", () => {
    const webhookContents = fs.readFileSync(path.join(ROOT, "app/api/webhooks/stripe/route.ts"), "utf8")
    const successContents = fs.readFileSync(path.join(ROOT, "components/checkout/success-content.tsx"), "utf8")

    expect(webhookContents).toContain("bought_selfie_guide")
    expect(webhookContents).toContain("bought_selfie_guide_bundle")
    expect(webhookContents).toContain("bought_brand_strategy_pack")
    expect(webhookContents).toContain("SELFIE_GUIDE_PRESET_DOWNLOAD_URL")
    expect(successContents).toContain('"selfie_guide"')
    expect(successContents).toContain('"selfie_guide_bundle"')
  })

  it("keeps a course-aligned legacy capture page with checkout entry", () => {
    const legacyRouteContents = fs.readFileSync(path.join(ROOT, "app/freebie/selfie-guide/page.tsx"), "utf8")
    const legacyLandingContents = fs.readFileSync(
      path.join(ROOT, "components/freebie/selfie-guide-landing.tsx"),
      "utf8",
    )

    expect(legacyRouteContents).toContain("SelfieGuideLanding")
    expect(legacyLandingContents).toContain("/checkout/selfie-guide")
    expect(legacyLandingContents).toContain("/checkout/selfie-guide?plan=bundle")
  })
})
