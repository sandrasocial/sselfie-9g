"use client"

import { createPortal } from "react-dom"
import { X } from "lucide-react"
import FeedPostCard from "./feed-post-card"
import type { FeedPost } from "./feed-preview-types"

interface FeedPreviewImageModalProps {
  open: boolean
  selectedPost: FeedPost | null
  feedId: number | null
  onClose: () => void
  onRefreshPosts: () => void
}

export default function FeedPreviewImageModal({
  open,
  selectedPost,
  feedId,
  onClose,
  onRefreshPosts,
}: FeedPreviewImageModalProps) {
  if (!open || !selectedPost || typeof window === "undefined") return null

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-sm animate-in fade-in duration-200 p-3 sm:p-4"
      onClick={onClose}
      style={{
        paddingTop: "calc(1rem + env(safe-area-inset-top))",
        paddingBottom: "calc(1rem + env(safe-area-inset-bottom))",
      }}
    >
      <div className="relative max-w-2xl w-full mx-2 sm:mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute top-2 right-2 sm:top-4 sm:right-4 z-10 p-2 bg-black/50 hover:bg-black/70 active:bg-black/80 rounded-full text-white transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Close modal"
        >
          <X size={20} className="sm:w-6 sm:h-6" />
        </button>

        {feedId ? (
          <FeedPostCard
            post={{
              id: selectedPost.id,
              position: selectedPost.position,
              prompt: selectedPost.prompt || "",
              caption: selectedPost.caption || "",
              content_pillar: selectedPost.post_type || selectedPost.content_pillar || "",
              image_url: selectedPost.image_url,
              generation_status: selectedPost.generation_status,
            }}
            feedId={feedId}
            onUpdate={onRefreshPosts}
          />
        ) : (
          <div className="bg-white rounded-lg p-6 text-center">
            <p className="text-stone-600 mb-4">Feed needs to be saved before viewing post details.</p>
            <button onClick={onClose} className="px-4 py-2 bg-stone-900 text-white rounded hover:bg-stone-800">
              Close
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
