"use client"

import { useState } from "react"
import Link from "next/link"
import { trackAnalyticsEvent } from "@/lib/analytics/client"
import type { VaultLockedShotPreview } from "@/lib/ai-prompts/prompt-data"
import { ShootPreviewStrip } from "@/components/ai-prompts/shoot-preview-strip"

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
  afterCopyPreviewImage,
  afterCopyLockedShots = [],
  afterCopyCollectionName,
  afterCopyShotCount,
  afterCopyViewEvent,
  afterCopyTrackEvent,
  afterCopyTrackProperties,
  label = "Copy",
  ariaLabel = "Copy prompt to clipboard",
}: {
  text: string
  promptTitle?: string
  promptNumber?: string
  trackEvent?:
    | "ai_prompts_prompt_copied"
    | "prompt_vault_prompt_copied"
    | "selfie_ai_photos_kit_prompt_copied"
  trackSource?: "ai-prompts" | "prompt-vault" | "selfie-ai-photos-kit"
  afterCopyHref?: string
  afterCopyTitle?: string
  afterCopyLabel?: string
  afterCopyNote?: string
  afterCopyFootnote?: string
  afterCopyPreviewImage?: string
  afterCopyLockedShots?: VaultLockedShotPreview[]
  afterCopyCollectionName?: string
  afterCopyShotCount?: number
  afterCopyViewEvent?: string
  afterCopyTrackEvent?: string
  afterCopyTrackProperties?: Record<string, string>
  label?: string
  ariaLabel?: string
}) {
  const [copied, setCopied] = useState(false)
  const [showAfterCopyCta, setShowAfterCopyCta] = useState(false)
  // She copies, switches to ChatGPT to paste, then comes back. The CTA used to auto-hide after
  // 16s, so it was usually gone by the time she returned. Now it stays until she dismisses it.
  const [ctaDismissed, setCtaDismissed] = useState(false)

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
      // tracking is fire-and-forget - never block copy
    }
  }

  function handleCopy() {
    const markCopied = () => {
      setCopied(true)
      if (afterCopyHref && !ctaDismissed && !showAfterCopyCta) {
        setShowAfterCopyCta(true)
        if (afterCopyViewEvent) {
          try {
            trackAnalyticsEvent({
              event: afterCopyViewEvent,
              properties: afterCopyTrackProperties,
            })
          } catch {
            // Tracking is fire-and-forget - never block copy.
          }
        }
      }
      fireTrack()
      if (trackEvent === "prompt_vault_prompt_copied") {
        window.dispatchEvent(
          new CustomEvent("sselfie:prompt-vault:first-result", {
            detail: {
              promptTitle: promptTitle || null,
              promptNumber: promptNumber || null,
            },
          })
        )
      }
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
      }
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
      // Tracking is fire-and-forget - never block navigation.
    }
  }

  return (
    <div className="copy-action">
      <button onClick={handleCopy} className="copy-btn" aria-label={ariaLabel}>
        {copied ? "Copied" : label}
      </button>
      {showAfterCopyCta && !ctaDismissed && afterCopyHref && (
        <div className="copy-after-cta">
          {afterCopyCollectionName && afterCopyShotCount ? (
            <ShootPreviewStrip
              collectionName={afterCopyCollectionName}
              firstImage={afterCopyPreviewImage}
              firstImageAlt={`${promptTitle || afterCopyCollectionName} free prompt result`}
              lockedShots={afterCopyLockedShots}
              shotCount={afterCopyShotCount}
            />
          ) : null}
          {afterCopyTitle && <p className="copy-after-title">{afterCopyTitle}</p>}
          {afterCopyNote && <p className="copy-after-note">{afterCopyNote}</p>}
          <Link href={afterCopyHref} className="copy-after-link" onClick={handleAfterCopyClick}>
            {afterCopyLabel || "Get the full shoot"}
          </Link>
          <button
            type="button"
            className="copy-after-dismiss"
            onClick={() => {
              setCtaDismissed(true)
              setShowAfterCopyCta(false)
            }}
          >
            Not now
          </button>
          {afterCopyFootnote && <p className="copy-after-footnote">{afterCopyFootnote}</p>}
        </div>
      )}
    </div>
  )
}
