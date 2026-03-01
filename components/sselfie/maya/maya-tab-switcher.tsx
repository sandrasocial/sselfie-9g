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
 * Horizontal tab navigation for switching between Photos, Videos, Prompts, and Training tabs.
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
    { id: "photos" as const, label: "Photos" },
    { id: "videos" as const, label: "Videos" },
    
    
    
  ]

  const containerRef = useRef<HTMLDivElement>(null)
  const activeTabRef = useRef<HTMLButtonElement>(null)

  // Scroll active tab into view on mobile when tab changes
  useEffect(() => {
    if (activeTabRef.current && containerRef.current) {
      const container = containerRef.current
      const activeButton = activeTabRef.current
      
      // Calculate scroll position to center the active tab
      const containerRect = container.getBoundingClientRect()
      const buttonRect = activeButton.getBoundingClientRect()
      const scrollLeft = container.scrollLeft
      const buttonLeft = buttonRect.left - containerRect.left + scrollLeft
      const buttonWidth = buttonRect.width
      const containerWidth = containerRect.width
      
      // Center the active tab in the viewport
      const targetScroll = buttonLeft - (containerWidth / 2) + (buttonWidth / 2)
      
      container.scrollTo({
        left: targetScroll,
        behavior: 'smooth',
      })
    }
  }, [activeTab])

  return (
    <div 
      ref={containerRef}
      className={`flex gap-2 sm:gap-3 overflow-x-auto py-3 ${className}`} 
      style={{ 
        scrollbarWidth: 'none', 
        msOverflowStyle: 'none',
        WebkitOverflowScrolling: 'touch',
        scrollSnapType: 'x proximity',
        background: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(20px)',
        borderRadius: '12px',
        border: '1px solid rgba(255,255,255,0.08)',
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
            className={`relative px-4 sm:px-5 py-2.5 rounded-full border transition-all touch-manipulation active:scale-95 min-h-[40px] flex items-center gap-1.5 sm:gap-2 whitespace-nowrap scroll-snap-align-start ${
              isActive
                ? "border-[rgba(255,255,255,0.15)] text-[#ffffff] cursor-default"
                : isDisabled
                  ? "border-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.3)] opacity-60 cursor-not-allowed"
                  : "border-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.5)] hover:text-[rgba(255,255,255,0.7)] hover:bg-[rgba(255,255,255,0.08)] cursor-pointer"
            }`}
            aria-label={`${tab.label} tab`}
            title={isDisabled ? "Feed is temporarily unavailable" : `${tab.label} tab`}
            disabled={isActive || isDisabled}
            aria-disabled={isDisabled}
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "11px",
              fontWeight: 500,
              letterSpacing: "0.5em",
              textTransform: "uppercase",
              backdropFilter: "blur(20px)",
              background: isActive ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)',
            }}
          >
            {tab.label}
            {tab.id === "photos" && photosCount !== undefined && photosCount > 0 && (
              <span className={`text-xs font-medium tabular-nums ${
                isActive ? "text-white" : "text-[rgba(255,255,255,0.5)]"
              }`}>
                ({photosCount})
              </span>
            )}
            {tab.id === "videos" && videosCount !== undefined && videosCount > 0 && (
              <span className={`text-xs font-medium tabular-nums ${
                isActive ? "text-white" : "text-[rgba(255,255,255,0.5)]"
              }`}>
                ({videosCount})
              </span>
            )}
            {isActive && (
              <span className="absolute bottom-0 left-4 right-4 h-[2px] rounded-full" style={{ background: 'rgba(255,255,255,0.4)' }} />
            )}
          </button>
        )
      })}
    </div>
  )
}
