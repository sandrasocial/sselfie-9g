import { FreebieGuideCapture } from "@/components/freebie/freebie-guide-capture"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Free Selfie Guide - Become a Selfie Queen | SSELFIE Studio",
  description:
    "Master the art of selfies with our comprehensive guide. Learn camera techniques, lighting, angles, editing, and confidence-building strategies. Get instant access now!",
  openGraph: {
    title: "Free Selfie Guide - Become a Selfie Queen",
    description:
      "Master the art of selfies with our comprehensive guide. Learn camera techniques, lighting, angles, editing, and confidence-building strategies.",
    images: [
      {
        url: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/_%20%2846%29-GzpYegwHcaRjxmU0wCrXMWwaW3B3LZ.jpeg",
        width: 1200,
        height: 630,
        alt: "SSELFIE Studio - Free Selfie Guide",
      },
    ],
  },
}

export default function FreebieGuidePage() {
  return <FreebieGuideCapture />
}
