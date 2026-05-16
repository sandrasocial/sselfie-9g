import { NextRequest, NextResponse } from "next/server"
import { createLandingCheckoutSession } from "@/app/actions/landing-checkout"

export async function POST(request: NextRequest) {
  try {
    const {
      productId,
      offerSlug,
      source,
      utmSource,
      utmMedium,
      utmCampaign,
      utmContent,
      emailType,
      campaignId,
      referralCode,
      guideCta,
      freebieSource,
      checkoutSource,
      ctaKeyword,
      quizResult,
      returnTo,
      entryPath,
    } = await request.json()
    if (!productId) {
      return NextResponse.json({ error: "productId is required" }, { status: 400 })
    }

    const clientSecret = await createLandingCheckoutSession(productId, undefined, undefined, {
      offerSlug,
      source,
      utmSource,
      utmMedium,
      utmCampaign,
      utmContent,
      emailType,
      campaignId,
      referralCode,
      guideCta,
      freebieSource,
      checkoutSource,
      ctaKeyword,
      quizResult,
      returnTo,
      entryPath,
    })
    return NextResponse.json({ clientSecret })
  } catch (error: any) {
    console.error("[v0] [LANDING_CHECKOUT] Error creating checkout session:", error)
    return NextResponse.json({ error: error?.message || "Failed to create checkout" }, { status: 500 })
  }
}
