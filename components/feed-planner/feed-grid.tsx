"use client"

import Image from "next/image"
import { ImageIcon } from "lucide-react"

interface FeedGridProps {
  posts: any[]
  postStatuses: any[]
  draggedIndex: number | null
  isSavingOrder: boolean
  isManualFeed?: boolean // Flag to identify manual feeds
  onPostClick: (post: any) => void
  onAddImage?: (postId: number) => void // Open gallery selector (upload + gallery)
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
  onPostClick,
  onAddImage,
  onDragStart,
  onDragOver,
  onDragEnd,
}: FeedGridProps) {
  return (
    <div className="grid grid-cols-3 gap-[2px] md:gap-1">
      {posts.map((post: any, index: number) => {
        const postStatus = postStatuses.find(p => p.id === post.id)
        // For manual feeds, NEVER show generating state
        // For Maya feeds, only show generating if post has prediction_id (actively generating in Replicate)
        const isGenerating = !isManualFeed && (postStatus?.isGenerating || (post.generation_status === "generating" && post.prediction_id))
        // SIMPLIFIED: A post is complete if it has an image_url (regardless of status)
        const isComplete = !!post.image_url
        const isDragging = draggedIndex === index

        return (
          <div
            key={post.id}
            draggable={isComplete && !isSavingOrder}
            onDragStart={() => onDragStart(index)}
            onDragOver={(e) => onDragOver(e, index)}
            onDragEnd={onDragEnd}
            className={`aspect-square bg-stone-100 relative transition-all duration-200 ${
              isDragging ? 'opacity-50 scale-95' : ''
            } ${
              isComplete && !isSavingOrder ? 'cursor-move hover:opacity-90' : 'cursor-pointer'
            }`}
          >
            {post.image_url && !isGenerating ? (
              <Image
                src={post.image_url || "/placeholder.svg"}
                alt={`Post ${post.position}`}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 33vw, 311px"
                onClick={() => onPostClick(post)}
              />
            ) : isGenerating ? (
              <div className="absolute inset-0 bg-stone-50 flex flex-col items-center justify-center">
                <div className="text-[10px] font-light text-stone-500 text-center">
                  Creating...
                </div>
              </div>
            ) : (
              <div
                className="absolute inset-0 bg-white flex flex-col items-center justify-center p-3 cursor-pointer hover:bg-stone-50 transition-colors"
                onClick={(e) => {
                  e.stopPropagation()
                  // Always open gallery selector (upload + gallery) for all feeds
                  if (onAddImage) {
                    onAddImage(post.id)
                  }
                }}
              >
                <ImageIcon className="w-10 h-10 text-stone-300 mb-2" strokeWidth={1.5} />
                <div className="text-[10px] font-light text-stone-500 text-center">
                  Click to add image
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

