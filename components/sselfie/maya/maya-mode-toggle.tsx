"use client"

import type React from "react"
import { Sparkles } from "lucide-react"

interface MayaModeToggleProps {
  currentMode: "classic" | "pro"
  onToggle: () => void
  variant?: "button" | "compact"
  className?: string
}

/**
 * Maya Mode Toggle Component
 * 
 * Unified toggle button for switching between Classic and Pro Mode.
 * Can be used in both Classic and Pro Mode headers.
 */
export default function MayaModeToggle({
  currentMode,
  onToggle,
  variant = "button",
  className = "",
}: MayaModeToggleProps) {
  const isProMode = currentMode === "pro"
  const isClassicMode = currentMode === "classic"

  // Compact variant (for Pro Mode header)
  if (variant === "compact") {
    // If pointer-events-none is in className, render as div (for use in menu items)
    if (className.includes("pointer-events-none")) {
      return (
        <div className={`flex items-center gap-1.5 ${className}`}>
          <Sparkles size={14} className="w-4 h-4" strokeWidth={2} />
        </div>
      )
    }
    
    return (
      <button
        onClick={onToggle}
        className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-lg transition-colors touch-manipulation active:scale-95 min-h-[36px] ${
          isProMode
            ? "bg-stone-100 text-stone-900 hover:bg-stone-200"
            : "bg-stone-950 text-white hover:bg-stone-800"
        } ${className}`}
        aria-label={isProMode ? "Switch to Classic Mode" : "Switch to Studio Pro Mode"}
      >
        <Sparkles size={14} className="sm:w-4 sm:h-4" strokeWidth={2} />
        <span className="text-[11px] sm:text-xs">
          {isProMode ? "Classic" : "Pro"}
        </span>
      </button>
    )
  }

  // Button variant (for Classic Mode header)
  return (
    <div className={`flex items-center gap-1.5 sm:gap-2 md:gap-3 ${className}`}>
      <span className="text-xs text-stone-600 hidden sm:inline">Mode:</span>
      <button
        onClick={onToggle}
        className="touch-manipulation active:scale-95 flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-lg transition-colors bg-stone-100 text-stone-900 hover:bg-stone-200 min-h-[36px]"
        aria-label={isClassicMode ? "Switch to Studio Pro Mode" : "Switch to Classic Mode"}
      >
        <Sparkles size={14} className="sm:w-4 sm:h-4" strokeWidth={2} />
        <span className="text-[11px] sm:text-xs">
          {isClassicMode ? "Switch to Studio Pro" : "Switch to Classic"}
        </span>
      </button>
    </div>
  )
}
