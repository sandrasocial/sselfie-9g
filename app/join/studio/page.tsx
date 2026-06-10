import type { Metadata } from "next"
import { StudioPageContent } from "@/components/sselfie/public-marketing"

export const metadata: Metadata = {
  title: "Join SSELFIE SUITE | SSELFIE",
  description: "SSELFIE SUITE: Maya, brand-shoot photos, feed planning, and Academy for advanced creators.",
}

export default async function JoinStudioPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string }>
}) {
  // Doors elsewhere (free prompts page, Vault access) arrive with a source param; forwarding it
  // into the checkout CTAs keeps the attribution chain intact (door -> landing -> checkout).
  const params = await searchParams
  return <StudioPageContent checkoutSource={params.source} />
}
