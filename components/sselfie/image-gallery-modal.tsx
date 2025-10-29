"use client"

import { useState } from "react"
import { X, Check } from "lucide-react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import type { GalleryImage } from "@/lib/data/images"

interface ImageGalleryModalProps {
  images: GalleryImage[]
  onSelect: (imageUrl: string) => void
  onClose: () => void
}

export default function ImageGalleryModal({ images, onSelect, onClose }: ImageGalleryModalProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  const handleSelect = () => {
    if (selectedImage) {
      onSelect(selectedImage)
      onClose()
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0 bg-white/95 backdrop-blur-xl border border-stone-200/60">
        <div className="flex flex-col h-full max-h-[90vh]">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-stone-200/40">
            <div>
              <h2 className="font-['Times_New_Roman'] text-2xl font-extralight tracking-[0.2em] uppercase text-stone-950">
                Select Image
              </h2>
              <p className="text-sm text-stone-500 font-light mt-1">Choose from your gallery</p>
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
                {images.map((image) => (
                  <button
                    key={image.id}
                    onClick={() => setSelectedImage(image.image_url)}
                    className={`aspect-square relative group overflow-hidden rounded-lg border-2 transition-all ${
                      selectedImage === image.image_url
                        ? "border-stone-950 ring-2 ring-stone-950"
                        : "border-stone-200/40 hover:border-stone-400"
                    }`}
                  >
                    <img
                      src={image.image_url || "/placeholder.svg"}
                      alt={image.prompt || "Gallery image"}
                      className="w-full h-full object-cover"
                    />
                    {selectedImage === image.image_url && (
                      <div className="absolute inset-0 bg-stone-950/40 flex items-center justify-center">
                        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                          <Check size={16} className="text-stone-950" strokeWidth={3} />
                        </div>
                      </div>
                    )}
                  </button>
                ))}
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
            <button
              onClick={handleSelect}
              disabled={!selectedImage}
              className="px-6 py-3 text-sm font-medium tracking-wider uppercase bg-stone-950 text-white rounded-lg hover:bg-stone-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Use Image
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
