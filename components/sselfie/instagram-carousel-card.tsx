"use client"

import { useState, useRef } from "react"
import Image from "next/image"
import { MoreHorizontal, ChevronLeft, ChevronRight } from 'lucide-react'
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
      <div className="bg-[rgba(255,255,255,0.04)] backdrop-blur-[20px] rounded-[20px] border border-[rgba(255,255,255,0.08)] overflow-hidden max-w-[470px] mx-auto">
        {/* Instagram Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(255,255,255,0.08)]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full border border-[rgba(255,255,255,0.2)] bg-[rgba(255,255,255,0.08)] p-[2px]">
              <div className="w-full h-full rounded-full bg-[#0a0a0a] flex items-center justify-center">
                <span className="text-xs font-semibold text-[#ffffff]">S</span>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-[#ffffff]">sselfie</p>
              <p className="text-xs text-[#666666]">{category}</p>
            </div>
          </div>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 hover:bg-[rgba(255,255,255,0.08)] rounded-full transition-colors relative"
            aria-label="More options"
          >
            <MoreHorizontal size={20} className="text-[#e5e5e5]" />
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 bg-[#111111] rounded-xl shadow-2xl border border-[rgba(255,255,255,0.12)] py-2 w-48 z-10">
                <button
                  onClick={() => {
                    setIsViewerOpen(true)
                    setShowMenu(false)
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-[#f5f5f5] hover:bg-[rgba(255,255,255,0.08)] transition-colors"
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
          className="relative aspect-[4/5] bg-[#121212] group cursor-pointer touch-pan-y"
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
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-[#0a0a0a]/80 backdrop-blur-sm rounded-full border border-[rgba(255,255,255,0.2)] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110 active:scale-95 sm:opacity-100"
                aria-label="Previous image"
              >
                <ChevronLeft size={20} className="text-[#ffffff]" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleNext()
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-[#0a0a0a]/80 backdrop-blur-sm rounded-full border border-[rgba(255,255,255,0.2)] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110 active:scale-95 sm:opacity-100"
                aria-label="Next image"
              >
                <ChevronRight size={20} className="text-[#ffffff]" />
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
                    index === currentIndex ? "bg-white w-6" : "bg-white/40 w-1.5 hover:bg-white/70"
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          )}

          {/* Slide Counter */}
          <div className="absolute top-3 right-3 px-2 py-1 bg-stone-950/70 backdrop-blur-sm rounded-lg border border-[rgba(255,255,255,0.18)]">
            <span className="text-xs text-white font-medium tracking-wide">
              {currentIndex + 1}/{images.length}
            </span>
          </div>

          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-stone-950/60 backdrop-blur-sm px-3 py-1 rounded-full text-xs text-white/70 sm:hidden pointer-events-none">
              Swipe to navigate
            </div>
          )}
        </div>

        {/* Instagram Action Bar */}
        <div className="px-4 py-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsViewerOpen(true)}
                className="text-[10px] uppercase tracking-[0.2em] text-[#e5e5e5] hover:text-[#ffffff] transition-colors"
                aria-label="Download"
              >
                Download
              </button>
              <button
                onClick={handleLike}
                className="text-[10px] uppercase tracking-[0.2em] text-[#e5e5e5] hover:text-[#ffffff] transition-colors"
                aria-label={liked ? "Unlike" : "Like"}
              >
                {liked ? "Favourited" : "Favourite"}
              </button>
              <button
                onClick={() => setIsViewerOpen(true)}
                className="text-[10px] uppercase tracking-[0.2em] text-[#e5e5e5] hover:text-[#ffffff] transition-colors"
                aria-label="Photoshoot"
              >
                Photoshoot
              </button>
            </div>
            <span className="text-[10px] uppercase tracking-[0.2em] text-[#666666]">{category}</span>
          </div>

          {/* Engagement */}
          <div className="space-y-1">
            {liked && (
              <p className="text-sm font-semibold text-[#ffffff]">
                Liked by <span className="font-bold">you</span>
              </p>
            )}
            <div className="text-sm">
              <span className="font-semibold text-[#ffffff]">sselfie</span>{" "}
              <span className="text-[#f5f5f5] whitespace-pre-wrap">{description}</span>
            </div>
            <p className="text-[10px] text-[#666666] tracking-wide uppercase">AI-generated photoshoot • {images.length} photos</p>
            <p className="text-xs text-[#666666] uppercase tracking-wide">Just now</p>
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
