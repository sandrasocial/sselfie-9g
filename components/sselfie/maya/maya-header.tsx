"use client"

import type React from "react"
import ProModeHeader from "../pro-mode/ProModeHeader"
import MayaModeToggle from "./maya-mode-toggle"

interface MayaHeaderProps {
  // Mode
  studioProMode: boolean
  
  // Classic Mode props
  chatTitle: string
  showNavMenu: boolean
  onToggleNavMenu: () => void
  onModeSwitch: (enable: boolean) => void
  
  // Pro Mode props (passed to ProModeHeader)
  libraryCount?: number
  credits?: number
  onManageLibrary?: () => void
  onAddImages?: () => void
  onStartFresh?: () => void
  onEditIntent?: () => void
  onSwitchToClassic?: () => void
  onSettings?: () => void
  isAdmin?: boolean
  selectedGuideId?: number | null
  selectedGuideCategory?: string | null
  onGuideChange?: (id: number | null, category: string | null) => void
  userId?: string
  
  // Navigation & Actions
  onNavigation?: (tab: string) => void
  onLogout?: () => void
  isLoggingOut?: boolean
}

/**
 * Maya Header Component
 * 
 * Unified header component that handles both Classic and Pro Mode.
 * - Classic Mode: Simple header with chat title, mode toggle, and menu
 * - Pro Mode: Uses ProModeHeader component
 */
export default function MayaHeader({
  studioProMode,
  chatTitle,
  showNavMenu,
  onToggleNavMenu,
  onModeSwitch,
  libraryCount = 0,
  credits = 0,
  onManageLibrary,
  onAddImages,
  onStartFresh,
  onEditIntent,
  onSwitchToClassic,
  onSettings,
  isAdmin = false,
  selectedGuideId = null,
  selectedGuideCategory = null,
  onGuideChange,
  userId,
  onNavigation,
  onLogout,
  isLoggingOut = false,
}: MayaHeaderProps) {
  // Pro Mode: Use existing ProModeHeader component
  if (studioProMode) {
    return (
      <div className="relative">
        <ProModeHeader
          libraryCount={libraryCount}
          credits={credits}
          onManageLibrary={onManageLibrary}
          onAddImages={onAddImages}
          onStartFresh={onStartFresh}
          isAdmin={isAdmin}
          selectedGuideId={selectedGuideId}
          selectedGuideCategory={selectedGuideCategory}
          onGuideChange={onGuideChange}
          userId={userId}
          onEditIntent={onEditIntent}
          onNavigation={onNavigation}
          onLogout={onLogout}
          isLoggingOut={isLoggingOut}
          onSwitchToClassic={onSwitchToClassic}
          onSettings={onSettings}
        />
      </div>
    )
  }

  // Classic Mode: Simple header
  return (
    <div className="shrink-0 flex items-center justify-between px-3 sm:px-4 py-3 bg-white/80 backdrop-blur-xl border-b border-stone-200/50 relative z-50">
      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-stone-200/60 overflow-hidden shrink-0">
          <img src="https://i.postimg.cc/fTtCnzZv/out-1-22.png" alt="Maya" className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm sm:text-base font-serif font-extralight tracking-[0.2em] text-stone-950 uppercase">
            {chatTitle}
          </h3>
        </div>
      </div>

      {/* Mode Toggle - Classic Mode */}
      <div className="mr-2">
        <MayaModeToggle
          currentMode="classic"
          onToggle={() => onModeSwitch(true)}
          variant="button"
        />
      </div>

      <button
        onClick={onToggleNavMenu}
        className="flex items-center justify-center px-3 h-9 sm:h-10 rounded-lg hover:bg-stone-100/50 transition-colors touch-manipulation active:scale-95"
        aria-label="Navigation menu"
        aria-expanded={showNavMenu}
      >
        <span className="text-xs sm:text-sm font-serif tracking-[0.2em] text-stone-950 uppercase">MENU</span>
      </button>
    </div>
  )
}
