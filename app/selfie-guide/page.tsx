import type { Metadata } from "next"
import SelfieGuidePaidLanding from "@/components/selfie-guide/selfie-guide-paid-landing"

export const metadata: Metadata = {
  title: "The Selfie Guide — $17 | SSELFIE",
  description:
    "The exact selfie framework Sandra uses to create confident brand photos with just your phone and natural light. Instant access for $17.",
}

export default async function SelfieGuidePage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>
}) {
  const params = await searchParams
  return <SelfieGuidePaidLanding checkoutFailed={params.checkout === "failed"} />
}
