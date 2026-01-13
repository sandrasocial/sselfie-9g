"use client"

import { useState } from "react"
import Image from "next/image"
import { ImageIcon, Loader2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import type { FeedPlannerAccess } from "@/lib/feed-planner/access-control"

interface FeedGridProps {
  posts: any[]
  postStatuses: any[]
  draggedIndex: number | null
  isSavingOrder: boolean
  isManualFeed?: boolean // Flag to identify manual feeds
  feedId: number // Feed ID for image generation
  access?: FeedPlannerAccess // Phase 5.1: Access control for image generation
  onPostClick: (post: any) => void
  onAddImage?: (postId: number) => void // Open gallery selector (upload + gallery)
  onGenerateImage?: (postId: number) => Promise<void> // Phase 5.1: Callback after image generation
  onDragStart: (index: number) => void
  onDragOver: (e: React.DragEvent<HTMLDivElement>, index: number) => void
  onDragEnd: () => void
}

export default function FeedGrid({
  posts,
  postStatuses,
  draggedIndex,
  isSavingOrder,
  isManualFeed = false,
  feedId,
  access,
  onPostClick,
  onAddImage,
  onGenerateImage,
  onDragStart,
  onDragOver,
  onDragEnd,
}: FeedGridProps) {
  const [generatingPostId, setGeneratingPostId] = useState<number | null>(null)

  // Phase 5.1: Handle direct image generation for paid users
  const handleGenerateImage = async (postId: number) => {
    if (!access?.canGenerateImages) {
      toast({
        title: "Access restricted",
        description: "Image generation is only available for paid users.",
        variant: "destructive",
      })
      return
    }

    setGeneratingPostId(postId)

    try {
      const response = await fetch(`/api/feed/${feedId}/generate-single`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to generate" }))
        throw new Error(errorData.error || "Failed to generate")
      }

      toast({
        title: "Generating photo",
        description: "This takes about 30 seconds",
      })

      // Call refresh callback if provided
      if (onGenerateImage) {
        await onGenerateImage(postId)
      }
    } catch (error) {
      console.error("[Feed Grid] Generate error:", error)
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
    } finally {
      setGeneratingPostId(null)
    }
  }

  // Phase 5.1: Determine if generation button should be shown
  const showGenerateButton = access?.canGenerateImages ?? false
  // Phase 4: Changed from grid-cols-3 (9 posts) to grid-cols-4 (12 posts) for paid blueprint
  return (
    <div className="grid grid-cols-3 md:grid-cols-4 gap-[2px] md:gap-1">
      {posts.map((post: any, index: number) => {
        const postStatus = postStatuses.find(p => p.id === post.id)
        // For manual feeds, NEVER show generating state
        // For Maya feeds, only show generating if post has prediction_id (actively generating in Replicate)
        const isGenerating = !isManualFeed && (postStatus?.isGenerating || (post.generation_status === "generating" && post.prediction_id))
        // SIMPLIFIED: A post is complete if it has an image_url (regardless of status)
        const isComplete = !!post.image_url
        const isDragging = draggedIndex === index

        return (
          <div
            key={post.id}
            draggable={isComplete && !isSavingOrder}
            onDragStart={() => onDragStart(index)}
            onDragOver={(e) => onDragOver(e, index)}
            onDragEnd={onDragEnd}
            className={`aspect-square bg-stone-100 relative transition-all duration-200 ${
              isDragging ? 'opacity-50 scale-95' : ''
            } ${
              isComplete && !isSavingOrder ? 'cursor-move hover:opacity-90' : 'cursor-pointer'
            }`}
          >
            {post.image_url && !isGenerating ? (
              <Image
                src={post.image_url || "/placeholder.svg"}
                alt={`Post ${post.position}`}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 33vw, 311px"
                onClick={() => onPostClick(post)}
              />
            ) : isGenerating || generatingPostId === post.id ? (
              <div className="absolute inset-0 bg-stone-50 flex flex-col items-center justify-center">
                <Loader2 size={20} className="text-stone-400 animate-spin mb-2" strokeWidth={1.5} />
                <div className="text-[10px] font-light text-stone-500 text-center">
                  Creating...
                </div>
              </div>
            ) : (
              // Phase 5.1: Show generation button for paid users, gallery selector for others
              showGenerateButton ? (
                <button
                  className="absolute inset-0 bg-white flex flex-col items-center justify-center p-3 cursor-pointer hover:bg-stone-50 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleGenerateImage(post.id)
                  }}
                  disabled={generatingPostId !== null}
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
      })}
    </div>
  )
}

