import type { Metadata } from "next"
import { WorkWithMePageContent } from "@/components/sselfie/public-marketing"
import { logAnalyticsEvent } from "@/lib/analytics/events"

export const metadata: Metadata = {
  title: "Visibility To Paid Sprint",
  description: "A private four-week sprint with Sandra to connect your story, message, content, visual identity, and clearest paid offer.",
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
