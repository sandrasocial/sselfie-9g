"use client"

import { useState, useEffect } from "react"
import { X, Check, Upload } from "lucide-react"
import Image from "next/image"
import type { GalleryImage } from "@/lib/data/images"

interface FeedGallerySelectorProps {
  type: "post" | "profile"
  postId?: number // Required if type === "post"
  feedId: number
  onClose: () => void
  onImageSelected: (updatedPost?: any) => void
}

export function FeedGallerySelector({ type, postId, feedId, onClose, onImageSelected }: FeedGallerySelectorProps) {
  const [images, setImages] = useState<GalleryImage[]>([])
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)
  const [activeTab, setActiveTab] = useState<"upload" | "gallery">("upload")
  const limit = 50

  // Validate props
  if (type === "post" && !postId) {
    console.error("[v0] FeedGallerySelector: postId is required when type is 'post'")
  }

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      // Upload file to /api/upload
      const formData = new FormData()
      formData.append("file", file)

      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      })

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json().catch(() => ({ error: "Upload failed" }))
        throw new Error(errorData.error || "Failed to upload image")
      }

      const uploadData = await uploadResponse.json()
      const uploadedUrl = uploadData.url

      if (!uploadedUrl) {
        throw new Error("No URL returned from upload")
      }

      // Set as selected image
      setSelectedImageUrl(uploadedUrl)
    } catch (error) {
      console.error("[v0] Error uploading file:", error)
      alert(error instanceof Error ? error.message : "Failed to upload image. Please try again.")
    } finally {
      setIsUploading(false)
    }
  }

  const handleSelect = async () => {
    if (!selectedImageUrl) return

    setIsSaving(true)
    try {
      const endpoint = type === "post" 
        ? `/api/feed/${feedId}/replace-post-image`
        : `/api/feed/${feedId}/update-profile-image`
      
      const body = type === "post"
        ? { postId, imageUrl: selectedImageUrl }
        : { imageUrl: selectedImageUrl }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
        console.error("[v0] API error response:", errorData)
        const errorMessage = type === "post"
          ? `Failed to update post image: ${response.status}`
          : `Failed to update profile image: ${response.status}`
        throw new Error(errorData.error || errorMessage)
      }

      // Get the updated post data from response
      const result = await response.json()
      console.log("[v0] Image updated successfully:", {
        postId: result.post?.id,
        imageUrl: result.post?.image_url?.substring(0, 50),
        hasPost: !!result.post
      })

      // Call the callback to refresh feed data (this will trigger optimistic update + revalidation)
      // Pass the updated post data so we can do optimistic update
      if (result.post) {
        await onImageSelected(result.post)
      } else {
        // Fallback: if no post in response, just trigger revalidation
        await onImageSelected()
      }
      
      // Small delay to ensure optimistic update is applied
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Close after data is refreshed
      onClose()
    } catch (error) {
      console.error(`[v0] Error updating ${type} image:`, error)
      const errorMessage = type === "post"
        ? "Failed to update post image. Please try again."
        : "Failed to update profile image. Please try again."
      alert(errorMessage)
    } finally {
      setIsSaving(false)
    }
  }

  const isPost = type === "post"
  const gridCols = isPost ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4" : "grid-cols-4 sm:grid-cols-6"

  return (
    <div className="fixed inset-0 z-[100] bg-stone-950/95 backdrop-blur-xl flex items-center justify-center p-4 pb-24 sm:pb-4">
      <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[75vh] sm:max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-stone-200 flex-shrink-0">
          {isPost ? (
            <div className="flex-1">
              <h2 className="text-lg sm:text-xl font-serif font-extralight tracking-[0.15em] text-stone-950 uppercase">
                Add Image to Post
              </h2>
              {/* Tabs - only for posts */}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => setActiveTab("upload")}
                  className={`px-4 py-1.5 text-xs sm:text-sm uppercase tracking-wider transition-colors rounded-lg ${
                    activeTab === "upload"
                      ? "bg-stone-900 text-white font-medium"
                      : "text-stone-500 hover:text-stone-700 hover:bg-stone-50"
                  }`}
                >
                  Upload
                </button>
                <button
                  onClick={() => setActiveTab("gallery")}
                  className={`px-4 py-1.5 text-xs sm:text-sm uppercase tracking-wider transition-colors rounded-lg ${
                    activeTab === "gallery"
                      ? "bg-stone-900 text-white font-medium"
                      : "text-stone-500 hover:text-stone-700 hover:bg-stone-50"
                  }`}
                >
                  Gallery
                </button>
              </div>
            </div>
          ) : (
            <h2 className="text-lg font-semibold text-stone-900">Choose Profile Image</h2>
          )}
          <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-full transition-colors">
            <X size={20} className="text-stone-600" strokeWidth={1.5} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-0">
          {/* Upload Tab - only show for posts */}
          {isPost && activeTab === "upload" && (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
              <div className="w-full max-w-md space-y-6">
                <label className="flex flex-col items-center justify-center gap-4 p-8 border-2 border-dashed border-stone-300 rounded-2xl hover:border-stone-400 hover:bg-stone-50 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                  {isUploading ? (
                    <div className="text-center">
                      <span className="text-sm font-light text-stone-600">Uploading...</span>
                    </div>
                  ) : (
                    <>
                      <Upload size={32} className="text-stone-600" strokeWidth={1.5} />
                      <div className="text-center">
                        <span className="text-sm font-light text-stone-900 block mb-1">Upload from device</span>
                        <span className="text-xs text-stone-500">Click to browse or drag and drop</span>
                      </div>
                    </>
                  )}
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleFileUpload} 
                    className="hidden"
                    disabled={isUploading || isSaving}
                  />
                </label>
                {selectedImageUrl && selectedImageUrl.startsWith("http") && !images.some(img => img.image_url === selectedImageUrl) && (
                  <div className="p-4 bg-stone-50 rounded-xl border border-stone-200">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-stone-100 flex-shrink-0">
                        <img src={selectedImageUrl} alt="Uploaded" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-light text-stone-900 mb-1">Image uploaded successfully</p>
                        <p className="text-xs text-stone-600 font-light">
                          Click &quot;Use This Image&quot; below to save it to this post.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Gallery Tab */}
          {(isPost && activeTab === "gallery") || (!isPost) ? (
            <>
              {isLoading ? (
            <div className="flex items-center justify-center py-12">
              {isPost ? (
                <div className="text-stone-500 text-sm">Loading your gallery...</div>
              ) : (
                <div className="text-center space-y-3">
                  <div className="w-8 h-8 border-2 border-stone-300 border-t-stone-900 rounded-full animate-spin mx-auto" />
                  <p className="text-sm text-stone-600">Loading your images...</p>
                </div>
              )}
            </div>
          ) : images.length === 0 ? (
            <div className={isPost ? "text-center py-12" : "flex items-center justify-center py-12"}>
              {isPost ? (
                <>
                  <p className="text-stone-500 text-sm">No images in your gallery yet</p>
                  <p className="text-stone-400 text-xs mt-2">Generate some photos with Maya first!</p>
                </>
              ) : (
                <p className="text-sm text-stone-600">No images found in your gallery</p>
              )}
            </div>
          ) : (
            <div className={`grid ${gridCols} gap-3 sm:gap-4`}>
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
                      className={isPost ? "object-cover object-top" : "object-cover"}
                      sizes={isPost ? "(max-width: 768px) 50vw, 25vw" : "(max-width: 640px) 25vw, 16vw"}
                    />
                    {/* Overlay */}
                    {isPost ? (
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
                    ) : (
                      isSelected && (
                        <div className="absolute inset-0 bg-stone-950/40 flex items-center justify-center">
                          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                            <Check size={16} className="text-stone-950" strokeWidth={2.5} />
                          </div>
                        </div>
                      )
                    )}
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
                className={
                  isPost
                    ? "px-6 py-2.5 text-sm tracking-[0.1em] uppercase font-light text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    : "px-6 py-2 bg-stone-100 hover:bg-stone-200 text-stone-900 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                }
              >
                {isLoadingMore ? "Loading..." : "Load More Images"}
              </button>
            </div>
          )}

              {!isLoading && images.length > 0 && !hasMore && isPost && (
                <div className="text-center mt-6">
                  <p className="text-xs text-stone-400">All images loaded</p>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div
          className={
            isPost
              ? "flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 sm:p-6 border-t border-stone-200 bg-white flex-shrink-0"
              : "flex items-center justify-end gap-3 p-4 sm:p-6 border-t border-stone-200 bg-white flex-shrink-0"
          }
        >
          {isPost && (
            <p className="text-xs text-stone-500 text-center sm:text-left">
              {activeTab === "upload" 
                ? "Upload an image or switch to Gallery tab to select from your existing images"
                : "Tap an image to select it for this post"}
            </p>
          )}
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={isSaving}
              className={
                isPost
                  ? "flex-1 sm:flex-none px-6 py-2.5 text-sm tracking-[0.1em] uppercase font-light text-stone-600 hover:bg-stone-100 rounded-xl transition-colors disabled:opacity-50"
                  : "px-6 py-2.5 text-stone-700 hover:bg-stone-100 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              }
            >
              Cancel
            </button>
            <button
              onClick={handleSelect}
              disabled={isSaving || !selectedImageUrl}
              className={
                isPost
                  ? "flex-1 sm:flex-none px-6 py-2.5 text-sm tracking-[0.1em] uppercase font-light bg-stone-950 text-white rounded-xl hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  : "px-6 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              }
            >
              {isSaving ? "Saving..." : "Use This Image"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

