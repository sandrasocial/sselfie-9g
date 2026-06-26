import type { Metadata } from "next"
import { StarterKitPageContent } from "@/components/sselfie/public-marketing"

export const metadata: Metadata = {
  title: "Starter Kit | SSELFIE",
  description: "Make your source photo cleaner, stronger, and easier to use before you post or create AI brand images.",
}

export default async function StarterKitPage({
  searchParams,
}: {
  searchParams?: Promise<{ checkout?: string }>
}) {
  const params = searchParams ? await searchParams : {}
  return <StarterKitPageContent checkoutFailed={params.checkout === "failed"} />
}
