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

  // Handle loading state
  if (isFeedLoading && !feedData) {
    return (
      <div className="w-full max-w-none md:max-w-[935px] mx-auto bg-white min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-stone-400 mx-auto" />
          <p className="text-sm text-stone-600">Loading feed data...</p>
        </div>
      </div>
    )
  }

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
  if (!feedData || !feedData.feed) {
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
    
    // If feedData exists but doesn't have feed, it's a structure issue
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

  if (!feedId || !isFeedComplete) {
    return (
      <FeedLoadingOverlay
        feedId={feedId}
        readyPosts={readyPosts}
        totalPosts={totalPosts}
        overallProgress={overallProgress}
        isValidating={isValidating}
        generatingRemaining={actions.generatingRemaining}
        onGenerateRemaining={actions.handleGenerateRemaining}
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
        onGenerateBio={actions.handleGenerateBio}
        isGeneratingBio={actions.isGeneratingBio}
      />
      
      <FeedTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />



      <div className="pb-20">
        {activeTab === "grid" && (
          <FeedGrid
            posts={displayPosts}
            postStatuses={postStatuses}
            draggedIndex={dragDrop.draggedIndex}
            isSavingOrder={dragDrop.isSavingOrder}
            regeneratingPost={actions.regeneratingPost}
            onPostClick={setSelectedPost}
            onGeneratePost={actions.handleGenerateSingle}
            onDragStart={dragDrop.handleDragStart}
            onDragOver={dragDrop.handleDragOver}
            onDragEnd={dragDrop.handleDragEnd}
          />
        )}

        {activeTab === "posts" && (
          <FeedPostsList
            posts={posts}
            expandedCaptions={actions.expandedCaptions}
            copiedCaptions={actions.copiedCaptions}
            enhancingCaptions={actions.enhancingCaptions}
            onToggleCaption={actions.toggleCaption}
            onCopyCaption={actions.copyCaptionToClipboard}
            onEnhanceCaption={actions.handleEnhanceCaption}
            onGeneratePost={actions.handleGenerateSingle}
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
        regeneratingPost={actions.regeneratingPost}
        onClosePost={() => setSelectedPost(null)}
        onCloseGallery={() => setShowGallery(null)}
        onCloseProfileGallery={() => setShowProfileGallery(false)}
        onRegeneratePost={actions.handleRegeneratePost}
        onShowGallery={setShowGallery}
        onUpdate={mutate}
      />
    </div>
  )
}
