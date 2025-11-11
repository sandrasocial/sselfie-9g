"use client"

import { useState, useEffect } from "react"
import { Check } from "lucide-react"
import InstagramPhotoCard from "./instagram-photo-card"
import InstagramReelCard from "./instagram-reel-card"
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
      console.log("[v0] ========== CONCEPT CARD GENERATION ==========")
      console.log("[v0] Concept title:", concept.title)
      console.log("[v0] Concept category:", concept.category)
      console.log("[v0] Has reference image:", !!concept.referenceImageUrl)
      if (concept.referenceImageUrl) {
        console.log("[v0] Reference image URL:", concept.referenceImageUrl)
        console.log("[v0] This image will be blended with your trained model")
      }
      console.log("[v0] Full concept object:", JSON.stringify(concept, null, 2))
      console.log("[v0] ================================================")

      const settingsStr = localStorage.getItem("mayaGenerationSettings")
      console.log("[v0] 📊 Raw settings from localStorage:", settingsStr)
      const customSettings = settingsStr ? JSON.parse(settingsStr) : null
      console.log("[v0] 📊 Parsed custom settings (including aspect ratio):", customSettings)

      const finalSettings = concept.customSettings || customSettings

      const response = await fetch("/api/maya/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // Include cookies for Supabase auth
        body: JSON.stringify({
          conceptTitle: concept.title,
          conceptDescription: concept.description,
          conceptPrompt: concept.prompt, // Maya's detailed FLUX prompt
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

      console.log("[v0] Generation started:", data)

      setPredictionId(data.predictionId)
      setGenerationId(data.generationId.toString())
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

      // Reset state after deletion
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

      const response = await fetch("/api/maya/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          imageUrl: generatedImageUrl,
          imageId: generationId,
          motionPrompt: undefined, // Let the API generate a creative default
          imageDescription: concept.description, // Pass concept description for context
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

  return (
    <div className="bg-white/50 backdrop-blur-2xl border border-white/70 rounded-2xl p-4 transition-all duration-300 hover:bg-white/70 hover:border-white/90 hover:scale-[1.01] shadow-lg shadow-stone-900/5">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="px-3 py-1 bg-stone-100 backdrop-blur-xl rounded-full border border-stone-200">
            <span className="text-[10px] tracking-wider uppercase font-semibold text-stone-950">
              {concept.category}
            </span>
          </div>
        </div>

        <div className="space-y-1.5">
          <h4 className="text-sm font-bold text-stone-950 leading-tight">{concept.title}</h4>
          <p className="text-xs leading-relaxed text-stone-600 line-clamp-2">{concept.description}</p>
        </div>
      </div>

      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl">
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
        <div className="mt-3 space-y-2">
          <p className="text-[10px] text-stone-500 text-center leading-relaxed">
            AI-generated photos may vary in quality and accuracy
          </p>
          <button
            onClick={handleGenerate}
            className="group relative w-full bg-stone-950 text-white px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-300 hover:shadow-xl hover:shadow-stone-900/30 hover:scale-[1.02] active:scale-[0.98] min-h-[44px] flex items-center justify-center"
          >
            <span>Create Photo</span>
          </button>
        </div>
      )}

      {isGenerating && (
        <div className="mt-3 flex flex-col items-center justify-center py-6 space-y-3">
          <div className="flex gap-1.5">
            <div className="w-2 h-2 rounded-full bg-stone-950 animate-bounce"></div>
            <div className="w-2 h-2 rounded-full bg-stone-950 animate-bounce" style={{ animationDelay: "0.2s" }}></div>
            <div className="w-2 h-2 rounded-full bg-stone-950 animate-bounce" style={{ animationDelay: "0.4s" }}></div>
          </div>
          <span className="text-xs tracking-wider uppercase font-semibold text-stone-700">Creating your photo</span>
        </div>
      )}

      {isGenerated && generatedImageUrl && (
        <div className="mt-3 space-y-3">
          <div className="p-3 bg-stone-100 backdrop-blur-xl border border-stone-200 rounded-xl shadow-lg shadow-stone-900/5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-stone-950 rounded-lg flex items-center justify-center shadow-lg shadow-stone-900/30 flex-shrink-0">
                <Check className="w-4 h-4 text-white" />
              </div>
              <div className="space-y-0.5 flex-1 min-w-0">
                <h4 className="text-xs font-semibold text-stone-950">Photo Ready</h4>
                <p className="text-[10px] font-medium text-stone-600">Looking stunning</p>
              </div>
            </div>
          </div>

          <InstagramPhotoCard
            concept={concept}
            imageUrl={generatedImageUrl}
            imageId={generationId || ""}
            isFavorite={isFavorite}
            onFavoriteToggle={handleFavoriteToggle}
            onDelete={handleDelete}
            onAnimate={!videoUrl && !isGeneratingVideo ? handleAnimate : undefined}
          />

          {isGeneratingVideo && (
            <div className="flex flex-col items-center justify-center py-6 space-y-3">
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
                <span className="text-xs tracking-wider uppercase font-semibold text-stone-700">Creating Reel</span>
                <p className="text-[10px] text-stone-600">40-60 seconds</p>
              </div>
            </div>
          )}

          {videoError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
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
  )
}
