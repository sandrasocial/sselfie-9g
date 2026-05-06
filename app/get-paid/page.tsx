import type { Metadata } from "next"
import { OfferLandingPage } from "@/components/sselfie/offer-landing-page"
import {
  getMiniProductCheckoutHref,
  hasConfiguredMiniProductPrice,
  VISIBILITY_MINI_PRODUCT_BY_ID,
} from "@/lib/visibility-products"

export const metadata: Metadata = {
  title: "Get Paid",
  description: "Build a simple buyer path from your content to your first clear offer.",
}

export default function GetPaidPage() {
  const product = VISIBILITY_MINI_PRODUCT_BY_ID.get_paid
  return (
    <OfferLandingPage
      {...product}
      offerSlug={product.slug}
      checkoutHref={getMiniProductCheckoutHref(product.id)}
      checkoutEnabled={hasConfiguredMiniProductPrice(product.id)}
      ctaLabel="Start Get Paid"
      fallbackHref="/visibility-suite"
    />
  )
}
