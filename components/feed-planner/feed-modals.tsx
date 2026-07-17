"use client"

import { createPortal } from "react-dom"
import { toast } from "@/hooks/use-toast"
import FeedPostCard from "./feed-post-card"
import { FeedGallerySelector } from "./feed-gallery-selector"
import type { FeedPlannerAccess } from "@/lib/feed-planner/access-control"
import { useAccessibleModal } from "@/components/app-v3/use-accessible-modal"

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
  const { dialogRef, initialFocusRef } = useAccessibleModal(Boolean(selectedPost), onClosePost)

  return (
    <>
      {selectedPost &&
        typeof window !== "undefined" &&
        createPortal(
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
              className="relative flex max-h-[calc(100dvh-2rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] w-full max-w-[470px] flex-col animate-in fade-in zoom-in-[0.98] duration-300 motion-reduce:animate-none"
              onClick={e => e.stopPropagation()}
            >
              <div className="mb-2 flex min-h-11 flex-wrap items-center justify-between gap-1.5">
                {/* Action buttons - shown when image exists */}
                {selectedPost.image_url && access?.hasGalleryAccess ? (
                  <div className="flex flex-wrap items-center gap-1">
                    {onNavigateToMaya && (
                      <button
                        onClick={e => {
                          e.stopPropagation()
                          onNavigateToMaya()
                        }}
                        className="inline-flex min-h-11 items-center rounded-full px-3 py-2 text-[10px] uppercase tracking-[0.12em] text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                      >
                        Regenerate
                      </button>
                    )}
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        onShowGallery(selectedPost.id)
                        onClosePost()
                      }}
                      className="inline-flex min-h-11 items-center rounded-full px-3 py-2 text-[10px] uppercase tracking-[0.12em] text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                    >
                      Gallery
                    </button>
                  </div>
                ) : (
                  <span />
                )}
                <button
                  ref={initialFocusRef}
                  onClick={onClosePost}
                  className="inline-flex min-h-11 items-center rounded-full px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                >
                  Close
                </button>
              </div>

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
      {showGallery !== null && feedData?.feed?.id && access?.hasGalleryAccess && (
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
