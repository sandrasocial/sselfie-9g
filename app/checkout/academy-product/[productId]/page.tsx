import { notFound, redirect } from "next/navigation"

import { stripe } from "@/lib/stripe"
import { ACADEMY_PRODUCTS } from "@/lib/products"
import { createServerClient } from "@/lib/supabase/server"
import { getCheckoutAttributionFromParams, upsertCheckoutAttribution } from "@/lib/revenue-engine/checkout-attribution"

// Only these three products are sold individually from the public landing page
const PURCHASABLE_IDS = ["what_to_say", "show_up", "get_paid"] as const
type PurchasableId = (typeof PURCHASABLE_IDS)[number]

export async function generateMetadata({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params
  const product = ACADEMY_PRODUCTS[productId as PurchasableId]
  if (!product) return {}
  return { title: `Checkout — ${product.name} | SSELFIE` }
}

export default async function AcademyProductCheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ productId: string }>
  searchParams: Promise<{
    offer_slug?: string
    source?: string
    utm_source?: string
    utm_medium?: string
    utm_campaign?: string
    utm_content?: string
    campaign_id?: string
    ref?: string
    referral_code?: string
    cta_keyword?: string
    quiz_result?: string
    entry_path?: string
  }>
}) {
  const { productId } = await params
  const query = await searchParams

  if (!PURCHASABLE_IDS.includes(productId as PurchasableId)) {
    notFound()
  }

  const product = ACADEMY_PRODUCTS[productId as PurchasableId]
  if (!product?.stripePriceId) {
    notFound()
  }
  const attribution = getCheckoutAttributionFromParams(query, {
    offerSlug: productId.replace(/_/g, "-"),
    source: "micro_offer_landing",
    ctaKeyword: product.manychatKeyword,
    returnTo: "/academy/access/visibility-suite",
    entryPath: `/${productId.replace(/_/g, "-")}`,
  })

  const supabase = await createServerClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai").replace(/\/$/, "")

  try {
    const session = await stripe.checkout.sessions.create({
      ui_mode: "embedded",
      mode: "payment",
      redirect_on_completion: "never",
      ...(authUser?.email && { customer_email: authUser.email }),
      line_items: [{ price: product.stripePriceId, quantity: 1 }],
      allow_promotion_codes: true,
      metadata: {
        // product_type MUST be "academy_mini_product" so the webhook grants entitlements correctly
        product_type: "academy_mini_product",
        product_id: productId,
        credits: "0",
        source: attribution.source || "visibility_suite_landing",
        offer_slug: attribution.offerSlug || productId.replace(/_/g, "-"),
        funnel_stage: "entry_offer",
        ...(attribution.utmSource ? { utm_source: attribution.utmSource } : {}),
        ...(attribution.utmMedium ? { utm_medium: attribution.utmMedium } : {}),
        ...(attribution.utmCampaign ? { utm_campaign: attribution.utmCampaign } : {}),
        ...(attribution.utmContent ? { utm_content: attribution.utmContent } : {}),
        ...(attribution.campaignId ? { campaign_id: String(attribution.campaignId) } : {}),
        ...(attribution.referralCode ? { referral_code: attribution.referralCode } : {}),
        ...(attribution.ctaKeyword ? { cta_keyword: attribution.ctaKeyword } : {}),
        ...(attribution.quizResult ? { quiz_result: attribution.quizResult } : {}),
        ...(attribution.entryPath ? { entry_path: attribution.entryPath } : {}),
        return_to: "/academy/access/visibility-suite",
      },
    })

    if (!session.client_secret) {
      throw new Error("No client secret returned from Stripe")
    }

    await upsertCheckoutAttribution({
      sessionId: session.id,
      checkoutOrigin: authUser?.email ? "authenticated" : "guest",
      productId,
      productType: "academy_mini_product",
      offerSlug: attribution.offerSlug || productId.replace(/_/g, "-"),
      funnelStage: "entry_offer",
      source: attribution.source || "visibility_suite_landing",
      utmSource: attribution.utmSource,
      utmMedium: attribution.utmMedium,
      utmCampaign: attribution.utmCampaign,
      utmContent: attribution.utmContent,
      campaignId: typeof attribution.campaignId === "number" ? attribution.campaignId : null,
      referralCode: attribution.referralCode,
      ctaKeyword: attribution.ctaKeyword,
      quizResult: attribution.quizResult,
      returnTo: "/academy/access/visibility-suite",
      entryPath: attribution.entryPath,
      userEmail: authUser?.email || null,
      stripeCustomerId: typeof session.customer === "string" ? session.customer : null,
    })

    redirect(
      `/checkout?client_secret=${session.client_secret}&product_type=${productId}&return_to=${encodeURIComponent("/academy/access/visibility-suite")}`,
    )
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("[Academy Product Checkout] Error creating checkout session:", error)
    redirect("/visibility-suite?checkout=failed")
  }
}
