"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { X, Check, Loader2 } from "lucide-react"
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
  const [offset, setOffset] = useState(0)
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
      setOffset(0) // Reset offset on initial load
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
          setOffset(newOffset)
          offsetRef.current = newOffset
        } else {
          setAllImages((prev) => [...prev, ...mappedImages])
          setOffset((prev) => {
            const newOffset = prev + mappedImages.length
            offsetRef.current = newOffset
            return newOffset
          })
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
      setOffset(0)
      offsetRef.current = 0
    }
  }, [fetchImages, loadImages]) // Removed providedImages from deps to avoid re-fetching

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
            {isLoading && displayImages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <Loader2 className="w-8 h-8 text-stone-400 animate-spin mb-4" />
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
                          ? "border-stone-950 ring-2 ring-stone-950"
                          : "border-stone-200/40 hover:border-stone-400"
                      }`}
                    >
                      <img
                        src={getOptimizedImageUrl(image.image_url, 300, 70) || "/placeholder.svg"}
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
                
                {/* Load More Trigger */}
                {fetchImages && hasMore && (
                  <div ref={loadMoreRef} className="flex items-center justify-center py-6">
                    {isLoadingMore ? (
                      <div className="flex items-center gap-2 text-stone-500">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span className="text-sm font-light">Loading more images...</span>
                      </div>
                    ) : (
                      <button
                        onClick={loadMore}
                        className="px-6 py-3 text-sm font-medium tracking-wider uppercase bg-stone-100 text-stone-700 rounded-lg hover:bg-stone-200 transition-all"
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
