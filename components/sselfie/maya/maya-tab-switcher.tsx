"use client"

import type React from "react"
import { useEffect, useRef } from "react"

interface MayaTabSwitcherProps {
  activeTab: "photos" | "videos" | "prompts" | "training" | "feed"
  onTabChange: (tab: "photos" | "videos" | "prompts" | "training" | "feed") => void
  photosCount?: number // Optional: show count of generated photos
  videosCount?: number // Optional: show count of generated videos
  disableFeedTab?: boolean
  className?: string
}

/**
 * Maya Tab Switcher Component
 * 
 * Horizontal tab navigation for switching between Photos, Videos, and Training tabs.
 * 
 * **Design Principles:**
 * - Text-based labels (following design system)
 * - Active tab indicated by underline border
 * - Smooth transitions
 * - Mobile-optimized touch targets (min 44px height)
 * - Horizontal scrollable on mobile
 * - Consistent with SSELFIE design system
 * 
 * **Usage:**
 * - Place below header in sticky container
 * - Only show when in Maya screen
 * - Persist tab selection in localStorage (optional, handled by parent)
 */
export default function MayaTabSwitcher({
  activeTab,
  onTabChange,
  photosCount,
  videosCount,
  disableFeedTab = false,
  className = "",
}: MayaTabSwitcherProps) {
  const tabs = [
    { id: "photos" as const, label: "Weekly Plan" },
    { id: "videos" as const, label: "Animate" },
    { id: "training" as const, label: "Setup" },
  ]

  const containerRef = useRef<HTMLDivElement>(null)
  const activeTabRef = useRef<HTMLButtonElement>(null)

  // Keep the active tab visible on narrow screens without forcing it to center
  // and clipping the first/last tab when header actions are present.
  useEffect(() => {
    if (activeTabRef.current && containerRef.current) {
      const container = containerRef.current
      const activeButton = activeTabRef.current
      if (container.scrollWidth <= container.clientWidth) return

      activeButton.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "nearest",
      })
    }
  }, [activeTab])

  return (
    <div 
      ref={containerRef}
      className={`flex w-full min-w-0 items-center gap-1 overflow-x-auto py-1.5 ${className}`} 
      style={{ 
        scrollbarWidth: 'none', 
        msOverflowStyle: 'none',
        WebkitOverflowScrolling: 'touch',
        scrollSnapType: 'x proximity',
      }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id
        const isDisabled = tab.id === "feed" && disableFeedTab
        return (
          <button
            key={tab.id}
            ref={isActive ? activeTabRef : null}
            onClick={() => {
              if (!isActive && !isDisabled) {
                onTabChange(tab.id)
              }
            }}
            className={`relative px-3 sm:px-3.5 py-1.5 rounded-[6px] transition-all touch-manipulation active:scale-95 min-h-[34px] sm:min-h-[36px] flex items-center gap-1 sm:gap-1.5 whitespace-nowrap scroll-snap-align-start ${
              isActive
                ? "bg-[color:var(--app-btn-primary-bg)] text-[color:var(--app-btn-primary-text)] cursor-default"
                : isDisabled
                  ? "text-[color:var(--app-text-muted)] opacity-60 cursor-not-allowed"
                  : "text-[color:var(--app-text-secondary)] hover:text-[color:var(--app-text-primary)] hover:bg-[color:var(--app-btn-secondary-bg)] cursor-pointer"
            }`}
            aria-label={`${tab.label} tab`}
            title={isDisabled ? "Feed is temporarily unavailable" : `${tab.label} tab`}
            disabled={isActive || isDisabled}
            aria-disabled={isDisabled}
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "10px",
              fontWeight: 500,
              letterSpacing: "0.26em",
              textTransform: "uppercase",
            }}
          >
            {tab.label}
            {tab.id === "photos" && photosCount !== undefined && photosCount > 0 && (
              <span className={`text-xs font-medium tabular-nums ${
                isActive ? "text-[color:var(--app-btn-primary-text)]" : "text-[color:var(--app-text-muted)]"
              }`}>
                ({photosCount})
              </span>
            )}
            {tab.id === "videos" && videosCount !== undefined && videosCount > 0 && (
              <span className={`text-xs font-medium tabular-nums ${
                isActive ? "text-[color:var(--app-btn-primary-text)]" : "text-[color:var(--app-text-muted)]"
              }`}>
                ({videosCount})
              </span>
            )}
            {isActive && (
              <span className="absolute bottom-[3px] left-3 right-3 h-[1.5px] rounded-full" style={{ background: 'rgba(255,255,255,0.55)' }} />
            )}
          </button>
        )
      })}
    </div>
  )
}
