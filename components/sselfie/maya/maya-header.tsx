"use client"

import { useState, useEffect, useRef } from 'react'
import type React from "react"
import { Typography, Colors, BorderRadius, ButtonLabels } from '@/lib/maya/pro/design-system'
import { useToast } from '@/hooks/use-toast'
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
  /** Classic → Pro; mode control is on the chat input bar — kept optional for older call sites. */
  onModeSwitch?: (enable: boolean) => void
  
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
  activeTab?: "photos" | "plan" | "videos" | "prompts" | "training" | "feed"
  onTabChange?: (tab: "photos" | "plan" | "videos" | "prompts" | "training" | "feed") => void
  photosCount?: number
  videosCount?: number
  disableFeedTab?: boolean
  
  // Access Control
  showModeToggle?: boolean // Show Selfie/My Model toggle
  /** When true, ≡ is rendered in StudioAppTopBar instead of this header */
  hideMenuButton?: boolean
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
  hideMenuButton = false,
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

  // Single chrome row: Photos/Videos/Train (scroll) + quick menus (credits / mode / new chat live under the composer)
  const barClassName =
    "flex w-full items-center gap-2 px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 bg-[color:var(--app-glass-bg)] backdrop-blur-[16px] border-b border-[color:var(--app-glass-border)] relative z-[100]"
  const actionsClusterClass =
    activeTab && onTabChange
      ? "flex shrink-0 items-center gap-1 sm:gap-1.5 md:gap-2 relative"
      : "flex min-w-0 w-full items-center justify-end gap-1.5 sm:gap-3 md:gap-4 relative"

  return (
    <>
      <div className={barClassName}>
        {activeTab && onTabChange && (
          <div
            className="min-w-0 flex-1 overflow-x-auto py-0.5"
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              WebkitOverflowScrolling: "touch",
            }}
          >
            <MayaTabSwitcher
              activeTab={activeTab}
              onTabChange={onTabChange}
              photosCount={photosCount}
              videosCount={videosCount}
              disableFeedTab={disableFeedTab}
              className="max-w-full"
            />
          </div>
        )}

        <div className={actionsClusterClass}>
          {/* Pro Mode: Guide Controls Dropdown (Admin only) */}
          {/* Use suppressHydrationWarning to prevent mismatch from isMounted check */}
          <div suppressHydrationWarning>
            {isMounted && proMode && isAdmin && (
              <>
                <button
                  data-guide-trigger
                  onClick={() => setIsGuideMenuOpen((prev) => !prev)}
                  className="touch-manipulation active:scale-95 flex items-center gap-2 px-3 py-2 rounded-full transition-colors border border-[color:var(--glass-input-border)] bg-transparent hover:bg-[color:var(--glass-bg-mid)] min-h-[36px]"
                  style={{
                    fontFamily: "var(--font-body, Inter)",
                    fontSize: "11px",
                    fontWeight: 500,
                    color: "var(--color-smoke)",
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
                    className="absolute right-0 top-[calc(100%+8px)] w-[300px] rounded-2xl border border-[color:var(--glass-input-border)] bg-[color:var(--app-overlay)] backdrop-blur-[20px] p-4 z-[210] shadow-[var(--app-shadow-soft)]"
                  >
                    <div className="space-y-3">
                      <div>
                        <label
                          className="block mb-2 text-[color:var(--color-smoke)]"
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
                          className="w-full h-10 px-3 rounded-lg border border-[color:var(--glass-border)] bg-[color:var(--glass-input-bg)] text-[color:var(--color-porcelain)] text-sm focus:outline-none focus:ring-1 focus:ring-[var(--app-focus-ring)]"
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
                        <div className="text-xs text-[color:var(--color-smoke)] pt-2 border-t border-[color:var(--glass-border-subtle)]">
                          Prompts save to{" "}
                          <span className="font-semibold text-[color:var(--color-porcelain)]">
                            {guides.find(g => g.id === selectedGuideId)?.title}
                          </span>
                        </div>
                      )}

                      <div className="flex gap-2 pt-2 border-t border-[color:var(--glass-border-subtle)]">
                        <button
                          onClick={handleCreateNewGuide}
                          className="flex-1 h-9 rounded-lg border border-[color:var(--glass-border)] bg-[color:var(--glass-input-bg)] text-[color:var(--color-porcelain)] hover:bg-[color:var(--glass-bg-mid)] transition-colors text-[11px] uppercase tracking-[0.2em] font-medium"
                        >
                          New
                        </button>
                        {selectedGuideId && (
                          <button
                            onClick={handlePreviewGuide}
                            className="flex-1 h-9 rounded-lg border border-[color:var(--glass-border)] bg-[color:var(--glass-input-bg)] text-[color:var(--color-porcelain)] hover:bg-[color:var(--glass-bg-mid)] transition-colors text-[11px] uppercase tracking-[0.2em] font-medium"
                          >
                            Preview
                          </button>
                        )}
                      </div>
                      {isLoadingGuides && (
                        <p className="text-[11px] text-[color:var(--color-smoke)] uppercase tracking-[0.2em]">Loading guides</p>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Dots Menu Button — desktop quick actions (History, etc.) */}
          {(onSettings || onHistory || onNavigation) && (
            <div className="relative hidden sm:block" ref={dotsMenuRef}>
              <button
                onClick={() => setIsDotsMenuOpen(prev => !prev)}
                data-dots-trigger
                className="touch-manipulation active:scale-95 flex items-center justify-center"
                style={{
                  width: '44px', height: '44px', minWidth: '44px', minHeight: '44px',
                  borderRadius: '12px',
                  border: '1px solid var(--glass-border)',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                }}
                aria-label="More options"
              >
                <span style={{ fontSize: "18px", fontWeight: 500, color: "var(--color-smoke)", letterSpacing: "0.05em" }}>···</span>
              </button>

              {isDotsMenuOpen && (
                <div
                  className="absolute right-0 z-[200] animate-in fade-in slide-in-from-top-2 duration-150"
                  style={{
                    top: 'calc(100% + 8px)', width: '200px',
                    backgroundColor: "var(--app-overlay)", border: "1px solid var(--glass-input-border)",
                    borderRadius: '16px', padding: '8px',
                    boxShadow: "var(--app-shadow-soft)",
                  }}
                >
                  {onSettings && activeTab === "photos" && (
                    <button onClick={() => { onSettings(); setIsDotsMenuOpen(false) }}
                      className="w-full text-left px-4 py-3 rounded-xl hover:bg-[color:var(--glass-bg-mid)] transition-colors touch-manipulation"
                      style={{ fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 300, color: "var(--color-porcelain)" }}>
                      Photo generation
                    </button>
                  )}
                  {onHistory && (
                    <button onClick={() => { onHistory(); setIsDotsMenuOpen(false) }}
                      className="w-full text-left px-4 py-3 rounded-xl hover:bg-[color:var(--glass-bg-mid)] transition-colors touch-manipulation"
                      style={{ fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 300, color: "var(--color-porcelain)" }}>
                      History
                    </button>
                  )}
                  {onNavigation && (
                    <button onClick={() => { onNavigation('prompts'); setIsDotsMenuOpen(false) }}
                      className="w-full text-left px-4 py-3 rounded-xl hover:bg-[color:var(--glass-bg-mid)] transition-colors touch-manipulation"
                      style={{ fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 300, color: "var(--color-porcelain)" }}>
                      Prompts Library
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Menu Button — omitted when StudioAppTopBar owns ≡ */}
          {!hideMenuButton &&
            (onNavigation ? (
              <button
                onClick={onToggleNavMenu}
                data-menu-trigger
                className="touch-manipulation active:scale-95 flex items-center justify-center shrink-0 min-w-[44px] min-h-[44px] rounded-full border border-[color:var(--glass-input-border)] bg-transparent hover:bg-[color:var(--glass-bg-mid)] px-2.5 sm:px-4"
                style={proMode ? {
                  minHeight: '44px',
                  borderRadius: BorderRadius.buttonSm,
                  border: `1px solid var(--glass-input-border)`,
                  backgroundColor: 'transparent',
                  color: 'var(--color-smoke)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                } : {}}
                onMouseEnter={proMode ? (e) => {
                  e.currentTarget.style.backgroundColor = "var(--glass-bg-mid)"
                  e.currentTarget.style.borderColor = "var(--glass-border)"
                } : undefined}
                onMouseLeave={proMode ? (e) => {
                  e.currentTarget.style.backgroundColor = "transparent"
                  e.currentTarget.style.borderColor = "var(--glass-input-border)"
                } : undefined}
                aria-label="Navigation menu"
                aria-expanded={showNavMenu}
              >
                <span className="sm:hidden text-base leading-none text-[color:var(--color-smoke)]">≡</span>
                <span className="hidden sm:inline text-[10px] sm:text-xs uppercase tracking-[0.3em] font-medium text-[color:var(--color-smoke)]">Menu</span>
              </button>
            ) : (
              <button
                onClick={onToggleNavMenu}
                data-menu-trigger
                className="flex items-center justify-center px-2.5 sm:px-4 min-h-[44px] sm:min-h-[48px] rounded-full border border-[color:var(--glass-input-border)] bg-transparent hover:bg-[color:var(--glass-bg-mid)] transition-colors touch-manipulation active:scale-95"
                aria-label="Navigation menu"
                aria-expanded={showNavMenu}
              >
                <span className="sm:hidden text-base leading-none text-[color:var(--color-smoke)]">≡</span>
                <span className="hidden sm:inline text-[10px] sm:text-xs md:text-sm tracking-[0.2em] text-[color:var(--color-smoke)] uppercase">Menu</span>
              </button>
            ))}
        </div>
      </div>

      {/* Navigation Menu Slide-in (shared between both modes) */}
      {showNavMenu && onNavigation && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-stone-950/45 backdrop-blur-[20px] z-[90] animate-in fade-in duration-200"
            onClick={() => onToggleNavMenu()}
            style={{
              height: '100vh',
            }}
          />

          {/* Sliding menu from right */}
          <div
            ref={menuRef}
            className="fixed top-0 right-0 bottom-0 w-80 bg-[color:var(--app-overlay)] backdrop-blur-[20px] border-l border-[color:var(--glass-border-subtle)] shadow-2xl z-[100] animate-in slide-in-from-right duration-300 flex flex-col"
            style={{
              borderColor: "var(--glass-border-subtle)",
              height: '100vh',
              maxHeight: '100vh',
            }}
          >
            {/* Header with close button */}
            <div
                className="shrink-0 flex items-center justify-between px-6 py-4 border-b"
                style={{
                borderColor: "var(--glass-border-subtle)",
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
                className={!proMode ? "text-sm font-serif font-extralight tracking-[0.2em] uppercase text-[color:var(--color-porcelain)]" : ""}
              >
                Menu
              </h3>
              <button
                onClick={() => onToggleNavMenu()}
                className="touch-manipulation active:scale-95 min-w-[44px] h-11 flex items-center justify-center px-3 rounded-full border border-[color:var(--glass-input-border)] bg-transparent hover:bg-[color:var(--glass-bg-mid)] transition-colors"
                aria-label="Close menu"
              >
                <span className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-smoke)]">Close</span>
              </button>
            </div>

            {/* Credits display */}
            {(credits !== undefined) && (
              <div
                className="shrink-0 px-6 py-6 border-b"
                style={{
                  borderColor: "var(--glass-border-subtle)",
                }}
              >
                {proMode ? (
                  <>
                    <div
                      style={{
                        fontFamily: Typography.ui.fontFamily,
                        fontSize: Typography.ui.sizes.xs,
                        fontWeight: Typography.ui.weights.regular,
                        color: "var(--color-smoke)",
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
                        color: "var(--color-porcelain)",
                      }}
                    >
                      {formattedCredits}
                    </div>
                    {onOpenCredits && (
                      <button
                        type="button"
                        onClick={() => {
                          onOpenCredits()
                          onToggleNavMenu()
                        }}
                        className="mt-4 w-full rounded-lg border border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] py-2.5 text-[10px] font-medium uppercase tracking-[0.18em] text-[color:var(--color-porcelain)] hover:bg-[color:var(--glass-bg-heavy)] transition-colors touch-manipulation"
                      >
                        Get credits
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <div className="text-[10px] tracking-[0.15em] uppercase font-light text-[color:var(--color-smoke)] mb-2">Your Credits</div>
                    <div className="text-3xl font-serif font-extralight text-[color:var(--color-porcelain)] tabular-nums">
                      {formattedCredits}
                    </div>
                    {onOpenCredits && (
                      <button
                        type="button"
                        onClick={() => {
                          onOpenCredits()
                          onToggleNavMenu()
                        }}
                        className="mt-4 w-full rounded-lg border border-[color:var(--glass-border)] bg-[color:var(--glass-input-bg)] py-2.5 text-[10px] font-medium uppercase tracking-[0.18em] text-[color:var(--color-porcelain)] hover:bg-[color:var(--glass-bg-mid)] transition-colors touch-manipulation"
                      >
                        Get credits
                      </button>
                    )}
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
                  className="touch-manipulation active:scale-[0.98] w-full text-left px-6 py-4 transition-colors hover:bg-[color:var(--glass-bg)]"
                  style={proMode ? {
                    fontFamily: Typography.ui.fontFamily,
                    fontSize: Typography.ui.sizes.md,
                    fontWeight: Typography.ui.weights.medium,
                    color: "var(--color-porcelain)",
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
                  className="touch-manipulation active:scale-[0.98] w-full text-left px-6 py-4 transition-colors hover:bg-[color:var(--glass-bg)]"
                  style={proMode ? {
                    fontFamily: Typography.ui.fontFamily,
                    fontSize: Typography.ui.sizes.md,
                    fontWeight: Typography.ui.weights.medium,
                    color: "var(--color-porcelain)",
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
                  className="touch-manipulation active:scale-[0.98] w-full text-left px-6 py-4 transition-colors bg-[color:var(--glass-bg)] border-l-2"
                  style={proMode ? {
                    fontFamily: Typography.ui.fontFamily,
                    fontSize: Typography.ui.sizes.md,
                    fontWeight: Typography.ui.weights.medium,
                    color: "var(--color-porcelain)",
                    borderColor: "var(--stone)",
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                  } : {
                    borderColor: 'var(--stone)',
                  }}
                >
                  Maya
                </button>
                <button
                  onClick={() => {
                    onNavigation("gallery")
                    onToggleNavMenu()
                  }}
                  className="touch-manipulation active:scale-[0.98] w-full text-left px-6 py-4 transition-colors hover:bg-[color:var(--glass-bg)]"
                  style={proMode ? {
                    fontFamily: Typography.ui.fontFamily,
                    fontSize: Typography.ui.sizes.md,
                    fontWeight: Typography.ui.weights.medium,
                    color: "var(--color-porcelain)",
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
                  className="touch-manipulation active:scale-[0.98] w-full text-left px-6 py-4 transition-colors hover:bg-[color:var(--glass-bg)]"
                  style={proMode ? {
                    fontFamily: Typography.ui.fontFamily,
                    fontSize: Typography.ui.sizes.md,
                    fontWeight: Typography.ui.weights.medium,
                    color: "var(--color-porcelain)",
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
                  className="touch-manipulation active:scale-[0.98] w-full text-left px-6 py-4 transition-colors hover:bg-[color:var(--glass-bg)]"
                  style={proMode ? {
                    fontFamily: Typography.ui.fontFamily,
                    fontSize: Typography.ui.sizes.md,
                    fontWeight: Typography.ui.weights.medium,
                    color: "var(--color-porcelain)",
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                  } : {}}
                >
                  Account
                </button>

                {(onHistory ||
                  (onNewProject && !(activeTab === "photos" || activeTab === "feed"))) && (
                  <>
                    <div
                      className="border-t my-2"
                      style={{
                        borderColor: "var(--glass-border-subtle)",
                      }}
                    />
                    {onHistory && (
                      <button
                        onClick={() => {
                          onHistory()
                          onToggleNavMenu()
                        }}
                        className="touch-manipulation active:scale-[0.98] w-full text-left px-6 py-4 transition-colors hover:bg-[color:var(--glass-bg)]"
                        style={proMode ? {
                          fontFamily: Typography.ui.fontFamily,
                          fontSize: Typography.ui.sizes.md,
                          fontWeight: Typography.ui.weights.medium,
                          color: "var(--color-porcelain)",
                          textTransform: "uppercase",
                          letterSpacing: "0.12em",
                        } : {}}
                      >
                        History
                      </button>
                    )}
                    {onNewProject && !(activeTab === "photos" || activeTab === "feed") && (
                      <button
                        onClick={() => {
                          onNewProject()
                          onToggleNavMenu()
                        }}
                        className="touch-manipulation active:scale-[0.98] w-full text-left px-6 py-4 transition-colors hover:bg-[color:var(--glass-bg)]"
                        style={proMode ? {
                          fontFamily: Typography.ui.fontFamily,
                          fontSize: Typography.ui.sizes.md,
                          fontWeight: Typography.ui.weights.medium,
                          color: "var(--color-porcelain)",
                          textTransform: "uppercase",
                          letterSpacing: "0.12em",
                        } : {}}
                      >
                        New Chat
                      </button>
                    )}
                  </>
                )}

                {/* Photo generation (Flux) — Photos tab, Classic + Pro (mobile menu) */}
                {onSettings && activeTab === "photos" && (
                  <>
                    <div
                      className="border-t my-2"
                      style={{
                        borderColor: "var(--glass-border-subtle)",
                      }}
                    />
                  <button
                    onClick={() => {
                      onSettings()
                      onToggleNavMenu()
                    }}
                    className="touch-manipulation active:scale-[0.98] w-full text-left px-6 py-4 transition-colors hover:bg-[color:var(--glass-bg)]"
                    style={
                      proMode
                        ? {
                            fontFamily: Typography.ui.fontFamily,
                            fontSize: Typography.ui.sizes.md,
                            fontWeight: Typography.ui.weights.medium,
                            color: "var(--color-porcelain)",
                            textTransform: "uppercase",
                            letterSpacing: "0.12em",
                          }
                        : {}
                    }
                  >
                    <span
                      className={
                        proMode
                          ? ""
                          : "text-sm font-serif font-extralight tracking-[0.2em] uppercase text-[color:var(--color-porcelain)]"
                      }
                    >
                      Photo generation
                    </span>
                  </button>
                  </>
                )}

                {/* Switch Mode — Selfie → My Model (membership, mobile menu) */}
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
                      className="touch-manipulation active:scale-[0.98] w-full text-left px-6 py-4 transition-colors hover:bg-[color:var(--glass-bg)]"
                      style={{
                        fontFamily: Typography.ui.fontFamily,
                        fontSize: Typography.ui.sizes.md,
                        fontWeight: Typography.ui.weights.medium,
                        color: "var(--color-smoke)",
                        textTransform: "uppercase",
                        letterSpacing: "0.12em",
                      }}
                    >
                      Switch to My Look
                    </button>
                  </>
                )}

                {/* Pro Mode: Manage Library section (if available) */}
                {proMode && libraryCount > 0 && hasLibraryActions && (
                  <>
                    <div
                      className="border-t my-2"
                      style={{
                        borderColor: "var(--glass-border-subtle)",
                      }}
                    />
                    <div className="px-6 py-4">
                      <div
                        style={{
                          fontFamily: Typography.ui.fontFamily,
                          fontSize: Typography.ui.sizes.sm,
                          fontWeight: Typography.ui.weights.medium,
                          color: "var(--color-smoke)",
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
                            className="touch-manipulation active:scale-[0.98] w-full text-left px-4 py-2 rounded transition-colors hover:bg-[color:var(--glass-bg)]"
                            style={{
                              fontFamily: Typography.ui.fontFamily,
                              fontSize: Typography.ui.sizes.sm,
                              fontWeight: Typography.ui.weights.regular,
                              color: "var(--color-porcelain)",
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
                            className="touch-manipulation active:scale-[0.98] w-full text-left px-4 py-2 rounded transition-colors hover:bg-[color:var(--glass-bg)]"
                            style={{
                              fontFamily: Typography.ui.fontFamily,
                              fontSize: Typography.ui.sizes.sm,
                              fontWeight: Typography.ui.weights.regular,
                              color: "var(--color-porcelain)",
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
                            className="touch-manipulation active:scale-[0.98] w-full text-left px-4 py-2 rounded transition-colors hover:bg-[color:var(--glass-bg)]"
                            style={{
                              fontFamily: Typography.ui.fontFamily,
                              fontSize: Typography.ui.sizes.sm,
                              fontWeight: Typography.ui.weights.regular,
                              color: "var(--color-porcelain)",
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
                            className="touch-manipulation active:scale-[0.98] w-full text-left px-4 py-2 rounded transition-colors hover:bg-[color:var(--glass-bg)]"
                            style={{
                              fontFamily: Typography.ui.fontFamily,
                              fontSize: Typography.ui.sizes.sm,
                              fontWeight: Typography.ui.weights.regular,
                              color: "var(--color-smoke)",
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
                className="shrink-0 px-6 py-4 border-t"
                style={{
                  borderColor: "var(--glass-border-subtle)",
                  backgroundColor: "var(--app-overlay)",
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
                    color: 'var(--color-porcelain)',
                    textTransform: "uppercase",
                    letterSpacing: "0.2em",
                    backgroundColor: 'var(--glass-input-bg)',
                    border: '1px solid var(--glass-input-border)',
                  }}
                  onMouseEnter={(e) => {
                    if (!isLoggingOut) {
                      e.currentTarget.style.backgroundColor = 'var(--glass-bg-mid)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isLoggingOut) {
                      e.currentTarget.style.backgroundColor = 'var(--glass-input-bg)'
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
