"use client"

import React, { useCallback, useRef, useEffect, useState } from "react"
import { Video, Play } from "lucide-react"
import { triggerHaptic } from "@/lib/utils/haptics"
import { GalleryImageCard } from "./gallery-image-card"
import UnifiedLoading from "../../unified-loading"
import type { GalleryImage } from "@/lib/data/images"

interface GeneratedVideo {
  id: number
  video_url: string
  image_source?: string | null
  image_id?: number | null
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

        {videos.map((video) => {
          // Use image_source as poster/thumbnail (the original image that was animated)
          const posterImage = video.image_source || undefined
          
          return (
            <VideoThumbnail
              key={`vid-${video.id}`}
              video={video}
              posterImage={posterImage}
              onVideoClick={handleVideoClick}
            />
          )
        })}
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

// Video Thumbnail Component with IntersectionObserver lazy loading
function VideoThumbnail({
  video,
  posterImage,
  onVideoClick,
}: {
  video: GeneratedVideo
  posterImage?: string
  onVideoClick: (video: GeneratedVideo) => void
}) {
  const [isVisible, setIsVisible] = useState(false)
  const [shouldLoadVideo, setShouldLoadVideo] = useState(false)
  const containerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true)
            // Only load video metadata when visible
            setShouldLoadVideo(true)
            observer.disconnect()
          }
        })
      },
      {
        rootMargin: "50px", // Start loading 50px before entering viewport
      }
    )

    observer.observe(containerRef.current)

    return () => {
      observer.disconnect()
    }
  }, [])

  return (
    <button
      ref={containerRef}
      onClick={() => onVideoClick(video)}
      className="aspect-square relative group overflow-hidden bg-stone-200/30"
    >
      {posterImage ? (
        // Show poster image as thumbnail (lazy loaded)
        <img
          src={posterImage}
          alt="Video thumbnail"
          className="w-full h-full object-cover"
          loading="lazy"
        />
      ) : shouldLoadVideo ? (
        // Only load video metadata when visible
        <video
          src={video.video_url}
          className="w-full h-full object-cover"
          muted
          playsInline
          preload="metadata"
        />
      ) : (
        // Placeholder while waiting to load
        <div className="w-full h-full bg-stone-200/30 animate-pulse" />
      )}
      <div className="absolute inset-0 bg-stone-950/40 flex items-center justify-center">
        <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
          <Play size={20} className="text-stone-950 ml-1" fill="currentColor" />
        </div>
      </div>
      <div className="absolute top-2 right-2">
        <Video size={16} className="text-white drop-shadow-lg" />
      </div>
    </button>
  )
}

// Memoize component to prevent unnecessary re-renders when parent re-renders
export const GalleryImageGrid = React.memo(GalleryImageGridComponent)

