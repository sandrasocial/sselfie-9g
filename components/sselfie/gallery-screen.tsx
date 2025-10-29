"use client"

import { useState } from "react"
import { Heart, Grid, Camera, ImageIcon, Download, Trash2, Video, Play } from "lucide-react"
import useSWR from "swr"
import type { User } from "./types"
import type { GalleryImage } from "@/lib/data/images"
import { InstagramPhotoPreview } from "./instagram-photo-preview"
import { InstagramReelPreview } from "./instagram-reel-preview"
import { ProfileImageSelector } from "@/components/profile-image-selector"
import UnifiedLoading from "./unified-loading"

interface GalleryScreenProps {
  user: User
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

function categorizeImage(image: GalleryImage): string {
  if (image.category) {
    const cat = image.category.toLowerCase()
    if (cat.includes("feed") || cat.includes("instagram")) return "feed-design"
    if (cat.includes("close") || cat.includes("portrait")) return "close-up"
    if (cat.includes("half") || cat.includes("waist")) return "half-body"
    if (cat.includes("full") || cat.includes("scenery")) return "full-scenery"
    if (cat.includes("flat")) return "flatlay"
  }

  const prompt = image.prompt?.toLowerCase() || ""
  if (prompt.includes("close") || prompt.includes("portrait") || prompt.includes("face")) return "close-up"
  if (prompt.includes("half") || prompt.includes("waist")) return "half-body"
  if (prompt.includes("full") || prompt.includes("scenery") || prompt.includes("landscape")) return "full-scenery"
  if (prompt.includes("flat") || prompt.includes("overhead")) return "flatlay"

  return "close-up"
}

export default function GalleryScreen({ user, userId }: GalleryScreenProps) {
  const [galleryView, setGalleryView] = useState<"instagram" | "all">("instagram")
  const [contentFilter, setContentFilter] = useState<"all" | "photos" | "videos">("all")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [lightboxImage, setLightboxImage] = useState<GalleryImage | null>(null)
  const [previewVideo, setPreviewVideo] = useState<GeneratedVideo | null>(null)
  const [showProfileSelector, setShowProfileSelector] = useState(false)
  const [profileImage, setProfileImage] = useState(user.avatar || "/placeholder.svg")

  const { data, error, isLoading, mutate } = useSWR("/api/images", fetcher, {
    refreshInterval: 30000,
  })

  const { data: videosData, mutate: mutateVideos } = useSWR("/api/maya/videos", fetcher, {
    refreshInterval: 30000,
  })

  const { data: userData, mutate: mutateUser } = useSWR("/api/user", fetcher, {
    refreshInterval: 30000,
  })

  if (userData?.user?.profile_image_url && profileImage !== userData.user.profile_image_url) {
    setProfileImage(userData.user.profile_image_url)
  }

  const allImages: GalleryImage[] = data?.images || []
  const allVideos: GeneratedVideo[] = videosData?.videos || []
  const favoritedImages = allImages.filter((img) => img.is_favorite || favorites.has(img.id))

  const getFilteredImages = () => {
    if (selectedCategory === "all") return allImages
    if (selectedCategory === "favorited") return favoritedImages
    return allImages.filter((img) => categorizeImage(img) === selectedCategory)
  }

  const filteredImages = getFilteredImages()

  const getFilteredContent = () => {
    if (contentFilter === "photos") return { images: filteredImages, videos: [] }
    if (contentFilter === "videos") return { images: [], videos: allVideos }
    return { images: filteredImages, videos: allVideos }
  }

  const { images: displayImages, videos: displayVideos } = getFilteredContent()

  const toggleFavorite = async (imageId: string, currentFavoriteState: boolean) => {
    const newFavoriteState = !currentFavoriteState

    const newFavorites = new Set(favorites)
    if (newFavoriteState) {
      newFavorites.add(imageId)
    } else {
      newFavorites.delete(imageId)
    }
    setFavorites(newFavorites)

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

    try {
      const response = await fetch("/api/images/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId }),
      })

      if (!response.ok) {
        throw new Error("Failed to delete image")
      }

      mutate()
      setLightboxImage(null)
    } catch (error) {
      console.error("[v0] Error deleting image:", error)
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

  const handleProfileImageUpdate = (imageUrl: string) => {
    setProfileImage(imageUrl)
    mutateUser()
  }

  if (isLoading) {
    return <UnifiedLoading message="Loading your gallery..." />
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <p className="text-sm font-light text-red-600">Failed to load images</p>
          <button
            onClick={() => mutate()}
            className="px-4 py-2 text-xs tracking-[0.15em] uppercase font-light bg-stone-100/50 border border-stone-200/40 rounded-xl hover:bg-stone-100/70 transition-all duration-200"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (galleryView === "instagram") {
    const displayName = user.name || user.email?.split("@")[0] || "User"

    return (
      <div className="space-y-4 sm:space-y-6 pb-24">
        <div className="pt-3 sm:pt-4">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-serif font-extralight tracking-[0.2em] sm:tracking-[0.3em] text-stone-950 uppercase">
              Gallery
            </h1>
            <button
              onClick={() => setGalleryView("all")}
              className="px-3 sm:px-4 py-2 text-[10px] sm:text-xs tracking-[0.15em] uppercase font-light bg-stone-100/50 border border-stone-200/40 rounded-lg sm:rounded-xl hover:bg-stone-100/70 transition-all duration-200 min-h-[36px] sm:min-h-[40px]"
            >
              All Images
            </button>
          </div>
        </div>

        <div className="bg-stone-100/40 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 border border-stone-200/40">
          <div className="flex items-center gap-4 sm:gap-6 mb-4 sm:mb-6">
            <button
              onClick={() => setShowProfileSelector(true)}
              className="relative w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full overflow-hidden border-2 border-stone-300/60 flex-shrink-0 group"
            >
              <img src={profileImage || "/placeholder.svg"} alt={displayName} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-stone-950/0 group-hover:bg-stone-950/40 transition-all flex items-center justify-center">
                <ImageIcon
                  size={18}
                  className="sm:w-5 sm:h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                />
              </div>
            </button>
            <div className="flex-1 min-w-0">
              <h2 className="text-base sm:text-lg md:text-xl font-light tracking-wide text-stone-950 mb-1 sm:mb-2 truncate">
                {displayName}
              </h2>
              <p className="text-[10px] sm:text-xs font-light text-stone-600">Your curated AI photo collection</p>
            </div>
          </div>

          <div className="flex gap-2 mb-4 pb-4 border-b border-stone-200/40">
            {[
              { key: "all", label: "All Content" },
              { key: "photos", label: "Photos" },
              { key: "videos", label: "Videos" },
            ].map((filter) => (
              <button
                key={filter.key}
                onClick={() => setContentFilter(filter.key as "all" | "photos" | "videos")}
                className={`px-3 sm:px-4 py-2 text-[10px] sm:text-xs tracking-[0.15em] uppercase font-light border border-stone-200/40 rounded-full transition-all duration-200 whitespace-nowrap flex-shrink-0 min-h-[36px] sm:min-h-[40px] ${
                  contentFilter === filter.key ? "bg-stone-950 text-white" : "bg-stone-50 hover:bg-stone-100"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
            {[
              { key: "all", label: "All" },
              { key: "favorited", label: "Favorited" },
              { key: "feed-design", label: "Feed Design" },
              { key: "close-up", label: "Close-Up" },
              { key: "full-scenery", label: "Scenery" },
              { key: "flatlay", label: "Flatlay" },
            ].map((category) => (
              <button
                key={category.key}
                onClick={() => setSelectedCategory(category.key)}
                className={`px-3 sm:px-4 py-2 text-[10px] sm:text-xs tracking-[0.15em] uppercase font-light border border-stone-200/40 rounded-full transition-all duration-200 whitespace-nowrap flex-shrink-0 min-h-[36px] sm:min-h-[40px] ${
                  selectedCategory === category.key ? "bg-stone-950 text-white" : "bg-stone-50 hover:bg-stone-100"
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>
        </div>

        {displayImages.length > 0 || displayVideos.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
            {/* Photos */}
            {displayImages.map((image) => (
              <button
                key={`img-${image.id}`}
                onClick={() => setLightboxImage(image)}
                className="aspect-square relative group overflow-hidden bg-stone-200/30"
              >
                <img
                  src={image.image_url || "/placeholder.svg"}
                  alt={image.prompt || `Gallery ${image.id}`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-stone-950/0 group-hover:bg-stone-950/30 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="flex items-center gap-4 text-stone-50">
                    <div className="flex items-center gap-1">
                      <Heart size={16} fill="currentColor" strokeWidth={1.5} />
                    </div>
                  </div>
                </div>
              </button>
            ))}

            {/* Videos */}
            {displayVideos.map((video) => (
              <button
                key={`vid-${video.id}`}
                onClick={() => setPreviewVideo(video)}
                className="aspect-square relative group overflow-hidden bg-stone-200/30"
              >
                <video src={video.video_url} className="w-full h-full object-cover" muted playsInline />
                <div className="absolute inset-0 bg-stone-950/40 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                    <Play size={20} className="text-stone-950 ml-1" fill="currentColor" />
                  </div>
                </div>
                <div className="absolute top-2 right-2">
                  <Video size={16} className="text-white drop-shadow-lg" />
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="bg-stone-100/40 rounded-3xl p-12 text-center border border-stone-200/40">
            <Heart size={48} className="mx-auto mb-6 text-stone-400" strokeWidth={1.5} />
            <h3 className="text-xl font-serif font-extralight tracking-[0.15em] text-stone-950 uppercase mb-3">
              {contentFilter === "videos" ? "No Videos Yet" : "No Images Yet"}
            </h3>
            <p className="text-sm font-light text-stone-600 mb-6">
              {contentFilter === "videos"
                ? "Animate your photos in Maya to create videos"
                : "Generate your first AI image in the Studio to get started"}
            </p>
          </div>
        )}

        {/* InstagramPhotoPreview */}
        {lightboxImage && (
          <InstagramPhotoPreview
            image={lightboxImage}
            images={displayImages}
            onClose={() => setLightboxImage(null)}
            onFavorite={(imageId, newState) => toggleFavorite(imageId, !newState)}
            onDelete={deleteImage}
            isFavorited={lightboxImage.is_favorite || favorites.has(lightboxImage.id)}
            userName={displayName}
            userAvatar={profileImage}
          />
        )}

        {/* InstagramReelPreview */}
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
      </div>
    )
  }

  // All Images view
  return (
    <div className="space-y-4 sm:space-y-6 pb-24">
      <div className="pt-3 sm:pt-4">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-serif font-extralight tracking-[0.2em] sm:tracking-[0.3em] text-stone-950 uppercase">
            All Images
          </h1>
          <button
            onClick={() => setGalleryView("instagram")}
            className="px-3 sm:px-4 py-2 text-[10px] sm:text-xs tracking-[0.15em] uppercase font-light bg-stone-100/50 border border-stone-200/40 rounded-lg sm:rounded-xl hover:bg-stone-100/70 transition-all duration-200 min-h-[36px] sm:min-h-[40px]"
          >
            Instagram Feed
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        {[
          { key: "all", label: "Total", value: allImages.length + allVideos.length, icon: Grid },
          { key: "favorited", label: "Favorited", value: favoritedImages.length, icon: Heart },
          {
            key: "feed-design",
            label: "Feed Design",
            value: allImages.filter((i) => categorizeImage(i) === "feed-design").length,
            icon: Grid,
          },
          {
            key: "close-up",
            label: "Close-Up",
            value: allImages.filter((i) => categorizeImage(i) === "close-up").length,
            icon: Camera,
          },
          {
            key: "full-scenery",
            label: "Scenery",
            value: allImages.filter((i) => categorizeImage(i) === "full-scenery").length,
            icon: Camera,
          },
        ].map((stat) => (
          <button
            key={stat.key}
            onClick={() => setSelectedCategory(stat.key)}
            className={`group bg-white/50 backdrop-blur-2xl border rounded-xl sm:rounded-[1.5rem] p-3 sm:p-4 text-center shadow-xl shadow-stone-950/10 hover:shadow-2xl hover:shadow-stone-950/20 hover:scale-105 transition-all duration-300 min-h-[100px] sm:min-h-[120px] ${
              selectedCategory === stat.key ? "border-stone-950 ring-2 ring-stone-950" : "border-white/60"
            }`}
          >
            <div className="w-9 h-9 sm:w-11 sm:h-11 bg-stone-950 rounded-lg sm:rounded-[1rem] flex items-center justify-center mx-auto mb-2 sm:mb-3 shadow-lg group-hover:scale-110 transition-transform duration-300">
              <stat.icon size={16} className="sm:w-[18px] sm:h-[18px]" strokeWidth={2.5} className="text-white" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-stone-950 mb-1">{stat.value}</div>
            <div className="text-[9px] sm:text-[10px] tracking-wider uppercase font-semibold text-stone-500">
              {stat.label}
            </div>
          </button>
        ))}
      </div>

      {filteredImages.length === 0 && displayVideos.length === 0 ? (
        <div className="bg-stone-100/40 rounded-3xl p-12 text-center border border-stone-200/40">
          <Camera size={48} className="mx-auto mb-6 text-stone-400" strokeWidth={1.5} />
          <h3 className="text-xl font-serif font-extralight tracking-[0.15em] text-stone-950 uppercase mb-3">
            No Images in This Category
          </h3>
          <p className="text-sm font-light text-stone-600 mb-6">Try selecting a different category</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          {filteredImages.map((image) => {
            const isFavorited = image.is_favorite || favorites.has(image.id)

            return (
              <button
                key={`img-${image.id}`}
                onClick={() => setLightboxImage(image)}
                className="relative group text-left"
              >
                <div className="aspect-square overflow-hidden rounded-xl sm:rounded-2xl border border-stone-200/40 bg-stone-200/30">
                  <img
                    src={image.image_url || "/placeholder.svg"}
                    alt={image.prompt || `Image ${image.id}`}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleFavorite(image.id, isFavorited)
                  }}
                  className={`absolute top-2 sm:top-3 right-2 sm:right-3 p-2 sm:p-2.5 rounded-full backdrop-blur-xl transition-all duration-200 shadow-lg min-w-[40px] min-h-[40px] sm:min-w-[44px] sm:min-h-[44px] flex items-center justify-center ${
                    isFavorited
                      ? "bg-stone-950/80 text-stone-50"
                      : "bg-white/70 text-stone-950 hover:bg-white transition-colors shadow-lg border border-white"
                  }`}
                >
                  <Heart
                    size={16}
                    className="sm:w-[18px] sm:h-[18px]"
                    strokeWidth={1.8}
                    fill={isFavorited ? "currentColor" : "none"}
                  />
                </button>

                <div className="absolute inset-0 bg-stone-950/0 group-hover:bg-stone-950/40 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100 rounded-xl sm:rounded-2xl">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        const a = document.createElement("a")
                        a.href = image.image_url
                        a.download = `sselfie-${image.id}.png`
                        a.target = "_blank"
                        document.body.appendChild(a)
                        a.click()
                        document.body.removeChild(a)
                      }}
                      className="p-2.5 sm:p-3 bg-white/90 backdrop-blur-xl rounded-full hover:bg-white transition-colors shadow-lg border border-white text-stone-950 min-w-[44px] min-h-[44px] flex items-center justify-center"
                    >
                      <Download size={14} className="sm:w-4 sm:h-4" strokeWidth={2} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteImage(image.id)
                      }}
                      className="p-2.5 sm:p-3 bg-white/90 backdrop-blur-xl rounded-full hover:bg-white transition-colors shadow-lg border border-white text-stone-950 min-w-[44px] min-h-[44px] flex items-center justify-center"
                    >
                      <Trash2 size={14} className="sm:w-4 sm:h-4" strokeWidth={2} />
                    </button>
                  </div>
                </div>
              </button>
            )
          })}

          {displayVideos.map((video) => (
            <button key={`vid-${video.id}`} onClick={() => setPreviewVideo(video)} className="relative group text-left">
              <div className="aspect-square overflow-hidden rounded-xl sm:rounded-2xl border border-stone-200/40 bg-stone-200/30">
                <video src={video.video_url} className="w-full h-full object-cover" muted playsInline />
              </div>

              <div className="absolute top-2 right-2">
                <Video size={16} className="text-white drop-shadow-lg" />
              </div>

              <div className="absolute inset-0 bg-stone-950/40 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                  <Play size={20} className="text-stone-950 ml-1" fill="currentColor" />
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation()
                  deleteVideo(video.id)
                }}
                className="absolute top-2 sm:top-3 left-2 sm:left-3 p-2 sm:p-2.5 rounded-full backdrop-blur-xl transition-all duration-200 shadow-lg min-w-[40px] min-h-[40px] sm:min-w-[44px] sm:min-h-[44px] flex items-center justify-center bg-white/70 text-stone-950 hover:bg-white transition-colors shadow-lg border border-white"
              >
                <Trash2 size={14} className="sm:w-4 sm:h-4" strokeWidth={2} />
              </button>
            </button>
          ))}
        </div>
      )}

      {/* InstagramPhotoPreview */}
      {lightboxImage && (
        <InstagramPhotoPreview
          image={lightboxImage}
          images={displayImages}
          onClose={() => setLightboxImage(null)}
          onFavorite={(imageId, newState) => toggleFavorite(imageId, !newState)}
          onDelete={deleteImage}
          isFavorited={lightboxImage.is_favorite || favorites.has(lightboxImage.id)}
          userName={user.name || user.email?.split("@")[0] || "User"}
          userAvatar={profileImage}
        />
      )}

      {/* InstagramReelPreview */}
      {previewVideo && (
        <InstagramReelPreview
          video={previewVideo}
          videos={displayVideos}
          onClose={() => setPreviewVideo(null)}
          onDelete={deleteVideo}
          userName={user.name || user.email?.split("@")[0] || "User"}
          userAvatar={profileImage}
        />
      )}
    </div>
  )
}
