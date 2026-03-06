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
 * Segmented control for switching between MY MODEL and SELFIE modes.
 * Shows both options with the active one highlighted.
 * 
 * **Pro Features Include:**
 * - Image library management (upload, organize, and reuse images)
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
            {isProMode ? "SELFIE" : "MY MODEL"}
          </span>
        </div>
      )
    }
    
    // Segmented control: shows both MY MODEL and SELFIE, with active one highlighted
    // When in SELFIE mode, clicking MY MODEL switches modes. Clicking SELFIE does nothing (already active)
    // Mobile optimized: min 44px touch targets, responsive text sizes
    return (
      <div className={`inline-flex max-w-full rounded-lg border border-stone-300 bg-white p-0.5 ${className}`}>
        <button
          onClick={() => {
            // Only toggle if not already in MY MODEL mode
            if (isProMode) {
              onToggle()
            }
          }}
          className={`px-2 sm:px-3 py-1.5 rounded-md transition-all touch-manipulation active:scale-95 min-h-[36px] sm:min-h-[40px] flex items-center justify-center ${
            isProMode
              ? "bg-white text-stone-600 hover:bg-stone-50 cursor-pointer"
              : "bg-stone-950 text-white cursor-default"
          }`}
          aria-label="Switch to MY MODEL - Use your trained model for consistent results"
          title="Switch to MY MODEL - Use your trained model for consistent results"
          disabled={!isProMode}
        >
          <span className="text-[9px] sm:text-xs md:text-sm font-serif font-extralight tracking-[0.12em] sm:tracking-[0.2em] uppercase whitespace-nowrap">
            <span className="sm:hidden">Model</span>
            <span className="hidden sm:inline">MY MODEL</span>
          </span>
        </button>
        <button
          onClick={() => {
            // Only toggle if not already in SELFIE mode
            if (!isProMode) {
              onToggle()
            }
          }}
          className={`px-2 sm:px-3 py-1.5 rounded-md transition-all touch-manipulation active:scale-95 min-h-[36px] sm:min-h-[40px] flex items-center justify-center ${
            isProMode
              ? "bg-stone-950 text-white cursor-default"
              : "bg-white text-stone-600 hover:bg-stone-50 cursor-pointer"
          }`}
          aria-label="Switch to SELFIE - Upload selfies for faster generation"
          title="Switch to SELFIE - Upload selfies for faster generation"
          disabled={isProMode}
        >
          <span className="text-[9px] sm:text-xs md:text-sm font-serif font-extralight tracking-[0.12em] sm:tracking-[0.2em] uppercase whitespace-nowrap">
            <span className="sm:hidden">Selfie</span>
            <span className="hidden sm:inline">SELFIE</span>
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
          ? "Switch to SELFIE - Upload selfies for faster generation"
          : "Switch to MY MODEL - Use your trained model for consistent results"}
        title={isClassicMode
          ? "Switch to SELFIE - Upload selfies for faster generation"
          : "Switch to MY MODEL - Use your trained model for consistent results"}
      >
        <span className="text-xs sm:text-sm font-serif font-extralight tracking-[0.2em] uppercase">
          {isClassicMode ? "Switch to SELFIE" : "Switch to MY MODEL"}
        </span>
      </button>
    </div>
  )
}
