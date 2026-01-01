"use client"

import React, { useCallback } from "react"
import { CheckSquare, Square, Heart } from "lucide-react"
import { ProgressiveImage } from "../../progressive-image"
import { getOptimizedImageUrl } from "../utils/image-utils"
import type { GalleryImage } from "@/lib/data/images"

interface GalleryImageCardProps {
  image: GalleryImage
  isSelected: boolean
  selectionMode: boolean
  onImageClick: () => void
  onToggleSelection: () => void
  wasLongPress: React.MutableRefObject<boolean>
  longPressTimer: React.MutableRefObject<NodeJS.Timeout | null>
  longPressImageId: React.MutableRefObject<string | null>
  onLongPressStart: (imageId: string) => void
  onLongPressEnd: () => void
}

function GalleryImageCardComponent({
  image,
  isSelected,
  selectionMode,
  onImageClick,
  onToggleSelection,
  wasLongPress,
  longPressTimer,
  longPressImageId,
  onLongPressStart,
  onLongPressEnd,
}: GalleryImageCardProps) {
  const handleClick = useCallback(() => {
    // If this was a long-press, don't handle click (long-press already handled it)
    if (wasLongPress.current) {
      wasLongPress.current = false
      return
    }

    // Clear long-press timer if it exists
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }

    selectionMode ? onToggleSelection() : onImageClick()
  }, [selectionMode, onToggleSelection, onImageClick, wasLongPress, longPressTimer])

  const handleTouchStart = useCallback(() => {
    if (!selectionMode && image.id) {
      longPressImageId.current = image.id
      onLongPressStart(image.id)
    }
  }, [selectionMode, image.id, longPressImageId, onLongPressStart])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Also support long-press on desktop (hold mouse button for 500ms)
    if (!selectionMode && e.button === 0 && image.id) {
      longPressImageId.current = image.id
      onLongPressStart(image.id)
    }
  }, [selectionMode, image.id, longPressImageId, onLongPressStart])

  return (
    <button
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={onLongPressEnd}
      onTouchCancel={onLongPressEnd}
      onMouseDown={handleMouseDown}
      onMouseUp={onLongPressEnd}
      onMouseLeave={onLongPressEnd}
      className="aspect-square relative group overflow-hidden bg-stone-200/30"
    >
      <ProgressiveImage
        src={image.image_url || "/placeholder.svg"}
        thumbnailSrc={getOptimizedImageUrl(image.image_url, 600, 80)}
        alt={image.prompt || `Gallery ${image.id}`}
        className="w-full h-full object-cover"
      />
      {selectionMode && (
        <div className="absolute top-2 right-2 z-10">
          {isSelected ? (
            <CheckSquare size={24} className="text-stone-950 bg-white rounded" fill="currentColor" />
          ) : (
            <Square size={24} className="text-white drop-shadow-lg" />
          )}
        </div>
      )}
      {!selectionMode && (
        <div className="absolute inset-0 bg-stone-950/0 group-hover:bg-stone-950/30 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
          <div className="flex items-center gap-4 text-stone-50">
            <div className="flex items-center gap-1">
              <Heart size={16} fill="currentColor" strokeWidth={1.5} />
            </div>
          </div>
        </div>
      )}
    </button>
  )
}

// Memoize component to prevent unnecessary re-renders
export const GalleryImageCard = React.memo(GalleryImageCardComponent, (prevProps, nextProps) => {
  // Only re-render if these props change
  return (
    prevProps.image.id === nextProps.image.id &&
    prevProps.image.image_url === nextProps.image.image_url &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.selectionMode === nextProps.selectionMode
  )
})

