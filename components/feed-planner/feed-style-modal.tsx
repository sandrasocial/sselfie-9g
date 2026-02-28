"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, ChevronDown, ChevronUp } from "lucide-react"
import { DesignClasses } from "@/lib/design-tokens"
import { Button } from "@/components/ui/button"
import { BlueprintSelfieUpload } from "@/components/blueprint/blueprint-selfie-upload"
import useSWR, { mutate } from "swr"

// Feed style examples (V2 - 7 curated styles)
// V1 code removed - V2 is always enabled
const FEED_EXAMPLES = {
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

export type FeedStyle = keyof typeof FEED_EXAMPLES

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
  defaultFeedStyleVariationId?: number | null // Current feed's variation_id (for existing feeds)
  isLoading?: boolean
  isPreviewFeed?: boolean // Optional: true for preview feeds, false for full feeds
  // V2 is always enabled - useFeedPlannerV2 prop removed
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
  defaultFeedStyleVariationId,
  isLoading = false,
  isPreviewFeed = false,
}: FeedStyleModalProps) {
  // V2 is always enabled
  
  const [selectedStyle, setSelectedStyle] = useState<FeedStyle>(
    defaultFeedStyle || "Dark & Moody"
  )
  const [showAdvanced, setShowAdvanced] = useState(true) // Show advanced options by default
  const [selfieImages, setSelfieImages] = useState<string[]>([])
  const [selectedVariationId, setSelectedVariationId] = useState<number | null>(defaultFeedStyleVariationId ?? null)

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
    open ? `/api/feed-planner/v2/variations?style=${encodeURIComponent(selectedStyle)}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  )

  // Track if user explicitly selected variation (prevents auto-reset)
  const userExplicitlySelectedVariationRef = useRef(false)
  const previousStyleRef = useRef<FeedStyle | null>(selectedStyle)
  const hasInitializedRef = useRef(false)

  // SIMPLIFIED: ONE useEffect for initialization only (runs once when modal opens)
  useEffect(() => {
    if (!open) {
      // Reset everything when modal closes
      setSelectedVariationId(null)
      userExplicitlySelectedVariationRef.current = false
      previousStyleRef.current = null
      hasInitializedRef.current = false
      mutatePersonalBrand() // Refresh for next open
      return
    }

    // Only initialize once when modal opens (not on every data change)
    if (hasInitializedRef.current) {
      return // Already initialized, don't override user's selections
    }

    hasInitializedRef.current = true
    previousStyleRef.current = selectedStyle

    // Load feed style from personal brand (if no defaultFeedStyle provided)
    if (!defaultFeedStyle && personalBrandData?.data?.settingsPreference) {
      try {
        const settings = Array.isArray(personalBrandData.data.settingsPreference)
          ? personalBrandData.data.settingsPreference
          : typeof personalBrandData.data.settingsPreference === 'string'
          ? JSON.parse(personalBrandData.data.settingsPreference)
          : []
        
        if (Array.isArray(settings) && settings.length > 0) {
          const rawSettingsValue = String(settings[0] || '').trim()
          const settingsValue = rawSettingsValue.toLowerCase()
          const v2Match = Object.keys(FEED_EXAMPLES).find(
            (style) => style.toLowerCase() === settingsValue
          )
          if (v2Match) {
            setSelectedStyle(v2Match as FeedStyle)
            previousStyleRef.current = v2Match as FeedStyle
            console.log('[Feed Style Modal] Initialized style from personal brand:', v2Match)
          }
        }
      } catch (e) {
        console.warn('[Feed Style Modal] Failed to parse settingsPreference:', e)
      }
    }

    // Load variation (priority: feed data > personal brand > default)
    if (defaultFeedStyleVariationId !== undefined && defaultFeedStyleVariationId !== null) {
      setSelectedVariationId(defaultFeedStyleVariationId)
      console.log('[Feed Style Modal] Initialized variation from feed data:', defaultFeedStyleVariationId)
    } else if (personalBrandData?.data?.feedStyleVariationId !== undefined) {
      const variationId = Number(personalBrandData.data.feedStyleVariationId)
      if (Number.isFinite(variationId)) {
        setSelectedVariationId(variationId)
        console.log('[Feed Style Modal] Initialized variation from personal brand:', variationId)
      }
    }
    // If no variation found, wait for variationData to load and set default
  }, [open]) // ONLY run when modal opens/closes

  // Set default variation when variationData loads (only if no variation is set yet)
  useEffect(() => {
    if (!open || !variationData || userExplicitlySelectedVariationRef.current) return
    
    const variations = (variationData?.variations || []) as FeedStyleVariationOption[]
    if (variations.length === 0) return

    // Only set default if no variation is currently selected
    if (selectedVariationId === null) {
      const defaultId =
        variationData?.defaultVariationId ||
        variations.find((variation) => variation.is_default)?.id ||
        variations[0]?.id
      if (defaultId) {
        console.log('[Feed Style Modal] Setting default variation on load:', defaultId)
        setSelectedVariationId(Number(defaultId))
      }
    }
  }, [open, variationData, selectedVariationId]) // Only set default if null

  // Handle style change - reset variation to default for new style
  useEffect(() => {
    if (!open) return
    
    const styleChanged = previousStyleRef.current !== selectedStyle && previousStyleRef.current !== null
    if (styleChanged) {
      console.log('[Feed Style Modal] Style changed, resetting variation')
      previousStyleRef.current = selectedStyle
      userExplicitlySelectedVariationRef.current = false // Allow auto-selection for new style
      setSelectedVariationId(null) // Will be set by variationData effect
    }
  }, [open, selectedStyle])

  // Load current avatar images
  useEffect(() => {
    if (open && avatarImagesData?.images) {
      const imageUrls = avatarImagesData.images.map((img: any) => img.image_url || img)
      setSelfieImages(imageUrls)
    }
  }, [open, avatarImagesData])

  // Reset advanced section when modal closes
  useEffect(() => {
    if (!open) {
      setShowAdvanced(false)
    }
  }, [open])

  const handleConfirm = () => {
    console.log('[Feed Style Modal] Confirming selection:', {
      feedStyle: selectedStyle,
      feedStyleVariationId: selectedVariationId,
      userExplicitlySelected: userExplicitlySelectedVariationRef.current,
    })
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
            className="fixed inset-0 z-100 bg-black/70 backdrop-blur-md"
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
              className={`relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/15 bg-[rgba(13,15,19,0.94)] ${DesignClasses.spacing.padding.lg} text-white shadow-2xl backdrop-blur-2xl`}
            >
              {/* Close Button - matching unified wizard */}
              <button
                onClick={() => onOpenChange(false)}
                className="absolute top-4 right-4 z-10 flex h-8 w-8 items-center justify-center rounded-lg text-white/65 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Close"
              >
                <X size={18} />
              </button>

              <div className="space-y-8 py-6">
                {/* Title - matching unified wizard typography */}
                <div>
                  <h2
                    style={{ fontFamily: "'Cormorant Garamond', serif" }}
                    className="mb-3 text-2xl font-light uppercase tracking-[0.15em] text-white sm:text-3xl md:text-4xl"
                  >
                    Choose Feed Style
                  </h2>
                  <p className="text-sm font-light leading-relaxed text-white/65">
                    Select the visual style for this feed. You can use your last selection or choose a different style.
                  </p>
                </div>

                <div className="space-y-6">
                  {/* Feed Style Selection */}
                  <div>
                    <label className="mb-4 block text-[10px] sm:text-xs font-medium tracking-wider uppercase text-white/70">
                      Feed Style
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
                      {Object.entries(FEED_EXAMPLES).map(([key, style]) => {
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
                              className={`border p-4 rounded-2xl backdrop-blur-xl ${
                                isSelected ? "border-white/40 bg-white/18" : "border-white/15 bg-white/[0.04]"
                              }`}
                            >
                              {/* Grid Preview */}
                              <div className="grid grid-cols-3 gap-2 mb-4">
                                {style.grid.map((type, idx) => (
                                  <div
                                    key={idx}
                                    className={`aspect-square rounded ${
                                      feedStyle === "minimal" ? "border border-white/35" : ""
                                    }`}
                                    style={{
                                      backgroundColor:
                                        type === "selfie" ? style.colors[0] : style.colors[1],
                                    }}
                                  />
                                ))}
                              </div>

                              {/* Style Name */}
                              <h3 className="mb-2 text-sm font-medium uppercase tracking-wider text-white">
                                {style.name}
                              </h3>

                              {/* Color Swatches */}
                              <div className="flex gap-2 mb-4">
                                {style.colors.map((color, idx) => (
                                  <div
                                    key={idx}
                                    className={`w-6 h-6 rounded-full ${
                                      feedStyle === "minimal"
                                        ? "border border-white/35"
                                        : "border border-white/15"
                                    }`}
                                    style={{ backgroundColor: color }}
                                  />
                                ))}
                              </div>

                              {/* Selection Button */}
                              <button
                                className={`w-full border py-3 text-xs uppercase tracking-[0.2em] transition-all duration-200 sm:tracking-[0.3em] ${
                                  isSelected
                                    ? "border-white/35 bg-white/20 text-white"
                                    : "border-white/20 bg-white/[0.03] text-white/75 hover:border-white/40 hover:text-white"
                                }`}
                              >
                                {isSelected ? "SELECTED" : "SELECT"}
                              </button>

                              {/* Default Badge */}
                              {isDefault && !isSelected && (
                                <p className="mt-2 text-center text-[10px] text-white/50">
                                  (Your last selection)
                                </p>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {(
                    <div>
                      <label className="mb-4 block text-[10px] sm:text-xs font-medium tracking-wider uppercase text-white/70">
                        Choose Variation
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {(variationData?.variations || []).map((variation: FeedStyleVariationOption) => {
                          const isSelected = selectedVariationId === variation.id
                          return (
                            <button
                              key={variation.id}
                              onClick={() => {
                                console.log('[Feed Style Modal] User explicitly selected variation:', variation.id, variation.name)
                                // Mark as user selection to prevent auto-reset
                                userExplicitlySelectedVariationRef.current = true
                                setSelectedVariationId(variation.id)
                              }}
                              className={`w-full border p-4 text-left transition-all duration-200 ${
                                isSelected
                                  ? "border-white/35 bg-white/20 text-white"
                                  : "border-white/20 bg-white/[0.04] text-white/75 hover:border-white/40 hover:text-white"
                              }`}
                            >
                              <div className="text-xs tracking-wider uppercase font-medium">{variation.name}</div>
                              {variation.description ? (
                                <p className={`mt-2 text-xs ${isSelected ? "text-white/75" : "text-white/55"}`}>
                                  {variation.description}
                                </p>
                              ) : null}
                            </button>
                          )
                        })}
                      </div>
                      {variationData?.variations?.length === 0 && (
                        <p className="mt-3 text-xs text-white/55">
                          No variations are available yet for this style.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Advanced Options Toggle */}
                  <div className="border-t border-white/15 pt-4">
                    <button
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      className="flex w-full items-center justify-between py-3 text-sm font-medium text-white/80 transition-colors hover:text-white"
                    >
                      <span className="uppercase tracking-wider">Advanced Options</span>
                      {showAdvanced ? (
                        <ChevronUp size={20} className="text-white/70" />
                      ) : (
                        <ChevronDown size={20} className="text-white/70" />
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
                              <label className="mb-4 block text-[10px] sm:text-xs font-medium tracking-wider uppercase text-white/70">
                                Reference Images (Optional)
                              </label>
                              <p className="mb-4 text-xs font-light text-white/55">
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
                  <div className="flex items-center justify-between pt-6 border-t border-white/15">
                    <Button
                      variant="ghost"
                      onClick={() => onOpenChange(false)}
                      disabled={isLoading}
                      className="text-white/70 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </Button>

                    <Button
                      onClick={handleConfirm}
                      disabled={isLoading}
                      className="border border-white/25 bg-white/12 px-6 py-3 text-sm font-medium uppercase tracking-wider text-white transition-all duration-200 hover:scale-105 hover:bg-white/18 active:scale-95 sm:px-8 sm:py-4 disabled:opacity-50"
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
