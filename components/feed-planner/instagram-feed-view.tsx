"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import type React from "react"
import { toast } from "@/hooks/use-toast"
import useSWR from "swr"
import { useFeedPolling } from "./hooks/use-feed-polling"
import { useFeedModals } from "./hooks/use-feed-modals"
import { useFeedDragDrop } from "./hooks/use-feed-drag-drop"
import { useFeedActions } from "./hooks/use-feed-actions"
import { useFeedConfetti } from "./hooks/use-feed-confetti"
import FeedHeader from "./feed-header"
import FeedTabs, { type FeedTab } from "./feed-tabs"
import FeedWeekView from "./feed-week-view"
import FeedGrid from "./feed-grid"
import FeedStrategy from "./feed-strategy"
import FeedCaptionTemplates from "./feed-caption-templates"
import FeedContentCalendar from "./feed-content-calendar"
import FeedBrandPillars from "./feed-brand-pillars"
import FeedMonthSummary from "./feed-month-summary"
import FeedModals from "./feed-modals"
import FeedHighlightsModal from "./feed-highlights-modal"
import FeedSinglePlaceholder from "./feed-single-placeholder"
import { CalendarMayaWorkspace } from "./calendar-maya-workspace"
import { CalendarContentContextModal } from "./calendar-content-context-modal"
import { CalendarNeedsMe } from "./calendar-needs-me"
import { CalendarBulkCreate } from "./calendar-bulk-create"
import FeedStyleModal, {
  type FeedStyle,
  type FeedStyleModalData,
  type FeedVisualDirectionMode,
} from "./feed-style-modal"
import type { CalendarAgentProposal } from "@/lib/feed-planner/calendar-agent"
import {
  calendarPlanSettingsFromProfile,
  isCalendarPlanComplete,
  type CalendarPlanSettings,
} from "@/lib/feed-planner/calendar-plan-settings"
import { useFeedNav } from "./feed-nav-context"
import type { FeedPlannerAccess } from "@/lib/feed-planner/access-control"
import { getBrandColorThemeColors } from "@/lib/style-presets"
import type { CalendarPostTarget, OutputFormat } from "@/components/app-v3/types"
import { resolveCalendarBrandLook } from "@/lib/feed-planner/calendar-brand-look"
import {
  finishMayaJob,
  recordMayaJobDecision,
  startMayaJob,
} from "@/lib/app-v3/maya/job-analytics"

const fetcher = (url: string) => fetch(url).then(res => res.json())

function plannedFormatForPost(post: any): OutputFormat {
  if (post?.pro_mode_type === "carousel-slides") return "carousel"
  if (post?.pro_mode_type === "reel-cover") return "reel-cover"
  return "photo"
}

function mediaUrlsForPost(post: any): string[] {
  const urls = Array.isArray(post?.media_urls) ? post.media_urls : []
  const safe = urls.filter(
    (url: unknown): url is string => typeof url === "string" && url.startsWith("https://")
  )
  if (safe.length > 0) return safe
  return typeof post?.image_url === "string" ? [post.image_url] : []
}

const feedPlannerShellClass = "mx-auto w-full max-w-none md:max-w-[935px]"
const feedPlannerCanvasClass = `${feedPlannerShellClass} app-light-panel-text overflow-hidden rounded-none border-y border-[color:var(--app-glass-border)] bg-white shadow-none sm:rounded-[20px] sm:border sm:bg-[rgba(255,255,255,0.72)] sm:shadow-[0_24px_70px_rgba(61,56,48,0.10)] sm:backdrop-blur-[20px]`
const feedPlannerStateClass = `${feedPlannerShellClass} app-light-panel-text flex min-h-[60vh] items-center justify-center rounded-none border-y border-[color:var(--app-glass-border)] bg-white p-4 shadow-none sm:rounded-[20px] sm:border sm:bg-[rgba(255,255,255,0.72)] sm:shadow-[0_24px_70px_rgba(61,56,48,0.10)] sm:backdrop-blur-[20px]`

interface InstagramFeedViewProps {
  feedId: number
  onBack?: () => void
  access?: FeedPlannerAccess // Phase 4.2: Access control object (replaces mode prop)
  onOpenWizard?: () => void // Callback to open wizard
  onOpenWelcomeWizard?: () => void // Callback to open welcome wizard (for paid blueprint users)
  onRequireFeedStyle?: () => void
  activationAction?: "generate" | null
}

export default function InstagramFeedView({
  feedId,
  onBack,
  access,
  onOpenWizard,
  onOpenWelcomeWizard,
  onRequireFeedStyle,
  activationAction = null,
}: InstagramFeedViewProps) {
  // Use custom hooks for all complex logic
  const { feedData, feedError, mutate, isLoading: isFeedLoading } = useFeedPolling(feedId)
  const {
    selectedPost,
    setSelectedPost,
    showGallery,
    setShowGallery,
    showProfileGallery,
    setShowProfileGallery,
  } = useFeedModals()

  // Removed excessive console.log statements that were causing performance issues during polling

  const [activeTab, setActiveTab] = useState<FeedTab>("grid")
  const [businessType, setBusinessType] = useState<string | undefined>(undefined)
  const [showBioModal, setShowBioModal] = useState(false)

  // Fetch business type from blueprint_subscribers for free users (caption templates)
  const { data: blueprintState } = useSWR(access?.isFree ? "/api/blueprint/state" : null, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000, // Cache for 1 minute
  })

  // Extract business type from blueprint state
  useEffect(() => {
    if (blueprintState?.blueprint?.formData?.business) {
      setBusinessType(blueprintState.blueprint.formData.business)
    }
  }, [blueprintState])
  const [bioText, setBioText] = useState("")
  const [isSavingBio, setIsSavingBio] = useState(false)
  const [showHighlightsModal, setShowHighlightsModal] = useState(false)
  const [selectedHighlightId, setSelectedHighlightId] = useState<number | null>(null)
  const [initialHighlightTitle, setInitialHighlightTitle] = useState<string | null>(null)
  const [isAddingRow, setIsAddingRow] = useState(false)
  const [brandColors, setBrandColors] = useState<string[]>([])
  const [activePostId, setActivePostId] = useState<number | null>(null)
  const [previewProposal, setPreviewProposal] = useState<CalendarAgentProposal | null>(null)
  const [planSettingsOpen, setPlanSettingsOpen] = useState(false)
  const [visualDirectionOpen, setVisualDirectionOpen] = useState(false)
  const [visualDirectionMode, setVisualDirectionMode] = useState<FeedVisualDirectionMode | null>(
    null
  )
  const [isSavingVisualDirection, setIsSavingVisualDirection] = useState(false)
  const calendarUndoRef = useRef<(() => Promise<void>) | null>(null)
  const feedNav = useFeedNav()
  const usesSharedSuiteMaya = Boolean(feedNav?.navigateToMaya)

  const { data: personalBrandData, mutate: mutatePersonalBrand } = useSWR(
    "/api/profile/personal-brand",
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  )
  const calendarPlanSettings = calendarPlanSettingsFromProfile(personalBrandData)
  const calendarBrandLook = resolveCalendarBrandLook({
    feed: feedData?.feed,
    personalBrand: personalBrandData,
  })
  const hasVisualDirection = Boolean(calendarBrandLook.directionMode)
  const hasContentContext = isCalendarPlanComplete(calendarPlanSettings)

  const saveCalendarPlanSettings = async (settings: CalendarPlanSettings) => {
    const response = await fetch("/api/profile/personal-brand", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        businessType: settings.businessType,
        idealAudience: settings.idealAudience,
        currentSituation: settings.currentSituation,
        transformationStory: settings.transformationStory,
        audienceChallenge: settings.audienceChallenge,
        audienceTransformation: settings.audienceTransformation,
        futureVision: settings.futureVision,
        contentGoals: settings.contentGoals,
        contentPillars: settings.contentPillars,
        ...(settings.feedStyle.trim() ? { settingsPreference: [settings.feedStyle] } : {}),
        isCompleted: true,
      }),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok)
      throw new Error(data.details || data.error || "Your plan settings could not be saved.")
    await mutatePersonalBrand()
  }

  const addGridRow = async () => {
    if (isAddingRow) return
    setIsAddingRow(true)
    try {
      const response = await fetch(`/api/feed/${feedId}/rows`, {
        method: "POST",
        credentials: "include",
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.details || data.error || "Could not add another row")
      await mutate()
      toast({ title: "Three new posts are ready", description: "Open any one when you are ready." })
    } catch (rowError) {
      toast({
        title: "Could not add another row",
        description: rowError instanceof Error ? rowError.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsAddingRow(false)
    }
  }

  useEffect(() => {
    const pendingPosition = feedNav?.pendingSlotPosition
    const posts = Array.isArray(feedData?.posts) ? feedData.posts : []
    if (!pendingPosition || posts.length === 0) return
    const post = posts.find((item: any) => Number(item.position) === pendingPosition)
    if (post?.id) setShowGallery(Number(post.id))
    feedNav?.consumePendingSlot?.()
  }, [feedData?.posts, feedNav, setShowGallery])

  useEffect(() => {
    const handleFeedUpdated = (event: Event) => {
      const changedFeedId = Number((event as CustomEvent<{ feedId?: number }>).detail?.feedId)
      if (changedFeedId === feedId) void mutate()
    }
    window.addEventListener("calendar:feed-updated", handleFeedUpdated)
    return () => window.removeEventListener("calendar:feed-updated", handleFeedUpdated)
  }, [feedId, mutate])

  // Fetch brand colors from user profile
  useEffect(() => {
    fetch("/api/profile/personal-brand")
      .then(res => res.json())
      .then(data => {
        if (data.completed && data.data) {
          // Extract colors from colorPalette (JSONB) or colorTheme
          let colors: string[] = []
          if (data.data.colorPalette) {
            try {
              const palette =
                typeof data.data.colorPalette === "string"
                  ? JSON.parse(data.data.colorPalette)
                  : data.data.colorPalette
              if (Array.isArray(palette)) {
                // Extract hex values from array (could be strings or objects with hex property)
                colors = palette
                  .map((c: any) => {
                    if (typeof c === "string") return c
                    if (c?.hex) return c.hex
                    if (c?.color) return c.color
                    return null
                  })
                  .filter(Boolean)
              }
            } catch (e) {
              console.error("[v0] Failed to parse colorPalette:", e)
            }
          }
          // Fallback to theme-based colors if no palette
          if (colors.length === 0 && data.data.colorTheme) {
            colors = getBrandColorThemeColors(data.data.colorTheme)
          }
          if (colors.length > 0) {
            setBrandColors(colors)
          }
        }
      })
      .catch(err => console.error("[v0] Failed to fetch brand colors:", err))
  }, [])

  // Initialize bio text when modal opens
  useEffect(() => {
    if (showBioModal) {
      setBioText(feedData?.bio?.bio_text || "")
    }
  }, [showBioModal, feedData?.bio?.bio_text])

  const handleOpenBio = () => {
    if (!feedId) return
    setBioText(feedData?.bio?.bio_text || "")
    setShowBioModal(true)
  }

  const handleGenerateBio = async () => {
    if (!feedId) return

    setIsSavingBio(true)

    try {
      // Generate bio using AI
      const response = await fetch(`/api/feed/${feedId}/generate-bio`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to generate bio" }))
        throw new Error(errorData.error || "Failed to generate bio")
      }

      const data = await response.json()

      if (data.bio) {
        setBioText(data.bio)
        setIsSavingBio(false)
        await mutate() // Refresh feed data
        toast({
          title: "Bio generated",
          description: "Your AI-generated bio is ready. You can edit it if needed.",
        })
      } else {
        throw new Error("No bio generated")
      }
    } catch (error) {
      console.error("[v0] Error generating bio:", error)
      setIsSavingBio(false)
      const errorMessage =
        error instanceof Error ? error.message : "Failed to generate bio. Please try again."

      // If generation fails, load existing bio if available
      if (feedData?.bio?.bio_text) {
        setBioText(feedData.bio.bio_text)
      }

      // Check if it's a brand profile error
      if (errorMessage.includes("brand profile")) {
        toast({
          title: "Brand Profile Required",
          description: "Please complete your personal brand profile first to generate a bio.",
          variant: "destructive",
        })
        setShowBioModal(false)
      } else {
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        })
      }
    } finally {
      setIsSavingBio(false)
    }
  }

  const handleSaveBio = async () => {
    if (!feedId || !bioText.trim()) return

    setIsSavingBio(true)
    try {
      const response = await fetch(`/api/feed/${feedId}/update-bio`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ bioText: bioText.trim() }),
      })

      if (!response.ok) {
        throw new Error("Failed to save bio")
      }

      await mutate() // Refresh feed data
      setShowBioModal(false)
      toast({
        title: "Bio saved",
        description: "Your bio has been updated",
      })
    } catch (error) {
      console.error("[v0] Error saving bio:", error)
      toast({
        title: "Error",
        description: "Failed to save bio. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSavingBio(false)
    }
  }

  // Memoize posts to prevent unnecessary re-renders
  // NOTE: This hook MUST be called before any early returns to comply with Rules of Hooks
  const posts = useMemo(() => {
    return feedData?.posts
      ? [...feedData.posts].sort((a: any, b: any) => a.position - b.position)
      : []
  }, [feedData?.posts])

  // Derived state from feedData (single source of truth)
  // SIMPLIFIED: A post is complete if it has an image_url (regardless of generation_status)
  const postStatuses = useMemo(() => {
    if (!feedData?.posts) return []

    return feedData.posts.map((post: any) => ({
      id: post.id,
      position: post.position,
      status: post.generation_status,
      hasImage: !!post.image_url,
      // Simplified: isGenerating = has prediction_id but no image_url yet
      isGenerating: !!post.prediction_id && !post.image_url,
      // Simplified: isComplete = has image_url (regardless of status - images are ready to preview)
      isComplete: !!post.image_url,
      imageUrl: post.image_url,
      predictionId: post.prediction_id,
    }))
  }, [feedData])

  // Use hooks for complex logic
  const dragDrop = useFeedDragDrop(posts, feedId, mutate)
  const actions = useFeedActions(feedId, posts, feedData, mutate, onBack)

  // Calculate ready posts for confetti
  const readyPosts = postStatuses.filter((p: any) => p.isComplete).length
  useFeedConfetti(readyPosts)

  // Log post status for debugging - only log once per feed load to prevent excessive logging during polling
  useEffect(() => {
    if (!feedData?.posts) return

    const postsWithoutPrediction = feedData.posts.filter(
      (p: any) => !p.prediction_id && p.generation_status !== "completed" && !p.image_url
    )

    if (postsWithoutPrediction.length > 0) {
      // Only log once per feed load, not on every render
      const hasLogged = sessionStorage.getItem(`warned-no-prediction-${feedId}`)
      if (!hasLogged) {
        const feedCreatedRecently = feedData.feed?.created_at
          ? Date.now() - new Date(feedData.feed.created_at).getTime() < 120000 // 2 minutes
          : false

        if (feedCreatedRecently) {
          console.log(
            `[v0] ⏳ Feed was just created - queue-all-images is processing ${postsWithoutPrediction.length} posts in background. SWR will poll for updates...`
          )
        } else {
          console.log(
            `[v0] ⚠️ Found ${postsWithoutPrediction.length} posts without prediction_id. If this persists, use the "Generate All" button.`
          )
        }
        sessionStorage.setItem(`warned-no-prediction-${feedId}`, "true")
      }
    }
  }, [feedData?.feed?.created_at, feedData?.posts, feedId])

  // Handle error responses
  if (feedData?.error) {
    return (
      <div className={feedPlannerStateClass}>
        <div className="text-center space-y-4">
          <h2 className="text-xl font-light uppercase tracking-[0.15em] text-[color:var(--app-text-primary)]">
            Feed Not Found
          </h2>
          <p className="text-sm text-[color:var(--app-text-secondary)]">{feedData.error}</p>
          {onBack && (
            <button
              onClick={onBack}
              className="text-sm text-[color:var(--app-text-secondary)] underline hover:text-[color:var(--app-text-primary)]"
            >
              Go back
            </button>
          )}
        </div>
      </div>
    )
  }

  // No loading indicator - show feed view immediately (data loads in background)

  // Handle error responses (check both feedData.error and feedError from SWR)
  if (feedError || feedData?.error) {
    return (
      <div className={feedPlannerStateClass}>
        <div className="text-center space-y-4 max-w-md">
          <h2 className="text-xl font-light uppercase tracking-[0.15em] text-[color:var(--app-text-primary)]">
            Feed Not Found
          </h2>
          <p className="text-sm text-[color:var(--app-text-secondary)]">
            {feedData?.error || feedError?.message || "Unable to load feed data"}
          </p>
          {onBack && (
            <button
              onClick={onBack}
              className="mt-4 text-sm text-[color:var(--app-text-secondary)] underline hover:text-[color:var(--app-text-primary)]"
            >
              Go back and create a new feed
            </button>
          )}
        </div>
      </div>
    )
  }

  // Handle missing feed data or missing feed object
  // Only check after loading is complete to avoid false errors during initial load
  if (!isFeedLoading && (!feedData || !feedData.feed)) {
    // Check if this is a valid "no feed exists" response
    if (feedData?.exists === false) {
      // This is a valid response - feed doesn't exist, let parent handle it
      // Return null to let FeedViewScreen show the empty state
      return null
    }

    // If feedData is an empty object (no keys), treat it as still loading
    if (feedData && typeof feedData === "object" && Object.keys(feedData).length === 0) {
      return null
    }

    // If we have an error in the response, show that
    if (feedData?.error) {
      return (
        <div className={feedPlannerStateClass}>
          <div className="text-center space-y-4 max-w-md">
            <h2 className="text-xl font-light uppercase tracking-[0.15em] text-[color:var(--app-text-primary)]">
              Feed Not Found
            </h2>
            <p className="text-sm text-[color:var(--app-text-secondary)]">{feedData.error}</p>
            {onBack && (
              <button
                onClick={onBack}
                className="mt-4 text-sm text-[color:var(--app-text-secondary)] underline hover:text-[color:var(--app-text-primary)]"
              >
                Go back
              </button>
            )}
          </div>
        </div>
      )
    }

    // Only log error if we're not loading and data structure is actually invalid
    // (feedData exists, has keys, but has no feed and no exists flag)
    if (
      feedData &&
      typeof feedData === "object" &&
      Object.keys(feedData).length > 0 &&
      !feedData.exists &&
      !feedData.error
    ) {
      console.error("[v0] Feed data exists but feed object is missing:", {
        hasFeedData: !!feedData,
        feedDataKeys: feedData ? Object.keys(feedData) : [],
        feedDataError: feedData?.error,
        feedDataFeed: feedData?.feed,
        feedDataExists: feedData?.exists,
        feedId,
        feedError: feedError,
        isFeedLoading,
      })

      // Show error UI for invalid data structure
      return (
        <div className={feedPlannerStateClass}>
          <div className="text-center space-y-4 max-w-md">
            <h2 className="text-xl font-light uppercase tracking-[0.15em] text-[color:var(--app-text-primary)]">
              Invalid Feed Data
            </h2>
            <p className="text-sm text-[color:var(--app-text-secondary)]">
              The feed data structure is invalid. Please try creating a new feed.
            </p>
            {onBack && (
              <button
                onClick={onBack}
                className="mt-4 text-sm text-[color:var(--app-text-secondary)] underline hover:text-[color:var(--app-text-primary)]"
              >
                Go back
              </button>
            )}
          </div>
        </div>
      )
    }

    // During initial load or when feedData is undefined, return null to let parent handle it
    return null
  }

  // If still loading, return null to let parent handle the loading state
  if (isFeedLoading && !feedData) {
    return null
  }

  // All hooks must be declared before this point (Rules of Hooks)
  // The 'posts' useMemo has been moved above the early returns

  // Use reorderedPosts from drag-drop hook
  const baseDisplayPosts = dragDrop.reorderedPosts
  const displayPosts = (() => {
    if (!previewProposal) return baseDisplayPosts
    if (previewProposal.kind === "update_caption") {
      return baseDisplayPosts.map((post: any) =>
        Number(post.id) === previewProposal.postId
          ? { ...post, caption: previewProposal.caption, calendar_preview: true }
          : post
      )
    }
    if (previewProposal.kind === "move_post") {
      const source = baseDisplayPosts.find(
        (post: any) => Number(post.id) === previewProposal.postId
      )
      const target = baseDisplayPosts.find(
        (post: any) => Number(post.position) === previewProposal.targetPosition
      )
      if (!source || !target) return baseDisplayPosts
      return baseDisplayPosts
        .map((post: any) => {
          if (Number(post.id) === Number(source.id))
            return { ...post, position: target.position, calendar_preview: true }
          if (Number(post.id) === Number(target.id))
            return { ...post, position: source.position, calendar_preview: true }
          return post
        })
        .sort((a: any, b: any) => Number(a.position) - Number(b.position))
    }
    return baseDisplayPosts
  })()
  const activePost = displayPosts.find((post: any) => Number(post.id) === activePostId) ?? null
  const liveSelectedPost = selectedPost ? (activePost ?? selectedPost) : null
  const calendarPostTarget = (
    post: any,
    requestedAction: CalendarPostTarget["requestedAction"] = "create"
  ): CalendarPostTarget => ({
    requestId: `calendar:${feedId}:${Number(post.id)}`,
    feedId,
    postId: Number(post.id),
    position: Number(post.position),
    caption: typeof post.caption === "string" ? post.caption : null,
    contentPillar: typeof post.content_pillar === "string" ? post.content_pillar : null,
    scheduledAt: typeof post.scheduled_at === "string" ? post.scheduled_at : null,
    plannedFormat: plannedFormatForPost(post),
    hasImage: Boolean(post.image_url),
    imageUrl: typeof post.image_url === "string" ? post.image_url : null,
    mediaUrls: mediaUrlsForPost(post),
    aiImageId:
      typeof post.ai_image_id === "number" && Number.isInteger(post.ai_image_id)
        ? post.ai_image_id
        : null,
    feedTitle: feedData?.feed?.brand_name || feedData?.feed?.title || "Current grid",
    requestedAction,
  })
  const openPostStudio = (post: any) => {
    setPlanSettingsOpen(false)
    setActivePostId(Number(post.id))
    setSelectedPost(post)
  }

  const refreshCalendar = async () => {
    await mutate()
    window.dispatchEvent(new CustomEvent("calendar:feed-updated", { detail: { feedId } }))
  }

  const openVisualDirection = (mode: FeedVisualDirectionMode | null = null) => {
    startMayaJob({
      job: "improve_grid",
      surface: "calendar",
      entry: mode ? `visual_direction_${mode}` : "visual_direction",
    })
    setPlanSettingsOpen(false)
    setVisualDirectionMode(mode)
    setVisualDirectionOpen(true)
  }

  const saveVisualDirection = async (data: FeedStyleModalData) => {
    setIsSavingVisualDirection(true)
    recordMayaJobDecision("improve_grid")
    try {
      await requestCalendarMutation(`/api/feed/${feedId}/update-style`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      })
      setVisualDirectionOpen(false)
      await refreshCalendar()
      toast({
        title: "Visual direction saved",
        description: "Maya will use this direction as she creates each post.",
      })
      finishMayaJob({ job: "improve_grid", outcome: "completed" })
    } catch (error) {
      toast({
        title: "Could not save the direction",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSavingVisualDirection(false)
    }
  }

  const requestCalendarMutation = async (url: string, init: RequestInit) => {
    const response = await fetch(url, init)
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      void mutate()
      throw new Error(data.details || data.error || "The grid could not be updated.")
    }
    return data
  }

  const applyCalendarProposal = async (
    proposal: CalendarAgentProposal
  ): Promise<{ undoAvailable: boolean }> => {
    if (proposal.kind === "create_plan") {
      throw new Error("This grid already exists. Tell Maya what you want to change.")
    }

    if (proposal.kind === "open_style_picker") {
      openVisualDirection(null)
      calendarUndoRef.current = null
      return { undoAvailable: false }
    }
    if (proposal.kind === "open_highlights") {
      setShowHighlightsModal(true)
      calendarUndoRef.current = null
      return { undoAvailable: false }
    }

    const post =
      "postId" in proposal
        ? displayPosts.find((item: any) => Number(item.id) === proposal.postId)
        : null

    if (proposal.kind === "open_photo_picker") {
      const galleryPost = displayPosts.find((item: any) => Number(item.id) === proposal.postId)
      if (!galleryPost) throw new Error("Select the post you want to fill first.")
      setShowGallery(Number(galleryPost.id))
      calendarUndoRef.current = null
      return { undoAvailable: false }
    }

    if (proposal.kind === "update_caption") {
      if (!post) throw new Error("That post is no longer in this grid.")
      const previousCaption = typeof post.caption === "string" ? post.caption : ""
      await mutate(
        {
          ...feedData,
          posts: feedData.posts.map((item: any) =>
            Number(item.id) === proposal.postId ? { ...item, caption: proposal.caption } : item
          ),
        },
        { revalidate: false }
      )
      await requestCalendarMutation(`/api/feed/${feedId}/update-caption`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: proposal.postId, caption: proposal.caption }),
      })
      calendarUndoRef.current = async () => {
        await requestCalendarMutation(`/api/feed/${feedId}/update-caption`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ postId: proposal.postId, caption: previousCaption }),
        })
        await refreshCalendar()
      }
    } else if (proposal.kind === "update_bio") {
      const previousBio = typeof feedData?.bio?.bio_text === "string" ? feedData.bio.bio_text : ""
      await requestCalendarMutation(`/api/feed/${feedId}/update-bio`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bioText: proposal.bio }),
      })
      calendarUndoRef.current = previousBio
        ? async () => {
            await requestCalendarMutation(`/api/feed/${feedId}/update-bio`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ bioText: previousBio }),
            })
            await refreshCalendar()
          }
        : null
    } else if (proposal.kind === "move_post") {
      if (!post) throw new Error("That post is no longer in this grid.")
      const target = displayPosts.find(
        (item: any) => Number(item.position) === proposal.targetPosition
      )
      if (!target) throw new Error("That position is not available in this grid.")
      const originalOrders = displayPosts.map((item: any) => ({
        postId: Number(item.id),
        newPosition: Number(item.position),
      }))
      const nextOrders = originalOrders.map(order => {
        if (order.postId === Number(post.id))
          return { ...order, newPosition: Number(target.position) }
        if (order.postId === Number(target.id))
          return { ...order, newPosition: Number(post.position) }
        return order
      })
      await mutate(
        {
          ...feedData,
          posts: feedData.posts.map((item: any) => {
            const order = nextOrders.find(next => next.postId === Number(item.id))
            return order ? { ...item, position: order.newPosition } : item
          }),
        },
        { revalidate: false }
      )
      await requestCalendarMutation(`/api/feed/${feedId}/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postOrders: nextOrders }),
      })
      calendarUndoRef.current = async () => {
        await requestCalendarMutation(`/api/feed/${feedId}/reorder`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ postOrders: originalOrders }),
        })
        await refreshCalendar()
      }
    } else if (proposal.kind === "generate_image") {
      if (!post) throw new Error("That post is no longer in this grid.")
      if (post.image_url)
        throw new Error("This post already has a photo. Select an empty post first.")
      await mutate(
        {
          ...feedData,
          posts: feedData.posts.map((item: any) =>
            Number(item.id) === proposal.postId
              ? {
                  ...item,
                  generation_status: "generating",
                  prediction_id: `temp-calendar-${Date.now()}`,
                }
              : item
          ),
        },
        { revalidate: false }
      )
      const generation = await requestCalendarMutation(`/api/feed/${feedId}/generate-single`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: proposal.postId }),
      })
      if (generation.predictionId) {
        await mutate(
          {
            ...feedData,
            posts: feedData.posts.map((item: any) =>
              Number(item.id) === proposal.postId
                ? {
                    ...item,
                    generation_status: "generating",
                    prediction_id: generation.predictionId,
                  }
                : item
            ),
          },
          { revalidate: false }
        )
      }
      calendarUndoRef.current = async () => {
        await requestCalendarMutation(`/api/feed/${feedId}/remove-post-image`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ postId: proposal.postId }),
        })
        await refreshCalendar()
      }
    }

    setPreviewProposal(null)
    await refreshCalendar()
    return { undoAvailable: Boolean(calendarUndoRef.current) }
  }

  const undoCalendarProposal = async () => {
    const undo = calendarUndoRef.current
    if (!undo) return
    calendarUndoRef.current = null
    await undo()
  }

  // Feed Planner Phase 2b: distinct pillars across this month's posts, for the "About this
  // month" strip (replaces the retired standalone Pillars tab for paid/membership users).
  // Plain computation, not useMemo - this function has early returns above and below this
  // point, and a hook here would violate Rules of Hooks on the renders that hit them.
  const monthPillars: string[] = (() => {
    const seen = new Set<string>()
    for (const post of displayPosts || []) {
      const pillar = typeof post?.content_pillar === "string" ? post.content_pillar.trim() : ""
      if (pillar) seen.add(pillar)
    }
    return Array.from(seen)
  })()

  const calendarMayaWorkspace =
    !access?.isFree && !usesSharedSuiteMaya ? (
      <CalendarMayaWorkspace
        feedId={feedId}
        displayMode={selectedPost ? "embedded" : "sidebar"}
        selectedPost={
          activePost
            ? {
                id: Number(activePost.id),
                position: Number(activePost.position),
                caption: activePost.caption ?? null,
                contentPillar: activePost.content_pillar ?? null,
                scheduledAt: activePost.scheduled_at ?? null,
                hasImage: Boolean(activePost.image_url),
                imageUrl: activePost.image_url ?? null,
              }
            : null
        }
        feedSummary={{
          title: feedData?.feed?.brand_name || feedData?.feed?.title || "Current grid",
          bio: feedData?.bio?.bio_text || null,
          visualDirectionMode: calendarBrandLook.directionMode,
          visualDirectionBrief: feedData?.feed?.visual_direction_brief || null,
          inspirationImageUrl: feedData?.feed?.inspiration_image_url || null,
          feedStyle: calendarBrandLook.feedStyle,
          feedStyleVariationId: calendarBrandLook.feedStyleVariationId,
          posts: displayPosts.map((post: any) => ({
            id: Number(post.id),
            position: Number(post.position),
            caption: post.caption ?? null,
            contentPillar: post.content_pillar ?? null,
            scheduledAt: post.scheduled_at ?? null,
            hasImage: Boolean(post.image_url),
            imageUrl: post.image_url ?? null,
            generationStatus: post.generation_status ?? null,
            predictionId: post.prediction_id ?? null,
          })),
        }}
        onApplyProposal={applyCalendarProposal}
        onUndo={undoCalendarProposal}
        planSettings={calendarPlanSettings}
        onSavePlanSettings={saveCalendarPlanSettings}
        planSettingsOpen={planSettingsOpen}
        onPlanSettingsClosed={() => setPlanSettingsOpen(false)}
        onPreviewProposal={setPreviewProposal}
        onClearPreview={() => setPreviewProposal(null)}
        onOpenPostDetails={postId => {
          const post = displayPosts.find((item: any) => Number(item.id) === postId)
          if (post) openPostStudio(post)
        }}
        onClearSelectedPost={() => setActivePostId(null)}
        onOpenPhotoPicker={postId => {
          const galleryPost = displayPosts.find((item: any) => Number(item.id) === postId)
          if (galleryPost) setShowGallery(Number(galleryPost.id))
        }}
        onPostUpdated={async updatedPost => {
          if (updatedPost && typeof updatedPost === "object") {
            setSelectedPost((current: any | null) =>
              current?.id === (updatedPost as any).id
                ? { ...current, ...(updatedPost as Record<string, unknown>) }
                : current
            )
          }
          await mutate()
        }}
        onCreateNewGrid={onRequireFeedStyle}
        onChooseVisualDirection={openVisualDirection}
        hasVisualDirection={hasVisualDirection}
        hasContentContext={hasContentContext}
        onOpenContentContext={() => setPlanSettingsOpen(true)}
      />
    ) : null

  return (
    <div className="mx-auto grid w-full max-w-[1380px] min-w-0 gap-4 px-0 py-3 sm:px-4 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start lg:px-6">
      <div className={feedPlannerCanvasClass}>
        <FeedHeader
          feedData={feedData}
          currentFeedId={feedId}
          onBack={feedNav ? undefined : onBack}
          onProfileImageClick={
            access?.hasGalleryAccess ? () => setShowProfileGallery(true) : undefined
          }
          onWriteBio={handleOpenBio}
          onCreateHighlights={() => {
            setSelectedHighlightId(null)
            setInitialHighlightTitle(null)
            setShowHighlightsModal(true)
          }}
          onCreateHighlight={title => {
            setSelectedHighlightId(null)
            setInitialHighlightTitle(title)
            setShowHighlightsModal(true)
          }}
          onHighlightClick={highlight => {
            setSelectedHighlightId(Number(highlight.id) || null)
            setInitialHighlightTitle(null)
            setShowHighlightsModal(true)
          }}
          onAddRow={() => void addGridRow()}
          isAddingRow={isAddingRow}
          onOpenWizard={() => setPlanSettingsOpen(true)}
          onOpenWelcomeWizard={onOpenWelcomeWizard}
          access={access}
          showProfileDetails
          onOpenVisualDirection={() => openVisualDirection(null)}
          workspaceNavigation={
            <FeedTabs
              activeTab={activeTab}
              onTabChange={setActiveTab}
              access={access}
              currentFeedId={feedId}
            />
          }
        />

        {!access?.isFree ? (
          <>
            <CalendarNeedsMe
              posts={displayPosts}
              hasVisualDirection={hasVisualDirection}
              hasContentContext={hasContentContext}
              onSelectPost={openPostStudio}
              onChooseVisualDirection={() => openVisualDirection(null)}
              onOpenContentContext={() => setPlanSettingsOpen(true)}
            />
            <CalendarBulkCreate
              feedId={feedId}
              posts={displayPosts}
              operatingLayerEnabled={feedNav?.operatingLayerEnabled === true}
              onRefresh={() => mutate()}
              onComplete={() => mutate()}
            />
          </>
        ) : null}

        {!access?.isFree && activeTab === "plan" && (
          <FeedMonthSummary
            themeSummary={feedData?.feed?.overall_vibe}
            schedulingRationale={feedData?.feed?.strategic_rationale}
            feedStory={feedData?.feed?.feed_story}
            visualRhythm={feedData?.feed?.visual_rhythm}
            pillars={monthPillars}
            posts={displayPosts}
          />
        )}

        <div className="pb-20">
          {activeTab === "plan" && !access?.isFree && (
            <FeedWeekView posts={displayPosts} onPostClick={openPostStudio} />
          )}

          {activeTab === "grid" && (
            <>
              {/* Show single placeholder for preview feeds OR free users, full grid for paid users with full feeds */}
              {/* Preview feeds (layout_type='preview') always show single placeholder regardless of user access */}
              {feedData?.feed?.layout_type === "preview" || access?.placeholderType === "single" ? (
                <FeedSinglePlaceholder
                  feedId={feedId}
                  post={displayPosts?.[0] || null}
                  onAddImage={() => {
                    const postId = Number(displayPosts?.[0]?.id)
                    if (postId) setShowGallery(postId)
                  }} // Open gallery for free users
                  onGenerateImage={() => mutate()} // Refresh feed data after generation
                  onRequireFeedStyle={() => openVisualDirection(null)}
                  onRequireOnboarding={onOpenWizard}
                  autoGenerateOnce={activationAction === "generate"}
                />
              ) : (
                <>
                  <FeedGrid
                    posts={displayPosts}
                    postStatuses={postStatuses}
                    draggedIndex={dragDrop.draggedIndex}
                    isSavingOrder={dragDrop.isSavingOrder}
                    feedId={feedId}
                    access={access} // Phase 5.1: Pass access control for image generation
                    activePostId={activePostId}
                    onPostClick={openPostStudio}
                    onAddImage={setShowGallery}
                    onGenerateImage={async (_postId: number) => await mutate()} // Phase 5.1: Refresh feed data after generation
                    onRequireFeedStyle={() => openVisualDirection(null)}
                    onRequireOnboarding={onOpenWizard}
                    onDragStart={dragDrop.handleDragStart}
                    onDragOver={dragDrop.handleDragOver}
                    onDragEnd={dragDrop.handleDragEnd}
                    onMovePost={dragDrop.movePost}
                  />
                </>
              )}
            </>
          )}

          {/* Free users can still view the legacy caption templates. */}
          {activeTab === "captions" && access?.isFree && (
            <FeedCaptionTemplates businessType={businessType} />
          )}

          {/* Strategy tab: Show Content Calendar for free users, FeedStrategy for paid/membership */}
          {activeTab === "strategy" && access?.canGenerateStrategy && (
            <>
              {access.isFree ? (
                <FeedContentCalendar />
              ) : (
                <FeedStrategy feedData={feedData} feedId={feedId} onStrategyGenerated={mutate} />
              )}
            </>
          )}

          {/* Brand Pillars tab - show for all users */}
          {activeTab === "pillars" && <FeedBrandPillars businessType={businessType} />}
        </div>

        <FeedModals
          selectedPost={liveSelectedPost}
          showGallery={showGallery}
          showProfileGallery={showProfileGallery}
          feedId={feedId}
          feedData={feedData}
          access={access} // Phase 8.1: Pass access control for gallery access
          onClosePost={() => setSelectedPost(null)}
          onCloseGallery={() => setShowGallery(null)}
          onCloseProfileGallery={() => setShowProfileGallery(false)}
          onShowGallery={setShowGallery}
          onNavigateToMaya={requestedAction => {
            if (usesSharedSuiteMaya && liveSelectedPost) {
              const target = calendarPostTarget(liveSelectedPost, requestedAction)
              setSelectedPost(null)
              feedNav?.navigateToMaya?.(target)
              return
            }
            actions.navigateToMayaChat()
          }}
          mayaWorkspace={calendarMayaWorkspace}
          operatingLayerEnabled={feedNav?.operatingLayerEnabled === true}
          onUpdate={async (updatedPost?: any) => {
            console.log(
              "[v0] onUpdate called with post:",
              updatedPost?.id,
              "has feedData:",
              !!feedData
            )

            if (updatedPost && feedData?.posts) {
              setSelectedPost((current: any | null) =>
                current?.id === updatedPost.id ? { ...current, ...updatedPost } : current
              )
              // Find the post index
              const postIndex = feedData.posts.findIndex((p: any) => p.id === updatedPost.id)
              console.log("[v0] Found post at index:", postIndex)

              if (postIndex !== -1) {
                // Optimistic update: immediately update the cache with the new post data
                const updatedPosts = [...feedData.posts]
                updatedPosts[postIndex] = { ...updatedPosts[postIndex], ...updatedPost }

                const optimisticData = {
                  ...feedData,
                  posts: updatedPosts,
                }

                console.log("[v0] Applying optimistic update for post:", updatedPost.id)
                // Update cache optimistically (no revalidation, instant UI update)
                await mutate(optimisticData, { revalidate: false })
                return
              }
            }

            // Then revalidate in background to get fresh data from server
            // This ensures we have the latest data but doesn't block the UI update
            console.log("[v0] Triggering background revalidation")
            await mutate(undefined, { revalidate: true })
          }}
        />

        {/* Bio Editing Modal */}
        {showBioModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <button
              type="button"
              className="absolute inset-0"
              aria-label="Close bio editor"
              onClick={() => !isSavingBio && setShowBioModal(false)}
            />
            <dialog
              open
              aria-label="Edit bio"
              className="relative z-[1] m-0 w-full max-w-md space-y-4 rounded-[20px] border border-[color:var(--app-glass-border)] bg-white p-6 text-[color:var(--app-text-primary)] shadow-[0_24px_70px_rgba(61,56,48,0.16)]"
            >
              <h2
                className="text-lg font-light uppercase tracking-[0.12em]"
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                {isSavingBio ? "Creating Your Bio" : bioText ? "Edit Bio" : "Create Bio"}
              </h2>
              {isSavingBio ? (
                <div className="flex flex-col items-center justify-center py-8 space-y-4">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-[color:var(--app-glass-border)] border-t-[color:var(--app-text-primary)]" />
                  <div className="text-center space-y-2">
                    <p className="text-sm font-medium text-[color:var(--app-text-primary)]">
                      I&apos;m crafting your perfect bio...
                    </p>
                    <p className="text-xs text-[color:var(--app-text-secondary)]">
                      This will just take a moment.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm leading-relaxed text-[color:var(--app-text-secondary)]">
                    {/* DRAFT UX copy for Sandra approval before release. */}
                    Maya can write and save a bio for this grid. You can edit it afterward.
                  </p>
                  <textarea
                    value={bioText}
                    onChange={e => setBioText(e.target.value)}
                    placeholder="Write your Instagram bio here..."
                    className="h-32 w-full resize-none rounded-[8px] border border-[color:var(--app-input-border)] bg-[color:var(--app-input-bg)] p-3 text-sm text-[color:var(--app-text-primary)] placeholder:text-[color:var(--app-text-muted)] focus:outline-none focus:ring-1 focus:ring-[color:var(--app-focus-ring)]"
                    maxLength={150}
                    disabled={isSavingBio}
                  />
                  <div className="text-right text-xs text-[color:var(--app-text-secondary)]">
                    {bioText.length}/150 characters
                  </div>
                </>
              )}
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowBioModal(false)}
                  disabled={isSavingBio}
                  className="min-h-11 rounded-[8px] px-4 text-sm text-[color:var(--app-text-secondary)] transition-colors hover:text-[color:var(--app-text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>
                {!isSavingBio && (
                  <button
                    type="button"
                    onClick={handleGenerateBio}
                    className="min-h-11 rounded-[8px] border border-[color:var(--app-glass-border)] bg-[color:var(--app-btn-secondary-bg)] px-4 text-sm text-[color:var(--app-text-primary)] transition-colors hover:bg-[color:var(--app-btn-secondary-hover)]"
                  >
                    {bioText ? "Regenerate with Maya" : "Generate with Maya"}
                  </button>
                )}
                {!isSavingBio && bioText && (
                  <button
                    type="button"
                    onClick={handleSaveBio}
                    disabled={!bioText.trim()}
                    className="min-h-11 rounded-[8px] bg-[color:var(--app-text-primary)] px-4 text-sm uppercase tracking-[0.16em] text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Save
                  </button>
                )}
              </div>
            </dialog>
          </div>
        )}

        {/* Highlights Modal */}
        <FeedHighlightsModal
          feedId={feedId}
          isOpen={showHighlightsModal}
          onClose={() => setShowHighlightsModal(false)}
          onSave={async () => {
            await mutate() // Refresh feed data to show updated highlights
          }}
          existingHighlights={feedData?.highlights || []}
          initialHighlightId={selectedHighlightId}
          initialSequenceTitle={initialHighlightTitle}
          onCreateWithMaya={feedNav?.navigateToMayaForStory}
          brandColors={
            brandColors.length > 0
              ? brandColors
              : feedData?.feed?.color_palette
                ? typeof feedData.feed.color_palette === "string"
                  ? JSON.parse(feedData.feed.color_palette)
                      .filter((c: any) => typeof c === "string")
                      .slice(0, 8)
                  : Array.isArray(feedData.feed.color_palette)
                    ? feedData.feed.color_palette
                        .filter((c: any) => typeof c === "string")
                        .slice(0, 8)
                    : Object.values(feedData.feed.color_palette)
                        .filter((c: any) => typeof c === "string")
                        .slice(0, 8)
                : []
          }
        />
        <FeedStyleModal
          open={visualDirectionOpen}
          onOpenChange={setVisualDirectionOpen}
          onConfirm={saveVisualDirection}
          mode="style"
          initialDirectionMode={visualDirectionMode ?? calendarBrandLook.directionMode}
          initialVisualDirectionBrief={feedData?.feed?.visual_direction_brief ?? null}
          initialInspirationImageUrl={feedData?.feed?.inspiration_image_url ?? null}
          defaultFeedStyle={calendarBrandLook.feedStyle as FeedStyle | null}
          defaultFeedStyleVariationId={calendarBrandLook.feedStyleVariationId}
          isLoading={isSavingVisualDirection}
        />
        <CalendarContentContextModal
          open={usesSharedSuiteMaya && planSettingsOpen}
          settings={calendarPlanSettings}
          onClose={() => setPlanSettingsOpen(false)}
          onSave={saveCalendarPlanSettings}
        />
      </div>
      {!selectedPost ? calendarMayaWorkspace : null}
    </div>
  )
}
