import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { CampaignOrderExperience } from "@/components/campaign/campaign-order-experience"
import { getCampaignOrderByToken } from "@/lib/campaign-outcome/orders"

export const dynamic = "force-dynamic"
export const metadata: Metadata = {
  title: "Your Campaign | SSELFIE",
  robots: { index: false, follow: false },
}

export default async function CampaignOrderPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const order = await getCampaignOrderByToken(token)
  if (!order) notFound()

  // Only the fields needed by the buyer UI cross the server/client boundary. Stripe
  // IDs, email, admin notes, and the raw selfie remain server-only.
  const buyerOrder = {
    status: order.status,
    campaign_data: order.campaign_data,
  }

  return <CampaignOrderExperience initialOrder={buyerOrder} token={token} />
}
