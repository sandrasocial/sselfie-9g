"use client"

import { useState, useEffect } from "react"
import { Check } from "lucide-react"
import Image from "next/image"
import ImageViewerModal from "./image-viewer-modal"
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
        body: JSON.stringify({ imageId: generationId }),
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
    <div className="bg-white/50 backdrop-blur-2xl border border-white/70 rounded-[1.75rem] p-5 sm:p-6 transition-all duration-300 hover:bg-white/70 hover:border-white/90 hover:scale-[1.01] shadow-xl shadow-stone-900/10">
      <div className="space-y-4 sm:space-y-5">
        <div className="flex items-center justify-between">
          <div className="px-3 sm:px-4 py-1.5 sm:py-2 bg-stone-100 backdrop-blur-xl rounded-full border border-stone-200 shadow-inner">
            <span className="text-[10px] sm:text-xs tracking-wider uppercase font-semibold text-stone-950">
              {concept.category}
            </span>
          </div>
          <div className="w-2 h-2 rounded-full bg-stone-950 shadow-lg shadow-stone-950/50" aria-hidden="true"></div>
        </div>

        <div className="space-y-2 sm:space-y-3">
          <h4 className="text-sm sm:text-base font-bold text-stone-950 leading-tight">{concept.title}</h4>
          <p className="text-xs sm:text-sm font-medium leading-relaxed text-stone-600">{concept.description}</p>
        </div>
      </div>

      {error && (
        <div className="mt-5 sm:mt-6 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-xl" role="alert">
          <p className="text-xs sm:text-sm text-red-600">{error}</p>
          <button
            onClick={handleGenerate}
            className="mt-2 text-xs sm:text-sm font-semibold text-red-700 hover:text-red-900 min-h-[44px] px-3 py-2"
            aria-label="Retry image generation"
          >
            Try Again
          </button>
        </div>
      )}

      {!isGenerating && !isGenerated && !error && (
        <div className="mt-5 sm:mt-6">
          <button
            onClick={handleGenerate}
            className="group relative w-full bg-stone-950 text-white px-5 sm:px-6 py-4 rounded-[1.25rem] font-semibold tracking-wide text-sm transition-all duration-300 hover:shadow-2xl hover:shadow-stone-950/40 hover:scale-[1.02] active:scale-[0.98] min-h-[52px] overflow-hidden"
            aria-label={`Create photo: ${concept.title}`}
          >
            <div
              className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              aria-hidden="true"
            ></div>
            <span className="relative z-10">Create This Photo</span>
          </button>
        </div>
      )}

      {isGenerating && (
        <div
          className="mt-5 sm:mt-6 flex flex-col items-center justify-center py-6 sm:py-8 space-y-3 sm:space-y-4"
          role="status"
          aria-live="polite"
        >
          <div className="relative w-10 h-10 sm:w-12 sm:h-12" aria-hidden="true">
            <div className="absolute inset-0 rounded-full bg-stone-200/20 animate-ping"></div>
            <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-stone-950 animate-spin border-4 border-transparent border-t-white shadow-lg shadow-stone-900/30"></div>
          </div>
          <div className="text-center space-y-2">
            <span className="text-xs sm:text-sm tracking-wider uppercase font-semibold text-stone-700">
              Creating Magic
            </span>
            <div className="flex gap-1 justify-center" aria-hidden="true">
              <div className="w-1.5 h-1.5 rounded-full bg-stone-950 animate-bounce"></div>
              <div
                className="w-1.5 h-1.5 rounded-full bg-stone-950 animate-bounce"
                style={{ animationDelay: "0.1s" }}
              ></div>
              <div
                className="w-1.5 h-1.5 rounded-full bg-stone-950 animate-bounce"
                style={{ animationDelay: "0.2s" }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {isGenerated && generatedImageUrl && (
        <div className="mt-5 sm:mt-6 space-y-3 sm:space-y-4">
          <div
            className="p-4 sm:p-5 bg-stone-100 backdrop-blur-xl border border-stone-200 rounded-[1.25rem] shadow-xl shadow-stone-900/10"
            role="status"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 sm:w-10 sm:h-10 bg-stone-950 rounded-xl flex items-center justify-center shadow-lg shadow-stone-900/30 flex-shrink-0"
                aria-hidden="true"
              >
                <Check className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div className="space-y-1 flex-1 min-w-0">
                <h4 className="text-xs sm:text-sm font-semibold text-stone-950">Photo Ready</h4>
                <p className="text-[10px] sm:text-xs font-medium text-stone-600">Looking absolutely stunning</p>
              </div>
            </div>
          </div>

          <div
            onClick={() => setIsViewerOpen(true)}
            className="aspect-[4/5] bg-white/40 backdrop-blur-2xl rounded-[1.5rem] border border-white/60 overflow-hidden hover:bg-white/60 transition-all duration-300 cursor-pointer group relative shadow-xl shadow-stone-900/10"
            role="button"
            tabIndex={0}
            aria-label={`View full image: ${concept.title}`}
            onKeyPress={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                setIsViewerOpen(true)
              }
            }}
          >
            <Image
              src={generatedImageUrl || "/placeholder.svg"}
              alt={concept.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              loading="lazy"
            />
            <div
              className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center"
              aria-hidden="true"
            >
              <span className="text-white font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-sm sm:text-base">
                View Full Image
              </span>
            </div>
          </div>

          {!videoUrl && !isGeneratingVideo && (
            <button
              onClick={handleAnimate}
              className="w-full px-4 sm:px-5 py-3 sm:py-4 bg-stone-950 text-white rounded-[1.25rem] font-semibold text-xs sm:text-sm transition-all duration-300 hover:shadow-2xl hover:shadow-stone-950/40 hover:scale-[1.02] active:scale-[0.98] min-h-[48px] sm:min-h-[52px]"
              aria-label="Animate this photo into a video"
            >
              Animate This Photo
            </button>
          )}

          {isGeneratingVideo && (
            <div
              className="flex flex-col items-center justify-center py-6 sm:py-8 space-y-3 sm:space-y-4"
              role="status"
            >
              <div className="relative w-10 h-10 sm:w-12 sm:h-12">
                <div className="absolute inset-0 rounded-full bg-stone-200/20 animate-ping"></div>
                <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-stone-950 animate-spin border-4 border-transparent border-t-white shadow-lg shadow-stone-900/30"></div>
              </div>
              <div className="text-center space-y-2">
                <span className="text-xs sm:text-sm tracking-wider uppercase font-semibold text-stone-700">
                  Creating Video
                </span>
                <p className="text-[10px] sm:text-xs text-stone-600">This takes 40-60 seconds</p>
              </div>
            </div>
          )}

          {videoError && (
            <div className="p-3 sm:p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-xs sm:text-sm text-red-600">{videoError}</p>
              <button
                onClick={handleAnimate}
                className="mt-2 text-xs sm:text-sm font-semibold text-red-700 hover:text-red-900"
              >
                Try Again
              </button>
            </div>
          )}

          {videoUrl && videoId && (
            <div className="mt-4">
              <div className="aspect-[9/16] bg-stone-950 rounded-[1.5rem] overflow-hidden">
                <video src={videoUrl} className="w-full h-full object-cover" controls playsInline loop />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <button
              onClick={handleFavoriteToggle}
              className={`px-4 sm:px-5 py-3 sm:py-4 rounded-[1.25rem] font-semibold text-xs sm:text-sm transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] min-h-[48px] sm:min-h-[52px] ${
                isFavorite
                  ? "bg-red-500 text-white"
                  : "bg-stone-950 text-white hover:shadow-2xl hover:shadow-stone-950/40"
              }`}
              aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
            >
              {isFavorite ? "Saved ♥" : "Save Photo"}
            </button>
            <button
              onClick={() => setIsViewerOpen(true)}
              className="px-4 sm:px-5 py-3 sm:py-4 bg-white/50 backdrop-blur-2xl text-stone-950 border border-white/60 rounded-[1.25rem] font-semibold text-xs sm:text-sm transition-all duration-300 hover:bg-white/70 hover:border-white/80 hover:scale-[1.02] active:scale-[0.98] min-h-[48px] sm:min-h-[52px] shadow-lg shadow-stone-900/10"
              aria-label="View full image"
            >
              View Full
            </button>
          </div>
        </div>
      )}

      {isGenerated && generatedImageUrl && generationId && (
        <ImageViewerModal
          imageUrl={generatedImageUrl}
          imageId={Number.parseInt(generationId)}
          title={concept.title}
          isOpen={isViewerOpen}
          onClose={() => setIsViewerOpen(false)}
          isFavorite={isFavorite}
          onFavoriteToggle={handleFavoriteToggle}
          onDelete={handleDelete}
        />
      )}
    </div>
  )
}
