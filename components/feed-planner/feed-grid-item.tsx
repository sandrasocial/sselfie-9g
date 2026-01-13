"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { ImageIcon, Loader2 } from "lucide-react"
import { useFeedPostPolling } from "@/lib/hooks/use-feed-post-polling"

interface FeedGridItemProps {
  post: any
  feedId: number
  isManualFeed: boolean
  isDragging: boolean
  isSavingOrder: boolean
  showGenerateButton: boolean
  onPostClick: (post: any) => void
  onAddImage?: (postId: number) => void
  onGenerateImage?: (postId: number) => Promise<void>
  onDragStart: () => void
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void
  onDragEnd: () => void
  onGenerate: (postId: number) => Promise<void>
}

export default function FeedGridItem({
  post,
  feedId,
  isManualFeed,
  isDragging,
  isSavingOrder,
  showGenerateButton,
  onPostClick,
  onAddImage,
  onGenerateImage,
  onDragStart,
  onDragOver,
  onDragEnd,
  onGenerate,
}: FeedGridItemProps) {
  // Store predictionId for polling
  // FIX: Only store predictionId if post doesn't already have an image
  // If post already has image_url, we don't need to poll
  const [predictionId, setPredictionId] = useState<string | null>(
    post?.prediction_id && !post?.image_url ? post.prediction_id : null
  )

  // FIX: Use per-placeholder polling hook (matches concept card pattern)
  // CRITICAL: Only poll if we have predictionId AND no image_url yet
  // If post already has image_url, don't poll (enabled = false)
  const { status: pollingStatus, imageUrl: pollingImageUrl } = useFeedPostPolling({
    feedId,
    postId: post.id,
    predictionId,
    enabled: !!predictionId && !post?.image_url, // Only poll if we have predictionId and no image in DB yet
    onComplete: (imageUrl) => {
      console.log("[Feed Grid Item] ✅ Generation completed for post", post.id, "imageUrl:", imageUrl)
      // Clear predictionId to stop polling
      setPredictionId(null)
      // Call refresh callback to update parent feed data
      if (onGenerateImage) {
        onGenerateImage(post.id)
      }
    },
    onError: (error) => {
      console.error("[Feed Grid Item] ❌ Generation failed for post", post.id, ":", error)
      // Clear predictionId to stop polling
      setPredictionId(null)
    },
  })

  // Update predictionId when post data changes
  // FIX: Only update if post doesn't already have an image_url
  useEffect(() => {
    // If post already has image_url, clear predictionId (no need to poll)
    if (post?.image_url) {
      if (predictionId) {
        setPredictionId(null)
      }
      return
    }
    
    // Only set predictionId if post has one and no image yet
    if (post?.prediction_id && post.prediction_id !== predictionId) {
      setPredictionId(post.prediction_id)
    }
  }, [post?.prediction_id, post?.image_url, predictionId])

  // FIX: Simplified loading state - use polling status if available
  // CRITICAL: Don't show generating if we already have an image
  const isGenerating = !isManualFeed && !displayImageUrl && (
    pollingStatus === "generating" ||
    (post.generation_status === "generating" && post.prediction_id && !post.image_url) ||
    (post.prediction_id && !post.image_url)
  )

  // Use image URL from polling if available, otherwise use post data
  const displayImageUrl = pollingImageUrl || post.image_url || null

  // A post is complete if it has an image_url
  const isComplete = !!displayImageUrl

  const handleGenerateClick = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const data = await onGenerate(post.id)
      // Store predictionId from response to start polling
      if (data?.predictionId) {
        setPredictionId(data.predictionId)
        console.log("[Feed Grid Item] ✅ Generation started for post", post.id, "predictionId:", data.predictionId)
      }
    } catch (error) {
      console.error("[Feed Grid Item] Error starting generation:", error)
    }
  }

  return (
    <div
      draggable={isComplete && !isSavingOrder}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      className={`aspect-square bg-stone-100 relative transition-all duration-200 ${
        isDragging ? 'opacity-50 scale-95' : ''
      } ${
        isComplete && !isSavingOrder ? 'cursor-move hover:opacity-90' : 'cursor-pointer'
      }`}
    >
      {displayImageUrl && !isGenerating ? (
        <Image
          src={displayImageUrl || "/placeholder.svg"}
          alt={`Post ${post.position}`}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 33vw, 311px"
          onClick={() => onPostClick(post)}
        />
      ) : isGenerating ? (
        <div className="absolute inset-0 bg-stone-50 flex flex-col items-center justify-center">
          <Loader2 size={20} className="text-stone-400 animate-spin mb-2" strokeWidth={1.5} />
          <div className="text-[10px] font-light text-stone-500 text-center">
            Creating...
          </div>
        </div>
      ) : (
        // Show generation button for paid users, gallery selector for others
        showGenerateButton ? (
          <button
            className="absolute inset-0 bg-white flex flex-col items-center justify-center p-3 cursor-pointer hover:bg-stone-50 transition-colors"
            onClick={handleGenerateClick}
            disabled={isGenerating}
          >
            <ImageIcon className="w-10 h-10 text-stone-400 mb-2" strokeWidth={1.5} />
            <div className="text-[10px] font-light text-stone-600 text-center">
              Generate image
            </div>
          </button>
        ) : (
          <div
            className="absolute inset-0 bg-white flex flex-col items-center justify-center p-3 cursor-pointer hover:bg-stone-50 transition-colors"
            onClick={(e) => {
              e.stopPropagation()
              // Open gallery selector for free users
              if (onAddImage) {
                onAddImage(post.id)
              }
            }}
          >
            <ImageIcon className="w-10 h-10 text-stone-300 mb-2" strokeWidth={1.5} />
            <div className="text-[10px] font-light text-stone-500 text-center">
              Click to add image
            </div>
          </div>
        )
      )}
    </div>
  )
}
