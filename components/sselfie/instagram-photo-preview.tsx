"use client"

import { useState } from "react"
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

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))
  }

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))
  }

  const handleDownload = () => {
    const a = document.createElement("a")
    a.href = currentImage.image_url
    a.download = `sselfie-${currentImage.id}.png`
    a.target = "_blank"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <div className="fixed inset-0 z-50 bg-stone-950 flex items-center justify-center">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
      >
        <X size={24} className="text-white" strokeWidth={1.5} />
      </button>

      {/* Navigation */}
      {images.length > 1 && (
        <>
          <button
            onClick={handlePrevious}
            className="absolute left-4 z-10 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          >
            <ChevronLeft size={24} className="text-white" strokeWidth={1.5} />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-4 z-10 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          >
            <ChevronRight size={24} className="text-white" strokeWidth={1.5} />
          </button>
        </>
      )}

      {/* Instagram Post Style */}
      <div className="w-full max-w-md mx-auto bg-stone-950 rounded-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full overflow-hidden border border-stone-700">
              <img src={userAvatar || "/placeholder.svg"} alt={userName} className="w-full h-full object-cover" />
            </div>
            <span className="text-sm font-medium text-white">{userName}</span>
          </div>
          <button className="text-white">
            <MoreHorizontal size={20} />
          </button>
        </div>

        {/* Image */}
        <div className="relative aspect-square bg-stone-900">
          <img
            src={currentImage.image_url || "/placeholder.svg"}
            alt={currentImage.prompt || "Photo"}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Actions */}
        <div className="p-3 space-y-3 border-t border-stone-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => onFavorite(currentImage.id, !currentIsFavorited)}
                className="transition-transform hover:scale-110"
              >
                <Heart
                  size={24}
                  className={currentIsFavorited ? "text-red-500 fill-red-500" : "text-white"}
                  strokeWidth={1.5}
                />
              </button>
              <button className="transition-transform hover:scale-110">
                <MessageCircle size={24} className="text-white" strokeWidth={1.5} />
              </button>
              <button onClick={handleDownload} className="transition-transform hover:scale-110">
                <Download size={24} className="text-white" strokeWidth={1.5} />
              </button>
            </div>
            <div className="flex items-center gap-4">
              <button onClick={() => onDelete(currentImage.id)} className="transition-transform hover:scale-110">
                <Trash2 size={24} className="text-red-400" strokeWidth={1.5} />
              </button>
              <button className="transition-transform hover:scale-110">
                <Bookmark size={24} className="text-white" strokeWidth={1.5} />
              </button>
            </div>
          </div>

          {/* Likes */}
          <div className="text-sm font-medium text-white">
            {currentIsFavorited ? "Liked by you" : "Like this photo"}
          </div>

          {/* Caption */}
          {currentImage.prompt && (
            <div className="text-sm text-white">
              <span className="font-medium mr-2">{userName}</span>
              <span className="text-stone-300">{currentImage.prompt}</span>
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
