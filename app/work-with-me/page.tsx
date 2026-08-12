import type { Metadata } from "next"
import { WorkWithMePageContent } from "@/components/sselfie/public-marketing"
import { logAnalyticsEvent } from "@/lib/analytics/events"

export const metadata: Metadata = {
  title: "Work With Me | One Clear Offer",
  description: "A private four-week sprint with Sandra to turn one existing skill or service into a clear paid offer and a focused visibility plan.",
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
