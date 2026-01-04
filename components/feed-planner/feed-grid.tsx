"use client"

import Image from "next/image"
import { Loader2, ImageIcon } from "lucide-react"

interface FeedGridProps {
  posts: any[]
  postStatuses: any[]
  draggedIndex: number | null
  isSavingOrder: boolean
  regeneratingPost: number | null
  onPostClick: (post: any) => void
  onGeneratePost: (postId: number) => void
  onDragStart: (index: number) => void
  onDragOver: (e: React.DragEvent<HTMLDivElement>, index: number) => void
  onDragEnd: () => void
}

export default function FeedGrid({
  posts,
  postStatuses,
  draggedIndex,
  isSavingOrder,
  regeneratingPost,
  onPostClick,
  onGeneratePost,
  onDragStart,
  onDragOver,
  onDragEnd,
}: FeedGridProps) {
  return (
    <div className="grid grid-cols-3 gap-[2px] md:gap-1">
      {posts.map((post: any, index: number) => {
        const postStatus = postStatuses.find(p => p.id === post.id)
        const isGenerating = postStatus?.isGenerating || post.generation_status === "generating"
        const isRegenerating = regeneratingPost === post.id
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
            {post.image_url && !isRegenerating && !isGenerating ? (
              <Image
                src={post.image_url || "/placeholder.svg"}
                alt={`Post ${post.position}`}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 33vw, 311px"
                onClick={() => onPostClick(post)}
              />
            ) : isRegenerating || isGenerating ? (
              <div className="absolute inset-0 bg-stone-50 flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 text-stone-400 animate-spin mb-2" strokeWidth={1.5} />
                <div className="text-[10px] font-light text-stone-500 text-center">
                  {isRegenerating ? "Regenerating..." : "Creating"}
                </div>
              </div>
            ) : (
              <div
                className="absolute inset-0 bg-white flex flex-col items-center justify-center p-3 cursor-pointer hover:bg-stone-50 transition-colors"
                onClick={(e) => {
                  e.stopPropagation()
                  onGeneratePost(post.id)
                }}
              >
                <ImageIcon className="w-10 h-10 text-stone-300 mb-2" strokeWidth={1.5} />
                <div className="text-[10px] font-light text-stone-500 text-center">Click to generate</div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

