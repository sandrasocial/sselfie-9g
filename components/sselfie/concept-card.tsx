"use client"

import { useState, useEffect } from "react"
import { MoreVertical } from "lucide-react"
import InstagramPhotoCard from "./instagram-photo-card"
import InstagramReelCard from "./instagram-reel-card"
import InstagramCarouselCard from "./instagram-carousel-card"
import type { ConceptData } from "./types"

interface ConceptCardProps {
  concept: ConceptData
  chatId?: number
}

export default function ConceptCard({ concept, chatId }: ConceptCardProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [isGenerated, setIsGenerated] = useState(false)
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [predictionId, setPredictionId] = useState<string | null>(null)
  const [generationId, setGenerationId] = useState<string | null>(null)
  const [isViewerOpen, setIsViewerOpen] = useState(false)
  const [isFavorite, setIsFavorite] = useState(false)

  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [videoId, setVideoId] = useState<string | null>(null)
  const [videoPredictionId, setVideoPredictionId] = useState<string | null>(null)
  const [videoError, setVideoError] = useState<string | null>(null)

  const [isCreatingPhotoshoot, setIsCreatingPhotoshoot] = useState(false)
  const [photoshootGenerations, setPhotoshootGenerations] = useState<any[]>([])
  const [showPhotoshootConfirm, setShowPhotoshootConfirm] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    if (!predictionId || !generationId || isGenerated) return

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(
          `/api/maya/check-generation?predictionId=${predictionId}&generationId=${generationId}`,
        )
        const data = await response.json()

        console.log("[v0] Generation status:", data.status)

        if (data.status === "succeeded") {
          setGeneratedImageUrl(data.imageUrl)
          setIsGenerated(true)
          setIsGenerating(false)
          clearInterval(pollInterval)
        } else if (data.status === "failed") {
          setError(data.error || "Generation failed")
          setIsGenerating(false)
          clearInterval(pollInterval)
        }
      } catch (err) {
        console.error("[v0] Error polling generation:", err)
        setError("Failed to check generation status")
        setIsGenerating(false)
        clearInterval(pollInterval)
      }
    }, 3000) // Poll every 3 seconds

    return () => clearInterval(pollInterval)
  }, [predictionId, generationId, isGenerated])

  useEffect(() => {
    if (!videoPredictionId || !videoId || videoUrl) return

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/maya/check-video?predictionId=${videoPredictionId}&videoId=${videoId}`)
        const data = await response.json()

        console.log("[v0] Video generation status:", data.status)

        if (data.status === "succeeded") {
          setVideoUrl(data.videoUrl)
          setIsGeneratingVideo(false)
          clearInterval(pollInterval)
        } else if (data.status === "failed") {
          setVideoError(data.error || "Video generation failed")
          setIsGeneratingVideo(false)
          clearInterval(pollInterval)
        }
      } catch (err) {
        console.error("[v0] Error polling video generation:", err)
        setVideoError("Failed to check video status")
        setIsGeneratingVideo(false)
        clearInterval(pollInterval)
      }
    }, 5000) // Poll every 5 seconds (videos take longer)

    return () => clearInterval(pollInterval)
  }, [videoPredictionId, videoId, videoUrl])

  const handleGenerate = async () => {
    setIsGenerating(true)
    setError(null)

    try {
      const settingsStr = localStorage.getItem("mayaGenerationSettings")
      const parsedSettings = settingsStr ? JSON.parse(settingsStr) : null

      const customSettings = parsedSettings
        ? {
            ...parsedSettings,
            extraLoraScale: parsedSettings.realismStrength ?? 0.4,
          }
        : null

      const finalSettings = customSettings
        ? {
            ...customSettings,
            ...(concept.customSettings || {}),
          }
        : concept.customSettings

      const response = await fetch("/api/maya/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          conceptTitle: concept.title,
          conceptDescription: concept.description,
          conceptPrompt: concept.prompt,
          category: concept.category,
          chatId,
          referenceImageUrl: concept.referenceImageUrl,
          customSettings: finalSettings,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate image")
      }

      setPredictionId(data.predictionId)
      setGenerationId(data.generationId.toString())
      setUserId(data.userId)
    } catch (err) {
      console.error("[v0] Error generating image:", err)
      setError(err instanceof Error ? err.message : "Failed to generate image")
      setIsGenerating(false)
    }
  }

  const handleFavoriteToggle = async () => {
    if (!generationId) return

    try {
      const response = await fetch("/api/images/favorite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageId: `ai_${generationId}`,
          isFavorite: !isFavorite,
        }),
      })

      if (!response.ok) throw new Error("Failed to toggle favorite")

      setIsFavorite(!isFavorite)
    } catch (error) {
      console.error("[v0] Error toggling favorite:", error)
    }
  }

  const handleDelete = async () => {
    if (!generationId) return

    try {
      const response = await fetch("/api/images/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId: generationId }),
      })

      if (!response.ok) throw new Error("Failed to delete image")

      setGeneratedImageUrl(null)
      setIsGenerated(false)
      setGenerationId(null)
      setPredictionId(null)
    } catch (error) {
      console.error("[v0] Error deleting image:", error)
    }
  }

  const handleAnimate = async () => {
    if (!generatedImageUrl || !generationId) return

    setIsGeneratingVideo(true)
    setVideoError(null)

    try {
      console.log("[v0] Starting video generation from image:", generatedImageUrl)

      console.log("[v0] 🎨 Generating AI motion prompt with vision analysis...")
      const motionResponse = await fetch("/api/maya/generate-motion-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fluxPrompt: concept.prompt,
          description: concept.description,
          category: concept.category,
          imageUrl: generatedImageUrl,
        }),
      })

      const motionData = await motionResponse.json()

      if (!motionResponse.ok) {
        console.warn("[v0] ⚠️ Motion prompt generation failed, using concept description")
      }

      const aiGeneratedMotionPrompt = motionData.motionPrompt || concept.description
      console.log("[v0] ✅ AI-generated motion prompt:", aiGeneratedMotionPrompt)

      const response = await fetch("/api/maya/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          imageUrl: generatedImageUrl,
          imageId: generationId,
          motionPrompt: aiGeneratedMotionPrompt,
          imageDescription: concept.description,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate video")
      }

      console.log("[v0] Video generation started:", data)

      setVideoPredictionId(data.predictionId)
      setVideoId(data.videoId.toString())
    } catch (err) {
      console.error("[v0] Error generating video:", err)
      setVideoError(err instanceof Error ? err.message : "Failed to generate video")
      setIsGeneratingVideo(false)
    }
  }

  const handleCreatePhotoshoot = async () => {
    if (!generatedImageUrl || !generationId) return

    setIsCreatingPhotoshoot(true)
    setShowPhotoshootConfirm(false)

    try {
      console.log("[v0] 📸 Creating photoshoot from hero image:", generatedImageUrl)

      const generationResponse = await fetch(`/api/maya/check-generation?generationId=${generationId}`)
      const generationData = await generationResponse.json()

      console.log("[v0] 📸 Original generation data:", {
        seed: generationData.seed,
        prompt: generationData.prompt?.substring(0, 100),
      })

      const response = await fetch("/api/maya/create-photoshoot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          heroImageUrl: generatedImageUrl,
          heroPrompt: generationData.prompt || concept.prompt,
          heroSeed: generationData.seed,
          conceptTitle: concept.title,
          conceptDescription: concept.description,
          category: concept.category,
          chatId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create photoshoot")
      }

      console.log(
        "[v0] ✅ Photoshoot created with",
        data.totalImages,
        "images using original seed:",
        data.consistencySeed,
      )

      console.log("[v0] 📊 Predictions received:", data.predictions?.length || 0)
      console.log("[v0] 📊 User ID for gallery:", data.userId)

      const emptyGenerations = Array.from({ length: data.totalImages }, (_, i) => ({
        generationId: `prediction_${i}`,
        imageUrl: null,
        url: null,
        status: "processing",
        index: i,
        action: data.predictions?.[i]?.title || `Photo ${i + 1}`,
      }))

      console.log("[v0] 📊 Empty generations array created:", emptyGenerations.length)

      setPhotoshootGenerations(emptyGenerations)

      pollPredictions(data.predictions || data.batches, data.userId)
    } catch (err) {
      console.error("[v0] Error creating photoshoot:", err)
      alert(err instanceof Error ? err.message : "Failed to create photoshoot")
      setIsCreatingPhotoshoot(false)
    }
  }

  const pollPredictions = async (predictions: any[], userId?: string) => {
    console.log(`[v0] 📊 Starting to poll ${predictions.length} predictions`)
    console.log(`[v0] 📊 User ID:`, userId)

    const pollSinglePrediction = async (pred: any) => {
      const maxAttempts = 60
      let attempts = 0

      const predId = pred.predictionId || pred.batches?.[0]?.predictionId
      const predIndex = pred.index !== undefined ? pred.index : pred.batchIndex !== undefined ? pred.batchIndex * 3 : 0

      while (attempts < maxAttempts) {
        try {
          const url = new URL(`/api/maya/check-photoshoot-prediction`, window.location.origin)
          url.searchParams.set("id", predId)
          url.searchParams.set("heroPrompt", encodeURIComponent(concept.prompt || concept.title))
          if (userId) {
            url.searchParams.set("userId", userId)
          }

          const response = await fetch(url.toString(), {
            method: "GET",
          })

          if (!response.ok) {
            const text = await response.text()
            console.error(`[v0] ❌ Failed to check prediction ${predIndex}:`, response.status, text.substring(0, 200))
            await new Promise((resolve) => setTimeout(resolve, 4000))
            attempts++
            continue
          }

          const status = await response.json()

          console.log(`[v0] 📊 Prediction ${predIndex} status:`, status.status)

          if (status.status === "succeeded" && status.output) {
            const imageUrls = Array.isArray(status.output) ? status.output : [status.output]
            console.log(`[v0] ✅ Prediction ${predIndex} complete with ${imageUrls.length} image(s)`)

            imageUrls.forEach((imageUrl: string, idx: number) => {
              const globalIndex = pred.index !== undefined ? pred.index : pred.batchIndex * 3 + idx
              setPhotoshootGenerations((prev) => {
                const updated = [...prev]
                if (updated[globalIndex]) {
                  updated[globalIndex] = {
                    ...updated[globalIndex],
                    url: imageUrl,
                    imageUrl: imageUrl,
                    status: "ready",
                    action: pred.title || pred.actions?.[idx] || `Photo ${globalIndex + 1}`,
                  }
                }
                return updated
              })
            })

            return imageUrls
          } else if (status.status === "failed") {
            console.error(`[v0] ❌ Prediction ${predIndex} failed:`, status.error)
            setPhotoshootGenerations((prev) => {
              const updated = [...prev]
              if (updated[predIndex]) {
                updated[predIndex] = {
                  ...updated[predIndex],
                  status: "failed",
                  error: status.error,
                }
              }
              return updated
            })
            return null
          }

          await new Promise((resolve) => setTimeout(resolve, 4000))
          attempts++
        } catch (err) {
          console.error(`[v0] Error polling prediction ${predIndex}:`, err)
          await new Promise((resolve) => setTimeout(resolve, 4000))
          attempts++
        }
      }

      console.error(`[v0] ❌ Prediction ${predIndex} timed out`)
      return null
    }

    const pollWithDelay = async (pred: any, index: number) => {
      await new Promise((resolve) => setTimeout(resolve, index * 500))
      return pollSinglePrediction(pred)
    }

    const results = await Promise.allSettled(predictions.map((pred: any, index: number) => pollWithDelay(pred, index)))

    const successCount = results.filter((r) => r.status === "fulfilled" && r.value).length
    console.log(`[v0] 🎉 Photoshoot complete: ${successCount}/${predictions.length} images`)

    setIsCreatingPhotoshoot(false)
  }

  const pollBatches = async (batches: any[]) => {
    console.log(`[v0] 📊 [Legacy] Redirecting to new pollPredictions system`)
    await pollPredictions(batches, userId)
  }

  return (
    <div className="bg-white border border-stone-200 rounded-lg overflow-hidden transition-all duration-300 hover:shadow-lg">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-stone-200">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-purple-600 via-pink-600 to-orange-500 rounded-full p-[2px]">
              <div className="bg-white rounded-full w-full h-full"></div>
            </div>
            <div className="relative w-8 h-8 rounded-full bg-gradient-to-br from-stone-200 to-stone-300 flex items-center justify-center">
              <span className="text-xs font-bold text-stone-700">S</span>
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-stone-950">sselfie</span>
            <span className="text-xs text-stone-500">{concept.category}</span>
          </div>
        </div>
        <button className="p-1 hover:bg-stone-100 rounded-full transition-colors">
          <MoreVertical className="w-5 h-5 text-stone-700" />
        </button>
      </div>

      <div className="px-3 py-3 space-y-3">
        <div className="space-y-1">
          <p className="text-sm leading-relaxed text-stone-950">
            <span className="font-semibold">sselfie</span> {concept.title}
          </p>
          <p className="text-sm leading-relaxed text-stone-600 line-clamp-2">{concept.description}</p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs text-red-600">{error}</p>
            <button
              onClick={handleGenerate}
              className="mt-2 text-xs font-semibold text-red-700 hover:text-red-900 min-h-[40px] px-3 py-2"
            >
              Try Again
            </button>
          </div>
        )}

        {!isGenerating && !isGenerated && !error && (
          <div className="space-y-2">
            <button
              onClick={handleGenerate}
              className="group relative w-full bg-gradient-to-br from-stone-600 via-stone-700 to-stone-800 text-white px-4 py-2.5 rounded-lg font-semibold text-sm transition-all duration-300 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] min-h-[40px] flex items-center justify-center hover:from-stone-700 hover:via-stone-800 hover:to-stone-900"
            >
              <span>Create Photo</span>
            </button>
            <p className="text-[10px] text-stone-400 text-center leading-relaxed">
              AI-generated photos may vary in quality and accuracy
            </p>
          </div>
        )}

        {isGenerating && (
          <div className="flex flex-col items-center justify-center py-6 space-y-3">
            <div className="flex gap-1.5">
              <div className="w-2 h-2 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 animate-bounce"></div>
              <div
                className="w-2 h-2 rounded-full bg-gradient-to-r from-pink-600 to-orange-500 animate-bounce"
                style={{ animationDelay: "0.2s" }}
              ></div>
              <div
                className="w-2 h-2 rounded-full bg-gradient-to-r from-orange-500 to-purple-600 animate-bounce"
                style={{ animationDelay: "0.4s" }}
              ></div>
            </div>
            <span className="text-xs font-semibold text-stone-700">Creating your photo</span>
          </div>
        )}

        {isGenerated && generatedImageUrl && (
          <div className="space-y-3">
            {photoshootGenerations.length > 0 && photoshootGenerations.every((p) => p.url || p.imageUrl) ? (
              <InstagramCarouselCard
                images={photoshootGenerations.map((gen: any) => ({
                  url: gen.url || gen.imageUrl,
                  id: Number.parseInt(gen.id || gen.generationId),
                  action: gen.action || `Photo ${gen.index + 1}`,
                }))}
                title={concept.title}
                description={concept.description}
                category={concept.category}
                onFavoriteToggle={handleFavoriteToggle}
                onDelete={handleDelete}
                isFavorite={isFavorite}
              />
            ) : (
              <InstagramPhotoCard
                concept={concept}
                imageUrl={generatedImageUrl}
                imageId={generationId || ""}
                isFavorite={isFavorite}
                onFavoriteToggle={handleFavoriteToggle}
                onDelete={handleDelete}
                onAnimate={!videoUrl && !isGeneratingVideo ? handleAnimate : undefined}
                showAnimateOverlay={false}
                onCreatePhotoshoot={
                  !isCreatingPhotoshoot && photoshootGenerations.length === 0
                    ? () => setShowPhotoshootConfirm(true)
                    : undefined
                }
              />
            )}

            {showPhotoshootConfirm && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-in zoom-in-95 duration-200">
                  <div className="px-6 pt-6 pb-4 border-b border-stone-100">
                    <h3 className="text-lg font-semibold text-stone-950">Create Carousel?</h3>
                  </div>

                  <div className="px-6 py-4 space-y-3">
                    <p className="text-sm text-stone-700 leading-relaxed">
                      We'll create <span className="font-semibold text-stone-950">6-9 photos</span> with the same outfit
                      and vibe, perfect for a carousel post.
                    </p>

                    <div className="bg-stone-50 rounded-lg p-3 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-stone-500"></div>
                        <span className="text-xs text-stone-600">Same outfit & style</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-stone-500"></div>
                        <span className="text-xs text-stone-600">Different poses & angles</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-stone-500"></div>
                        <span className="text-xs text-stone-600">Takes 2-3 minutes</span>
                      </div>
                    </div>
                  </div>

                  <div className="px-6 pb-6 flex flex-col gap-2">
                    <button
                      onClick={handleCreatePhotoshoot}
                      className="w-full bg-gradient-to-br from-stone-600 via-stone-700 to-stone-800 text-white px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-300 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] hover:from-stone-700 hover:via-stone-800 hover:to-stone-900"
                    >
                      Let's Go
                    </button>
                    <button
                      onClick={() => setShowPhotoshootConfirm(false)}
                      className="w-full bg-stone-100 text-stone-700 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 hover:bg-stone-200 active:scale-[0.98]"
                    >
                      Not Now
                    </button>
                  </div>
                </div>
              </div>
            )}

            {isCreatingPhotoshoot && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-stone-600"></div>
                  <span className="text-xs tracking-[0.15em] uppercase font-light text-stone-600">
                    Creating Carousel ({photoshootGenerations.filter((p) => p.url || p.imageUrl).length}/
                    {photoshootGenerations.length})
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {photoshootGenerations.map((gen, idx) => (
                    <div key={idx} className="aspect-square bg-stone-100 rounded-lg overflow-hidden">
                      {gen.url || gen.imageUrl ? (
                        <img
                          src={gen.url || gen.imageUrl || "/placeholder.svg"}
                          alt={gen.action}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="w-6 h-6 border-2 border-stone-300 border-t-stone-900 rounded-full animate-spin" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isGeneratingVideo && (
              <div className="flex flex-col items-center justify-center py-6 space-y-3">
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 animate-bounce"></div>
                  <div
                    className="w-2 h-2 rounded-full bg-gradient-to-r from-pink-600 to-orange-500 animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                  <div
                    className="w-2 h-2 rounded-full bg-gradient-to-r from-orange-500 to-purple-600 animate-bounce"
                    style={{ animationDelay: "0.4s" }}
                  ></div>
                </div>
                <div className="text-center space-y-1">
                  <span className="text-xs font-semibold text-stone-700">Creating Reel</span>
                  <p className="text-[10px] text-stone-600">1-3 minutes</p>
                </div>
              </div>
            )}

            {videoError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs text-red-600">{videoError}</p>
                <button onClick={handleAnimate} className="mt-2 text-xs font-semibold text-red-700 hover:text-red-900">
                  Try Again
                </button>
              </div>
            )}

            {videoUrl && videoId && (
              <div className="mt-3">
                <InstagramReelCard videoUrl={videoUrl} motionPrompt={concept.description} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
