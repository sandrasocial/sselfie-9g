"use client"

import { useEffect } from "react"
import { trackAnalyticsEvent } from "@/lib/analytics/client"

export function PromptVaultAnalytics() {
  useEffect(() => {
    trackAnalyticsEvent({
      event: "prompt_vault_landing_view",
      properties: {
        source: "prompt-vault",
      },
    })
  }, [])

  return null
}
