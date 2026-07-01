"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import type { GalleryImage } from "@/lib/data/images"

interface ImageGalleryModalProps {
  images?: GalleryImage[] // Optional - if provided, use them; otherwise fetch with pagination
  onSelect: (imageUrl: string | string[]) => void
  onClose: () => void
  multiple?: boolean
  fetchImages?: boolean // If true, fetch images with pagination instead of using provided images
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

export default function ImageGalleryModal({ 
  images: providedImages = [], 
  onSelect, 
  onClose, 
  multiple = false,
  fetchImages = false,
}: ImageGalleryModalProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set())
  
  // Pagination state (only used if fetchImages is true)
  const [allImages, setAllImages] = useState<GalleryImage[]>(providedImages)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const isLoadingRef = useRef(false) // Prevent duplicate requests
  const offsetRef = useRef(0) // Ref to track current offset for loadMore
  const LIMIT = 30 // Reduced from 100 for faster initial load - users can click "Load More" to access all images

  // Memoized loadImages function
  const loadImages = useCallback(async (newOffset: number, isInitial: boolean = false) => {
    // Prevent duplicate requests
    if (isLoadingRef.current) {
      console.log('[ImageGalleryModal] Already loading, skipping duplicate request')
      return
    }

    isLoadingRef.current = true

    if (isInitial) {
      setIsLoading(true)
    } else {
      setIsLoadingMore(true)
    }

    try {
      const response = await fetch(`/api/gallery/images?limit=${LIMIT}&offset=${newOffset}`, {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to load gallery images')
      }

      const data = await response.json()
      
      if (data.images) {
        const mappedImages: GalleryImage[] = data.images.map((img: any) => ({
          id: img.id?.toString() || '',
          user_id: '',
          image_url: img.image_url || '',
          prompt: img.prompt || '',
          description: img.description,
          category: img.category,
          style: img.style,
          is_favorite: img.is_favorite || false,
          created_at: img.created_at || new Date().toISOString(),
          source: 'ai_images' as const,
        }))

        if (isInitial) {
          setAllImages(mappedImages)
          const newOffset = mappedImages.length
          offsetRef.current = newOffset
        } else {
          setAllImages((prev) => [...prev, ...mappedImages])
          offsetRef.current += mappedImages.length
        }

        setHasMore(data.hasMore || false)
      }
    } catch (error) {
      console.error('[ImageGalleryModal] Failed to load gallery:', error)
      setHasMore(false) // Stop trying if there's an error
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
      isLoadingRef.current = false
    }
  }, [])

  // Memoized loadMore function - use ref to get current offset
  const loadMore = useCallback(() => {
    if (!isLoadingMore && hasMore && !isLoadingRef.current) {
      loadImages(offsetRef.current, false)
    }
  }, [isLoadingMore, hasMore, loadImages])

  // Fetch images with pagination if fetchImages is true
  useEffect(() => {
    if (fetchImages) {
      offsetRef.current = 0 // Reset ref
      loadImages(0, true)
    } else {
      setAllImages(providedImages)
      setHasMore(false) // No pagination when using provided images
      offsetRef.current = 0
    }
  }, [fetchImages, loadImages, providedImages])

  // Intersection observer for infinite scroll
  useEffect(() => {
    if (!fetchImages || !hasMore || isLoadingMore || isLoadingRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore && !isLoadingRef.current) {
          loadMore()
        }
      },
      { threshold: 0.1, rootMargin: '100px' } // Start loading 100px before reaching the bottom
    )

    const currentRef = loadMoreRef.current
    if (currentRef) {
      observer.observe(currentRef)
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef)
      }
    }
  }, [hasMore, isLoadingMore, fetchImages, loadMore])

  // Use provided images or fetched images
  const displayImages = fetchImages ? allImages : providedImages

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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0 bg-[rgba(18,17,16,0.96)] backdrop-blur-xl border border-[rgba(195,190,182,0.25)]">
        <div className="flex flex-col h-full max-h-[90vh]">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-[rgba(195,190,182,0.20)]">
            <div>
              <DialogTitle asChild>
                <h2 className="font-serif text-2xl font-extralight tracking-[0.2em] uppercase text-[#f0ede8]">
                  {multiple ? 'Select Images' : 'Select Image'}
                </h2>
              </DialogTitle>
              <p className="text-sm text-[#a8a49c] font-light mt-1">
                {multiple ? 'Choose multiple images from your gallery' : 'Choose from your gallery'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg border border-[rgba(195,190,182,0.35)] px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-[#c8c4bb] hover:bg-[rgba(175,170,162,0.15)] transition-colors"
              aria-label="Close"
            >
              Close
            </button>
          </div>

          {/* Gallery Grid */}
          <div className="flex-1 overflow-y-auto p-6">
            {isLoading && displayImages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <span className="mb-4 h-8 w-8 rounded-full border border-stone-300 border-t-stone-500 animate-spin" />
                <p className="text-sm text-stone-500 font-light">Loading gallery...</p>
              </div>
            ) : displayImages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <p className="text-sm text-stone-500 font-light">No images in your gallery yet</p>
                <p className="text-xs text-stone-400 font-light mt-2">Generate photos in Studio first</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {displayImages.map((image) => {
                  const isSelected = multiple 
                    ? selectedImages.has(image.image_url)
                    : selectedImage === image.image_url
                  
                  return (
                    <button
                      key={image.id}
                      onClick={() => handleImageClick(image.image_url)}
                      className={`aspect-square relative group overflow-hidden rounded-lg border-2 transition-all ${
                        isSelected
                          ? "border-[#f0ede8] ring-2 ring-[rgba(240,237,232,0.65)]"
                          : "border-[rgba(195,190,182,0.30)] hover:border-[rgba(240,237,232,0.55)]"
                      }`}
                    >
                      <img
                        src={getOptimizedImageUrl(image.image_url, 300, 70) || "/placeholder.svg"}
                        alt={image.prompt || "Gallery image"}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      {isSelected && (
                        <div className="absolute inset-0 bg-[rgba(10,10,10,0.55)] flex items-center justify-center">
                          <div className="w-8 h-8 bg-[#f0ede8] rounded-full flex items-center justify-center">
                            <span className="text-[10px] uppercase tracking-[0.2em] text-[#0d0c0b]">Ok</span>
                          </div>
                        </div>
                      )}
                      {multiple && isSelected && (
                        <div className="absolute top-2 right-2 w-6 h-6 bg-[#0d0c0b] text-[#f0ede8] rounded-full flex items-center justify-center text-xs font-medium">
                          {Array.from(selectedImages).indexOf(image.image_url) + 1}
                        </div>
                      )}
                    </button>
                  )
                  })}
                </div>
                
                {/* Load More Trigger */}
                {fetchImages && hasMore && (
                  <div ref={loadMoreRef} className="flex items-center justify-center py-6">
                    {isLoadingMore ? (
                      <div className="flex items-center gap-2 text-[#a8a49c]">
                        <span className="h-5 w-5 rounded-full border border-[rgba(195,190,182,0.45)] border-t-[#f0ede8] animate-spin" />
                        <span className="text-sm font-light">Loading more images...</span>
                      </div>
                    ) : (
                      <button
                        onClick={loadMore}
                        className="px-6 py-3 text-sm font-medium tracking-wider uppercase bg-[rgba(175,170,162,0.16)] text-[#f0ede8] rounded-lg hover:bg-[rgba(175,170,162,0.24)] transition-all"
                      >
                        Load More
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-[rgba(195,190,182,0.20)]">
            <button
              onClick={onClose}
              className="px-6 py-3 text-sm font-medium tracking-wider uppercase bg-[rgba(175,170,162,0.16)] text-[#c8c4bb] rounded-lg hover:bg-[rgba(175,170,162,0.24)] transition-all"
            >
              Cancel
            </button>
            {multiple && selectedImages.size > 0 && (
              <div className="text-sm text-[#a8a49c] font-light">
                {selectedImages.size} {selectedImages.size === 1 ? 'image' : 'images'} selected
              </div>
            )}
            <button
              onClick={handleSelect}
              disabled={multiple ? selectedImages.size === 0 : !selectedImage}
              className="px-6 py-3 text-sm font-medium tracking-wider uppercase bg-[#f0ede8] text-[#0d0c0b] rounded-lg hover:bg-[#ffffff] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {multiple ? `Use ${selectedImages.size > 0 ? `${selectedImages.size} ` : ''}Image${selectedImages.size !== 1 ? 's' : ''}` : 'Use Image'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
