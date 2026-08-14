import type { Metadata } from "next"
import { WorkWithMePageContent } from "@/components/sselfie/public-marketing"
import { logAnalyticsEvent } from "@/lib/analytics/events"

export const metadata: Metadata = {
  title: "Your AI Content Team | Work With Sandra",
  description:
    "A private six-week implementation for established women who want a personal AI team to research, plan, write, and repurpose their weekly marketing.",
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
