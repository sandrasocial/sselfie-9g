"use client"

import { useState } from "react"
import { X, Check } from "lucide-react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import type { GalleryImage } from "@/lib/data/images"

interface ImageGalleryModalProps {
  images: GalleryImage[]
  onSelect: (imageUrl: string | string[]) => void
  onClose: () => void
  multiple?: boolean
}

function getOptimizedImageUrl(url: string, width?: number, quality?: number): string {
  if (!url) return "/placeholder.svg"

  if (url.includes("blob.vercel-storage.com") || url.includes("public.blob.vercel-storage.com")) {
    const params = new URLSearchParams()
    if (width) params.append("width", width.toString())
    if (quality) params.append("quality", quality.toString())
    return `${url}?${params.toString()}`
  }

  return url
}

export default function ImageGalleryModal({ images, onSelect, onClose, multiple = false }: ImageGalleryModalProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set())

  const handleImageClick = (imageUrl: string) => {
    if (multiple) {
      setSelectedImages((prev) => {
        const newSet = new Set(prev)
        if (newSet.has(imageUrl)) {
          newSet.delete(imageUrl)
        } else {
          newSet.add(imageUrl)
        }
        return newSet
      })
    } else {
      setSelectedImage(imageUrl)
    }
  }

  const handleSelect = () => {
    if (multiple) {
      if (selectedImages.size > 0) {
        onSelect(Array.from(selectedImages))
        onClose()
      }
    } else {
      if (selectedImage) {
        onSelect(selectedImage)
        onClose()
      }
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0 bg-white/95 backdrop-blur-xl border border-stone-200/60">
        <div className="flex flex-col h-full max-h-[90vh]">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-stone-200/40">
            <div>
              <DialogTitle asChild>
                <h2 className="font-serif text-2xl font-extralight tracking-[0.2em] uppercase text-stone-950">
                  {multiple ? 'Select Images' : 'Select Image'}
                </h2>
              </DialogTitle>
              <p className="text-sm text-stone-500 font-light mt-1">
                {multiple ? 'Choose multiple images from your gallery' : 'Choose from your gallery'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
              aria-label="Close"
            >
              <X size={20} className="text-stone-600" />
            </button>
          </div>

          {/* Gallery Grid */}
          <div className="flex-1 overflow-y-auto p-6">
            {images.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <p className="text-sm text-stone-500 font-light">No images in your gallery yet</p>
                <p className="text-xs text-stone-400 font-light mt-2">Generate photos in Studio first</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {images.map((image) => {
                  const isSelected = multiple 
                    ? selectedImages.has(image.image_url)
                    : selectedImage === image.image_url
                  
                  return (
                    <button
                      key={image.id}
                      onClick={() => handleImageClick(image.image_url)}
                      className={`aspect-square relative group overflow-hidden rounded-lg border-2 transition-all ${
                        isSelected
                          ? "border-stone-950 ring-2 ring-stone-950"
                          : "border-stone-200/40 hover:border-stone-400"
                      }`}
                    >
                      <img
                        src={getOptimizedImageUrl(image.image_url, 400, 75) || "/placeholder.svg"}
                        alt={image.prompt || "Gallery image"}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      {isSelected && (
                        <div className="absolute inset-0 bg-stone-950/40 flex items-center justify-center">
                          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                            <Check size={16} className="text-stone-950" strokeWidth={3} />
                          </div>
                        </div>
                      )}
                      {multiple && isSelected && (
                        <div className="absolute top-2 right-2 w-6 h-6 bg-stone-950 text-white rounded-full flex items-center justify-center text-xs font-medium">
                          {Array.from(selectedImages).indexOf(image.image_url) + 1}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-stone-200/40">
            <button
              onClick={onClose}
              className="px-6 py-3 text-sm font-medium tracking-wider uppercase bg-stone-100 text-stone-700 rounded-lg hover:bg-stone-200 transition-all"
            >
              Cancel
            </button>
            {multiple && selectedImages.size > 0 && (
              <div className="text-sm text-stone-600 font-light">
                {selectedImages.size} {selectedImages.size === 1 ? 'image' : 'images'} selected
              </div>
            )}
            <button
              onClick={handleSelect}
              disabled={multiple ? selectedImages.size === 0 : !selectedImage}
              className="px-6 py-3 text-sm font-medium tracking-wider uppercase bg-stone-950 text-white rounded-lg hover:bg-stone-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {multiple ? `Use ${selectedImages.size > 0 ? `${selectedImages.size} ` : ''}Image${selectedImages.size !== 1 ? 's' : ''}` : 'Use Image'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
