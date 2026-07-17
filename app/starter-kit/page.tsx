import type { Metadata } from "next"
import { StarterKitPageContent } from "@/components/sselfie/public-marketing"

export const metadata: Metadata = {
  title: "Selfie Starter Kit",
  description: "Make your source photo cleaner, stronger, and easier to use before you post or create AI brand images.",
  alternates: {
    canonical: "https://www.sselfie.ai/starter-kit",
  },
  openGraph: {
    title: "Selfie Starter Kit",
    description: "Make your source photo cleaner, stronger, and easier to use before you post or create AI brand images.",
    url: "https://www.sselfie.ai/starter-kit",
    images: ["/og-image.png"],
  },
}

export default async function StarterKitPage({
  searchParams,
}: {
  searchParams?: Promise<{ checkout?: string }>
}) {
  const params = searchParams ? await searchParams : {}
  return <StarterKitPageContent checkoutFailed={params.checkout === "failed"} />
}
