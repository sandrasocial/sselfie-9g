"use client"

import { useState } from "react"

import { trackAnalyticsEvent } from "@/lib/analytics/client"

type CopyPromptButtonProps = {
  text: string
  label?: string
  className?: string
  analyticsLabel?: string
  analyticsContext?: Record<string, any>
}

export function CopyPromptButton({
  text,
  label = "Copy prompt",
  className = "sbs-copy-button",
  analyticsLabel,
  analyticsContext,
}: CopyPromptButtonProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      trackAnalyticsEvent({
        event: "selfie_to_brand_shoot_prompt_pack_copied",
        properties: {
          product_id: "selfie_to_brand_shoot_system",
          label: analyticsLabel || label,
          ...analyticsContext,
        },
      })
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  return (
    <button type="button" className={className} onClick={handleCopy}>
      {copied ? "Copied" : label}
    </button>
  )
}
