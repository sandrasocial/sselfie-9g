import { describe, expect, it } from "vitest"

import {
  buildCheckoutAttributionMetadata,
  getCheckoutAttributionFromParams,
  getRevenueFunnelStage,
  normalizeCheckoutAttribution,
} from "@/lib/revenue-engine/checkout-attribution"

describe("checkout attribution contract", () => {
  it("normalizes offer, source, funnel stage, and attribution values", () => {
    const result = normalizeCheckoutAttribution("brand_strategy_pack", {
      source: " strategy_result_upsell ",
      utmSource: "email",
      utmCampaign: "spring_push",
      campaignId: "42",
      referralCode: "abc123",
    })

    expect(result.offerSlug).toBe("brand-strategy-pack")
    expect(result.source).toBe("strategy_result_upsell")
    expect(result.funnelStage).toBe("primary_upsell")
    expect(result.campaignId).toBe(42)
    expect(result.referralCode).toBe("ABC123")
  })

  it("extracts attribution values from search params", () => {
    const result = getCheckoutAttributionFromParams({
      utm_source: "instagram",
      utm_medium: "social",
      utm_campaign: "maya_launch",
      utm_content: "hero_button",
      campaign_id: "18",
      ref: "SSE123456",
      return_to: "/strategy/token",
    })

    expect(result).toMatchObject({
      utmSource: "instagram",
      utmMedium: "social",
      utmCampaign: "maya_launch",
      utmContent: "hero_button",
      campaignId: "18",
      referralCode: "SSE123456",
      returnTo: "/strategy/token",
    })
  })

  it("builds flattened metadata for Stripe session transport", () => {
    const metadata = buildCheckoutAttributionMetadata("paid_blueprint", {
      source: "blueprint_checkout",
      utmSource: "email",
      utmCampaign: "nurture_day_5",
      campaignId: 81,
      referralCode: "SSE123456",
    })

    expect(metadata).toMatchObject({
      offer_slug: "paid-blueprint",
      source: "blueprint_checkout",
      funnel_stage: "entry_offer",
      utm_source: "email",
      utm_campaign: "nurture_day_5",
      campaign_id: "81",
      referral_code: "SSE123456",
    })
  })

  it("keeps revenue ladder stages stable", () => {
    expect(getRevenueFunnelStage("paid_blueprint")).toBe("entry_offer")
    expect(getRevenueFunnelStage("brand_strategy_pack")).toBe("primary_upsell")
    expect(getRevenueFunnelStage("sselfie_studio_membership")).toBe("studio_membership")
    expect(getRevenueFunnelStage("credit_topup")).toBe("expansion")
  })
})
