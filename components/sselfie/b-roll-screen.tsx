"use client"

import { useState } from "react"
import useSWR from "swr"
import useSWRInfinite from "swr/infinite"
import { Loader2, X, Home, Aperture, MessageCircle, ImageIcon, Grid, UserIcon, SettingsIcon, LogOut, Film } from 'lucide-react'
import InstagramPhotoCard from "./instagram-photo-card"
import InstagramReelCard from "./instagram-reel-card"
import { InstagramReelPreview } from "./instagram-reel-preview"
import { useRouter } from 'next/navigation'

interface BRollScreenProps {
  user: any
  userId: string
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

export default function BRollScreen({ user, userId }: BRollScreenProps) {
  const [generatingVideos, setGeneratingVideos] = useState<Set<string>>(new Set())
  const [analyzingMotion, setAnalyzingMotion] = useState<Set<string>>(new Set())
  const [videoErrors, setVideoErrors] = useState<Map<string, string>>(new Map())
  const [videoPredictions, setVideoPredictions] = useState<Map<string, { predictionId: string; videoId: string }>>(
    new Map(),
  )
  const [previewVideo, setPreviewVideo] = useState<GeneratedVideo | null>(null)
  const [showNavMenu, setShowNavMenu] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [creditBalance, setCreditBalance] = useState(0)
  const router = useRouter()

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
    isValidating
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
    }
  })

  const allVideos: GeneratedVideo[] = videosData?.videos || []

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

  const handleAnimate = async (imageId: string, imageUrl: string, description: string, fluxPrompt: string, category: string) => {
    setAnalyzingMotion((prev) => new Set(prev).add(imageId))
    setVideoErrors((prev) => {
      const newErrors = new Map(prev)
      newErrors.delete(imageId)
      return newErrors
    })

    try {
      console.log("[v0] Generating intelligent motion prompt for image:", imageId)
      
      const motionResponse = await fetch("/api/maya/generate-motion-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          fluxPrompt,
          description,
          category,
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

      pollVideoStatus(imageId, data.predictionId, data.videoId.toString())
    } catch (err) {
      console.error("[v0] Error generating video:", err)
      setVideoErrors((prev) => {
        const newErrors = new Map(prev)
        newErrors.set(imageId, err instanceof Error ? err.message : "Failed to generate video")
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

  const pollVideoStatus = async (imageId: string, predictionId: string, videoId: string) => {
    const maxAttempts = 60 // 5 minutes max
    let attempts = 0

    const poll = async () => {
      try {
        console.log("[v0] ========== POLLING VIDEO STATUS ==========")
        console.log("[v0] Image ID:", imageId)
        console.log("[v0] Prediction ID:", predictionId)
        console.log("[v0] Video ID:", videoId)
        console.log("[v0] Attempt:", attempts + 1, "of", maxAttempts)
        
        const response = await fetch(`/api/maya/check-video?predictionId=${predictionId}&videoId=${videoId}`)
        const data = await response.json()

        console.log("[v0] ✅ Polling response:", {
          status: data.status,
          videoUrl: data.videoUrl ? `${data.videoUrl.substring(0, 50)}...` : 'null',
          progress: data.progress,
        })

        if (data.status === "succeeded") {
          console.log("[v0] ========== VIDEO GENERATION SUCCEEDED ==========")
          console.log("[v0] Video URL received:", data.videoUrl ? 'YES' : 'NO')
          
          console.log("[v0] Calling mutateVideos() to refresh video list from database...")
          await mutateVideos()
          console.log("[v0] ✅ mutateVideos() completed - video should now appear from DB")
          console.log("[v0] Clearing generating state for imageId:", imageId)
          console.log("[v0] ================================================")
          
          setGeneratingVideos((prev) => {
            const newSet = new Set(prev)
            newSet.delete(imageId)
            console.log("[v0] Cleared generating state. Remaining generating:", Array.from(newSet))
            return newSet
          })
          setVideoPredictions((prev) => {
            const newPredictions = new Map(prev)
            newPredictions.delete(imageId)
            return newPredictions
          })
          return
        } else if (data.status === "failed") {
          console.log("[v0] ========== VIDEO GENERATION FAILED ==========")
          console.log("[v0] Error:", data.error)
          console.log("[v0] ================================================")
          throw new Error(data.error || "Video generation failed")
        }

        attempts++
        console.log("[v0] Still processing... Will poll again in 5 seconds")
        console.log("[v0] ================================================")
        
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000)
        } else {
          throw new Error("Video generation timed out")
        }
      } catch (err) {
        console.error("[v0] ========== VIDEO POLLING ERROR ==========")
        console.error("[v0] ❌ Error:", err)
        console.error("[v0] ================================================")
        setVideoErrors((prev) => {
          const newErrors = new Map(prev)
          newErrors.set(imageId, err instanceof Error ? err.message : "Failed to check video status")
          return newErrors
        })
        setGeneratingVideos((prev) => {
          const newSet = new Set(prev)
          newSet.delete(imageId)
          return newSet
        })
      }
    }

    poll()
  }

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
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-stone-950" />
        </div>
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
        <button
          onClick={() => setShowNavMenu(!showNavMenu)}
          className="flex items-center justify-center px-3 h-9 sm:h-10 rounded-lg hover:bg-stone-100/50 transition-colors touch-manipulation active:scale-95"
          aria-label="Navigation menu"
          aria-expanded={showNavMenu}
        >
          <span className="text-xs sm:text-sm font-serif tracking-[0.2em] text-stone-950 uppercase">MENU</span>
        </button>
      </div>

      {showNavMenu && (
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
                onClick={() => handleNavigation("studio")}
                className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-stone-50 transition-colors touch-manipulation"
              >
                <Home size={18} className="text-stone-600" strokeWidth={2} />
                <span className="text-sm font-medium text-stone-700">Studio</span>
              </button>
              <button
                onClick={() => handleNavigation("training")}
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
                onClick={() => handleNavigation("profile")}
                className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-stone-50 transition-colors touch-manipulation"
              >
                <UserIcon size={18} className="text-stone-600" strokeWidth={2} />
                <span className="text-sm font-medium text-stone-700">Profile</span>
              </button>
              <button
                onClick={() => handleNavigation("settings")}
                className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-stone-50 transition-colors touch-manipulation"
              >
                <SettingsIcon size={18} className="text-stone-600" strokeWidth={2} />
                <span className="text-sm font-medium text-stone-700">Settings</span>
              </button>
            </div>

            <div className="flex-shrink-0 px-6 py-4 border-t border-stone-200/50 bg-white/95">
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

      <div className="bg-stone-100/40 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 border border-stone-200/40">
        <div className="mb-4">
          <p className="text-xs sm:text-sm font-light text-stone-600 text-center">
            Create professional video content from your Maya-generated images. Click any image to animate it into a
            stunning video reel.
          </p>
        </div>
      </div>

      {images.length === 0 ? (
        <div className="bg-stone-100/40 rounded-3xl p-8 sm:p-12 text-center border border-stone-200/40">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {images.map((image) => {
              const isGenerating = generatingVideos.has(image.id)
              const isAnalyzing = analyzingMotion.has(image.id)
              const error = videoErrors.get(image.id)
              
              const video = allVideos.find((v) => 
                String(v.image_id) === String(image.id) && 
                v.video_url && 
                v.status === 'completed'
              )

              console.log("[v0] ========== RENDERING IMAGE ==========")
              console.log("[v0] Image ID:", image.id, "Type:", typeof image.id)
              console.log("[v0] Is Generating:", isGenerating)
              console.log("[v0] Is Analyzing:", isAnalyzing)
              console.log("[v0] Has Error:", !!error)
              console.log("[v0] Video found in DB:", !!video)
              if (video) {
                console.log("[v0] Video image_id:", video.image_id, "Type:", typeof video.image_id)
                console.log("[v0] Video URL:", video.video_url ? `${video.video_url.substring(0, 60)}...` : 'NULL')
              }
              console.log("[v0] Total videos in DB:", allVideos.length)
              console.log("[v0] ================================================")

              return (
                <div key={image.id} className="space-y-3">
                  <InstagramPhotoCard
                    concept={{
                      title: image.category || "B-Roll Content",
                      description: image.description || image.prompt,
                      prompt: image.prompt,
                      category: image.category || "lifestyle",
                    }}
                    imageUrl={image.image_url}
                    imageId={image.id}
                    isFavorite={false}
                    onFavoriteToggle={() => handleFavoriteToggle(image.id, false)}
                    onDelete={() => handleDelete(image.id)}
                    onAnimate={
                      !video && !isGenerating && !isAnalyzing
                        ? () => handleAnimate(
                            image.id,
                            image.image_url,
                            image.description || image.prompt,
                            image.prompt,
                            image.category || "lifestyle"
                          )
                        : undefined
                    }
                    showAnimateOverlay={true}
                  />

                  {isAnalyzing && (
                    <div className="flex flex-col items-center justify-center py-6 space-y-3 bg-white/50 backdrop-blur-2xl border border-white/70 rounded-2xl">
                      <div className="flex gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-stone-950 animate-bounce"></div>
                        <div
                          className="w-2 h-2 rounded-full bg-stone-950 animate-bounce"
                          style={{ animationDelay: "0.2s" }}
                        ></div>
                        <div
                          className="w-2 h-2 rounded-full bg-stone-950 animate-bounce"
                          style={{ animationDelay: "0.4s" }}
                        ></div>
                      </div>
                      <div className="text-center space-y-1">
                        <span className="text-xs tracking-wider uppercase font-semibold text-stone-700">
                          Analyzing Scene
                        </span>
                        <p className="text-[10px] text-stone-600">Creating motion prompt</p>
                      </div>
                    </div>
                  )}

                  {isGenerating && (
                    <div className="flex flex-col items-center justify-center py-6 space-y-3 bg-white/50 backdrop-blur-2xl border border-white/70 rounded-2xl">
                      <div className="flex gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-stone-950 animate-bounce"></div>
                        <div
                          className="w-2 h-2 rounded-full bg-stone-950 animate-bounce"
                          style={{ animationDelay: "0.2s" }}
                        ></div>
                        <div
                          className="w-2 h-2 rounded-full bg-stone-950 animate-bounce"
                          style={{ animationDelay: "0.4s" }}
                        ></div>
                      </div>
                      <div className="text-center space-y-1">
                        <span className="text-xs tracking-wider uppercase font-semibold text-stone-700">
                          Creating Reel
                        </span>
                        <p className="text-[10px] text-stone-600">1-3 minutes</p>
                      </div>
                    </div>
                  )}

                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                      <p className="text-xs text-red-600">{error}</p>
                      <button
                        onClick={() =>
                          handleAnimate(
                            image.id,
                            image.image_url,
                            image.description || image.prompt,
                            image.prompt,
                            image.category || "lifestyle"
                          )
                        }
                        className="mt-2 text-xs font-semibold text-red-700 hover:text-red-900 min-h-[40px] px-3 py-2"
                      >
                        Try Again
                      </button>
                    </div>
                  )}

                  {video && video.video_url && (
                    <div className="mt-3">
                      {console.log("[v0] ✅ Rendering InstagramReelCard for video:", video.id)}
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
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-6 h-6 animate-spin text-stone-950" />
                  <span className="text-xs tracking-wider uppercase font-light text-stone-600">
                    Loading more...
                  </span>
                </div>
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
    </div>
  )
}
