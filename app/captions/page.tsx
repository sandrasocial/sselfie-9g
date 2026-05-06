import type { Metadata } from "next"
import { OfferLandingPage } from "@/components/sselfie/offer-landing-page"
import {
  getMiniProductCheckoutHref,
  hasConfiguredMiniProductPrice,
  VISIBILITY_MINI_PRODUCT_BY_ID,
} from "@/lib/visibility-products"

export const metadata: Metadata = {
  title: "Caption Sprint | SSELFIE",
  description: "Write a focused bank of captions without starting from a blank page.",
}

export default function CaptionsPage() {
  const product = VISIBILITY_MINI_PRODUCT_BY_ID.caption_sprint

  return (
    <OfferLandingPage
      {...product}
      offerSlug={product.slug}
      checkoutHref={getMiniProductCheckoutHref(product.id)}
      checkoutEnabled={hasConfiguredMiniProductPrice(product.id)}
      ctaLabel={hasConfiguredMiniProductPrice(product.id) ? "Start Caption Sprint" : "See The Suite"}
      fallbackHref="/visibility-suite"
    />
  )
}
