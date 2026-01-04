"use client"

import { useState, useMemo, useEffect } from "react"
import type React from "react"
import { Loader2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useFeedPolling } from "./hooks/use-feed-polling"
import { useFeedModals } from "./hooks/use-feed-modals"
import { useFeedDragDrop } from "./hooks/use-feed-drag-drop"
import { useFeedActions } from "./hooks/use-feed-actions"
import { useFeedConfetti } from "./hooks/use-feed-confetti"
import FeedHeader from "./feed-header"
import FeedTabs from "./feed-tabs"
import FeedGrid from "./feed-grid"
import FeedPostsList from "./feed-posts-list"
import FeedStrategy from "./feed-strategy"
import FeedModals from "./feed-modals"
import FeedLoadingOverlay from "./feed-loading-overlay"

interface InstagramFeedViewProps {
  feedId: number
  onBack?: () => void
}

export default function InstagramFeedView({ feedId, onBack }: InstagramFeedViewProps) {
  // Use custom hooks for all complex logic
  const { feedData, feedError, mutate, isLoading: isFeedLoading, isValidating } = useFeedPolling(feedId)
  const { selectedPost, setSelectedPost, showGallery, setShowGallery, showProfileGallery, setShowProfileGallery } = useFeedModals()
  
  console.log("[v0] ==================== INSTAGRAM FEED VIEW RENDERED ====================")
  console.log("[v0] feedData:", feedData ? "exists" : "null")
  console.log("[v0] feedData structure:", feedData ? Object.keys(feedData) : "null")
  console.log("[v0] feedData.posts count:", feedData?.posts?.length || 0)
  console.log("[v0] feedData.feed:", feedData?.feed ? "exists" : "undefined")
  console.log("[v0] feedData.feed.id:", feedData?.feed?.id)
  console.log("[v0] feedData.error:", feedData?.error)

  const [activeTab, setActiveTab] = useState<"grid" | "posts" | "strategy">("grid")
  const [showBioModal, setShowBioModal] = useState(false)
  const [bioText, setBioText] = useState("")
  const [isSavingBio, setIsSavingBio] = useState(false)

  // Initialize bio text when modal opens
  useEffect(() => {
    if (showBioModal) {
      setBioText(feedData?.bio?.bio_text || "")
    }
  }, [showBioModal, feedData?.bio?.bio_text])

  const handleWriteBio = () => {
    setShowBioModal(true)
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

  const handleCreateNewFeed = async () => {
    try {
      const response = await fetch('/api/feed/create-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({}),
      })

      if (!response.ok) {
        // Try to get error message from response
        let errorMessage = 'Failed to create feed'
        let errorDetails = ''
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
          errorDetails = errorData.details || ''
          // Combine error and details if both exist
          if (errorDetails && errorMessage !== errorDetails) {
            errorMessage = `${errorMessage}: ${errorDetails}`
          } else if (errorDetails) {
            errorMessage = errorDetails
          }
        } catch (e) {
          // If response is not JSON, use status text
          errorMessage = response.statusText || errorMessage
        }
        console.error("[v0] API error response:", {
          status: response.status,
          statusText: response.statusText,
          errorMessage,
        })
        throw new Error(errorMessage)
      }

      const data = await response.json()
      
      if (!data.feedId) {
        throw new Error('Feed created but no feed ID returned')
      }
      
      // Navigate to the new feed
      if (typeof window !== "undefined") {
        window.location.href = `/feed-planner?feedId=${data.feedId}`
      }
    } catch (error) {
      console.error("[v0] Error creating new feed:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to create new feed. Please try again."
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
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
  const readyPosts = postStatuses.filter(p => p.isComplete).length
  const { showConfetti } = useFeedConfetti(readyPosts)

  // Log post status for debugging (optional - can be removed in production)
  useEffect(() => {
    if (!feedData?.posts) return
    
    const postsWithoutPrediction = feedData.posts.filter(
      (p: any) => !p.prediction_id && p.generation_status !== "completed" && !p.image_url,
    )
    
    if (postsWithoutPrediction.length > 0) {
      const feedCreatedRecently = feedData.feed?.created_at 
        ? (Date.now() - new Date(feedData.feed.created_at).getTime()) < 120000 // 2 minutes
        : false
      
      if (feedCreatedRecently) {
        console.log(`[v0] ⏳ Feed was just created - queue-all-images is processing ${postsWithoutPrediction.length} posts in background. SWR will poll for updates...`)
      } else {
        console.log(`[v0] ⚠️ Found ${postsWithoutPrediction.length} posts without prediction_id. If this persists, use the "Generate All" button.`)
      }
    }
  }, [feedData])

  const generatingPosts = postStatuses.filter(p => p.isGenerating)

  // Handle error responses
  if (feedData?.error) {
    return (
      <div className="w-full max-w-none md:max-w-[935px] mx-auto bg-white min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-light text-stone-900">Feed Not Found</h2>
          <p className="text-sm text-stone-600">{feedData.error}</p>
          {onBack && (
            <button
              onClick={onBack}
              className="text-sm text-stone-500 hover:text-stone-900 underline"
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
      <div className="w-full max-w-none md:max-w-[935px] mx-auto bg-white min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <h2 className="text-xl font-light text-stone-900">Feed Not Found</h2>
          <p className="text-sm text-stone-600">{feedData?.error || feedError?.message || "Unable to load feed data"}</p>
          {onBack && (
            <button
              onClick={onBack}
              className="text-sm text-stone-500 hover:text-stone-900 underline mt-4"
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
        <div className="w-full max-w-none md:max-w-[935px] mx-auto bg-white min-h-screen flex items-center justify-center p-4">
          <div className="text-center space-y-4 max-w-md">
            <h2 className="text-xl font-light text-stone-900">Feed Not Found</h2>
            <p className="text-sm text-stone-600">{feedData.error}</p>
            {onBack && (
              <button
                onClick={onBack}
                className="text-sm text-stone-500 hover:text-stone-900 underline mt-4"
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
        <div className="w-full max-w-none md:max-w-[935px] mx-auto bg-white min-h-screen flex items-center justify-center p-4">
          <div className="text-center space-y-4 max-w-md">
            <h2 className="text-xl font-light text-stone-900">Invalid Feed Data</h2>
            <p className="text-sm text-stone-600">The feed data structure is invalid. Please try creating a new feed.</p>
            {onBack && (
              <button
                onClick={onBack}
                className="text-sm text-stone-500 hover:text-stone-900 underline mt-4"
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
  // For Maya feeds, show loading overlay while actively generating
  const hasGeneratingPosts = postStatuses.some(p => p.isGenerating)
  const isMayaProcessing = feedData?.feed?.status === 'processing' || 
                          feedData?.feed?.status === 'queueing' ||
                          feedData?.feed?.status === 'generating'
  
  // NEVER show loading overlay for manual feeds
  // Only show for Maya feeds that are actively generating
  // Must have feed data (not just loading) to determine if it's generating
  const shouldShowLoadingOverlay = !isManualFeed && 
                                   !isFeedComplete && 
                                   feedData?.feed && // Must have feed data
                                   (hasGeneratingPosts || isMayaProcessing)
  
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

  // Show loading overlay ONLY for Maya feeds that are actively generating
  // NEVER show for manual feeds - they should always show the grid
  // Also don't show if we don't have feed data yet (let it load in background)
  if (shouldShowLoadingOverlay && feedData?.feed && !isManualFeed) {
    return (
      <FeedLoadingOverlay
        feedId={feedId}
        readyPosts={readyPosts}
        totalPosts={totalPosts}
        overallProgress={overallProgress}
        isValidating={isValidating}
        getProgressMessage={getProgressMessage}
      />
    )
  }

  return (
    <div className="w-full max-w-none md:max-w-[935px] mx-auto bg-white min-h-screen">
      <FeedHeader
        feedData={feedData}
        onBack={onBack}
        onProfileImageClick={() => setShowProfileGallery(true)}
        onWriteBio={handleWriteBio}
        onCreateNewFeed={handleCreateNewFeed}
      />
      
      <FeedTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />



      <div className="pb-20">
        {activeTab === "grid" && (
          <>
            <FeedGrid
              posts={displayPosts}
              postStatuses={postStatuses}
              draggedIndex={dragDrop.draggedIndex}
              isSavingOrder={dragDrop.isSavingOrder}
              isManualFeed={isManualFeed}
              onPostClick={setSelectedPost}
              onAddImage={setShowGallery}
              onDragStart={dragDrop.handleDragStart}
              onDragOver={dragDrop.handleDragOver}
              onDragEnd={dragDrop.handleDragEnd}
            />
            {/* Helpful hint for empty posts */}
            {displayPosts.some((p: any) => !p.image_url) && (
              <div className="mt-6 px-4 text-center">
                <p className="text-xs text-stone-500 font-light">
                  Click any empty post to upload an image or select from your gallery
                </p>
              </div>
            )}
          </>
        )}

        {activeTab === "posts" && (
          <FeedPostsList
            posts={posts}
            expandedCaptions={actions.expandedCaptions}
            copiedCaptions={actions.copiedCaptions}
            enhancingCaptions={actions.enhancingCaptions}
            isManualFeed={isManualFeed}
            onToggleCaption={actions.toggleCaption}
            onCopyCaption={actions.copyCaptionToClipboard}
            onEnhanceCaption={actions.handleEnhanceCaption}
            onAddImage={setShowGallery}
          />
        )}

        {activeTab === "strategy" && (
          <FeedStrategy
            feedData={feedData}
            onCreateStrategy={() => {
              window.location.href = "/studio#maya/feed"
            }}
          />
        )}
      </div>

      <FeedModals
        selectedPost={selectedPost}
        showGallery={showGallery}
        showProfileGallery={showProfileGallery}
        feedId={feedId}
        feedData={feedData}
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
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowBioModal(false)}>
          <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-stone-900">Write Bio</h2>
            <textarea
              value={bioText}
              onChange={(e) => setBioText(e.target.value)}
              placeholder="Write your Instagram bio here..."
              className="w-full h-32 p-3 border border-stone-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-stone-900 text-sm"
              maxLength={150}
            />
            <div className="text-xs text-stone-500 text-right">
              {bioText.length}/150 characters
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowBioModal(false)}
                className="px-4 py-2 text-sm text-stone-600 hover:text-stone-900 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveBio}
                disabled={isSavingBio || !bioText.trim()}
                className="px-4 py-2 bg-stone-900 text-white text-sm font-semibold rounded-lg hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSavingBio ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
