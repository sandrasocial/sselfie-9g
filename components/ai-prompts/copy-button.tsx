"use client"

import { useState } from "react"
import { trackAnalyticsEvent } from "@/lib/analytics/client"

export function CopyButton({
  text,
  promptTitle,
  promptNumber,
}: {
  text: string
  promptTitle?: string
  promptNumber?: string
}) {
  const [copied, setCopied] = useState(false)

  function fireTrack() {
    try {
      trackAnalyticsEvent({
        event: "ai_prompts_prompt_copied",
        properties: {
          source: "ai-prompts",
          ...(promptTitle ? { prompt_title: promptTitle } : {}),
          ...(promptNumber ? { prompt_number: promptNumber } : {}),
        },
      })
    } catch {
      // tracking is fire-and-forget — never block copy
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(text).then(
      () => {
        setCopied(true)
        fireTrack()
        setTimeout(() => setCopied(false), 2000)
      },
      () => {
        // Fallback for older browsers
        const el = document.createElement("textarea")
        el.value = text
        el.style.position = "absolute"
        el.style.left = "-9999px"
        document.body.appendChild(el)
        el.select()
        document.execCommand("copy")
        document.body.removeChild(el)
        setCopied(true)
        fireTrack()
        setTimeout(() => setCopied(false), 2000)
      },
    )
  }

  return (
    <button onClick={handleCopy} className="copy-btn" aria-label="Copy prompt to clipboard">
      {copied ? "Copied" : "Copy"}
    </button>
  )
}
