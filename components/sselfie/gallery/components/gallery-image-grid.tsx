"use client"

import React, { useCallback } from "react"
import { Video, Play } from "lucide-react"
import { triggerHaptic } from "@/lib/utils/haptics"
import { GalleryImageCard } from "./gallery-image-card"
import UnifiedLoading from "../../unified-loading"
import type { GalleryImage } from "@/lib/data/images"

interface GeneratedVideo {
  id: number
  video_url: string
  [key: string]: any
}

interface GalleryImageGridProps {
  images: GalleryImage[]
  videos: GeneratedVideo[]
  selectedImages: Set<string>
  selectionMode: boolean
  onImageClick: (image: GalleryImage) => void
  onToggleSelection: (imageId: string) => void
  onVideoClick: (video: GeneratedVideo) => void
  hasMore: boolean
  isLoadingMore: boolean
  loadMoreRef: React.RefObject<HTMLDivElement>
  onLoadMore: () => void
  wasLongPress: React.MutableRefObject<boolean>
  longPressTimer: React.MutableRefObject<NodeJS.Timeout | null>
  longPressImageId: React.MutableRefObject<string | null>
  onLongPressStart: (imageId: string) => void
  onLongPressEnd: () => void
}

function GalleryImageGridComponent({
  images,
  videos,
  selectedImages,
  selectionMode,
  onImageClick,
  onToggleSelection,
  onVideoClick,
  hasMore,
  isLoadingMore,
  loadMoreRef,
  onLoadMore,
  wasLongPress,
  longPressTimer,
  longPressImageId,
  onLongPressStart,
  onLongPressEnd,
}: GalleryImageGridProps) {
  const handleVideoClick = useCallback((video: GeneratedVideo) => {
    triggerHaptic("light")
    onVideoClick(video)
  }, [onVideoClick])

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
        {images.map((image) => (
          <GalleryImageCard
            key={`img-${image.id}`}
            image={image}
            isSelected={selectedImages.has(image.id)}
            selectionMode={selectionMode}
            onImageClick={() => onImageClick(image)}
            onToggleSelection={() => onToggleSelection(image.id)}
            wasLongPress={wasLongPress}
            longPressTimer={longPressTimer}
            longPressImageId={longPressImageId}
            onLongPressStart={onLongPressStart}
            onLongPressEnd={onLongPressEnd}
          />
        ))}

        {videos.map((video) => (
          <button
            key={`vid-${video.id}`}
            onClick={() => handleVideoClick(video)}
            className="aspect-square relative group overflow-hidden bg-stone-200/30"
          >
            <video src={video.video_url} className="w-full h-full object-cover" muted playsInline preload="none" />
            <div className="absolute inset-0 bg-stone-950/40 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                <Play size={20} className="text-stone-950 ml-1" fill="currentColor" />
              </div>
            </div>
            <div className="absolute top-2 right-2">
              <Video size={16} className="text-white drop-shadow-lg" />
            </div>
          </button>
        ))}
      </div>

      {hasMore && (
        <div ref={loadMoreRef} className="py-8 flex justify-center">
          {isLoadingMore ? (
            <UnifiedLoading variant="inline" message="Loading more..." />
          ) : (
            <button
              onClick={onLoadMore}
              className="px-6 py-3 text-xs tracking-[0.15em] uppercase font-light bg-stone-100/50 border border-stone-200/40 rounded-xl hover:bg-stone-100/70 transition-all duration-200"
            >
              Load More Images
            </button>
          )}
        </div>
      )}
    </>
  )
}

// Memoize component to prevent unnecessary re-renders when parent re-renders
export const GalleryImageGrid = React.memo(GalleryImageGridComponent)

