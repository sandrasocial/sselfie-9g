import type { Metadata } from "next"
import SelfieGuidePaidLanding from "@/components/selfie-guide/selfie-guide-paid-landing"

export const metadata: Metadata = {
  title: "The Selfie Guide — Selfies You Feel Good Posting",
  description:
    "Sandra’s eight-part interactive selfie guide: phone settings, light, angles, editing, confidence, content rhythm, a 7-day challenge, and optional Studio. One-time $17, instant access.",
  openGraph: {
    title: "The Selfie Guide — Selfies you feel good posting",
    description:
      "Eight guided parts, instant access. Phone, natural light, no photographer — the same framework Sandra uses for brand photos.",
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
    title: "The Selfie Guide — Selfies you feel good posting",
    description:
      "Eight-part interactive guide — light, angles, editing, confidence, and a 7-day challenge. $17 one-time.",
    images: ["https://sselfie.ai/og-image.png"],
  },
  alternates: {
    canonical: "https://sselfie.ai/selfie-guide",
  },
}

export default async function SelfieGuidePage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>
}) {
  const params = await searchParams
  return <SelfieGuidePaidLanding checkoutFailed={params.checkout === "failed"} />
}
