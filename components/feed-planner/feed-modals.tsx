"use client"

import { X } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import FeedPostCard from "./feed-post-card"
import { FeedGallerySelector } from "./feed-gallery-selector"

interface FeedModalsProps {
  selectedPost: any | null
  showGallery: number | null
  showProfileGallery: boolean
  feedId: number
  feedData: any
  regeneratingPost: number | null
  onClosePost: () => void
  onCloseGallery: () => void
  onCloseProfileGallery: () => void
  onRegeneratePost: (postId: number) => void
  onShowGallery: (postId: number) => void
  onUpdate: () => void | Promise<void>
}

export default function FeedModals({
  selectedPost,
  showGallery,
  showProfileGallery,
  feedId,
  feedData,
  regeneratingPost,
  onClosePost,
  onCloseGallery,
  onCloseProfileGallery,
  onRegeneratePost,
  onUpdate,
}: FeedModalsProps) {
  return (
    <>
      {selectedPost && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 overflow-y-auto"
          onClick={onClosePost}
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
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onRegeneratePost(selectedPost.id)
                  }}
                  disabled={regeneratingPost === selectedPost.id}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {regeneratingPost === selectedPost.id ? "Regenerating..." : "Regenerate"}
                </button>
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
              onGenerate={async () => {
                await onUpdate()
                onClosePost()
              }}
            />
          </div>
        </div>
      )}

      {showGallery && feedData?.feed?.id && (
        <FeedGallerySelector
          type="post"
          postId={showGallery}
          feedId={feedData.feed.id}
          onClose={async () => {
            onCloseGallery()
            // Refresh feed data to show updated image
            await onUpdate()
          }}
          onImageSelected={async () => {
            // Refresh feed data to show updated image
            await onUpdate()
            toast({
              title: "Image updated",
              description: "The post image has been updated from your gallery.",
            })
          }}
        />
      )}

      {showProfileGallery && feedData?.feed?.id && (
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

