import type { Metadata } from "next"
import { WorkWithMePageContent } from "@/components/sselfie/public-marketing"

export const metadata: Metadata = {
  title: "Visibility To Paid Private Sprint | SSELFIE",
  description: "Apply for Sandra's 4-week private sprint to build your message, offer, content direction, homepage direction, and first sales path.",
}

export default function WorkWithMePage() {
  return <WorkWithMePageContent />
}
