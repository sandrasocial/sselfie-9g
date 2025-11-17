"use client"

import { useState } from "react"
import Image from "next/image"
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, ChevronLeft, ChevronRight } from 'lucide-react'
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
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-lg max-w-[470px] mx-auto">
        {/* Instagram Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 p-[2px]">
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                <span className="text-xs font-bold text-stone-950">S</span>
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-stone-950">sselfie</p>
              <p className="text-xs text-stone-500">{category}</p>
            </div>
          </div>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 hover:bg-stone-50 rounded-full transition-colors relative"
            aria-label="More options"
          >
            <MoreHorizontal size={20} className="text-stone-950" />
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-2xl border border-stone-200 py-2 w-48 z-10">
                <button
                  onClick={() => {
                    setIsViewerOpen(true)
                    setShowMenu(false)
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm hover:bg-stone-50 transition-colors"
                >
                  View Full Size
                </button>
                <button
                  onClick={() => {
                    onDelete()
                    setShowMenu(false)
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  Delete Photoshoot
                </button>
              </div>
            )}
          </button>
        </div>

        {/* Instagram Carousel with Navigation */}
        <div 
          className="relative aspect-[4/5] bg-stone-100 group cursor-pointer"
          onClick={() => setIsViewerOpen(true)}
        >
          <Image
            src={images[currentIndex]?.url || "/placeholder.svg"}
            alt={`${title} - Slide ${currentIndex + 1}`}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 470px"
          />

          {/* Carousel Navigation Arrows */}
          {images.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handlePrevious()
                }}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:scale-110 active:scale-95"
                aria-label="Previous image"
              >
                <ChevronLeft size={20} className="text-stone-950" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleNext()
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:scale-110 active:scale-95"
                aria-label="Next image"
              >
                <ChevronRight size={20} className="text-stone-950" />
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
                    index === currentIndex ? "bg-white w-6" : "bg-white/50 w-1.5 hover:bg-white/70"
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          )}

          {/* Slide Counter */}
          <div className="absolute top-3 right-3 px-2 py-1 bg-stone-950/70 backdrop-blur-sm rounded-lg">
            <span className="text-xs text-white font-medium">
              {currentIndex + 1}/{images.length}
            </span>
          </div>
        </div>

        {/* Instagram Action Bar */}
        <div className="px-4 py-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleLike}
                className="hover:opacity-60 transition-opacity active:scale-90"
                aria-label={liked ? "Unlike" : "Like"}
              >
                <Heart
                  size={24}
                  className={liked ? "fill-red-500 text-red-500" : "text-stone-950"}
                  strokeWidth={liked ? 0 : 2}
                />
              </button>
              <button
                onClick={() => setIsViewerOpen(true)}
                className="hover:opacity-60 transition-opacity active:scale-90"
                aria-label="Comment"
              >
                <MessageCircle size={24} className="text-stone-950" strokeWidth={2} />
              </button>
              <button className="hover:opacity-60 transition-opacity active:scale-90" aria-label="Share">
                <Send size={24} className="text-stone-950" strokeWidth={2} />
              </button>
            </div>
            <button
              onClick={handleLike}
              className="hover:opacity-60 transition-opacity active:scale-90"
              aria-label="Save"
            >
              <Bookmark
                size={24}
                className={liked ? "fill-stone-950 text-stone-950" : "text-stone-950"}
                strokeWidth={2}
              />
            </button>
          </div>

          {/* Engagement */}
          <div className="space-y-1">
            {liked && (
              <p className="text-sm font-semibold text-stone-950">
                Liked by <span className="font-bold">you</span>
              </p>
            )}
            <div className="text-sm">
              <span className="font-semibold text-stone-950">sselfie</span>{" "}
              <span className="text-stone-950 whitespace-pre-wrap">{description}</span>
            </div>
            <p className="text-[10px] text-stone-400 tracking-wide">AI-generated photoshoot • {images.length} photos</p>
            <p className="text-xs text-stone-400 uppercase tracking-wide">Just now</p>
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
