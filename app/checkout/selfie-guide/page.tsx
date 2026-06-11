import { redirect } from "next/navigation"

// DECISION 2026-06-11 (Sandra, PRODUCT-01 audit): the Selfie Guide is a free lead
// magnet, not a paid product. The paid checkout is retired; fulfillment for past
// buyers stays intact (webhook handler + access tokens keep working).
export default function SelfieGuideCheckoutPage() {
  redirect("/selfie-guide")
}
