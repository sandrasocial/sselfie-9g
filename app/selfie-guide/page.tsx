import type { Metadata } from "next"
import SelfieGuideLanding from "@/components/freebie/selfie-guide-landing"

export const metadata: Metadata = {
  title: "The Selfie Guide — Camera Angles, Lighting & Posing for Personal Brand Content",
  description:
    "Learn the exact selfie framework Sandra uses to create scroll-stopping brand content without a photographer. Camera angles, natural lighting, and posing techniques for personal brands.",
  openGraph: {
    title: "The Selfie Guide — Stop Guessing. Start Showing Up.",
    description:
      "The exact selfie framework for content creators who want professional-looking photos without a professional photographer.",
    url: "https://sselfie.ai/selfie-guide",
    type: "website",
    images: [
      {
        url: "https://sselfie.ai/og-image.png",
        width: 1200,
        height: 630,
        alt: "SSELFIE Selfie Guide",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "The Selfie Guide — Stop Guessing. Start Showing Up.",
    description:
      "The exact selfie framework for personal brand content. No photographer needed.",
    images: ["https://sselfie.ai/og-image.png"],
  },
  alternates: {
    canonical: "https://sselfie.ai/selfie-guide",
  },
}

export default function SelfieGuidePage() {
  return <SelfieGuideLanding />
}
