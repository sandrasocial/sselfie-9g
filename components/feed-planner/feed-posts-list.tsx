"use client"

import { useState } from "react"
import Image from "next/image"
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
    <div className="app-light-panel-text space-y-6 px-3 pb-6 md:space-y-8">
      {/* Phase 4.4: Create Captions Button - Hide based on access control */}
      {showCaptionGeneration && posts.length > 0 && posts.every((p: any) => !p.caption || p.caption.trim() === "") && (
        <div className="flex justify-center pb-4">
          <button
            onClick={handleCreateCaptions}
            disabled={isGeneratingCaptions}
            className="flex items-center gap-2 rounded-[6px] border border-[color:var(--app-btn-primary-bg)] bg-[color:var(--app-btn-primary-bg)] px-6 py-3 text-sm font-medium uppercase tracking-[0.2em] text-[color:var(--app-btn-primary-text)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isGeneratingCaptions ? (
              <>
                <span className="h-[18px] w-[18px] rounded-full border border-[rgba(237,233,226,0.42)] border-t-[color:var(--app-btn-primary-text)] animate-spin" />
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
          <div key={post.id} className="rounded-[16px] border border-[color:var(--app-glass-border)] bg-[rgba(255,255,255,0.74)] p-3 pb-5 shadow-[0_12px_32px_rgba(61,56,48,0.06)] backdrop-blur-[18px]">
            <div className="flex items-center justify-between px-2 py-3 md:px-1">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 p-[2px]">
                  <div className="flex h-full w-full items-center justify-center rounded-full border border-white/10 bg-[rgba(15,13,11,0.92)]">
                    <span className="text-xs font-bold" style={{ color: "#F4F0E6" }}>S</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-[color:var(--app-text-primary)]">sselfie</p>
                  <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--app-text-secondary)]">{post.content_pillar || `Post ${post.position}`}</p>
                </div>
              </div>
              <button className="rounded-[6px] border border-[color:var(--app-glass-border)] bg-[color:var(--app-btn-secondary-bg)] px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-[color:var(--app-text-secondary)] transition-colors hover:bg-[color:var(--app-btn-secondary-hover)] hover:text-[color:var(--app-text-primary)]">
                Menu
              </button>
            </div>

            <div className="relative aspect-square overflow-hidden rounded-[8px] border border-[color:var(--app-glass-border)] bg-[color:var(--app-btn-secondary-bg)]">
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
                  <div className="h-8 w-8 rounded-full border border-[color:var(--app-glass-border)] border-t-[color:var(--app-text-primary)] animate-spin" />
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
                    className="rounded-[6px] border border-[color:var(--app-glass-border)] bg-[color:var(--app-btn-secondary-bg)] px-6 py-3 text-sm font-medium uppercase tracking-[0.18em] text-[color:var(--app-text-primary)] transition-colors hover:bg-[color:var(--app-btn-secondary-hover)]"
                  >
                    Add Image
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-2 px-2 py-3 md:px-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--app-text-secondary)] transition-colors hover:text-[color:var(--app-text-primary)]">
                    Like
                  </button>
                  <button className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--app-text-secondary)] transition-colors hover:text-[color:var(--app-text-primary)]">
                    Comment
                  </button>
                  <button className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--app-text-secondary)] transition-colors hover:text-[color:var(--app-text-primary)]">
                    Share
                  </button>
                </div>
                <button className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--app-text-secondary)] transition-colors hover:text-[color:var(--app-text-primary)]">
                  Save
                </button>
              </div>

              <div className="space-y-2">
                <div className="text-sm">
                  <span className="font-semibold text-[color:var(--app-text-primary)]">sselfie</span>{" "}
                  <span className="whitespace-pre-wrap break-words text-[color:var(--app-text-primary)]">{displayCaption}</span>
                  {shouldTruncate && (
                    <button
                      onClick={() => onToggleCaption(post.id)}
                      className="ml-1 text-[color:var(--app-text-secondary)] transition-colors hover:text-[color:var(--app-text-primary)]"
                    >
                      {isExpanded ? "less" : "more"}
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => onCopyCaption(post.caption, post.id)}
                    className="rounded-[6px] border border-[color:var(--app-glass-border)] bg-[color:var(--app-btn-secondary-bg)] px-2.5 py-2 text-[10px] uppercase tracking-[0.2em] text-[color:var(--app-text-secondary)] transition-colors hover:bg-[color:var(--app-btn-secondary-hover)] hover:text-[color:var(--app-text-primary)]"
                    title="Copy caption"
                  >
                    {copiedCaptions.has(post.id) ? "Copied" : "Copy"}
                  </button>
                  {showCaptionGeneration && (
                    <button
                      onClick={() => onEnhanceCaption(post.id, post.caption)}
                      disabled={enhancingCaptions.has(post.id)}
                      className="rounded-[6px] border border-[color:var(--app-glass-border)] bg-[color:var(--app-btn-secondary-bg)] px-2.5 py-2 text-[10px] uppercase tracking-[0.2em] text-[color:var(--app-text-secondary)] transition-colors hover:bg-[color:var(--app-btn-secondary-hover)] hover:text-[color:var(--app-text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
                      title="Enhance with Maya"
                    >
                      {enhancingCaptions.has(post.id) ? "Working" : "Enhance"}
                    </button>
                  )}
                </div>
                <p className="text-xs uppercase tracking-wide text-[color:var(--app-text-muted)]">Just now</p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
