"use client"

import { useState } from "react"
import { X, Heart } from "lucide-react"
import Image from "next/image"

interface BestWorkImage {
  id: string
  image_url: string
  category?: string
  created_at: string
  is_favorite?: boolean
}

interface BestWorkSelectorProps {
  images: BestWorkImage[]
  currentBestWork: string[] // Array of image IDs currently in best work
  onClose: () => void
  onSave: () => void
}

export function BestWorkSelector({ images, currentBestWork, onClose, onSave }: BestWorkSelectorProps) {
  const [selectedImages, setSelectedImages] = useState<string[]>(currentBestWork)
  const [isSaving, setIsSaving] = useState(false)

  const toggleImage = (imageId: string) => {
    setSelectedImages((prev) => {
      if (prev.includes(imageId)) {
        return prev.filter((id) => id !== imageId)
      } else {
        if (prev.length >= 9) {
          alert("You can select up to 9 images for your Best Work")
          return prev
        }
        return [...prev, imageId]
      }
    })
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch("/api/profile/best-work", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageIds: selectedImages }),
      })

      if (!response.ok) {
        throw new Error("Failed to save best work")
      }

      onSave()
      onClose()
    } catch (error) {
      console.error("[v0] Error saving best work:", error)
      alert("Failed to save your selection. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-stone-950/95 backdrop-blur-xl flex items-center justify-center p-4 pb-24 sm:pb-4">
      <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[75vh] sm:max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-stone-200 flex-shrink-0">
          <div>
            <h2 className="text-lg sm:text-xl font-serif font-extralight tracking-[0.15em] text-stone-950 uppercase">
              Select Best Work
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 mt-1">
              Choose up to 9 images ({selectedImages.length}/9 selected)
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-full transition-colors">
            <X size={20} className="text-stone-600" strokeWidth={1.5} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-0">
          {images.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-stone-500 text-sm">No images in your gallery yet</p>
              <p className="text-stone-400 text-xs mt-2">Generate some photos with Maya first!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
              {images.map((image) => {
                const isSelected = selectedImages.includes(image.id)
                const selectionOrder = selectedImages.indexOf(image.id) + 1
                return (
                  <button
                    key={image.id}
                    onClick={() => toggleImage(image.id)}
                    className={`aspect-square rounded-xl overflow-hidden border-2 transition-all relative group ${
                      isSelected
                        ? "border-stone-950 ring-2 ring-stone-950 ring-offset-2"
                        : "border-stone-200 hover:border-stone-400"
                    }`}
                  >
                    <Image
                      src={image.image_url || "/placeholder.svg"}
                      alt={image.category || "Gallery image"}
                      fill
                      className="object-cover object-top"
                    />
                    {/* Overlay */}
                    <div
                      className={`absolute inset-0 transition-all ${
                        isSelected ? "bg-stone-950/40" : "bg-stone-950/0 group-hover:bg-stone-950/20"
                      }`}
                    >
                      {/* Selection indicator */}
                      <div className="absolute top-2 right-2">
                        {isSelected ? (
                          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-white rounded-full flex items-center justify-center">
                            <span className="text-xs sm:text-sm font-semibold text-stone-950">{selectionOrder}</span>
                          </div>
                        ) : (
                          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center bg-white/80 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Heart size={14} className="text-stone-600" strokeWidth={2} />
                          </div>
                        )}
                      </div>
                      {/* Category label */}
                      <div className="absolute bottom-2 left-2 right-2">
                        <div className="bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg">
                          <p className="text-[10px] sm:text-xs font-light text-stone-900 truncate capitalize">
                            {image.category?.replace(/-/g, " ") || "Photo"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 sm:p-6 border-t border-stone-200 bg-white flex-shrink-0">
          <p className="text-xs text-stone-500 text-center sm:text-left">
            Tap images to add them to your Best Work showcase
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={isSaving}
              className="flex-1 sm:flex-none px-6 py-2.5 text-sm tracking-[0.1em] uppercase font-light text-stone-600 hover:bg-stone-100 rounded-xl transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || selectedImages.length === 0}
              className="flex-1 sm:flex-none px-6 py-2.5 text-sm tracking-[0.1em] uppercase font-light bg-stone-950 text-white rounded-xl hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? "Saving..." : `Save (${selectedImages.length})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
