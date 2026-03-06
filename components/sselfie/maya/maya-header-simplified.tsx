"use client"

import type React from "react"
import MayaModeToggle from "./maya-mode-toggle"

interface MayaHeaderSimplifiedProps {
  // Mode
  studioProMode: boolean
  
  // Classic Mode props
  chatTitle: string
  showNavMenu: boolean
  onToggleNavMenu: () => void
  onModeSwitch: (enable: boolean) => void
  
  // Pro Mode props
  credits?: number
  onSwitchToClassic?: () => void
  
  // Navigation & Actions
  onNavigation?: (tab: string) => void
  onLogout?: () => void
  isLoggingOut?: boolean
}

/**
 * Simplified Maya Header Component
 * 
 * Clean, minimal header design:
 * - Left: SSELFIE logo/title
 * - Right: Credits display and Mode toggle
 * - Menu accessible via 3-dot icon (or separate menu button)
 * 
 * All other features (library management, guide controls, etc.) are accessible via menu.
 */
export default function MayaHeaderSimplified({
  studioProMode,
  credits,
  onSwitchToClassic,
  onModeSwitch,
  onNavigation,
  onLogout,
  isLoggingOut = false,
}: MayaHeaderSimplifiedProps) {
  
  return (
    <div className="flex items-center justify-between w-full px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-b border-[rgba(195,190,182,0.15)] bg-[rgba(175,170,162,0.08)] backdrop-blur-[50px]">
      {/* Left: SSELFIE */}
      <div className="flex items-center shrink-0">
        <h1 className="text-lg sm:text-xl font-serif font-normal text-[#f0ede8] uppercase tracking-wide">
          SSELFIE
        </h1>
      </div>

      {/* Right: Credits and Mode Toggle */}
      <div className="flex items-center gap-3 sm:gap-4 shrink-0">
        {/* Credits Display */}
        {credits !== undefined && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded border border-[rgba(195,190,182,0.20)] bg-[rgba(175,170,162,0.08)]">
            <span className="text-[10px] sm:text-xs font-light text-[#8a8780] uppercase tracking-wider">
              Credits
            </span>
            <span className="text-sm sm:text-base font-semibold text-[#f0ede8] tabular-nums">
              {credits.toFixed(1)}
            </span>
          </div>
        )}

        {/* Mode Toggle */}
        {studioProMode ? (
          onSwitchToClassic && (
            <MayaModeToggle
              currentMode="pro"
              onToggle={onSwitchToClassic}
              variant="compact"
            />
          )
        ) : (
          <MayaModeToggle
            currentMode="classic"
            onToggle={() => onModeSwitch(true)}
            variant="button"
          />
        )}
      </div>
    </div>
  )
}

