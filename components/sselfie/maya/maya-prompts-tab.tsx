"use client"

import { useState, useEffect } from "react"
import { Sparkles } from "lucide-react"
import Image from "next/image"

interface PromptItem {
  id: number
  concept_title: string | null
  prompt_text: string
  image_url: string | null
  category: string | null
  guide_title?: string
  guide_description?: string
}

interface MayaPromptsTabProps {
  onSelectPrompt: (prompt: string, title?: string) => void
  sharedImages?: Array<{
    url: string
    id: string
    prompt?: string
    description?: string
    category?: string
  }>
}

export default function MayaPromptsTab({ onSelectPrompt, sharedImages = [] }: MayaPromptsTabProps) {
  const [prompts, setPrompts] = useState<PromptItem[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [selectedPrompt, setSelectedPrompt] = useState<PromptItem | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPrompts()
  }, [selectedCategory])

  const fetchPrompts = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const categoryParam = selectedCategory === "all" ? "" : `?category=${selectedCategory}`
      const response = await fetch(`/api/prompt-guides/items${categoryParam}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch prompts")
      }

      setPrompts(data.items || [])
      if (data.categories && data.categories.length > 0) {
        setCategories(data.categories)
      }
    } catch (err) {
      console.error("[MayaPromptsTab] Error fetching prompts:", err)
      setError(err instanceof Error ? err.message : "Failed to load prompts")
    } finally {
      setIsLoading(false)
    }
  }

  const handlePromptClick = (prompt: PromptItem) => {
    setSelectedPrompt(prompt)
  }

  const handleGenerate = () => {
    if (selectedPrompt) {
      // Switch to Photos tab and send the prompt
      onSelectPrompt(selectedPrompt.prompt_text, selectedPrompt.concept_title || undefined)
      // Reset selection after sending
      setSelectedPrompt(null)
    }
  }

  // Get available images for concept preview (up to 3)
  const previewImages = sharedImages.slice(0, 3)

  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-24">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-stone-300 border-t-stone-950 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm font-light text-stone-500">Loading prompts...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-24">
            <p className="text-sm font-light text-stone-500 mb-4">{error}</p>
            <button
              onClick={fetchPrompts}
              className="px-4 py-2 bg-stone-950 text-white text-xs tracking-[0.1em] uppercase font-light rounded-lg hover:bg-stone-800 transition-all"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-8 md:py-10">
        {/* Section Header */}
        <div className="mb-6 sm:mb-8">
          <h2
            className="text-xs sm:text-sm md:text-[13px] font-serif font-light tracking-[0.25em] uppercase text-stone-950 mb-3 sm:mb-4"
            style={{ letterSpacing: "0.25em" }}
          >
            Sandra's Favourites
          </h2>
          <p className="text-sm sm:text-base md:text-[14px] text-stone-600 font-normal leading-relaxed max-w-[600px]">
            Proven prompts for effortless, polished photos that feel confident and very you
          </p>
        </div>

        {/* Category Filter */}
        <div
          className="flex gap-3 sm:gap-4 mb-6 sm:mb-8 overflow-x-auto pb-2 scrollbar-hide"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            WebkitOverflowScrolling: "touch",
            scrollSnapType: "x proximity",
            scrollPadding: "16px",
          }}
        >
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-4 sm:px-6 py-3 sm:py-3 rounded-full text-[10px] sm:text-[11px] font-medium tracking-[0.08em] uppercase whitespace-nowrap transition-all touch-manipulation active:scale-95 min-h-[44px] flex items-center scroll-snap-align-start ${
              selectedCategory === "all"
                ? "bg-stone-950 text-white border border-stone-950 shadow-[0_2px_12px_rgba(28,25,23,0.15)]"
                : "bg-white/60 border border-stone-200/60 text-stone-600 hover:bg-stone-50/80 hover:border-stone-300/80"
            }`}
          >
            All
          </button>
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 sm:px-6 py-3 sm:py-3 rounded-full text-[10px] sm:text-[11px] font-medium tracking-[0.08em] uppercase whitespace-nowrap transition-all touch-manipulation active:scale-95 min-h-[44px] flex items-center scroll-snap-align-start ${
                selectedCategory === category
                  ? "bg-stone-950 text-white border border-stone-950 shadow-[0_2px_12px_rgba(28,25,23,0.15)]"
                  : "bg-white/60 border border-stone-200/60 text-stone-600 hover:bg-stone-50/80 hover:border-stone-300/80"
              }`}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </button>
          ))}
        </div>

        {/* Prompts Grid */}
        {prompts.length === 0 ? (
          <div className="text-center py-24">
            <Sparkles size={48} className="mx-auto mb-4 text-stone-400" strokeWidth={1.5} />
            <h3 className="text-lg font-serif font-light tracking-[0.2em] uppercase text-stone-950 mb-2">
              No Prompts Available
            </h3>
            <p className="text-sm text-stone-600 max-w-md mx-auto">
              Check back soon for new prompt collections.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-12">
            {prompts.map((prompt) => (
              <button
                key={prompt.id}
                onClick={() => handlePromptClick(prompt)}
                className={`group bg-white border rounded-[20px] overflow-hidden cursor-pointer transition-all duration-300 text-left ${
                  selectedPrompt?.id === prompt.id
                    ? "border-stone-950 shadow-[0_12px_40px_rgba(28,25,23,0.06)] -translate-y-1"
                    : "border-stone-200/40 hover:border-stone-300/30 hover:shadow-[0_12px_40px_rgba(28,25,23,0.06)] hover:-translate-y-1"
                }`}
              >
                {/* Prompt Image */}
                <div className="w-full aspect-[3/4] relative bg-gradient-to-br from-stone-100 via-stone-200/50 to-stone-300/50 flex items-center justify-center">
                  {prompt.image_url ? (
                    <Image
                      src={prompt.image_url}
                      alt={prompt.concept_title || "Prompt preview"}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  ) : (
                    <span className="text-[10px] sm:text-[11px] tracking-[0.15em] uppercase text-stone-400 font-medium">
                      Preview
                    </span>
                  )}
                </div>

                {/* Prompt Info */}
                <div className="p-4 sm:p-5">
                  <h3 className="text-base sm:text-lg font-serif font-light tracking-[0.02em] text-stone-950 mb-2 sm:mb-3 leading-snug">
                    {prompt.concept_title || "Untitled Concept"}
                  </h3>
                  {prompt.category && (
                    <p className="text-[9px] sm:text-[10px] tracking-[0.15em] uppercase text-stone-400 font-medium">
                      {prompt.category.charAt(0).toUpperCase() + prompt.category.slice(1)}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Concept Preview (appears when prompt is selected) */}
        {selectedPrompt && (
          <div className="bg-white border border-stone-200/40 rounded-[24px] p-6 sm:p-8 mt-8 sm:mt-12 shadow-[0_8px_32px_rgba(28,25,23,0.04)]">
            <div className="mb-6 sm:mb-8">
              <h3 className="text-lg sm:text-xl font-serif font-light tracking-[0.02em] text-stone-950 mb-2 leading-snug">
                {selectedPrompt.concept_title || "Untitled Concept"}
              </h3>
              {selectedPrompt.guide_description && (
                <p className="text-sm sm:text-base text-stone-600 leading-relaxed">
                  {selectedPrompt.guide_description}
                </p>
              )}
            </div>

            {/* Image Slots */}
            <div className="flex gap-3 sm:gap-4 mb-6 sm:mb-8 justify-center flex-wrap">
              {[0, 1, 2].map((index) => {
                const image = previewImages[index]
                return (
                  <div
                    key={index}
                    className={`w-20 h-20 sm:w-22 sm:h-22 rounded-2xl flex items-center justify-center transition-all ${
                      image
                        ? "border-2 border-stone-200 bg-gradient-to-br from-stone-100 via-stone-200/50 to-stone-300/50 shadow-inner"
                        : "border-2 border-dashed border-stone-300/60 bg-stone-50/60 hover:border-stone-400/60 hover:bg-stone-100/80"
                    }`}
                  >
                    {image ? (
                      <Image
                        src={image.url}
                        alt={image.description || `Preview ${index + 1}`}
                        width={88}
                        height={88}
                        className="w-full h-full object-cover rounded-2xl"
                      />
                    ) : (
                      <span className="text-[10px] text-stone-400">+</span>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              className="w-full py-4 sm:py-[18px] bg-stone-950 text-white rounded-2xl text-xs sm:text-[12px] font-semibold tracking-[0.12em] uppercase transition-all touch-manipulation active:scale-95 hover:bg-stone-800 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(28,25,23,0.2)]"
            >
              Generate Photo
            </button>
            {previewImages.length > 0 && (
              <p className="text-[10px] sm:text-[11px] text-stone-400 mt-3 text-center tracking-[0.02em]">
                Using {previewImages.length} image{previewImages.length !== 1 ? "s" : ""} from your gallery
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

