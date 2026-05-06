import type { Metadata } from "next"
import { OfferLandingPage } from "@/components/sselfie/offer-landing-page"
import {
  getMiniProductCheckoutHref,
  hasConfiguredMiniProductPrice,
  VISIBILITY_MINI_PRODUCT_BY_ID,
} from "@/lib/visibility-products"

export const metadata: Metadata = {
  title: "Feed Reset | SSELFIE",
  description: "Plan the next nine posts so your profile has a clearer direction.",
}

export default function FeedResetPage() {
  const product = VISIBILITY_MINI_PRODUCT_BY_ID.feed_reset_9grid

  return (
    <OfferLandingPage
      {...product}
      offerSlug={product.slug}
      checkoutHref={getMiniProductCheckoutHref(product.id)}
      checkoutEnabled={hasConfiguredMiniProductPrice(product.id)}
      ctaLabel={hasConfiguredMiniProductPrice(product.id) ? "Start Feed Reset" : "See The Suite"}
      fallbackHref="/visibility-suite"
    />
  )
}
