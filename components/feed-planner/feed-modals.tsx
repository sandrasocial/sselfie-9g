"use client"

import { useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { toast } from "@/hooks/use-toast"
import FeedPostCard from "./feed-post-card"
import { FeedGallerySelector } from "./feed-gallery-selector"
import type { FeedPlannerAccess } from "@/lib/feed-planner/access-control"

interface FeedModalsProps {
  selectedPost: any | null
  showGallery: number | null
  showProfileGallery: boolean
  feedId: number
  feedData: any
  access?: FeedPlannerAccess // Phase 8.1: Access control for gallery access
  onClosePost: () => void
  onCloseGallery: () => void
  onCloseProfileGallery: () => void
  onShowGallery: (postId: number) => void
  onNavigateToMaya?: () => void // Navigate to Maya Chat for image generation
  onUpdate: (updatedPost?: any) => void | Promise<void>
}

export default function FeedModals({
  selectedPost,
  showGallery,
  showProfileGallery,
  feedId,
  feedData,
  access, // Phase 8.1: Access control for gallery access
  onClosePost,
  onCloseGallery,
  onCloseProfileGallery,
  onShowGallery,
  onNavigateToMaya,
  onUpdate,
}: FeedModalsProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const onClosePostRef = useRef(onClosePost)

  useEffect(() => {
    onClosePostRef.current = onClosePost
  }, [onClosePost])

  useEffect(() => {
    if (!selectedPost) return
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const focusTimer = window.setTimeout(() => dialogRef.current?.focus(), 0)
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClosePostRef.current()
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      window.clearTimeout(focusTimer)
      document.removeEventListener("keydown", handleKeyDown)
      previousFocus?.focus()
    }
  }, [selectedPost])

  return (
    <>
      {selectedPost && typeof window !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-[#0D0E10]/95 p-4 backdrop-blur-sm animate-in fade-in duration-200 motion-reduce:animate-none"
          onClick={onClosePost}
          style={{
            paddingTop: "calc(1rem + env(safe-area-inset-top))",
            paddingBottom: "calc(1rem + env(safe-area-inset-bottom))",
          }}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Edit calendar post"
            tabIndex={-1}
            className="relative my-8 flex max-h-[calc(100dvh-5rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] w-full max-w-[470px] flex-col animate-in fade-in zoom-in-[0.98] duration-300 motion-reduce:animate-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={onClosePost}
              className="absolute -top-12 right-0 z-10 inline-flex min-h-11 items-center rounded-full px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            >
              Close
            </button>

            {/* Action buttons - shown when image exists */}
            {selectedPost.image_url && access?.hasGalleryAccess && (
              <div className="absolute -top-12 left-0 z-10 flex items-center gap-2">
                {onNavigateToMaya && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onNavigateToMaya()
                    }}
                    className="inline-flex min-h-11 items-center rounded-full px-4 py-2 text-[11px] uppercase tracking-[0.16em] text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    Regenerate in Maya
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onShowGallery(selectedPost.id)
                    onClosePost()
                  }}
                  className="inline-flex min-h-11 items-center rounded-full px-4 py-2 text-[11px] uppercase tracking-[0.16em] text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                >
                  Choose from Gallery
                </button>
              </div>
            )}

            {/* Use FeedPostCard component for full Instagram post mockup */}
            <div className="min-h-0 overflow-y-auto overscroll-contain rounded-[14px]">
              <FeedPostCard
                post={selectedPost}
                feedId={feedId}
                onUpdate={onUpdate}
                onNavigateToMaya={onNavigateToMaya}
              />
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Phase 8.1: Show gallery only if user has gallery access */}
      {showGallery && feedData?.feed?.id && access?.hasGalleryAccess && (
        <FeedGallerySelector
          type="post"
          postId={showGallery}
          feedId={feedData.feed.id}
          onClose={() => {
            onCloseGallery()
          }}
          onImageSelected={async (updatedPost?: any) => {
            // Force immediate revalidation of feed data
            await onUpdate(updatedPost)
            toast({
              title: "Image updated",
              description: "The post image has been updated from your gallery.",
            })
          }}
        />
      )}

      {/* Phase 8.1: Show profile gallery only if user has gallery access */}
      {showProfileGallery && feedData?.feed?.id && access?.hasGalleryAccess && (
        <FeedGallerySelector
          type="profile"
          feedId={feedData.feed.id}
          onClose={onCloseProfileGallery}
          onImageSelected={async () => {
            await onUpdate()
            toast({
              title: "Profile image updated",
              description: "Your profile image has been updated successfully.",
            })
          }}
        />
      )}
    </>
  )
}
