"use client"

import { useEffect, useRef } from "react"
import { trackAnalyticsEvent } from "@/lib/analytics/client"

export function PromptViewTracker({
  promptId,
  promptTitle,
  promptNumber,
  mood,
}: {
  promptId: string
  promptTitle: string
  promptNumber: string
  mood?: string
}) {
  const ref = useRef<HTMLSpanElement | null>(null)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    let tracked = false
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting || tracked) return
        tracked = true
        observer.disconnect()

        trackAnalyticsEvent({
          event: "prompt_vault_prompt_viewed",
          properties: {
            source: "prompt-vault",
            prompt_id: promptId,
            prompt_title: promptTitle,
            prompt_number: promptNumber,
            mood: mood || null,
          },
        })
      },
      { threshold: 0.6 },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [mood, promptId, promptNumber, promptTitle])

  return <span ref={ref} aria-hidden style={{ position: "absolute", width: 1, height: 1, overflow: "hidden" }} />
}
