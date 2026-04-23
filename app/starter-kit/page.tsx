import type { Metadata } from "next"
import { StarterKitPageContent } from "@/components/sselfie/public-marketing"

export const metadata: Metadata = {
  title: "Starter Kit | SSELFIE",
  description: "Presets, guide, and quick-start for better selfie results fast.",
}

export default function StarterKitPage() {
  return <StarterKitPageContent />
}
