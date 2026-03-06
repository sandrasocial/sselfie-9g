"use client"

import { useState, useEffect, useRef } from 'react'
import type React from "react"
import { Typography, Colors, BorderRadius, ButtonLabels } from '@/lib/maya/pro/design-system'
import { useToast } from '@/hooks/use-toast'
import MayaModeToggle from "./maya-mode-toggle"
import MayaTabSwitcher from "./maya-tab-switcher"

interface Guide {
  id: number
  title: string
  category: string
  status?: string | null
  page_slug?: string | null
}

interface MayaHeaderUnifiedProps {
  // Mode
  proMode: boolean
  
  // Classic Mode props
  chatTitle: string
  showNavMenu: boolean
  onToggleNavMenu: () => void
  onModeSwitch: (enable: boolean) => void
  
  // Pro Mode props
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
  onNewProject?: () => void
  onHistory?: () => void
  onLogout?: () => void
  isLoggingOut?: boolean
  onOpenCredits?: () => void
  
  // Tab Switcher Props (integrated into header)
  activeTab?: "photos" | "videos" | "prompts" | "training" | "feed"
  onTabChange?: (tab: "photos" | "videos" | "prompts" | "training" | "feed") => void
  photosCount?: number
  videosCount?: number
  disableFeedTab?: boolean
  
  // Access Control
  showModeToggle?: boolean // Show Pro/Classic toggle (only for membership users)
}

/**
 * Unified Maya Header Component
 * 
 * Single header component that handles both Classic and Pro Mode.
 * Uses progressive disclosure - Pro features appear when proMode is enabled.
 * 
 * **Progressive Enhancement Pattern:**
 * - Base UI structure is the same for both modes
 * - Pro features conditionally appear when enabled
 * - No jarring UI changes when switching modes
 * - Smooth transitions between feature sets
 * 
 * **Classic Mode:**
 * - Simple header with chat title
 * - Mode toggle (to enable Pro features)
 * - Navigation menu
 * 
 * **Pro Mode (when enabled):**
 * - All Classic features, plus:
 * - Image library management (count, add, manage)
 * - Credits display
 * - Guide controls (admin only)
 * - Enhanced navigation menu
 * - Settings access
 */
export default function MayaHeaderUnified({
  proMode,
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
  showModeToggle = true, // Default to true for backward compatibility
  selectedGuideId = null,
  selectedGuideCategory = null,
  onGuideChange,
  userId,
  onNavigation,
  onNewProject,
  onHistory,
  onLogout,
  isLoggingOut = false,
  onOpenCredits,
  activeTab,
  onTabChange,
  photosCount,
  videosCount,
  disableFeedTab = false,
}: MayaHeaderUnifiedProps) {
  const [isGuideMenuOpen, setIsGuideMenuOpen] = useState(false)
  const [isDotsMenuOpen, setIsDotsMenuOpen] = useState(false)
  const dotsMenuRef = useRef<HTMLDivElement>(null)
  const [guides, setGuides] = useState<Guide[]>([])
  const [isLoadingGuides, setIsLoadingGuides] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const guidePanelRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()
  const formattedCredits = Number.isFinite(credits) ? Math.round(credits).toLocaleString() : "0"
  const compactCredits = Number.isFinite(credits)
    ? new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(Math.round(credits))
    : "0"
  const hasLibraryActions = Boolean(onManageLibrary || onAddImages || onEditIntent || onStartFresh)

  useEffect(() => {
    setIsMounted(true)
    if (proMode && isAdmin && userId) {
      loadGuides()
    }
  }, [proMode, isAdmin, userId])

  const loadGuides = async () => {
    if (!userId) return
    setIsLoadingGuides(true)
    try {
      const response = await fetch("/api/admin/prompt-guides/list")
      if (response.ok) {
        const data = await response.json()
        setGuides(data.guides || [])
      }
    } catch (error) {
      console.error("Error loading guides:", error)
      toast({
        title: "Failed to load guides",
        variant: "destructive",
      })
    } finally {
      setIsLoadingGuides(false)
    }
  }

  const handleCreateNewGuide = async () => {
    const title = prompt("Enter guide title:")
    if (!title) return

    const category = prompt("Enter category (e.g., Luxury, Wellness, Fashion):")
    if (!category) return

    try {
      const response = await fetch("/api/admin/prompt-guides/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          title, 
          category,
          description: ""
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setGuides([...guides, data.guide])
        if (onGuideChange) {
          onGuideChange(data.guide.id, data.guide.category)
        }
        toast({ title: "Guide created!" })
      }
    } catch (error) {
      toast({ title: "Failed to create guide", variant: "destructive" })
    }
  }

  const handlePreviewGuide = () => {
    if (!selectedGuideId) return
    const guide = guides.find(g => g.id === selectedGuideId)
    if (!guide) return

    if (guide.page_slug) {
      window.open(`/prompt-guides/${guide.page_slug}`, "_blank")
    } else {
      window.open(`/admin/prompt-guide-builder?guideId=${guide.id}`, "_blank")
    }
  }

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        // Only close if it's not the toggle button
        const target = event.target as HTMLElement
        if (!target.closest('[data-menu-trigger]')) {
          // onToggleNavMenu will be called by the button itself, so don't close here
        }
      }
    }

    const handleGuidePanelClickOutside = (event: MouseEvent) => {
      if (guidePanelRef.current && !guidePanelRef.current.contains(event.target as Node)) {
        const target = event.target as HTMLElement
        if (!target.closest('[data-guide-trigger]')) {
          setIsGuideMenuOpen(false)
        }
      }
    }

    const handleDotsMenuClickOutside = (event: MouseEvent) => {
      if (dotsMenuRef.current && !dotsMenuRef.current.contains(event.target as Node)) {
        const target = event.target as HTMLElement
        if (!target.closest('[data-dots-trigger]')) {
          setIsDotsMenuOpen(false)
        }
      }
    }

    if (showNavMenu) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    if (isGuideMenuOpen) {
      document.addEventListener("mousedown", handleGuidePanelClickOutside)
    }
    if (isDotsMenuOpen) {
      document.addEventListener("mousedown", handleDotsMenuClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("mousedown", handleGuidePanelClickOutside)
      document.removeEventListener("mousedown", handleDotsMenuClickOutside)
    }
  }, [showNavMenu, isGuideMenuOpen, isDotsMenuOpen])

  // Unified header styling - same for both modes
  // Mobile optimized: proper touch targets, safe area insets, responsive spacing
  // Note: border-b removed since tabs section will have its own border
  const headerClassName = "flex items-center justify-between w-full px-3 sm:px-6 md:px-12 py-4 sm:py-5 bg-transparent relative z-[100]"

  return (
    <>
      <div
        className={headerClassName}
      >
        {/* Left: Maya title */}
        <div className="flex items-center shrink-0 min-h-[44px]">
          <h1
            className="text-[28px] sm:text-[32px] uppercase text-[#ffffff]"
            style={{
              fontFamily: "var(--font-display, 'Cormorant Garamond')",
              fontWeight: 300,
              letterSpacing: "-0.01em",
              lineHeight: 1,
            }}
          >
            MAYA
          </h1>
        </div>

        {/* Right: Credits and Mode Toggle - Simple, clean layout */}
        <div className="flex min-w-0 items-center justify-end gap-1.5 sm:gap-3 md:gap-4 relative">
          {/* Pro Mode: Guide Controls Dropdown (Admin only) */}
          {/* Use suppressHydrationWarning to prevent mismatch from isMounted check */}
          <div suppressHydrationWarning>
            {isMounted && proMode && isAdmin && (
              <>
                <button
                  data-guide-trigger
                  onClick={() => setIsGuideMenuOpen((prev) => !prev)}
                  className="touch-manipulation active:scale-95 flex items-center gap-2 px-3 py-2 rounded-full transition-colors border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.06)] min-h-[36px]"
                  style={{
                    fontFamily: "var(--font-body, Inter)",
                    fontSize: "11px",
                    fontWeight: 500,
                    color: "#e5e5e5",
                    textTransform: "uppercase",
                    letterSpacing: "0.2em",
                  }}
                >
                  <span className="hidden sm:inline">
                    {selectedGuideId
                      ? guides.find(g => g.id === selectedGuideId)?.title || 'Guide'
                      : 'Guide'}
                  </span>
                  <span className="sm:hidden">Guide</span>
                  <span>{isGuideMenuOpen ? "Close" : "Open"}</span>
                </button>

                {isGuideMenuOpen && (
                  <div
                    ref={guidePanelRef}
                    className="absolute right-0 top-[calc(100%+8px)] w-[300px] rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(10,10,10,0.86)] backdrop-blur-[20px] p-4 z-[210] shadow-[0_20px_40px_rgba(0,0,0,0.35)]"
                  >
                    <div className="space-y-3">
                      <div>
                        <label
                          className="block mb-2 text-[#e5e5e5]"
                          style={{
                            fontFamily: "var(--font-body, Inter)",
                            fontSize: "10px",
                            fontWeight: 500,
                            textTransform: "uppercase",
                            letterSpacing: "0.5em",
                          }}
                        >
                          Active Guide
                        </label>
                        <select
                          value={selectedGuideId?.toString() || "none"}
                          onChange={(event) => {
                            if (!onGuideChange) return
                            const value = event.target.value
                            if (value === "none") {
                              onGuideChange(null, null)
                              return
                            }
                            const guide = guides.find(g => g.id.toString() === value)
                            if (guide) {
                              onGuideChange(guide.id, guide.category)
                            }
                          }}
                          className="w-full h-10 px-3 rounded-lg border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.04)] text-[#ffffff] text-sm focus:outline-none focus:ring-1 focus:ring-[rgba(255,255,255,0.2)]"
                        >
                          <option value="none">No guide selected</option>
                          {guides.map((guide) => (
                            <option key={guide.id} value={guide.id.toString()}>
                              {guide.title} ({guide.category})
                            </option>
                          ))}
                        </select>
                      </div>

                      {selectedGuideId && (
                        <div className="text-xs text-[#e5e5e5] pt-2 border-t border-[rgba(255,255,255,0.08)]">
                          Prompts save to{" "}
                          <span className="font-semibold text-[#ffffff]">
                            {guides.find(g => g.id === selectedGuideId)?.title}
                          </span>
                        </div>
                      )}

                      <div className="flex gap-2 pt-2 border-t border-[rgba(255,255,255,0.08)]">
                        <button
                          onClick={handleCreateNewGuide}
                          className="flex-1 h-9 rounded-lg border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.04)] text-[#ffffff] hover:bg-[rgba(255,255,255,0.06)] transition-colors text-[11px] uppercase tracking-[0.2em] font-medium"
                        >
                          New
                        </button>
                        {selectedGuideId && (
                          <button
                            onClick={handlePreviewGuide}
                            className="flex-1 h-9 rounded-lg border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.04)] text-[#ffffff] hover:bg-[rgba(255,255,255,0.06)] transition-colors text-[11px] uppercase tracking-[0.2em] font-medium"
                          >
                            Preview
                          </button>
                        )}
                      </div>
                      {isLoadingGuides && (
                        <p className="text-[11px] text-[#e5e5e5]/80 uppercase tracking-[0.2em]">Loading guides</p>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Credits Display - Always show when available */}
          {credits !== undefined && (
            <button
              type="button"
              onClick={() => onOpenCredits?.()}
              className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.06)] min-h-[36px] sm:min-h-[40px] shrink-0 hover:bg-[rgba(255,255,255,0.12)] transition-colors"
              aria-label="Open credits and top-up options"
            >
              <span className="hidden sm:inline text-[10px] md:text-xs font-light text-[#e5e5e5] uppercase tracking-wider">
                Credits
              </span>
              <span className="sm:hidden text-[11px] font-semibold text-[#ffffff] tabular-nums">
                {compactCredits}
              </span>
              <span className="hidden sm:inline text-xs sm:text-sm md:text-base font-semibold text-[#ffffff] tabular-nums">
                {formattedCredits}
              </span>
              <span className="text-[10px] sm:text-xs font-medium text-white/80 uppercase tracking-[0.14em]">+</span>
            </button>
          )}

          {/* Mode Toggle - Show only for membership users (segmented control showing both options)
              Progressive enhancement: Same component, different state based on current mode */}
          {showModeToggle && (
            proMode ? (
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
                variant="compact"
              />
            )
          )}

          {/* Dots Menu Button */}
          {(onSettings || onNewProject || onHistory || onNavigation) && (
            <div className="relative hidden sm:block" ref={dotsMenuRef}>
              <button
                onClick={() => setIsDotsMenuOpen(prev => !prev)}
                data-dots-trigger
                className="touch-manipulation active:scale-95 flex items-center justify-center"
                style={{
                  width: '44px', height: '44px', minWidth: '44px', minHeight: '44px',
                  borderRadius: '12px',
                  border: '1px solid #e5e5e5',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                }}
                aria-label="More options"
              >
                <span style={{ fontSize: "18px", fontWeight: 500, color: "#ffffff", letterSpacing: "0.05em" }}>···</span>
              </button>

              {isDotsMenuOpen && (
                <div
                  className="absolute right-0 z-[200] animate-in fade-in slide-in-from-top-2 duration-150"
                  style={{
                    top: 'calc(100% + 8px)', width: '200px',
                    backgroundColor: "rgba(10,10,10,0.96)", border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: '16px', padding: '8px',
                    boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
                  }}
                >
                  {onSettings && (
                    <button onClick={() => { onSettings(); setIsDotsMenuOpen(false) }}
                      className="w-full text-left px-4 py-3 rounded-xl hover:bg-white/10 transition-colors touch-manipulation"
                      style={{ fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 300, color: "#ffffff" }}>
                      Settings
                    </button>
                  )}
                  {onNewProject && (
                    <button onClick={() => { onNewProject(); setIsDotsMenuOpen(false) }}
                      className="w-full text-left px-4 py-3 rounded-xl hover:bg-white/10 transition-colors touch-manipulation"
                      style={{ fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 300, color: "#ffffff" }}>
                      New Project
                    </button>
                  )}
                  {onHistory && (
                    <button onClick={() => { onHistory(); setIsDotsMenuOpen(false) }}
                      className="w-full text-left px-4 py-3 rounded-xl hover:bg-white/10 transition-colors touch-manipulation"
                      style={{ fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 300, color: "#ffffff" }}>
                      History
                    </button>
                  )}
                  {onNavigation && (
                    <button onClick={() => { onNavigation('prompts'); setIsDotsMenuOpen(false) }}
                      className="w-full text-left px-4 py-3 rounded-xl hover:bg-white/10 transition-colors touch-manipulation"
                      style={{ fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 300, color: "#ffffff" }}>
                      Prompts Library
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Menu Button */}
          {onNavigation ? (
            // Pro Mode: 3 dots menu button
            <button
              onClick={onToggleNavMenu}
              data-menu-trigger
              className="touch-manipulation active:scale-95 flex items-center justify-center shrink-0 min-w-[44px] min-h-[44px] rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.06)] px-2.5 sm:px-4"
              style={proMode ? {
                minHeight: '44px',
                borderRadius: BorderRadius.buttonSm,
                border: `1px solid rgba(255,255,255,0.08)`,
                backgroundColor: 'rgba(255,255,255,0.04)',
                color: '#ffffff',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              } : {}}
              onMouseEnter={proMode ? (e) => {
                e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.06)"
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"
              } : undefined}
              onMouseLeave={proMode ? (e) => {
                e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.04)"
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"
              } : undefined}
              aria-label="Navigation menu"
              aria-expanded={showNavMenu}
            >
              <span className="sm:hidden text-base leading-none text-[#ffffff]">≡</span>
              <span className="hidden sm:inline text-[10px] sm:text-xs uppercase tracking-[0.3em] font-medium text-[#ffffff]">Menu</span>
            </button>
          ) : (
            // Classic Mode: Simple menu button (fallback)
            <button
              onClick={onToggleNavMenu}
              data-menu-trigger
              className="flex items-center justify-center px-2.5 sm:px-4 min-h-[44px] sm:min-h-[48px] rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.06)] transition-colors touch-manipulation active:scale-95"
              aria-label="Navigation menu"
              aria-expanded={showNavMenu}
            >
              <span className="sm:hidden text-base leading-none text-[#ffffff]">≡</span>
              <span className="hidden sm:inline text-[10px] sm:text-xs md:text-sm tracking-[0.2em] text-[#ffffff] uppercase">Menu</span>
            </button>
          )}
        </div>
      </div>

      {/* Tab Switcher - Integrated into header */}
      {activeTab && onTabChange && (
        <div className="w-full border-t border-[rgba(255,255,255,0.06)] bg-transparent z-[100] relative">
          <div className="px-3 sm:px-4 md:px-6 py-1.5 flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <MayaTabSwitcher
                activeTab={activeTab}
                onTabChange={onTabChange}
                photosCount={photosCount}
                videosCount={videosCount}
                disableFeedTab={disableFeedTab}
                className="max-w-full"
              />
            </div>
            {(onHistory || onNewProject) && (
              <div className="shrink-0 flex items-center gap-1.5">
                {onHistory && (
                  <button
                    onClick={onHistory}
                    className="touch-manipulation active:scale-95 min-h-[34px] px-3 rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.09)] transition-colors"
                    style={{
                      fontFamily: "var(--font-body, Inter)",
                      fontSize: "10px",
                      fontWeight: 500,
                      textTransform: "uppercase",
                      letterSpacing: "0.18em",
                      color: "#e5e5e5",
                    }}
                    aria-label="Open chat history"
                  >
                    History
                  </button>
                )}
                {onNewProject && (
                  <button
                    onClick={onNewProject}
                    className="touch-manipulation active:scale-95 min-h-[34px] px-3 rounded-lg border border-[rgba(255,255,255,0.16)] bg-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.16)] transition-colors"
                    style={{
                      fontFamily: "var(--font-body, Inter)",
                      fontSize: "10px",
                      fontWeight: 500,
                      textTransform: "uppercase",
                      letterSpacing: "0.18em",
                      color: "#ffffff",
                    }}
                    aria-label="Start a new chat"
                  >
                    New Chat
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Navigation Menu Slide-in (shared between both modes) */}
      {showNavMenu && onNavigation && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-stone-950/20 backdrop-blur-sm z-[90] animate-in fade-in duration-200"
            onClick={() => onToggleNavMenu()}
            style={{
              height: '100vh',
            }}
          />

          {/* Sliding menu from right */}
          <div
            ref={menuRef}
            className="fixed top-0 right-0 bottom-0 w-80 bg-[rgba(10,10,10,0.92)] backdrop-blur-[20px] border-l border-[rgba(255,255,255,0.08)] shadow-2xl z-[100] animate-in slide-in-from-right duration-300 flex flex-col"
            style={{
              borderColor: "rgba(255,255,255,0.08)",
              height: '100vh',
              maxHeight: '100vh',
            }}
          >
            {/* Header with close button */}
            <div
                className="shrink-0 flex items-center justify-between px-6 py-4 border-b"
                style={{
                borderColor: "rgba(255,255,255,0.08)",
                }}
            >
              <h3
                style={proMode ? {
                  fontFamily: Typography.subheaders.fontFamily,
                  fontSize: Typography.subheaders.sizes.md,
                  fontWeight: Typography.subheaders.weights.regular,
                  color: Colors.textPrimary,
                  letterSpacing: Typography.subheaders.letterSpacing,
                } : {
                  fontFamily: 'inherit',
                }}
                className={!proMode ? "text-sm font-serif font-extralight tracking-[0.2em] uppercase text-[#ffffff]" : ""}
              >
                Menu
              </h3>
              <button
                onClick={() => onToggleNavMenu()}
                className="touch-manipulation active:scale-95 min-w-[44px] h-11 flex items-center justify-center px-3 rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.06)] transition-colors"
                aria-label="Close menu"
              >
                <span className="text-[10px] uppercase tracking-[0.2em] text-[#ffffff]">Close</span>
              </button>
            </div>

            {/* Credits display */}
            {(credits !== undefined) && (
              <div
                className="shrink-0 px-6 py-6 border-b"
                style={{
                  borderColor: "rgba(255,255,255,0.08)",
                }}
              >
                {proMode ? (
                  <>
                    <div
                      style={{
                        fontFamily: Typography.ui.fontFamily,
                        fontSize: Typography.ui.sizes.xs,
                        fontWeight: Typography.ui.weights.regular,
                        color: "#e5e5e5",
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        marginBottom: '8px',
                      }}
                    >
                      Your Credits
                    </div>
                    <div
                      style={{
                        fontFamily: Typography.data.fontFamily,
                        fontSize: '28px',
                        fontWeight: Typography.data.weights.semibold,
                        color: "#ffffff",
                      }}
                    >
                      {formattedCredits}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-[10px] tracking-[0.15em] uppercase font-light text-[#e5e5e5] mb-2">Your Credits</div>
                    <div className="text-3xl font-serif font-extralight text-[#ffffff] tabular-nums">
                      {formattedCredits}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Scrollable content area */}
            <div className="flex-1 overflow-y-auto min-h-0" style={{ WebkitOverflowScrolling: 'touch' }}>
              <div className="py-2">
                {/* Navigation links */}
                <button
                  onClick={() => {
                    onNavigation("studio")
                    onToggleNavMenu()
                  }}
                  className="touch-manipulation active:scale-[0.98] w-full text-left px-6 py-4 transition-colors hover:bg-[rgba(255,255,255,0.06)]"
                  style={proMode ? {
                    fontFamily: Typography.ui.fontFamily,
                    fontSize: Typography.ui.sizes.md,
                    fontWeight: Typography.ui.weights.medium,
                    color: "#ffffff",
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                  } : {}}
                >
                  Studio
                </button>
                <button
                  onClick={() => {
                    if (onTabChange) {
                      onTabChange("training")
                    } else {
                      window.dispatchEvent(new CustomEvent("open-onboarding"))
                    }
                    onToggleNavMenu()
                  }}
                  className="touch-manipulation active:scale-[0.98] w-full text-left px-6 py-4 transition-colors hover:bg-[rgba(255,255,255,0.06)]"
                  style={proMode ? {
                    fontFamily: Typography.ui.fontFamily,
                    fontSize: Typography.ui.sizes.md,
                    fontWeight: Typography.ui.weights.medium,
                    color: "#ffffff",
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                  } : {}}
                >
                  Training
                </button>
                <button
                  onClick={() => {
                    onNavigation("maya")
                    onToggleNavMenu()
                  }}
                  className="touch-manipulation active:scale-[0.98] w-full text-left px-6 py-4 transition-colors bg-[rgba(255,255,255,0.06)] border-l-2"
                  style={proMode ? {
                    fontFamily: Typography.ui.fontFamily,
                    fontSize: Typography.ui.sizes.md,
                    fontWeight: Typography.ui.weights.medium,
                    color: "#ffffff",
                    borderColor: "#ffffff",
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                  } : {
                    borderColor: '#ffffff',
                  }}
                >
                  Maya
                </button>
                <button
                  onClick={() => {
                    onNavigation("gallery")
                    onToggleNavMenu()
                  }}
                  className="touch-manipulation active:scale-[0.98] w-full text-left px-6 py-4 transition-colors hover:bg-[rgba(255,255,255,0.06)]"
                  style={proMode ? {
                    fontFamily: Typography.ui.fontFamily,
                    fontSize: Typography.ui.sizes.md,
                    fontWeight: Typography.ui.weights.medium,
                    color: "#ffffff",
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                  } : {}}
                >
                  Gallery
                </button>
                <button
                  onClick={() => {
                    onNavigation("academy")
                    onToggleNavMenu()
                  }}
                  className="touch-manipulation active:scale-[0.98] w-full text-left px-6 py-4 transition-colors hover:bg-[rgba(255,255,255,0.06)]"
                  style={proMode ? {
                    fontFamily: Typography.ui.fontFamily,
                    fontSize: Typography.ui.sizes.md,
                    fontWeight: Typography.ui.weights.medium,
                    color: "#ffffff",
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                  } : {}}
                >
                  Academy
                </button>
                <button
                  onClick={() => {
                    onNavigation("account")
                    onToggleNavMenu()
                  }}
                  className="touch-manipulation active:scale-[0.98] w-full text-left px-6 py-4 transition-colors hover:bg-[rgba(255,255,255,0.06)]"
                  style={proMode ? {
                    fontFamily: Typography.ui.fontFamily,
                    fontSize: Typography.ui.sizes.md,
                    fontWeight: Typography.ui.weights.medium,
                    color: "#ffffff",
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                  } : {}}
                >
                  Account
                </button>

                {(onHistory || onNewProject) && (
                  <>
                    <div
                      className="border-t my-2"
                      style={{
                        borderColor: "rgba(255,255,255,0.08)",
                      }}
                    />
                    {onHistory && (
                      <button
                        onClick={() => {
                          onHistory()
                          onToggleNavMenu()
                        }}
                        className="touch-manipulation active:scale-[0.98] w-full text-left px-6 py-4 transition-colors hover:bg-[rgba(255,255,255,0.06)]"
                        style={proMode ? {
                          fontFamily: Typography.ui.fontFamily,
                          fontSize: Typography.ui.sizes.md,
                          fontWeight: Typography.ui.weights.medium,
                          color: "#ffffff",
                          textTransform: "uppercase",
                          letterSpacing: "0.12em",
                        } : {}}
                      >
                        History
                      </button>
                    )}
                    {onNewProject && (
                      <button
                        onClick={() => {
                          onNewProject()
                          onToggleNavMenu()
                        }}
                        className="touch-manipulation active:scale-[0.98] w-full text-left px-6 py-4 transition-colors hover:bg-[rgba(255,255,255,0.06)]"
                        style={proMode ? {
                          fontFamily: Typography.ui.fontFamily,
                          fontSize: Typography.ui.sizes.md,
                          fontWeight: Typography.ui.weights.medium,
                          color: "#ffffff",
                          textTransform: "uppercase",
                          letterSpacing: "0.12em",
                        } : {}}
                      >
                        New Chat
                      </button>
                    )}
                  </>
                )}

                {/* Pro Mode: Generation Settings */}
                {proMode && onSettings && (
                  <button
                    onClick={() => {
                      onSettings()
                      onToggleNavMenu()
                    }}
                    className="touch-manipulation active:scale-[0.98] w-full text-left px-6 py-4 transition-colors hover:bg-[rgba(255,255,255,0.06)]"
                    style={{
                      fontFamily: Typography.ui.fontFamily,
                      fontSize: Typography.ui.sizes.md,
                      fontWeight: Typography.ui.weights.medium,
                      color: "#ffffff",
                      textTransform: "uppercase",
                      letterSpacing: "0.12em",
                    }}
                  >
                    Settings
                  </button>
                )}

                {/* Switch Mode - SELFIE mode shows "Switch to MY MODEL" in menu on mobile (membership only) */}
                {showModeToggle && proMode && onSwitchToClassic && (
                  <>
                    <div
                      className="border-t my-2"
                      style={{
                        borderColor: Colors.border,
                      }}
                    />
                    <button
                      onClick={() => {
                        onSwitchToClassic()
                        onToggleNavMenu()
                      }}
                      className="touch-manipulation active:scale-[0.98] w-full text-left px-6 py-4 transition-colors hover:bg-[rgba(255,255,255,0.06)]"
                      style={{
                        fontFamily: Typography.ui.fontFamily,
                        fontSize: Typography.ui.sizes.md,
                        fontWeight: Typography.ui.weights.medium,
                        color: "#e5e5e5",
                        textTransform: "uppercase",
                        letterSpacing: "0.12em",
                      }}
                    >
                      Switch to MY MODEL
                    </button>
                  </>
                )}

                {/* Pro Mode: Manage Library section (if available) */}
                {proMode && libraryCount > 0 && hasLibraryActions && (
                  <>
                    <div
                      className="border-t my-2"
                      style={{
                        borderColor: "rgba(255,255,255,0.08)",
                      }}
                    />
                    <div className="px-6 py-4">
                      <div
                        style={{
                          fontFamily: Typography.ui.fontFamily,
                          fontSize: Typography.ui.sizes.sm,
                          fontWeight: Typography.ui.weights.medium,
                          color: "#e5e5e5",
                          textTransform: 'uppercase',
                          letterSpacing: '0.2em',
                          marginBottom: '12px',
                        }}
                      >
                        Library
                      </div>
                      <div className="space-y-2">
                        {onManageLibrary && (
                          <button
                            onClick={() => {
                              onManageLibrary()
                              onToggleNavMenu()
                            }}
                            className="touch-manipulation active:scale-[0.98] w-full text-left px-4 py-2 rounded transition-colors hover:bg-[rgba(255,255,255,0.06)]"
                            style={{
                              fontFamily: Typography.ui.fontFamily,
                              fontSize: Typography.ui.sizes.sm,
                              fontWeight: Typography.ui.weights.regular,
                              color: "#ffffff",
                            }}
                          >
                            {ButtonLabels.openLibrary}
                          </button>
                        )}
                        {onAddImages && (
                          <button
                            onClick={() => {
                              onAddImages()
                              onToggleNavMenu()
                            }}
                            className="touch-manipulation active:scale-[0.98] w-full text-left px-4 py-2 rounded transition-colors hover:bg-[rgba(255,255,255,0.06)]"
                            style={{
                              fontFamily: Typography.ui.fontFamily,
                              fontSize: Typography.ui.sizes.sm,
                              fontWeight: Typography.ui.weights.regular,
                              color: "#ffffff",
                            }}
                          >
                            {ButtonLabels.addImages}
                          </button>
                        )}
                        {onEditIntent && (
                          <button
                            onClick={() => {
                              onEditIntent()
                              onToggleNavMenu()
                            }}
                            className="touch-manipulation active:scale-[0.98] w-full text-left px-4 py-2 rounded transition-colors hover:bg-[rgba(255,255,255,0.06)]"
                            style={{
                              fontFamily: Typography.ui.fontFamily,
                              fontSize: Typography.ui.sizes.sm,
                              fontWeight: Typography.ui.weights.regular,
                              color: "#ffffff",
                            }}
                          >
                            {ButtonLabels.editIntent}
                          </button>
                        )}
                        {onStartFresh && (
                          <button
                            onClick={() => {
                              onStartFresh()
                              onToggleNavMenu()
                            }}
                            className="touch-manipulation active:scale-[0.98] w-full text-left px-4 py-2 rounded transition-colors hover:bg-[rgba(255,255,255,0.06)]"
                            style={{
                              fontFamily: Typography.ui.fontFamily,
                              fontSize: Typography.ui.sizes.sm,
                              fontWeight: Typography.ui.weights.regular,
                              color: "#e5e5e5",
                            }}
                          >
                            {ButtonLabels.startFresh}
                          </button>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Sign out button - fixed at bottom */}
            {onLogout && (
              <div
                className="shrink-0 px-6 py-4 border-t bg-white/95"
                style={{
                  borderColor: "rgba(255,255,255,0.08)",
                  backgroundColor: "rgba(10,10,10,0.92)",
                }}
              >
                <button
                  onClick={() => {
                    onLogout()
                    onToggleNavMenu()
                  }}
                  disabled={isLoggingOut}
                  className="touch-manipulation active:scale-95 disabled:active:scale-100 w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    fontFamily: Typography.ui.fontFamily,
                    fontSize: Typography.ui.sizes.sm,
                    fontWeight: Typography.ui.weights.medium,
                    color: '#ffffff',
                    textTransform: "uppercase",
                    letterSpacing: "0.2em",
                    backgroundColor: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.12)',
                  }}
                  onMouseEnter={(e) => {
                    if (!isLoggingOut) {
                      e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isLoggingOut) {
                      e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)'
                    }
                  }}
                >
                  <span>{isLoggingOut ? "Signing Out" : "Sign Out"}</span>
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </>
  )
}
