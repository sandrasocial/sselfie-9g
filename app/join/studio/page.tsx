import type { Metadata } from "next"
import { StudioPageContent } from "@/components/sselfie/public-marketing"

export const metadata: Metadata = {
  title: "Join SSELFIE SUITE | SSELFIE",
  description: "Maya helps you turn your face, story, and ideas into photos, covers, captions, and posts you can actually use. €97/mo.",
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
