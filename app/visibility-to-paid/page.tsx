import type { Metadata } from "next"
import { WorkWithMePageContent } from "@/components/sselfie/public-marketing"

export const metadata: Metadata = {
  title: "Visibility To Paid Sprint | SSELFIE",
  description: "Apply to work with Sandra on making your expertise, story, offer, profile, and content clearer online.",
}

export default function VisibilityToPaidPage() {
  return <WorkWithMePageContent />
}
