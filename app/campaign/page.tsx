import type { Metadata } from "next"
import { cookies, headers } from "next/headers"
import { after } from "next/server"

import { CampaignLanding } from "@/components/campaign/campaign-landing"
import { trackOfferLandingRequest } from "@/lib/analytics/offer-request"
import { isCampaignOutcomeEnabled } from "@/lib/campaign-outcome/feature"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Your Next Campaign | SSELFIE",
  description:
    "Give Maya one selfie. Get photos, posts, Stories, a reel, and a five-day campaign plan within 48 hours.",
  alternates: { canonical: "/campaign" },
}

type CampaignParams = Record<string, string | string[] | undefined> & {
  checkout?: string
  offer?: string
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

export default async function CampaignPage({
  searchParams,
}: {
  searchParams?: Promise<CampaignParams>
}) {
  const params = searchParams ? await searchParams : {}
  const enabled = isCampaignOutcomeEnabled()

  if (enabled) {
    const requestHeaders = await headers()
    const cookieStore = await cookies()
    after(async () => {
      await trackOfferLandingRequest({
        anonId: cookieStore.get("sselfie_anon_id")?.value || null,
        ctaKeyword: first(params.cta_keyword) || "CAMPAIGN",
        headers: requestHeaders,
        offerSlug: "your-next-campaign",
        params,
        path: "/campaign",
        productId: "campaign_outcome",
        source: first(params.source) || "campaign_landing",
      })
    })
  }

  return <CampaignLanding checkoutFailed={params.checkout === "failed"} enabled={enabled} />
}
