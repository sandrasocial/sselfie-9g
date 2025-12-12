"use client"

import { useState, useEffect } from "react"
import { X, Check } from "lucide-react"
import Image from "next/image"
import type { GalleryImage } from "@/lib/data/images"

interface FeedProfileGallerySelectorProps {
  feedId: number
  onClose: () => void
  onImageSelected: () => void
}

export function FeedProfileGallerySelector({ feedId, onClose, onImageSelected }: FeedProfileGallerySelectorProps) {
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
      const response = await fetch(`/api/feed/${feedId}/update-profile-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          imageUrl: selectedImageUrl,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
        console.error("[v0] API error response:", errorData)
        throw new Error(errorData.error || `Failed to update profile image: ${response.status}`)
      }

      onImageSelected()
      onClose()
    } catch (error) {
      console.error("[v0] Error updating profile image:", error)
      alert("Failed to update profile image. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-stone-950/95 backdrop-blur-xl flex items-center justify-center p-4 pb-24 sm:pb-4">
      <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[75vh] sm:max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-stone-200 flex-shrink-0">
          <h2 className="text-lg font-semibold text-stone-900">Choose Profile Image</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-stone-100 rounded-full transition-colors"
            aria-label="Close"
          >
            <X size={20} className="text-stone-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-3">
                <div className="w-8 h-8 border-2 border-stone-300 border-t-stone-900 rounded-full animate-spin mx-auto" />
                <p className="text-sm text-stone-600">Loading your images...</p>
              </div>
            </div>
          ) : images.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-stone-600">No images found in your gallery</p>
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 sm:gap-4">
              {images.map((image) => (
                <button
                  key={image.id}
                  onClick={() => setSelectedImageUrl(image.image_url)}
                  className={`aspect-square rounded-xl overflow-hidden border-2 transition-all relative ${
                    selectedImageUrl === image.image_url
                      ? "border-stone-950 ring-2 ring-stone-950 ring-offset-2"
                      : "border-stone-200 hover:border-stone-400"
                  }`}
                >
                  <Image
                    src={image.image_url || "/placeholder.svg"}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 25vw, 16vw"
                  />
                  {selectedImageUrl === image.image_url && (
                    <div className="absolute inset-0 bg-stone-950/40 flex items-center justify-center">
                      <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                        <Check size={16} className="text-stone-950" strokeWidth={2.5} />
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Load More Button */}
          {hasMore && !isLoading && (
            <div className="flex justify-center mt-6">
              <button
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="px-6 py-2 bg-stone-100 hover:bg-stone-200 text-stone-900 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoadingMore ? "Loading..." : "Load More Images"}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 sm:p-6 border-t border-stone-200 bg-white flex-shrink-0">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-6 py-2.5 text-stone-700 hover:bg-stone-100 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleSelect}
            disabled={!selectedImageUrl || isSaving}
            className="px-6 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? "Saving..." : "Use This Image"}
          </button>
        </div>
      </div>
    </div>
  )
}
