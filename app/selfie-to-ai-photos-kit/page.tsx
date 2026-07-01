import type { Metadata } from "next"
import { StarterKitPageContent } from "@/components/sselfie/public-marketing"

export const metadata: Metadata = {
  title: "Selfie To AI Photos Kit | SSELFIE",
  description: "Start with one clear selfie and use it to create AI photos that still look like you.",
}

export default async function SelfieToAiPhotosKitPage({
  searchParams,
}: {
  searchParams?: Promise<{ checkout?: string }>
}) {
  const params = searchParams ? await searchParams : {}
  return <StarterKitPageContent checkoutFailed={params.checkout === "failed"} />
}
