"use client"

import { useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { trackAnalyticsEvent } from "@/lib/analytics/client"

export function PromptVaultAnalytics() {
  const searchParams = useSearchParams()

  useEffect(() => {
    const entryPostSlug = searchParams.get("entry_post_slug")
    const ctaKeyword = searchParams.get("cta_keyword")

    trackAnalyticsEvent({
      event: "prompt_vault_landing_view",
      properties: {
        source: "prompt-vault",
        entry_post_slug: entryPostSlug,
        cta_keyword: ctaKeyword,
      },
    })

    if (entryPostSlug || ctaKeyword) {
      trackAnalyticsEvent({
        event: "prompt_vault_reel_click",
        properties: {
          source: searchParams.get("source") || "prompt-vault",
          entry_post_slug: entryPostSlug,
          cta_keyword: ctaKeyword,
          utm_source: searchParams.get("utm_source"),
          utm_medium: searchParams.get("utm_medium"),
          utm_campaign: searchParams.get("utm_campaign"),
          utm_content: searchParams.get("utm_content"),
        },
      })
    }
  }, [searchParams])

  return null
}
