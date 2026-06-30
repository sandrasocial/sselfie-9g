"use client"

import type React from "react"

import { useState, useRef, useEffect, useCallback } from "react"
import type { GalleryImage } from "@/lib/data/images"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { triggerHaptic, triggerSuccessHaptic } from "@/lib/utils/haptics"

interface InstagramPhotoPreviewProps {
  image: GalleryImage
  images: GalleryImage[]
  onClose: () => void
  onFavorite: (imageId: string, isFavorite: boolean) => void
  onDelete: (imageId: string) => void
  isFavorited: boolean
  userName?: string
  userAvatar?: string
}

export function InstagramPhotoPreview({
  image,
  images,
  onClose,
  onFavorite,
  onDelete,
  isFavorited,
  userName = "sselfie",
  userAvatar = "/placeholder.svg",
}: InstagramPhotoPreviewProps) {
  const [currentIndex, setCurrentIndex] = useState(images.findIndex((img) => img.id === image.id))
  const currentImage = images[currentIndex]
  const currentIsFavorited = currentImage.is_favorite || isFavorited
  const userInitial = userName.charAt(0).toUpperCase()

  const touchStartX = useRef(0)
  const touchEndX = useRef(0)
  const imageRef = useRef<HTMLDivElement>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX
  }

  const handleTouchEnd = () => {
    const swipeDistance = touchStartX.current - touchEndX.current
    const minSwipeDistance = 50

    if (Math.abs(swipeDistance) > minSwipeDistance) {
      if (swipeDistance > 0) {
        // Swiped left - next image
        handleNext()
      } else {
        // Swiped right - previous image
        handlePrevious()
      }
      triggerHaptic("light")
    }

    touchStartX.current = 0
    touchEndX.current = 0
  }

  const handlePrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))
    triggerHaptic("light")
  }, [images.length])

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))
    triggerHaptic("light")
  }, [images.length])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        handlePrevious()
      } else if (e.key === "ArrowRight") {
        handleNext()
      } else if (e.key === "Escape") {
        onClose()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleNext, handlePrevious, onClose])

  const handleDownload = () => {
    const a = document.createElement("a")
    a.href = currentImage.image_url
    a.download = `sselfie-${currentImage.id}.png`
    a.target = "_blank"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    triggerSuccessHaptic()
  }

  const handleFavoriteClick = () => {
    onFavorite(currentImage.id, !currentIsFavorited)
    triggerSuccessHaptic()
  }

  const handleDeleteClick = () => {
    onDelete(currentImage.id)
    triggerHaptic("medium")
  }

  return (
    <div className="fixed inset-0 z-50 bg-[rgba(13,12,11,0.95)] backdrop-blur-sm flex items-center justify-center overflow-y-auto">
      {/* Close button */}
      <button
        onClick={() => {
          triggerHaptic("light")
          onClose()
        }}
        className="absolute top-4 right-4 z-10 px-3 py-2 bg-[rgba(175,170,162,0.15)] backdrop-blur-sm hover:bg-[rgba(175,170,162,0.25)] rounded-full transition-colors border border-[rgba(195,190,182,0.25)] text-[10px] uppercase tracking-[0.2em] text-[#f0ede8]"
      >
        Close
      </button>

      {/* Navigation */}
      {images.length > 1 && (
        <>
          <button
            onClick={handlePrevious}
            className="absolute left-4 z-10 px-3 py-2 bg-[rgba(175,170,162,0.15)] backdrop-blur-sm hover:bg-[rgba(175,170,162,0.25)] rounded-full transition-colors hidden sm:flex items-center justify-center border border-[rgba(195,190,182,0.25)] text-[10px] uppercase tracking-[0.2em] text-[#f0ede8]"
          >
            Prev
          </button>
          <button
            onClick={handleNext}
            className="absolute right-4 z-10 px-3 py-2 bg-[rgba(175,170,162,0.15)] backdrop-blur-sm hover:bg-[rgba(175,170,162,0.25)] rounded-full transition-colors hidden sm:flex items-center justify-center border border-[rgba(195,190,182,0.25)] text-[10px] uppercase tracking-[0.2em] text-[#f0ede8]"
          >
            Next
          </button>
        </>
      )}

      {/* Instagram Post Style */}
      <div className="w-full max-w-md mx-auto bg-[#1c1b19] rounded-xl overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-[rgba(195,190,182,0.12)]">
          <div className="flex items-center gap-3">
            <Avatar className="w-8 h-8 border border-[rgba(195,190,182,0.25)]">
              <AvatarImage src={userAvatar || "/placeholder.svg"} alt={userName} />
              <AvatarFallback className="bg-[#2e2c29] text-[#f0ede8] text-xs font-medium">{userInitial}</AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium text-[#f0ede8]">{userName}</span>
          </div>
          <button className="rounded-full border border-[rgba(195,190,182,0.25)] px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-[#a8a49c]">
            Menu
          </button>
        </div>

        <div
          ref={imageRef}
          className="relative bg-[#2e2c29] touch-pan-y"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <img
            src={currentImage.image_url || "/placeholder.svg"}
            alt={currentImage.description || currentImage.prompt || "Photo"}
            className="w-full h-auto object-contain select-none"
            draggable={false}
          />
          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[rgba(13,12,11,0.60)] backdrop-blur-sm px-3 py-1 rounded-full text-xs text-[#8a8780] sm:hidden">
              Swipe to navigate
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-3 space-y-3 border-t border-[rgba(195,190,182,0.12)] bg-[rgba(175,170,162,0.10)] backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownload}
                className="text-[10px] uppercase tracking-[0.2em] text-[#8a8780] hover:text-[#f0ede8] transition-colors"
              >
                Download
              </button>
              <button
                onClick={handleFavoriteClick}
                className="text-[10px] uppercase tracking-[0.2em] text-[#8a8780] hover:text-[#f0ede8] transition-colors"
              >
                {currentIsFavorited ? "Favourited" : "Favourite"}
              </button>
              <button
                onClick={handleDeleteClick}
                className="text-[10px] uppercase tracking-[0.2em] text-red-400 hover:text-red-300 transition-colors"
              >
                Delete
              </button>
            </div>
            <span className="text-[10px] uppercase tracking-[0.2em] text-[#8a8780]">{userName}</span>
          </div>

          {/* Likes */}
          <div className="text-sm font-medium text-[#f0ede8]">
            {currentIsFavorited ? "Liked by you" : "Like this photo"}
          </div>

          {/* Caption */}
          {currentImage.description && (
            <div className="text-sm text-[#f0ede8]">
              <span className="font-medium mr-2">{userName}</span>
              <span className="text-[#a8a49c]">{currentImage.description}</span>
            </div>
          )}

          {/* Timestamp */}
          <div className="text-xs text-[#8a8780]">
            {new Date(currentImage.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </div>

          {/* Counter */}
          {images.length > 1 && (
            <div className="text-xs text-[#8a8780] text-center pt-2 border-t border-[rgba(195,190,182,0.12)]">
              {currentIndex + 1} of {images.length}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
