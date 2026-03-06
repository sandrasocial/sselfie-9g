import type { Metadata } from "next"
import SelfieGuideLanding from "@/components/freebie/selfie-guide-landing"

export const metadata: Metadata = {
  title: "Free Selfie Guide | SSELFIE",
  description:
    "Get instant access to SSELFIE's free selfie guide and learn camera angles, lighting, and posing techniques for personal brand content.",
}

export default function SelfieGuidePage() {
  return <SelfieGuideLanding />
}
