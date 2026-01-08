"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import FullscreenImageModal from "@/components/sselfie/fullscreen-image-modal"

interface BlueprintConceptCardProps {
  concept: {
    title: string
    prompt: string
    category: string
  }
  index: number
  selfieImages?: string[]
  selectedFeedStyle?: string // Mood: "luxury" (Dark & Moody), "minimal" (Light & Minimalistic), "beige" (Beige Aesthetic)
  category?: string // Category from formData.vibe: "luxury", "minimal", "beige", "warm", "edgy", "professional"
  email?: string // Email for generation limits
  onImageGenerated?: (imageUrl: string) => void
}

export function BlueprintConceptCard({
  concept,
  index,
  selfieImages,
  selectedFeedStyle,
  category,
  email,
  onImageGenerated,
}: BlueprintConceptCardProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [gridUrl, setGridUrl] = useState<string | null>(null)
  const [frameUrls, setFrameUrls] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [predictionId, setPredictionId] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleGenerate = async () => {
    // Check email
    if (!email) {
      setError("Please complete email capture first")
      return
    }

    // Check selfies uploaded
    if (!selfieImages || selfieImages.length === 0) {
      setError("Please upload 1-3 selfies first")
      return
    }

    // Check category selected
    if (!category || !["luxury", "minimal", "beige", "warm", "edgy", "professional"].includes(category)) {
      setError("Please complete the form and select your vibe first")
      return
    }

    // Check mood selected
    if (!selectedFeedStyle || !["luxury", "minimal", "beige"].includes(selectedFeedStyle)) {
      setError("Please select a feed style first")
      return
    }

    setIsGenerating(true)
    setError(null)

    try {
      console.log("[Blueprint] Generating Pro Photoshoot grid:", concept.title, "Category:", category, "Mood:", selectedFeedStyle)

      const response = await fetch("/api/blueprint/generate-grid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selfieImages,
          category, // Category from formData.vibe
          mood: selectedFeedStyle, // Mood from selectedFeedStyle
          email,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate grid")
      }

      setPredictionId(data.predictionId)
      pollGridStatus(data.predictionId)
    } catch (err) {
      console.error("[Blueprint] Error generating grid:", err)
      setError(err instanceof Error ? err.message : "Failed to generate grid")
      setIsGenerating(false)
    }
  }

  const pollGridStatus = async (id: string) => {
    if (!email) {
      setError("Email is required")
      setIsGenerating(false)
      return
    }

    try {
      const response = await fetch("/api/blueprint/check-grid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ predictionId: id, email }),
      })

      const data = await response.json()

      if (data.status === "completed" && data.gridUrl) {
        setGridUrl(data.gridUrl)
        setFrameUrls(data.frameUrls || [])
        setIsGenerating(false)
        onImageGenerated?.(data.gridUrl)
        console.log("[Blueprint] Grid generation completed:", data.gridUrl)
      } else if (data.status === "failed") {
        setError(data.error || "Generation failed")
        setIsGenerating(false)
      } else {
        // Still processing, poll again
        setTimeout(() => pollGridStatus(id), 2000)
      }
    } catch (err) {
      console.error("[Blueprint] Error checking grid status:", err)
      setError("Failed to check generation status")
      setIsGenerating(false)
    }
  }

  return (
    <>
      <div className="bg-white border-2 border-stone-200 rounded-lg overflow-hidden transition-all duration-300 hover:border-stone-300 hover:shadow-lg">
        {/* Image Area - Show 3x3 grid if available, otherwise placeholder */}
        <div className="aspect-square bg-stone-100 relative">
          {gridUrl && frameUrls.length === 9 ? (
            <button
              onClick={() => setIsModalOpen(true)}
              className="w-full h-full focus:outline-none focus:ring-2 focus:ring-stone-400 group active:scale-95 transition-transform"
            >
              {/* 3x3 Grid Preview */}
              <div className="grid grid-cols-3 gap-0.5 w-full h-full">
                {frameUrls.map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt={`Frame ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                ))}
              </div>
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
            </button>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center space-y-3 p-6">
                <div className="w-16 h-16 mx-auto rounded-full bg-stone-200 flex items-center justify-center">
                  <span className="text-2xl font-light text-stone-400">{String(index + 1)}</span>
                </div>
                <p className="text-xs text-stone-500 font-light">Preview will appear here</p>
              </div>
            </div>
          )}

          {/* Loading Overlay */}
          {isGenerating && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
              <div className="text-center space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-white mx-auto" />
                <p className="text-xs text-white font-light">Generating...</p>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] tracking-wider uppercase font-medium text-stone-500 bg-stone-100 px-3 py-1 rounded-full">
              {concept.category}
            </span>
          </div>

          <div>
            <h3 className="text-sm font-medium text-stone-950 mb-1">{concept.title}</h3>
            <p className="text-xs text-stone-600 font-light leading-relaxed line-clamp-2">{concept.prompt}</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 p-3 rounded">
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}

          {!gridUrl && !isGenerating && (
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full bg-stone-950 text-stone-50 py-3 sm:py-3.5 text-xs tracking-wider uppercase font-medium hover:bg-stone-800 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
            >
              Generate Grid
            </button>
          )}
        </div>
      </div>

      {/* Fullscreen Image Modal - Show full grid */}
      {gridUrl && (
        <FullscreenImageModal
          imageUrl={gridUrl}
          imageId={String(index + 1)}
          title={concept.title}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  )
}
