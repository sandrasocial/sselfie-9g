"use client"

import { useState, useEffect } from "react"
import { X, Loader2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface Highlight {
  id?: number
  title: string
  image_url: string | null
  icon_style?: string
}

interface FeedHighlightsModalProps {
  feedId: number
  isOpen: boolean
  onClose: () => void
  onSave: () => void
  existingHighlights?: Highlight[]
  brandColors?: string[] // Array of hex color strings
}

export default function FeedHighlightsModal({
  feedId,
  isOpen,
  onClose,
  onSave,
  existingHighlights = [],
  brandColors = [],
}: FeedHighlightsModalProps) {
  const [highlights, setHighlights] = useState<Highlight[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Default brand colors if none provided
  const defaultColors = ["#D4C5B9", "#E8D5C4", "#F5E6D3", "#C9B8A8", "#B8A99A", "#E2D1C0", "#F0E3D5", "#D9C9B9"]
  const availableColors = brandColors.length > 0 ? brandColors : defaultColors

  useEffect(() => {
    if (isOpen) {
      if (existingHighlights.length > 0) {
        setHighlights(existingHighlights)
      } else {
        setHighlights([])
      }
    }
  }, [isOpen, existingHighlights])

  const handleGenerate = async () => {
    setIsGenerating(true)
    try {
      const response = await fetch(`/api/feed/${feedId}/generate-highlights`, {
        method: "POST",
        credentials: "include",
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to generate highlights" }))
        const errorMessage = errorData.error || "Failed to generate highlights"
        const errorDetails = errorData.details ? `: ${errorData.details}` : ""
        console.error("[v0] Generate highlights error:", errorData)
        throw new Error(`${errorMessage}${errorDetails}`)
      }

      const data = await response.json()
      const generatedTitles = data.highlights || []

      // Create highlights with color placeholders
      const newHighlights = generatedTitles.map((title: string, index: number) => ({
        title,
        image_url: availableColors[index % availableColors.length],
        icon_style: "color",
      }))

      setHighlights(newHighlights)

      toast({
        title: "Highlights generated!",
        description: "Maya created your highlight titles ✨",
      })
    } catch (error) {
      console.error("[v0] Error generating highlights:", error)
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Failed to generate highlights",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSave = async () => {
    if (highlights.length === 0) {
      toast({
        title: "No highlights",
        description: "Please generate highlights first",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)

    try {
      // Format highlights for API
      const highlightsToSave = highlights.map((h, index) => ({
        title: h.title,
        coverUrl: h.image_url || availableColors[index % availableColors.length],
        description: "",
        type: h.image_url?.startsWith("#") || !h.image_url ? "color" : "image",
      }))

      const response = await fetch(`/api/feed/${feedId}/highlights`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ highlights: highlightsToSave }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to save highlights" }))
        throw new Error(errorData.error || "Failed to save highlights")
      }

      toast({
        title: "Highlights saved",
        description: "Your highlights have been saved successfully",
      })

      onSave()
      onClose()
    } catch (error) {
      console.error("[v0] Error saving highlights:", error)
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Failed to save highlights",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-stone-200 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-semibold text-stone-900">Create Highlights</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-stone-100 rounded-full transition-colors"
            disabled={isSaving}
          >
            <X size={20} className="text-stone-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {highlights.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <p className="text-stone-600 text-center">
                Let Maya generate highlight titles based on your feed content
              </p>
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="px-6 py-3 bg-stone-900 hover:bg-stone-800 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    <span>Maya is creating highlights...</span>
                  </>
                ) : (
                  <span>Let Maya create highlights</span>
                )}
              </button>
            </div>
          ) : (
            <>
              {/* Highlights Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
                {highlights.map((highlight, index) => {
                  const displayColor = highlight.image_url?.startsWith("#")
                    ? highlight.image_url
                    : availableColors[index % availableColors.length]

                  return (
                    <div key={index} className="flex flex-col items-center gap-3">
                      {/* Highlight Circle */}
                      <div className="relative w-20 h-20">
                        <div className="w-full h-full rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-[2px]">
                          <div className="w-full h-full rounded-full bg-white p-[2px]">
                            <div
                              className="w-full h-full rounded-full flex items-center justify-center"
                              style={{ backgroundColor: displayColor }}
                            >
                              <span className="text-2xl font-bold text-white drop-shadow-lg">
                                {highlight.title ? highlight.title.charAt(0).toUpperCase() : "+"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Title */}
                      <div className="text-sm font-medium text-stone-900 text-center px-2">
                        {highlight.title}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Regenerate Button */}
              <div className="flex justify-center">
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || isSaving}
                  className="px-4 py-2 text-sm text-stone-600 hover:text-stone-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Regenerating...</span>
                    </>
                  ) : (
                    <span>Regenerate highlights</span>
                  )}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {highlights.length > 0 && (
          <div className="sticky bottom-0 bg-white border-t border-stone-200 px-6 py-4 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-sm text-stone-600 hover:text-stone-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-stone-900 text-white text-sm font-semibold rounded-lg hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Highlights</span>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
