"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, ChevronDown, ChevronUp } from "lucide-react"
import { DesignClasses, ComponentClasses } from "@/lib/design-tokens"
import { Button } from "@/components/ui/button"
import { BlueprintSelfieUpload } from "@/components/blueprint/blueprint-selfie-upload"
import useSWR, { mutate } from "swr"

// Feed style examples (V1)
const FEED_EXAMPLES_V1 = {
  luxury: {
    name: "Dark & Moody",
    colors: ["#0a0a0a", "#2d2d2d", "#4a4a4a"],
    grid: ["selfie", "selfie", "flatlay", "selfie", "selfie", "selfie", "flatlay", "selfie", "selfie"],
  },
  minimal: {
    name: "Light & Minimalistic",
    colors: ["#f5f5f5", "#e5e5e5", "#d4d4d4"],
    grid: ["selfie", "selfie", "selfie", "flatlay", "selfie", "selfie", "selfie", "flatlay", "selfie"],
  },
  beige: {
    name: "Beige Aesthetic",
    colors: ["#c9b8a8", "#a89384", "#8a7968"],
    grid: ["selfie", "flatlay", "selfie", "selfie", "selfie", "selfie", "selfie", "flatlay", "selfie"],
  },
}

// Feed style examples (V2 - 7 curated styles)
const FEED_EXAMPLES_V2 = {
  "Dark & Moody": {
    name: "Dark & Moody",
    colors: ["#0b0b0f", "#2a2a2f", "#4a4a4f"],
    grid: ["selfie", "selfie", "flatlay", "selfie", "selfie", "detail", "selfie", "flatlay", "selfie"],
  },
  "Beige Aesthetic": {
    name: "Beige Aesthetic",
    colors: ["#d2c2b0", "#b59f8a", "#8c7a67"],
    grid: ["selfie", "flatlay", "selfie", "selfie", "detail", "selfie", "selfie", "flatlay", "selfie"],
  },
  "Light & Minimalistic": {
    name: "Light & Minimalistic",
    colors: ["#f7f7f5", "#e6e6e2", "#d6d6d0"],
    grid: ["selfie", "selfie", "selfie", "flatlay", "selfie", "selfie", "selfie", "flatlay", "selfie"],
  },
  "Luxury Future Self": {
    name: "Luxury Future Self",
    colors: ["#1b1b1f", "#5a4d3f", "#c2b6a8"],
    grid: ["selfie", "selfie", "flatlay", "selfie", "detail", "selfie", "selfie", "flatlay", "selfie"],
  },
  "Casual Bohemian": {
    name: "Casual Bohemian",
    colors: ["#c4a58c", "#9c7f63", "#6e5a45"],
    grid: ["selfie", "flatlay", "selfie", "selfie", "detail", "selfie", "selfie", "flatlay", "selfie"],
  },
  "Athletic & Wellness": {
    name: "Athletic & Wellness",
    colors: ["#dfe6e3", "#9bb1a6", "#6b7a74"],
    grid: ["selfie", "selfie", "flatlay", "selfie", "detail", "selfie", "selfie", "flatlay", "selfie"],
  },
  "Coastal Aesthetics": {
    name: "Coastal Aesthetics",
    colors: ["#f3e9df", "#c7d7dd", "#a8b9c2"],
    grid: ["selfie", "selfie", "flatlay", "selfie", "detail", "selfie", "selfie", "flatlay", "selfie"],
  },
}

export type FeedStyle = keyof typeof FEED_EXAMPLES_V1 | keyof typeof FEED_EXAMPLES_V2

export interface FeedStyleModalData {
  feedStyle: FeedStyle
  visualAesthetic?: string[]
  feedStyleVariationId?: number | null
  selfieImages?: string[]
}

interface FeedStyleModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (data: FeedStyleModalData) => void
  defaultFeedStyle?: FeedStyle | null
  isLoading?: boolean
  isPreviewFeed?: boolean // Optional: true for preview feeds, false for full feeds
  useFeedPlannerV2?: boolean
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface FeedStyleVariationOption {
  id: number
  name: string
  description: string | null
  is_default: boolean
  sort_order: number
}

export default function FeedStyleModal({
  open,
  onOpenChange,
  onConfirm,
  defaultFeedStyle,
  isLoading = false,
  isPreviewFeed = false,
  useFeedPlannerV2 = false,
}: FeedStyleModalProps) {
  const [selectedStyle, setSelectedStyle] = useState<FeedStyle>(
    defaultFeedStyle || (useFeedPlannerV2 ? "Dark & Moody" : "minimal")
  )
  const [showAdvanced, setShowAdvanced] = useState(true) // Show advanced options by default
  const [selfieImages, setSelfieImages] = useState<string[]>([])
  const [selectedVariationId, setSelectedVariationId] = useState<number | null>(null)

  // Fetch user's current personal brand data
  const { data: personalBrandData, mutate: mutatePersonalBrand } = useSWR(
    open ? "/api/profile/personal-brand" : null,
    fetcher,
    {
      revalidateOnFocus: true, // Revalidate when modal opens
      dedupingInterval: 0, // Always fetch fresh data when modal opens
    }
  )

  // Fetch user's current avatar images
  const { data: avatarImagesData } = useSWR(
    open ? "/api/images?type=avatar" : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  )

  const { data: variationData } = useSWR(
    open && useFeedPlannerV2 ? `/api/feed-planner/v2/variations?style=${encodeURIComponent(selectedStyle)}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  )

  // Load current user values when modal opens
  useEffect(() => {
    if (open) {
      // Revalidate when modal opens to get latest data
      mutatePersonalBrand()
    }
  }, [open, mutatePersonalBrand])

  // Update selections when data loads
  useEffect(() => {
    if (open && personalBrandData?.data) {
      console.log('[Feed Style Modal] Loading personal brand data:', {
        settingsPreference: personalBrandData.data.settingsPreference,
      })
      
      let feedStyleFromSettings: FeedStyle | null = null
      // Load feed style from settings_preference[0] (synced from previous selections)
      // This ensures the modal shows the user's last selected feed style
      if (personalBrandData.data.settingsPreference) {
        try {
          const settings = Array.isArray(personalBrandData.data.settingsPreference)
            ? personalBrandData.data.settingsPreference
            : typeof personalBrandData.data.settingsPreference === 'string'
            ? JSON.parse(personalBrandData.data.settingsPreference)
            : []
          
          if (Array.isArray(settings) && settings.length > 0) {
            const rawSettingsValue = String(settings[0] || '').trim()
            const settingsValue = rawSettingsValue.toLowerCase()
            if (useFeedPlannerV2) {
              const v2Match = Object.keys(FEED_EXAMPLES_V2).find(
                (style) => style.toLowerCase() === settingsValue
              )
              if (v2Match) {
                feedStyleFromSettings = v2Match as FeedStyle
                setSelectedStyle(feedStyleFromSettings)
                console.log('[Feed Style Modal] Loaded V2 feed style from settings_preference:', v2Match)
              }
            } else if (settingsValue === 'luxury' || settingsValue === 'minimal' || settingsValue === 'beige') {
              feedStyleFromSettings = settingsValue as FeedStyle
              setSelectedStyle(feedStyleFromSettings)
              console.log('[Feed Style Modal] Loaded feed style from settings_preference:', settingsValue)
            }
          }
        } catch (e) {
          console.warn('[Feed Style Modal] Failed to parse settingsPreference for feed style:', e)
        }
      }

      if (useFeedPlannerV2 && personalBrandData.data.feedStyleVariationId !== undefined) {
        const variationId = Number(personalBrandData.data.feedStyleVariationId)
        if (Number.isFinite(variationId)) {
          setSelectedVariationId(variationId)
        }
      }
      
      // Fashion style selection removed for V2
    } else if (!open) {
      // Reset selections when modal closes
      setSelectedVariationId(null)
    }
  }, [open, personalBrandData])

  // Load current avatar images
  useEffect(() => {
    if (open && avatarImagesData?.images) {
      const imageUrls = avatarImagesData.images.map((img: any) => img.image_url || img)
      setSelfieImages(imageUrls)
    }
  }, [open, avatarImagesData])

  // Update selected style when default changes
  useEffect(() => {
    if (defaultFeedStyle) {
      setSelectedStyle(defaultFeedStyle)
    }
  }, [defaultFeedStyle])

  useEffect(() => {
    if (!useFeedPlannerV2) return
    const variations = (variationData?.variations || []) as FeedStyleVariationOption[]
    if (variations.length === 0) {
      setSelectedVariationId(null)
      return
    }
    const defaultId =
      variationData?.defaultVariationId ||
      variations.find((variation) => variation.is_default)?.id ||
      variations[0]?.id
    if (!selectedVariationId || !variations.some((variation) => variation.id === selectedVariationId)) {
      setSelectedVariationId(defaultId ? Number(defaultId) : null)
    }
  }, [variationData, useFeedPlannerV2, selectedStyle, selectedVariationId])

  // Reset advanced section when modal closes
  useEffect(() => {
    if (!open) {
      setShowAdvanced(false)
    }
  }, [open])

  const handleConfirm = () => {
    onConfirm({
      feedStyle: selectedStyle,
      feedStyleVariationId: selectedVariationId,
      selfieImages: selfieImages.length > 0 ? selfieImages : undefined,
    })
  }

  if (!open) return null

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop - matching unified wizard */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-stone-950/60 backdrop-blur-sm z-100"
            onClick={() => onOpenChange(false)}
          />

          {/* Modal - matching unified wizard */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-100 flex items-center justify-center p-4 pb-24 sm:pb-28 md:pb-32"
            onClick={(e) => e.stopPropagation()}
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 6rem)" }}
          >
            <div
              className={`w-full max-w-4xl max-h-[90vh] overflow-y-auto ${ComponentClasses.card} ${DesignClasses.spacing.padding.lg} relative rounded-2xl shadow-2xl bg-white`}
            >
              {/* Close Button - matching unified wizard */}
              <button
                onClick={() => onOpenChange(false)}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg transition-colors z-10 hover:bg-stone-100 text-stone-600 hover:text-stone-950"
                aria-label="Close"
              >
                <X size={18} />
              </button>

              <div className="space-y-8 py-6">
                {/* Title - matching unified wizard typography */}
                <div>
                  <h2
                    style={{ fontFamily: "'Times New Roman', serif" }}
                    className="text-2xl sm:text-3xl md:text-4xl font-light tracking-[0.15em] uppercase text-stone-950 mb-3"
                  >
                    Choose Feed Style
                  </h2>
                  <p className="text-sm font-light text-stone-600 leading-relaxed">
                    Select the visual style for this feed. You can use your last selection or choose a different style.
                  </p>
                </div>

                <div className="space-y-6">
                  {/* Feed Style Selection */}
                  <div>
                    <label className="block text-[10px] sm:text-xs font-medium tracking-wider uppercase text-stone-700 mb-4">
                      Feed Style
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
                      {Object.entries(useFeedPlannerV2 ? FEED_EXAMPLES_V2 : FEED_EXAMPLES_V1).map(([key, style]) => {
                        const feedStyle = key as FeedStyle
                        const isSelected = selectedStyle === feedStyle
                        const isDefault = defaultFeedStyle === feedStyle

                        return (
                          <div
                            key={key}
                            onClick={() => setSelectedStyle(feedStyle)}
                            className={`cursor-pointer transition-all duration-300 ${
                              isSelected ? "scale-105" : "hover:scale-102"
                            }`}
                          >
                            <div
                              className={`border-2 p-4 bg-white ${
                                isSelected ? "border-stone-950" : "border-stone-200"
                              }`}
                            >
                              {/* Grid Preview */}
                              <div className="grid grid-cols-3 gap-2 mb-4">
                                {style.grid.map((type, idx) => (
                                  <div
                                    key={idx}
                                    className={`aspect-square rounded ${
                                      feedStyle === "minimal" ? "border border-stone-300" : ""
                                    }`}
                                    style={{
                                      backgroundColor:
                                        type === "selfie" ? style.colors[0] : style.colors[1],
                                    }}
                                  />
                                ))}
                              </div>

                              {/* Style Name */}
                              <h3 className="text-sm font-medium tracking-wider uppercase text-stone-950 mb-2">
                                {style.name}
                              </h3>

                              {/* Color Swatches */}
                              <div className="flex gap-2 mb-4">
                                {style.colors.map((color, idx) => (
                                  <div
                                    key={idx}
                                    className={`w-6 h-6 rounded-full ${
                                      feedStyle === "minimal"
                                        ? "border border-stone-300"
                                        : "border border-stone-200"
                                    }`}
                                    style={{ backgroundColor: color }}
                                  />
                                ))}
                              </div>

                              {/* Selection Button */}
                              <button
                                className={`w-full py-3 text-xs tracking-[0.2em] sm:tracking-[0.3em] uppercase border transition-all duration-200 ${
                                  isSelected
                                    ? "border-stone-950 bg-stone-950 text-stone-50"
                                    : "border-stone-300 text-stone-700 hover:border-stone-950"
                                }`}
                              >
                                {isSelected ? "SELECTED" : "SELECT"}
                              </button>

                              {/* Default Badge */}
                              {isDefault && !isSelected && (
                                <p className="text-[10px] text-stone-500 mt-2 text-center">
                                  (Your last selection)
                                </p>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {useFeedPlannerV2 && (
                    <div>
                      <label className="block text-[10px] sm:text-xs font-medium tracking-wider uppercase text-stone-700 mb-4">
                        Choose Variation
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {(variationData?.variations || []).map((variation: FeedStyleVariationOption) => {
                          const isSelected = selectedVariationId === variation.id
                          return (
                            <button
                              key={variation.id}
                              onClick={() => setSelectedVariationId(variation.id)}
                              className={`w-full text-left p-4 border transition-all duration-200 ${
                                isSelected
                                  ? "border-stone-950 bg-stone-950 text-stone-50"
                                  : "border-stone-300 text-stone-700 hover:border-stone-950 bg-white"
                              }`}
                            >
                              <div className="text-xs tracking-wider uppercase font-medium">{variation.name}</div>
                              {variation.description ? (
                                <p className={`text-xs mt-2 ${isSelected ? "text-stone-200" : "text-stone-500"}`}>
                                  {variation.description}
                                </p>
                              ) : null}
                            </button>
                          )
                        })}
                      </div>
                      {variationData?.variations?.length === 0 && (
                        <p className="text-xs text-stone-500 mt-3">
                          No variations are available yet for this style.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Advanced Options Toggle */}
                  <div className="pt-4 border-t border-stone-200">
                    <button
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      className="w-full flex items-center justify-between py-3 text-sm font-medium text-stone-700 hover:text-stone-950 transition-colors"
                    >
                      <span className="uppercase tracking-wider">Advanced Options</span>
                      {showAdvanced ? (
                        <ChevronUp size={20} className="text-stone-600" />
                      ) : (
                        <ChevronDown size={20} className="text-stone-600" />
                      )}
                    </button>

                    {/* Advanced Options Content */}
                    <AnimatePresence>
                      {showAdvanced && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <div className="pt-6 space-y-6">
                            {/* Selfie Upload */}
                            <div>
                              <label className="block text-[10px] sm:text-xs font-medium tracking-wider uppercase text-stone-700 mb-4">
                                Reference Images (Optional)
                              </label>
                              <p className="text-xs font-light text-stone-500 mb-4">
                                Upload 1-3 selfies to use as reference images for generating your feed.
                                These will help AI generate images that match your style and aesthetic.
                              </p>
                              <BlueprintSelfieUpload
                                onUploadComplete={(imageUrls) => {
                                  setSelfieImages(imageUrls)
                                }}
                                maxImages={3}
                                initialImages={selfieImages}
                              />
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Action Buttons - matching unified wizard style */}
                  <div className="flex items-center justify-between pt-6 border-t border-stone-200">
                    <Button
                      variant="ghost"
                      onClick={() => onOpenChange(false)}
                      disabled={isLoading}
                      className="text-stone-600 hover:text-stone-950 hover:bg-stone-50 transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </Button>

                    <Button
                      onClick={handleConfirm}
                      disabled={isLoading}
                      className="bg-stone-950 hover:bg-stone-800 text-white px-6 sm:px-8 py-3 sm:py-4 text-sm font-medium uppercase tracking-wider transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg shadow-stone-900/20 disabled:opacity-50"
                    >
                      {isLoading
                        ? isPreviewFeed
                          ? "Creating Preview..."
                          : "Creating Feed..."
                        : isPreviewFeed
                          ? "Create Preview"
                          : "Create Feed"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
