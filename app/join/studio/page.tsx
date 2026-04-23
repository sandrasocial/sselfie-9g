import type { Metadata } from "next"
import { StudioPageContent } from "@/components/sselfie/public-marketing"

export const metadata: Metadata = {
  title: "Join Studio | SSELFIE",
  description: "Maya, image generation, Feed Planner, and Academy for advanced creators.",
}

export default function JoinStudioPage() {
  return <StudioPageContent />
}
