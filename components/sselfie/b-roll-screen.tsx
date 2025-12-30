"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import useSWR from "swr"
import useSWRInfinite from "swr/infinite"
import {
  X,
  Home,
  Aperture,
  MessageCircle,
  ImageIcon,
  Grid,
  UserIcon,
  SettingsIcon,
  LogOut,
  Film,
} from "lucide-react"
import UnifiedLoading from "./unified-loading"
import InstagramPhotoCard from "./instagram-photo-card"
import InstagramReelCard from "./instagram-reel-card"
import { useRouter } from "next/navigation"
import BuyCreditsModal from "./buy-credits-modal"
import { DesignClasses } from "@/lib/design-tokens"

interface BRollScreenProps {
  user: any
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

export default function BRollScreen({ user }: BRollScreenProps) {
  const [generatingVideos, setGeneratingVideos] = useState<Set<string>>(new Set())
  const [analyzingMotion, setAnalyzingMotion] = useState<Set<string>>(new Set())
  const [videoErrors, setVideoErrors] = useState<Map<string, string>>(new Map())
  const [videoPredictions, setVideoPredictions] = useState<Map<string, { predictionId: string; videoId: string }>>(
    new Map(),
  )
  const [videoProgress, setVideoProgress] = useState<Map<string, number>>(new Map())
  const [previewVideo, setPreviewVideo] = useState<GeneratedVideo | null>(null)
  const [showNavMenu, setShowNavMenu] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [creditBalance, setCreditBalance] = useState(0)
  const [showBuyCreditsModal, setShowBuyCreditsModal] = useState(false)
  const router = useRouter()
  
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

  const images: BRollImage[] = imagePages ? imagePages.flatMap((page) => page.images || []) : []
  const hasMore = imagePages?.[imagePages.length - 1]?.hasMore ?? false
  const isLoadingMore = isValidating && imagePages && imagePages.length > 0

  const { data: videosData, mutate: mutateVideos } = useSWR("/api/maya/videos", fetcher, {
    refreshInterval: 5000,
    revalidateOnFocus: true,
    revalidateOnMount: true,
    dedupingInterval: 2000,
  })

  const { data: userData } = useSWR("/api/user", fetcher, {
    revalidateOnFocus: false,
    onSuccess: (data) => {
      if (data?.user?.credit_balance !== undefined) {
        setCreditBalance(data.user.credit_balance)
      }
    },
  })

  const allVideos: GeneratedVideo[] = videosData?.videos || []

  // Create a map of videos by image_id for efficient lookup
  // This ensures React properly detects changes and re-renders when videos update
  const videosByImageId = useMemo(() => {
    const map = new Map<string, GeneratedVideo>()
    allVideos.forEach((video) => {
      if (video.image_id != null && video.status === "completed" && video.video_url) {
        // Use string key for consistent matching
        const key = String(video.image_id)
        map.set(key, video)
      }
    })
    console.log("[v0] Videos map created:", {
      totalVideos: allVideos.length,
      mappedVideos: map.size,
      imageIds: Array.from(map.keys()),
    })
    return map
  }, [allVideos])

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
      console.log("[v0] Generating intelligent motion prompt for image:", imageId)

      console.log("[v0] 🎨 Generating AI motion prompt with vision analysis for image:", imageUrl)
      const motionResponse = await fetch("/api/maya/generate-motion-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          fluxPrompt,
          description,
          category,
          imageUrl, // ✅ CRITICAL: Pass imageUrl so Claude can analyze the actual image
        }),
      })

      if (!motionResponse.ok) {
        throw new Error("Failed to generate motion prompt")
      }

      const { motionPrompt } = await motionResponse.json()
      console.log("[v0] Received intelligent motion prompt:", motionPrompt)

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
        // Show buy credits modal for insufficient credits (only if not already generating)
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

      // Polling will start automatically via useEffect when videoPredictions changes
    } catch (err) {
      console.error("[v0] Error generating video:", err)
      const errorMessage = err instanceof Error ? err.message : "Failed to generate video"
      
      // Check if error is about insufficient credits
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
        console.log("[v0] Cleaning up polling for removed image:", imageId)
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

      console.log("[v0] Starting polling for image:", imageId, "videoId:", videoId, "predictionId:", predictionId)

      const pollInterval = setInterval(async () => {
        try {
          const response = await fetch(`/api/maya/check-video?predictionId=${predictionId}&videoId=${videoId}`)
          const data = await response.json()

          console.log("[v0] Polling response for image", imageId, ":", {
            status: data.status,
            progress: data.progress,
            videoUrl: data.videoUrl ? "YES" : "NO",
          })

          // Update progress
          if (data.progress !== undefined) {
            setVideoProgress((prev) => {
              const newProgress = new Map(prev)
              newProgress.set(imageId, data.progress)
              return newProgress
            })
          }

          if (data.status === "succeeded") {
            console.log("[v0] ✅ Video generation succeeded for image:", imageId)

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
            console.log("[v0] ❌ Video generation failed for image:", imageId, "Error:", data.error)
            
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
          } else {
            // Still processing - continue polling
            console.log("[v0] Video still processing for image", imageId, "- progress:", data.progress || 0, "%")
          }
        } catch (err) {
          console.error("[v0] Error polling video status for image", imageId, ":", err)
          // Don't stop polling on error, just log it
          // The interval will continue and retry
        }
      }, 5000) // Poll every 5 seconds

      pollIntervalsRef.current.set(imageId, pollInterval)
    })

    // Cleanup function - only clear on unmount
    return () => {
      // Only clear if component is unmounting (videoPredictions is empty)
      // Otherwise, let intervals persist
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
      console.error("[v0] Error toggling favorite:", error)
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
      console.error("[v0] Error deleting image:", error)
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
      console.error("[v0] Error deleting video:", error)
      alert("Failed to delete video. Please try again.")
    }
  }

  if (imagesLoading) {
    return (
      <div className="space-y-4 sm:space-y-6 pb-24 pt-3 sm:pt-4">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-serif font-extralight tracking-[0.2em] sm:tracking-[0.3em] text-stone-950 uppercase">
            B-Roll
          </h1>
        </div>
        <UnifiedLoading variant="screen" message="Loading B-Roll images..." />
      </div>
    )
  }

  if (imagesError) {
    return (
      <div className="space-y-4 sm:space-y-6 pb-24 pt-3 sm:pt-4">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-serif font-extralight tracking-[0.2em] sm:tracking-[0.3em] text-stone-950 uppercase">
            B-Roll
          </h1>
        </div>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <p className="text-sm font-light text-red-600">Failed to load B-roll images</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 text-xs tracking-[0.15em] uppercase font-light bg-stone-100/50 border border-stone-200/40 rounded-xl hover:bg-stone-100/70 transition-all duration-200"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6 pb-24 pt-3 sm:pt-4">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-serif font-extralight tracking-[0.2em] sm:tracking-[0.3em] text-stone-950 uppercase">
          B-Roll
        </h1>
        {/* Navigation menu now in global header */}
      </div>

      {/* Navigation menu now in global header - custom menu disabled */}
      {false && showNavMenu && (
        <>
          <div
            className="fixed inset-0 bg-stone-950/20 backdrop-blur-sm z-40 animate-in fade-in duration-200"
            onClick={() => setShowNavMenu(false)}
          />

          <div className={`fixed top-0 right-0 bottom-0 w-80 ${DesignClasses.background.overlay} ${DesignClasses.blur.lg} border-l ${DesignClasses.border.stone} ${DesignClasses.shadows.container} z-50 animate-in slide-in-from-right duration-300 flex flex-col`}>
            <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-stone-200/50">
              <h3 className="text-sm font-serif font-extralight tracking-[0.2em] uppercase text-stone-950">Menu</h3>
              <button
                onClick={() => setShowNavMenu(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-stone-100 transition-colors"
                aria-label="Close menu"
              >
                <X size={18} className="text-stone-600" strokeWidth={2} />
              </button>
            </div>

            <div className="shrink-0 px-6 py-6 border-b border-stone-200/50">
              <div className="text-[10px] tracking-[0.15em] uppercase font-light text-stone-500 mb-2">Your Credits</div>
              <div className="text-3xl font-serif font-extralight text-stone-950 tabular-nums">
                {creditBalance.toFixed(1)}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 py-2">
              <button
                onClick={() => handleNavigation("studio")}
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
                className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-stone-50 transition-colors touch-manipulation"
              >
                <ImageIcon size={18} className="text-stone-600" strokeWidth={2} />
                <span className="text-sm font-medium text-stone-700">Gallery</span>
              </button>
              <button
                onClick={() => handleNavigation("b-roll")}
                className="w-full flex items-center gap-3 px-6 py-4 text-left bg-stone-100/50 border-l-2 border-stone-950"
              >
                <Film size={18} className="text-stone-950" strokeWidth={2} />
                <span className="text-sm font-medium text-stone-950">B-roll</span>
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
            </div>

            <div className="shrink-0 px-6 py-4 border-t border-stone-200/50 bg-white/95">
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

      <div className={`bg-stone-100/40 ${DesignClasses.radius.lg} ${DesignClasses.spacing.padding.md} ${DesignClasses.border.stone}`}>
        <div className="mb-4">
          <p className="text-xs sm:text-sm font-light text-stone-600 text-center">
            Create professional video content from your Maya-generated images. Click any image to animate it into a
            stunning video reel.
          </p>
        </div>
      </div>

      {images.length === 0 ? (
        <div className={`bg-stone-100/40 ${DesignClasses.radius.xl} ${DesignClasses.spacing.padding.xl} text-center ${DesignClasses.border.stone}`}>
          <div className="max-w-md mx-auto space-y-4">
            <h3 className="text-xl font-serif font-extralight tracking-[0.15em] text-stone-950 uppercase mb-3">
              No B-Roll Images Yet
            </h3>
            <p className="text-sm font-light text-stone-600 mb-6">
              Start creating images with Maya to build your B-roll library. Ask Maya to generate lifestyle content,
              product shots, or any visual assets you need.
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
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
            {images.map((image) => {
              const isGenerating = generatingVideos.has(image.id) || analyzingMotion.has(image.id)
              const error = videoErrors.get(image.id)
              const progress = videoProgress.get(image.id)
              const prediction = videoPredictions.get(image.id)

              // Use the memoized map for efficient lookup
              const imageIdKey = String(image.id)
              const video = videosByImageId.get(imageIdKey)

              // Only log when video state changes or for debugging
              if (process.env.NODE_ENV === "development" && video) {
                console.log("[v0] ✅ Video found for image:", image.id, "Video ID:", video.id)
              }

              return (
                <div key={image.id} className="space-y-3">
                  <InstagramPhotoCard
                    concept={{
                      title: image.category || "Untitled",
                      description: image.prompt || "Lifestyle photoshoot",
                      category: image.category || "lifestyle",
                      prompt: image.prompt || "",
                    }}
                    imageUrl={image.image_url}
                    imageId={String(image.id)}
                    isGenerating={isGenerating}
                    onFavoriteToggle={() => handleFavoriteToggle(image.id, false)}
                    onDelete={() => handleDelete(image.id)}
                    onAnimate={() =>
                      handleAnimate(image.id, image.image_url, image.prompt, image.prompt, image.category || "")
                    }
                    isFavorite={false}
                    showAnimateOverlay={true}
                    generationStatus={
                      isGenerating
                        ? analyzingMotion.has(image.id)
                          ? "Analyzing motion..."
                          : "Generating Video..."
                        : undefined
                    }
                    generationProgress={progress}
                  />

                  {/* Show error if generation failed */}
                  {error && (
                    <div className="mt-3 bg-red-50 border border-red-200 rounded-2xl p-4">
                      <p className="text-sm text-red-600">{error}</p>
                    </div>
                  )}

                  {/* Show video when ready */}
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
                  setCreditBalance(data.balance)
                  return // Success, exit retry loop
                }
              } catch (err) {
                console.error("[v0] Error refreshing credits (attempt", i + 1, "):", err)
              }
              // Wait before retry (webhook might need time to process)
              if (i < retries - 1) {
                await new Promise((resolve) => setTimeout(resolve, delay))
              }
            }
          }
          refreshCredits()
        }}
      />
    </div>
  )
}
