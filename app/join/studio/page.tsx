import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { StudioPageContent } from "@/components/sselfie/public-marketing"
import {
  isSkoolPublicAcquisitionEnabled,
  SKOOL_PUBLIC_MEMBERSHIP_URL,
} from "@/lib/skool/public-acquisition"

export const metadata: Metadata = {
  title: "SSELFIE SUITE with Maya",
  description:
    "Start with one selfie. Use Maya, Create, Calendar, and Learn to make personal-brand photos, find the words, and plan what goes out next. €97 monthly.",
  alternates: {
    canonical: "https://www.sselfie.ai/join/studio",
  },
  openGraph: {
    type: "website",
    title: "SSELFIE SUITE with Maya",
    description:
      "Create photos that feel like you, know what to say, and plan what goes out next in one monthly membership.",
    url: "https://www.sselfie.ai/join/studio",
    images: ["/og-image.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "SSELFIE SUITE · Start with one selfie",
    description:
      "Maya helps with the visual, the words, and what goes out next. €97 monthly.",
    images: ["/og-image.png"],
  },
}

const suiteStructuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "SSELFIE SUITE",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  url: "https://sselfie.ai/join/studio",
  description:
    "A monthly personal-brand creation workspace with Maya, Create, Calendar, Learn, and the SSELFIE resource library.",
  offers: {
    "@type": "Offer",
    price: "97",
    priceCurrency: "EUR",
    availability: "https://schema.org/InStock",
    url: "https://sselfie.ai/join/studio",
  },
  featureList: [
    "AI-assisted personal-brand content creation",
    "Content calendar and grid planning",
    "Personalized learning and brand guidance",
    "100 creation credits that reset each billing month",
  ],
}

export default async function JoinStudioPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string }>
}) {
  // During the Skool launch, this public legacy acquisition door must not
  // advertise or sell the parallel Stripe membership. Existing/internal
  // Stripe checkout routes remain available because only this public page is
  // redirected behind the launch flag.
  if (isSkoolPublicAcquisitionEnabled()) {
    redirect(SKOOL_PUBLIC_MEMBERSHIP_URL)
  }

  // Doors elsewhere (free prompts page, Vault access) arrive with a source param; forwarding it
  // into the checkout CTAs keeps the attribution chain intact (door -> landing -> checkout).
  const params = await searchParams
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(suiteStructuredData).replace(/</g, "\\u003c"),
        }}
      />
      <StudioPageContent checkoutSource={params.source} />
    </>
  )
}
