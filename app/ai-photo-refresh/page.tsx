import type { Metadata } from "next"
import { OfferLandingPage } from "@/components/sselfie/offer-landing-page"
import {
  getMiniProductCheckoutHref,
  hasConfiguredMiniProductPrice,
  VISIBILITY_MINI_PRODUCT_BY_ID,
} from "@/lib/visibility-products"

export const metadata: Metadata = {
  title: "AI Photo Refresh | SSELFIE",
  description: "Create a focused AI photo direction for your next five usable visuals.",
}

export default function AiPhotoRefreshPage() {
  const product = VISIBILITY_MINI_PRODUCT_BY_ID.ai_photo_refresh

  return (
    <OfferLandingPage
      {...product}
      offerSlug={product.slug}
      checkoutHref={getMiniProductCheckoutHref(product.id)}
      checkoutEnabled={hasConfiguredMiniProductPrice(product.id)}
      ctaLabel={hasConfiguredMiniProductPrice(product.id) ? "Start AI Photo Refresh" : "See The Suite"}
      fallbackHref="/visibility-suite"
    />
  )
}
