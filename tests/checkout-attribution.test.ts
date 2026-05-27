import { describe, expect, it } from "vitest"

import {
  buildCheckoutAttributionMetadata,
  buildCheckoutRedirectUrl,
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
      entryPostSlug: "may-visibility-post",
      buyerStage: "micro",
    })

    expect(result.offerSlug).toBe("brand-strategy-pack")
    expect(result.source).toBe("strategy_result_upsell")
    expect(result.funnelStage).toBe("primary_upsell")
    expect(result.campaignId).toBe(42)
    expect(result.referralCode).toBe("ABC123")
    expect(result.entryPostSlug).toBe("may-visibility-post")
    expect(result.buyerStage).toBe("micro")
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
      entry_post_slug: "ig-post-1",
      buyer_stage: "suite",
    })

    expect(result).toMatchObject({
      utmSource: "instagram",
      utmMedium: "social",
      utmCampaign: "maya_launch",
      utmContent: "hero_button",
      campaignId: "18",
      referralCode: "SSE123456",
      returnTo: "/strategy/token",
      entryPostSlug: "ig-post-1",
      buyerStage: "suite",
    })
  })

  it("preserves prompt vault source context when redirecting into embedded checkout", () => {
    const url = buildCheckoutRedirectUrl("cs_test_123_secret_456", "prompt_vault", {
      source: "instagram_manychat",
      utm_source: "instagram",
      utm_medium: "dm",
      utm_campaign: "prompt_my_selfie",
      utm_content: "dark_balcony_story",
      entry_post_slug: "dark-balcony-reel-cover-hero",
      cta_keyword: "PROMPT",
      buyer_stage: "lead",
      ignored: "nope",
    })

    expect(url).toBe(
      "/checkout?client_secret=cs_test_123_secret_456&product_type=prompt_vault&source=instagram_manychat&utm_source=instagram&utm_medium=dm&utm_campaign=prompt_my_selfie&utm_content=dark_balcony_story&cta_keyword=PROMPT&entry_post_slug=dark-balcony-reel-cover-hero&buyer_stage=lead",
    )
  })

  it("builds flattened metadata for Stripe session transport", () => {
    const metadata = buildCheckoutAttributionMetadata("paid_blueprint", {
      source: "blueprint_checkout",
      utmSource: "email",
      utmCampaign: "nurture_day_5",
      campaignId: 81,
      referralCode: "SSE123456",
      buyerStage: "studio",
    })

    expect(metadata).toMatchObject({
      offer_slug: "paid-blueprint",
      source: "blueprint_checkout",
      funnel_stage: "entry_offer",
      utm_source: "email",
      utm_campaign: "nurture_day_5",
      campaign_id: "81",
      referral_code: "SSE123456",
      buyer_stage: "studio",
    })
  })

  it("keeps revenue ladder stages stable", () => {
    expect(getRevenueFunnelStage("paid_blueprint")).toBe("entry_offer")
    expect(getRevenueFunnelStage("brand_strategy_pack")).toBe("primary_upsell")
    expect(getRevenueFunnelStage("sselfie_studio_membership")).toBe("studio_membership")
    expect(getRevenueFunnelStage("credit_topup")).toBe("expansion")
  })
})
