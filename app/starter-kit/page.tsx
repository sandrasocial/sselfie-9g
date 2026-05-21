import type { Metadata } from "next"
import { StarterKitPageContent } from "@/components/sselfie/public-marketing"

export const metadata: Metadata = {
  title: "Starter Kit | SSELFIE",
  description: "AI-ready selfie presets, posing, editing, captions, and a 7-day content starter for $37.",
}

export default function StarterKitPage() {
  return <StarterKitPageContent />
}
