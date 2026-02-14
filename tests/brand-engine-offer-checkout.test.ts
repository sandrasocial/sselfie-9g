import { describe, expect, it } from "vitest"
import {
  resolveBrandEngineOfferCheckoutPrice,
  toBrandEngineCheckoutProductType,
} from "@/lib/brand-engine/offer-checkout-config"

describe("brand-engine offer checkout price resolution", () => {
  it("maps cohort and both to cohort price env var", () => {
    const env = {
      STRIPE_BRAND_ENGINE_COHORT_PRICE_ID: "price_cohort_123",
      STRIPE_BRAND_ENGINE_VIP_PRICE_ID: "price_vip_456",
    }

    expect(resolveBrandEngineOfferCheckoutPrice("cohort", env)).toEqual({
      normalizedOfferType: "cohort",
      envVarName: "STRIPE_BRAND_ENGINE_COHORT_PRICE_ID",
      priceId: "price_cohort_123",
    })

    expect(resolveBrandEngineOfferCheckoutPrice("both", env)).toEqual({
      normalizedOfferType: "cohort",
      envVarName: "STRIPE_BRAND_ENGINE_COHORT_PRICE_ID",
      priceId: "price_cohort_123",
    })
  })

  it("maps vip to vip price env var", () => {
    const env = {
      STRIPE_BRAND_ENGINE_COHORT_PRICE_ID: "price_cohort_123",
      STRIPE_BRAND_ENGINE_VIP_PRICE_ID: "price_vip_456",
    }

    expect(resolveBrandEngineOfferCheckoutPrice("vip", env)).toEqual({
      normalizedOfferType: "vip",
      envVarName: "STRIPE_BRAND_ENGINE_VIP_PRICE_ID",
      priceId: "price_vip_456",
    })
  })

  it("throws when the required Stripe price env var is missing", () => {
    expect(() => resolveBrandEngineOfferCheckoutPrice("cohort", {})).toThrow(
      "Missing Stripe price configuration for Brand Engine offer",
    )
  })
})

describe("brand-engine checkout product type", () => {
  it("builds product type metadata from offer type", () => {
    expect(toBrandEngineCheckoutProductType("cohort")).toBe("brand_engine_cohort")
    expect(toBrandEngineCheckoutProductType("vip")).toBe("brand_engine_vip")
  })
})
