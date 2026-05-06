import type { Metadata } from "next"
import { OfferLandingPage } from "@/components/sselfie/offer-landing-page"
import {
  getMiniProductCheckoutHref,
  hasConfiguredMiniProductPrice,
  VISIBILITY_MINI_PRODUCT_BY_ID,
} from "@/lib/visibility-products"

export const metadata: Metadata = {
  title: "Concept Cards | SSELFIE",
  description: "Turn one topic into ten clear post angles with a focused SSELFIE mini-product.",
}

export default function ConceptCardsPage() {
  const product = VISIBILITY_MINI_PRODUCT_BY_ID.concept_cards_pack

  return (
    <OfferLandingPage
      {...product}
      offerSlug={product.slug}
      checkoutHref={getMiniProductCheckoutHref(product.id)}
      checkoutEnabled={hasConfiguredMiniProductPrice(product.id)}
      ctaLabel={hasConfiguredMiniProductPrice(product.id) ? "Start Concept Cards" : "See The Suite"}
      fallbackHref="/visibility-suite"
    />
  )
}
