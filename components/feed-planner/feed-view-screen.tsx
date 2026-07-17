"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import useSWR from "swr"
import InstagramFeedView from "./instagram-feed-view"
import { CalendarEmptyCanvas } from "./calendar-empty-canvas"
import { CalendarMayaWorkspace } from "./calendar-maya-workspace"
import type { CalendarAgentProposal } from "@/lib/feed-planner/calendar-agent"
import { toast } from "@/hooks/use-toast"
import UnifiedLoading from "@/components/sselfie/unified-loading"
import FeedStyleModal, {
  type FeedStyle,
  type FeedStyleModalData,
  type FeedVisualDirectionMode,
} from "./feed-style-modal"
import type { FeedPlannerAccess } from "@/lib/feed-planner/access-control"
import { useFeedNav } from "./feed-nav-context"
import { trackAnalyticsEvent } from "@/lib/analytics/client"
import {
  calendarPlanSettingsFromProfile,
  isCalendarPlanComplete,
  type CalendarPlanSettings,
} from "@/lib/feed-planner/calendar-plan-settings"

const fetcher = (url: string) => fetch(url).then(res => res.json())

interface FeedViewScreenProps {
  feedId?: number | null
  access?: FeedPlannerAccess // Phase 1.2: Access control object (required)
  onOpenWizard?: () => void // Callback to open onboarding wizard
  onOpenWelcomeWizard?: () => void // Callback to open welcome wizard (for paid blueprint users)
  controlledFeedStyleModal?: boolean // Controlled modal state (for welcome wizard)
  onFeedStyleModalChange?: (open: boolean) => void // Callback when modal state changes (for welcome wizard)
  onFeedStyleSelected?: (feedStyle: string) => void // Callback when feed style is selected (for welcome wizard)
  initialFeedStyle?: FeedStyle | null
  initialFeedStyleVariationId?: number | null
}

/**
 * Feed View Screen
 *
 * Displays a feed and opens creation through the current App v3 or standalone flow.
 *
 * Accepts feedId as:
 * - Prop (from parent)
 * - Query parameter (?feedId=123)
 *
 * When no feedId is provided, automatically fetches the latest feed.
 * Shows placeholder state if no feed exists.
 */
export default function FeedViewScreen({
  feedId: feedIdProp,
  access: accessProp,
  onOpenWizard,
  onOpenWelcomeWizard,
  controlledFeedStyleModal,
  onFeedStyleModalChange,
  onFeedStyleSelected,
  initialFeedStyle,
  initialFeedStyleVariationId,
}: FeedViewScreenProps = {}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isCreatingManual, setIsCreatingManual] = useState(false)
  const [isPlanningWithMaya, setIsPlanningWithMaya] = useState(false)
  const [firstPlanSettingsOpen, setFirstPlanSettingsOpen] = useState(false)
  const [localFeedStyleModal, setLocalFeedStyleModal] = useState(false)
  const [firstVisualDirectionMode, setFirstVisualDirectionMode] =
    useState<FeedVisualDirectionMode | null>(null)
  const didOpenFeedStyleFromQuery = useRef(false)
  const didOpenWizardFromQuery = useRef(false)
  const didOpenCreateFirstFeedFromQuery = useRef(false)

  // Use controlled state if provided, otherwise use local state
  const showFeedStyleModal =
    controlledFeedStyleModal !== undefined ? controlledFeedStyleModal : localFeedStyleModal

  const setShowFeedStyleModal = useCallback(
    (open: boolean) => {
      if (controlledFeedStyleModal !== undefined) {
        // Parent controls the modal - notify parent
        onFeedStyleModalChange?.(open)
      } else {
        // Local state - update directly
        setLocalFeedStyleModal(open)
      }
    },
    [controlledFeedStyleModal, onFeedStyleModalChange]
  )

  // Fetch user's last feed style from personal brand
  const { data: personalBrandData, mutate: mutatePersonalBrand } = useSWR(
    "/api/profile/personal-brand",
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // Cache for 1 minute
    }
  )

  // Extract last feed style from settings_preference[0]
  const lastFeedStyle: FeedStyle | null = personalBrandData?.data?.settingsPreference?.[0] || null
  const calendarPlanSettings = calendarPlanSettingsFromProfile(personalBrandData)

  const saveCalendarPlanSettings = async (settings: CalendarPlanSettings) => {
    const response = await fetch("/api/profile/personal-brand", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        businessType: settings.businessType,
        idealAudience: settings.idealAudience,
        currentSituation: settings.currentSituation,
        ...(settings.feedStyle.trim() ? { settingsPreference: [settings.feedStyle] } : {}),
        isCompleted: true,
      }),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok)
      throw new Error(data.details || data.error || "Your plan settings could not be saved.")
    await mutatePersonalBrand()
  }

  // Fetch access control if not provided (for use in SselfieApp)
  const { data: accessData } = useSWR<FeedPlannerAccess>(
    accessProp ? null : "/api/feed-planner/access",
    async url => {
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
  const canPlanMonthWithMaya = Boolean(access?.isMembership || access?.isPaidBlueprint)

  // Get feedId from embedded nav (inside /app), prop, query param, or null
  const feedNav = useFeedNav()
  const feedIdFromQuery =
    feedNav?.feedId ??
    feedIdProp ??
    (searchParams.get("feedId") ? parseInt(searchParams.get("feedId")!, 10) : null)
  const activationAction = searchParams.get("activation") === "generate" ? "generate" : null
  const createFirstFeedParam = searchParams.get("createFirstFeed") === "1"

  useEffect(() => {
    if (!didOpenFeedStyleFromQuery.current && searchParams.get("openFeedStyle") === "1") {
      didOpenFeedStyleFromQuery.current = true
      setShowFeedStyleModal(true)
    }
  }, [searchParams, setShowFeedStyleModal])

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
  }, [createFirstFeedParam, setShowFeedStyleModal])

  // Phase 4.1: Use standard feed endpoints (removed blueprint endpoint)
  // Use specific feedId or latest feed
  const swrKey = feedIdFromQuery ? `/api/feed/${feedIdFromQuery}` : "/api/feed/latest"

  // Fetch feed data (handles both specific feed and latest feed)
  // Note: Polling is handled by InstagramFeedView's useFeedPolling hook, not here
  const {
    data: feedData,
    error: feedError,
    isLoading,
    isValidating: isFeedValidating,
    mutate: mutateFeed,
  } = useSWR(swrKey, fetcher, {
    refreshInterval: 0, // No polling here - InstagramFeedView handles it
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  })

  // Normalize a legacy redirected response to its full feed.
  useEffect(() => {
    if (feedData?.redirectedFromPreview && feedData?.feed?.id) {
      const newFeedId = feedData.feed.id
      if (feedNav) feedNav.navigateToFeed(newFeedId)
      else router.replace(`/feed-planner?feedId=${newFeedId}`, { scroll: false })
    }
  }, [feedData?.redirectedFromPreview, feedData?.feed?.id, router, feedNav])

  // A deleted or no-longer-owned grid may remain in localStorage. Recover to the latest grid
  // instead of trapping the member on a permanent error screen.
  useEffect(() => {
    if (feedIdFromQuery && feedData?.error === "Feed not found" && feedNav) {
      feedNav.navigateToFeed(null)
    }
  }, [feedData?.error, feedIdFromQuery, feedNav])

  // Extract effective feedId from response
  // If using latest endpoint, extract feedId from response
  const effectiveFeedId = feedIdFromQuery || feedData?.feed?.id || null

  // Check if feed exists (latest endpoint returns { exists: false } when no feed)
  const feedExists = feedData?.exists !== false && (feedData?.feed || feedData?.posts)

  // Fetch feed list for selector (only if we have a feed)
  const { mutate: mutateFeedList } = useSWR(feedExists ? "/api/feed/list" : null, fetcher, {
    revalidateOnFocus: true, // Revalidate when tab becomes visible
    revalidateOnReconnect: true, // Revalidate on reconnect
    refreshInterval: 0, // Don't auto-poll, but allow manual refresh
  })

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
        console.log("[FEED EXPANSION] Paid user has only 1 post, expanding...")

        try {
          const response = await fetch("/api/feed/expand-for-paid", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              feedId: feedData.feed.id,
            }),
          })

          if (response.ok) {
            const result = await response.json()
            console.log("[FEED EXPANSION] Created positions:", result.positionsCreated)

            await Promise.all([mutateFeed(), mutateFeedList?.()])
          } else {
            const data = await response.json().catch(() => ({}))
            throw new Error(data.error || "Failed to expand feed")
          }
        } catch (error) {
          console.error("[FEED EXPANSION] Error:", error)
          // DRAFT copy for Sandra approval before release.
          toast({
            title: "Could not prepare your full calendar",
            description: error instanceof Error ? error.message : "Please try again.",
            variant: "destructive",
          })
        } finally {
          setIsExpandingFeed(false)
        }
      }
    }

    // Only run if we have all required data
    if (access && feedData && !isLoading) {
      expandFeedIfNeeded()
    }
  }, [access, feedData, isLoading, isExpandingFeed, mutateFeed, mutateFeedList])

  const handleBackToMaya = () => {
    if (feedNav?.navigateToMaya) return feedNav.navigateToMaya()
    router.push("/app?view=create")
  }

  const createFirstPlanWithMaya = async () => {
    if (isPlanningWithMaya) return
    if (!canPlanMonthWithMaya) {
      void trackAnalyticsEvent({
        event: "calendar_mode_selected",
        properties: { mode: "maya_create" },
      })
      handleBackToMaya()
      return
    }
    void trackAnalyticsEvent({ event: "calendar_mode_selected", properties: { mode: "maya_plan" } })
    setIsPlanningWithMaya(true)

    try {
      const response = await fetch("/api/app-v3/maya/feed-plan/draft", {
        method: "POST",
        credentials: "include",
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        if (data.reason === "missing_context") {
          setFirstPlanSettingsOpen(true)
          return
        }
        throw new Error(
          data.reason === "draft_in_progress"
            ? "Maya is already preparing your month. Please try again in a moment."
            : "Maya could not prepare your month. Please try again."
        )
      }

      let nextFeedId = Number(data.feedLayoutId) || null
      if (!nextFeedId && data.reason === "plan_exists") {
        const latest = await mutateFeed()
        nextFeedId = Number(latest?.feed?.id) || null
      }

      if (!nextFeedId) {
        throw new Error("Your month could not be opened. Please try again.")
      }

      await mutateFeedList?.()
      if (feedNav) feedNav.navigateToFeed(nextFeedId)
      else router.push(`/feed-planner?feedId=${nextFeedId}`)

      toast({
        title: "Your month is ready",
        description: "Maya planned your posts and drafted the captions.",
      })
    } catch (error) {
      toast({
        title: "Could not plan your month",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsPlanningWithMaya(false)
    }
  }

  const handlePlanWithMaya = async () => {
    if (!isCalendarPlanComplete(calendarPlanSettings)) {
      setFirstPlanSettingsOpen(true)
      return
    }
    await createFirstPlanWithMaya()
  }

  const handleQuickManualGrid = async (position: number) => {
    if (isCreatingManual || isPlanningWithMaya) return
    void trackAnalyticsEvent({ event: "calendar_mode_selected", properties: { mode: "canvas" } })
    setIsCreatingManual(true)
    try {
      const response = await fetch("/api/feed/create-manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: "{}",
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data.feedId) {
        throw new Error(data.details || data.error || "Your grid could not be created.")
      }
      await mutateFeedList?.()
      if (feedNav) feedNav.navigateToFeed(Number(data.feedId), { openPosition: position })
      else router.push(`/feed-planner?feedId=${data.feedId}`)
      toast({ title: "Your grid is ready", description: "Choose the photo for this post." })
    } catch (error) {
      toast({
        title: "Could not create your grid",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsCreatingManual(false)
    }
  }

  const handleFeedStyleConfirm = async (modalData: FeedStyleModalData) => {
    setShowFeedStyleModal(false)
    setFirstVisualDirectionMode(null)

    setIsCreatingManual(true)

    try {
      const response = await fetch("/api/feed/create-manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(modalData),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Failed to create feed" }))
        throw new Error(error.error || "Failed to create feed")
      }

      const data = await response.json()

      // Invalidate feed list cache so selector appears immediately
      if (mutateFeedList) {
        await mutateFeedList()
      }

      // Navigate to the new feed (in place when embedded in /app)
      if (feedNav) feedNav.navigateToFeed(data.feedId)
      else router.push(`/feed-planner?feedId=${data.feedId}`)

      if (modalData.feedStyle) onFeedStyleSelected?.(modalData.feedStyle)

      toast({
        // DRAFT UX copy for Sandra approval before release.
        title: "Grid created",
        description: "Your new grid is ready.",
      })
    } catch (error) {
      console.error("[v0] Error creating manual feed:", error)
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to create feed. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsCreatingManual(false)
    }
  }

  const feedStyleModal = (
    <FeedStyleModal
      open={showFeedStyleModal}
      onOpenChange={open => {
        setShowFeedStyleModal(open)
        if (!open) setFirstVisualDirectionMode(null)
        onFeedStyleModalChange?.(open)
      }}
      onConfirm={handleFeedStyleConfirm}
      mode={feedExists ? "new" : "first"}
      defaultFeedStyle={initialFeedStyle || lastFeedStyle}
      defaultFeedStyleVariationId={initialFeedStyleVariationId ?? undefined}
      isLoading={isCreatingManual}
      initialDirectionMode={firstVisualDirectionMode}
    />
  )

  // Loading state - show unified loader during initial load
  if (isLoading) {
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
          <div className="space-y-4 text-center">
            <p className="text-sm text-[color:var(--app-text-secondary)]">
              Failed to load feed. Please try again.
            </p>
            <button
              type="button"
              onClick={() => void mutateFeed()}
              disabled={isFeedValidating}
              aria-busy={isFeedValidating}
              className="min-h-11 rounded-[6px] bg-[color:var(--app-btn-primary-bg)] px-5 py-3 text-[11px] uppercase tracking-[0.16em] text-[color:var(--app-btn-primary-text)] transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Placeholder state: No feed exists (exists: false from /api/feed/latest)
  if (!feedExists || (!feedIdFromQuery && feedData?.exists === false)) {
    return (
      <>
        <div className="app-light-panel-text min-h-0 flex-1 overflow-y-auto bg-[color:var(--app-bg)] px-0 py-3 sm:px-4 lg:px-6">
          <div className="mx-auto grid w-full max-w-[1380px] min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
            <CalendarEmptyCanvas
              onPlanWithMaya={() => {
                setFirstVisualDirectionMode(null)
                setShowFeedStyleModal(true)
              }}
              onStartWithPhotos={() => void handleQuickManualGrid(1)}
              busy={isCreatingManual || isPlanningWithMaya}
            />
            <CalendarMayaWorkspace
              feedId={null}
              selectedPost={null}
              feedSummary={null}
              busy={isCreatingManual || isPlanningWithMaya}
              planSettings={calendarPlanSettings}
              onSavePlanSettings={saveCalendarPlanSettings}
              planSettingsOpen={firstPlanSettingsOpen}
              onPlanSettingsClosed={() => setFirstPlanSettingsOpen(false)}
              onPlanSettingsConfirmed={() => void createFirstPlanWithMaya()}
              onChooseVisualDirection={mode => {
                setFirstVisualDirectionMode(mode)
                setShowFeedStyleModal(true)
              }}
              onApplyProposal={async (proposal: CalendarAgentProposal) => {
                if (proposal.kind !== "create_plan")
                  throw new Error("Create your grid first, then I can change it.")
                await handlePlanWithMaya()
                return { undoAvailable: false }
              }}
              onUndo={async () => {}}
            />
          </div>
        </div>
        {feedStyleModal}
      </>
    )
  }

  // Success: Show feed view (must have effectiveFeedId at this point)
  if (!effectiveFeedId) {
    // Fallback (shouldn't happen, but TypeScript safety)
    return (
      <div className="app-light-panel-text flex min-h-0 flex-1 flex-col overflow-hidden bg-[color:var(--app-bg)]">
        <div className="flex min-h-[400px] items-center justify-center p-4">
          <div className="text-center space-y-4">
            <p className="text-sm text-[color:var(--app-text-secondary)]">
              Unable to determine feed ID.
            </p>
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

      {feedStyleModal}
    </div>
  )
}
