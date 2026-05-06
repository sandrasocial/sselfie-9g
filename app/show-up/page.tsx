import type { Metadata } from "next"
import { OfferLandingPage } from "@/components/sselfie/offer-landing-page"
import {
  getMiniProductCheckoutHref,
  hasConfiguredMiniProductPrice,
  VISIBILITY_MINI_PRODUCT_BY_ID,
} from "@/lib/visibility-products"

export const metadata: Metadata = {
  title: "Show Up",
  description: "Plan what to post this week with a content rhythm that fits your actual business.",
}

export default function ShowUpPage() {
  const product = VISIBILITY_MINI_PRODUCT_BY_ID.show_up
  return (
    <OfferLandingPage
      {...product}
      offerSlug={product.slug}
      checkoutHref={getMiniProductCheckoutHref(product.id)}
      checkoutEnabled={hasConfiguredMiniProductPrice(product.id)}
      ctaLabel="Start Show Up"
      fallbackHref="/visibility-suite"
    />
  )
}
