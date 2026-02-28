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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 pb-24 backdrop-blur-xl sm:pb-4">
      <div className="flex max-h-[75vh] w-full max-w-5xl flex-col overflow-hidden rounded-[20px] border border-[color:var(--glass-border)] bg-[color:var(--color-obsidian)]/95 sm:max-h-[85vh]">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 p-4 sm:p-6">
          <div>
            <h2 className="display-header text-lg font-light text-[color:var(--color-porcelain)] sm:text-xl">
              Select Best Work
            </h2>
            <p className="mt-1 text-xs text-[color:var(--color-smoke)] sm:text-sm">
              Choose up to 9 images ({selectedImages.length}/9 selected)
            </p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 transition-colors hover:bg-white/10">
            <X size={20} className="text-[color:var(--color-whisper)]" strokeWidth={1.5} />
          </button>
        </div>

        {/* Content */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          {images.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-[color:var(--color-smoke)]">No images in your gallery yet</p>
              <p className="mt-2 text-xs text-[color:var(--color-smoke)]">Generate some photos with Maya first.</p>
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
                    className={`group relative aspect-square overflow-hidden rounded-xl border-2 transition-all ${
                      isSelected
                        ? "border-white ring-2 ring-white/30 ring-offset-2 ring-offset-black"
                        : "border-white/15 hover:border-white/35"
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
                        isSelected ? "bg-black/45" : "bg-black/0 group-hover:bg-black/25"
                      }`}
                    >
                      {/* Selection indicator */}
                      <div className="absolute top-2 right-2">
                        {isSelected ? (
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[color:var(--color-porcelain)] sm:h-8 sm:w-8">
                            <span className="text-xs font-semibold text-[color:var(--color-obsidian)] sm:text-sm">{selectionOrder}</span>
                          </div>
                        ) : (
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-black/70 opacity-0 transition-opacity group-hover:opacity-100 sm:h-8 sm:w-8">
                            <Heart size={14} className="text-[color:var(--color-whisper)]" strokeWidth={2} />
                          </div>
                        )}
                      </div>
                      {/* Category label */}
                      <div className="absolute bottom-2 left-2 right-2">
                        <div className="rounded-lg border border-white/10 bg-black/70 px-2 py-1 backdrop-blur-sm">
                          <p className="truncate text-[10px] font-light capitalize text-[color:var(--color-whisper)] sm:text-xs">
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
        <div className="flex shrink-0 flex-col items-stretch justify-between gap-3 border-t border-white/10 bg-black/30 p-4 sm:flex-row sm:items-center sm:p-6">
          <p className="text-center text-xs text-[color:var(--color-smoke)] sm:text-left">
            Tap images to add them to your Best Work showcase
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={isSaving}
              className="flex-1 rounded-xl border border-white/15 px-6 py-2.5 text-sm font-medium uppercase tracking-[0.2em] text-[color:var(--color-whisper)] transition-colors hover:bg-white/10 disabled:opacity-50 sm:flex-none"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || selectedImages.length === 0}
              className="flex-1 rounded-xl border border-white/25 bg-white/12 px-6 py-2.5 text-sm font-medium uppercase tracking-[0.2em] text-[color:var(--color-porcelain)] transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
            >
              {isSaving ? "Saving..." : `Save (${selectedImages.length})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
