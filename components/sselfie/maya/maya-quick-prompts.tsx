"use client"

import type React from "react"
import { useState } from "react"

interface QuickPrompt {
  label: string
  prompt: string
}

interface MayaQuickPromptsProps {
  prompts: QuickPrompt[]
  onSelect: (prompt: string) => void
  disabled?: boolean
  variant?: "empty-state" | "input-area" | "pro-mode-empty" | "pro-mode-options" | "quick-chips"
  studioProMode?: boolean
  isEmpty?: boolean
  uploadedImage?: string | null
}

/**
 * Maya Quick Prompts Component — Now with Quick Chips variant
 * 
 * Displays quick prompt suggestion buttons for users to quickly start conversations.
 * Supports multiple variants for different contexts.
 * 
 * **New: Quick Chips variant** (rendered above input in Chat Focus mode)
 * - Horizontally scrollable row of small text chips
 * - Only shown in CHAT tab
 * - Directly above input bar
 */
export default function MayaQuickPrompts({
  prompts,
  onSelect,
  disabled = false,
  variant = "input-area",
  studioProMode = false,
  isEmpty = false,
  uploadedImage = null,
}: MayaQuickPromptsProps) {
  if (!prompts || prompts.length === 0) {
    return null
  }

  // **NEW: Quick Chips variant** — rendered above input in Chat Focus mode
  if (variant === "quick-chips") {
    const chipClass =
      "shrink-0 rounded-full border border-[rgba(195,190,182,0.18)] bg-[rgba(175,170,162,0.10)] px-4 py-2 text-[11px] uppercase tracking-[0.16em] text-[color:var(--text-accent)] transition-colors hover:bg-[rgba(175,170,162,0.18)] hover:text-[color:var(--color-porcelain)] active:bg-[rgba(175,170,162,0.22)] whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(168,164,156,0.40)]"
    return (
      <div className="flex overflow-x-auto scrollbar-hide gap-2 px-4 py-2 w-full">
        {prompts.map((item, index) => (
          <button
            key={`quick-chip-${index}`}
            onClick={() => onSelect(item.prompt)}
            disabled={disabled}
            className={chipClass}
          >
            {item.label}
          </button>
        ))}
      </div>
    )
  }

  // Existing variants unchanged...
  const wrapperClass =
    "stone-panel rounded-[24px] p-3"
  const railClass = "flex gap-2 overflow-x-auto scrollbar-hide snap-x snap-mandatory"
  const pillClass =
    "shrink-0 rounded-full border border-[rgba(195,190,182,0.18)] bg-[rgba(175,170,162,0.10)] px-4 py-2.5 text-[11px] uppercase tracking-[0.18em] text-[color:var(--text-accent)] transition-colors min-h-[40px] hover:bg-[rgba(175,170,162,0.18)] hover:text-[color:var(--color-porcelain)] whitespace-nowrap snap-start disabled:opacity-50 disabled:cursor-not-allowed"

  if (variant === "empty-state") {
    const INITIAL = 4
    const [expanded, setExpanded] = useState(false)
    const visible = expanded ? prompts : prompts.slice(0, INITIAL)
    const hasMore = prompts.length > INITIAL

    return (
      <div className="relative w-full max-w-xl -mx-1">
        <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-smoke)] mb-3 px-1">
          Or tap a starter
        </p>
        <div className="border-t border-[rgba(195,190,182,0.14)]">
          {visible.map((item, index) => (
            <button
              key={`${item.label}-${index}`}
              type="button"
              onClick={() => onSelect(item.prompt)}
              disabled={disabled}
              className="flex w-full text-left border-b border-[rgba(195,190,182,0.1)] px-1 py-3.5 text-sm font-light leading-snug text-[color:var(--color-porcelain)] hover:bg-[rgba(175,170,162,0.06)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
            >
              {item.label}
            </button>
          ))}
        </div>
        {hasMore ? (
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="mt-3 w-full py-2 text-center text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-smoke)] hover:text-[color:var(--color-porcelain)] transition-colors"
          >
            {expanded ? "Show fewer" : `Show ${prompts.length - INITIAL} more`}
          </button>
        ) : null}
      </div>
    )
  }

  if (variant === "pro-mode-empty" && studioProMode) {
    return (
      <div className="pt-6 space-y-5">
        <p className="text-[10px] text-[#8a8780] font-medium uppercase tracking-[0.5em] text-center font-['Inter']">
          {isEmpty ? "Start With Selfie Mode Prompts" : "More Selfie Mode Prompts"}
        </p>
        <div className={`${wrapperClass} max-w-2xl mx-auto`}>
          {prompts.length > 0 ? (
            <div className={`${railClass} pb-1 justify-start`}>
              {prompts.map((item, index) => (
                <button
                  key={index}
                  onClick={() => onSelect(item.prompt)}
                  disabled={disabled}
                  className={pillClass}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-3">
              <p className="text-[11px] text-[#8a8780] uppercase tracking-[0.3em]">Loading prompts</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (variant === "input-area" && !studioProMode && !isEmpty && !uploadedImage) {
    return (
      <div className="mb-2 mt-2">
        <div className={wrapperClass}>
          <div className={`${railClass} pb-1`}>
            {prompts.map((item, index) => (
              <button
                key={index}
                onClick={() => onSelect(item.prompt)}
                disabled={disabled}
                className={pillClass}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (variant === "pro-mode-options" && studioProMode) {
    return (
      <div className={wrapperClass}>
        <div className={`${railClass} pb-1`}>
          {prompts.map((item, index) => (
            <button
              key={`pro-mode-prompt-${index}-${item.label}`}
              onClick={() => onSelect(item.prompt)}
              disabled={disabled}
              className={pillClass}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return null
}
