"use client"

import { useState, useMemo, useEffect, useRef, useCallback } from "react"
import useSWR from "swr"
import useSWRInfinite from "swr/infinite"
import UnifiedLoading from "../unified-loading"
import InstagramPhotoCard from "../instagram-photo-card"
import InstagramReelCard from "../instagram-reel-card"
import BuyCreditsModal from "../buy-credits-modal"
import { DesignClasses } from "@/lib/design-tokens"

interface MayaVideosTabProps {
  user: any
  creditBalance: number
  onCreditsUpdate: (balance: number) => void
  sharedImages?: Array<{
    url: string
    id: string
    prompt?: string
    description?: string
    category?: string
  }>
}

interface BRollImage {
  id: string
  image_url: string
  prompt: string
  description: string | null
  category: string | null
  subcategory: string | null
  created_at: string
}

interface GeneratedVideo {
  id: number
  image_id: number | null
  video_url: string
  motion_prompt: string | null
  status: string
  progress: number
  created_at: string
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

/**
 * Maya Videos Tab Component
 * 
 * Extracted from B-Roll screen to work as a tab in the unified Maya experience.
 * Handles video generation from images with polling, progress tracking, and error handling.
 * 
 * **Features:**
 * - Infinite scroll image grid
 * - Video generation with motion prompt analysis
 * - Real-time progress tracking
 * - Video polling until completion
 * - Error handling and retry
 * - Shared images from Photos tab (displayed at top)
 * 
 * **Removed Dependencies:**
 * - Header/navigation menu (handled by Maya header)
 * - handleNavigation/handleLogout (not needed in tab context)
 * - showNavMenu state (not needed)
 */
export default function MayaVideosTab({
  user,
  creditBalance,
  onCreditsUpdate,
  sharedImages = [],
}: MayaVideosTabProps) {
  const [generatingVideos, setGeneratingVideos] = useState<Set<string>>(new Set())
  const [analyzingMotion, setAnalyzingMotion] = useState<Set<string>>(new Set())
  const [videoErrors, setVideoErrors] = useState<Map<string, string>>(new Map())
  const [videoPredictions, setVideoPredictions] = useState<Map<string, { predictionId: string; videoId: string }>>(
    new Map(),
  )
  const [videoProgress, setVideoProgress] = useState<Map<string, number>>(new Map())
  const [previewVideo, setPreviewVideo] = useState<GeneratedVideo | null>(null)
  const [showBuyCreditsModal, setShowBuyCreditsModal] = useState(false)
  
  // Use ref to track polling intervals so they persist across re-renders
  const pollIntervalsRef = useRef<Map<string, NodeJS.Timeout>>(new Map())

  const getKey = (pageIndex: number, previousPageData: any) => {
    if (previousPageData && !previousPageData.hasMore) return null
    const limit = 12
    const offset = pageIndex * limit
    return `/api/maya/b-roll-images?limit=${limit}&offset=${offset}`
  }

  const {
    data: imagePages,
    error: imagesError,
    isLoading: imagesLoading,
    size,
    setSize,
    isValidating,
  } = useSWRInfinite(getKey, fetcher, {
    refreshInterval: 0,
    revalidateOnFocus: false,
  })

  const apiImages: BRollImage[] = imagePages ? imagePages.flatMap((page) => page.images || []) : []
  
  // Merge shared images with API images, deduplicate by image_url
  const allImages: Array<BRollImage | { id: string; image_url: string; prompt: string; description: string | null; category: string | null; subcategory: string | null; created_at: string; isShared?: boolean }> = useMemo(() => {
    const imageUrlSet = new Set<string>()
    const merged: Array<any> = []
    
    // Add shared images first (prioritized)
    sharedImages.forEach((shared) => {
      if (!imageUrlSet.has(shared.url)) {
        imageUrlSet.add(shared.url)
        merged.push({
          id: shared.id,
          image_url: shared.url,
          prompt: shared.prompt || "",
          description: shared.description || null,
          category: shared.category || null,
          subcategory: null,
          created_at: new Date().toISOString(),
          isShared: true,
        })
      }
    })
    
    // Add API images (deduplicated)
    apiImages.forEach((image) => {
      if (!imageUrlSet.has(image.image_url)) {
        imageUrlSet.add(image.image_url)
        merged.push(image)
      }
    })
    
    return merged
  }, [sharedImages, apiImages])
  
  const hasMore = imagePages?.[imagePages.length - 1]?.hasMore ?? false
  const isLoadingMore = isValidating && imagePages && imagePages.length > 0

  const { data: videosData, mutate: mutateVideos } = useSWR("/api/maya/videos", fetcher, {
    refreshInterval: 5000,
    revalidateOnFocus: true,
    revalidateOnMount: true,
    dedupingInterval: 2000,
  })

  const allVideos: GeneratedVideo[] = videosData?.videos || []

  // Create a map of videos by image_id for efficient lookup
  const videosByImageId = useMemo(() => {
    const map = new Map<string, GeneratedVideo>()
    allVideos.forEach((video) => {
      if (video.image_id != null && video.status === "completed" && video.video_url) {
        const key = String(video.image_id)
        map.set(key, video)
      }
    })
    return map
  }, [allVideos])

  const handleAnimate = async (
    imageId: string,
    imageUrl: string,
    description: string,
    fluxPrompt: string,
    category: string,
  ) => {
    setAnalyzingMotion((prev) => new Set(prev).add(imageId))
    setVideoErrors((prev) => {
      const newErrors = new Map(prev)
      newErrors.delete(imageId)
      return newErrors
    })

    try {
      console.log("[MayaVideosTab] Generating intelligent motion prompt for image:", imageId)

      const motionResponse = await fetch("/api/maya/generate-motion-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          fluxPrompt,
          description,
          category,
          imageUrl,
        }),
      })

      if (!motionResponse.ok) {
        throw new Error("Failed to generate motion prompt")
      }

      const { motionPrompt } = await motionResponse.json()
      console.log("[MayaVideosTab] Received intelligent motion prompt:", motionPrompt)

      setAnalyzingMotion((prev) => {
        const newSet = new Set(prev)
        newSet.delete(imageId)
        return newSet
      })
      setGeneratingVideos((prev) => new Set(prev).add(imageId))

      const response = await fetch("/api/maya/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          imageUrl,
          imageId,
          motionPrompt,
          imageDescription: description,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 402) {
          setGeneratingVideos((prev) => {
            const newSet = new Set(prev)
            newSet.delete(imageId)
            return newSet
          })
          setShowBuyCreditsModal(true)
          return
        }
        setGeneratingVideos((prev) => {
          const newSet = new Set(prev)
          newSet.delete(imageId)
          return newSet
        })
        throw new Error(data.error || "Failed to generate video")
      }

      setVideoPredictions((prev) => {
        const newPredictions = new Map(prev)
        newPredictions.set(imageId, {
          predictionId: data.predictionId,
          videoId: data.videoId.toString(),
        })
        return newPredictions
      })
    } catch (err) {
      console.error("[MayaVideosTab] Error generating video:", err)
      const errorMessage = err instanceof Error ? err.message : "Failed to generate video"
      
      if (errorMessage.toLowerCase().includes("insufficient credits") || 
          errorMessage.toLowerCase().includes("insufficient credit")) {
        setShowBuyCreditsModal(true)
        setAnalyzingMotion((prev) => {
          const newSet = new Set(prev)
          newSet.delete(imageId)
          return newSet
        })
        setGeneratingVideos((prev) => {
          const newSet = new Set(prev)
          newSet.delete(imageId)
          return newSet
        })
        return
      }
      
      setVideoErrors((prev) => {
        const newErrors = new Map(prev)
        newErrors.set(imageId, errorMessage)
        return newErrors
      })
      setAnalyzingMotion((prev) => {
        const newSet = new Set(prev)
        newSet.delete(imageId)
        return newSet
      })
      setGeneratingVideos((prev) => {
        const newSet = new Set(prev)
        newSet.delete(imageId)
        return newSet
      })
    }
  }

  // Poll for video status using useEffect with refs to persist intervals
  useEffect(() => {
    // Clean up intervals for predictions that no longer exist
    const currentImageIds = new Set(videoPredictions.keys())
    pollIntervalsRef.current.forEach((interval, imageId) => {
      if (!currentImageIds.has(imageId)) {
        console.log("[MayaVideosTab] Cleaning up polling for removed image:", imageId)
        clearInterval(interval)
        pollIntervalsRef.current.delete(imageId)
      }
    })

    // Start polling for new predictions
    videoPredictions.forEach((prediction, imageId) => {
      // Skip if already polling
      if (pollIntervalsRef.current.has(imageId)) {
        return
      }

      const { predictionId, videoId } = prediction

      console.log("[MayaVideosTab] Starting polling for image:", imageId, "videoId:", videoId, "predictionId:", predictionId)

      const pollInterval = setInterval(async () => {
        try {
          const response = await fetch(`/api/maya/check-video?predictionId=${predictionId}&videoId=${videoId}`)
          const data = await response.json()

          // Update progress
          if (data.progress !== undefined) {
            setVideoProgress((prev) => {
              const newProgress = new Map(prev)
              newProgress.set(imageId, data.progress)
              return newProgress
            })
          }

          if (data.status === "succeeded") {
            console.log("[MayaVideosTab] ✅ Video generation succeeded for image:", imageId)

            // Clear interval first to prevent duplicate calls
            if (pollIntervalsRef.current.has(imageId)) {
              clearInterval(pollIntervalsRef.current.get(imageId)!)
              pollIntervalsRef.current.delete(imageId)
            }

            // Refresh video list from database
            await mutateVideos(undefined, { revalidate: true })

            // Wait a bit for database to update
            await new Promise((resolve) => setTimeout(resolve, 1000))

            // Clear generating state
            setGeneratingVideos((prev) => {
              const newSet = new Set(prev)
              newSet.delete(imageId)
              return newSet
            })
            setVideoPredictions((prev) => {
              const newPredictions = new Map(prev)
              newPredictions.delete(imageId)
              return newPredictions
            })
            setVideoProgress((prev) => {
              const newProgress = new Map(prev)
              newProgress.delete(imageId)
              return newProgress
            })
          } else if (data.status === "failed") {
            console.log("[MayaVideosTab] ❌ Video generation failed for image:", imageId, "Error:", data.error)
            
            // Clear interval
            if (pollIntervalsRef.current.has(imageId)) {
              clearInterval(pollIntervalsRef.current.get(imageId)!)
              pollIntervalsRef.current.delete(imageId)
            }

            setVideoErrors((prev) => {
              const newErrors = new Map(prev)
              newErrors.set(imageId, data.error || "Video generation failed")
              return newErrors
            })
            setGeneratingVideos((prev) => {
              const newSet = new Set(prev)
              newSet.delete(imageId)
              return newSet
            })
            setVideoPredictions((prev) => {
              const newPredictions = new Map(prev)
              newPredictions.delete(imageId)
              return newPredictions
            })
            setVideoProgress((prev) => {
              const newProgress = new Map(prev)
              newProgress.delete(imageId)
              return newProgress
            })
          }
        } catch (err) {
          console.error("[MayaVideosTab] Error polling video status for image", imageId, ":", err)
        }
      }, 5000) // Poll every 5 seconds

      pollIntervalsRef.current.set(imageId, pollInterval)
    })

    // Cleanup function - only clear on unmount
    return () => {
      if (videoPredictions.size === 0) {
        pollIntervalsRef.current.forEach((interval) => clearInterval(interval))
        pollIntervalsRef.current.clear()
      }
    }
  }, [videoPredictions, mutateVideos])

  const handleFavoriteToggle = async (imageId: string, isFavorite: boolean) => {
    try {
      await fetch("/api/images/favorite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageId: `ai_${imageId}`,
          isFavorite: !isFavorite,
        }),
      })
    } catch (error) {
      console.error("[MayaVideosTab] Error toggling favorite:", error)
    }
  }

  const handleDelete = async (imageId: string) => {
    if (!confirm("Are you sure you want to delete this image?")) {
      return
    }

    try {
      await fetch("/api/images/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId }),
      })
    } catch (error) {
      console.error("[MayaVideosTab] Error deleting image:", error)
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
      setPreviewVideo(null)
    } catch (error) {
      console.error("[MayaVideosTab] Error deleting video:", error)
      alert("Failed to delete video. Please try again.")
    }
  }

  if (imagesLoading) {
    return (
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <UnifiedLoading variant="screen" message="Loading images..." />
        </div>
      </div>
    )
  }

  if (imagesError) {
    return (
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center space-y-4">
              <p className="text-sm font-light text-red-600">Failed to load images</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 text-xs tracking-[0.15em] uppercase font-light bg-stone-100/50 border border-stone-200/40 rounded-xl hover:bg-stone-100/70 transition-all duration-200"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Info Section */}
        <div className={`bg-stone-100/40 ${DesignClasses.radius.lg} ${DesignClasses.spacing.padding.md} ${DesignClasses.border.stone}`}>
          <div className="mb-4">
            <p className="text-xs sm:text-sm font-light text-stone-600 text-center">
              Create professional video content from your Maya-generated images. Click any image to animate it into a
              stunning video reel.
            </p>
          </div>
        </div>

        {/* Shared Images Section (if any) */}
        {sharedImages.length > 0 && (
          <div>
            <h3 className="text-sm font-serif font-extralight tracking-[0.2em] uppercase text-stone-950 mb-4">
              From Photos Tab
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6 mb-8">
              {sharedImages.map((shared) => {
                const imageId = shared.id
                const isGenerating = generatingVideos.has(imageId) || analyzingMotion.has(imageId)
                const error = videoErrors.get(imageId)
                const progress = videoProgress.get(imageId)
                const imageIdKey = String(imageId)
                const video = videosByImageId.get(imageIdKey)

                return (
                  <div key={imageId} className="space-y-3">
                    <InstagramPhotoCard
                      concept={{
                        title: shared.category || "Untitled",
                        description: shared.description || shared.prompt || "Lifestyle photoshoot",
                        category: shared.category || "lifestyle",
                        prompt: shared.prompt || "",
                      }}
                      imageUrl={shared.url}
                      imageId={imageId}
                      isGenerating={isGenerating}
                      onFavoriteToggle={() => handleFavoriteToggle(imageId, false)}
                      onDelete={() => handleDelete(imageId)}
                      onAnimate={() =>
                        handleAnimate(imageId, shared.url, shared.description || shared.prompt || "", shared.prompt || "", shared.category || "")
                      }
                      isFavorite={false}
                      showAnimateOverlay={true}
                      generationStatus={
                        isGenerating
                          ? analyzingMotion.has(imageId)
                            ? "Analyzing motion..."
                            : "Generating Video..."
                          : undefined
                      }
                      generationProgress={progress}
                    />

                    {error && (
                      <div className="mt-3 bg-red-50 border border-red-200 rounded-2xl p-4">
                        <p className="text-sm text-red-600">{error}</p>
                      </div>
                    )}

                    {video && video.video_url && !isGenerating && (
                      <div key={`video-${video.id}`} className="mt-3">
                        <InstagramReelCard
                          videoUrl={video.video_url}
                          motionPrompt={video.motion_prompt || undefined}
                          onDelete={video.id ? () => deleteVideo(video.id) : undefined}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* All Images Section */}
        {allImages.length === 0 ? (
          <div className={`bg-stone-100/40 ${DesignClasses.radius.xl} ${DesignClasses.spacing.padding.xl} text-center ${DesignClasses.border.stone}`}>
            <div className="max-w-md mx-auto space-y-4">
              <h3 className="text-xl font-serif font-extralight tracking-[0.15em] text-stone-950 uppercase mb-3">
                No Images Yet
              </h3>
              <p className="text-sm font-light text-stone-600 mb-6">
                Start creating images with Maya to build your video library. Ask Maya to generate lifestyle content,
                product shots, or any visual assets you need.
              </p>
            </div>
          </div>
        ) : (
          <>
            {sharedImages.length > 0 && (
              <div>
                <h3 className="text-sm font-serif font-extralight tracking-[0.2em] uppercase text-stone-950 mb-4">
                  All Images
                </h3>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
              {allImages.map((image) => {
                const imageId = image.id
                const isGenerating = generatingVideos.has(imageId) || analyzingMotion.has(imageId)
                const error = videoErrors.get(imageId)
                const progress = videoProgress.get(imageId)
                const prediction = videoPredictions.get(imageId)
                const imageIdKey = String(imageId)
                const video = videosByImageId.get(imageIdKey)

                return (
                  <div key={imageId} className="space-y-3">
                    <InstagramPhotoCard
                      concept={{
                        title: image.category || "Untitled",
                        description: image.prompt || "Lifestyle photoshoot",
                        category: image.category || "lifestyle",
                        prompt: image.prompt || "",
                      }}
                      imageUrl={image.image_url}
                      imageId={String(imageId)}
                      isGenerating={isGenerating}
                      onFavoriteToggle={() => handleFavoriteToggle(imageId, false)}
                      onDelete={() => handleDelete(imageId)}
                      onAnimate={() =>
                        handleAnimate(imageId, image.image_url, image.description || image.prompt, image.prompt, image.category || "")
                      }
                      isFavorite={false}
                      showAnimateOverlay={true}
                      generationStatus={
                        isGenerating
                          ? analyzingMotion.has(imageId)
                            ? "Analyzing motion..."
                            : "Generating Video..."
                          : undefined
                      }
                      generationProgress={progress}
                    />

                    {error && (
                      <div className="mt-3 bg-red-50 border border-red-200 rounded-2xl p-4">
                        <p className="text-sm text-red-600">{error}</p>
                      </div>
                    )}

                    {video && video.video_url && !isGenerating && (
                      <div key={`video-${video.id}`} className="mt-3">
                        <InstagramReelCard
                          videoUrl={video.video_url}
                          motionPrompt={video.motion_prompt || undefined}
                          onDelete={video.id ? () => deleteVideo(video.id) : undefined}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {hasMore && (
              <div className="flex justify-center pt-8">
                {isLoadingMore ? (
                  <UnifiedLoading variant="inline" message="Loading more..." />
                ) : (
                  <button
                    onClick={() => setSize(size + 1)}
                    className="px-8 py-3 text-xs tracking-[0.15em] uppercase font-light bg-stone-950 text-white rounded-xl hover:bg-stone-800 transition-all duration-200 touch-manipulation active:scale-95"
                  >
                    Load More Images
                  </button>
                )}
              </div>
            )}
          </>
        )}

        <BuyCreditsModal
          open={showBuyCreditsModal}
          onOpenChange={setShowBuyCreditsModal}
          onSuccess={() => {
            setShowBuyCreditsModal(false)
            // Refresh credit balance after purchase (with retry for webhook delay)
            const refreshCredits = async (retries = 3, delay = 1000) => {
              for (let i = 0; i < retries; i++) {
                try {
                  const res = await fetch("/api/user/credits")
                  const data = await res.json()
                  if (data.balance !== undefined) {
                    onCreditsUpdate(data.balance)
                    return
                  }
                } catch (err) {
                  console.error("[MayaVideosTab] Error refreshing credits (attempt", i + 1, "):", err)
                }
                if (i < retries - 1) {
                  await new Promise((resolve) => setTimeout(resolve, delay))
                }
              }
            }
            refreshCredits()
          }}
        />
      </div>
    </div>
  )
}

