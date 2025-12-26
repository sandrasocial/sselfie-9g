"use client"

import { useState, useEffect, useRef } from 'react'
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
import { Typography, Colors, BorderRadius, Spacing, UILabels, ButtonLabels } from '@/lib/maya/pro/design-system'
import { ChevronDown, MoreVertical, X, LogOut, FolderOpen, Plus, Eye, Sliders } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

/**
 * ProModeHeader Component
 * 
 * Top navigation header for Studio Pro Mode.
 * Displays title, library count, manage dropdown, and credits.
 * 
 * Design principles:
 * - NO emojis in UI elements
 * - Professional typography (Hatton, Inter)
 * - Stone palette colors
 * - Minimal, editorial design
 */

interface Guide {
  id: number
  title: string
  category: string
  status?: string | null
  page_slug?: string | null
}

interface ProModeHeaderProps {
  libraryCount?: number
  credits?: number
  onManageLibrary?: () => void
  onAddImages?: () => void
  onStartFresh?: () => void
  onEditIntent?: () => void
  onNavigation?: (tab: string) => void
  onLogout?: () => void
  isLoggingOut?: boolean
  onSwitchToClassic?: () => void
  onSettings?: () => void // NEW: Callback to open settings
  // Admin guide controls (only visible when isAdmin is true)
  isAdmin?: boolean
  selectedGuideId?: number | null
  selectedGuideCategory?: string | null
  onGuideChange?: (id: number | null, category: string | null) => void
  userId?: string
}

export default function ProModeHeader({
  libraryCount = 0,
  credits,
  onManageLibrary,
  onAddImages,
  onStartFresh,
  onEditIntent,
  onNavigation,
  onLogout,
  isLoggingOut = false,
  onSwitchToClassic,
  onSettings,
  isAdmin = false,
  selectedGuideId = null,
  selectedGuideCategory = null,
  onGuideChange,
  userId,
}: ProModeHeaderProps) {
  const [isManageOpen, setIsManageOpen] = useState(false)
  const [showNavMenu, setShowNavMenu] = useState(false)
  const [isGuideMenuOpen, setIsGuideMenuOpen] = useState(false)
  const [guides, setGuides] = useState<Guide[]>([])
  const [isLoadingGuides, setIsLoadingGuides] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    setIsMounted(true)
    if (isAdmin && userId) {
      loadGuides()
    }
  }, [isAdmin, userId])

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
        setShowNavMenu(false)
      }
    }

    if (showNavMenu) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [showNavMenu])

  return (
    <div
      className="flex items-center justify-between w-full px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-b"
      style={{
        borderColor: Colors.border,
        backgroundColor: Colors.surface,
      }}
    >
      {/* Left side: Title and Library count */}
      <div className="flex items-center gap-2 sm:gap-4 md:gap-6 min-w-0 flex-1">
        {/* Studio Pro title */}
        <h1
          className="truncate"
          style={{
            fontFamily: Typography.subheaders.fontFamily,
            fontSize: 'clamp(14px, 2.5vw, 18px)',
            fontWeight: Typography.subheaders.weights.regular,
            color: Colors.textPrimary,
            lineHeight: Typography.subheaders.lineHeight,
            letterSpacing: Typography.subheaders.letterSpacing,
          }}
        >
          Studio Pro
        </h1>

        {/* Library count */}
        {libraryCount > 0 && (
          <p
            className="hidden sm:inline whitespace-nowrap"
            style={{
              fontFamily: Typography.ui.fontFamily,
              fontSize: 'clamp(11px, 2vw, 13px)',
              fontWeight: Typography.ui.weights.regular,
              color: Colors.textSecondary,
              lineHeight: 1.5,
            }}
          >
            {UILabels.library(libraryCount)}
          </p>
        )}
      </div>

      {/* Right side: Guide Controls (Admin only), Manage dropdown, Credits, and Menu */}
      <div className="flex items-center gap-2 sm:gap-3 md:gap-4 shrink-0">
        {/* Guide Controls Dropdown - Admin only */}
        {isAdmin && (
          <DropdownMenu open={isGuideMenuOpen} onOpenChange={setIsGuideMenuOpen}>
            <DropdownMenuTrigger asChild>
              <button
                className="touch-manipulation active:scale-95 flex items-center gap-1.5 px-2.5 py-1.5 rounded transition-colors"
                style={{
                  fontFamily: Typography.ui.fontFamily,
                  fontSize: 'clamp(11px, 2vw, 13px)',
                  fontWeight: Typography.ui.weights.medium,
                  color: Colors.textSecondary,
                  backgroundColor: 'transparent',
                  border: `1px solid ${Colors.border}`,
                  minHeight: '36px',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = Colors.hover
                  e.currentTarget.style.borderColor = Colors.primary
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                  e.currentTarget.style.borderColor = Colors.border
                }}
              >
                <FolderOpen size={14} />
                <span className="hidden sm:inline">
                  {selectedGuideId 
                    ? guides.find(g => g.id === selectedGuideId)?.title || 'Guide'
                    : 'Guide'}
                </span>
                <ChevronDown
                  size={12}
                  style={{
                    color: Colors.textSecondary,
                    transition: 'transform 0.2s ease',
                    transform: isGuideMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}
                />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              style={{
                backgroundColor: Colors.surface,
                borderColor: Colors.border,
                borderRadius: BorderRadius.cardSm,
                minWidth: '280px',
                padding: '12px',
              }}
            >
              <div className="space-y-3">
                <div>
                  <label
                    style={{
                      fontFamily: Typography.ui.fontFamily,
                      fontSize: Typography.ui.sizes.xs,
                      fontWeight: Typography.ui.weights.medium,
                      color: Colors.textSecondary,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      marginBottom: '8px',
                      display: 'block',
                    }}
                  >
                    Active Guide
                  </label>
                  {isMounted ? (
                    <Select
                      value={selectedGuideId?.toString() || "none"}
                      onValueChange={(value) => {
                        if (onGuideChange) {
                          if (value === "none") {
                            onGuideChange(null, null)
                          } else {
                            const guide = guides.find(g => g.id.toString() === value)
                            if (guide) {
                              onGuideChange(guide.id, guide.category)
                            }
                          }
                        }
                      }}
                    >
                      <SelectTrigger className="w-full" style={{ minHeight: '36px' }}>
                        <SelectValue placeholder="Select a guide..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No guide selected</SelectItem>
                        {guides.map((guide) => (
                          <SelectItem key={guide.id} value={guide.id.toString()}>
                            {guide.title} ({guide.category})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="w-full h-9 rounded-md border border-stone-200 bg-white flex items-center px-3 text-sm text-stone-500">
                      Loading...
                    </div>
                  )}
                </div>

                {selectedGuideId && (
                  <div className="text-xs text-stone-500 pt-1 border-t" style={{ borderColor: Colors.border }}>
                    Prompts will be saved to: <span className="font-medium text-stone-900">
                      {guides.find(g => g.id === selectedGuideId)?.title}
                    </span>
                  </div>
                )}

                <div className="flex gap-2 pt-2 border-t" style={{ borderColor: Colors.border }}>
                  <button
                    onClick={handleCreateNewGuide}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded transition-colors hover:bg-stone-100"
                    style={{
                      fontFamily: Typography.ui.fontFamily,
                      fontSize: Typography.ui.sizes.sm,
                      fontWeight: Typography.ui.weights.medium,
                      color: Colors.textPrimary,
                      border: `1px solid ${Colors.border}`,
                    }}
                  >
                    <Plus size={14} />
                    New Guide
                  </button>
                  {selectedGuideId && (
                    <button
                      onClick={handlePreviewGuide}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded transition-colors hover:bg-stone-100"
                      style={{
                        fontFamily: Typography.ui.fontFamily,
                        fontSize: Typography.ui.sizes.sm,
                        fontWeight: Typography.ui.weights.medium,
                        color: Colors.textPrimary,
                        border: `1px solid ${Colors.border}`,
                      }}
                    >
                      <Eye size={14} />
                      Preview
                    </button>
                  )}
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Manage dropdown - hidden on small screens when menu is available */}
        {libraryCount > 0 && (
          <DropdownMenu open={isManageOpen} onOpenChange={setIsManageOpen}>
            <DropdownMenuTrigger asChild>
              <button
                className="touch-manipulation active:scale-95 hidden md:flex"
                style={{
                  fontFamily: Typography.ui.fontFamily,
                  fontSize: 'clamp(11px, 2vw, 14px)',
                  fontWeight: Typography.ui.weights.medium,
                  color: Colors.primary,
                  backgroundColor: 'transparent',
                  border: `1px solid ${Colors.border}`,
                  padding: '6px 12px',
                  borderRadius: BorderRadius.buttonSm,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.2s ease',
                  minHeight: '36px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = Colors.hover
                  e.currentTarget.style.borderColor = Colors.primary
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                  e.currentTarget.style.borderColor = Colors.border
                }}
              >
                <span>{ButtonLabels.manage}</span>
                <ChevronDown
                  size={14}
                  style={{
                    color: Colors.primary,
                    transition: 'transform 0.2s ease',
                    transform: isManageOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}
                />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              style={{
                backgroundColor: Colors.surface,
                borderColor: Colors.border,
                borderRadius: BorderRadius.cardSm,
                minWidth: '180px',
                padding: '4px',
              }}
            >
              <DropdownMenuItem
                onClick={() => {
                  if (onManageLibrary) {
                    onManageLibrary()
                  }
                  setIsManageOpen(false)
                }}
                style={{
                  fontFamily: Typography.ui.fontFamily,
                  fontSize: Typography.ui.sizes.sm,
                  color: Colors.textPrimary,
                  padding: '8px 12px',
                  cursor: 'pointer',
                }}
                className="hover:bg-stone-100"
              >
                {ButtonLabels.openLibrary}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  if (onAddImages) {
                    onAddImages()
                  }
                  setIsManageOpen(false)
                }}
                style={{
                  fontFamily: Typography.ui.fontFamily,
                  fontSize: Typography.ui.sizes.sm,
                  color: Colors.textPrimary,
                  padding: '8px 12px',
                  cursor: 'pointer',
                }}
                className="hover:bg-stone-100"
              >
                {ButtonLabels.addImages}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  if (onEditIntent) {
                    onEditIntent()
                  }
                  setIsManageOpen(false)
                }}
                style={{
                  fontFamily: Typography.ui.fontFamily,
                  fontSize: Typography.ui.sizes.sm,
                  color: Colors.textPrimary,
                  padding: '8px 12px',
                  cursor: 'pointer',
                }}
                className="hover:bg-stone-100"
              >
                {ButtonLabels.editIntent}
              </DropdownMenuItem>
              <DropdownMenuSeparator
                style={{
                  backgroundColor: Colors.border,
                  margin: '4px 0',
                }}
              />
              <DropdownMenuItem
                onClick={() => {
                  if (onStartFresh) {
                    onStartFresh()
                  }
                  setIsManageOpen(false)
                }}
                style={{
                  fontFamily: Typography.ui.fontFamily,
                  fontSize: Typography.ui.sizes.sm,
                  color: Colors.textSecondary,
                  padding: '8px 12px',
                  cursor: 'pointer',
                }}
                className="hover:bg-stone-100"
              >
                {ButtonLabels.startFresh}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Credits display - hidden on small screens when menu is available */}
        {credits !== undefined && (
          <div
            className="hidden lg:flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded"
            style={{
              backgroundColor: Colors.backgroundAlt,
              border: `1px solid ${Colors.border}`,
            }}
          >
            <span
              style={{
                fontFamily: Typography.ui.fontFamily,
                fontSize: 'clamp(11px, 2vw, 14px)',
                fontWeight: Typography.ui.weights.regular,
                color: Colors.textSecondary,
              }}
            >
              Credits
            </span>
            <span
              style={{
                fontFamily: Typography.data.fontFamily,
                fontSize: 'clamp(13px, 2.5vw, 15px)',
                fontWeight: Typography.data.weights.semibold,
                color: Colors.textPrimary,
              }}
            >
              {credits}
            </span>
          </div>
        )}

        {/* Switch to Classic button - shown on larger screens, hidden on mobile (moved to menu) */}
        {onSwitchToClassic && (
          <button
            onClick={onSwitchToClassic}
            className="touch-manipulation active:scale-95 hidden md:flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-lg transition-colors"
            style={{
              fontFamily: Typography.ui.fontFamily,
              fontSize: 'clamp(11px, 2vw, 13px)',
              fontWeight: Typography.ui.weights.medium,
              color: Colors.textSecondary,
              backgroundColor: Colors.backgroundAlt,
              border: `1px solid ${Colors.border}`,
              minHeight: '36px',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = Colors.hover
              e.currentTarget.style.borderColor = Colors.primary
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = Colors.backgroundAlt
              e.currentTarget.style.borderColor = Colors.border
            }}
          >
            <span className="hidden lg:inline">Mode:</span>
            <span>Switch to Classic</span>
          </button>
        )}

        {/* Navigation Menu Button (3 dots) - always visible */}
        {onNavigation && (
          <button
            onClick={() => setShowNavMenu(!showNavMenu)}
            className="touch-manipulation active:scale-95 flex items-center justify-center shrink-0"
            style={{
              width: '36px',
              height: '36px',
              minWidth: '36px',
              minHeight: '36px',
              borderRadius: BorderRadius.buttonSm,
              border: `1px solid ${Colors.border}`,
              backgroundColor: 'transparent',
              color: Colors.textSecondary,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = Colors.hover
              e.currentTarget.style.borderColor = Colors.primary
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.borderColor = Colors.border
            }}
            aria-label="Navigation menu"
            aria-expanded={showNavMenu}
          >
            <MoreVertical size={18} strokeWidth={2} />
          </button>
        )}
      </div>

      {/* Navigation Menu Slide-in */}
      {showNavMenu && onNavigation && (
        <>
          {/* Overlay - full screen behind menu */}
          <div
            className="fixed inset-0 bg-stone-950/20 backdrop-blur-sm z-[90] animate-in fade-in duration-200"
            onClick={() => setShowNavMenu(false)}
            style={{
              height: '100vh',
            }}
          />

          {/* Sliding menu from right - full overlay */}
          <div
            ref={menuRef}
            className="fixed top-0 right-0 bottom-0 w-80 bg-white/95 backdrop-blur-3xl border-l border-stone-200 shadow-2xl z-[100] animate-in slide-in-from-right duration-300 flex flex-col"
            style={{
              borderColor: Colors.border,
              height: '100vh',
              maxHeight: '100vh',
            }}
          >
            {/* Header with close button */}
            <div
              className="shrink-0 flex items-center justify-between px-6 py-4 border-b"
              style={{
                borderColor: Colors.border,
              }}
            >
              <h3
                style={{
                  fontFamily: Typography.subheaders.fontFamily,
                  fontSize: Typography.subheaders.sizes.md,
                  fontWeight: Typography.subheaders.weights.regular,
                  color: Colors.textPrimary,
                  letterSpacing: Typography.subheaders.letterSpacing,
                }}
              >
                Menu
              </h3>
              <button
                onClick={() => setShowNavMenu(false)}
                className="touch-manipulation active:scale-95 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-stone-100 transition-colors"
                aria-label="Close menu"
              >
                <X size={18} className="text-stone-600" strokeWidth={2} />
              </button>
            </div>

            {/* Credits display */}
            {credits !== undefined && (
              <div
                className="shrink-0 px-6 py-6 border-b"
                style={{
                  borderColor: Colors.border,
                }}
              >
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
              </div>
            )}

            {/* Scrollable content area - includes navigation links and library section */}
            <div className="flex-1 overflow-y-auto min-h-0" style={{ WebkitOverflowScrolling: 'touch' }}>
              <div className="py-2">
                {/* Navigation links */}
                <button
                  onClick={() => {
                    onNavigation("studio")
                    setShowNavMenu(false)
                  }}
                  className="touch-manipulation active:scale-[0.98] w-full text-left px-6 py-4 transition-colors hover:bg-stone-50"
                  style={{
                    fontFamily: Typography.ui.fontFamily,
                    fontSize: Typography.ui.sizes.md,
                    fontWeight: Typography.ui.weights.medium,
                    color: Colors.textPrimary,
                  }}
                >
                  Studio
                </button>
                <button
                  onClick={() => {
                    onNavigation("training")
                    setShowNavMenu(false)
                  }}
                  className="touch-manipulation active:scale-[0.98] w-full text-left px-6 py-4 transition-colors hover:bg-stone-50"
                  style={{
                    fontFamily: Typography.ui.fontFamily,
                    fontSize: Typography.ui.sizes.md,
                    fontWeight: Typography.ui.weights.medium,
                    color: Colors.textPrimary,
                  }}
                >
                  Training
                </button>
                <button
                  onClick={() => {
                    onNavigation("maya")
                    setShowNavMenu(false)
                  }}
                  className="touch-manipulation active:scale-[0.98] w-full text-left px-6 py-4 transition-colors bg-stone-100/50 border-l-2"
                  style={{
                    fontFamily: Typography.ui.fontFamily,
                    fontSize: Typography.ui.sizes.md,
                    fontWeight: Typography.ui.weights.medium,
                    color: Colors.textPrimary,
                    borderColor: Colors.primary,
                  }}
                >
                  Maya
                </button>
                <button
                  onClick={() => {
                    onNavigation("gallery")
                    setShowNavMenu(false)
                  }}
                  className="touch-manipulation active:scale-[0.98] w-full text-left px-6 py-4 transition-colors hover:bg-stone-50"
                  style={{
                    fontFamily: Typography.ui.fontFamily,
                    fontSize: Typography.ui.sizes.md,
                    fontWeight: Typography.ui.weights.medium,
                    color: Colors.textPrimary,
                  }}
                >
                  Gallery
                </button>
                <button
                  onClick={() => {
                    onNavigation("academy")
                    setShowNavMenu(false)
                  }}
                  className="touch-manipulation active:scale-[0.98] w-full text-left px-6 py-4 transition-colors hover:bg-stone-50"
                  style={{
                    fontFamily: Typography.ui.fontFamily,
                    fontSize: Typography.ui.sizes.md,
                    fontWeight: Typography.ui.weights.medium,
                    color: Colors.textPrimary,
                  }}
                >
                  Academy
                </button>
                <button
                  onClick={() => {
                    onNavigation("profile")
                    setShowNavMenu(false)
                  }}
                  className="touch-manipulation active:scale-[0.98] w-full text-left px-6 py-4 transition-colors hover:bg-stone-50"
                  style={{
                    fontFamily: Typography.ui.fontFamily,
                    fontSize: Typography.ui.sizes.md,
                    fontWeight: Typography.ui.weights.medium,
                    color: Colors.textPrimary,
                  }}
                >
                  Profile
                </button>
                
                {/* Generation Settings - opens settings modal */}
                {onSettings && (
                  <button
                    onClick={() => {
                      onSettings()
                      setShowNavMenu(false)
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
                
                <button
                  onClick={() => {
                    onNavigation("settings")
                    setShowNavMenu(false)
                  }}
                  className="touch-manipulation active:scale-[0.98] w-full text-left px-6 py-4 transition-colors hover:bg-stone-50"
                  style={{
                    fontFamily: Typography.ui.fontFamily,
                    fontSize: Typography.ui.sizes.md,
                    fontWeight: Typography.ui.weights.medium,
                    color: Colors.textPrimary,
                  }}
                >
                  Settings
                </button>

                {/* Switch to Classic - shown in menu on mobile */}
                {onSwitchToClassic && (
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
                        setShowNavMenu(false)
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

                {/* Manage Library section (if available) - now inside scrollable area */}
                {libraryCount > 0 && (
                  <>
                    <div
                      className="border-t my-2"
                      style={{
                        borderColor: Colors.border,
                      }}
                    />
                    <div
                      className="px-6 py-4"
                    >
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
                              setShowNavMenu(false)
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
                              setShowNavMenu(false)
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
                              setShowNavMenu(false)
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
                              setShowNavMenu(false)
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
                  borderColor: Colors.border,
                }}
              >
                <button
                  onClick={() => {
                    onLogout()
                    setShowNavMenu(false)
                  }}
                  disabled={isLoggingOut}
                  className="touch-manipulation active:scale-95 disabled:active:scale-100 w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    fontFamily: Typography.ui.fontFamily,
                    fontSize: Typography.ui.sizes.sm,
                    fontWeight: Typography.ui.weights.medium,
                    color: '#dc2626',
                    backgroundColor: 'transparent',
                    border: `1px solid ${Colors.border}`,
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
    </div>
  )
}
