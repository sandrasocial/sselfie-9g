"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, ChevronDown, ChevronUp } from "lucide-react"
import { DesignClasses, ComponentClasses } from "@/lib/design-tokens"
import { Button } from "@/components/ui/button"
import { BlueprintSelfieUpload } from "@/components/blueprint/blueprint-selfie-upload"
import useSWR, { mutate } from "swr"

// Visual aesthetics (from unified wizard)
const VISUAL_AESTHETICS = [
  { id: "minimal", name: "Minimal", description: "Clean, simple, uncluttered" },
  { id: "luxury", name: "Luxury", description: "Elegant, sophisticated, premium" },
  { id: "warm", name: "Warm", description: "Cozy, inviting, comfortable" },
  { id: "edgy", name: "Edgy", description: "Bold, unconventional, daring" },
  { id: "professional", name: "Professional", description: "Polished, corporate, refined" },
  { id: "beige", name: "Beige Aesthetic", description: "Neutral, earthy, calm" },
]

// Fashion styles (from unified wizard)
const FASHION_STYLES = [
  { id: "casual", name: "Casual", description: "Everyday, relaxed, comfortable" },
  { id: "business", name: "Business", description: "Professional, formal, polished" },
  { id: "bohemian", name: "Bohemian", description: "Free-spirited, artistic, eclectic" },
  { id: "classic", name: "Classic", description: "Timeless, elegant, enduring" },
  { id: "trendy", name: "Trendy", description: "Fashion-forward, current, modern" },
  { id: "athletic", name: "Athletic", description: "Sporty, active, functional" },
]

// Feed style examples (reused from unified wizard)
const feedExamples = {
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

export type FeedStyle = "luxury" | "minimal" | "beige"

export interface FeedStyleModalData {
  feedStyle: FeedStyle
  visualAesthetic?: string[]
  fashionStyle?: string[]
  selfieImages?: string[]
}

interface FeedStyleModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (data: FeedStyleModalData) => void
  defaultFeedStyle?: FeedStyle | null
  isLoading?: boolean
  isPreviewFeed?: boolean // Optional: true for preview feeds, false for full feeds
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function FeedStyleModal({
  open,
  onOpenChange,
  onConfirm,
  defaultFeedStyle,
  isLoading = false,
  isPreviewFeed = false,
}: FeedStyleModalProps) {
  const [selectedStyle, setSelectedStyle] = useState<FeedStyle>(defaultFeedStyle || "minimal")
  const [showAdvanced, setShowAdvanced] = useState(true) // Show advanced options by default
  const [selectedVisualAesthetic, setSelectedVisualAesthetic] = useState<string[]>([])
  const [selectedFashionStyle, setSelectedFashionStyle] = useState<string[]>([])
  const [selfieImages, setSelfieImages] = useState<string[]>([])

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
        visualAesthetic: personalBrandData.data.visualAesthetic,
        fashionStyle: personalBrandData.data.fashionStyle,
      })
      
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
            const feedStyleFromSettings = settings[0]?.toLowerCase().trim()
            if (feedStyleFromSettings === 'luxury' || feedStyleFromSettings === 'minimal' || feedStyleFromSettings === 'beige') {
              setSelectedStyle(feedStyleFromSettings as FeedStyle)
              console.log('[Feed Style Modal] Loaded feed style from settings_preference:', feedStyleFromSettings)
            }
          }
        } catch (e) {
          console.warn('[Feed Style Modal] Failed to parse settingsPreference for feed style:', e)
        }
      }
      
      // Load visual aesthetic - handle both arrays and JSON strings
      let visualAesthetic = personalBrandData.data.visualAesthetic
      if (typeof visualAesthetic === 'string') {
        try {
          // Try to parse the JSON string
          visualAesthetic = JSON.parse(visualAesthetic)
          
          // If still a string after parsing, try parsing again (double-stringified)
          if (typeof visualAesthetic === 'string') {
            try {
              visualAesthetic = JSON.parse(visualAesthetic)
            } catch (e2) {
              // If second parse fails, it might be a malformed string like '{"luxury"}'
              // Try to extract keys from the string directly
              const keyMatch = visualAesthetic.match(/"([^"]+)"/)
              if (keyMatch) {
                visualAesthetic = [keyMatch[1]]
                console.log('[Feed Style Modal] Extracted key from malformed JSON:', visualAesthetic)
              } else {
                throw e2
              }
            }
          }
          
          // If it's an object (like {"luxury": true} or {"luxury": ""}), convert to array of keys
          if (typeof visualAesthetic === 'object' && !Array.isArray(visualAesthetic) && visualAesthetic !== null) {
            visualAesthetic = Object.keys(visualAesthetic)
          }
        } catch (e) {
          console.warn('[Feed Style Modal] Failed to parse visualAesthetic:', e)
          // Try to extract key from malformed string like '{"luxury"}'
          const keyMatch = visualAesthetic.match(/"([^"]+)"/)
          if (keyMatch) {
            visualAesthetic = [keyMatch[1]]
            console.log('[Feed Style Modal] Extracted key from malformed string:', visualAesthetic)
          } else {
            visualAesthetic = null
          }
        }
      }
      
      // Also handle if it's an object (convert to array)
      if (typeof visualAesthetic === 'object' && !Array.isArray(visualAesthetic) && visualAesthetic !== null) {
        visualAesthetic = Object.keys(visualAesthetic)
      }
      
      if (Array.isArray(visualAesthetic) && visualAesthetic.length > 0) {
        setSelectedVisualAesthetic(visualAesthetic)
        console.log('[Feed Style Modal] Set visual aesthetic:', visualAesthetic)
      } else {
        // Reset if no data or empty array
        setSelectedVisualAesthetic([])
      }

      // Load fashion style - handle both arrays and JSON strings
      let fashionStyle = personalBrandData.data.fashionStyle
      if (typeof fashionStyle === 'string') {
        try {
          // Try to parse the JSON string
          fashionStyle = JSON.parse(fashionStyle)
          
          // If still a string after parsing, try parsing again (double-stringified)
          if (typeof fashionStyle === 'string') {
            try {
              fashionStyle = JSON.parse(fashionStyle)
            } catch (e2) {
              // If second parse fails, it might be a malformed string like '{"athletic"}'
              // Try to extract keys from the string directly
              const keyMatch = fashionStyle.match(/"([^"]+)"/)
              if (keyMatch) {
                fashionStyle = [keyMatch[1]]
                console.log('[Feed Style Modal] Extracted key from malformed JSON:', fashionStyle)
              } else {
                throw e2
              }
            }
          }
          
          // If it's an object (like {"athletic": true} or {"athletic": ""}), convert to array of keys
          if (typeof fashionStyle === 'object' && !Array.isArray(fashionStyle) && fashionStyle !== null) {
            fashionStyle = Object.keys(fashionStyle)
          }
        } catch (e) {
          console.warn('[Feed Style Modal] Failed to parse fashionStyle:', e)
          // Try to extract key from malformed string like '{"athletic"}'
          const keyMatch = fashionStyle.match(/"([^"]+)"/)
          if (keyMatch) {
            fashionStyle = [keyMatch[1]]
            console.log('[Feed Style Modal] Extracted key from malformed string:', fashionStyle)
          } else {
            fashionStyle = null
          }
        }
      }
      
      // Also handle if it's an object (convert to array)
      if (typeof fashionStyle === 'object' && !Array.isArray(fashionStyle) && fashionStyle !== null) {
        fashionStyle = Object.keys(fashionStyle)
      }
      
      if (Array.isArray(fashionStyle) && fashionStyle.length > 0) {
        setSelectedFashionStyle(fashionStyle)
        console.log('[Feed Style Modal] Set fashion style:', fashionStyle)
      } else {
        // Reset if no data or empty array
        setSelectedFashionStyle([])
      }
    } else if (!open) {
      // Reset selections when modal closes
      setSelectedVisualAesthetic([])
      setSelectedFashionStyle([])
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

  // Reset advanced section when modal closes
  useEffect(() => {
    if (!open) {
      setShowAdvanced(false)
    }
  }, [open])

  const handleMultiSelectToggle = (type: "visualAesthetic" | "fashionStyle", id: string) => {
    if (type === "visualAesthetic") {
      setSelectedVisualAesthetic((prev) =>
        prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
      )
    } else {
      setSelectedFashionStyle((prev) =>
        prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
      )
    }
  }

  const handleConfirm = () => {
    onConfirm({
      feedStyle: selectedStyle,
      visualAesthetic: selectedVisualAesthetic.length > 0 ? selectedVisualAesthetic : undefined,
      fashionStyle: selectedFashionStyle.length > 0 ? selectedFashionStyle : undefined,
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
            className="fixed inset-0 bg-stone-950/60 backdrop-blur-sm z-[100]"
            onClick={() => onOpenChange(false)}
          />

          {/* Modal - matching unified wizard */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 pb-24 sm:pb-28 md:pb-32"
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
                      {Object.entries(feedExamples).map(([key, style]) => {
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
                            {/* Visual Aesthetic Selection */}
                            <div>
                              <label className="block text-[10px] sm:text-xs font-medium tracking-wider uppercase text-stone-700 mb-4">
                                Visual Aesthetic (Select all that apply)
                              </label>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {VISUAL_AESTHETICS.map((aesthetic) => {
                                  const isSelected = selectedVisualAesthetic.includes(aesthetic.id)
                                  return (
                                    <button
                                      key={aesthetic.id}
                                      onClick={() =>
                                        handleMultiSelectToggle("visualAesthetic", aesthetic.id)
                                      }
                                      className={`py-3 px-4 text-[10px] sm:text-xs tracking-wider uppercase border transition-all duration-200 text-left ${
                                        isSelected
                                          ? "border-stone-950 bg-stone-950 text-stone-50"
                                          : "border-stone-300 text-stone-700 hover:border-stone-950 bg-white"
                                      }`}
                                    >
                                      {aesthetic.name}
                                    </button>
                                  )
                                })}
                              </div>
                            </div>

                            {/* Fashion Style Selection */}
                            <div>
                              <label className="block text-[10px] sm:text-xs font-medium tracking-wider uppercase text-stone-700 mb-4">
                                Fashion Style (Select all that apply)
                              </label>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {FASHION_STYLES.map((style) => {
                                  const isSelected = selectedFashionStyle.includes(style.id)
                                  return (
                                    <button
                                      key={style.id}
                                      onClick={() =>
                                        handleMultiSelectToggle("fashionStyle", style.id)
                                      }
                                      className={`py-3 px-4 text-[10px] sm:text-xs tracking-wider uppercase border transition-all duration-200 text-left ${
                                        isSelected
                                          ? "border-stone-950 bg-stone-950 text-stone-50"
                                          : "border-stone-300 text-stone-700 hover:border-stone-950 bg-white"
                                      }`}
                                    >
                                      {style.name}
                                    </button>
                                  )
                                })}
                              </div>
                            </div>

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
