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
    <div className="bg-white rounded-none border border-stone-200 overflow-hidden">
      {/* Header - Editorial Style */}
      <div className="border-b border-stone-200 px-3 sm:px-4 md:px-6 py-3 sm:py-4">
        <h3 
          className="text-base sm:text-lg md:text-xl font-light tracking-wide text-stone-950 break-words"
          style={{ fontFamily: "'Times New Roman', serif" }}
        >
          {feedTitle || "Instagram Feed"}
        </h3>
        <p className="text-[10px] sm:text-xs text-stone-500 mt-1 uppercase tracking-wider sm:tracking-widest">
          Instagram Feed Preview
        </p>
        {feedDescription && (
          <p className="text-xs sm:text-sm text-stone-600 mt-2 font-light leading-relaxed break-words">
            {feedDescription}
          </p>
        )}
        {/* Status indicators - Editorial style - Stack on mobile */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-3 text-[10px] sm:text-xs text-stone-500 uppercase tracking-wider">
          <span>{readyCount} Ready</span>
          {pendingCount > 0 && <span>{pendingCount} Pending</span>}
          {generatingCount > 0 && <span>{generatingCount} Generating</span>}
        </div>
      </div>

      {/* 3x3 Grid - Real Instagram Layout - Full width on mobile */}
      <div className="p-2 sm:p-3 md:p-4 bg-stone-50">
        <div className="grid grid-cols-3 gap-0.5 sm:gap-1 bg-white w-full sm:max-w-[600px] sm:mx-auto">
        {sortedPosts.slice(0, 9).map((post) => {
          const isGeneratingPost = post.generation_status === "generating" || 
            generatingPostId === post.id || 
            (post.prediction_id && !post.image_url) ||
            (isAnyGenerating && !post.image_url && post.generation_status !== "failed")
          const hasImage = !!post.image_url
          
          return (
            <div
              key={post.id}
              className="relative aspect-square group cursor-pointer overflow-hidden bg-stone-100 touch-manipulation active:scale-[0.98] transition-transform duration-150 min-h-[100px] sm:min-h-[120px]"
              onClick={() => {
                if (hasImage) {
                  handleImageClick(post)
                } else if (!hasImage && post.generation_status === 'pending' && !isAnyGenerating) {
                  handleGeneratePost(post.id)
                }
              }}
            >
              {/* Generated Image */}
              {hasImage && (
                <>
                  <Image
                    src={post.image_url!}
                    alt={`Post ${post.position}`}
                    fill
                    sizes="(max-width: 640px) 33vw, (max-width: 1024px) 200px, 200px"
                    className="object-cover"
                    loading="lazy"
                    quality={85}
                  />
                  {/* Hover/Tap Overlay - Instagram Style - Show on tap for mobile */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white text-xs font-medium">
                      View Post
                    </span>
                  </div>
                </>
              )}

              {/* Generating State */}
              {!hasImage && isGeneratingPost && (
                <div className="absolute inset-0 flex items-center justify-center bg-stone-50">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-5 h-5 text-stone-400 animate-spin" strokeWidth={1.5} />
                    <span className="text-[10px] text-stone-500 uppercase tracking-wider">
                      Creating
                    </span>
                  </div>
                </div>
              )}

              {/* Pending State - Elegant Placeholder */}
              {!hasImage && !isGeneratingPost && (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-stone-50 to-stone-100 group-hover:from-stone-100 group-hover:to-stone-200 group-active:from-stone-100 group-active:to-stone-200 transition-all">
                  <div className="flex flex-col items-center gap-1 sm:gap-2">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white shadow-sm flex items-center justify-center">
                      <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5 text-stone-400" strokeWidth={1.5} />
                    </div>
                    <span className="text-[9px] sm:text-[10px] text-stone-500 uppercase tracking-wider opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity">
                      Tap to Generate
                    </span>
                  </div>
                </div>
              )}

              {/* Position Number - Subtle Corner Tag */}
              <div className="absolute top-1 right-1 w-5 h-5 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center">
                <span className="text-[10px] font-medium text-stone-700">
                  {post.position}
                </span>
              </div>
            </div>
          )
        })}
        </div>
      </div>

      {/* Caption Preview - Editorial Format */}
      {sortedPosts.length > 0 && sortedPosts[0].caption && (
        <div className="border-t border-stone-200 px-3 sm:px-4 md:px-6 py-3 sm:py-4 bg-white">
          <p className="text-[10px] sm:text-xs text-stone-500 uppercase tracking-wider sm:tracking-widest mb-2">
            Feed Strategy
          </p>
          <p className="text-xs sm:text-sm text-stone-700 leading-relaxed font-light break-words">
            {sortedPosts[0].caption.substring(0, 150)}
            {sortedPosts[0].caption.length > 150 ? '...' : ''}
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="border-t border-stone-200 px-3 sm:px-4 md:px-6 py-3 sm:py-4 bg-white space-y-2 sm:space-y-3">
        {/* Generate Feed Button - Show when there are pending posts and not generating */}
        {pendingCount > 0 && !isAnyGenerating && (
          <button
            onClick={handleGenerateFeed}
            disabled={isGenerating}
            className="w-full py-3 sm:py-3 bg-stone-900 hover:bg-stone-800 active:bg-stone-700 text-white text-xs sm:text-sm font-light tracking-wider uppercase transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed border border-stone-900 min-h-[44px] touch-manipulation"
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
          <div className="w-full py-3 bg-stone-100 text-stone-600 text-xs font-light tracking-wider uppercase text-center border border-stone-200 min-h-[44px] flex items-center justify-center">
            Generating {generatingCount > 0 ? `${generatingCount} ` : ''}Images...
          </div>
        )}
        
        {/* Create Captions Button - Show after images are generated */}
        {hasImages && (
          <button
            onClick={() => {
              router.push("/studio#maya/feed")
              setTimeout(() => {}, 100)
            }}
            className="w-full py-3 bg-stone-900 text-white hover:bg-stone-800 active:bg-stone-700 transition-colors duration-200 text-xs font-light tracking-wider uppercase border border-stone-900 min-h-[44px] touch-manipulation"
          >
            Create Captions
          </button>
        )}
        
        {/* Create Strategy Button - Show after images are generated */}
        {hasImages && (
          <button
            onClick={() => {
              router.push("/studio#maya/feed")
              setTimeout(() => {}, 100)
            }}
            className="w-full py-3 bg-stone-900 text-white hover:bg-stone-800 active:bg-stone-700 transition-colors duration-200 text-xs font-light tracking-wider uppercase border border-stone-900 min-h-[44px] touch-manipulation"
          >
            Create Strategy
          </button>
        )}
        
        {/* View Full Feed Button */}
        <button
          onClick={handleViewFullFeed}
          className="w-full py-3 bg-white border border-stone-200 text-stone-900 hover:bg-stone-50 active:bg-stone-100 hover:border-stone-300 transition-all duration-200 text-xs font-light tracking-wider uppercase min-h-[44px] touch-manipulation"
        >
          View Full Feed
        </button>
      </div>

      {/* Fullscreen Post Card Modal */}
      {isModalOpen && selectedPost && typeof window !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-sm animate-in fade-in duration-200 p-3 sm:p-4"
          onClick={handleCloseModal}
          style={{
            paddingTop: "calc(1rem + env(safe-area-inset-top))",
            paddingBottom: "calc(1rem + env(safe-area-inset-bottom))",
          }}
        >
          <div
            className="relative max-w-2xl w-full mx-2 sm:mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button - Touch-friendly */}
            <button
              onClick={handleCloseModal}
              className="absolute top-2 right-2 sm:top-4 sm:right-4 z-10 p-2 sm:p-2 bg-black/50 hover:bg-black/70 active:bg-black/80 rounded-full text-white transition-colors focus:outline-none focus:ring-2 focus:ring-white/50 min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation"
              aria-label="Close modal"
            >
              <X size={20} className="sm:w-6 sm:h-6" />
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

