"use client"

import { useState } from "react"
import { Plus, RotateCw, Hash } from "lucide-react"
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
    <div className="bg-white/50 backdrop-blur-3xl border border-white/60 rounded-2xl p-4 sm:p-6 shadow-xl shadow-stone-900/5">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-stone-900 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white text-sm font-light">{postPosition}</span>
          </div>
          <div>
            <h4 className="text-sm font-medium text-stone-900">Post {postPosition}</h4>
            {postPrompt && (
              <p className="text-xs text-stone-500 line-clamp-1">{postPrompt}</p>
            )}
          </div>
        </div>
      </div>

      {/* Caption Preview */}
      <div className="mb-4">
        <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-wrap">
          {caption}
        </p>
      </div>

      {/* Hashtags */}
      {hashtags.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {hashtags.map((tag, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1 px-2 py-1 bg-stone-100 rounded-md text-xs text-stone-600"
            >
              <Hash size={12} strokeWidth={2} />
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleAddToFeed}
          disabled={isAdding || isRegenerating}
          className="flex-1 py-2.5 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors text-xs sm:text-sm font-medium tracking-wide uppercase flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={14} strokeWidth={2} />
          <span>{isAdding ? "Adding..." : "Add to Feed"}</span>
        </button>
        <button
          onClick={handleRegenerate}
          disabled={isAdding || isRegenerating}
          className="px-4 py-2.5 border border-stone-300 text-stone-700 rounded-lg hover:bg-stone-50 transition-colors text-xs sm:text-sm font-medium tracking-wide uppercase flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RotateCw size={14} strokeWidth={2} className={isRegenerating ? "animate-spin" : ""} />
          <span>Regenerate</span>
        </button>
      </div>
    </div>
  )
}






