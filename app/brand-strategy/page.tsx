import type { Metadata } from "next"
import BrandStrategyLanding from "@/components/brand-strategy/brand-strategy-landing"

export const metadata: Metadata = {
  title: "Brand Strategy — $19 | SSELFIE",
  description:
    "Your custom brand positioning, content pillars, voice guide, and caption starters — built by Maya in minutes. One-time $19.",
}

export default async function BrandStrategyPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>
}) {
  const params = await searchParams
  return <BrandStrategyLanding checkoutFailed={params.checkout === "failed"} />
}
