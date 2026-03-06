"use client"

import { useState, useRef } from "react"
import Image from "next/image"
import FullscreenImageModal from "./fullscreen-image-modal"

interface PhotoshootImage {
  url: string
  id: number
  action: string
}

interface InstagramCarouselCardProps {
  images: PhotoshootImage[]
  title: string
  description: string
  category: string
  onFavoriteToggle: () => void
  onDelete: () => void
  isFavorite: boolean
}

export default function InstagramCarouselCard({
  images,
  title,
  description,
  category,
  onFavoriteToggle,
  onDelete,
  isFavorite,
}: InstagramCarouselCardProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isViewerOpen, setIsViewerOpen] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [liked, setLiked] = useState(isFavorite)

  const touchStartX = useRef(0)
  const touchEndX = useRef(0)
  const imageContainerRef = useRef<HTMLDivElement>(null)

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
    }

    touchStartX.current = 0
    touchEndX.current = 0
  }

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))
  }

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))
  }

  const handleLike = () => {
    setLiked(!liked)
    onFavoriteToggle()
  }

  return (
    <>
      <div className="bg-[#1c1b19] border border-[rgba(195,190,182,0.20)] rounded-[20px] overflow-hidden max-w-[470px] mx-auto">
        {/* Instagram Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[rgba(175,170,162,0.08)] border-b border-[rgba(195,190,182,0.12)]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full border border-[rgba(195,190,182,0.25)] bg-[rgba(175,170,162,0.15)] p-[2px]">
              <div className="w-full h-full rounded-full bg-[#1c1b19] flex items-center justify-center">
                <span className="text-xs font-semibold text-[#f0ede8]">S</span>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-[#f0ede8]">sselfie</p>
              <p className="text-xs text-[#8a8780]">{category}</p>
            </div>
          </div>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="rounded-full border border-[rgba(195,190,182,0.25)] px-3 py-1.5 hover:bg-[rgba(175,170,162,0.12)] transition-colors relative"
            aria-label="More options"
          >
            <span className="text-[10px] uppercase tracking-[0.2em] text-[#a8a49c]">Menu</span>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 bg-[#2e2c29] rounded-xl shadow-2xl border border-[rgba(195,190,182,0.15)] py-2 w-48 z-10">
                <button
                  onClick={() => {
                    setIsViewerOpen(true)
                    setShowMenu(false)
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-[#a8a49c] hover:bg-[rgba(175,170,162,0.12)] transition-colors"
                >
                  View Full Size
                </button>
                <button
                  onClick={() => {
                    onDelete()
                    setShowMenu(false)
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  Delete Photoshoot
                </button>
              </div>
            )}
          </button>
        </div>

        {/* Instagram Carousel with Navigation */}
        <div 
          ref={imageContainerRef}
          className="relative aspect-[4/5] bg-[#1c1b19] group cursor-pointer touch-pan-y"
          onClick={() => setIsViewerOpen(true)}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <Image
            src={images[currentIndex]?.url || "/placeholder.svg"}
            alt={`${title} - Slide ${currentIndex + 1}`}
            fill
            className="object-cover select-none"
            sizes="(max-width: 768px) 100vw, 470px"
            draggable={false}
          />

          {/* Carousel Navigation Arrows */}
          {images.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handlePrevious()
                }}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-[rgba(175,170,162,0.15)] backdrop-blur-sm rounded-full border border-[rgba(195,190,182,0.25)] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110 active:scale-95 sm:opacity-100"
                aria-label="Previous image"
              >
                <span className="text-[10px] uppercase tracking-[0.2em] text-[#f0ede8]">Prev</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleNext()
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-[rgba(175,170,162,0.15)] backdrop-blur-sm rounded-full border border-[rgba(195,190,182,0.25)] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110 active:scale-95 sm:opacity-100"
                aria-label="Next image"
              >
                <span className="text-[10px] uppercase tracking-[0.2em] text-[#f0ede8]">Next</span>
              </button>
            </>
          )}

          {/* Carousel Dots Indicator */}
          {images.length > 1 && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 flex gap-1">
              {images.map((_, index) => (
                <button
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation()
                    setCurrentIndex(index)
                  }}
                  className={`h-1.5 rounded-full transition-all ${
                    index === currentIndex ? "bg-[#f0ede8] w-6" : "bg-[#8a8780] w-1.5 hover:bg-[#a8a49c]"
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          )}

          {/* Slide Counter */}
          <div className="absolute top-3 right-3 px-2 py-1 bg-[rgba(13,12,11,0.70)] backdrop-blur-sm rounded-lg border border-[rgba(195,190,182,0.18)]">
            <span className="text-xs text-[#8a8780] font-medium tracking-wide">
              {currentIndex + 1}/{images.length}
            </span>
          </div>

          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[rgba(13,12,11,0.60)] backdrop-blur-sm px-3 py-1 rounded-full text-xs text-[#8a8780] sm:hidden pointer-events-none">
              Swipe to navigate
            </div>
          )}
        </div>

        {/* Instagram Action Bar */}
        <div className="px-4 py-3 space-y-3 bg-[rgba(175,170,162,0.10)] backdrop-blur-sm border-t border-[rgba(195,190,182,0.12)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsViewerOpen(true)}
                className="text-[10px] uppercase tracking-[0.2em] text-[#8a8780] hover:text-[#f0ede8] transition-colors"
                aria-label="Download"
              >
                Download
              </button>
              <button
                onClick={handleLike}
                className="text-[10px] uppercase tracking-[0.2em] text-[#8a8780] hover:text-[#f0ede8] transition-colors"
                aria-label={liked ? "Unlike" : "Like"}
              >
                {liked ? "Favourited" : "Favourite"}
              </button>
              <button
                onClick={() => setIsViewerOpen(true)}
                className="text-[10px] uppercase tracking-[0.2em] text-[#8a8780] hover:text-[#f0ede8] transition-colors"
                aria-label="Photoshoot"
              >
                Photoshoot
              </button>
            </div>
            <span className="text-[10px] uppercase tracking-[0.2em] text-[#8a8780]">{category}</span>
          </div>

          {/* Engagement */}
          <div className="space-y-1">
            {liked && (
              <p className="text-sm font-semibold text-[#f0ede8]">
                Liked by <span className="font-bold">you</span>
              </p>
            )}
            <div className="text-sm">
              <span className="font-semibold text-[#f0ede8]">sselfie</span>{" "}
              <span className="text-[#a8a49c] whitespace-pre-wrap">{description}</span>
            </div>
            <p className="text-[10px] text-[#8a8780] tracking-wide uppercase">AI-generated photoshoot • {images.length} photos</p>
            <p className="text-xs text-[#8a8780] uppercase tracking-wide">Just now</p>
          </div>
        </div>
      </div>

      {/* Fullscreen Image Modal */}
      <FullscreenImageModal
        imageUrl={images[currentIndex]?.url || ""}
        imageId={images[currentIndex]?.id || 0}
        title={`${title} - ${images[currentIndex]?.action}`}
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        isFavorite={isFavorite}
        onFavoriteToggle={onFavoriteToggle}
        onDelete={onDelete}
      />
    </>
  )
}

export { InstagramCarouselCard }
