"use client"

import React, { useCallback, useRef, useEffect, useState } from "react"
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
  viewMode: "moodboard" | "grid"
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
  viewMode,
}: GalleryImageGridProps) {
  const handleVideoClick = useCallback((video: GeneratedVideo) => {
    triggerHaptic("light")
    onVideoClick(video)
  }, [onVideoClick])

  return (
    <>
      <div className={viewMode === "moodboard" ? "grid grid-cols-2 gap-2 sm:grid-cols-3" : "grid grid-cols-3 gap-0"}>
        {images.map((image, index) => (
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
            className={
              viewMode === "moodboard"
                ? "aspect-auto min-h-[140px] sm:min-h-[180px] " +
                  (index === 0
                    ? "col-span-2 sm:col-span-2 sm:row-span-2 sm:min-h-[370px]"
                    : "col-span-1")
                : ""
            }
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
              className={viewMode === "moodboard" ? "aspect-auto min-h-[190px] col-span-1" : ""}
              label="Reel"
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
              className="rounded-[6px] border border-[color:var(--app-glass-border)] bg-[color:var(--app-btn-secondary-bg)] px-6 py-3 text-xs font-medium uppercase tracking-[0.2em] text-[color:var(--app-text-primary)] transition-colors duration-200 hover:bg-[color:var(--app-btn-secondary-hover)]"
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
  className = "",
  label = "REEL",
}: {
  video: GeneratedVideo
  posterImage?: string
  onVideoClick: (video: GeneratedVideo) => void
  className?: string
  label?: string
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
      className={`relative aspect-[9/16] overflow-hidden bg-[color:var(--app-btn-secondary-bg)] rounded-[8px] border border-[color:var(--app-glass-border)] ${className}`}
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
        <div className="w-full h-full bg-white/10 animate-pulse" />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-black/15 to-black/55" />
      <div className="absolute bottom-2 left-2 rounded-[4px] border border-white/30 bg-black/25 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-white/90 backdrop-blur-xl">
        {label}
      </div>
    </button>
  )
}

// Memoize component to prevent unnecessary re-renders when parent re-renders
export const GalleryImageGrid = React.memo(GalleryImageGridComponent)
