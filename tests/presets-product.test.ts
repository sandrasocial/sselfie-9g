import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { ALLOWED_ANALYTICS_EVENTS } from "@/lib/analytics/event-contract"
import { buildCheckoutEmailCaptureHiddenParams } from "@/lib/revenue-engine/anonymous-checkout-capture"
import { buildCheckoutRedirectUrl } from "@/lib/revenue-engine/checkout-attribution"
import { getProductById, PRODUCT_REVENUE_PATHS } from "@/lib/products"
import { isPresetsCheckoutAvailable } from "@/lib/presets/checkout-readiness"

const ROOT = process.cwd()

function read(path: string) {
  return readFileSync(join(ROOT, path), "utf8")
}

describe("PRESETS-PRODUCT-01", () => {
  it("fails closed when no published preset collections are available", () => {
    expect(isPresetsCheckoutAvailable("single", 0, false)).toBe(false)
    expect(isPresetsCheckoutAvailable("bundle", 0, false)).toBe(false)
    expect(isPresetsCheckoutAvailable("single", 1, false)).toBe(false)
    expect(isPresetsCheckoutAvailable("single", 1, true)).toBe(true)
    expect(isPresetsCheckoutAvailable("bundle", 1, false)).toBe(true)
  })

  it("registers the single and bundle products at the locked prices", () => {
    expect(getProductById("presets_single")).toMatchObject({
      id: "presets_single",
      type: "presets_single",
      priceInCents: 1900,
      tag: "bought_presets_single",
    })
    expect(getProductById("presets_bundle")).toMatchObject({
      id: "presets_bundle",
      type: "presets_bundle",
      priceInCents: 3900,
      tag: "bought_presets_bundle",
    })
    expect(PRODUCT_REVENUE_PATHS.presets_single.successNextAction).toBe("/access/presets/[token]")
    expect(PRODUCT_REVENUE_PATHS.presets_bundle.successNextAction).toBe("/access/presets/[token]")
  })

  it("uses dedicated Stripe price env vars for each presets tier", () => {
    const checkoutAction = read("app/actions/landing-checkout.ts")

    expect(checkoutAction).toContain('presets_single: "STRIPE_PRICE_PRESETS_SINGLE"')
    expect(checkoutAction).toContain('presets_bundle: "STRIPE_PRICE_PRESETS_BUNDLE"')
    expect(checkoutAction).toContain("process.env.STRIPE_PRICE_PRESETS_SINGLE")
    expect(checkoutAction).toContain("process.env.STRIPE_PRICE_PRESETS_BUNDLE")
  })

  it("preserves tier and collection through email capture and embedded checkout redirects", () => {
    const params = {
      source: "presets_landing",
      tier: "single",
      collection: "selfie-glow-up",
      buyer_stage: "micro",
    }
    const hidden = buildCheckoutEmailCaptureHiddenParams(params)

    expect(hidden).toEqual(expect.arrayContaining([
      { name: "tier", value: "single" },
      { name: "collection", value: "selfie-glow-up" },
    ]))
    expect(buildCheckoutRedirectUrl("cs_test_123_secret_456", "presets_single", params)).toContain(
      "product_type=presets_single",
    )
    expect(buildCheckoutRedirectUrl("cs_test_123_secret_456", "presets_single", params)).toContain(
      "collection=selfie-glow-up",
    )
  })

  it("wires the presets landing CTAs to attributed checkout URLs", () => {
    const page = read("app/presets/page.tsx")

    expect(page).toContain('return `/checkout/presets?${params.toString()}`')
    expect(page).toContain('params.set("tier", base.tier)')
    expect(page).toContain('params.set("utm_campaign", fwd.utmCampaign || "presets_launch")')
    expect(page).toContain('checkoutSource: "collection_card"')
    expect(page).toContain('checkoutSource: "bundle_primary_cta"')
  })

  it("dispatches paid presets checkouts to the presets fulfillment handler", () => {
    const dispatcher = read("lib/payments/lifecycle/checkout-session-completed.ts")

    expect(dispatcher).toContain('import { handlePresetsCheckout } from "@/lib/payments/handlers/presets"')
    expect(dispatcher).toContain('productType === "presets_single" || productType === "presets_bundle"')
    expect(dispatcher).toContain("await handlePresetsCheckout")
  })

  it("has data-backed collection and token access infrastructure", () => {
    const collections = read("lib/presets/published-collections.ts")
    const orders = read("lib/presets/orders.ts")
    const migration = read("migrations/20260617_presets_product.sql")

    expect(collections).toContain("CREATE TABLE IF NOT EXISTS preset_collections")
    expect(collections).toContain("getPublishedPresetCollections")
    expect(orders).toContain("CREATE TABLE IF NOT EXISTS preset_orders")
    expect(orders).toContain("upsertPresetOrderForPurchase")
    expect(migration).toContain("mobile_dng_url TEXT")
    expect(migration).toContain("desktop_xmp_url TEXT")
    expect(migration).toContain("setup_guide_url TEXT")
  })

  it("allows presets behavior events through the analytics contract", () => {
    expect(ALLOWED_ANALYTICS_EVENTS).toEqual(expect.arrayContaining([
      "presets_checkout_session_requested",
      "presets_checkout_session_created",
      "presets_payment_form_rendered",
      "presets_checkout_success",
      "presets_access_resolved",
      "presets_access_opened",
    ]))
  })
})
