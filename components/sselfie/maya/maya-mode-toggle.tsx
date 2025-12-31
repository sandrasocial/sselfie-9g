"use client"

import type React from "react"

interface MayaModeToggleProps {
  currentMode: "classic" | "pro"
  onToggle: () => void
  variant?: "button" | "compact"
  className?: string
}

/**
 * Maya Mode Toggle Component
 * 
 * Segmented control for switching between Classic and Pro features.
 * Shows both options with the active one highlighted.
 * 
 * **Pro Features Include:**
 * - Image library management (upload, organize, and reuse images)
 * - Advanced generation options (quick prompts, concept consistency)
 * - Enhanced concept generation with linked images
 * - Library-based image selection for concepts
 * 
 * **Classic Mode:**
 * - Basic chat interface
 * - Simple image generation
 * - Standard concept cards
 * 
 * NO ICONS - uses clear text labels only, following design system guidelines.
 */
export default function MayaModeToggle({
  currentMode,
  onToggle,
  variant = "button",
  className = "",
}: MayaModeToggleProps) {
  const isProMode = currentMode === "pro"
  const isClassicMode = currentMode === "classic"

  // Compact variant (for Pro Mode header) - segmented control showing both options
  if (variant === "compact") {
    // If pointer-events-none is in className, render as div (for use in menu items)
    if (className.includes("pointer-events-none")) {
      return (
        <div className={`flex items-center ${className}`}>
          <span className="text-sm font-medium text-stone-600">
            {isProMode ? "Studio Pro" : "Classic"}
          </span>
        </div>
      )
    }
    
    // Segmented control: shows both Classic and Pro, with active one highlighted
    // When in Pro mode, clicking Classic switches to Classic. Clicking Pro does nothing (already active)
    return (
      <div className={`inline-flex rounded-lg border border-stone-300 bg-white p-0.5 ${className}`}>
        <button
          onClick={() => {
            // Only toggle if not already in Classic mode
            if (isProMode) {
              onToggle()
            }
          }}
          className={`px-3 py-1.5 rounded-md transition-all touch-manipulation active:scale-95 min-h-[32px] ${
            isProMode
              ? "bg-white text-stone-600 hover:bg-stone-50 cursor-pointer"
              : "bg-stone-950 text-white cursor-default"
          }`}
          aria-label="Switch to Classic Mode - Basic chat interface with simple image generation"
          title="Switch to Classic Mode - Basic chat interface with simple image generation"
          disabled={!isProMode}
        >
          <span className="text-xs sm:text-sm font-serif font-extralight tracking-[0.2em] uppercase">
            Classic
          </span>
        </button>
        <button
          onClick={() => {
            // Only toggle if not already in Pro mode
            if (!isProMode) {
              onToggle()
            }
          }}
          className={`px-3 py-1.5 rounded-md transition-all touch-manipulation active:scale-95 min-h-[32px] ${
            isProMode
              ? "bg-stone-950 text-white cursor-default"
              : "bg-white text-stone-600 hover:bg-stone-50 cursor-pointer"
          }`}
          aria-label="Switch to Studio Pro Mode - Image library, advanced options, and enhanced concept generation"
          title="Switch to Studio Pro Mode - Image library, advanced options, and enhanced concept generation"
          disabled={isProMode}
        >
          <span className="text-xs sm:text-sm font-serif font-extralight tracking-[0.2em] uppercase">
            Pro
          </span>
        </button>
      </div>
    )
  }

  // Button variant (for Classic Mode header) - single button
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        onClick={onToggle}
        className="touch-manipulation active:scale-95 px-4 py-2 rounded-lg transition-colors bg-stone-100 text-stone-900 hover:bg-stone-200 border border-stone-300 min-h-[36px]"
        aria-label={isClassicMode 
          ? "Switch to Studio Pro Mode - Enable image library, advanced options, and enhanced concept generation"
          : "Switch to Classic Mode - Basic chat interface with simple image generation"}
        title={isClassicMode 
          ? "Switch to Studio Pro Mode - Enable image library, advanced options, and enhanced concept generation"
          : "Switch to Classic Mode - Basic chat interface with simple image generation"}
      >
        <span className="text-xs sm:text-sm font-serif font-extralight tracking-[0.2em] uppercase">
          {isClassicMode ? "Switch to Studio Pro" : "Switch to Classic"}
        </span>
      </button>
    </div>
  )
}
