"use client"

import { useState, useEffect, useRef } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import useSWR from "swr"
import InstagramFeedView from "./instagram-feed-view"
import { toast } from "@/hooks/use-toast"
import UnifiedLoading from "@/components/sselfie/unified-loading"
import FeedStyleModal, { type FeedStyle, type FeedStyleModalData } from "./feed-style-modal"
import type { FeedPlannerAccess } from "@/lib/feed-planner/access-control"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface FeedViewScreenProps {
  feedId?: number | null
  access?: FeedPlannerAccess // Phase 1.2: Access control object (required)
  onOpenWizard?: () => void // Callback to open onboarding wizard
  onOpenWelcomeWizard?: () => void // Callback to open welcome wizard (for paid blueprint users)
  controlledFeedStyleModal?: boolean // Controlled modal state (for welcome wizard)
  onFeedStyleModalChange?: (open: boolean) => void // Callback when modal state changes (for welcome wizard)
  onFeedStyleSelected?: (feedStyle: string) => void // Callback when feed style is selected (for welcome wizard)
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
export default function FeedViewScreen({ feedId: feedIdProp, access: accessProp, onOpenWizard, onOpenWelcomeWizard, controlledFeedStyleModal, onFeedStyleModalChange, onFeedStyleSelected }: FeedViewScreenProps = {}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isCreatingManual, setIsCreatingManual] = useState(false)
  const [isCreatingFreeExample, setIsCreatingFreeExample] = useState(false)
  const [localFeedStyleModal, setLocalFeedStyleModal] = useState(false)
  const didOpenFeedStyleFromQuery = useRef(false)
  const didOpenWizardFromQuery = useRef(false)
  const didOpenCreateFirstFeedFromQuery = useRef(false)

  // Use controlled state if provided, otherwise use local state
  const showFeedStyleModal = controlledFeedStyleModal !== undefined ? controlledFeedStyleModal : localFeedStyleModal
  
  const setShowFeedStyleModal = (open: boolean) => {
    if (controlledFeedStyleModal !== undefined) {
      // Parent controls the modal - notify parent
      onFeedStyleModalChange?.(open)
    } else {
      // Local state - update directly
      setLocalFeedStyleModal(open)
    }
  }
  
  // Fetch user's last feed style from personal brand
  const { data: personalBrandData } = useSWR(
    showFeedStyleModal ? "/api/profile/personal-brand" : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // Cache for 1 minute
    }
  )
  
  // Extract last feed style from settings_preference[0]
  const lastFeedStyle: FeedStyle | null = personalBrandData?.data?.settingsPreference?.[0] || null
  
  // Fetch access control if not provided (for use in SselfieApp)
  const { data: accessData } = useSWR<FeedPlannerAccess>(
    accessProp ? null : "/api/feed-planner/access",
    async (url) => {
      const res = await fetch(url)
      if (!res.ok) throw new Error("Failed to fetch access control")
      return res.json()
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // Cache for 1 minute
    }
  )
  
  // Use provided access or fetched access
  const access = accessProp || accessData
  
  // Get feedId from prop, query param, or null
  const feedIdFromQuery = feedIdProp ?? (searchParams.get('feedId') ? parseInt(searchParams.get('feedId')!, 10) : null)
  const activationAction = searchParams.get("activation") === "generate" ? "generate" : null
  const createFirstFeedParam = searchParams.get("createFirstFeed") === "1"

  useEffect(() => {
    if (!didOpenFeedStyleFromQuery.current && searchParams.get("openFeedStyle") === "1") {
      didOpenFeedStyleFromQuery.current = true
      setShowFeedStyleModal(true)
    }
  }, [searchParams])

  useEffect(() => {
    if (!didOpenWizardFromQuery.current && searchParams.get("openWizard") === "1") {
      didOpenWizardFromQuery.current = true
      onOpenWizard?.()
    }
  }, [searchParams, onOpenWizard])

  // Deep-link: ?createFirstFeed=1 opens feed style modal (create first feed flow)
  useEffect(() => {
    if (!didOpenCreateFirstFeedFromQuery.current && createFirstFeedParam) {
      didOpenCreateFirstFeedFromQuery.current = true
      setShowFeedStyleModal(true)
    }
  }, [createFirstFeedParam])

  // Phase 4.1: Use standard feed endpoints (removed blueprint endpoint)
  // Use specific feedId or latest feed
  const swrKey = feedIdFromQuery 
    ? `/api/feed/${feedIdFromQuery}` 
    : '/api/feed/latest'

  // Fetch feed data (handles both specific feed and latest feed)
  // Note: Polling is handled by InstagramFeedView's useFeedPolling hook, not here
  const { data: feedData, error: feedError, isLoading } = useSWR(
    swrKey,
    fetcher,
    {
      refreshInterval: 0, // No polling here - InstagramFeedView handles it
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  )

  // Handle redirect from preview feed (paid users accessing preview feeds)
  useEffect(() => {
    if (feedData?.redirectedFromPreview && feedData?.feed?.id) {
      const newFeedId = feedData.feed.id
      console.log('[Feed Planner] ⚠️ Redirected from preview feed to full feed:', newFeedId)
      // Update URL to reflect the new feedId
      router.replace(`/feed-planner?feedId=${newFeedId}`, { scroll: false })
    }
  }, [feedData?.redirectedFromPreview, feedData?.feed?.id, router])

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

  // Phase 4: Client-side fallback - Expand feed from 1 post to 12 posts for paid users (3x4 grid)
  const [isExpandingFeed, setIsExpandingFeed] = useState(false)
  useEffect(() => {
    async function expandFeedIfNeeded() {
      // Only expand if:
      // 1. User is paid blueprint
      // 2. Feed exists and has data
      // 3. Feed has only 1 post (free tier)
      // 4. Not already expanding
      if (
        access?.isPaidBlueprint &&
        feedData?.feed &&
        feedData?.posts &&
        feedData.posts.length === 1 &&
        !isExpandingFeed
      ) {
        setIsExpandingFeed(true)
        console.log('[FEED EXPANSION] Paid user has only 1 post, expanding...')

        try {
          const response = await fetch('/api/feed/expand-for-paid', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              feedId: feedData.feed.id,
            }),
          })

          if (response.ok) {
            const result = await response.json()
            console.log('[FEED EXPANSION] Created positions:', result.positionsCreated)

            // Refresh feed data to show new posts
            if (mutateFeedList) {
              await mutateFeedList()
            }
            
            // FIX: Use router.refresh() instead of window.location.reload() to prevent full page refresh
            // This maintains React state and prevents welcome screen from reappearing
            router.refresh()
            
            // Also trigger SWR revalidation for feed data
            // The feed data will be refetched automatically via SWR when router.refresh() completes
          } else {
            console.error('[FEED EXPANSION] Failed to expand feed')
          }
        } catch (error) {
          console.error('[FEED EXPANSION] Error:', error)
        } finally {
          setIsExpandingFeed(false)
        }
      }
    }

    // Only run if we have all required data
    if (access && feedData && !isLoading) {
      expandFeedIfNeeded()
    }
  }, [access?.isPaidBlueprint, feedData?.posts, feedData?.feed, isLoading, isExpandingFeed, mutateFeedList])

  const feeds = feedListData?.feeds || []
  const hasMultipleFeeds = feeds.length > 1

  // Phase 5.3.2: Auto-create feed for free users when no feed exists
  useEffect(() => {
    const autoCreateFreeExample = async () => {
      // Only auto-create for free users when no feed exists
      if (
        !feedExists &&
        !feedIdFromQuery &&
        feedData?.exists === false &&
        access?.isFree &&
        !isCreatingFreeExample
      ) {
        setIsCreatingFreeExample(true)
        try {
          const response = await fetch('/api/feed/create-free-example', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
          })

          if (!response.ok) {
            console.error('[Feed Planner] Failed to create free example feed')
            setIsCreatingFreeExample(false)
            return
          }

          const data = await response.json()
          console.log('[Feed Planner] ✅ Free example feed created:', data.feedId)
          
          // Refresh feed data to show the new feed
          router.push(`/feed-planner?feedId=${data.feedId}`)
          setIsCreatingFreeExample(false)
        } catch (error) {
          console.error('[Feed Planner] Error creating free example feed:', error)
          setIsCreatingFreeExample(false)
        }
      }
    }

    // Only run if we've confirmed no feed exists (not during initial load)
    if (!isLoading && feedData) {
      autoCreateFreeExample()
    }
  }, [feedExists, feedIdFromQuery, feedData, access?.isFree, isLoading, router, isCreatingFreeExample])

  const handleBackToMaya = () => {
    // Route to Maya Feed tab using hash navigation
    if (typeof window !== "undefined") {
      // Navigate to studio with Maya feed tab
      window.location.href = "/studio#maya/feed"
    }
  }


  const handleCreateFeed = () => {
    // Navigate to Maya Feed tab to create a feed
    if (typeof window !== "undefined") {
      window.location.href = "/studio#maya/feed"
    }
  }

  const handleCreateManualFeedClick = () => {
    // Show feed style modal first
    setShowFeedStyleModal(true)
  }

  const handleFeedStyleConfirm = async (modalData: FeedStyleModalData) => {
    setShowFeedStyleModal(false)
    
    // If called from welcome wizard, just notify parent and return
    if (onFeedStyleSelected) {
      onFeedStyleSelected(modalData.feedStyle)
      return
    }
    
    // Otherwise, create a new feed (normal flow)
    setIsCreatingManual(true)
    
    try {
      const response = await fetch('/api/feed/create-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          feedStyle: modalData.feedStyle,
          feedStyleVariationId: modalData.feedStyleVariationId,
        }),
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
  // But don't block if we're creating a free example (that has its own loading state)
  if (isLoading && !isCreatingFreeExample) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[color:var(--app-bg)]">
        <UnifiedLoading variant="screen" message="Loading Feed Planner" />
      </div>
    )
  }

  // Error state (actual errors, not "no feed exists")
  if (feedError || (feedData?.error && feedData.exists !== false)) {
    return (
      <div className="app-light-panel-text flex min-h-0 flex-1 flex-col overflow-hidden bg-[color:var(--app-bg)]">
        <div className="flex min-h-[400px] items-center justify-center p-4">
          <div className="text-center space-y-4">
            <p className="text-sm text-[color:var(--app-text-secondary)]">Failed to load feed. Please try again.</p>
          </div>
        </div>
      </div>
    )
  }

  // Placeholder state: No feed exists (exists: false from /api/feed/latest)
  // For free users, we auto-create the feed (handled in useEffect above)
  // For paid users, show the create feed options
  if (!feedExists || (!feedIdFromQuery && feedData?.exists === false)) {
    // Free users: Show loading while auto-creating feed
    if (access?.isFree && isCreatingFreeExample) {
      return (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[color:var(--app-bg)]">
          <UnifiedLoading variant="screen" message="Setting up your feed" />
        </div>
      )
    }

    return (
      <div className="app-light-panel-text flex min-h-0 flex-1 flex-col overflow-hidden bg-[color:var(--app-bg)]">
        {/* Placeholder State — paid blueprint: inline "Set up in 30 seconds" card (A-02) */}
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto p-4 sm:p-6 md:p-12">
          <div className="w-full max-w-md space-y-6 rounded-[20px] border border-[color:var(--app-glass-border)] bg-[rgba(255,255,255,0.74)] p-6 text-center shadow-[0_24px_70px_rgba(61,56,48,0.10)] backdrop-blur-[18px]">
            {/* Icon */}
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[color:var(--app-glass-border)] bg-[color:var(--app-btn-secondary-bg)] sm:h-20 sm:w-20">
              <span className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--app-text-secondary)]">Feed</span>
            </div>

            {/* Heading — paid blueprint: "Set up in 30 seconds" per §1.4 */}
            <div className="space-y-2">
              <h2 
                className="text-xl font-light uppercase tracking-[0.15em] text-[color:var(--app-text-primary)] sm:text-2xl"
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                {access?.isPaidBlueprint ? "Set up your first posts" : "Plan Your First Posts"}
              </h2>
              <p className="text-sm font-light text-[color:var(--app-text-secondary)] sm:text-base">
                {access?.isPaidBlueprint
                  ? "Your credits are ready. Start with a few posts and Maya will help match your style."
                  : "Start with one clear post plan, or let Maya help you choose what to make next."}
              </p>
            </div>

            {/* CTA — paid blueprint: single prominent "Create my first feed →" per content doc */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-stretch sm:items-center">
              <button
                onClick={handleCreateManualFeedClick}
                disabled={isCreatingManual}
                className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[6px] border border-[color:var(--app-btn-primary-bg)] bg-[color:var(--app-btn-primary-bg)] px-6 py-4 text-sm font-medium uppercase tracking-[0.2em] text-[color:var(--app-btn-primary-text)] transition-opacity duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                {isCreatingManual ? "Creating..." : "Start my plan ->"}
              </button>
              {!access?.isPaidBlueprint && (
                <button
                  onClick={handleCreateFeed}
                  className="min-h-[44px] w-full rounded-[6px] border border-[color:var(--app-glass-border)] bg-[color:var(--app-btn-secondary-bg)] px-6 py-3 text-sm font-medium uppercase tracking-[0.2em] text-[color:var(--app-text-primary)] transition-colors duration-200 hover:bg-[color:var(--app-btn-secondary-hover)] sm:w-auto"
                >
                  Plan with Maya
                </button>
              )}
            </div>

            {/* Placeholder Grid Preview (Visual Guide) */}
            <div className="border-t border-[color:var(--app-glass-border)] pt-8">
              <p className="mb-4 text-xs uppercase tracking-[0.2em] text-[color:var(--app-text-secondary)]">
                Your Feed Preview
              </p>
              <div className="mx-auto grid max-w-[300px] grid-cols-3 gap-0 border border-[color:var(--app-glass-border)]">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex aspect-square items-center justify-center border border-[color:var(--app-glass-border)] bg-[color:var(--app-btn-secondary-bg)]"
                  >
                    <span className="text-[9px] uppercase tracking-[0.2em] text-[color:var(--app-text-muted)]">Slot</span>
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
      <div className="app-light-panel-text flex min-h-0 flex-1 flex-col overflow-hidden bg-[color:var(--app-bg)]">
        <div className="flex min-h-[400px] items-center justify-center p-4">
          <div className="text-center space-y-4">
            <p className="text-sm text-[color:var(--app-text-secondary)]">Unable to determine feed ID.</p>
            <button
              onClick={handleBackToMaya}
              className="mx-auto flex items-center gap-2 text-sm text-[color:var(--app-text-secondary)] underline hover:text-[color:var(--app-text-primary)]"
            >
              <span className="text-[10px] uppercase tracking-[0.2em]">Back</span>
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
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[color:var(--app-bg)]">
      {/* Feed View - FeedHeader component inside InstagramFeedView handles header with feed selector */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <InstagramFeedView
          feedId={effectiveFeedId}
          onBack={handleBackToMaya}
          access={access} // Phase 4.1: Pass access control to InstagramFeedView
          onOpenWizard={onOpenWizard} // Pass wizard handler for header button
          onOpenWelcomeWizard={onOpenWelcomeWizard} // Pass welcome wizard handler for header button
          onRequireFeedStyle={() => setShowFeedStyleModal(true)}
          activationAction={activationAction}
        />
      </div>

      {/* Feed Style Selection Modal */}
      <FeedStyleModal
        open={showFeedStyleModal}
        onOpenChange={(open) => {
          setShowFeedStyleModal(open)
          onFeedStyleModalChange?.(open)
        }}
        onConfirm={handleFeedStyleConfirm}
        defaultFeedStyle={lastFeedStyle}
        isLoading={isCreatingManual}
      />
    </div>
  )
}
