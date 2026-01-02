"use client"

import type React from "react"
import { useEffect, useRef } from "react"
import { ImageIcon, Film, Sparkles, GraduationCap } from "lucide-react"

interface MayaTabSwitcherProps {
  activeTab: "photos" | "videos" | "prompts" | "training" | "feed"
  onTabChange: (tab: "photos" | "videos" | "prompts" | "training" | "feed") => void
  photosCount?: number // Optional: show count of generated photos
  videosCount?: number // Optional: show count of generated videos
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
  className = "",
}: MayaTabSwitcherProps) {
  const tabs = [
    { id: "photos" as const, label: "Photos" },
    { id: "videos" as const, label: "Videos" },
    { id: "prompts" as const, label: "Prompts" },
    { id: "training" as const, label: "Training" },
    { id: "feed" as const, label: "Feed" },
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
      className={`flex gap-4 sm:gap-6 md:gap-8 overflow-x-auto ${className}`} 
      style={{ 
        scrollbarWidth: 'none', 
        msOverflowStyle: 'none',
        WebkitOverflowScrolling: 'touch',
        scrollSnapType: 'x proximity',
      }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id
        return (
          <button
            key={tab.id}
            ref={isActive ? activeTabRef : null}
            onClick={() => {
              if (!isActive) {
                onTabChange(tab.id)
              }
            }}
            className={`px-2 sm:px-3 md:px-4 py-3 sm:py-4 md:py-5 border-b-2 transition-all touch-manipulation active:scale-95 min-h-[44px] sm:min-h-[48px] flex items-center gap-1.5 sm:gap-2 whitespace-nowrap scroll-snap-align-start ${
              isActive
                ? "border-stone-950 text-stone-950 cursor-default"
                : "border-transparent text-stone-400 hover:text-stone-600 hover:border-stone-300 cursor-pointer"
            }`}
            aria-label={`${tab.label} tab`}
            title={`${tab.label} tab`}
            disabled={isActive}
            style={{
              fontFamily: 'serif',
              fontSize: '11px',
              fontWeight: 500,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            {tab.label}
            {tab.id === "photos" && photosCount !== undefined && photosCount > 0 && (
              <span className={`text-xs font-medium tabular-nums ${
                isActive ? "text-stone-950/80" : "text-stone-400"
              }`}>
                ({photosCount})
              </span>
            )}
            {tab.id === "videos" && videosCount !== undefined && videosCount > 0 && (
              <span className={`text-xs font-medium tabular-nums ${
                isActive ? "text-stone-950/80" : "text-stone-400"
              }`}>
                ({videosCount})
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

