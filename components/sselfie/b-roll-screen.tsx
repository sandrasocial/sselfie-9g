"use client"

import { useState } from "react"
import useSWR from "swr"
import { Loader2 } from 'lucide-react'
import InstagramPhotoCard from "./instagram-photo-card"
import InstagramReelCard from "./instagram-reel-card"

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

  const { data: imagesData, error: imagesError, isLoading: imagesLoading } = useSWR(
    "/api/maya/b-roll-images",
    fetcher,
    {
      refreshInterval: 0,
      revalidateOnFocus: false,
    },
  )

  const { data: videosData, mutate: mutateVideos } = useSWR("/api/maya/videos", fetcher, {
    refreshInterval: 5000,
    revalidateOnFocus: false,
  })

  const images: BRollImage[] = imagesData?.images || []
  const allVideos: GeneratedVideo[] = videosData?.videos || []

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
        console.log("[v0] Polling video status for imageId:", imageId)
        const response = await fetch(`/api/maya/check-video?predictionId=${predictionId}&videoId=${videoId}`)
        const data = await response.json()

        console.log("[v0] Video polling response:", { imageId, status: data.status, videoUrl: data.videoUrl })

        if (data.status === "succeeded") {
          console.log("[v0] Video generation succeeded! Refreshing videos list...")
          await mutateVideos()
          
          // Give the UI a moment to update with the new video
          setTimeout(() => {
            setGeneratingVideos((prev) => {
              const newSet = new Set(prev)
              newSet.delete(imageId)
              console.log("[v0] Cleared generating state for imageId:", imageId)
              return newSet
            })
            setVideoPredictions((prev) => {
              const newPredictions = new Map(prev)
              newPredictions.delete(imageId)
              return newPredictions
            })
          }, 500)
          return
        } else if (data.status === "failed") {
          throw new Error(data.error || "Video generation failed")
        }

        attempts++
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000)
        } else {
          throw new Error("Video generation timed out")
        }
      } catch (err) {
        console.error("[v0] Error polling video:", err)
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
      </div>

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {images.map((image) => {
            const isGenerating = generatingVideos.has(image.id)
            const isAnalyzing = analyzingMotion.has(image.id)
            const error = videoErrors.get(image.id)
            const video = allVideos.find((v) => v.image_id?.toString() === image.id)

            console.log("[v0] Rendering image:", { 
              imageId: image.id, 
              isGenerating, 
              isAnalyzing, 
              hasVideo: !!video,
              videoId: video?.id,
              videoUrl: video?.video_url,
              allVideosCount: allVideos.length
            })

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
                      <p className="text-[10px] text-stone-600">40-60 seconds</p>
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
                    <InstagramReelCard videoUrl={video.video_url} motionPrompt={video.motion_prompt || undefined} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
