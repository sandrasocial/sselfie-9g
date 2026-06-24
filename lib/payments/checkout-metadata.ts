import type Stripe from "stripe"

export function checkoutMetadataString(
  metadata: Record<string, string> | Stripe.Metadata | null | undefined,
  key: string
): string | null {
  const value = metadata?.[key]
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}

export function resolveCheckoutProductType(
  metadata: Record<string, string> | Stripe.Metadata | null | undefined
): string | null {
  const rawProductType = checkoutMetadataString(metadata, "product_type")
  if (rawProductType === "sselfie_studio_membership_annual") {
    return "sselfie_studio_membership"
  }

  if (rawProductType) {
    return rawProductType
  }

  const legacyProduct = checkoutMetadataString(metadata, "product")
  if (legacyProduct === "work_with_me") {
    return "work_with_me"
  }

  return null
}

export function resolveCheckoutSource(
  metadata: Record<string, string> | Stripe.Metadata | null | undefined,
  productType: string | null | undefined
): string | null {
  return (
    checkoutMetadataString(metadata, "source") ||
    (productType === "work_with_me" ? "work_with_me_paid" : null)
  )
}
