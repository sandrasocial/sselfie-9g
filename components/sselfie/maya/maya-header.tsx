"use client"

import { useState, useEffect, useRef } from 'react'
import type React from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Typography, Colors, BorderRadius, UILabels, ButtonLabels } from '@/lib/maya/pro/design-system'
import { ChevronDown, MoreVertical, X, LogOut, FolderOpen, Plus, Eye } from 'lucide-react'
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
  studioProMode: boolean
  
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
  onLogout?: () => void
  isLoggingOut?: boolean
  
  // Tab Switcher Props (integrated into header)
  activeTab?: "photos" | "videos" | "prompts" | "training"
  onTabChange?: (tab: "photos" | "videos" | "prompts" | "training") => void
  photosCount?: number
  videosCount?: number
}

/**
 * Unified Maya Header Component
 * 
 * Single header component that handles both Classic and Pro Mode.
 * Uses progressive disclosure - Pro features appear when studioProMode is enabled.
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
  activeTab,
  onTabChange,
  photosCount,
  videosCount,
}: MayaHeaderUnifiedProps) {
  const [isManageOpen, setIsManageOpen] = useState(false)
  const [isGuideMenuOpen, setIsGuideMenuOpen] = useState(false)
  const [guides, setGuides] = useState<Guide[]>([])
  const [isLoadingGuides, setIsLoadingGuides] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    setIsMounted(true)
    if (studioProMode && isAdmin && userId) {
      loadGuides()
    }
  }, [studioProMode, isAdmin, userId])

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

    if (showNavMenu) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [showNavMenu])

  // Unified header styling - same for both modes
  // Mobile optimized: proper touch targets, safe area insets, responsive spacing
  // Note: border-b removed since tabs section will have its own border
  const headerClassName = "flex items-center justify-between w-full px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-4 bg-white/80 backdrop-blur-xl relative z-[100]"

  return (
    <>
      <div
        className={headerClassName}
      >
        {/* Left: SSELFIE - Always show SSELFIE logo/title */}
        <div className="flex items-center shrink-0 min-h-[44px]">
          <h1 className="text-base sm:text-lg md:text-xl font-serif font-normal text-stone-950 uppercase tracking-wide">
            SSELFIE
          </h1>
        </div>

        {/* Right: Credits and Mode Toggle - Simple, clean layout */}
        <div className="flex items-center gap-2 sm:gap-3 md:gap-4 shrink-0">
          {/* Credits Display - Always show when available */}
          {credits !== undefined && (
            <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded border border-stone-200 bg-stone-50/50 min-h-[36px] sm:min-h-[40px]">
              <span className="text-[9px] sm:text-[10px] md:text-xs font-light text-stone-500 uppercase tracking-wider">
                Credits
              </span>
              <span className="text-xs sm:text-sm md:text-base font-semibold text-stone-950 tabular-nums">
                {credits.toFixed(1)}
              </span>
            </div>
          )}

          {/* Mode Toggle - Always show (segmented control showing both options)
              Progressive enhancement: Same component, different state based on current mode */}
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
              variant="compact"
            />
          )}

          {/* Menu Button */}
          {onNavigation ? (
            // Pro Mode: 3 dots menu button
            <button
              onClick={onToggleNavMenu}
              data-menu-trigger
              className="touch-manipulation active:scale-95 flex items-center justify-center shrink-0 min-w-[44px] min-h-[44px]"
              style={studioProMode ? {
                width: '44px',
                height: '44px',
                minWidth: '44px',
                minHeight: '44px',
                borderRadius: BorderRadius.buttonSm,
                border: `1px solid ${Colors.border}`,
                backgroundColor: 'transparent',
                color: Colors.textSecondary,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              } : {}}
              onMouseEnter={studioProMode ? (e) => {
                e.currentTarget.style.backgroundColor = Colors.hover
                e.currentTarget.style.borderColor = Colors.primary
              } : undefined}
              onMouseLeave={studioProMode ? (e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
                e.currentTarget.style.borderColor = Colors.border
              } : undefined}
              aria-label="Navigation menu"
              aria-expanded={showNavMenu}
            >
              {studioProMode ? (
                <MoreVertical size={18} strokeWidth={2} />
              ) : (
                <span className="text-xs sm:text-sm font-serif tracking-[0.2em] text-stone-950 uppercase">MENU</span>
              )}
            </button>
          ) : (
            // Classic Mode: Simple menu button (fallback)
            <button
              onClick={onToggleNavMenu}
              data-menu-trigger
              className="flex items-center justify-center px-3 min-h-[44px] sm:min-h-[48px] rounded-lg hover:bg-stone-100/50 transition-colors touch-manipulation active:scale-95"
              aria-label="Navigation menu"
              aria-expanded={showNavMenu}
            >
              <span className="text-[10px] sm:text-xs md:text-sm font-serif tracking-[0.2em] text-stone-950 uppercase">MENU</span>
            </button>
          )}
        </div>
      </div>

      {/* Tab Switcher - Integrated into header */}
      {activeTab && onTabChange && (
        <div className="w-full border-t border-stone-200/50 bg-white/80 backdrop-blur-sm z-[100] relative">
          <div className="px-3 sm:px-4 md:px-6">
            <MayaTabSwitcher
              activeTab={activeTab}
              onTabChange={onTabChange}
              photosCount={photosCount}
              videosCount={videosCount}
            />
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
            className="fixed top-0 right-0 bottom-0 w-80 bg-white/95 backdrop-blur-3xl border-l border-stone-200 shadow-2xl z-[100] animate-in slide-in-from-right duration-300 flex flex-col"
            style={{
              borderColor: studioProMode ? Colors.border : undefined,
              height: '100vh',
              maxHeight: '100vh',
            }}
          >
            {/* Header with close button */}
            <div
              className="shrink-0 flex items-center justify-between px-6 py-4 border-b"
              style={{
                borderColor: studioProMode ? Colors.border : undefined,
              }}
            >
              <h3
                style={studioProMode ? {
                  fontFamily: Typography.subheaders.fontFamily,
                  fontSize: Typography.subheaders.sizes.md,
                  fontWeight: Typography.subheaders.weights.regular,
                  color: Colors.textPrimary,
                  letterSpacing: Typography.subheaders.letterSpacing,
                } : {
                  fontFamily: 'inherit',
                }}
                className={!studioProMode ? "text-sm font-serif font-extralight tracking-[0.2em] uppercase text-stone-950" : ""}
              >
                Menu
              </h3>
              <button
                onClick={() => onToggleNavMenu()}
                className="touch-manipulation active:scale-95 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-stone-100 transition-colors"
                aria-label="Close menu"
              >
                <X size={18} className="text-stone-600" strokeWidth={2} />
              </button>
            </div>

            {/* Credits display */}
            {(credits !== undefined) && (
              <div
                className="shrink-0 px-6 py-6 border-b"
                style={{
                  borderColor: studioProMode ? Colors.border : undefined,
                }}
              >
                {studioProMode ? (
                  <>
                    <div
                      style={{
                        fontFamily: Typography.ui.fontFamily,
                        fontSize: Typography.ui.sizes.xs,
                        fontWeight: Typography.ui.weights.regular,
                        color: Colors.textSecondary,
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
                        color: Colors.textPrimary,
                      }}
                    >
                      {credits.toFixed(1)}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-[10px] tracking-[0.15em] uppercase font-light text-stone-500 mb-2">Your Credits</div>
                    <div className="text-3xl font-serif font-extralight text-stone-950 tabular-nums">
                      {credits.toFixed(1)}
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
                  className="touch-manipulation active:scale-[0.98] w-full text-left px-6 py-4 transition-colors hover:bg-stone-50"
                  style={studioProMode ? {
                    fontFamily: Typography.ui.fontFamily,
                    fontSize: Typography.ui.sizes.md,
                    fontWeight: Typography.ui.weights.medium,
                    color: Colors.textPrimary,
                  } : {}}
                >
                  Studio
                </button>
                <button
                  onClick={() => {
                    // Training moved to Account → Settings, trigger onboarding if needed
                    window.dispatchEvent(new CustomEvent('open-onboarding'))
                    onToggleNavMenu()
                  }}
                  className="touch-manipulation active:scale-[0.98] w-full text-left px-6 py-4 transition-colors hover:bg-stone-50"
                  style={studioProMode ? {
                    fontFamily: Typography.ui.fontFamily,
                    fontSize: Typography.ui.sizes.md,
                    fontWeight: Typography.ui.weights.medium,
                    color: Colors.textPrimary,
                  } : {}}
                >
                  Training
                </button>
                <button
                  onClick={() => {
                    onNavigation("maya")
                    onToggleNavMenu()
                  }}
                  className="touch-manipulation active:scale-[0.98] w-full text-left px-6 py-4 transition-colors bg-stone-100/50 border-l-2"
                  style={studioProMode ? {
                    fontFamily: Typography.ui.fontFamily,
                    fontSize: Typography.ui.sizes.md,
                    fontWeight: Typography.ui.weights.medium,
                    color: Colors.textPrimary,
                    borderColor: Colors.primary,
                  } : {
                    borderColor: '#1C1917',
                  }}
                >
                  Maya
                </button>
                <button
                  onClick={() => {
                    onNavigation("gallery")
                    onToggleNavMenu()
                  }}
                  className="touch-manipulation active:scale-[0.98] w-full text-left px-6 py-4 transition-colors hover:bg-stone-50"
                  style={studioProMode ? {
                    fontFamily: Typography.ui.fontFamily,
                    fontSize: Typography.ui.sizes.md,
                    fontWeight: Typography.ui.weights.medium,
                    color: Colors.textPrimary,
                  } : {}}
                >
                  Gallery
                </button>
                <button
                  onClick={() => {
                    onNavigation("academy")
                    onToggleNavMenu()
                  }}
                  className="touch-manipulation active:scale-[0.98] w-full text-left px-6 py-4 transition-colors hover:bg-stone-50"
                  style={studioProMode ? {
                    fontFamily: Typography.ui.fontFamily,
                    fontSize: Typography.ui.sizes.md,
                    fontWeight: Typography.ui.weights.medium,
                    color: Colors.textPrimary,
                  } : {}}
                >
                  Academy
                </button>
                <button
                  onClick={() => {
                    onNavigation("account")
                    onToggleNavMenu()
                  }}
                  className="touch-manipulation active:scale-[0.98] w-full text-left px-6 py-4 transition-colors hover:bg-stone-50"
                  style={studioProMode ? {
                    fontFamily: Typography.ui.fontFamily,
                    fontSize: Typography.ui.sizes.md,
                    fontWeight: Typography.ui.weights.medium,
                    color: Colors.textPrimary,
                  } : {}}
                >
                  Account
                </button>

                {/* Pro Mode: Generation Settings */}
                {studioProMode && onSettings && (
                  <button
                    onClick={() => {
                      onSettings()
                      onToggleNavMenu()
                    }}
                    className="touch-manipulation active:scale-[0.98] w-full text-left px-6 py-4 transition-colors hover:bg-stone-50"
                    style={{
                      fontFamily: Typography.ui.fontFamily,
                      fontSize: Typography.ui.sizes.md,
                      fontWeight: Typography.ui.weights.medium,
                      color: Colors.textPrimary,
                    }}
                  >
                    Generation Settings
                  </button>
                )}

                {/* Switch Mode - Pro Mode shows "Switch to Classic" in menu on mobile */}
                {studioProMode && onSwitchToClassic && (
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
                      className="touch-manipulation active:scale-[0.98] w-full text-left px-6 py-4 transition-colors hover:bg-stone-50"
                      style={{
                        fontFamily: Typography.ui.fontFamily,
                        fontSize: Typography.ui.sizes.md,
                        fontWeight: Typography.ui.weights.medium,
                        color: Colors.textSecondary,
                      }}
                    >
                      Switch to Classic
                    </button>
                  </>
                )}

                {/* Pro Mode: Manage Library section (if available) */}
                {studioProMode && libraryCount > 0 && (
                  <>
                    <div
                      className="border-t my-2"
                      style={{
                        borderColor: Colors.border,
                      }}
                    />
                    <div className="px-6 py-4">
                      <div
                        style={{
                          fontFamily: Typography.ui.fontFamily,
                          fontSize: Typography.ui.sizes.sm,
                          fontWeight: Typography.ui.weights.medium,
                          color: Colors.textSecondary,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
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
                            className="touch-manipulation active:scale-[0.98] w-full text-left px-4 py-2 rounded transition-colors hover:bg-stone-50"
                            style={{
                              fontFamily: Typography.ui.fontFamily,
                              fontSize: Typography.ui.sizes.sm,
                              fontWeight: Typography.ui.weights.regular,
                              color: Colors.textPrimary,
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
                            className="touch-manipulation active:scale-[0.98] w-full text-left px-4 py-2 rounded transition-colors hover:bg-stone-50"
                            style={{
                              fontFamily: Typography.ui.fontFamily,
                              fontSize: Typography.ui.sizes.sm,
                              fontWeight: Typography.ui.weights.regular,
                              color: Colors.textPrimary,
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
                            className="touch-manipulation active:scale-[0.98] w-full text-left px-4 py-2 rounded transition-colors hover:bg-stone-50"
                            style={{
                              fontFamily: Typography.ui.fontFamily,
                              fontSize: Typography.ui.sizes.sm,
                              fontWeight: Typography.ui.weights.regular,
                              color: Colors.textPrimary,
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
                            className="touch-manipulation active:scale-[0.98] w-full text-left px-4 py-2 rounded transition-colors hover:bg-stone-50"
                            style={{
                              fontFamily: Typography.ui.fontFamily,
                              fontSize: Typography.ui.sizes.sm,
                              fontWeight: Typography.ui.weights.regular,
                              color: Colors.textSecondary,
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
                  borderColor: studioProMode ? Colors.border : undefined,
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
                    color: '#dc2626',
                    backgroundColor: 'transparent',
                    border: `1px solid ${studioProMode ? Colors.border : '#e5e7eb'}`,
                  }}
                  onMouseEnter={(e) => {
                    if (!isLoggingOut) {
                      e.currentTarget.style.backgroundColor = '#fef2f2'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isLoggingOut) {
                      e.currentTarget.style.backgroundColor = 'transparent'
                    }
                  }}
                >
                  <LogOut size={16} strokeWidth={2} />
                  <span>{isLoggingOut ? "Signing Out..." : "Sign Out"}</span>
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </>
  )
}

