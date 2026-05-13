import type { Metadata } from "next"
import { WorkWithMePageContent } from "@/components/sselfie/public-marketing"

export const metadata: Metadata = {
  title: "Work With Me | Private AI Brand OS | SSELFIE",
  description: "Apply to work privately with Sandra on your personal brand, content direction, Studio workflow, and AI Brand OS.",
}

export default function WorkWithMePage() {
  return <WorkWithMePageContent />
}
