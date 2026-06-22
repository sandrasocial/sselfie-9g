const MEMBERSHIP_PRODUCT_TYPES = new Set(["sselfie_studio_membership", "brand_studio_membership", "pro"])

export function getConfiguredMembershipPriceIds(): string[] {
  return [
    String(process.env.STRIPE_SSELFIE_STUDIO_MEMBERSHIP_PRICE_ID || "").trim(),
    String(process.env.STRIPE_SSELFIE_STUDIO_ANNUAL_PRICE_ID || "").trim(),
    String(process.env.STRIPE_SSELFIE_STUDIO_FOUNDING_ANNUAL_PRICE_ID || "").trim(),
    String(process.env.STRIPE_BRAND_STUDIO_MEMBERSHIP_PRICE_ID || "").trim(),
  ].filter(Boolean)
}

export function isMembershipSubscription(
  subscription: any,
  configuredMembershipPriceIds: string[] = getConfiguredMembershipPriceIds(),
): boolean {
  if (!subscription?.livemode) return false

  const metadataType = String(subscription?.metadata?.product_type || "").trim().toLowerCase()
  if (MEMBERSHIP_PRODUCT_TYPES.has(metadataType)) return true

  const items = Array.isArray(subscription?.items?.data) ? subscription.items.data : []
  if (items.length === 0) return false

  // If no explicit membership price IDs are configured, fall back to recurring subscriptions.
  const noConfiguredPriceIds = configuredMembershipPriceIds.length === 0

  for (const item of items) {
    const price = item?.price
    if (!price?.recurring) continue

    const priceId = String(price.id || "").trim()
    if (noConfiguredPriceIds) return true
    if (priceId && configuredMembershipPriceIds.includes(priceId)) return true
  }

  return false
}
