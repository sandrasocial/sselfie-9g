"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import useSWR from "swr"
import InstagramFeedView from "./instagram-feed-view"
import { ArrowLeft, ImageIcon, MoreVertical, X, LogOut } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import UnifiedLoading from "@/components/sselfie/unified-loading"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface FeedViewScreenProps {
  feedId?: number | null
}

/**
 * Feed View Screen - View Only
 * 
 * This screen displays a feed in view-only mode.
 * Feed creation is handled in Maya Chat (Feed tab).
 * 
 * Accepts feedId as:
 * - Prop (from parent)
 * - Query parameter (?feedId=123)
 * 
 * When no feedId is provided, automatically fetches the latest feed.
 * Shows placeholder state if no feed exists.
 */
export default function FeedViewScreen({ feedId: feedIdProp }: FeedViewScreenProps = {}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isCreatingManual, setIsCreatingManual] = useState(false)
  const [showNavMenu, setShowNavMenu] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  
  // Fetch credits for header display
  const { data: creditsData } = useSWR('/api/user/credits', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  })
  const credits = creditsData?.credits ?? undefined
  
  // Get feedId from prop, query param, or null
  const feedIdFromQuery = feedIdProp ?? (searchParams.get('feedId') ? parseInt(searchParams.get('feedId')!, 10) : null)

  // Determine which endpoint to use: specific feedId or latest feed
  // Use /api/feed/latest which routes to [feedId] with feedId="latest"
  const swrKey = feedIdFromQuery 
    ? `/api/feed/${feedIdFromQuery}` 
    : '/api/feed/latest'

  // Fetch feed data (handles both specific feed and latest feed)
  const { data: feedData, error: feedError, isLoading } = useSWR(
    swrKey,
    fetcher,
    {
      refreshInterval: 3000, // Poll every 3 seconds for real-time updates
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  )

  // Extract effective feedId from response
  // If using latest endpoint, extract feedId from response
  const effectiveFeedId = feedIdFromQuery || feedData?.feed?.id || null

  // Check if feed exists (latest endpoint returns { exists: false } when no feed)
  const feedExists = feedData?.exists !== false && (feedData?.feed || feedData?.posts)

  // Fetch feed list for selector (only if we have a feed)
  const { data: feedListData, mutate: mutateFeedList } = useSWR(
    feedExists ? '/api/feed/list' : null,
    fetcher,
    {
      revalidateOnFocus: true, // Revalidate when tab becomes visible
      revalidateOnReconnect: true, // Revalidate on reconnect
      refreshInterval: 0, // Don't auto-poll, but allow manual refresh
    }
  )

  // Revalidate feed list when feedId changes (e.g., after creating new feed)
  useEffect(() => {
    if (effectiveFeedId && mutateFeedList) {
      mutateFeedList()
    }
  }, [effectiveFeedId, mutateFeedList])

  const feeds = feedListData?.feeds || []
  const hasMultipleFeeds = feeds.length > 1

  const handleBackToMaya = () => {
    // Route to Maya Feed tab using hash navigation
    if (typeof window !== "undefined") {
      // Navigate to studio with Maya feed tab
      window.location.href = "/studio#maya/feed"
    }
  }

  const handleNavigation = (tab: string) => {
    if (typeof window !== "undefined") {
      window.location.hash = tab
      setShowNavMenu(false)
    }
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      })

      if (response.ok) {
        router.push("/auth/login")
      } else {
        console.error("[v0] Logout failed")
        setIsLoggingOut(false)
      }
    } catch (error) {
      console.error("[v0] Error during logout:", error)
      setIsLoggingOut(false)
    }
  }

  const handleCreateFeed = () => {
    // Navigate to Maya Feed tab to create a feed
    if (typeof window !== "undefined") {
      window.location.href = "/studio#maya/feed"
    }
  }

  const handleCreateManualFeed = async () => {
    setIsCreatingManual(true)
    try {
      const response = await fetch('/api/feed/create-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to create feed' }))
        throw new Error(error.error || 'Failed to create feed')
      }

      const data = await response.json()
      
      // Invalidate feed list cache so selector appears immediately
      if (mutateFeedList) {
        await mutateFeedList()
      }
      
      // Navigate to the new feed
      router.push(`/feed-planner?feedId=${data.feedId}`)
      
      toast({
        title: "Feed created",
        description: "Your new feed is ready. Start adding images!",
      })
    } catch (error) {
      console.error("[v0] Error creating manual feed:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create feed. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsCreatingManual(false)
    }
  }

  // Loading state - show unified loader during initial load
  if (isLoading) {
    return (
      <div className="flex flex-col flex-1 overflow-hidden min-h-0">
        <UnifiedLoading variant="screen" message="Loading Feed Planner" />
      </div>
    )
  }

  // Error state (actual errors, not "no feed exists")
  if (feedError || (feedData?.error && feedData.exists !== false)) {
    return (
      <div className="flex flex-col flex-1 overflow-hidden min-h-0">
        {/* Unified Header */}
        <div className="flex items-center justify-between w-full px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-4 bg-white/80 backdrop-blur-xl relative z-[100] border-b border-stone-200/50">
          <div className="flex items-center shrink-0 min-h-[44px]">
            <h1 className="text-base sm:text-lg md:text-xl font-serif font-normal text-stone-950 uppercase tracking-wide">
              SSELFIE
            </h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 md:gap-4 shrink-0">
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
            <button
              onClick={() => setShowNavMenu(!showNavMenu)}
              className="touch-manipulation active:scale-95 flex items-center justify-center shrink-0 min-w-[44px] min-h-[44px] rounded-lg hover:bg-stone-100/50 transition-colors"
              aria-label="Navigation menu"
            >
              <MoreVertical size={18} strokeWidth={2} className="text-stone-950" />
            </button>
          </div>
        </div>
        
        {/* Navigation Menu Slide-in */}
        {showNavMenu && (
          <>
            <div
              className="fixed inset-0 bg-stone-950/20 backdrop-blur-sm z-[90] animate-in fade-in duration-200"
              onClick={() => setShowNavMenu(false)}
              style={{ height: '100vh' }}
            />
            <div
              className="fixed top-0 right-0 bottom-0 w-80 bg-white/95 backdrop-blur-3xl border-l border-stone-200 shadow-2xl z-[100] animate-in slide-in-from-right duration-300 flex flex-col"
              style={{ height: '100vh', maxHeight: '100vh' }}
            >
              <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-stone-200">
                <h3 className="text-sm font-serif font-extralight tracking-[0.2em] uppercase text-stone-950">Menu</h3>
                <button
                  onClick={() => setShowNavMenu(false)}
                  className="touch-manipulation active:scale-95 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-stone-100 transition-colors"
                  aria-label="Close menu"
                >
                  <X size={18} className="text-stone-600" strokeWidth={2} />
                </button>
              </div>
              {credits !== undefined && (
                <div className="shrink-0 px-6 py-6 border-b border-stone-200">
                  <div className="text-[10px] tracking-[0.15em] uppercase font-light text-stone-500 mb-2">Your Credits</div>
                  <div className="text-3xl font-serif font-extralight text-stone-950 tabular-nums">{credits.toFixed(1)}</div>
                </div>
              )}
              <div className="flex-1 overflow-y-auto min-h-0" style={{ WebkitOverflowScrolling: 'touch' }}>
                <div className="py-2">
                  <button onClick={() => handleNavigation("studio")} className="touch-manipulation active:scale-[0.98] w-full text-left px-6 py-4 transition-colors hover:bg-stone-50">Studio</button>
                  <button onClick={() => { window.dispatchEvent(new CustomEvent('open-onboarding')); setShowNavMenu(false); }} className="touch-manipulation active:scale-[0.98] w-full text-left px-6 py-4 transition-colors hover:bg-stone-50">Training</button>
                  <button onClick={() => handleNavigation("maya")} className="touch-manipulation active:scale-[0.98] w-full text-left px-6 py-4 transition-colors hover:bg-stone-50">Maya</button>
                  <button onClick={() => handleNavigation("gallery")} className="touch-manipulation active:scale-[0.98] w-full text-left px-6 py-4 transition-colors hover:bg-stone-50">Gallery</button>
                  <button onClick={() => handleNavigation("feed-planner")} className="touch-manipulation active:scale-[0.98] w-full text-left px-6 py-4 transition-colors bg-stone-100/50 border-l-2 border-stone-950">Feed</button>
                  <button onClick={() => handleNavigation("academy")} className="touch-manipulation active:scale-[0.98] w-full text-left px-6 py-4 transition-colors hover:bg-stone-50">Academy</button>
                  <button onClick={() => handleNavigation("account")} className="touch-manipulation active:scale-[0.98] w-full text-left px-6 py-4 transition-colors hover:bg-stone-50">Account</button>
                </div>
              </div>
              <div className="shrink-0 px-6 py-4 border-t border-stone-200 bg-white/95">
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="touch-manipulation active:scale-95 disabled:active:scale-100 w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-stone-200 hover:bg-stone-50"
                >
                  <LogOut size={16} strokeWidth={2} className="text-red-600" />
                  <span className="text-sm font-medium text-red-600">{isLoggingOut ? "Signing Out..." : "Sign Out"}</span>
                </button>
              </div>
            </div>
          </>
        )}
        
        <div className="flex items-center justify-center min-h-[400px] p-4">
          <div className="text-center space-y-4">
            <p className="text-sm text-stone-600">Failed to load feed. Please try again.</p>
          </div>
        </div>
      </div>
    )
  }

  // Placeholder state: No feed exists (exists: false from /api/feed/latest)
  if (!feedExists || (!feedIdFromQuery && feedData?.exists === false)) {
    return (
      <div className="flex flex-col flex-1 overflow-hidden min-h-0">
        {/* Unified Header */}
        <div className="flex items-center justify-between w-full px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-4 bg-white/80 backdrop-blur-xl relative z-[100] border-b border-stone-200/50">
          <div className="flex items-center shrink-0 min-h-[44px]">
            <h1 className="text-base sm:text-lg md:text-xl font-serif font-normal text-stone-950 uppercase tracking-wide">
              SSELFIE
            </h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 md:gap-4 shrink-0">
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
            <button
              onClick={() => setShowNavMenu(!showNavMenu)}
              className="touch-manipulation active:scale-95 flex items-center justify-center shrink-0 min-w-[44px] min-h-[44px] rounded-lg hover:bg-stone-100/50 transition-colors"
              aria-label="Navigation menu"
            >
              <MoreVertical size={18} strokeWidth={2} className="text-stone-950" />
            </button>
          </div>
        </div>

        {/* Navigation Menu Slide-in */}
        {showNavMenu && (
          <>
            <div
              className="fixed inset-0 bg-stone-950/20 backdrop-blur-sm z-[90] animate-in fade-in duration-200"
              onClick={() => setShowNavMenu(false)}
              style={{ height: '100vh' }}
            />
            <div
              className="fixed top-0 right-0 bottom-0 w-80 bg-white/95 backdrop-blur-3xl border-l border-stone-200 shadow-2xl z-[100] animate-in slide-in-from-right duration-300 flex flex-col"
              style={{ height: '100vh', maxHeight: '100vh' }}
            >
              <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-stone-200">
                <h3 className="text-sm font-serif font-extralight tracking-[0.2em] uppercase text-stone-950">Menu</h3>
                <button
                  onClick={() => setShowNavMenu(false)}
                  className="touch-manipulation active:scale-95 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-stone-100 transition-colors"
                  aria-label="Close menu"
                >
                  <X size={18} className="text-stone-600" strokeWidth={2} />
                </button>
              </div>
              {credits !== undefined && (
                <div className="shrink-0 px-6 py-6 border-b border-stone-200">
                  <div className="text-[10px] tracking-[0.15em] uppercase font-light text-stone-500 mb-2">Your Credits</div>
                  <div className="text-3xl font-serif font-extralight text-stone-950 tabular-nums">{credits.toFixed(1)}</div>
                </div>
              )}
              <div className="flex-1 overflow-y-auto min-h-0" style={{ WebkitOverflowScrolling: 'touch' }}>
                <div className="py-2">
                  <button onClick={() => handleNavigation("studio")} className="touch-manipulation active:scale-[0.98] w-full text-left px-6 py-4 transition-colors hover:bg-stone-50">Studio</button>
                  <button onClick={() => { window.dispatchEvent(new CustomEvent('open-onboarding')); setShowNavMenu(false); }} className="touch-manipulation active:scale-[0.98] w-full text-left px-6 py-4 transition-colors hover:bg-stone-50">Training</button>
                  <button onClick={() => handleNavigation("maya")} className="touch-manipulation active:scale-[0.98] w-full text-left px-6 py-4 transition-colors hover:bg-stone-50">Maya</button>
                  <button onClick={() => handleNavigation("gallery")} className="touch-manipulation active:scale-[0.98] w-full text-left px-6 py-4 transition-colors hover:bg-stone-50">Gallery</button>
                  <button onClick={() => handleNavigation("feed-planner")} className="touch-manipulation active:scale-[0.98] w-full text-left px-6 py-4 transition-colors bg-stone-100/50 border-l-2 border-stone-950">Feed</button>
                  <button onClick={() => handleNavigation("academy")} className="touch-manipulation active:scale-[0.98] w-full text-left px-6 py-4 transition-colors hover:bg-stone-50">Academy</button>
                  <button onClick={() => handleNavigation("account")} className="touch-manipulation active:scale-[0.98] w-full text-left px-6 py-4 transition-colors hover:bg-stone-50">Account</button>
                </div>
              </div>
              <div className="shrink-0 px-6 py-4 border-t border-stone-200 bg-white/95">
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="touch-manipulation active:scale-95 disabled:active:scale-100 w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-stone-200 hover:bg-stone-50"
                >
                  <LogOut size={16} strokeWidth={2} className="text-red-600" />
                  <span className="text-sm font-medium text-red-600">{isLoggingOut ? "Signing Out..." : "Sign Out"}</span>
                </button>
              </div>
            </div>
          </>
        )}

        {/* Placeholder State */}
        <div className="flex-1 overflow-y-auto min-h-0 flex items-center justify-center p-4 sm:p-6 md:p-12">
          <div className="max-w-md w-full text-center space-y-6">
            {/* Icon */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-full bg-stone-100 flex items-center justify-center">
              <ImageIcon className="w-8 h-8 sm:w-10 sm:h-10 text-stone-400" />
            </div>

            {/* Heading */}
            <div className="space-y-2">
              <h2 
                className="text-xl sm:text-2xl font-light text-stone-900"
                style={{ fontFamily: "'Times New Roman', serif" }}
              >
                Create Your First Feed
              </h2>
              <p className="text-sm sm:text-base text-stone-600 font-light">
                Create a feed manually or generate one with Maya's AI assistance.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-stretch sm:items-center">
              <button
                onClick={handleCreateManualFeed}
                disabled={isCreatingManual}
                className="w-full sm:w-auto px-6 py-3 bg-stone-900 hover:bg-stone-800 active:bg-stone-700 text-white text-sm font-light tracking-wider uppercase transition-colors duration-200 border border-stone-900 min-h-[44px] touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isCreatingManual ? "Creating..." : "+ Create New Feed"}
              </button>
              <button
                onClick={handleCreateFeed}
                className="w-full sm:w-auto px-6 py-3 bg-white hover:bg-stone-50 active:bg-stone-100 text-stone-900 text-sm font-light tracking-wider uppercase transition-colors duration-200 border border-stone-300 min-h-[44px] touch-manipulation"
              >
                Create with Maya
              </button>
            </div>

            {/* Placeholder Grid Preview (Visual Guide) */}
            <div className="pt-8 border-t border-stone-200">
              <p className="text-xs text-stone-500 uppercase tracking-wider mb-4">
                Your Feed Preview
              </p>
              <div className="grid grid-cols-3 gap-1 max-w-[300px] mx-auto">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div
                    key={i}
                    className="aspect-square bg-stone-100 border border-stone-200 flex items-center justify-center"
                  >
                    <ImageIcon className="w-4 h-4 text-stone-300" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Success: Show feed view (must have effectiveFeedId at this point)
  if (!effectiveFeedId) {
    // Fallback (shouldn't happen, but TypeScript safety)
    return (
      <div className="flex flex-col flex-1 overflow-hidden min-h-0">
        <div className="flex items-center justify-center min-h-[400px] p-4">
          <div className="text-center space-y-4">
            <p className="text-sm text-stone-600">Unable to determine feed ID.</p>
            <button
              onClick={handleBackToMaya}
              className="text-sm text-stone-500 hover:text-stone-900 underline flex items-center gap-2 mx-auto"
            >
              <ArrowLeft size={16} />
              Back to Maya Chat
            </button>
          </div>
        </div>
      </div>
    )
  }

  const handleFeedChange = (newFeedId: number) => {
    router.push(`/feed-planner?feedId=${newFeedId}`)
  }

  const currentFeedTitle = feedData?.feed?.brand_name || `Feed ${effectiveFeedId}`

  return (
    <div className="flex flex-col flex-1 overflow-hidden min-h-0">
      {/* Unified Header - SSELFIE logo and menu */}
      <div className="flex items-center justify-between w-full px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-4 bg-white/80 backdrop-blur-xl relative z-[100] border-b border-stone-200/50">
        {/* Left: SSELFIE logo */}
        <div className="flex items-center shrink-0 min-h-[44px]">
          <h1 className="text-base sm:text-lg md:text-xl font-serif font-normal text-stone-950 uppercase tracking-wide">
            SSELFIE
          </h1>
        </div>

        {/* Right: Credits and Menu */}
        <div className="flex items-center gap-2 sm:gap-3 md:gap-4 shrink-0">
          {/* Credits Display */}
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

          {/* Menu Button - 3 dots on mobile */}
          <button
            onClick={() => setShowNavMenu(!showNavMenu)}
            className="touch-manipulation active:scale-95 flex items-center justify-center shrink-0 min-w-[44px] min-h-[44px] rounded-lg hover:bg-stone-100/50 transition-colors"
            aria-label="Navigation menu"
            aria-expanded={showNavMenu}
          >
            <MoreVertical size={18} strokeWidth={2} className="text-stone-950" />
          </button>
        </div>
      </div>

      {/* Navigation Menu Slide-in */}
      {showNavMenu && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-stone-950/20 backdrop-blur-sm z-[90] animate-in fade-in duration-200"
            onClick={() => setShowNavMenu(false)}
            style={{ height: '100vh' }}
          />

          {/* Sliding menu from right */}
          <div
            className="fixed top-0 right-0 bottom-0 w-80 bg-white/95 backdrop-blur-3xl border-l border-stone-200 shadow-2xl z-[100] animate-in slide-in-from-right duration-300 flex flex-col"
            style={{ height: '100vh', maxHeight: '100vh' }}
          >
            {/* Header with close button */}
            <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-stone-200">
              <h3 className="text-sm font-serif font-extralight tracking-[0.2em] uppercase text-stone-950">
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
              <div className="shrink-0 px-6 py-6 border-b border-stone-200">
                <div className="text-[10px] tracking-[0.15em] uppercase font-light text-stone-500 mb-2">Your Credits</div>
                <div className="text-3xl font-serif font-extralight text-stone-950 tabular-nums">
                  {credits.toFixed(1)}
                </div>
              </div>
            )}

            {/* Scrollable content area */}
            <div className="flex-1 overflow-y-auto min-h-0" style={{ WebkitOverflowScrolling: 'touch' }}>
              <div className="py-2">
                {/* Navigation links */}
                <button
                  onClick={() => handleNavigation("studio")}
                  className="touch-manipulation active:scale-[0.98] w-full text-left px-6 py-4 transition-colors hover:bg-stone-50"
                >
                  Studio
                </button>
                <button
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('open-onboarding'))
                    setShowNavMenu(false)
                  }}
                  className="touch-manipulation active:scale-[0.98] w-full text-left px-6 py-4 transition-colors hover:bg-stone-50"
                >
                  Training
                </button>
                <button
                  onClick={() => handleNavigation("maya")}
                  className="touch-manipulation active:scale-[0.98] w-full text-left px-6 py-4 transition-colors hover:bg-stone-50"
                >
                  Maya
                </button>
                <button
                  onClick={() => handleNavigation("gallery")}
                  className="touch-manipulation active:scale-[0.98] w-full text-left px-6 py-4 transition-colors hover:bg-stone-50"
                >
                  Gallery
                </button>
                <button
                  onClick={() => handleNavigation("feed-planner")}
                  className="touch-manipulation active:scale-[0.98] w-full text-left px-6 py-4 transition-colors bg-stone-100/50 border-l-2 border-stone-950"
                >
                  Feed
                </button>
                <button
                  onClick={() => handleNavigation("academy")}
                  className="touch-manipulation active:scale-[0.98] w-full text-left px-6 py-4 transition-colors hover:bg-stone-50"
                >
                  Academy
                </button>
                <button
                  onClick={() => handleNavigation("account")}
                  className="touch-manipulation active:scale-[0.98] w-full text-left px-6 py-4 transition-colors hover:bg-stone-50"
                >
                  Account
                </button>
              </div>
            </div>

            {/* Sign out button - fixed at bottom */}
            <div className="shrink-0 px-6 py-4 border-t border-stone-200 bg-white/95">
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="touch-manipulation active:scale-95 disabled:active:scale-100 w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-stone-200 hover:bg-stone-50"
              >
                <LogOut size={16} strokeWidth={2} className="text-red-600" />
                <span className="text-sm font-medium text-red-600">{isLoggingOut ? "Signing Out..." : "Sign Out"}</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Feed View - FeedHeader component inside InstagramFeedView handles header with feed selector */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <InstagramFeedView
          feedId={effectiveFeedId}
          onBack={handleBackToMaya}
        />
      </div>
    </div>
  )
}
