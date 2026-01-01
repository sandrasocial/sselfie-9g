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
import { useRouter } from "next/navigation"
import FullscreenImageModal from "./fullscreen-image-modal"
import { DesignClasses } from "@/lib/design-tokens"
// Hooks
import { useGalleryImages } from "./gallery/hooks/use-gallery-images"
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

export default function GalleryScreen({ user, userId }: GalleryScreenProps) {
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [lightboxImage, setLightboxImage] = useState<GalleryImage | null>(null)
  const [previewVideo, setPreviewVideo] = useState<GeneratedVideo | null>(null)
  const [showProfileSelector, setShowProfileSelector] = useState(false)
  const [profileImage, setProfileImage] = useState(user.avatar || "/placeholder.svg")
  const [creditBalance, setCreditBalance] = useState(0)
  const [isPulling, setIsPulling] = useState(false)
  const touchStartY = useRef(0)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [pullDistance, setPullDistance] = useState(0)

  const router = useRouter()
  const [showNavMenu, setShowNavMenu] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

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
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    displayImages,
    displayVideos,
  } = useGalleryFilters(allImages || [], allVideos, favorites)

  // Use bulk operations hook
  const { isProcessing: isBulkProcessing, bulkDelete, bulkFavorite, bulkSave, bulkDownload } = useBulkOperations()

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
  }, [pullDistance, mutate, mutateVideos])

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
    if (userData?.user?.profile_image_url && profileImage !== userData.user.profile_image_url) {
      setProfileImage(userData.user.profile_image_url)
    }
    if (userData?.user?.credit_balance !== undefined) {
      setCreditBalance(userData.user.credit_balance)
    }
  }, [userData])

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
      setLightboxImage(null)
    } catch (error) {
      console.error("[v0] Error deleting image:", error)
      triggerErrorHaptic()
      alert("Failed to delete image. Please try again.")
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

      mutateVideos()
    } catch (error) {
      console.error("[v0] Error deleting video:", error)
      alert("Failed to delete video. Please try again.")
    }
  }

  // Selection and bulk operations are now handled by hooks
  const selectAll = () => {
    selectAllImages((displayImages || []).map((img) => img.id))
  }

  const handleBulkDelete = async () => {
    await bulkDelete(Array.from(selectedImages), mutate, setSelectedImages, setSelectionMode)
  }

  const handleBulkFavorite = async () => {
    await bulkFavorite(Array.from(selectedImages), mutate, setSelectedImages, setSelectionMode)
  }

  const handleBulkSave = async () => {
    await bulkSave(Array.from(selectedImages), mutate, setSelectedImages, setSelectionMode)
  }

  const handleBulkDownload = async () => {
    await bulkDownload(Array.from(selectedImages), displayImages, setSelectedImages, setSelectionMode)
  }


  const handleProfileImageUpdate = (imageUrl: string) => {
    setProfileImage(imageUrl)
    mutateUser()
  }

  const handleNavigation = (tab: string) => {
    window.location.hash = tab
    setShowNavMenu(false)
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      })

      if (response.ok) {
        router.push("/auth/login")
      } else {
        console.error("[v0] Logout failed")
        setIsLoggingOut(false)
      }
    } catch (error) {
      console.error("[v0] Error during logout:", error)
      setIsLoggingOut(false)
    }
  }

  if (isLoading) {
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

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <p className="text-sm font-light text-red-600">Failed to load images</p>
          <button
            onClick={() => mutate()}
            className={`px-4 py-2 ${DesignClasses.typography.label.uppercase} bg-stone-100/50 ${DesignClasses.border.stone} ${DesignClasses.radius.md} hover:bg-stone-100/70 transition-all duration-200`}
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const displayName = user.name || user.email?.split("@")[0] || "User"
  const userInitial = displayName.charAt(0).toUpperCase()

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
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
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
            setPreviewVideo(video)
          }}
          hasMore={hasMore}
          isLoadingMore={isLoadingMore}
          loadMoreRef={loadMoreRef}
          onLoadMore={loadMore}
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
                {selectedCategory === "favorited" ? "No Favorites Yet" : "No Images Yet"}
              </h3>
              <p className="text-sm font-light text-stone-600 mb-6 max-w-md mx-auto">
                {selectedCategory === "favorited"
                  ? "Tap the heart icon on any image to add it to your favorites collection."
                  : "Create your first AI-generated photo in the Studio to start building your gallery."}
              </p>
              {selectedCategory !== "favorited" && (
                <button
                  onClick={() => {
                    const studioTab = document.querySelector('[data-tab="studio"]') as HTMLButtonElement
                    studioTab?.click()
                  }}
                  className="px-6 py-3 text-xs tracking-[0.15em] uppercase font-light bg-stone-950 text-white rounded-xl hover:bg-stone-800 transition-all duration-200"
                >
                  Go to Studio
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

      {/* Added navigation menu */}
      {/* Navigation menu now in global header - custom menu disabled */}
      {false && (
        <>
          <div
            className="fixed inset-0 bg-stone-950/20 backdrop-blur-sm z-40 animate-in fade-in duration-200"
            onClick={() => setShowNavMenu(false)}
          />

          <div className="fixed top-0 right-0 bottom-0 w-80 bg-white/95 backdrop-blur-3xl border-l border-stone-200 shadow-2xl z-50 animate-in slide-in-from-right duration-300 flex flex-col">
            <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-stone-200/50">
              <h3 className="text-sm font-serif font-extralight tracking-[0.2em] uppercase text-stone-950">Menu</h3>
              <button
                onClick={() => setShowNavMenu(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-stone-100 transition-colors"
                aria-label="Close menu"
              >
                <X size={18} className="text-stone-600" strokeWidth={2} />
              </button>
            </div>

            <div className="flex-shrink-0 px-6 py-6 border-b border-stone-200/50">
              <div className="text-[10px] tracking-[0.15em] uppercase font-light text-stone-500 mb-2">Your Credits</div>
              <div className="text-3xl font-serif font-extralight text-stone-950 tabular-nums">
                {creditBalance.toFixed(1)}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 py-2">
              <button
                onClick={() => handleNavigation("maya")}
                className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-stone-50 transition-colors touch-manipulation"
              >
                <Home size={18} className="text-stone-600" strokeWidth={2} />
                <span className="text-sm font-medium text-stone-700">Studio</span>
              </button>
              <button
                onClick={() => {
                  // Training moved to Account → Settings, trigger onboarding if needed
                  window.dispatchEvent(new CustomEvent('open-onboarding'))
                }}
                className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-stone-50 transition-colors touch-manipulation"
              >
                <Aperture size={18} className="text-stone-600" strokeWidth={2} />
                <span className="text-sm font-medium text-stone-700">Training</span>
              </button>
              <button
                onClick={() => handleNavigation("maya")}
                className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-stone-50 transition-colors touch-manipulation"
              >
                <MessageCircle size={18} className="text-stone-600" strokeWidth={2} />
                <span className="text-sm font-medium text-stone-700">Maya</span>
              </button>
              <button
                onClick={() => handleNavigation("gallery")}
                className="w-full flex items-center gap-3 px-6 py-4 text-left bg-stone-100/50 border-l-2 border-stone-950"
              >
                <ImageIconLucide size={18} className="text-stone-950" strokeWidth={2} />
                <span className="text-sm font-medium text-stone-950">Gallery</span>
              </button>
              {/* B-Roll moved to Maya Videos tab */}
              <button
                onClick={() => {
                  handleNavigation("maya")
                  // Navigate to Videos tab after a short delay to ensure Maya screen is loaded
                  setTimeout(() => {
                    window.location.hash = "#maya/videos"
                  }, 100)
                }}
                className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-stone-50 transition-colors touch-manipulation"
              >
                <Film size={18} className="text-stone-600" strokeWidth={2} />
                <span className="text-sm font-medium text-stone-700">Videos</span>
              </button>
              <button
                onClick={() => handleNavigation("academy")}
                className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-stone-50 transition-colors touch-manipulation"
              >
                <Grid size={18} className="text-stone-600" strokeWidth={2} />
                <span className="text-sm font-medium text-stone-700">Academy</span>
              </button>
              <button
                onClick={() => handleNavigation("account")}
                className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-stone-50 transition-colors touch-manipulation"
              >
                <UserIcon size={18} className="text-stone-600" strokeWidth={2} />
                <span className="text-sm font-medium text-stone-700">Account</span>
              </button>
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
              >
                <LogOut size={16} strokeWidth={2} />
                <span>{isLoggingOut ? "Signing Out..." : "Sign Out"}</span>
              </button>
            </div>
          </div>
        </>
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
