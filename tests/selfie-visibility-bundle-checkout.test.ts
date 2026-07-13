// @vitest-environment node

import { readFileSync } from "node:fs"
import { existsSync } from "node:fs"
import { describe, expect, it } from "vitest"

import {
  SELFIE_VISIBILITY_BUNDLE_CLOSES_AT,
  SELFIE_VISIBILITY_BUNDLE_OPENS_AT,
  getSelfieVisibilityBundleCheckoutExpiresAt,
  getSelfieVisibilityBundleOfferStatus,
} from "@/lib/launch/selfie-visibility-bundle"
import { getProductById, PRODUCT_REVENUE_PATHS } from "@/lib/products"

const read = (path: string) => readFileSync(path, "utf8")

describe("One Selfie Visibility Bundle checkout", () => {
  it("uses the fixed 48-hour campaign window and closes exactly at the boundary", () => {
    expect(SELFIE_VISIBILITY_BUNDLE_OPENS_AT).toBe("2026-07-13T16:00:00.000Z")
    expect(SELFIE_VISIBILITY_BUNDLE_CLOSES_AT).toBe("2026-07-15T16:00:00.000Z")

    expect(
      getSelfieVisibilityBundleOfferStatus(new Date("2026-07-13T15:59:59.999Z"))
    ).toMatchObject({
      phase: "upcoming",
      isOpen: false,
    })
    expect(
      getSelfieVisibilityBundleOfferStatus(new Date(SELFIE_VISIBILITY_BUNDLE_OPENS_AT))
    ).toMatchObject({
      phase: "open",
      isOpen: true,
    })
    expect(
      getSelfieVisibilityBundleOfferStatus(new Date("2026-07-15T15:59:59.999Z"))
    ).toMatchObject({
      phase: "open",
      isOpen: true,
    })
    expect(
      getSelfieVisibilityBundleOfferStatus(new Date(SELFIE_VISIBILITY_BUNDLE_CLOSES_AT))
    ).toMatchObject({
      phase: "closed",
      isOpen: false,
    })
  })

  it("uses the fixed close when Stripe permits it and preserves Stripe's final 30-minute minimum", () => {
    const opening = new Date(SELFIE_VISIBILITY_BUNDLE_OPENS_AT)
    const dayTwo = new Date("2026-07-14T20:00:00.000Z")
    const finalTenMinutes = new Date("2026-07-15T15:50:00.000Z")

    expect(getSelfieVisibilityBundleCheckoutExpiresAt(opening)).toBe(
      Math.floor(opening.getTime() / 1000) + 24 * 60 * 60
    )
    expect(getSelfieVisibilityBundleCheckoutExpiresAt(dayTwo)).toBe(
      Math.floor(Date.parse(SELFIE_VISIBILITY_BUNDLE_CLOSES_AT) / 1000)
    )
    expect(getSelfieVisibilityBundleCheckoutExpiresAt(finalTenMinutes)).toBe(
      Math.floor(finalTenMinutes.getTime() / 1000) + 30 * 60
    )
    expect(() =>
      getSelfieVisibilityBundleCheckoutExpiresAt(new Date(SELFIE_VISIBILITY_BUNDLE_CLOSES_AT))
    ).toThrow(/closed/i)
  })

  it("registers one live $97 one-time product and its dedicated buyer home", () => {
    expect(getProductById("selfie_visibility_bundle")).toMatchObject({
      id: "selfie_visibility_bundle",
      type: "selfie_visibility_bundle",
      priceInCents: 9700,
      lifecycleStatus: "live",
      tag: "bought_selfie_visibility_bundle",
    })
    expect(PRODUCT_REVENUE_PATHS.selfie_visibility_bundle).toMatchObject({
      lifecycleStatus: "live",
      checkoutPath: "/checkout/one-selfie",
      successNextAction: "/academy/access/one-selfie",
    })
  })

  it("validates the dedicated Stripe price as a $97 USD one-time price", () => {
    const validator = read("lib/stripe/validate-pricing-config.ts")

    expect(validator).toMatch(
      /envVarName: "STRIPE_PRICE_SELFIE_VISIBILITY_BUNDLE",[\s\S]*?productType: "selfie_visibility_bundle",[\s\S]*?expectedAmount: 9700,[\s\S]*?expectedCurrency: "usd",[\s\S]*?expectedRecurring: false/
    )
  })

  it("enforces the server window, fixed metadata, price mapping, and Stripe session expiry", () => {
    const action = read("app/actions/landing-checkout.ts")

    expect(action).toContain('selfie_visibility_bundle: "STRIPE_PRICE_SELFIE_VISIBILITY_BUNDLE"')
    expect(action).toContain("process.env.STRIPE_PRICE_SELFIE_VISIBILITY_BUNDLE")
    expect(action).toContain('product.type === "selfie_visibility_bundle"')
    expect(action).toContain("getSelfieVisibilityBundleOfferStatus")
    expect(action).toContain("getSelfieVisibilityBundleCheckoutExpiresAt")
    expect(action).toContain("expires_at: selfieVisibilityBundleCheckoutExpiresAt")
    expect(action).toContain("offer_opens_at: SELFIE_VISIBILITY_BUNDLE_OPENS_AT")
    expect(action).toContain("offer_closes_at: SELFIE_VISIBILITY_BUNDLE_CLOSES_AT")
  })

  it("provides a dedicated route that preserves campaign attribution into embedded checkout", () => {
    const routePath = "app/checkout/one-selfie/page.tsx"

    expect(existsSync(routePath)).toBe(true)
    const route = read(routePath)
    expect(route).toContain('createLandingCheckoutSession(\n      "selfie_visibility_bundle"')
    expect(route).toContain('offerSlug: "one-selfie-visibility-bundle"')
    expect(route).toContain('utmCampaign: "one_selfie_visibility_48h"')
    expect(route).toContain('ctaKeyword: "BUNDLE"')
    expect(route).toContain('buyerStage: "suite"')
    expect(route).toContain('buildCheckoutRedirectUrl(clientSecret, "selfie_visibility_bundle"')
    expect(route).toContain('redirect("/one-selfie?offer=upcoming")')
    expect(route).toContain('redirect("/one-selfie?offer=closed")')
  })
})
