"use client"

import { useState, useMemo, useEffect } from "react"
import type React from "react"
import {
  Grid3x3,
  LayoutGrid,
  List,
  Loader2,
  ChevronLeft,
  MessageCircle,
  Heart,
  Bookmark,
  Send,
  MoreHorizontal,
  X,
  Copy,
  Check,
  Sparkles,
  ImageIcon,
} from "lucide-react"
import Image from "next/image"
import { toast } from "@/hooks/use-toast"
import { FeedPostGallerySelector } from "./feed-post-gallery-selector"
import { FeedProfileGallerySelector } from "./feed-profile-gallery-selector"
import FeedPostCard from "./feed-post-card"
import ReactMarkdown from "react-markdown"
import { useFeedPolling } from "./hooks/use-feed-polling"
import { useFeedModals } from "./hooks/use-feed-modals"
import { useFeedDragDrop } from "./hooks/use-feed-drag-drop"
import { useFeedActions } from "./hooks/use-feed-actions"
import { useFeedConfetti } from "./hooks/use-feed-confetti"

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
      <div className="w-full max-w-none md:max-w-[935px] mx-auto bg-white min-h-screen relative overflow-hidden">
        {/* Blurred Instagram Feed Preview */}
        <div className="filter blur-lg pointer-events-none opacity-50">
          <div className="bg-white border-b border-stone-200">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="w-24 h-6 bg-stone-200 rounded"></div>
              <div className="flex items-center gap-1">
                <div className="w-16 h-5 bg-stone-200 rounded"></div>
              </div>
              <div className="w-6 h-6 bg-stone-200 rounded-full"></div>
            </div>

            <div className="px-8 pb-4">
              <div className="flex items-start gap-12">
                <div className="w-32 h-32 rounded-full bg-stone-200"></div>
                <div className="flex-1 space-y-4">
                  <div className="flex gap-8">
                    <div className="w-16 h-12 bg-stone-200 rounded"></div>
                    <div className="w-16 h-12 bg-stone-200 rounded"></div>
                    <div className="w-16 h-12 bg-stone-200 rounded"></div>
                  </div>
                  <div className="w-full h-16 bg-stone-200 rounded"></div>
                </div>
              </div>
            </div>

            <div className="flex border-t border-stone-200">
              <div className="flex-1 h-12 bg-stone-100"></div>
              <div className="flex-1 h-12 bg-stone-50"></div>
              <div className="flex-1 h-12 bg-stone-50"></div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1 p-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="aspect-square bg-stone-200 rounded"></div>
            ))}
          </div>
        </div>

        {/* Loading Overlay */}
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
          <div className="text-center px-8 max-w-md">
            <div className="mb-12 relative w-40 h-40 mx-auto">
              <div className="absolute inset-0 flex items-center justify-center">
                <div
                  className="w-40 h-40 rounded-full border-2 border-transparent border-t-stone-950 animate-spin"
                  style={{ animationDuration: "2s" }}
                ></div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div
                  className="w-32 h-32 rounded-full border-2 border-transparent border-b-stone-400 animate-spin"
                  style={{ animationDuration: "1.5s", animationDirection: "reverse" }}
                ></div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 flex items-center justify-center">
                  <img src="/icon-192.png" alt="SSELFIE Logo" className="w-full h-full object-contain" />
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h2 className="text-stone-950 text-2xl font-serif font-extralight tracking-[0.3em] uppercase">
                {feedId ? "Maya is creating your photos" : "Loading your feed"}
              </h2>

              {feedId && (
                <>
                  <div className="space-y-4 w-full max-w-sm mx-auto">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-light text-stone-600">Progress</span>
                      <span className="text-sm font-medium text-stone-900">
                        {readyPosts} of {totalPosts} complete
                      </span>
                    </div>

                    <div className="w-full bg-stone-200 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-stone-900 h-2.5 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${overallProgress}%` }}
                      />
                    </div>

          <div className="flex items-center gap-2 justify-center">
            <Loader2 size={14} className="animate-spin text-stone-600" />
            <p className="text-xs font-light text-stone-500">
              {getProgressMessage()}
            </p>
            {isValidating && (
              <span className="text-xs text-stone-400 ml-2">(checking...)</span>
            )}
          </div>
          {readyPosts < totalPosts && (
            <button
              onClick={actions.handleGenerateRemaining}
              disabled={actions.generatingRemaining}
              className="mt-4 px-4 py-2 bg-stone-900 text-white text-xs font-light rounded-lg hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {actions.generatingRemaining ? "Generating..." : `Generate Remaining ${totalPosts - readyPosts} Images`}
            </button>
          )}
        </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-none md:max-w-[935px] mx-auto bg-white min-h-screen">
      <div className="bg-white border-b border-stone-200">
        <div className="flex items-center justify-between px-4 py-3">
          {onBack && (
            <button onClick={onBack} className="p-2 -ml-2 hover:bg-stone-50 rounded-full transition-colors">
              <ChevronLeft size={24} className="text-stone-900" strokeWidth={2} />
            </button>
          )}
          <div className="flex items-center gap-1">
            <span className="text-base font-semibold text-stone-900">sselfie</span>
            <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <button className="p-2 -mr-2 hover:bg-stone-50 rounded-full transition-colors">
            <MoreHorizontal size={24} className="text-stone-900" strokeWidth={2} />
          </button>
        </div>

        <div className="px-4 md:px-8 pb-4">
          <div className="flex flex-col md:flex-row md:items-start md:gap-12 mb-4">
            <button
              onClick={() => feedData?.feed?.id && setShowProfileGallery(true)}
              className="relative group w-20 h-20 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 p-[3px] mb-4 md:mb-0 flex-shrink-0 transition-opacity hover:opacity-90"
            >
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden relative">
                {feedData?.feed?.profile_image_url ? (
                  <>
                    <Image
                      src={feedData.feed.profile_image_url}
                      alt="Profile"
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 80px, 128px"
                      style={{ borderRadius: '50%' }}
                    />
                  </>
                ) : (
                  <span className="text-2xl md:text-4xl font-bold text-stone-900 relative z-10">S</span>
                )}
              </div>
              <div className="absolute inset-0 bg-stone-950/0 group-hover:bg-stone-950/40 rounded-full transition-all flex items-center justify-center pointer-events-none">
                <span className="text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                  Change
                </span>
              </div>
            </button>

            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-8">
                <div className="text-center">
                  <div className="text-sm md:text-base font-semibold text-stone-900">9</div>
                  <div className="text-xs md:text-sm text-stone-500">posts</div>
                </div>
                <div className="text-center">
                  <div className="text-sm md:text-base font-semibold text-stone-900">1.2K</div>
                  <div className="text-xs md:text-sm text-stone-500">followers</div>
                </div>
                <div className="text-center">
                  <div className="text-sm md:text-base font-semibold text-stone-900">342</div>
                  <div className="text-xs md:text-sm text-stone-500">following</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-semibold text-stone-900">SSELFIE Studio</div>
                <div className="flex items-start justify-between gap-3">
                  <div className="text-sm text-stone-900 whitespace-pre-wrap flex-1">
                    {feedData.bio?.bio_text || "Your Instagram feed strategy created by Maya"}
                  </div>
                  <button
                    onClick={actions.handleGenerateBio}
                    disabled={actions.isGeneratingBio || !feedData?.feed?.id}
                    className="p-2 hover:bg-stone-100 rounded-lg transition-colors border border-stone-200 hover:border-stone-300 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                    title={feedData.bio?.bio_text ? "Regenerate bio" : "Generate bio"}
                  >
                    {actions.isGeneratingBio ? (
                      <Loader2 size={18} className="text-stone-600 animate-spin" />
                    ) : (
                      <Sparkles size={18} className="text-stone-600" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                <button className="flex-1 md:flex-none md:px-8 bg-stone-100 hover:bg-stone-200 text-stone-900 text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors">
                  Following
                </button>
                <button className="flex-1 md:flex-none md:px-8 bg-stone-100 hover:bg-stone-200 text-stone-900 text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors">
                  Message
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex border-t border-stone-200">
          <button
            onClick={() => setActiveTab("grid")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 border-t-2 transition-colors ${
              activeTab === "grid" ? "border-stone-900 text-stone-900" : "border-transparent text-stone-400"
            }`}
          >
            <Grid3x3 size={20} strokeWidth={activeTab === "grid" ? 2.5 : 2} />
            <span className="text-xs font-medium uppercase tracking-wider">Grid</span>
          </button>
          <button
            onClick={() => setActiveTab("posts")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 border-t-2 transition-colors ${
              activeTab === "posts" ? "border-stone-900 text-stone-900" : "border-transparent text-stone-400"
            }`}
          >
            <LayoutGrid size={20} strokeWidth={activeTab === "posts" ? 2.5 : 2} />
            <span className="text-xs font-medium uppercase tracking-wider">Posts</span>
          </button>
          <button
            onClick={() => setActiveTab("strategy")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 border-t-2 transition-colors ${
              activeTab === "strategy" ? "border-stone-900 text-stone-900" : "border-transparent text-stone-400"
            }`}
          >
            <List size={20} strokeWidth={activeTab === "strategy" ? 2.5 : 2} />
            <span className="text-xs font-medium uppercase tracking-wider">Strategy</span>
          </button>
        </div>
      </div>

      {/* Success Banner when feed is complete */}
      {isFeedComplete && readyPosts === totalPosts && (
        <div className="mx-4 mt-4 mb-4 bg-stone-50 border border-stone-200 rounded-xl p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-stone-900 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-white text-sm">✓</span>
            </div>
            <div className="flex-1 space-y-2">
              <h3 className="text-sm font-medium text-stone-900">Your feed is complete! 🎉</h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                All 9 images have been generated. You can now download them, edit captions, or regenerate individual posts if needed.
              </p>
              <button
                onClick={actions.handleDownloadBundle}
                disabled={actions.isDownloadingBundle}
                className="mt-2 px-4 py-2 bg-stone-900 text-white rounded-lg text-sm font-medium hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actions.isDownloadingBundle ? "Preparing download..." : `Download All (${totalPosts} images + captions + strategy)`}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="pb-20">
        {activeTab === "grid" && (
          <div className="grid grid-cols-3 gap-[2px] md:gap-1">
            {displayPosts.map((post: any, index: number) => {
              const postStatus = postStatuses.find(p => p.id === post.id)
              const isGenerating = postStatus?.isGenerating || post.generation_status === "generating"
              const isRegenerating = actions.regeneratingPost === post.id
              // SIMPLIFIED: A post is complete if it has an image_url (regardless of status)
              const isComplete = !!post.image_url
              const isDragging = dragDrop.draggedIndex === index

              return (
                <div
                  key={post.id}
                  draggable={isComplete && !dragDrop.isSavingOrder}
                  onDragStart={() => dragDrop.handleDragStart(index)}
                  onDragOver={(e) => dragDrop.handleDragOver(e, index)}
                  onDragEnd={dragDrop.handleDragEnd}
                  className={`aspect-square bg-stone-100 relative transition-all duration-200 ${
                    isDragging ? 'opacity-50 scale-95' : ''
                  } ${
                    isComplete && !dragDrop.isSavingOrder ? 'cursor-move hover:opacity-90' : 'cursor-pointer'
                  }`}
                >
                  {post.image_url && !isRegenerating && !isGenerating ? (
                    <Image
                      src={post.image_url || "/placeholder.svg"}
                      alt={`Post ${post.position}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 33vw, 311px"
                      onClick={() => setSelectedPost(post)}
                    />
                  ) : isRegenerating || isGenerating ? (
                    <div className="absolute inset-0 bg-stone-50 flex flex-col items-center justify-center">
                      <Loader2 className="w-8 h-8 text-stone-400 animate-spin mb-2" strokeWidth={1.5} />
                      <div className="text-[10px] font-light text-stone-500 text-center">
                        {isRegenerating ? "Regenerating..." : "Creating"}
                      </div>
                    </div>
                  ) : (
                    <div
                      className="absolute inset-0 bg-white flex flex-col items-center justify-center p-3 cursor-pointer hover:bg-stone-50 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation()
                        actions.handleGenerateSingle(post.id)
                      }}
                    >
                      <ImageIcon className="w-10 h-10 text-stone-300 mb-2" strokeWidth={1.5} />
                      <div className="text-[10px] font-light text-stone-500 text-center">Click to generate</div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {activeTab === "posts" && (
          <div className="space-y-6 md:space-y-8">
            {/* Create Captions Button - Show if no captions exist */}
            {posts.length > 0 && posts.every((p: any) => !p.caption || p.caption.trim() === "") && (
              <div className="flex justify-center pb-4">
                <button
                  onClick={() => {
                    // Navigate to Maya Feed tab with "Create captions" prompt
                    window.location.href = "/studio#maya/feed"
                    // Small delay to ensure tab is loaded, then trigger prompt
                    setTimeout(() => {
                      // The prompt will be sent via quick prompt click or user can type it
                    }, 500)
                  }}
                  className="px-6 py-3 bg-stone-900 text-white rounded-xl text-sm font-medium hover:bg-stone-800 transition-colors flex items-center gap-2"
                >
                  <span>Create Captions</span>
                </button>
              </div>
            )}
            {posts.map((post: any) => {
              const isExpanded = actions.expandedCaptions.has(post.id)
              const caption = post.caption || ""
              const shouldTruncate = caption.length > 150
              const displayCaption = isExpanded || !shouldTruncate ? caption : caption.substring(0, 150) + "..."

              return (
                <div key={post.id} className="border-b border-stone-100 pb-6">
                  <div className="flex items-center justify-between px-4 md:px-0 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 p-[2px]">
                        <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                          <span className="text-xs font-bold text-stone-900">S</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-stone-900">sselfie</p>
                        <p className="text-xs text-stone-500">{post.content_pillar || `Post ${post.position}`}</p>
                      </div>
                    </div>
                    <button className="p-2 hover:bg-stone-50 rounded-full transition-colors">
                      <MoreHorizontal size={20} className="text-stone-900" />
                    </button>
                  </div>

                  <div className="aspect-square bg-stone-100 relative">
                    {post.image_url ? (
                      <Image
                        src={post.image_url || "/placeholder.svg"}
                        alt={`Post ${post.position}`}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 935px"
                      />
                    ) : post.generation_status === "generating" ? (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 size={32} className="animate-spin text-stone-400" strokeWidth={1.5} />
                      </div>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <button
                          onClick={() => handleGenerateSingle(post.id)}
                          className="px-6 py-3 bg-stone-900 text-white rounded-xl text-sm font-medium hover:bg-stone-800 transition-colors"
                        >
                          Generate Photo
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="px-4 md:px-0 py-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <button className="hover:opacity-60 transition-opacity">
                          <Heart size={24} className="text-stone-900" strokeWidth={2} />
                        </button>
                        <button className="hover:opacity-60 transition-opacity">
                          <MessageCircle size={24} className="text-stone-900" strokeWidth={2} />
                        </button>
                        <button className="hover:opacity-60 transition-opacity">
                          <Send size={24} className="text-stone-900" strokeWidth={2} />
                        </button>
                      </div>
                      <button className="hover:opacity-60 transition-opacity">
                        <Bookmark size={24} className="text-stone-900" strokeWidth={2} />
                      </button>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="text-sm flex-1 min-w-0">
                          <span className="font-semibold text-stone-900">sselfie</span>{" "}
                          <span className="text-stone-900 whitespace-pre-wrap break-words">{displayCaption}</span>
                          {shouldTruncate && (
                            <button
                              onClick={() => actions.toggleCaption(post.id)}
                              className="text-stone-500 ml-1 hover:text-stone-700 transition-colors"
                            >
                              {isExpanded ? "less" : "more"}
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                          <button
                            onClick={() => actions.copyCaptionToClipboard(post.caption, post.id)}
                            className="p-2 hover:bg-stone-100 rounded-lg transition-colors border border-stone-200 hover:border-stone-300"
                            title="Copy caption"
                          >
                            {actions.copiedCaptions.has(post.id) ? (
                              <Check size={18} className="text-green-600" />
                            ) : (
                              <Copy size={18} className="text-stone-600" />
                            )}
                          </button>
                          <button
                            onClick={() => actions.handleEnhanceCaption(post.id, post.caption)}
                            disabled={actions.enhancingCaptions.has(post.id)}
                            className="p-2 hover:bg-stone-100 rounded-lg transition-colors border border-stone-200 hover:border-stone-300 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Enhance with Maya"
                          >
                            {actions.enhancingCaptions.has(post.id) ? (
                              <Loader2 size={18} className="text-stone-600 animate-spin" />
                            ) : (
                              <Sparkles size={18} className="text-stone-600" />
                            )}
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-stone-400 uppercase tracking-wide">Just now</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {activeTab === "strategy" && (
          <div className="p-4 md:p-8">
            {/* Create Strategy Button - Show if no strategy exists */}
            {!feedData.feed?.description && (
              <div className="flex justify-center pb-6">
                <button
                  onClick={() => {
                    // Navigate to Maya Feed tab with "Create strategy" prompt
                    window.location.href = "/studio#maya/feed"
                    // Small delay to ensure tab is loaded, then trigger prompt
                    setTimeout(() => {
                      // The prompt will be sent via quick prompt click or user can type it
                    }, 500)
                  }}
                  className="px-6 py-3 bg-stone-900 text-white rounded-xl text-sm font-medium hover:bg-stone-800 transition-colors flex items-center gap-2"
                >
                  <span>Create Strategy</span>
                </button>
              </div>
            )}
            {/* Full Strategy Document */}
            <div className="bg-white/50 backdrop-blur-3xl border border-white/60 rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-xl shadow-stone-900/5">
              {feedData.feed?.description ? (
                <div className="prose prose-sm max-w-none prose-headings:font-serif prose-headings:font-light prose-headings:text-stone-900 prose-headings:tracking-wide prose-h1:text-2xl prose-h1:mb-4 prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4 prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-3 prose-p:text-stone-700 prose-p:leading-relaxed prose-p:mb-4 prose-strong:text-stone-900 prose-strong:font-medium prose-ul:text-stone-700 prose-ol:text-stone-700 prose-li:text-stone-700 prose-li:leading-relaxed prose-li:mb-2 prose-code:text-stone-600 prose-code:bg-stone-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-blockquote:border-l-4 prose-blockquote:border-stone-300 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-stone-600">
                  <ReactMarkdown
                    components={{
                      h1: ({ node, ...props }) => (
                        <h1 className="text-2xl font-serif font-light text-stone-900 mb-4 mt-8 first:mt-0 tracking-wide" {...props} />
                      ),
                      h2: ({ node, ...props }) => (
                        <h2 className="text-xl font-serif font-light text-stone-900 mb-4 mt-8 tracking-wide" {...props} />
                      ),
                      h3: ({ node, ...props }) => (
                        <h3 className="text-lg font-serif font-light text-stone-900 mb-3 mt-6 tracking-wide" {...props} />
                      ),
                      p: ({ node, ...props }) => (
                        <p className="text-sm font-light text-stone-700 leading-relaxed mb-4" {...props} />
                      ),
                      strong: ({ node, ...props }) => (
                        <strong className="font-medium text-stone-900" {...props} />
                      ),
                      ul: ({ node, ...props }) => (
                        <ul className="list-disc list-inside space-y-2 ml-4 mb-4 text-stone-700" {...props} />
                      ),
                      ol: ({ node, ...props }) => (
                        <ol className="list-decimal list-inside space-y-2 ml-4 mb-4 text-stone-700" {...props} />
                      ),
                      li: ({ node, ...props }) => (
                        <li className="text-sm font-light text-stone-700 leading-relaxed" {...props} />
                      ),
                      code: ({ node, ...props }) => (
                        <code className="text-xs bg-stone-100 text-stone-600 px-1 py-0.5 rounded" {...props} />
                      ),
                      blockquote: ({ node, ...props }) => (
                        <blockquote className="border-l-4 border-stone-300 pl-4 italic text-stone-600 my-4" {...props} />
                      ),
                    }}
                  >
                    {feedData.feed.description}
                  </ReactMarkdown>
                </div>
              ) : (
                <div className="text-sm font-light text-stone-600 leading-relaxed">
                  Strategy document is being generated...
                </div>
              )}
            </div>

            {/* Posting Strategy */}
            {feedData.strategy?.posting_schedule && (
              <div className="space-y-4">
                <div className="text-xs tracking-[0.2em] uppercase font-medium text-stone-500">When To Post</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {feedData.strategy.posting_schedule.optimalTimes?.map((time: any, idx: number) => (
                    <div key={idx} className="bg-stone-50 rounded-xl p-4 space-y-2">
                      <div className="text-sm font-medium text-stone-900">{time.day}</div>
                      <div className="text-lg font-semibold text-stone-900">{time.time}</div>
                      <div className="text-xs text-stone-600">{time.reason}</div>
                    </div>
                  ))}
                </div>
                <div className="bg-white border border-stone-200 rounded-xl p-4">
                  <div className="text-xs text-stone-500 mb-2">Posting Frequency</div>
                  <div className="text-sm text-stone-700">{feedData.strategy.posting_schedule.frequency}</div>
                </div>
              </div>
            )}

            {/* Content Strategy */}
            {feedData.strategy?.content_pillars && (
              <div className="space-y-4">
                <div className="text-xs tracking-[0.2em] uppercase font-medium text-stone-500">
                  Content Mix Strategy
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(feedData.strategy.content_pillars).map(([key, value]: any) => (
                    <div key={key} className="bg-stone-50 rounded-xl p-4 space-y-2">
                      <div className="text-sm font-medium text-stone-900 capitalize">
                        {key.replace(/([A-Z])/g, " $1").trim()}
                      </div>
                      <div className="text-xs text-stone-600 leading-relaxed">{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Story Strategy */}
            {feedData.strategy?.caption_templates && Array.isArray(feedData.strategy.caption_templates) && (
              <div className="space-y-4">
                <div className="text-xs tracking-[0.2em] uppercase font-medium text-stone-500">
                  Story Sequences For Each Post
                </div>
                {feedData.strategy.caption_templates.slice(0, 9).map((story: any, idx: number) => (
                  <div key={idx} className="bg-stone-50 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-stone-900">Post {story.postNumber || idx + 1}</div>
                      <div className="text-xs text-stone-500">{story.storyTiming}</div>
                    </div>
                    <div className="text-xs text-stone-600">{story.storyPurpose}</div>
                    <div className="space-y-1.5">
                      {story.storySequence?.map((seq: string, i: number) => (
                        <div key={i} className="flex items-start gap-2">
                          <div className="w-5 h-5 rounded-full bg-stone-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-[10px] font-semibold text-stone-600">{i + 1}</span>
                          </div>
                          <div className="text-xs text-stone-700 leading-relaxed">{seq}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Reel Strategy */}
            {feedData.strategy?.content_format_mix?.reels && (
              <div className="space-y-4">
                <div className="text-xs tracking-[0.2em] uppercase font-medium text-stone-500">
                  Reel Recommendations
                </div>
                {feedData.strategy.content_format_mix.reels.map((reel: any, idx: number) => (
                  <div key={idx} className="bg-stone-50 rounded-xl p-4 space-y-3">
                    <div className="text-sm font-medium text-stone-900">Post {reel.postNumber} → Reel</div>
                    <div className="text-xs text-stone-600 leading-relaxed">{reel.reelConcept}</div>
                    <div className="space-y-2">
                      <div className="text-[10px] text-stone-500 uppercase tracking-wider">Hook</div>
                      <div className="text-xs text-stone-700 font-medium">{reel.hookSuggestion}</div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-[10px] text-stone-500 uppercase tracking-wider">Trending Audio</div>
                      <div className="text-xs text-stone-700">{reel.audioRecommendation}</div>
                    </div>
                    <div className="text-[10px] text-stone-500">{reel.coverPhotoTips}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Carousel Strategy */}
            {feedData.strategy?.content_format_mix?.carousels && (
              <div className="space-y-4">
                <div className="text-xs tracking-[0.2em] uppercase font-medium text-stone-500">Carousel Ideas</div>
                {feedData.strategy.content_format_mix.carousels.map((carousel: any, idx: number) => (
                  <div key={idx} className="bg-stone-50 rounded-xl p-4 space-y-3">
                    <div className="text-sm font-medium text-stone-900">Post {carousel.postNumber} → Carousel</div>
                    <div className="text-xs text-stone-600 leading-relaxed">{carousel.carouselIdea}</div>
                    <div className="space-y-1.5">
                      {carousel.slideBreakdown?.map((slide: string, i: number) => (
                        <div key={i} className="flex items-start gap-2">
                          <div className="w-5 h-5 rounded-full bg-stone-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-[10px] font-semibold text-stone-600">{i + 1}</span>
                          </div>
                          <div className="text-xs text-stone-700">{slide}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Growth Tactics */}
            {feedData.strategy?.growth_tactics && (
              <div className="space-y-4">
                <div className="text-xs tracking-[0.2em] uppercase font-medium text-stone-500">Growth Tactics</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {Object.entries(feedData.strategy.growth_tactics).map(([key, tactics]: any) => (
                    <div key={key} className="bg-stone-50 rounded-xl p-4 space-y-3">
                      <div className="text-sm font-medium text-stone-900 capitalize">
                        {key.replace(/([A-Z])/g, " $1").trim()}
                      </div>
                      <div className="space-y-1.5">
                        {tactics.map((tactic: string, i: number) => (
                          <div key={i} className="flex items-start gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-stone-400 flex-shrink-0 mt-1.5" />
                            <div className="text-xs text-stone-600 leading-relaxed">{tactic}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Hashtag Strategy */}
            {feedData.strategy?.hashtag_strategy && (
              <div className="space-y-4">
                <div className="text-xs tracking-[0.2em] uppercase font-medium text-stone-500">Hashtag Strategy</div>
                <div className="bg-stone-50 rounded-xl p-4 space-y-4">
                  <div>
                    <div className="text-xs text-stone-500 mb-2">Main Hashtags (Use on every post)</div>
                    <div className="flex flex-wrap gap-2">
                      {feedData.strategy.hashtag_strategy.mainHashtags?.map((tag: string, i: number) => (
                        <span
                          key={i}
                          className="px-3 py-1.5 bg-white border border-stone-200 text-stone-700 text-xs rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-stone-500 mb-2">Rotating Hashtags (Vary by post)</div>
                    <div className="flex flex-wrap gap-2">
                      {feedData.strategy.hashtag_strategy.rotatingHashtags?.map((tag: string, i: number) => (
                        <span key={i} className="px-3 py-1.5 bg-stone-100 text-stone-600 text-xs rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-xs text-stone-600 pt-2 border-t border-stone-200">
                    💡 {feedData.strategy.hashtag_strategy.hashtagPlacement}
                  </div>
                </div>
              </div>
            )}

            {/* Trending Strategy */}
            {feedData.strategy?.content_format_mix?.trends && (
              <div className="bg-stone-50 rounded-xl p-6 space-y-4">
                <div className="text-xs tracking-[0.2em] uppercase font-medium text-stone-500">Trend Strategy</div>
                <div className="space-y-3">
                  <div>
                    <div className="text-xs text-stone-500 mb-1">When to Use Trends</div>
                    <div className="text-sm text-stone-700 leading-relaxed">
                      {feedData.strategy.content_format_mix.trends.whenToUseTrends}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-stone-500 mb-1">Trending Audio</div>
                    <div className="text-sm text-stone-700">
                      {feedData.strategy.content_format_mix.trends.trendingAudio?.join(", ")}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-stone-500 mb-1">Brand Alignment</div>
                    <div className="text-sm text-stone-700 leading-relaxed">
                      {feedData.strategy.content_format_mix.trends.personalBrandAlignment}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Grid Pattern (existing) */}
            <div className="bg-stone-50 rounded-xl p-4 space-y-3">
              <div className="text-xs tracking-[0.2em] uppercase font-medium text-stone-500">Grid Pattern</div>
              <div className="text-sm font-light text-stone-700">{feedData.feed.layout_type || "Balanced Mix"}</div>
              <div className="text-sm font-light text-stone-600 leading-relaxed">
                {feedData.feed.visual_rhythm || "Dynamic flow with varied composition"}
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedPost && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setSelectedPost(null)}
        >
          <div
            className="relative w-full max-w-[470px] my-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setSelectedPost(null)}
              className="absolute -top-12 right-0 z-10 p-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full transition-colors"
            >
              <X size={20} className="text-white" />
            </button>

            {/* Action buttons - shown when image exists */}
            {selectedPost.image_url && (
              <div className="absolute -top-12 left-0 z-10 flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    actions.handleRegeneratePost(selectedPost.id)
                  }}
                  disabled={regeneratingPost === selectedPost.id}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {regeneratingPost === selectedPost.id ? "Regenerating..." : "Regenerate"}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowGallery(selectedPost.id)
                    setSelectedPost(null)
                  }}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Choose from Gallery
                </button>
              </div>
            )}

            {/* Use FeedPostCard component for full Instagram post mockup */}
            <FeedPostCard
              post={selectedPost}
              feedId={feedId}
              onGenerate={() => {
                mutate()
                setSelectedPost(null)
              }}
            />
          </div>
        </div>
      )}

      {showGallery && feedData?.feed?.id && (
        <FeedPostGallerySelector
          postId={showGallery}
          feedId={feedData.feed.id}
          onClose={() => {
            setShowGallery(null)
            // Refresh feed data to show updated image
            mutate(`/api/feed/${feedData.feed.id}`)
          }}
          onImageSelected={() => {
            // Refresh feed data to show updated image
            mutate(`/api/feed/${feedData.feed.id}`)
            toast({
              title: "Image updated",
              description: "The post image has been updated from your gallery.",
            })
          }}
        />
      )}

      {showProfileGallery && feedData?.feed?.id && (
        <FeedProfileGallerySelector
          feedId={feedData.feed.id}
          onClose={() => setShowProfileGallery(false)}
          onImageSelected={async () => {
            await mutate(`/api/feed/${feedData.feed.id}`)
            toast({
              title: "Profile image updated",
              description: "Your profile image has been updated successfully.",
            })
          }}
        />
      )}
    </div>
  )
}
