import type { Metadata } from "next"
import { StudioPageContent } from "@/components/sselfie/public-marketing"

export const metadata: Metadata = {
  title: "SSELFIE SUITE with Maya",
  description: "Maya helps you turn your face, story, and ideas into photos, covers, captions, and posts you can actually use. €97/mo.",
  alternates: {
    canonical: "https://www.sselfie.ai/join/studio",
  },
  openGraph: {
    title: "SSELFIE SUITE with Maya",
    description: "Turn your face, story, and ideas into photos, covers, captions, and posts you can actually use.",
    url: "https://www.sselfie.ai/join/studio",
    images: ["/og-image.png"],
  },
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
