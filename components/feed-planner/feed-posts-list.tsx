"use client"

import { useState } from "react"
import Image from "next/image"
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Loader2, Copy, Check, Wand2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import type { FeedPlannerAccess } from "@/lib/feed-planner/access-control"

interface FeedPostsListProps {
  posts: any[]
  expandedCaptions: Set<number>
  copiedCaptions: Set<number>
  enhancingCaptions: Set<number>
  isManualFeed?: boolean // Flag to identify manual feeds
  feedId: number // Feed ID for caption generation
  onToggleCaption: (postId: number) => void
  onCopyCaption: (caption: string, postId: number) => void
  onEnhanceCaption: (postId: number, caption: string) => void
  onAddImage?: (postId: number) => void // Open gallery selector (upload + gallery)
  onRefresh?: () => void // Callback to refresh feed data after caption generation
  access?: FeedPlannerAccess // Phase 4.4: Access control object (replaces mode prop)
}

export default function FeedPostsList({
  posts,
  expandedCaptions,
  copiedCaptions,
  enhancingCaptions,
  isManualFeed = false,
  feedId,
  onToggleCaption,
  onCopyCaption,
  onEnhanceCaption,
  onAddImage,
  onRefresh,
  access,
}: FeedPostsListProps) {
  const [isGeneratingCaptions, setIsGeneratingCaptions] = useState(false)

  const handleCreateCaptions = async () => {
    if (!feedId) {
      toast({
        title: "Error",
        description: "Feed ID is missing",
        variant: "destructive",
      })
      return
    }

    setIsGeneratingCaptions(true)
    try {
      const response = await fetch(`/api/feed/${feedId}/generate-captions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to generate captions' }))
        throw new Error(errorData.error || 'Failed to generate captions')
      }

      const data = await response.json()
      
      if (data.success) {
        toast({
          title: "Captions generated!",
          description: data.message || `Successfully created ${data.captionsGenerated || posts.length} captions`,
        })
        
        // Refresh feed data to show new captions
        if (onRefresh) {
          await onRefresh()
        }
      } else {
        throw new Error(data.error || 'Failed to generate captions')
      }
    } catch (error) {
      console.error("[v0] Error generating captions:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to generate captions. Please try again."
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsGeneratingCaptions(false)
    }
  }

  // Phase 4.4: Hide caption generation based on access control
  const showCaptionGeneration = access?.canGenerateCaptions ?? true // Default to true if access not provided

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Phase 4.4: Create Captions Button - Hide based on access control */}
      {showCaptionGeneration && posts.length > 0 && posts.every((p: any) => !p.caption || p.caption.trim() === "") && (
        <div className="flex justify-center pb-4">
          <button
            onClick={handleCreateCaptions}
            disabled={isGeneratingCaptions}
            className="px-6 py-3 bg-stone-900 text-white rounded-xl text-sm font-medium hover:bg-stone-800 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGeneratingCaptions ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Generating Captions...</span>
              </>
            ) : (
              <span>Create Captions</span>
            )}
          </button>
        </div>
      )}
      {posts.map((post: any) => {
        const isExpanded = expandedCaptions.has(post.id)
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
              ) : !isManualFeed && post.generation_status === "generating" && post.prediction_id ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 size={32} className="animate-spin text-stone-400" strokeWidth={1.5} />
                </div>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <button
                    onClick={() => {
                      // Always open gallery selector (upload + gallery) for all feeds
                      if (onAddImage) {
                        onAddImage(post.id)
                      }
                    }}
                    className="px-6 py-3 bg-stone-900 text-white rounded-xl text-sm font-medium hover:bg-stone-800 transition-colors"
                  >
                    Add Image
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
                        onClick={() => onToggleCaption(post.id)}
                        className="text-stone-500 ml-1 hover:text-stone-700 transition-colors"
                      >
                        {isExpanded ? "less" : "more"}
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                    <button
                      onClick={() => onCopyCaption(post.caption, post.id)}
                      className="p-2 hover:bg-stone-100 rounded-lg transition-colors border border-stone-200 hover:border-stone-300"
                      title="Copy caption"
                    >
                      {copiedCaptions.has(post.id) ? (
                        <Check size={18} className="text-green-600" />
                      ) : (
                        <Copy size={18} className="text-stone-600" />
                      )}
                    </button>
                    {/* Decision 2: Hide enhance caption button in blueprint mode */}
                    {showCaptionGeneration && (
                      <button
                        onClick={() => onEnhanceCaption(post.id, post.caption)}
                        disabled={enhancingCaptions.has(post.id)}
                        className="p-2 hover:bg-stone-100 rounded-lg transition-colors border border-stone-200 hover:border-stone-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Enhance with Maya"
                      >
                        {enhancingCaptions.has(post.id) ? (
                          <Loader2 size={18} className="text-stone-600 animate-spin" />
                        ) : (
                          <Wand2 size={18} className="text-stone-600" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-stone-400 uppercase tracking-wide">Just now</p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

