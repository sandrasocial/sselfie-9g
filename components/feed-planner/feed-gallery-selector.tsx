"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { createPortal } from "react-dom"
import Image from "next/image"
import type { GalleryImage } from "@/lib/data/images"
import { toast } from "@/hooks/use-toast"
import { useAccessibleModal } from "@/components/app-v3/use-accessible-modal"
import { trackAnalyticsEvent } from "@/lib/analytics/client"

const SUPPORTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"]

interface FeedGallerySelectorProps {
  type: "post" | "profile"
  postId?: number // Required if type === "post"
  feedId: number
  onClose: () => void
  onImageSelected: (updatedPost?: any) => void
}

export function FeedGallerySelector({
  type,
  postId,
  feedId,
  onClose,
  onImageSelected,
}: FeedGallerySelectorProps) {
  const [images, setImages] = useState<GalleryImage[]>([])
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)
  const [activeTab, setActiveTab] = useState<"upload" | "gallery">("upload")
  const [loadError, setLoadError] = useState<string | null>(null)
  const [portalTarget, setPortalTarget] = useState<Element | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const closeWhenIdle = useCallback(() => {
    if (!isSaving && !isUploading) onClose()
  }, [isSaving, isUploading, onClose])
  const { dialogRef, initialFocusRef } = useAccessibleModal(portalTarget !== null, closeWhenIdle)
  const limit = 50

  // Validate props
  if (type === "post" && !postId) {
    console.error("[v0] FeedGallerySelector: postId is required when type is 'post'")
  }

  const fetchImages = useCallback(async () => {
    try {
      setIsLoading(true)
      setLoadError(null)
      const response = await fetch(`/api/images?limit=${limit}&offset=0`, {
        credentials: "include",
      })
      if (!response.ok) throw new Error("Your gallery could not be loaded.")
      const data = await response.json()
      setImages(data.images || [])
      setHasMore(data.hasMore || false)
      setOffset(data.images?.length || 0)
    } catch (error) {
      console.error("[v0] Error fetching gallery images:", error)
      setLoadError(error instanceof Error ? error.message : "Your gallery could not be loaded.")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchImages()
  }, [fetchImages])

  const handleLoadMore = async () => {
    if (isLoadingMore || !hasMore) return

    setIsLoadingMore(true)
    try {
      const response = await fetch(`/api/images?limit=${limit}&offset=${offset}`, {
        credentials: "include",
      })
      // DRAFT copy for Sandra approval before release.
      if (!response.ok) throw new Error("More photos could not be loaded.")
      const data = await response.json()
      setImages(prev => [...prev, ...(data.images || [])])
      setHasMore(data.hasMore || false)
      setOffset(prev => prev + (data.images?.length || 0))
    } catch (error) {
      console.error("[v0] Error loading more images:", error)
      toast({
        title: "Could not load more photos",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoadingMore(false)
    }
  }

  const uploadFile = async (file: File) => {
    if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
      toast({
        title: "Choose a supported image",
        description: "Upload a JPEG, PNG or WebP image.",
        variant: "destructive",
      })
      return
    }
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
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) void uploadFile(file)
  }

  const handleSelect = async () => {
    if (!selectedImageUrl) return

    setIsSaving(true)
    try {
      const endpoint =
        type === "post"
          ? `/api/feed/${feedId}/replace-post-image`
          : `/api/feed/${feedId}/update-profile-image`

      const selectedGalleryImage = images.find(image => image.image_url === selectedImageUrl)
      const selectedAiImageMatch = selectedGalleryImage?.id.match(/^ai_(\d+)$/)
      const selectedAiImageId =
        selectedGalleryImage?.source === "ai_images" &&
        selectedAiImageMatch &&
        Number(selectedAiImageMatch[1]) > 0
          ? Number(selectedAiImageMatch[1])
          : null

      const body =
        type === "post"
          ? { postId, imageUrl: selectedImageUrl, aiImageId: selectedAiImageId }
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
        const errorMessage =
          type === "post"
            ? `Failed to update post image: ${response.status}`
            : `Failed to update profile image: ${response.status}`
        throw new Error(errorData.error || errorMessage)
      }

      // Get the updated post data from response
      const result = await response.json()
      console.log("[v0] Image updated successfully:", {
        postId: result.post?.id,
        imageUrl: result.post?.image_url?.substring(0, 50),
        hasPost: !!result.post,
      })

      if (type === "post") {
        void trackAnalyticsEvent({
          event: "calendar_photo_added",
          properties: {
            feedId,
            postId: result.post?.id || postId || null,
            captionStatus: result.captionStatus || null,
          },
        })
        if (result.post?.caption) {
          void trackAnalyticsEvent({
            event: "calendar_post_ready",
            properties: { feedId, postId: result.post.id, source: "gallery" },
          })
        }
      }

      // Call the callback to refresh feed data (this will trigger optimistic update + revalidation)
      // Pass the updated post data so we can do optimistic update
      if (result.post) {
        await onImageSelected(result.post)
      } else {
        // Fallback: if no post in response, just trigger revalidation
        await onImageSelected()
      }

      // Close after data is refreshed
      onClose()
    } catch (error) {
      console.error(`[v0] Error updating ${type} image:`, error)
      const errorMessage =
        type === "post"
          ? "Failed to update post image. Please try again."
          : "Failed to update profile image. Please try again."
      toast({ title: "Image update failed", description: errorMessage, variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  useEffect(() => {
    setPortalTarget(document.body)
  }, [])

  const isPost = type === "post"
  const gridCols = isPost
    ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4"
    : "grid-cols-4 sm:grid-cols-6"

  if (!portalTarget) return null

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-[color:var(--ss-night)]/45 p-0 backdrop-blur-sm sm:items-center sm:p-5">
      <button
        type="button"
        aria-label="Close photo picker"
        className="absolute inset-0"
        onClick={closeWhenIdle}
        disabled={isSaving || isUploading}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="feed-gallery-title"
        className="relative z-[1] flex max-h-[calc(100dvh-0.5rem)] w-full max-w-5xl flex-col overflow-hidden rounded-t-[24px] border border-[color:var(--ss-silver)] bg-[color:var(--ss-seasalt)] text-[color:var(--ss-night)] shadow-[0_30px_100px_rgba(13,14,16,0.24)] sm:max-h-[88dvh] sm:rounded-[24px]"
      >
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[color:var(--ss-silver)] bg-white p-4 sm:p-6">
          <div className="min-w-0 flex-1">
            <h2
              id="feed-gallery-title"
              className="font-serif text-[26px] font-light leading-none text-[color:var(--ss-night)] sm:text-[32px]"
            >
              {isPost ? "Add photo to post" : "Choose profile photo"}
            </h2>
            <div className="flex gap-2 mt-3">
              <button
                type="button"
                onClick={() => setActiveTab("upload")}
                aria-pressed={activeTab === "upload"}
                className={`min-h-11 rounded-full border px-4 text-[10px] uppercase tracking-[0.16em] transition-colors ${
                  activeTab === "upload"
                    ? "border-[color:var(--ss-night)] bg-[color:var(--ss-night)] text-white"
                    : "border-[color:var(--ss-silver)] bg-white text-[color:var(--ss-davy)] hover:border-[color:var(--ss-gray)]"
                }`}
              >
                Upload
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("gallery")}
                aria-pressed={activeTab === "gallery"}
                className={`min-h-11 rounded-full border px-4 text-[10px] uppercase tracking-[0.16em] transition-colors ${
                  activeTab === "gallery"
                    ? "border-[color:var(--ss-night)] bg-[color:var(--ss-night)] text-white"
                    : "border-[color:var(--ss-silver)] bg-white text-[color:var(--ss-davy)] hover:border-[color:var(--ss-gray)]"
                }`}
              >
                Gallery
              </button>
            </div>
          </div>
          <button
            ref={initialFocusRef}
            type="button"
            onClick={closeWhenIdle}
            disabled={isSaving || isUploading}
            className="min-h-11 rounded-full border border-[color:var(--ss-silver)] bg-white px-4 text-[10px] uppercase tracking-[0.18em] text-[color:var(--ss-davy)] transition-colors hover:border-[color:var(--ss-gray)] hover:text-[color:var(--ss-night)]"
          >
            Close
          </button>
        </div>

        {/* Content */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          {/* Upload Tab */}
          {activeTab === "upload" && (
            <div className="flex min-h-[360px] flex-col items-center justify-center">
              <div className="w-full max-w-md space-y-6">
                <label
                  className="flex cursor-pointer flex-col items-center justify-center gap-4 rounded-[18px] border border-dashed border-[color:var(--ss-gray)] bg-white p-8 transition-colors hover:border-[color:var(--ss-davy)] hover:bg-[color:var(--calendar-stone-1)]"
                  onDragOver={event => event.preventDefault()}
                  onDrop={event => {
                    event.preventDefault()
                    const file = event.dataTransfer.files?.[0]
                    if (file) void uploadFile(file)
                  }}
                >
                  {isUploading ? (
                    <div className="text-center">
                      <span className="text-sm text-[color:var(--ss-davy)]">Uploading photo…</span>
                    </div>
                  ) : (
                    <>
                      <div className="rounded-full border border-[color:var(--ss-silver)] bg-white px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-[color:var(--ss-davy)]">
                        Choose photo
                      </div>
                      <div className="text-center">
                        <span className="mb-1 block text-sm text-[color:var(--ss-night)]">
                          Upload from your device
                        </span>
                        <span className="text-xs text-[color:var(--app-text-secondary)]">
                          JPEG, PNG or WebP · tap to browse or drag here
                        </span>
                      </div>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isUploading || isSaving}
                  />
                </label>
                {selectedImageUrl &&
                  selectedImageUrl.startsWith("http") &&
                  !images.some(img => img.image_url === selectedImageUrl) && (
                    <div className="rounded-[14px] border border-[color:var(--ss-silver)] bg-white p-4">
                      <div className="flex items-start gap-3">
                        <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-[8px] bg-[color:var(--calendar-stone-1)]">
                          <Image
                            src={selectedImageUrl}
                            alt="Uploaded"
                            fill
                            sizes="48px"
                            className="object-cover object-top"
                          />
                        </div>
                        <div className="flex-1">
                          <p className="mb-1 text-sm text-[color:var(--ss-night)]">Photo ready</p>
                          <p className="text-xs text-[color:var(--app-text-secondary)]">
                            Choose &quot;Use this photo&quot; to add it to{" "}
                            {isPost ? "the post" : "your profile"}.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
              </div>
            </div>
          )}

          {/* Gallery Tab */}
          {activeTab === "gallery" ? (
            <>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  {isPost ? (
                    <div className="text-sm text-[color:var(--app-text-secondary)]">
                      Loading your gallery…
                    </div>
                  ) : (
                    <div className="text-center space-y-3">
                      <div className="w-8 h-8 border-2 border-stone-300 border-t-stone-900 rounded-full animate-spin mx-auto" />
                      <p className="text-sm text-[color:var(--app-text-secondary)]">
                        Loading your photos…
                      </p>
                    </div>
                  )}
                </div>
              ) : loadError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-center">
                  <p className="text-sm text-red-700">{loadError}</p>
                  <button
                    type="button"
                    onClick={() => void fetchImages()}
                    className="mt-3 min-h-11 px-4 text-xs uppercase tracking-wider text-red-800 underline underline-offset-2"
                  >
                    Try again
                  </button>
                </div>
              ) : images.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-sm text-[color:var(--ss-davy)]">Your gallery is empty</p>
                  <p className="mt-2 text-xs text-[color:var(--ss-gray)]">
                    Upload a photo here or create one with Maya.
                  </p>
                </div>
              ) : (
                <div className={`grid ${gridCols} gap-3 sm:gap-4`}>
                  {images.map(image => {
                    const isSelected = selectedImageUrl === image.image_url
                    return (
                      <button
                        key={image.id}
                        type="button"
                        onClick={() => setSelectedImageUrl(image.image_url)}
                        aria-pressed={isSelected}
                        aria-label={`${isSelected ? "Selected" : "Choose"} ${image.category?.replace(/-/g, " ") || "photo"}`}
                        className={`aspect-square rounded-xl overflow-hidden border-2 transition-all relative group ${
                          isSelected
                            ? "border-[color:var(--ss-night)] ring-2 ring-[color:var(--ss-night)] ring-offset-2"
                            : "border-[color:var(--ss-silver)] hover:border-[color:var(--ss-gray)]"
                        }`}
                      >
                        <Image
                          src={image.image_url || "/placeholder.svg"}
                          alt={image.category || "Gallery image"}
                          fill
                          className="object-cover object-top"
                          sizes={
                            isPost
                              ? "(max-width: 768px) 50vw, 25vw"
                              : "(max-width: 640px) 25vw, 16vw"
                          }
                        />
                        {/* Overlay */}
                        {isPost ? (
                          <div
                            className={`absolute inset-0 transition-all ${
                              isSelected
                                ? "bg-stone-950/40"
                                : "bg-stone-950/0 group-hover:bg-stone-950/20"
                            }`}
                          >
                            {/* Selection indicator */}
                            <div className="absolute top-2 right-2">
                              {isSelected ? (
                                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-white rounded-full flex items-center justify-center">
                                  <span className="text-[10px] uppercase tracking-[0.2em] text-stone-950">
                                    Ok
                                  </span>
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
                                <span className="text-[10px] uppercase tracking-[0.2em] text-stone-950">
                                  Ok
                                </span>
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
                    {isLoadingMore ? "Loading…" : "Load more photos"}
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
              type="button"
              onClick={closeWhenIdle}
              disabled={isSaving || isUploading}
              className={
                isPost
                  ? "flex-1 sm:flex-none px-6 py-2.5 text-sm tracking-[0.1em] uppercase font-light text-stone-600 hover:bg-stone-100 rounded-xl transition-colors disabled:opacity-50"
                  : "px-6 py-2.5 text-stone-700 hover:bg-stone-100 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              }
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSelect}
              disabled={isSaving || !selectedImageUrl}
              className={
                isPost
                  ? "flex-1 sm:flex-none px-6 py-2.5 text-sm tracking-[0.1em] uppercase font-light bg-stone-950 text-white rounded-xl hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  : "px-6 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              }
            >
              {isSaving ? "Saving…" : "Use this photo"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    portalTarget
  )
}
