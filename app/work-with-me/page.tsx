import type { Metadata } from "next"
import { WorkWithMePageContent } from "@/components/sselfie/public-marketing"

export const metadata: Metadata = {
  title: "Work With Me | SSELFIE",
  description: "High-touch inquiry page for Sandra's limited 1:1 offers.",
}

export default function WorkWithMePage() {
  return <WorkWithMePageContent />
}
