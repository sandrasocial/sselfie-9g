"use client"

import { X } from "lucide-react"
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
  return (
    <>
      {selectedPost && typeof window !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[110] bg-black/90 flex items-center justify-center p-4 overflow-y-auto"
          onClick={onClosePost}
          style={{
            paddingTop: "calc(1rem + env(safe-area-inset-top))",
            paddingBottom: "calc(1rem + env(safe-area-inset-bottom))",
          }}
        >
          <div
            className="relative w-full max-w-[470px] my-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={onClosePost}
              className="absolute -top-12 right-0 z-10 p-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full transition-colors"
            >
              <X size={20} className="text-white" />
            </button>

            {/* Action buttons - shown when image exists */}
            {selectedPost.image_url && (
              <div className="absolute -top-12 left-0 z-10 flex items-center gap-2">
                {onNavigateToMaya && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onNavigateToMaya()
                    }}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white text-sm font-medium rounded-lg transition-colors"
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
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Choose from Gallery
                </button>
              </div>
            )}

            {/* Use FeedPostCard component for full Instagram post mockup */}
            <FeedPostCard
              post={selectedPost}
              feedId={feedId}
              onUpdate={async () => {
                await onUpdate()
                onClosePost()
              }}
              onNavigateToMaya={onNavigateToMaya}
            />
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

