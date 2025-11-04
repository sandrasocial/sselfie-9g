"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import {
  X,
  Heart,
  MessageCircle,
  Bookmark,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Download,
  Trash2,
} from "lucide-react"
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
  }, [currentIndex])

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))
    triggerHaptic("light")
  }

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))
    triggerHaptic("light")
  }

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
    <div className="fixed inset-0 z-50 bg-stone-950 flex items-center justify-center overflow-y-auto">
      {/* Close button */}
      <button
        onClick={() => {
          triggerHaptic("light")
          onClose()
        }}
        className="absolute top-4 right-4 z-10 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
      >
        <X size={24} className="text-white" strokeWidth={1.5} />
      </button>

      {/* Navigation */}
      {images.length > 1 && (
        <>
          <button
            onClick={handlePrevious}
            className="absolute left-4 z-10 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors hidden sm:flex items-center justify-center"
          >
            <ChevronLeft size={24} className="text-white" strokeWidth={1.5} />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-4 z-10 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors hidden sm:flex items-center justify-center"
          >
            <ChevronRight size={24} className="text-white" strokeWidth={1.5} />
          </button>
        </>
      )}

      {/* Instagram Post Style */}
      <div className="w-full max-w-md mx-auto bg-stone-950 rounded-xl overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-stone-800">
          <div className="flex items-center gap-3">
            <Avatar className="w-8 h-8 border border-stone-700">
              <AvatarImage src={userAvatar || "/placeholder.svg"} alt={userName} />
              <AvatarFallback className="bg-stone-700 text-white text-xs font-medium">{userInitial}</AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium text-white">{userName}</span>
          </div>
          <button className="text-white">
            <MoreHorizontal size={20} />
          </button>
        </div>

        <div
          ref={imageRef}
          className="relative bg-stone-900 touch-pan-y"
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
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-stone-950/60 backdrop-blur-sm px-3 py-1 rounded-full text-xs text-white/70 sm:hidden">
              Swipe to navigate
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-3 space-y-3 border-t border-stone-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={handleFavoriteClick} className="transition-transform hover:scale-110 active:scale-95">
                <Heart
                  size={24}
                  className={currentIsFavorited ? "text-red-500 fill-red-500" : "text-white"}
                  strokeWidth={1.5}
                />
              </button>
              <button className="transition-transform hover:scale-110 active:scale-95">
                <MessageCircle size={24} className="text-white" strokeWidth={1.5} />
              </button>
              <button onClick={handleDownload} className="transition-transform hover:scale-110 active:scale-95">
                <Download size={24} className="text-white" strokeWidth={1.5} />
              </button>
            </div>
            <div className="flex items-center gap-4">
              <button onClick={handleDeleteClick} className="transition-transform hover:scale-110 active:scale-95">
                <Trash2 size={24} className="text-red-400" strokeWidth={1.5} />
              </button>
              <button className="transition-transform hover:scale-110 active:scale-95">
                <Bookmark size={24} className="text-white" strokeWidth={1.5} />
              </button>
            </div>
          </div>

          {/* Likes */}
          <div className="text-sm font-medium text-white">
            {currentIsFavorited ? "Liked by you" : "Like this photo"}
          </div>

          {/* Caption */}
          {currentImage.description && (
            <div className="text-sm text-white">
              <span className="font-medium mr-2">{userName}</span>
              <span className="text-stone-300">{currentImage.description}</span>
            </div>
          )}

          {/* Timestamp */}
          <div className="text-xs text-stone-500">
            {new Date(currentImage.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </div>

          {/* Counter */}
          {images.length > 1 && (
            <div className="text-xs text-stone-500 text-center pt-2 border-t border-stone-800">
              {currentIndex + 1} of {images.length}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
