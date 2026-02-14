import { stripe } from "@/lib/stripe"
import { expectedOfferValueCents, type BrandEngineCheckoutMode } from "@/lib/brand-engine/applications"
import {
  resolveBrandEngineOfferCheckoutPrice,
  toBrandEngineCheckoutProductType,
} from "@/lib/brand-engine/offer-checkout-config"

type CheckoutLinkInput = {
  applicationId: number
  name: string
  email: string
  offerType: string | null | undefined
  checkoutMode: BrandEngineCheckoutMode
  baseUrl?: string
}

type CheckoutLinkResult = {
  checkoutUrl: string
  checkoutMode: Exclude<BrandEngineCheckoutMode, "none">
  checkoutModeReason: string
  sessionId: string
  productType: string
  priceId: string
  amountCents: number
}

function normalizeBaseUrl(baseUrl?: string) {
  const fallback = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://sselfie.ai"
  return String(baseUrl || fallback).replace(/\/+$/, "")
}

function resolveCheckoutMode(mode: BrandEngineCheckoutMode): Exclude<BrandEngineCheckoutMode, "none"> {
  if (mode === "embedded_checkout" || mode === "payment_link") return mode
  return "payment_link"
}

export async function createBrandEngineCheckoutLink(input: CheckoutLinkInput): Promise<CheckoutLinkResult> {
  const { normalizedOfferType, priceId } = resolveBrandEngineOfferCheckoutPrice(input.offerType)
  const baseUrl = normalizeBaseUrl(input.baseUrl)
  const productType = toBrandEngineCheckoutProductType(normalizedOfferType)
  const amountCents = expectedOfferValueCents(normalizedOfferType)
  const checkoutMode = resolveCheckoutMode(input.checkoutMode)
  const checkoutModeReason = input.checkoutMode === "none" ? "fallback_payment_link" : "route_config"

  const metadata = {
    product_type: productType,
    payment_type: "brand_engine_offer",
    source: "brand_engine_offer",
    offer_type: normalizedOfferType,
    checkout_mode: checkoutMode,
    brand_engine_application_id: String(input.applicationId),
    customer_name: input.name,
    customer_email: input.email,
  }

  if (checkoutMode === "embedded_checkout") {
    const embeddedSession = await stripe.checkout.sessions.create({
      ui_mode: "embedded",
      redirect_on_completion: "never",
      mode: "payment",
      customer_email: input.email,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata,
      allow_promotion_codes: false,
    })

    if (!embeddedSession.client_secret) {
      throw new Error("Failed to create embedded checkout session for Brand Engine offer.")
    }

    const checkoutUrl = `${baseUrl}/checkout?client_secret=${encodeURIComponent(embeddedSession.client_secret)}&product_type=${encodeURIComponent(productType)}`

    return {
      checkoutUrl,
      checkoutMode,
      checkoutModeReason,
      sessionId: embeddedSession.id,
      productType,
      priceId,
      amountCents,
    }
  }

  const paymentSession = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: input.email,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}&type=${encodeURIComponent(productType)}`,
    cancel_url: `${baseUrl}/brand-engine?checkout=cancelled`,
    metadata,
    allow_promotion_codes: false,
  })

  if (!paymentSession.url) {
    throw new Error("Failed to create payment-link checkout session for Brand Engine offer.")
  }

  return {
    checkoutUrl: paymentSession.url,
    checkoutMode,
    checkoutModeReason,
    sessionId: paymentSession.id,
    productType,
    priceId,
    amountCents,
  }
}
