import type { Metadata } from "next"
import SelfieGuideFree from "@/components/freebie/selfie-guide-free-landing"

export const metadata: Metadata = {
  title: "Free Guide: Your First Visible Post",
  description:
    "Sandra's free guide for turning one phone photo into a post that says something. Take the photo, write the caption, and know what to do next.",
  openGraph: {
    title: "Free Guide: Your First Visible Post",
    description:
      "Take one phone photo and turn it into a post with a job: reach, trust, proof, buyer belief, or a simple invitation.",
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
    title: "Free Guide: Your First Visible Post",
    description:
      "A free guide for your first visible post: phone photo, caption prompt, and one clear next step.",
    images: ["https://sselfie.ai/og-image.png"],
  },
  alternates: {
    canonical: "https://sselfie.ai/selfie-guide",
  },
}

export default function SelfieGuidePage() {
  return <SelfieGuideFree />
}
