"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"
import { DesignClasses, ComponentClasses } from "@/lib/design-tokens"
import { Button } from "@/components/ui/button"

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

interface FeedStyleModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (feedStyle: FeedStyle) => void
  defaultFeedStyle?: FeedStyle | null
  isLoading?: boolean
}

export default function FeedStyleModal({
  open,
  onOpenChange,
  onConfirm,
  defaultFeedStyle,
  isLoading = false,
}: FeedStyleModalProps) {
  const [selectedStyle, setSelectedStyle] = useState<FeedStyle>(defaultFeedStyle || "minimal")

  // Update selected style when default changes
  useEffect(() => {
    if (defaultFeedStyle) {
      setSelectedStyle(defaultFeedStyle)
    }
  }, [defaultFeedStyle])

  const handleConfirm = () => {
    onConfirm(selectedStyle)
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
                    <div className={`border-2 p-4 bg-white ${
                      isSelected ? "border-stone-950" : "border-stone-200"
                    }`}>
                      {/* Grid Preview */}
                      <div className="grid grid-cols-3 gap-2 mb-4">
                        {style.grid.map((type, idx) => (
                          <div
                            key={idx}
                            className={`aspect-square rounded ${
                              feedStyle === "minimal" ? "border border-stone-300" : ""
                            }`}
                            style={{
                              backgroundColor: type === "selfie" ? style.colors[0] : style.colors[1],
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
                              feedStyle === "minimal" ? "border border-stone-300" : "border border-stone-200"
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
                      {isLoading ? "Creating Feed..." : "Create Feed"}
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
