"use client"

import type React from "react"

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
      "shrink-0 px-4 py-2 rounded-full border border-[rgba(195,190,182,0.20)] bg-[rgba(175,170,162,0.08)] hover:bg-[rgba(175,170,162,0.15)] hover:text-[#f0ede8] active:bg-[rgba(175,170,162,0.20)] transition-colors text-xs font-medium text-[#8a8780] whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(168,164,156,0.40)]"
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
    "rounded-2xl border border-[rgba(195,190,182,0.15)] bg-[rgba(175,170,162,0.08)] backdrop-blur-[20px] p-3"
  const railClass = "flex gap-2 overflow-x-auto scrollbar-hide snap-x snap-mandatory"
  const pillClass =
    "shrink-0 px-4 py-2.5 rounded-lg border border-[rgba(195,190,182,0.20)] bg-[rgba(175,170,162,0.10)] hover:bg-[rgba(175,170,162,0.18)] transition-colors min-h-[40px] text-[11px] font-medium uppercase tracking-[0.35em] text-[#8a8780] hover:text-[#f0ede8] whitespace-nowrap snap-start disabled:opacity-50 disabled:cursor-not-allowed"

  if (variant === "empty-state") {
    return (
      <div className="relative w-full max-w-2xl px-2 sm:px-4 -mx-2">
        <div className={wrapperClass}>
          <div className={`${railClass} pb-1`}>
            {prompts.map((item, index) => (
              <button
                key={index}
                onClick={() => onSelect(item.prompt)}
                className={pillClass}
                disabled={disabled}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
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
