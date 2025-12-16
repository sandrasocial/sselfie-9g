"use client"

import { useState, useRef, useEffect } from "react"
import ImageGalleryModal from "../sselfie/image-gallery-modal"
import type { GalleryImage } from "@/lib/data/images"

interface SelectedImage {
  url: string
  type: 'base' | 'product'
}

interface WorkbenchInputStripProps {
  selectedImages?: Array<SelectedImage | null>
  onImagesChange?: (images: Array<SelectedImage | null>) => void
}

export default function WorkbenchInputStrip({ selectedImages: controlledImages, onImagesChange }: WorkbenchInputStripProps) {
  // Use controlled images if provided, otherwise use local state
  const [localImages, setLocalImages] = useState<Array<SelectedImage | null>>([
    null, // Box 1
    null, // Box 2
    null, // Box 3
  ])
  
  const isControlled = controlledImages !== undefined
  const selectedImages = isControlled ? controlledImages : localImages
  
  // Determine if 4th box should be shown based on current images
  const showFourthBox = selectedImages.length > 3
  
  const [showGalleryModal, setShowGalleryModal] = useState(false)
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([])
  const [loadingGallery, setLoadingGallery] = useState(false)
  const [uploadingBoxIndex, setUploadingBoxIndex] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const currentBoxIndexRef = useRef<number | null>(null)
  
  // Helper to update images (works for both controlled and uncontrolled)
  const updateImages = (newImages: Array<SelectedImage | null>) => {
    if (isControlled) {
      // Controlled: notify parent
      if (onImagesChange) {
        onImagesChange(newImages)
      }
    } else {
      // Uncontrolled: update local state
      setLocalImages(newImages)
      if (onImagesChange) {
        onImagesChange(newImages)
      }
    }
  }

  // Load gallery images on mount
  useEffect(() => {
    loadGalleryImages()
  }, [])

  const loadGalleryImages = async () => {
    setLoadingGallery(true)
    try {
      const response = await fetch('/api/gallery/images', {
        credentials: 'include',
      })
      
      if (!response.ok) {
        throw new Error('Failed to load gallery')
      }
      
      const data = await response.json()
      setGalleryImages(data.images || [])
    } catch (error) {
      console.error('[WORKBENCH] Failed to load gallery:', error)
      setGalleryImages([])
    } finally {
      setLoadingGallery(false)
    }
  }

  const handleImageSelect = (boxIndex: number) => {
    currentBoxIndexRef.current = boxIndex
    setShowGalleryModal(true)
  }

  const handleGallerySelect = (imageUrl: string) => {
    if (currentBoxIndexRef.current === null) return
    
    const boxIndex = currentBoxIndexRef.current
    const newImage: SelectedImage = {
      url: imageUrl,
      type: 'base'
    }
    
    const newImages = [...selectedImages]
    newImages[boxIndex] = newImage
    
    // If filling box 3 and 4th box doesn't exist yet, add it
    if (boxIndex === 2 && !showFourthBox && newImages.length === 3) {
      newImages.push(null) // Add 4th box
    }
    
    updateImages(newImages)
    setShowGalleryModal(false)
    currentBoxIndexRef.current = null
  }

  const handleUploadClick = (boxIndex: number) => {
    currentBoxIndexRef.current = boxIndex
    fileInputRef.current?.click()
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || currentBoxIndexRef.current === null) return

    const boxIndex = currentBoxIndexRef.current

    if (file.size > 10 * 1024 * 1024) {
      alert("Image must be smaller than 10MB")
      return
    }

    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file")
      return
    }

    setUploadingBoxIndex(boxIndex)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/upload-image", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Failed to upload image")
      }

      const { url } = await response.json()
      
      const newImage: SelectedImage = {
        url: url,
        type: 'base'
      }
      
      const newImages = [...selectedImages]
      newImages[boxIndex] = newImage
      
      // If filling box 3 and 4th box doesn't exist yet, add it
      if (boxIndex === 2 && !showFourthBox && newImages.length === 3) {
        newImages.push(null) // Add 4th box
      }
      
      updateImages(newImages)
    } catch (error) {
      console.error("[WORKBENCH] Error uploading image:", error)
      alert("Failed to upload image. Please try again.")
    } finally {
      setUploadingBoxIndex(null)
      currentBoxIndexRef.current = null
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleImageClear = (boxIndex: number) => {
    const newImages = [...selectedImages]
    newImages[boxIndex] = null
    
    // If clearing box 3 and 4th box exists, remove 4th box
    if (boxIndex === 2 && showFourthBox && newImages.length > 3) {
      newImages.pop()
    }
    
    updateImages(newImages)
  }

  const imageCount = selectedImages.filter(img => img !== null).length
  const maxBoxes = showFourthBox ? 4 : 3

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6 px-1">
        <h3 className="text-sm font-serif font-extralight tracking-[0.2em] text-stone-950 uppercase">Input Images</h3>
        <span className="text-xs font-light tracking-[0.1em] text-stone-500 uppercase">{imageCount} / {maxBoxes}</span>
      </div>
      
      <div className="flex items-center gap-4 sm:gap-6 overflow-x-auto scrollbar-hide pb-2 -mx-1 px-1">
        {selectedImages.map((image, index) => (
          <div key={index} className="flex items-center gap-4 sm:gap-6 shrink-0">
            <div className="relative aspect-square w-28 sm:w-32 md:w-36 rounded-2xl border-2 border-dashed border-stone-300/60 bg-gradient-to-br from-stone-50/80 via-white to-stone-50/40 overflow-hidden group touch-manipulation transition-all duration-300 hover:border-stone-400/80 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
              {image ? (
                <>
                  <img
                    src={image.url}
                    alt={`Input ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-950/50 via-stone-950/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleImageClear(index)
                    }}
                    className="absolute top-3 right-3 w-7 h-7 bg-stone-950/95 hover:bg-stone-950 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 text-base font-light touch-manipulation shadow-[0_4px_12px_rgba(0,0,0,0.3)]"
                    aria-label={`Clear image ${index + 1}`}
                  >
                    ×
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-stone-950/80 via-stone-950/40 to-transparent p-3">
                    <span className="text-[10px] text-white font-light tracking-[0.15em] uppercase">Box {index + 1}</span>
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                  {uploadingBoxIndex === index ? (
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-stone-400 border-t-transparent rounded-full animate-spin" />
                      <span className="text-[10px] font-light tracking-[0.1em] uppercase text-stone-500">Uploading...</span>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => handleImageSelect(index)}
                        className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-stone-400 hover:text-stone-600 hover:border-stone-400/80 transition-all duration-300 touch-manipulation active:scale-[0.98]"
                      >
                        <span className="text-xs font-light tracking-[0.15em] uppercase">From Gallery</span>
                      </button>
                      <button
                        onClick={() => handleUploadClick(index)}
                        className="w-full px-2 py-1 text-[10px] font-light tracking-[0.1em] uppercase text-stone-500 hover:text-stone-700 hover:bg-stone-100/50 rounded-lg transition-all duration-200 touch-manipulation"
                      >
                        Upload Photo
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
            {/* Plus sign between boxes (except after last box) */}
            {index < selectedImages.length - 1 && (
              <span className="text-stone-300/80 text-3xl sm:text-4xl md:text-5xl font-extralight shrink-0 leading-none">+</span>
            )}
          </div>
        ))}
      </div>

      {/* Hidden file input for uploads */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Gallery Modal */}
      {showGalleryModal && (
        <ImageGalleryModal
          images={galleryImages}
          onSelect={handleGallerySelect}
          onClose={() => {
            setShowGalleryModal(false)
            currentBoxIndexRef.current = null
          }}
        />
      )}
    </div>
  )
}



