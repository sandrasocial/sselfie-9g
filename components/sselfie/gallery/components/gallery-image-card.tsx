"use client"

import React, { useCallback } from "react"
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
      className="relative aspect-square overflow-hidden bg-[rgba(175,170,162,0.08)] border border-[rgba(195,190,182,0.15)] rounded-xl"
    >
      <ProgressiveImage
        src={image.image_url || "/placeholder.svg"}
        thumbnailSrc={getOptimizedImageUrl(image.image_url, 600, 80)}
        alt={image.prompt || `Gallery ${image.id}`}
        className="w-full h-full object-cover"
      />
      {selectionMode && (
        <>
          {!isSelected && <div className="absolute inset-0 bg-[rgba(13,12,11,0.5)]" />}
          <div className="absolute right-2 top-2 z-10 rounded-full border border-[rgba(195,190,182,0.35)] bg-[rgba(175,170,162,0.15)] px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-[#f0ede8] backdrop-blur-sm">
            {isSelected ? "CHECKED" : "SELECT"}
          </div>
        </>
      )}
      {!selectionMode && (
        <div className="absolute inset-0 flex items-end bg-[rgba(13,12,11,0)] opacity-0 transition-all duration-300 hover:bg-[rgba(13,12,11,0.7)] hover:backdrop-blur-sm hover:opacity-100">
          <div className="m-2 rounded-full border border-[rgba(195,190,182,0.20)] bg-[rgba(175,170,162,0.15)] px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-[#f0ede8] backdrop-blur-sm">
            VIEW
          </div>
        </div>
      )}
    </button>
  )
}

// Memoize component to prevent unnecessary re-renders
// Note: Refs (wasLongPress, longPressTimer, longPressImageId) are stable and don't need comparison
// Function props are created inline in GalleryImageGrid.map(), so checking them would always return false
// Instead, we rely on the parent functions being stable via useCallback, and only check data props
export const GalleryImageCard = React.memo(GalleryImageCardComponent, (prevProps, nextProps) => {
  // Return true if props are equal (skip re-render), false if different (do re-render)
  // Only check data props - function props are intentionally omitted since they're created inline
  return (
    prevProps.image.id === nextProps.image.id &&
    prevProps.image.image_url === nextProps.image.image_url &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.selectionMode === nextProps.selectionMode
    // Function props and refs are intentionally omitted:
    // - Functions are created inline in map() so checking them would prevent memoization
    // - Refs are stable references that don't change
    // - Parent functions (handleImageClick, handleToggleSelection, etc.) are stable via useCallback
  )
})
