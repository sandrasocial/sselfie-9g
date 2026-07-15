import type { Metadata } from "next"
import { cookies, headers } from "next/headers"
import { after } from "next/server"

import {
  buildOneSelfieCheckoutHref,
  buildOneSelfieExpiredFallbackHref,
  getOneSelfieLandingKeyword,
  getOneSelfieLandingSource,
  hasInboundOneSelfieKeyword,
  type OneSelfieLandingSearchParams,
} from "@/components/one-selfie/attribution"
import { OneSelfieLanding } from "@/components/one-selfie/one-selfie-landing"
import { trackOfferLandingRequest } from "@/lib/analytics/offer-request"
import {
  SELFIE_VISIBILITY_BUNDLE_CLOSES_AT,
  SELFIE_VISIBILITY_BUNDLE_OPENS_AT,
} from "@/lib/launch/selfie-visibility-bundle"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "One Selfie Visibility Bundle",
  description:
    "Turn one selfie into photos and content you can actually post. Five lifetime SSELFIE products plus 30 days of SUITE for one $97 payment.",
  alternates: {
    canonical: "/one-selfie",
  },
  openGraph: {
    title: "One Selfie Visibility Bundle · SSELFIE",
    description:
      "One selfie. Five lifetime SSELFIE products. 30 days of SUITE. One $97 payment with no renewal.",
    images: [
      {
        url: "/images/one-selfie/og-bundle-v2.webp",
        width: 1200,
        height: 630,
        alt: "One Selfie Visibility Bundle · five lifetime tools plus 30 days of SSELFIE SUITE",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "One Selfie Visibility Bundle · SSELFIE",
    description:
      "One selfie. Five lifetime SSELFIE products. 30 days of SUITE. One $97 payment with no renewal.",
    images: ["/images/one-selfie/og-bundle-v2.webp"],
  },
}

export default async function OneSelfiePage({
  searchParams,
}: {
  searchParams?: Promise<OneSelfieLandingSearchParams>
}) {
  const params = searchParams ? await searchParams : {}
  const requestHeaders = await headers()
  const cookieStore = await cookies()
  const keyword = getOneSelfieLandingKeyword(params)
  const source = getOneSelfieLandingSource(params)

  after(async () => {
    await trackOfferLandingRequest({
      anonId: cookieStore.get("sselfie_anon_id")?.value || null,
      ctaKeyword: keyword,
      headers: requestHeaders,
      offerSlug: "one-selfie-visibility-bundle",
      params,
      path: "/one-selfie",
      productId: "selfie_visibility_bundle",
      source,
    })
  })

  return (
    <OneSelfieLanding
      checkoutHref={buildOneSelfieCheckoutHref(params)}
      checkoutFailed={params.checkout === "failed"}
      closesAt={SELFIE_VISIBILITY_BUNDLE_CLOSES_AT}
      hasInboundKeyword={hasInboundOneSelfieKeyword(params)}
      keyword={keyword}
      opensAt={SELFIE_VISIBILITY_BUNDLE_OPENS_AT}
      serverNow={new Date().toISOString()}
      source={source}
      starterKitHref={buildOneSelfieExpiredFallbackHref(params)}
    />
  )
}
