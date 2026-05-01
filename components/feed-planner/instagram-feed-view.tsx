"use client"

import { useState, useMemo, useEffect } from "react"
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
import FeedGrid from "./feed-grid"
import FeedPostsList from "./feed-posts-list"
import FeedStrategy from "./feed-strategy"
import FeedCaptionTemplates from "./feed-caption-templates"
import FeedContentCalendar from "./feed-content-calendar"
import FeedBrandPillars from "./feed-brand-pillars"
import FeedModals from "./feed-modals"
import FeedLoadingOverlay from "./feed-loading-overlay"
import FeedHighlightsModal from "./feed-highlights-modal"
import FeedSinglePlaceholder from "./feed-single-placeholder"
import type { FeedPlannerAccess } from "@/lib/feed-planner/access-control"
import { getBrandColorThemeColors } from "@/lib/style-presets"
import {
  MAYA_MODE_STORAGE_KEY,
  MAYA_MODE_TOUCHED_STORAGE_KEY,
  readMayaProModePreference,
  writeMayaProModePreference,
} from "@/lib/maya/mode-storage"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

const feedPlannerShellClass = "mx-auto w-full max-w-none md:max-w-[935px]"
const feedPlannerCanvasClass = `${feedPlannerShellClass} app-light-panel-text overflow-hidden rounded-[20px] border border-[color:var(--app-glass-border)] bg-[rgba(255,255,255,0.72)] shadow-[0_24px_70px_rgba(61,56,48,0.10)] backdrop-blur-[20px]`
const feedPlannerStateClass = `${feedPlannerShellClass} app-light-panel-text flex min-h-[60vh] items-center justify-center rounded-[20px] border border-[color:var(--app-glass-border)] bg-[rgba(255,255,255,0.72)] p-4 shadow-[0_24px_70px_rgba(61,56,48,0.10)] backdrop-blur-[20px]`

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
  const { feedData, feedError, mutate, isLoading: isFeedLoading, isValidating, isTakingLonger } = useFeedPolling(feedId)
  const { selectedPost, setSelectedPost, showGallery, setShowGallery, showProfileGallery, setShowProfileGallery } = useFeedModals()
  
  // Removed excessive console.log statements that were causing performance issues during polling

  const [activeTab, setActiveTab] = useState<FeedTab>("grid")
  const [businessType, setBusinessType] = useState<string | undefined>(undefined)
  const [showBioModal, setShowBioModal] = useState(false)
  
  // Fetch business type from blueprint_subscribers for free users (caption templates)
  const { data: blueprintState } = useSWR(
    access?.isFree ? "/api/blueprint/state" : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // Cache for 1 minute
    }
  )

  // Extract business type from blueprint state
  useEffect(() => {
    if (blueprintState?.blueprint?.formData?.business) {
      setBusinessType(blueprintState.blueprint.formData.business)
    }
  }, [blueprintState])
  const [bioText, setBioText] = useState("")
  const [isSavingBio, setIsSavingBio] = useState(false)
  const [showHighlightsModal, setShowHighlightsModal] = useState(false)
  const [brandColors, setBrandColors] = useState<string[]>([])
  const [generationMode, setGenerationMode] = useState<"classic" | "pro">(() => {
    return readMayaProModePreference() ? "pro" : "classic"
  })

  useEffect(() => {
    if (typeof window === "undefined") return
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === MAYA_MODE_STORAGE_KEY || event.key === MAYA_MODE_TOUCHED_STORAGE_KEY) {
        setGenerationMode(readMayaProModePreference() ? "pro" : "classic")
      }
    }
    const handleCustomEvent = (event: Event) => {
      const detail = (event as CustomEvent).detail as { mode?: boolean }
      if (typeof detail?.mode === "boolean") {
        setGenerationMode(detail.mode ? "pro" : "classic")
      }
    }
    window.addEventListener("storage", handleStorageChange)
    window.addEventListener("feedPlannerModeChanged", handleCustomEvent as EventListener)
    return () => {
      window.removeEventListener("storage", handleStorageChange)
      window.removeEventListener("feedPlannerModeChanged", handleCustomEvent as EventListener)
    }
  }, [])

  const handleToggleGenerationMode = () => {
    const nextMode = generationMode === "pro" ? "classic" : "pro"
    setGenerationMode(nextMode)
    if (typeof window !== "undefined") {
      writeMayaProModePreference(nextMode === "pro")
      window.dispatchEvent(new CustomEvent("feedPlannerModeChanged", { detail: { mode: nextMode === "pro" } }))
    }
  }
  // Fetch brand colors from user profile
  useEffect(() => {
    fetch('/api/profile/personal-brand')
      .then(res => res.json())
      .then(data => {
        if (data.completed && data.data) {
          // Extract colors from colorPalette (JSONB) or colorTheme
          let colors: string[] = []
          if (data.data.colorPalette) {
            try {
              const palette = typeof data.data.colorPalette === 'string' 
                ? JSON.parse(data.data.colorPalette)
                : data.data.colorPalette
              if (Array.isArray(palette)) {
                // Extract hex values from array (could be strings or objects with hex property)
                colors = palette.map((c: any) => {
                  if (typeof c === 'string') return c
                  if (c?.hex) return c.hex
                  if (c?.color) return c.color
                  return null
                }).filter(Boolean)
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

  const handleWriteBio = async () => {
    if (!feedId) return
    
    setIsSavingBio(true)
    setShowBioModal(true)
    // Clear existing bio text when starting generation
    setBioText("")
    
    try {
      // Generate bio using AI
      const response = await fetch(`/api/feed/${feedId}/generate-bio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to generate bio' }))
        throw new Error(errorData.error || 'Failed to generate bio')
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
        throw new Error('No bio generated')
      }
    } catch (error) {
      console.error("[v0] Error generating bio:", error)
      setIsSavingBio(false)
      const errorMessage = error instanceof Error ? error.message : "Failed to generate bio. Please try again."
      
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
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ bioText: bioText.trim() }),
      })

      if (!response.ok) {
        throw new Error('Failed to save bio')
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
    return feedData?.posts ? [...feedData.posts].sort((a: any, b: any) => a.position - b.position) : []
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
  const actions = useFeedActions(feedId, posts, feedData, mutate)
  
  // Calculate ready posts for confetti
  const readyPosts = postStatuses.filter((p: any) => p.isComplete).length
  useFeedConfetti(readyPosts)

  // Log post status for debugging - only log once per feed load to prevent excessive logging during polling
  useEffect(() => {
    if (!feedData?.posts) return
    
    const postsWithoutPrediction = feedData.posts.filter(
      (p: any) => !p.prediction_id && p.generation_status !== "completed" && !p.image_url,
    )
    
    if (postsWithoutPrediction.length > 0) {
      // Only log once per feed load, not on every render
      const hasLogged = sessionStorage.getItem(`warned-no-prediction-${feedId}`)
      if (!hasLogged) {
        const feedCreatedRecently = feedData.feed?.created_at 
          ? (Date.now() - new Date(feedData.feed.created_at).getTime()) < 120000 // 2 minutes
          : false
        
        if (feedCreatedRecently) {
          console.log(`[v0] ⏳ Feed was just created - queue-all-images is processing ${postsWithoutPrediction.length} posts in background. SWR will poll for updates...`)
        } else {
          console.log(`[v0] ⚠️ Found ${postsWithoutPrediction.length} posts without prediction_id. If this persists, use the "Generate All" button.`)
        }
        sessionStorage.setItem(`warned-no-prediction-${feedId}`, 'true')
      }
    }
  }, [feedData?.posts?.length, feedId]) // Only re-run when post count changes, not on every render

  const generatingPosts = postStatuses.filter((p: any) => p.isGenerating)

  // Handle error responses
  if (feedData?.error) {
    return (
      <div className={feedPlannerStateClass}>
        <div className="text-center space-y-4">
          <h2 className="text-xl font-light uppercase tracking-[0.15em] text-[color:var(--app-text-primary)]">Feed Not Found</h2>
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
          <h2 className="text-xl font-light uppercase tracking-[0.15em] text-[color:var(--app-text-primary)]">Feed Not Found</h2>
          <p className="text-sm text-[color:var(--app-text-secondary)]">{feedData?.error || feedError?.message || "Unable to load feed data"}</p>
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
    if (feedData && typeof feedData === 'object' && Object.keys(feedData).length === 0) {
      return null
    }
    
    // If we have an error in the response, show that
    if (feedData?.error) {
      return (
        <div className={feedPlannerStateClass}>
          <div className="text-center space-y-4 max-w-md">
            <h2 className="text-xl font-light uppercase tracking-[0.15em] text-[color:var(--app-text-primary)]">Feed Not Found</h2>
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
    if (feedData && typeof feedData === 'object' && Object.keys(feedData).length > 0 && !feedData.exists && !feedData.error) {
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
            <h2 className="text-xl font-light uppercase tracking-[0.15em] text-[color:var(--app-text-primary)]">Invalid Feed Data</h2>
            <p className="text-sm text-[color:var(--app-text-secondary)]">The feed data structure is invalid. Please try creating a new feed.</p>
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
  
  const totalPosts = 9
  
  // Get processing progress from feed data (if available)
  const processingProgress = feedData?.feed?.processingProgress || 0
  const processingStage = feedData?.feed?.processingStage
  const isProcessing = feedData?.feed?.status === 'processing' || feedData?.feed?.status === 'queueing'
  
  // Calculate image generation progress
  const imageProgress = Math.round((readyPosts / totalPosts) * 100)
  const isFeedComplete = readyPosts === totalPosts
  
  // Check if feed is manually created
  // Manual feeds: created_by='manual' OR all posts are empty with pending status
  // Maya feeds: have prediction_id or are actively generating
  const isManualFeed = feedData?.feed?.created_by === 'manual' || 
    (feedData?.posts && feedData.posts.length > 0 && 
     feedData.posts.every((p: any) => 
       !p.image_url && 
       !p.prediction_id && 
       (p.generation_status === 'pending' || !p.generation_status)
     ))
  
  // For manual feeds, show grid even if not complete (allow adding images)
  // For Maya feeds, show loading overlay while actively generating (bulk generation only)
  const hasGeneratingPosts = postStatuses.some((p: any) => p.isGenerating)
  const isMayaProcessing = feedData?.feed?.status === 'processing' || 
                          feedData?.feed?.status === 'queueing' ||
                          feedData?.feed?.status === 'generating'
  
  // Simple rule: Show overlay ONLY for bulk generation (all 9 images at once)
  // Bulk generation = feed status is 'processing'/'queueing'/'generating' (Maya is setting up the feed)
  // Single image generation = feed status is NOT processing, only individual posts have prediction_id
  // NEVER show for:
  // - Manual feeds (they always show grid)
  // - Free users (single placeholder)
  // - Single image generation (show grid with inline loading instead)
  const generatingPostsCount = postStatuses.filter((p: any) => p.isGenerating).length
  const isBulkGeneration = isMayaProcessing // Feed is in bulk setup phase
  const isSingleImageGeneration = hasGeneratingPosts && !isMayaProcessing && generatingPostsCount <= 3 // Few posts generating, not bulk
  
  const shouldShowLoadingOverlay = !isManualFeed && 
                                   access?.placeholderType !== "single" && // Never show for free users (single placeholder)
                                   feedData?.feed && // Must have feed data
                                   isBulkGeneration && // ONLY show for bulk generation (Maya feed setup)
                                   !isFeedComplete // Hide when all complete
  
  // Overall progress (combines processing + image generation)
  const overallProgress = isProcessing 
    ? Math.min(processingProgress, 90) // Processing is 0-90%, images are 90-100%
    : imageProgress
  
  // Progress message based on stage
  const getProgressMessage = () => {
    if (isProcessing && processingStage) {
      switch (processingStage) {
        case 'generating_prompts':
          return 'Generating prompts...'
        case 'generating_captions':
          return 'Writing captions...'
        case 'queueing_images':
          return 'Queueing images...'
        default:
          return 'Processing...'
      }
    }
    if (readyPosts < totalPosts) {
      return `Generating images... (${readyPosts}/${totalPosts})`
    }
    return 'Complete!'
  }

  // Use reorderedPosts from drag-drop hook
  const displayPosts = dragDrop.reorderedPosts

  // Show loading overlay ONLY for Maya feeds that are actively generating (paid users, full grid)
  // NEVER show for manual feeds - they should always show the grid
  // NEVER show for free users (single placeholder) - they should see placeholder with inline generation
  // Also don't show if we don't have feed data yet (let it load in background)
  if (shouldShowLoadingOverlay && feedData?.feed && !isManualFeed && access?.placeholderType !== "single") {
    return (
      <FeedLoadingOverlay
        feedId={feedId}
        readyPosts={readyPosts}
        totalPosts={totalPosts}
        overallProgress={overallProgress}
        isValidating={isValidating}
        getProgressMessage={getProgressMessage}
        isTakingLonger={isTakingLonger}
      />
    )
  }

  return (
    <div className={feedPlannerCanvasClass}>
      <FeedHeader
        feedData={feedData}
        currentFeedId={feedId}
        onBack={onBack}
        onProfileImageClick={() => setShowProfileGallery(true)}
        onWriteBio={handleWriteBio}
        onCreateHighlights={() => setShowHighlightsModal(true)}
        onOpenWizard={onOpenWizard}
        onOpenWelcomeWizard={onOpenWelcomeWizard}
        access={access}
        generationMode={generationMode}
        onToggleGenerationMode={access?.isMembership ? handleToggleGenerationMode : undefined}
      />
      
      <FeedTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        access={access} // Phase 4.2: Pass access control instead of mode
      />



      <div className="pb-20">
        {activeTab === "grid" && (
          <>
            {/* Show single placeholder for preview feeds OR free users, full grid for paid users with full feeds */}
            {/* Preview feeds (layout_type='preview') always show single placeholder regardless of user access */}
            {feedData?.feed?.layout_type === 'preview' || access?.placeholderType === "single" ? (
              <FeedSinglePlaceholder
                feedId={feedId}
                post={displayPosts?.[0] || null}
                onAddImage={() => setShowGallery(0)} // Open gallery for free users
                onGenerateImage={() => mutate()} // Refresh feed data after generation
                onRequireFeedStyle={onRequireFeedStyle}
                onRequireOnboarding={onOpenWizard}
                generationMode={generationMode}
                autoGenerateOnce={activationAction === "generate"}
              />
            ) : (
              <>
                <FeedGrid
                  posts={displayPosts}
                  postStatuses={postStatuses}
                  draggedIndex={dragDrop.draggedIndex}
                  isSavingOrder={dragDrop.isSavingOrder}
                  isManualFeed={isManualFeed}
                  feedId={feedId}
                  access={access} // Phase 5.1: Pass access control for image generation
                  onPostClick={setSelectedPost}
                  onAddImage={setShowGallery}
                  onGenerateImage={async (postId: number) => await mutate()} // Phase 5.1: Refresh feed data after generation
                  onRequireFeedStyle={onRequireFeedStyle}
                  onRequireOnboarding={onOpenWizard}
                  onDragStart={dragDrop.handleDragStart}
                  onDragOver={dragDrop.handleDragOver}
                  onDragEnd={dragDrop.handleDragEnd}
                  generationMode={generationMode}
                />
                {/* Helpful hint for empty posts */}
                {displayPosts.some((p: any) => !p.image_url) && (
        <div className="mt-6 px-4 text-center">
                    <p className="text-xs font-light text-[color:var(--app-text-secondary)]">
                      Click any empty post to upload an image or select from your gallery
                    </p>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* For free users: Show Captions tab, for paid/membership: Show Posts tab */}
        {activeTab === "captions" && access?.isFree && (
          <FeedCaptionTemplates businessType={businessType} />
        )}
        
        {activeTab === "posts" && !access?.isFree && (
          <FeedPostsList
            posts={posts}
            expandedCaptions={actions.expandedCaptions}
            copiedCaptions={actions.copiedCaptions}
            enhancingCaptions={actions.enhancingCaptions}
            isManualFeed={isManualFeed}
            feedId={feedId}
            onToggleCaption={actions.toggleCaption}
            onCopyCaption={actions.copyCaptionToClipboard}
            onEnhanceCaption={actions.handleEnhanceCaption}
            onAddImage={setShowGallery}
            onRefresh={mutate}
            access={access} // Phase 4.2: Pass access control instead of mode
          />
        )}

        {/* Strategy tab: Show Content Calendar for free users, FeedStrategy for paid/membership */}
        {activeTab === "strategy" && access?.canGenerateStrategy && (
          <>
            {access.isFree ? (
              <FeedContentCalendar />
            ) : (
              <FeedStrategy
                feedData={feedData}
                feedId={feedId}
                onStrategyGenerated={mutate}
              />
            )}
          </>
        )}

        {/* Brand Pillars tab - show for all users */}
        {activeTab === "pillars" && (
          <FeedBrandPillars businessType={businessType} />
        )}
      </div>

      <FeedModals
        selectedPost={selectedPost}
        showGallery={showGallery}
        showProfileGallery={showProfileGallery}
        feedId={feedId}
        feedData={feedData}
        access={access} // Phase 8.1: Pass access control for gallery access
        onClosePost={() => setSelectedPost(null)}
        onCloseGallery={() => setShowGallery(null)}
        onCloseProfileGallery={() => setShowProfileGallery(false)}
        onShowGallery={setShowGallery}
        onNavigateToMaya={actions.navigateToMayaChat}
        onUpdate={async (updatedPost?: any) => {
          console.log("[v0] onUpdate called with post:", updatedPost?.id, "has feedData:", !!feedData)
          
          if (updatedPost && feedData?.posts) {
            // Find the post index
            const postIndex = feedData.posts.findIndex((p: any) => p.id === updatedPost.id)
            console.log("[v0] Found post at index:", postIndex)
            
            if (postIndex !== -1) {
              // Optimistic update: immediately update the cache with the new post data
              const updatedPosts = [...feedData.posts]
              updatedPosts[postIndex] = { ...updatedPosts[postIndex], ...updatedPost }
              
              const optimisticData = {
                ...feedData,
                posts: updatedPosts
              }
              
              console.log("[v0] Applying optimistic update for post:", updatedPost.id)
              // Update cache optimistically (no revalidation, instant UI update)
              await mutate(optimisticData, { revalidate: false })
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
            <h2 className="text-lg font-light uppercase tracking-[0.12em]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              {isSavingBio && !bioText ? "Creating Your Bio" : "Edit Bio"}
            </h2>
            {isSavingBio && !bioText ? (
              <div className="flex flex-col items-center justify-center py-8 space-y-4">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[color:var(--app-glass-border)] border-t-[color:var(--app-text-primary)]" />
                <div className="text-center space-y-2">
                  <p className="text-sm font-medium text-[color:var(--app-text-primary)]">I&apos;m crafting your perfect bio...</p>
                  <p className="text-xs text-[color:var(--app-text-secondary)]">This will just take a moment.</p>
                </div>
              </div>
            ) : (
              <>
                <textarea
                  value={bioText}
                  onChange={(e) => setBioText(e.target.value)}
                  placeholder="Your AI-generated bio will appear here..."
                  className="h-32 w-full resize-none rounded-[8px] border border-[color:var(--app-input-border)] bg-[color:var(--app-input-bg)] p-3 text-sm text-[color:var(--app-text-primary)] placeholder:text-[color:var(--app-text-muted)] focus:outline-none focus:ring-1 focus:ring-[color:var(--app-focus-ring)]"
                  maxLength={150}
                  disabled={isSavingBio}
                />
                <div className="text-right text-xs text-[color:var(--app-text-secondary)]">
                  {bioText.length}/150 characters
                </div>
              </>
            )}
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowBioModal(false)}
                disabled={isSavingBio}
                className="px-4 py-2 text-sm text-[color:var(--app-text-secondary)] transition-colors hover:text-[color:var(--app-text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              {!isSavingBio && bioText && (
                <button
                  onClick={handleSaveBio}
                  disabled={!bioText.trim()}
                  className="rounded-[6px] border border-[color:var(--app-glass-border)] bg-[color:var(--app-btn-secondary-bg)] px-4 py-2 text-sm uppercase tracking-[0.2em] text-[color:var(--app-text-primary)] transition-colors hover:bg-[color:var(--app-btn-secondary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
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
        brandColors={brandColors.length > 0 ? brandColors : (
          feedData?.feed?.color_palette
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
        )}
      />
    </div>
  )
}
