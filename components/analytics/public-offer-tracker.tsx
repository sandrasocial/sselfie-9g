"use client"

import { useEffect } from "react"
import { trackAnalyticsEvent } from "@/lib/analytics/client"

type PublicOfferTrackerProps = {
  offerSlug: string
  productId?: string
  ctaKeyword?: string
  source?: string
}

export function PublicOfferTracker({
  offerSlug,
  productId,
  ctaKeyword,
  source = "public_offer",
}: PublicOfferTrackerProps) {
  useEffect(() => {
    trackAnalyticsEvent({
      event: "offer_landing_view",
      properties: {
        offer_slug: offerSlug,
        product_id: productId || null,
        cta_keyword: ctaKeyword || null,
        source,
      },
    })
    if (ctaKeyword) {
      trackAnalyticsEvent({
        event: "post_keyword_attributed",
        properties: {
          offer_slug: offerSlug,
          product_id: productId || null,
          cta_keyword: ctaKeyword,
          source,
        },
      })
    }
  }, [ctaKeyword, offerSlug, productId, source])

  return null
}

export function trackOfferCtaClick(input: PublicOfferTrackerProps & { href: string }) {
  trackAnalyticsEvent({
    event: "offer_cta_click",
    properties: {
      offer_slug: input.offerSlug,
      product_id: input.productId || null,
      cta_keyword: input.ctaKeyword || null,
      source: input.source || "public_offer",
      href: input.href,
    },
  })
}
