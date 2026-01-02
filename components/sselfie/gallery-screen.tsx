"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import {
  Heart,
  Camera,
  Video,
  Search,
} from "lucide-react"
import useSWR from "swr"
import type { GalleryImage } from "@/lib/data/images"
import { InstagramReelPreview } from "./instagram-reel-preview"
import { ProfileImageSelector } from "@/components/profile-image-selector"
import { GalleryInstagramSkeleton } from "./gallery-skeleton"
import UnifiedLoading from "./unified-loading"
import { triggerHaptic, triggerSuccessHaptic, triggerErrorHaptic } from "@/lib/utils/haptics"
import { useToast } from "@/hooks/use-toast"
import FullscreenImageModal from "./fullscreen-image-modal"
import { DesignClasses } from "@/lib/design-tokens"
// Hooks
import { useGalleryImages } from "./gallery/hooks/use-gallery-images"
import { useGalleryFeedImages } from "./gallery/hooks/use-gallery-feed-images"
import { useGalleryFilters } from "./gallery/hooks/use-gallery-filters"
import { useSelectionMode } from "./gallery/hooks/use-selection-mode"
import { useBulkOperations } from "./gallery/hooks/use-bulk-operations"
// Components
import { GalleryHeader } from "./gallery/components/gallery-header"
import { GalleryFilters } from "./gallery/components/gallery-filters"
import { GalleryImageGrid } from "./gallery/components/gallery-image-grid"
import { GallerySelectionBar } from "./gallery/components/gallery-selection-bar"

interface GalleryScreenProps {
  user: any
  userId: string
}

interface GeneratedVideo {
  id: number
  user_id: string
  image_id: number | null
  image_source: string | null
  video_url: string
  motion_prompt: string | null
  status: string
  progress: number
  created_at: string
  completed_at: string | null
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function GalleryScreen({ user, userId }: GalleryScreenProps) {
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [lightboxImage, setLightboxImage] = useState<GalleryImage | null>(null)
  const [previewVideo, setPreviewVideo] = useState<GeneratedVideo | null>(null)
  const [showProfileSelector, setShowProfileSelector] = useState(false)
  const [profileImage, setProfileImage] = useState(user.avatar || "/placeholder.svg")
  const [isPulling, setIsPulling] = useState(false)
  const touchStartY = useRef(0)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [pullDistance, setPullDistance] = useState(0)


  // Use hooks for data fetching and state management
  const {
    images: allImages,
    isLoading,
    error,
    hasMore,
    isLoadingMore,
    mutate,
    loadMore,
    loadMoreRef,
  } = useGalleryImages()

  // Feed images hook (only fetch when needed)
  const {
    images: feedImages,
    isLoading: isLoadingFeed,
    error: feedError,
    hasMore: hasMoreFeed,
    isLoadingMore: isLoadingMoreFeed,
    mutate: mutateFeed,
    loadMore: loadMoreFeed,
    loadMoreRef: loadMoreFeedRef,
  } = useGalleryFeedImages()

  const { data: videosData, mutate: mutateVideos } = useSWR("/api/maya/videos", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  })

  const { data: userData, mutate: mutateUser } = useSWR("/api/user", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  })

  const { data: stats } = useSWR("/api/studio/stats", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000, // Increased from 30s to 60s for consistency
    // Removed refreshInterval - stats don't need to auto-refresh every minute
    // Users can manually refresh if needed, or stats update on navigation
  })

  const allVideos: GeneratedVideo[] = videosData?.videos || []

  // Use selection mode hook
  const {
    selectionMode,
    setSelectionMode,
    selectedImages,
    setSelectedImages,
    toggleImageSelection,
    selectAll: selectAllImages,
    deselectAll,
    clearSelection,
    wasLongPress,
    longPressTimer,
    longPressImageId,
  } = useSelectionMode()

  // Use filters hook
  const {
    contentFilter,
    setContentFilter,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    displayImages,
    displayVideos,
  } = useGalleryFilters(allImages || [], allVideos, favorites, feedImages || [])

  // Use bulk operations hook
  const { isProcessing: isBulkProcessing, bulkDelete, bulkFavorite, bulkSave, bulkDownload } = useBulkOperations()
  const { toast } = useToast()

  // Error handlers for bulk operations
  const handleBulkDelete = async () => {
    try {
      await bulkDelete(Array.from(selectedImages), mutate, setSelectedImages, setSelectionMode)
    } catch (error) {
      toast({
        title: "Delete failed",
        description: "Failed to delete some images. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleBulkFavorite = async () => {
    try {
      await bulkFavorite(Array.from(selectedImages), mutate, setSelectedImages, setSelectionMode)
    } catch (error) {
      toast({
        title: "Favorite failed",
        description: "Failed to favorite some images. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleBulkSave = async () => {
    try {
      await bulkSave(Array.from(selectedImages), mutate, setSelectedImages, setSelectionMode)
    } catch (error) {
      toast({
        title: "Save failed",
        description: "Failed to save some images. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleBulkDownload = async () => {
    try {
      await bulkDownload(Array.from(selectedImages), displayImages, setSelectedImages, setSelectionMode)
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Failed to download some images. Please try again.",
        variant: "destructive",
      })
    }
  }

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0) {
        touchStartY.current = e.touches[0].clientY
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (window.scrollY === 0 && touchStartY.current > 0) {
        const touchY = e.touches[0].clientY
        const distance = touchY - touchStartY.current

        if (distance > 0 && distance < 150) {
          setPullDistance(distance)
          setIsPulling(true)
        }
      }
    }

    const handleTouchEnd = () => {
      if (pullDistance > 80) {
        mutate()
        mutateVideos()
        if (contentFilter === "feed") {
          mutateFeed()
        }
      }
      setIsPulling(false)
      setPullDistance(0)
      touchStartY.current = 0
    }

    window.addEventListener("touchstart", handleTouchStart)
    window.addEventListener("touchmove", handleTouchMove)
    window.addEventListener("touchend", handleTouchEnd)

    return () => {
      window.removeEventListener("touchstart", handleTouchStart)
      window.removeEventListener("touchmove", handleTouchMove)
      window.removeEventListener("touchend", handleTouchEnd)
    }
  }, [pullDistance, mutate, mutateVideos, mutateFeed, contentFilter])

  // Long-press handlers for selection mode
  const handleLongPressStart = useCallback((imageId: string) => {
    if (selectionMode) return
    
    wasLongPress.current = false
    longPressImageId.current = imageId
    longPressTimer.current = setTimeout(() => {
      wasLongPress.current = true
      setSelectionMode(true)
      toggleImageSelection(imageId)
      triggerHaptic("medium")
      longPressTimer.current = null
    }, 500) // 500ms long-press
  }, [selectionMode, setSelectionMode, toggleImageSelection])

  const handleLongPressEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
      wasLongPress.current = false
    }
  }, [])

  // Wrapper for image click with haptic
  const handleImageClick = useCallback((image: GalleryImage) => {
    triggerHaptic("light")
    setLightboxImage(image)
  }, [])

  // Wrapper for image selection toggle with haptic
  const handleToggleSelection = useCallback((imageId: string) => {
    toggleImageSelection(imageId)
  }, [toggleImageSelection])

  useEffect(() => {
    // Sync userData changes to profileImage (one-way sync from API to state)
    // Only depend on userData - adding profileImage would cause race condition:
    // When handleProfileImageUpdate sets profileImage and calls mutateUser(),
    // this effect would run before API completes and revert profileImage to old value
    if (userData?.user?.profile_image_url) {
      setProfileImage((prev: string) => {
        // Only update if different to avoid unnecessary state updates
        return prev !== userData.user.profile_image_url ? userData.user.profile_image_url : prev
      })
    }
  }, [userData]) // Only userData - this effect syncs API data to state, not vice versa

  // Filtering and sorting is now handled by useGalleryFilters hook

  const toggleFavorite = async (imageId: string, currentFavoriteState: boolean) => {
    const newFavoriteState = !currentFavoriteState

    const newFavorites = new Set(favorites)
    if (newFavoriteState) {
      newFavorites.add(imageId)
    } else {
      newFavorites.delete(imageId)
    }
    setFavorites(newFavorites)

    triggerSuccessHaptic()

    try {
      const response = await fetch("/api/images/favorite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId, isFavorite: newFavoriteState }),
      })

      if (!response.ok) {
        throw new Error("Failed to update favorite")
      }

      mutate()
    } catch (error) {
      console.error("[v0] Error updating favorite:", error)
      triggerErrorHaptic()
      const revertedFavorites = new Set(favorites)
      if (!newFavoriteState) {
        revertedFavorites.add(imageId)
      } else {
        revertedFavorites.delete(imageId)
      }
      setFavorites(revertedFavorites)
    }
  }

  const deleteImage = async (imageId: string) => {
    if (!confirm("Are you sure you want to delete this image?")) {
      return
    }

    triggerHaptic("medium")

    try {
      const response = await fetch("/api/images/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId }),
      })

      if (!response.ok) {
        throw new Error("Failed to delete image")
      }

      triggerSuccessHaptic()
      mutate()
      mutateUser() // Revalidate user data (e.g., total generated count)
      setLightboxImage(null)
    } catch (error) {
      console.error("[v0] Error deleting image:", error)
      triggerErrorHaptic()
      toast({
        title: "Delete failed",
        description: "Failed to delete image. Please try again.",
        variant: "destructive",
      })
    }
  }

  const deleteVideo = async (videoId: number) => {
    if (!confirm("Are you sure you want to delete this video?")) {
      return
    }

    try {
      const response = await fetch("/api/maya/delete-video", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId }),
      })

      if (!response.ok) {
        throw new Error("Failed to delete video")
      }

      triggerSuccessHaptic()
      mutateVideos()
      setPreviewVideo(null) // Close modal if open
    } catch (error) {
      console.error("[v0] Error deleting video:", error)
      triggerErrorHaptic()
      toast({
        title: "Delete failed",
        description: "Failed to delete video. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Selection and bulk operations are now handled by hooks
  const selectAll = () => {
    selectAllImages((displayImages || []).map((img) => img.id))
  }

  const handleProfileImageUpdate = (imageUrl: string) => {
    setProfileImage(imageUrl)
    mutateUser()
  }

  // Determine loading state based on active filter
  const isCurrentlyLoading = contentFilter === "feed" ? isLoadingFeed : isLoading

  if (isCurrentlyLoading) {
    return (
      <div className="space-y-4 sm:space-y-6 pb-24 pt-3 sm:pt-4">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-serif font-extralight tracking-[0.2em] sm:tracking-[0.3em] text-stone-950 uppercase">
            Gallery
          </h1>
        </div>
        <GalleryInstagramSkeleton />
      </div>
    )
  }

  // Determine error state based on active filter
  const currentError = contentFilter === "feed" ? feedError : error

  if (currentError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <p className="text-sm font-light text-red-600">Failed to load images</p>
          <button
            onClick={() => {
              mutate()
              if (contentFilter === "feed") {
                mutateFeed()
              }
            }}
            className={`px-4 py-2 ${DesignClasses.typography.label.uppercase} bg-stone-100/50 ${DesignClasses.border.stone} ${DesignClasses.radius.md} hover:bg-stone-100/70 transition-all duration-200`}
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const displayName = user.name || user.email?.split("@")[0] || "User"

  return (
    <div className="space-y-4 sm:space-y-6 pb-24" ref={scrollContainerRef}>
      {isPulling && (
        <div
          className="fixed top-0 left-0 right-0 flex items-center justify-center z-50 transition-all"
          style={{ transform: `translateY(${Math.min(pullDistance - 40, 60)}px)` }}
        >
          <div className={`bg-stone-950 text-white px-4 py-2 ${DesignClasses.radius.full} ${DesignClasses.typography.body.small}`}>
            {pullDistance > 80 ? "Release to refresh" : "Pull to refresh"}
          </div>
        </div>
      )}

            {!selectionMode && (
        <GalleryHeader
          stats={stats}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          sortBy={sortBy}
          onSortChange={setSortBy}
          onSelectClick={() => setSelectionMode(true)}
        />
      )}

      <GalleryFilters
        contentFilter={contentFilter}
        onContentFilterChange={setContentFilter}
      />

      {(displayImages?.length ?? 0) > 0 || (displayVideos?.length ?? 0) > 0 ? (
        <GalleryImageGrid
          images={displayImages ?? []}
          videos={displayVideos ?? []}
          selectedImages={selectedImages}
          selectionMode={selectionMode}
          onImageClick={handleImageClick}
          onToggleSelection={handleToggleSelection}
          onVideoClick={(video) => {
            triggerHaptic("light")
            // Type assertion needed due to interface mismatch between components
            setPreviewVideo(video as any as GeneratedVideo)
          }}
          hasMore={contentFilter === "feed" ? hasMoreFeed : hasMore}
          isLoadingMore={contentFilter === "feed" ? isLoadingMoreFeed : isLoadingMore}
          loadMoreRef={contentFilter === "feed" ? loadMoreFeedRef : loadMoreRef}
          onLoadMore={contentFilter === "feed" ? loadMoreFeed : loadMore}
          wasLongPress={wasLongPress}
          longPressTimer={longPressTimer}
          longPressImageId={longPressImageId}
          onLongPressStart={handleLongPressStart}
          onLongPressEnd={handleLongPressEnd}
        />
      ) : (
        <div className="bg-stone-100/40 rounded-3xl p-8 sm:p-12 text-center border border-stone-200/40">
          {contentFilter === "videos" ? (
            <>
              <Video size={48} className="mx-auto mb-6 text-stone-400" strokeWidth={1.5} />
              <h3 className="text-xl font-serif font-extralight tracking-[0.15em] text-stone-950 uppercase mb-3">
                No Videos Yet
              </h3>
              <p className="text-sm font-light text-stone-600 mb-6 max-w-md mx-auto">
                Bring your photos to life! Go to Maya and ask her to animate any of your images into stunning videos.
              </p>
              <button
                onClick={() => {
                  const mayaTab = document.querySelector('[data-tab="maya"]') as HTMLButtonElement
                  mayaTab?.click()
                }}
                className="px-6 py-3 text-xs tracking-[0.15em] uppercase font-light bg-stone-950 text-white rounded-xl hover:bg-stone-800 transition-all duration-200"
              >
                Go to Maya
              </button>
            </>
          ) : contentFilter === "feed" ? (
            <>
              <Camera size={48} className="mx-auto mb-6 text-stone-400" strokeWidth={1.5} />
              <h3 className="text-xl font-serif font-extralight tracking-[0.15em] text-stone-950 uppercase mb-3">
                No Feed Images Yet
              </h3>
              <p className="text-sm font-light text-stone-600 mb-6 max-w-md mx-auto">
                Create your first Instagram feed with the Feed Planner to see your feed images here.
              </p>
              <button
                onClick={() => {
                  window.location.hash = "feed-planner"
                }}
                className="px-6 py-3 text-xs tracking-[0.15em] uppercase font-light bg-stone-950 text-white rounded-xl hover:bg-stone-800 transition-all duration-200"
              >
                Go to Feed Planner
              </button>
            </>
          ) : searchQuery ? (
            <>
              <Search size={48} className="mx-auto mb-6 text-stone-400" strokeWidth={1.5} />
              <h3 className="text-xl font-serif font-extralight tracking-[0.15em] text-stone-950 uppercase mb-3">
                No Results Found
              </h3>
              <p className="text-sm font-light text-stone-600 mb-6 max-w-md mx-auto">
                No images match "{searchQuery}". Try a different search term or clear the search to see all images.
              </p>
              <button
                onClick={() => setSearchQuery("")}
                className="px-6 py-3 text-xs tracking-[0.15em] uppercase font-light bg-stone-950 text-white rounded-xl hover:bg-stone-800 transition-all duration-200"
              >
                Clear Search
              </button>
            </>
          ) : (
            <>
              <Camera size={48} className="mx-auto mb-6 text-stone-400" strokeWidth={1.5} />
              <h3 className="text-xl font-serif font-extralight tracking-[0.15em] text-stone-950 uppercase mb-3">
                {contentFilter === "favorited" ? "No Favorites Yet" : "No Images Yet"}
              </h3>
              <p className="text-sm font-light text-stone-600 mb-6 max-w-md mx-auto">
                {contentFilter === "favorited"
                  ? "Tap the heart icon on any image to add it to your favorites collection."
                  : "Create your first AI-generated photo with Maya to start building your gallery."}
              </p>
              {contentFilter !== "favorited" && (
                <button
                  onClick={() => {
                    window.location.hash = "maya"
                  }}
                  className="px-6 py-3 text-xs tracking-[0.15em] uppercase font-light bg-stone-950 text-white rounded-xl hover:bg-stone-800 transition-all duration-200"
                >
                  Go to Maya
                </button>
              )}
            </>
          )}
        </div>
      )}

      {selectionMode && (
        <GallerySelectionBar
          selectedCount={selectedImages.size}
          totalCount={displayImages?.length ?? 0}
          onCancel={clearSelection}
          onSelectAll={selectAll}
          onDeselectAll={deselectAll}
          onSave={handleBulkSave}
          onDownload={handleBulkDownload}
          onFavorite={handleBulkFavorite}
          onDelete={handleBulkDelete}
          isProcessing={isBulkProcessing}
        />
      )}

      {previewVideo && (
        <InstagramReelPreview
          video={previewVideo}
          videos={displayVideos}
          onClose={() => setPreviewVideo(null)}
          onDelete={deleteVideo}
          userName={displayName}
          userAvatar={profileImage}
        />
      )}

      {showProfileSelector && (
        <ProfileImageSelector
          images={allImages}
          currentAvatar={profileImage}
          onSelect={handleProfileImageUpdate}
          onClose={() => setShowProfileSelector(false)}
        />
      )}


      {lightboxImage && (
        <FullscreenImageModal
          imageUrl={lightboxImage.image_url}
          imageId={lightboxImage.id} // Removed Number() conversion - pass string ID directly
          title={lightboxImage.prompt || `Gallery Image ${lightboxImage.id}`}
          isOpen={!!lightboxImage}
          onClose={() => setLightboxImage(null)}
          isFavorite={lightboxImage.is_favorite || favorites.has(lightboxImage.id)}
          onFavoriteToggle={async () => {
            await toggleFavorite(lightboxImage.id, lightboxImage.is_favorite || favorites.has(lightboxImage.id))
          }}
          onDelete={async () => {
            await deleteImage(lightboxImage.id)
          }}
        />
      )}
    </div>
  )
}
