"use client"

import { useState } from "react"
import { toast } from "@/hooks/use-toast"

interface FeedCaptionCardProps {
  caption: string
  postPosition: number
  postPrompt?: string
  hashtags?: string[]
  feedId: number
  postId: number
  onAddToFeed?: () => void
  onRegenerate?: () => void
}

export default function FeedCaptionCard({
  caption,
  postPosition,
  postPrompt,
  hashtags = [],
  feedId,
  postId,
  onAddToFeed,
  onRegenerate,
}: FeedCaptionCardProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)

  const handleAddToFeed = async () => {
    if (onAddToFeed) {
      onAddToFeed()
      return
    }

    setIsAdding(true)
    try {
      const response = await fetch(`/api/feed/${feedId}/add-caption`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId,
          caption,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to add caption')
      }

      toast({
        title: "Caption added!",
        description: `Caption added to post ${postPosition}`,
      })
    } catch (error) {
      console.error("[FeedCaptionCard] Error adding caption:", error)
      toast({
        title: "Failed to add caption",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
    } finally {
      setIsAdding(false)
    }
  }

  const handleRegenerate = async () => {
    if (onRegenerate) {
      onRegenerate()
      return
    }

    setIsRegenerating(true)
    // Regeneration will be handled by parent component
    toast({
      title: "Regenerating caption",
      description: "Creating a new caption for this post...",
    })
    setIsRegenerating(false)
  }

  return (
    <div className="bg-white/[0.04] backdrop-blur-[20px] border border-white/15 rounded-[20px] p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-stone-900 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white text-sm font-light">{postPosition}</span>
          </div>
          <div>
            <h4 className="text-sm font-medium text-white">Post {postPosition}</h4>
            {postPrompt && (
              <p className="text-xs text-white/55 line-clamp-1">{postPrompt}</p>
            )}
          </div>
        </div>
      </div>

      {/* Caption Preview */}
      <div className="mb-4">
        <p className="text-sm text-white/75 leading-relaxed whitespace-pre-wrap">
          {caption}
        </p>
      </div>

      {/* Hashtags */}
      {hashtags.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {hashtags.map((tag, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1 px-2 py-1 bg-white/10 border border-white/15 rounded-md text-xs text-white/65"
            >
              #{tag.replace(/^#/, "")}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleAddToFeed}
          disabled={isAdding || isRegenerating}
          className="flex-1 py-2.5 bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/15 transition-colors text-xs sm:text-sm font-medium tracking-wide uppercase disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>{isAdding ? "Adding..." : "Add to Feed"}</span>
        </button>
        <button
          onClick={handleRegenerate}
          disabled={isAdding || isRegenerating}
          className="px-4 py-2.5 border border-white/20 text-white/75 rounded-lg hover:bg-white/10 transition-colors text-xs sm:text-sm font-medium tracking-wide uppercase disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>{isRegenerating ? "Regenerating..." : "Regenerate"}</span>
        </button>
      </div>
    </div>
  )
}






