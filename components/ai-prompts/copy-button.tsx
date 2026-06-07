"use client"

import { useState } from "react"
import Link from "next/link"
import { trackAnalyticsEvent } from "@/lib/analytics/client"

export function CopyButton({
  text,
  promptTitle,
  promptNumber,
  trackEvent = "ai_prompts_prompt_copied",
  trackSource = "ai-prompts",
  afterCopyHref,
  afterCopyTitle,
  afterCopyLabel,
  afterCopyNote,
  afterCopyFootnote,
  afterCopyViewEvent,
  afterCopyTrackEvent,
  afterCopyTrackProperties,
}: {
  text: string
  promptTitle?: string
  promptNumber?: string
  trackEvent?: "ai_prompts_prompt_copied" | "prompt_vault_prompt_copied"
  trackSource?: "ai-prompts" | "prompt-vault"
  afterCopyHref?: string
  afterCopyTitle?: string
  afterCopyLabel?: string
  afterCopyNote?: string
  afterCopyFootnote?: string
  afterCopyViewEvent?: string
  afterCopyTrackEvent?: string
  afterCopyTrackProperties?: Record<string, string>
}) {
  const [copied, setCopied] = useState(false)
  const [showAfterCopyCta, setShowAfterCopyCta] = useState(false)

  function fireTrack() {
    try {
      trackAnalyticsEvent({
        event: trackEvent,
        properties: {
          source: trackSource,
          ...(promptTitle ? { prompt_title: promptTitle } : {}),
          ...(promptNumber ? { prompt_number: promptNumber } : {}),
        },
      })
    } catch {
      // tracking is fire-and-forget — never block copy
    }
  }

  function handleCopy() {
    const markCopied = () => {
      setCopied(true)
      if (afterCopyHref) {
        setShowAfterCopyCta(true)
        if (afterCopyViewEvent) {
          try {
            trackAnalyticsEvent({
              event: afterCopyViewEvent,
              properties: afterCopyTrackProperties,
            })
          } catch {
            // Tracking is fire-and-forget — never block copy.
          }
        }
        setTimeout(() => setShowAfterCopyCta(false), 16000)
      }
      fireTrack()
      setTimeout(() => setCopied(false), 2000)
    }

    navigator.clipboard.writeText(text).then(
      () => {
        markCopied()
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
        markCopied()
      },
    )
  }

  function handleAfterCopyClick() {
    if (!afterCopyTrackEvent) return

    try {
      trackAnalyticsEvent({
        event: afterCopyTrackEvent,
        properties: afterCopyTrackProperties,
      })
    } catch {
      // Tracking is fire-and-forget — never block navigation.
    }
  }

  return (
    <div className="copy-action">
      <button onClick={handleCopy} className="copy-btn" aria-label="Copy prompt to clipboard">
        {copied ? "Copied" : "Copy"}
      </button>
      {showAfterCopyCta && afterCopyHref && (
        <div className="copy-after-cta">
          {afterCopyTitle && <p className="copy-after-title">{afterCopyTitle}</p>}
          {afterCopyNote && <p className="copy-after-note">{afterCopyNote}</p>}
          <Link href={afterCopyHref} className="copy-after-link" onClick={handleAfterCopyClick}>
            {afterCopyLabel || "Get the full shoot"}
          </Link>
          {afterCopyFootnote && <p className="copy-after-footnote">{afterCopyFootnote}</p>}
        </div>
      )}
    </div>
  )
}
