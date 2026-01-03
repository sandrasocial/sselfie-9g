"use client"

import type React from "react"
import { Typography, Colors } from '@/lib/maya/pro/design-system'

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

  // Empty State - Classic Mode
  if (variant === "empty-state" && !studioProMode) {
    return (
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 w-full max-w-2xl px-2 sm:px-4 -mx-2 snap-x snap-mandatory">
        {prompts.map((item, index) => (
          <button
            key={index}
            onClick={() => {
              if (studioProMode) {
                // Pro Mode: Send message to Maya
                const guidanceMessage = item.prompt
                
                // Send the message - use setTimeout to ensure state is updated
                setTimeout(() => {
                  onSelect(guidanceMessage)
                }, 100)
              } else {
                // Classic mode, send regular message
                onSelect(item.prompt)
              }
            }}
            className="shrink-0 px-4 py-2.5 sm:py-3 bg-white/50 backdrop-blur-xl border border-white/70 rounded-xl hover:bg-stone-100 hover:border-stone-300 transition-all duration-300 touch-manipulation active:scale-95 active:bg-stone-100 min-h-[44px] min-w-[120px] snap-start"
          >
            <span className="text-xs tracking-wide font-medium text-stone-700 whitespace-nowrap">
              {item.label}
            </span>
          </button>
        ))}
      </div>
    )
  }

  // Empty State - Pro Mode
  if (variant === "pro-mode-empty" && studioProMode) {
    return (
      <div className="pt-6 space-y-6">
        {/* Smart suggestions based on library intent */}
        {/* This is handled by parent component - we just render the prompts */}
        
        {/* Signature style prompts */}
        <div className="space-y-3">
          <p className="text-xs text-stone-600 font-light tracking-wide uppercase">
            {isEmpty 
              ? "Start with Pro Mode Examples"
              : "Or Start with Pro Mode Examples"}
          </p>
          {studioProMode && (
            <p className="text-xs text-stone-500 text-center mb-3">
              Pro Mode category examples - tap to inspire Maya
            </p>
          )}
          {prompts.length > 0 ? (
            <div className="flex flex-wrap gap-2 justify-center max-w-2xl mx-auto px-2">
              {prompts.map((item, index) => (
                <button
                  key={index}
                  onClick={() => {
                    onSelect(item.prompt)
                  }}
                  disabled={disabled}
                  className="px-4 py-2.5 sm:py-2 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 active:bg-stone-100 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation active:scale-95 min-h-[44px] min-w-[100px] text-xs sm:text-sm"
                  style={{
                    fontFamily: Typography.ui.fontFamily,
                    fontSize: Typography.ui.sizes.sm,
                    fontWeight: Typography.ui.weights.regular,
                    color: Colors.textSecondary,
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-2">
              <p className="text-xs text-stone-400 italic">Loading suggestions...</p>
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
        <div className="flex gap-1.5 sm:gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-2 px-2 sm:mx-0 sm:px-0 snap-x snap-mandatory">
          {prompts.map((item, index) => (
            <button
              key={index}
              onClick={() => {
                // Classic mode, send regular message
                onSelect(item.prompt)
              }}
              disabled={disabled}
              className="shrink-0 px-3 py-2 bg-white/40 backdrop-blur-xl border border-white/60 rounded-lg hover:bg-white/60 active:bg-white/80 transition-all duration-300 disabled:opacity-50 touch-manipulation active:scale-95 min-h-[44px] min-w-[100px] snap-start"
            >
              <span className="text-xs tracking-wide font-medium text-stone-700 whitespace-nowrap">
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // Pro Mode Options (collapsible section above input)
  if (variant === "pro-mode-options" && studioProMode) {
    return (
      <div>
        <div className="flex gap-1.5 sm:gap-2 overflow-x-auto scrollbar-hide pb-1 snap-x snap-mandatory">
          {prompts.map((item, index) => (
            <button
              key={`pro-mode-prompt-${index}-${item.label}`}
              onClick={() => {
                onSelect(item.prompt)
              }}
              disabled={disabled}
              className="shrink-0 px-3 py-2 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 active:bg-stone-100 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation active:scale-95 min-h-[44px] min-w-[100px] snap-start"
              style={{
                fontFamily: Typography.ui.fontFamily,
                fontSize: Typography.ui.sizes.sm,
                fontWeight: Typography.ui.weights.regular,
                color: Colors.textSecondary,
              }}
            >
              <span className="whitespace-nowrap">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // Default: don't render anything if variant doesn't match
  return null
}
