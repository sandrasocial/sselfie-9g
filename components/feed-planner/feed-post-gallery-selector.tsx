"use client"

import { useState, useEffect } from "react"
import { X, Check } from "lucide-react"
import Image from "next/image"
import type { GalleryImage } from "@/lib/data/images"

interface FeedPostGallerySelectorProps {
  postId: number
  feedId: number
  onClose: () => void
  onImageSelected: () => void
}

export function FeedPostGallerySelector({ postId, feedId, onClose, onImageSelected }: FeedPostGallerySelectorProps) {
  const [images, setImages] = useState<GalleryImage[]>([])
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)
  const limit = 50

  useEffect(() => {
    async function fetchImages() {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/images?limit=${limit}&offset=0`, { credentials: "include" })
        if (response.ok) {
          const data = await response.json()
          setImages(data.images || [])
          setHasMore(data.hasMore || false)
          setOffset(data.images?.length || 0)
        }
      } catch (error) {
        console.error("[v0] Error fetching gallery images:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchImages()
  }, [])

  const handleLoadMore = async () => {
    if (isLoadingMore || !hasMore) return

    setIsLoadingMore(true)
    try {
      const response = await fetch(`/api/images?limit=${limit}&offset=${offset}`, { credentials: "include" })
      if (response.ok) {
        const data = await response.json()
        setImages((prev) => [...prev, ...(data.images || [])])
        setHasMore(data.hasMore || false)
        setOffset((prev) => prev + (data.images?.length || 0))
      }
    } catch (error) {
      console.error("[v0] Error loading more images:", error)
    } finally {
      setIsLoadingMore(false)
    }
  }

  const handleSelect = async () => {
    if (!selectedImageUrl) return

    setIsSaving(true)
    try {
      const response = await fetch(`/api/feed/${feedId}/replace-post-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          postId,
          imageUrl: selectedImageUrl,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
        console.error("[v0] API error response:", errorData)
        throw new Error(errorData.error || `Failed to update post image: ${response.status}`)
      }

      onImageSelected()
      onClose()
    } catch (error) {
      console.error("[v0] Error updating post image:", error)
      alert("Failed to update post image. Please try again.")
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
              Choose from Gallery
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 mt-1">
              Select an image from your gallery to use for this post
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-full transition-colors">
            <X size={20} className="text-stone-600" strokeWidth={1.5} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-stone-500 text-sm">Loading your gallery...</div>
            </div>
          ) : images.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-stone-500 text-sm">No images in your gallery yet</p>
              <p className="text-stone-400 text-xs mt-2">Generate some photos with Maya first!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
              {images.map((image) => {
                const isSelected = selectedImageUrl === image.image_url
                return (
                  <button
                    key={image.id}
                    onClick={() => setSelectedImageUrl(image.image_url)}
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
                            <Check size={16} className="text-stone-950" strokeWidth={2.5} />
                          </div>
                        ) : (
                          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center bg-white/80 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="w-4 h-4 border-2 border-stone-400 rounded" />
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

          {/* Load More Button */}
          {!isLoading && images.length > 0 && hasMore && (
            <div className="flex justify-center mt-6">
              <button
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="px-6 py-2.5 text-sm tracking-[0.1em] uppercase font-light text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoadingMore ? "Loading..." : "Load More Images"}
              </button>
            </div>
          )}

          {!isLoading && images.length > 0 && !hasMore && (
            <div className="text-center mt-6">
              <p className="text-xs text-stone-400">All images loaded</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 sm:p-6 border-t border-stone-200 bg-white flex-shrink-0">
          <p className="text-xs text-stone-500 text-center sm:text-left">
            Tap an image to select it for this post
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
              onClick={handleSelect}
              disabled={isSaving || !selectedImageUrl}
              className="flex-1 sm:flex-none px-6 py-2.5 text-sm tracking-[0.1em] uppercase font-light bg-stone-950 text-white rounded-xl hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? "Saving..." : "Use This Image"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

