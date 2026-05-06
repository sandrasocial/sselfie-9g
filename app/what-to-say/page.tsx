import type { Metadata } from "next"
import { OfferLandingPage } from "@/components/sselfie/offer-landing-page"
import {
  getMiniProductCheckoutHref,
  hasConfiguredMiniProductPrice,
  VISIBILITY_MINI_PRODUCT_BY_ID,
} from "@/lib/visibility-products"

export const metadata: Metadata = {
  title: "What To Say",
  description: "Make your offer easier to understand so people know why they should buy from you.",
}

export default function WhatToSayPage() {
  const product = VISIBILITY_MINI_PRODUCT_BY_ID.what_to_say
  return (
    <OfferLandingPage
      {...product}
      offerSlug={product.slug}
      checkoutHref={getMiniProductCheckoutHref(product.id)}
      checkoutEnabled={hasConfiguredMiniProductPrice(product.id)}
      ctaLabel="Start What To Say"
      fallbackHref="/visibility-suite"
    />
  )
}
