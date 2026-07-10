import type { Metadata } from "next"
import { WorkWithMePageContent } from "@/components/sselfie/public-marketing"

export const metadata: Metadata = {
  title: "Visibility To Paid Sprint",
  description: "A private four-week sprint with Sandra to connect your story, message, content, visual identity, and clearest paid offer.",
}

export default function VisibilityToPaidPage() {
  return <WorkWithMePageContent />
}
