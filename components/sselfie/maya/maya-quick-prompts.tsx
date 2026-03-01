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
  variant?: "empty-state" | "input-area" | "pro-mode-empty" | "pro-mode-options"
  studioProMode?: boolean
  isEmpty?: boolean
  uploadedImage?: string | null
}

/**
 * Maya Quick Prompts Component
 * 
 * Displays quick prompt suggestion buttons for users to quickly start conversations.
 * Supports multiple variants for different contexts (empty state, input area, etc.).
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

  const wrapperClass =
    "rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] backdrop-blur-[20px] p-3"
  const railClass = "flex gap-2 overflow-x-auto scrollbar-hide snap-x snap-mandatory"
  const pillClass =
    "shrink-0 px-4 py-2.5 rounded-lg border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.08)] transition-colors min-h-[40px] text-[11px] font-medium uppercase tracking-[0.35em] text-[#ffffff] whitespace-nowrap snap-start disabled:opacity-50 disabled:cursor-not-allowed"

  // Empty State - Shared layout for Classic + Pro welcome states
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

  // Empty State - Pro Mode
  if (variant === "pro-mode-empty" && studioProMode) {
    return (
      <div className="pt-6 space-y-5">
        <p className="text-[10px] text-[#e5e5e5] font-medium uppercase tracking-[0.5em] text-center">
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
              <p className="text-[11px] text-[#e5e5e5]/80 uppercase tracking-[0.3em]">Loading prompts</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Input Area - Classic Mode (below input, when not empty)
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

  // Pro Mode Options (collapsible section above input)
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

  // Default: don't render anything if variant doesn't match
  return null
}
