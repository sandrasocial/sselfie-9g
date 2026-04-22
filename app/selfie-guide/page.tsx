import type { Metadata } from "next"
import SelfieGuideFree from "@/components/freebie/selfie-guide-free-landing"

export const metadata: Metadata = {
  title: "Free Selfie Guide — Selfies You Feel Good Posting",
  description:
    "Sandra's free eight-part selfie guide: phone settings, light, angles, editing, confidence, and a 7-day challenge. Instant access.",
  openGraph: {
    title: "Free Selfie Guide — Selfies you feel good posting",
    description:
      "Eight guided parts, free instant access. Phone, natural light, no photographer — Sandra's selfie framework.",
    url: "https://sselfie.ai/selfie-guide",
    type: "website",
    images: [
      {
        url: "https://sselfie.ai/og-image.png",
        width: 1200,
        height: 630,
        alt: "SSELFIE Free Selfie Guide",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Free Selfie Guide — Selfies you feel good posting",
    description:
      "Eight-part interactive guide — light, angles, editing, confidence, and a 7-day challenge. Free.",
    images: ["https://sselfie.ai/og-image.png"],
  },
  alternates: {
    canonical: "https://sselfie.ai/selfie-guide",
  },
}

export default function SelfieGuidePage() {
  return <SelfieGuideFree />
}
