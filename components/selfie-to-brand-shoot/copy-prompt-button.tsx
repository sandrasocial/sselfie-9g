"use client"

import { useState } from "react"

type CopyPromptButtonProps = {
  text: string
  label?: string
  className?: string
}

export function CopyPromptButton({
  text,
  label = "Copy prompt",
  className = "sbs-copy-button",
}: CopyPromptButtonProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
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
