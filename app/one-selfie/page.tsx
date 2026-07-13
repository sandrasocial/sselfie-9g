import type { Metadata } from "next"

import {
  buildOneSelfieCheckoutHref,
  buildOneSelfieExpiredFallbackHref,
  getOneSelfieLandingKeyword,
  getOneSelfieLandingSource,
  hasInboundOneSelfieKeyword,
  type OneSelfieLandingSearchParams,
} from "@/components/one-selfie/attribution"
import { OneSelfieLanding } from "@/components/one-selfie/one-selfie-landing"
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
    images: ["/images/starter-kit/hero.png"],
  },
}

export default async function OneSelfiePage({
  searchParams,
}: {
  searchParams?: Promise<OneSelfieLandingSearchParams>
}) {
  const params = searchParams ? await searchParams : {}

  return (
    <OneSelfieLanding
      checkoutHref={buildOneSelfieCheckoutHref(params)}
      checkoutFailed={params.checkout === "failed"}
      closesAt={SELFIE_VISIBILITY_BUNDLE_CLOSES_AT}
      hasInboundKeyword={hasInboundOneSelfieKeyword(params)}
      keyword={getOneSelfieLandingKeyword(params)}
      opensAt={SELFIE_VISIBILITY_BUNDLE_OPENS_AT}
      serverNow={new Date().toISOString()}
      source={getOneSelfieLandingSource(params)}
      starterKitHref={buildOneSelfieExpiredFallbackHref(params)}
    />
  )
}
