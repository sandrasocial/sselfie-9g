"use client"

import { useEffect } from "react"
import { trackAnalyticsEvent } from "@/lib/analytics/client"

export function QuizResultServedTracker({
  quizSlug,
  result,
  offerSlug,
}: {
  quizSlug: string
  result: string
  offerSlug: string
}) {
  useEffect(() => {
    trackAnalyticsEvent({
      event: "quiz_result_served",
      properties: {
        quiz_slug: quizSlug,
        quiz_result: result,
        offer_slug: offerSlug,
      },
    })
  }, [offerSlug, quizSlug, result])

  return null
}
