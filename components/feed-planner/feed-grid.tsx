"use client"

import { useState } from "react"
import { toast } from "@/hooks/use-toast"
import { ToastAction } from "@/components/ui/toast"
import type { FeedPlannerAccess } from "@/lib/feed-planner/access-control"
import FeedGridItem from "./feed-grid-item"

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
  onRequireFeedStyle?: () => void
  onRequireOnboarding?: () => void
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
  onRequireFeedStyle,
  onRequireOnboarding,
  onDragStart,
  onDragOver,
  onDragEnd,
}: FeedGridProps) {
  // Phase 5.1: Handle direct image generation for paid users
  const handleGenerateImage = async (postId: number) => {
    if (!access?.canGenerateImages) {
      toast({
        title: "Access restricted",
        description: "Image generation is only available for paid users.",
        variant: "destructive",
      })
      return { error: "Access restricted" }
    }

    // Show toast immediately for instant feedback (don't wait for API)
    toast({
      title: "Generating photo",
      description: "This usually takes 1-2 minutes",
    })

    try {
      const response = await fetch(`/api/feed/${feedId}/generate-single`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to generate" }))
        const errorCode = errorData.error || "Failed to generate"
        const errorDetails = errorData.details || errorData.message || ""

        if (response.status === 422) {
          if (errorCode === "FEED_STYLE_REQUIRED") {
            toast({
              title: "Choose a feed style",
              description: "Pick a style to generate this feed.",
              variant: "destructive",
              action: onRequireFeedStyle ? (
                <ToastAction altText="Choose style" onClick={onRequireFeedStyle}>
                  Choose style
                </ToastAction>
              ) : undefined,
            })
            return { error: errorCode }
          }

          if (errorCode === "CANONICAL_FIELDS_REQUIRED" || errorCode === "TEMPLATE_INJECTION_REQUIRED") {
            toast({
              title: "Complete your brand profile",
              description: "Add your visual aesthetic and fashion style to generate images.",
              variant: "destructive",
              action: onRequireOnboarding ? (
                <ToastAction altText="Complete profile" onClick={onRequireOnboarding}>
                  Complete profile
                </ToastAction>
              ) : undefined,
            })
            return { error: errorCode }
          }
        }

        const fullErrorMessage = errorDetails ? `${errorCode}: ${errorDetails}` : errorCode
        throw new Error(fullErrorMessage)
      }

      const data = await response.json()

      // NON-BLOCKING: Call refresh callback without awaiting (don't block UI)
      // This allows the loading state to show immediately while data refreshes in background
      if (onGenerateImage) {
        onGenerateImage(postId).catch((err) => {
          console.error("[Feed Grid] Error refreshing feed data:", err)
          // Don't show error to user - this is just a background refresh
        })
      }

      // Return predictionId for the grid item to start polling
      return data
    } catch (error) {
      console.error("[Feed Grid] Generate error:", error)
      const errorMessage = error instanceof Error ? error.message : "Please try again"
      
      toast({
        title: "Generation failed",
        description: errorMessage.length > 100 ? `${errorMessage.substring(0, 100)}...` : errorMessage,
        variant: "destructive",
      })
      return { error: errorMessage }
    }
  }

  // Phase 5.1: Determine if generation button should be shown
  const showGenerateButton = access?.canGenerateImages ?? false
  // Phase 4: Changed from grid-cols-3 (9 posts) to grid-cols-4 (12 posts) for paid blueprint
  return (
    <div className="grid grid-cols-3 md:grid-cols-4 gap-[2px] md:gap-1">
      {posts.map((post: any, index: number) => (
        <FeedGridItem
          key={post.id}
          post={post}
          feedId={feedId}
          isManualFeed={isManualFeed}
          isDragging={draggedIndex === index}
          isSavingOrder={isSavingOrder}
          showGenerateButton={showGenerateButton}
          onPostClick={onPostClick}
          onAddImage={onAddImage}
          onGenerateImage={onGenerateImage}
          onDragStart={() => onDragStart(index)}
          onDragOver={(e) => onDragOver(e, index)}
          onDragEnd={onDragEnd}
          onGenerate={handleGenerateImage}
        />
      ))}
    </div>
  )
}

