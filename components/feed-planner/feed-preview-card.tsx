"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { ImageIcon, Loader2, X, Wand2 } from 'lucide-react'
import { useRouter } from "next/navigation"
import { toast } from "@/hooks/use-toast"
import { createPortal } from "react-dom"
import FeedPostCard from "./feed-post-card"

interface FeedPost {
  id: number
  position: number
  image_url: string | null
  generation_status: string
  prediction_id?: string | null
  prompt?: string
  content_pillar?: string
  post_type?: string
  caption?: string
}

interface FeedPreviewCardProps {
  feedId: number
  feedTitle?: string
  feedDescription?: string
  posts: FeedPost[]
  onViewFullFeed?: () => void
  needsRestore?: boolean // If true, fetch feed data on mount
}

export default function FeedPreviewCard({
  feedId,
  feedTitle,
  feedDescription,
  posts,
  onViewFullFeed,
  needsRestore = false,
}: FeedPreviewCardProps) {
  const router = useRouter()
  const [postsData, setPostsData] = useState<FeedPost[]>(posts)
  const [isGenerating, setIsGenerating] = useState(() => {
    // Initialize generating state based on posts - if any have prediction_id or generating status
    return posts.some(p => p.generation_status === "generating" || (p.prediction_id && !p.image_url))
  })
  const [generatingPostId, setGeneratingPostId] = useState<number | null>(null)
  const [selectedPost, setSelectedPost] = useState<FeedPost | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  // Restore feed data if needed (on page refresh)
  useEffect(() => {
    if (needsRestore && feedId) {
      fetch(`/api/feed/${feedId}`)
        .then(res => res.json())
        .then(feedData => {
          if (feedData.posts && Array.isArray(feedData.posts)) {
            setPostsData(feedData.posts)
          }
        })
        .catch(err => {
          console.error("[FeedPreviewCard] Failed to restore feed data:", err)
        })
    }
  }, [needsRestore, feedId])

  // Poll for feed updates to show progress (only while generating)
  useEffect(() => {
    // Poll if:
    // 1. There are posts with generating status
    // 2. There are posts without images (might be generating)
    // 3. We're in generating state
    const hasGeneratingPosts = postsData.some((p: FeedPost) => 
      p.generation_status === "generating" || p.prediction_id !== null
    )
    const hasPendingPosts = postsData.some((p: FeedPost) => 
      !p.image_url && p.generation_status !== "failed"
    )
    
    // Always poll if there are posts without images (they might be generating)
    if (!hasGeneratingPosts && !hasPendingPosts && !isGenerating) {
      return // Don't poll if nothing is generating or pending
    }
    
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/feed/${feedId}`)
        if (response.ok) {
          const data = await response.json()
          // Posts are at root level, not nested in feed
          if (data.posts && Array.isArray(data.posts)) {
            setPostsData(data.posts)
            // Check if any images are still generating
            const stillGenerating = data.posts.some((p: FeedPost) => 
              p.generation_status === "generating" || (p.prediction_id && !p.image_url)
            )
            const allCompleted = data.posts.every((p: FeedPost) => 
              p.image_url || p.generation_status === "failed"
            )
            
            if (stillGenerating) {
              setIsGenerating(true)
            } else if (allCompleted) {
              setIsGenerating(false)
            }
          } else if (data.feed?.posts && Array.isArray(data.feed.posts)) {
            // Fallback for legacy format (backward compatibility)
            setPostsData(data.feed.posts)
          }
        }
      } catch (error) {
        console.error("[FeedPreviewCard] Error fetching feed updates:", error)
      }
    }, 3000) // Poll every 3 seconds

    return () => clearInterval(interval)
  }, [feedId, postsData, isGenerating])

  const sortedPosts = [...postsData].sort((a, b) => a.position - b.position)
  const readyCount = postsData.filter(p => p.image_url).length
  const totalPosts = postsData.length
  const pendingCount = postsData.filter(p => !p.image_url && p.generation_status !== "generating").length
  const generatingCount = postsData.filter(p => 
    p.generation_status === "generating" || (p.prediction_id && !p.image_url)
  ).length
  const hasPendingPosts = pendingCount > 0
  const hasImages = postsData.some(p => p.image_url)
  const isAnyGenerating = generatingCount > 0 || isGenerating

  const handleViewFullFeed = () => {
    if (onViewFullFeed) {
      onViewFullFeed()
    } else {
      // Route to feed planner with feedId query param
      router.push(`/feed-planner?feedId=${feedId}`)
    }
  }

  const handleGeneratePost = async (postId: number) => {
    setGeneratingPostId(postId)

    try {
      const response = await fetch(`/api/feed/${feedId}/generate-single`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId }),
      })

      if (!response.ok) {
        // Try to parse error response for detailed error message
        let errorMessage = "Failed to generate image"
        let errorDetails = ""
        
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
          errorDetails = errorData.details || ""
          console.error("[FeedPreviewCard] API Error:", {
            status: response.status,
            error: errorMessage,
            details: errorDetails,
            fullError: errorData
          })
        } catch (parseError) {
          // If JSON parsing fails, use status text
          errorMessage = response.statusText || errorMessage
          console.error("[FeedPreviewCard] Failed to parse error response:", parseError)
        }

        throw new Error(errorDetails || errorMessage)
      }

      const result = await response.json()
      console.log("[FeedPreviewCard] ✅ Generation started:", result)

      toast({
        title: "Generating photo",
        description: "This takes about 30 seconds",
      })

      // Refresh posts data
      const feedResponse = await fetch(`/api/feed/${feedId}`)
      if (feedResponse.ok) {
        const feedData = await feedResponse.json()
        if (feedData.posts) {
          setPostsData(feedData.posts)
        }
      }
    } catch (error) {
      console.error("[FeedPreviewCard] Generate error:", error)
      const errorMessage = error instanceof Error ? error.message : "Please try again"
      
      toast({
        title: "Generation failed",
        description: errorMessage,
        variant: "destructive",
        duration: 5000, // Show longer for error messages
      })
    } finally {
      setGeneratingPostId(null)
    }
  }

  const handleGenerateFeed = async () => {
    setIsGenerating(true)
    
    try {
      console.log("[FeedPreviewCard] 🚀 Generating ALL feed images for feed:", feedId)
      
      const response = await fetch(`/api/feed-planner/queue-all-images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ feedLayoutId: feedId }),
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || errorData.details || 'Failed to generate feed images'
        console.error("[FeedPreviewCard] ❌ API Error:", {
          status: response.status,
          error: errorMessage,
          fullError: errorData,
        })
        throw new Error(errorMessage)
      }
      
      const data = await response.json()
      console.log("[FeedPreviewCard] ✅ Generation started:", data)
      
      // Check if any posts were actually queued
      if (data.queuedCount === 0 && data.failedCount > 0) {
        // All posts failed to queue
        toast({
          title: "Generation failed",
          description: data.message || `Failed to queue ${data.failedCount} post(s). Please check your credits and try again.`,
          variant: "destructive",
        })
        setIsGenerating(false)
        return
      }
      
      if (data.queuedCount > 0) {
        toast({
          title: "Generating feed images",
          description: `Started generating ${data.queuedCount} of ${data.totalPosts} images. This takes about 30 seconds per image.`,
        })
      }
      
      // Refresh posts data immediately to show generating status
      // The polling will continue to update, but we need an immediate refresh
      try {
        const feedResponse = await fetch(`/api/feed/${feedId}`)
        if (feedResponse.ok) {
          const feedData = await feedResponse.json()
          if (feedData.posts && Array.isArray(feedData.posts)) {
            setPostsData(feedData.posts)
            // Check if posts are actually generating after queue
            const hasGeneratingPosts = feedData.posts.some((p: FeedPost) => 
              p.generation_status === "generating" || (p.prediction_id && !p.image_url)
            )
            if (hasGeneratingPosts) {
              setIsGenerating(true) // Keep generating state if posts are actually generating
            } else {
              // Wait a bit more for posts to update, then check again
              setTimeout(async () => {
                const recheckResponse = await fetch(`/api/feed/${feedId}`)
                if (recheckResponse.ok) {
                  const recheckData = await recheckResponse.json()
                  if (recheckData.posts && Array.isArray(recheckData.posts)) {
                    setPostsData(recheckData.posts)
                    const stillGenerating = recheckData.posts.some((p: FeedPost) => 
                      p.generation_status === "generating" || (p.prediction_id && !p.image_url)
                    )
                    setIsGenerating(stillGenerating)
                    
                    // If nothing is generating after retry, there might be an issue
                    if (!stillGenerating && data.queuedCount > 0) {
                      console.warn("[FeedPreviewCard] ⚠️ Posts were queued but not showing as generating")
                      toast({
                        title: "Generation status unclear",
                        description: "Images were queued but status update is delayed. Please refresh the page.",
                        variant: "default",
                      })
                    }
                  }
                }
              }, 2000)
            }
          }
        }
      } catch (refreshError) {
        console.error("[FeedPreviewCard] Error refreshing posts after generation start:", refreshError)
        // Don't fail the whole operation if refresh fails
        // But reset generating state since we can't verify
        setIsGenerating(false)
      }
    } catch (error) {
      console.error("[FeedPreviewCard] ❌ Error generating feed:", error)
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : 'Please try again',
        variant: "destructive",
      })
      setIsGenerating(false)
    }
  }

  const handleImageClick = (post: FeedPost) => {
    if (post.image_url) {
      setSelectedPost(post)
      setIsModalOpen(true)
    }
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedPost(null)
  }

  const handleRefreshPosts = async () => {
    try {
      const response = await fetch(`/api/feed/${feedId}`)
      if (response.ok) {
        const data = await response.json()
        if (data.posts) {
          setPostsData(data.posts)
          // Update selected post if modal is open
          if (selectedPost) {
            const updatedPost = data.posts.find((p: FeedPost) => p.id === selectedPost.id)
            if (updatedPost) {
              setSelectedPost(updatedPost)
            }
          }
        }
      }
    } catch (error) {
      console.error("[FeedPreviewCard] Error refreshing posts:", error)
    }
  }

  // Handle ESC key to close modal and prevent body scroll
  useEffect(() => {
    if (!isModalOpen) return
    
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden'
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsModalOpen(false)
        setSelectedPost(null)
      }
    }
    window.addEventListener('keydown', handleEscape)
    
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleEscape)
    }
  }, [isModalOpen])

  return (
    <div className="bg-white/50 backdrop-blur-3xl border border-white/60 rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-xl shadow-stone-900/5">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif text-xl sm:text-2xl font-extralight tracking-[0.15em] sm:tracking-[0.2em] text-stone-900 uppercase">
            {feedTitle || "Instagram Feed"}
          </h3>
          <div className="flex items-center gap-3 text-xs sm:text-sm font-light text-stone-600">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-stone-900 rounded-full"></div>
              <span>{readyCount} Ready</span>
            </div>
            {pendingCount > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-stone-300 rounded-full"></div>
                <span>{pendingCount} Pending</span>
              </div>
            )}
          </div>
        </div>
        {feedDescription && (
          <p className="text-sm font-light text-stone-500 leading-relaxed">
            {feedDescription}
          </p>
        )}
      </div>

      {/* 3x3 Grid Preview */}
      <div className="grid grid-cols-3 gap-1 bg-stone-100 p-1 rounded-xl mb-4">
        {sortedPosts.slice(0, 9).map((post) => {
          // Get post description for banner (show post_type, not content_pillar)
          const postDescription = post.post_type || `Post ${post.position}`
          const isGeneratingPost = post.generation_status === "generating" || 
            generatingPostId === post.id || 
            (post.prediction_id && !post.image_url) ||
            (isAnyGenerating && !post.image_url && post.generation_status !== "failed")
          const hasImage = !!post.image_url
          
          return (
            <div
              key={post.id}
              className="aspect-square bg-white rounded-lg overflow-hidden relative group"
            >
              {hasImage ? (
                <button
                  onClick={() => handleImageClick(post)}
                  className="w-full h-full relative focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-2 rounded-lg"
                >
                  <Image
                    src={post.image_url!}
                    alt={`Post ${post.position}`}
                    fill
                    className="object-cover"
                  />
                </button>
              ) : isGeneratingPost ? (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-stone-50 to-stone-100/50">
                  <Loader2 size={20} className="text-stone-400 animate-spin mb-2" strokeWidth={1.5} />
                  <p className="text-[10px] text-stone-500 font-extralight tracking-[0.15em] uppercase">Creating...</p>
                </div>
              ) : (
                <button
                  onClick={() => handleGeneratePost(post.id)}
                  disabled={isAnyGenerating}
                  className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-stone-50 via-stone-50/50 to-stone-100/50 hover:from-white hover:via-white hover:to-stone-50 transition-all duration-300 p-4 disabled:opacity-50 disabled:cursor-not-allowed relative group"
                >
                  {/* Elegant background pattern */}
                  <div className="absolute inset-0 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity duration-300">
                    <div className="w-full h-full" style={{
                      backgroundImage: 'radial-gradient(circle at 2px 2px, rgb(28 25 23) 1px, transparent 0)',
                      backgroundSize: '20px 20px'
                    }}></div>
                  </div>
                  
                  {/* Subtle gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-stone-100/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  
                  {/* Content */}
                  <div className="relative z-10 flex flex-col items-center">
                    {/* Post Type Badge - More luxurious */}
                    <div className="mb-4 px-4 py-1.5 bg-white/90 backdrop-blur-md border border-stone-200/80 rounded-full shadow-sm group-hover:shadow-md transition-shadow duration-300">
                      <span className="text-[10px] font-light text-stone-900 tracking-[0.15em] uppercase">
                        {post.post_type?.toLowerCase() || 'portrait'}
                      </span>
                    </div>
                    
                    {/* Icon - More refined */}
                    <div className="mb-3 w-14 h-14 rounded-full bg-white/70 backdrop-blur-md border border-stone-200/60 flex items-center justify-center shadow-sm group-hover:shadow-md group-hover:border-stone-300/80 transition-all duration-300">
                      <ImageIcon size={22} className="text-stone-400 group-hover:text-stone-500 transition-colors duration-300" strokeWidth={1.5} />
                    </div>
                    
                    {/* Generate Button - More elegant typography */}
                    <span className="text-[10px] font-extralight text-stone-600 tracking-[0.2em] uppercase group-hover:text-stone-700 transition-colors duration-300">
                      Click to generate
                    </span>
                  </div>
                </button>
              )}
              
              {/* Position indicator - More elegant */}
              <div className="absolute top-2 left-2 w-5 h-5 bg-white/95 backdrop-blur-md rounded-full flex items-center justify-center shadow-sm border border-stone-200/50 z-10">
                <span className="text-[10px] font-extralight text-stone-900">{post.position}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Action Buttons */}
      <div className="space-y-3 mt-6">
        {/* Generate Feed Button - Show when there are pending posts and not generating */}
        {pendingCount > 0 && !isAnyGenerating && (
          <button
            onClick={handleGenerateFeed}
            disabled={isGenerating}
            className="w-full py-3 sm:py-4 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-sm sm:text-base font-light tracking-[0.15em] uppercase transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed border border-stone-900"
          >
            {isGenerating ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                Starting Generation...
              </span>
            ) : (
              `Generate All ${pendingCount} Image${pendingCount > 1 ? 's' : ''}`
            )}
          </button>
        )}
        
        {/* Generating State - Show when any images are generating */}
        {isAnyGenerating && (
          <div className="w-full py-3 sm:py-3.5 bg-stone-100 text-stone-600 rounded-xl text-xs sm:text-sm font-light tracking-[0.15em] uppercase text-center border border-stone-200">
            Generating {generatingCount > 0 ? `${generatingCount} ` : ''}Images...
          </div>
        )}
        
        {/* Create Captions Button - Show after images are generated */}
        {hasImages && (
          <button
            onClick={() => {
              // Navigate to Maya Feed tab with "Create captions" prompt
              router.push("/studio#maya/feed")
              // Small delay to ensure tab is loaded
              setTimeout(() => {
                // User can use quick prompt or type "Create captions"
              }, 100)
            }}
            className="w-full py-3 sm:py-3.5 bg-stone-900 text-white rounded-xl hover:bg-stone-800 active:bg-stone-950 transition-all duration-300 text-xs sm:text-sm font-light tracking-[0.15em] uppercase shadow-md hover:shadow-lg"
          >
            Create Captions
          </button>
        )}
        
        {/* Create Strategy Button - Show after images are generated */}
        {hasImages && (
          <button
            onClick={() => {
              // Navigate to Maya Feed tab with "Create strategy" prompt
              router.push("/studio#maya/feed")
              // Small delay to ensure tab is loaded
              setTimeout(() => {
                // User can use quick prompt or type "Create strategy"
              }, 100)
            }}
            className="w-full py-3 sm:py-3.5 bg-stone-900 text-white rounded-xl hover:bg-stone-800 active:bg-stone-950 transition-all duration-300 text-xs sm:text-sm font-light tracking-[0.15em] uppercase shadow-md hover:shadow-lg"
          >
            Create Strategy
          </button>
        )}
        
        {/* View Full Feed Button */}
        <button
          onClick={handleViewFullFeed}
          className="w-full py-3 sm:py-3.5 bg-white/80 backdrop-blur-sm border border-stone-200 text-stone-900 rounded-xl hover:bg-white hover:border-stone-300 active:bg-stone-50 transition-all duration-300 text-xs sm:text-sm font-light tracking-[0.15em] uppercase shadow-sm hover:shadow-md"
        >
          View Full Feed
        </button>
      </div>

      {/* Fullscreen Post Card Modal */}
      {isModalOpen && selectedPost && typeof window !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={handleCloseModal}
        >
          <div
            className="relative max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={handleCloseModal}
              className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
              aria-label="Close modal"
            >
              <X size={24} />
            </button>

            {/* FeedPostCard */}
            <FeedPostCard
              post={{
                id: selectedPost.id,
                position: selectedPost.position,
                prompt: selectedPost.prompt || '',
                caption: selectedPost.caption || '',
                content_pillar: selectedPost.post_type || selectedPost.content_pillar || '',
                image_url: selectedPost.image_url,
                generation_status: selectedPost.generation_status,
              }}
              feedId={feedId}
              onGenerate={handleRefreshPosts}
            />
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

