import type { Metadata } from "next"
import { WorkWithMePageContent } from "@/components/sselfie/public-marketing"
import { logAnalyticsEvent } from "@/lib/analytics/events"

export const metadata: Metadata = {
  title: "Work With Me | A Client-Ready Online Presence",
  description: "A private sprint with Sandra for experienced women whose real-world expertise is not yet turning into clear online trust and client inquiries.",
  robots: {
    index: false,
    follow: false,
  },
}

export default async function WorkWithMePage() {
  await logAnalyticsEvent({
    eventName: "work_with_me_landing_view",
    path: "/work-with-me",
    properties: {
      source: "work_with_me_page",
    },
  })

  return <WorkWithMePageContent />
}
