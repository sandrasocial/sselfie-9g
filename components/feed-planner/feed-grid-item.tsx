"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { useFeedPostPolling } from "@/lib/hooks/use-feed-post-polling"
import { toast } from "@/hooks/use-toast"

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
  const [isStopping, setIsStopping] = useState(false)

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

  // Use image URL from polling if available, otherwise use post data
  // CRITICAL: Define this FIRST before using it in isGenerating
  const displayImageUrl = pollingImageUrl || post.image_url || null

  // FIX: Show immediate loading state for optimistic UI (temp predictionId)
  // CRITICAL: Don't show generating if we already have an image
  const isGenerating = !isManualFeed && !displayImageUrl && (
    pollingStatus === "generating" ||
    !!predictionId ||
    (post.generation_status === "generating" && post.prediction_id && !post.image_url) ||
    (post.prediction_id && !post.image_url)
  )

  // A post is complete if it has an image_url
  const isComplete = !!displayImageUrl
  const canStop = !!predictionId && !predictionId.startsWith("temp-")

  const handleStopGeneration = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()

    if (!canStop || isStopping) {
      return
    }

    const confirmed = confirm("Stop this generation? If it doesn't complete, we'll refund your credit.")
    if (!confirmed) return

    setIsStopping(true)
    try {
      const response = await fetch(`/api/feed/post/${post.id}/cancel`, { method: "POST" })
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.error || "Failed to stop generation")
      }

      setPredictionId(null)
      if (onGenerateImage) {
        onGenerateImage(post.id).catch(() => {})
      }

      const refundNote = data.refunded ? "Credit refunded." : "No credit refund needed."
      toast({
        title: "Generation stopped",
        description: refundNote,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Please try again"
      toast({
        title: "Could not stop generation",
        description: message,
        variant: "destructive",
      })
    } finally {
      setIsStopping(false)
    }
  }

  const handleGenerateClick = async (e: React.MouseEvent) => {
    e.stopPropagation()
    
    // OPTIMISTIC UI: Set temporary predictionId immediately to show loading state
    // This makes the UI feel instant even though API call takes a few seconds
    const tempPredictionId = `temp-${Date.now()}`
    setPredictionId(tempPredictionId)
    console.log("[Feed Grid Item] 🚀 Starting generation (optimistic UI) for post", post.id)
    
    try {
      const data = await onGenerate(post.id)
      // Store actual predictionId from response to start polling (replaces temp one)
      if (data?.predictionId) {
        setPredictionId(data.predictionId)
        console.log("[Feed Grid Item] ✅ Generation started for post", post.id, "predictionId:", data.predictionId)
      } else {
        // If no predictionId, clear optimistic state
        setPredictionId(null)
      }
    } catch (error) {
      // Clear optimistic state on error
      setPredictionId(null)
      console.error("[Feed Grid Item] Error starting generation:", error)
    }
  }

  return (
    <div
      draggable={isComplete && !isSavingOrder}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      className={`relative aspect-square border border-white/10 bg-white/[0.04] backdrop-blur-[2px] transition-all duration-200 ${
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
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/45 backdrop-blur-[1px]">
          <span className="mb-2 h-5 w-5 rounded-full border border-white/35 border-t-white animate-spin" />
          <div className="text-center text-[10px] font-light text-white/65">
            Creating...
          </div>
          <button
            type="button"
            onClick={handleStopGeneration}
            disabled={!canStop || isStopping}
            className={`mt-2 text-[10px] font-light ${
              !canStop || isStopping ? "text-white/30" : "text-white/70 hover:text-white"
            }`}
          >
            {isStopping ? "Stopping..." : "Stop generation"}
          </button>
        </div>
      ) : (
        // Show generation button for paid users, gallery selector for others
        showGenerateButton ? (
          <button
            className="absolute inset-0 flex cursor-pointer flex-col items-center justify-center bg-white/[0.04] p-3 transition-colors hover:bg-white/[0.1]"
            onClick={handleGenerateClick}
            disabled={isGenerating}
          >
            <div className="mb-2 rounded-full border border-white/20 bg-white/8 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-white/70">
              Add
            </div>
            <div className="text-center text-[10px] font-light uppercase tracking-[0.2em] text-white/65">
              Generate image
            </div>
          </button>
        ) : (
          <div
            className="absolute inset-0 flex cursor-pointer flex-col items-center justify-center bg-white/[0.04] p-3 transition-colors hover:bg-white/[0.1]"
            onClick={(e) => {
              e.stopPropagation()
              // Open gallery selector for free users
              if (onAddImage) {
                onAddImage(post.id)
              }
            }}
          >
            <div className="mb-2 rounded-full border border-white/20 bg-white/8 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-white/60">
              Add
            </div>
            <div className="text-center text-[10px] font-light uppercase tracking-[0.2em] text-white/55">
              Click to add image
            </div>
          </div>
        )
      )}
    </div>
  )
}
