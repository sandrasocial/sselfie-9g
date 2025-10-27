"use client"

import { useState } from "react"
import { X, Heart, Download, Trash2, ChevronLeft, ChevronRight } from "lucide-react"
import type { GalleryImage } from "@/lib/data/images"

interface ImageLightboxProps {
  image: GalleryImage
  images: GalleryImage[]
  onClose: () => void
  onFavorite: (imageId: string, isFavorite: boolean) => void
  onDelete: (imageId: string) => void
  isFavorited: boolean
}

export function ImageLightbox({ image, images, onClose, onFavorite, onDelete, isFavorited }: ImageLightboxProps) {
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
    try {
      const a = document.createElement("a")
      a.href = currentImage.image_url
      a.download = `sselfie-${currentImage.id}.png`
      a.target = "_blank"
      a.rel = "noopener noreferrer"
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch (error) {
      console.error("Download failed:", error)
      alert("Download failed. Please try right-clicking the image and selecting 'Save image as...'")
    }
  }

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this image?")) {
      onDelete(currentImage.id)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/95 backdrop-blur-xl flex items-center justify-center p-4">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
      >
        <X size={24} className="text-white" strokeWidth={1.5} />
      </button>

      {/* Navigation buttons */}
      {images.length > 1 && (
        <>
          <button
            onClick={handlePrevious}
            className="absolute left-4 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          >
            <ChevronLeft size={24} className="text-white" strokeWidth={1.5} />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          >
            <ChevronRight size={24} className="text-white" strokeWidth={1.5} />
          </button>
        </>
      )}

      {/* Image */}
      <div className="max-w-5xl max-h-[85vh] w-full flex flex-col items-center gap-4">
        <img
          src={currentImage.image_url || "/placeholder.svg"}
          alt={currentImage.prompt || "Image"}
          className="max-w-full max-h-[70vh] object-contain rounded-2xl"
        />

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onFavorite(currentImage.id, !currentIsFavorited)}
            className={`p-3 rounded-full transition-all ${
              currentIsFavorited ? "bg-red-500 text-white" : "bg-white/10 hover:bg-white/20 text-white"
            }`}
          >
            <Heart size={20} strokeWidth={1.5} fill={currentIsFavorited ? "currentColor" : "none"} />
          </button>
          <button
            onClick={handleDownload}
            className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-white"
          >
            <Download size={20} strokeWidth={1.5} />
          </button>
          <button
            onClick={handleDelete}
            className="p-3 bg-red-500/20 hover:bg-red-500/30 rounded-full transition-colors text-red-400"
          >
            <Trash2 size={20} strokeWidth={1.5} />
          </button>
        </div>

        {/* Prompt */}
        {currentImage.prompt && (
          <div className="max-w-2xl bg-white/10 backdrop-blur-xl rounded-2xl p-4 text-center">
            <p className="text-sm text-white/80 font-light">{currentImage.prompt}</p>
          </div>
        )}

        {/* Image counter */}
        {images.length > 1 && (
          <div className="text-sm text-white/60 font-light">
            {currentIndex + 1} / {images.length}
          </div>
        )}
      </div>
    </div>
  )
}
