import type Stripe from "stripe"

type SessionWithExpandedLineItems = Stripe.Checkout.Session & {
  line_items?: {
    data?: Array<{
      price?: string | { id?: string | null } | null
    }>
  } | null
}

function buildPriceIdMap() {
  const pairs = [
    [process.env.STRIPE_PRICE_SELFIE_GUIDE?.trim(), "selfie_guide"],
    [process.env.STRIPE_PRICE_BRAND_STRATEGY_PACK?.trim(), "brand_strategy_pack"],
    [process.env.STRIPE_PAID_BLUEPRINT_PRICE_ID?.trim(), "paid_blueprint"],
    [process.env.STRIPE_ONE_TIME_SESSION_PRICE_ID?.trim(), "one_time_session"],
    [process.env.STRIPE_SSELFIE_STUDIO_MEMBERSHIP_PRICE_ID?.trim(), "sselfie_studio_membership"],
  ] as const

  return new Map<string, string>(pairs.filter((pair): pair is [string, string] => Boolean(pair[0])))
}

export function getPurchasedProductTypes(session: SessionWithExpandedLineItems): string[] {
  const purchased = new Set<string>()

  const metadataType = session.metadata?.product_type?.trim()
  if (metadataType) {
    purchased.add(metadataType)
  }

  const priceIdMap = buildPriceIdMap()
  const lineItems = session.line_items?.data || []

  for (const lineItem of lineItems) {
    const priceId =
      typeof lineItem.price === "string" ? lineItem.price : lineItem.price?.id || null

    if (!priceId) {
      continue
    }

    const mapped = priceIdMap.get(priceId)
    if (mapped) {
      purchased.add(mapped)
    }
  }

  return Array.from(purchased)
}

export function sessionIncludesProductType(
  session: SessionWithExpandedLineItems,
  productType: string,
) {
  return getPurchasedProductTypes(session).includes(productType)
}
