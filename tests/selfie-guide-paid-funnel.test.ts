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
    const landingActionContents = fs.readFileSync(path.join(ROOT, "app/actions/landing-checkout.ts"), "utf8")

    expect(stripeActionContents).toContain("STRIPE_PRICE_SELFIE_GUIDE")
    expect(stripeActionContents).toContain("STRIPE_PRICE_SELFIE_GUIDE_BUNDLE")
    expect(stripeActionContents).toContain("STRIPE_PRICE_BRAND_STRATEGY_PACK")
    expect(landingActionContents).toContain("STRIPE_PRICE_BRAND_STRATEGY_PACK")
  })

  it("ships a paid landing page with a direct guide checkout path", () => {
    const checkoutRoutePath = path.join(ROOT, "app/checkout/selfie-guide/page.tsx")
    const landingContents = fs.readFileSync(
      path.join(ROOT, "components/selfie-guide/selfie-guide-paid-landing.tsx"),
      "utf8",
    )
    const checkoutContents = fs.readFileSync(checkoutRoutePath, "utf8")

    expect(fs.existsSync(checkoutRoutePath)).toBe(true)
    expect(landingContents).toContain('href="/checkout/selfie-guide?plan=guide"')
    expect(checkoutContents).toContain('createLandingCheckoutSession("selfie_guide"')
    expect(checkoutContents).toContain('startProductCheckoutSession("selfie_guide"')
    expect(checkoutContents).toContain("createLandingCheckoutSession")
    expect(checkoutContents).not.toContain("selfie_guide_bundle")
    expect(checkoutContents).not.toContain("Choose your next step before you pay")
    expect(checkoutContents).not.toContain("/auth/login?returnTo=")
  })

  it("fulfills guide purchases with delivery and access", () => {
    const webhookContents = fs.readFileSync(path.join(ROOT, "app/api/webhooks/stripe/route.ts"), "utf8")
    const successContents = fs.readFileSync(path.join(ROOT, "components/checkout/success-content.tsx"), "utf8")
    const landingActionContents = fs.readFileSync(path.join(ROOT, "app/actions/landing-checkout.ts"), "utf8")
    const stripeActionContents = fs.readFileSync(path.join(ROOT, "app/actions/stripe.ts"), "utf8")

    expect(webhookContents).toContain("bought_selfie_guide")
    expect(webhookContents).toContain("SELFIE_GUIDE_PRESET_DOWNLOAD_URL")
    expect(webhookContents).toContain("boughtBrandStrategyBump")
    expect(landingActionContents).toContain("optional_items")
    expect(stripeActionContents).toContain("optional_items")
    expect(landingActionContents).toContain('expand: ["line_items", "line_items.data.price", "customer"]')
    expect(successContents).toContain('"selfie_guide"')
  })

  it("retires the legacy freebie capture route behind a redirect to the paid landing", () => {
    const legacyRouteContents = fs.readFileSync(path.join(ROOT, "app/freebie/selfie-guide/page.tsx"), "utf8")

    expect(legacyRouteContents).toContain('redirect("/selfie-guide")')
    expect(legacyRouteContents).not.toContain("SelfieGuideLanding")
  })

  it("validates only the requested product price when building authenticated checkout sessions", () => {
    const stripeActionContents = fs.readFileSync(path.join(ROOT, "app/actions/stripe.ts"), "utf8")

    expect(stripeActionContents).toContain("assertStripePriceConfigForProduct(product.type)")
    expect(stripeActionContents).not.toContain("await assertStripePricingConfig()")
  })
})
