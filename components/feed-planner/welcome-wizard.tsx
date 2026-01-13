"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { motion, AnimatePresence } from "framer-motion"
import { Sparkles, Grid3x3, FileText, Check, ArrowRight, X, Image as ImageIcon, Palette } from "lucide-react"
import { DesignClasses, ComponentClasses } from "@/lib/design-tokens"
import useSWR from "swr"
import Image from "next/image"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

// Feed style examples (matching unified wizard)
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

interface WelcomeWizardProps {
  open: boolean
  onComplete: () => void
  onDismiss?: () => void
  onUsePreviewStyle?: () => void // Callback when user chooses to use preview style
  onChooseNewStyle?: () => void // Callback when user chooses to select new style
  onFeedStyleSelected?: (feedStyle: FeedStyle) => void // Callback when user selects a feed style
  defaultFeedStyle?: FeedStyle | null // User's last selected feed style
}

/**
 * Welcome Wizard for Paid Blueprint Users
 * 
 * Interactive tutorial matching the unified wizard style
 * Explains how to use the full feed planner with consistent UI
 * 
 * If user has a preview feed, shows preview image in first step with options to:
 * - Use preview style (create feed with existing data)
 * - Choose new style (open onboarding wizard at step 4)
 */
export default function WelcomeWizard({ 
  open, 
  onComplete, 
  onDismiss,
  onUsePreviewStyle,
  onChooseNewStyle,
  onFeedStyleSelected,
  defaultFeedStyle,
}: WelcomeWizardProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [selectedFeedStyle, setSelectedFeedStyle] = useState<FeedStyle>(defaultFeedStyle || "minimal")
  
  // Fetch preview feed data (only for paid users who upgraded from free)
  const { data: previewFeedData, isLoading: isLoadingPreview } = useSWR(
    open ? "/api/feed-planner/preview-feed" : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // Cache for 1 minute
    }
  )
  
  const hasPreviewFeed = previewFeedData?.hasPreviewFeed === true
  const previewImageUrl = previewFeedData?.previewImageUrl || null

  const handleComplete = () => {
    onComplete()
  }

  const handleDismiss = () => {
    if (onDismiss) {
      onDismiss()
    } else {
      handleComplete()
    }
  }

  // Update selected style when default changes
  useEffect(() => {
    if (defaultFeedStyle) {
      setSelectedFeedStyle(defaultFeedStyle)
    }
  }, [defaultFeedStyle])

  // Feed style selection step content (matching unified wizard styling)
  const feedStyleStepContent = useMemo(() => {
    return (
      <div className="space-y-6">
        <p className="text-base sm:text-lg font-light leading-relaxed text-stone-700">
          Choose the visual style for your feed.
        </p>
        <p className="text-sm font-light text-stone-600">
          Select a style that matches your brand aesthetic. You can use your last selection or choose a different style.
        </p>

        {/* Feed Style Selection */}
        <div>
          <label className="block text-[10px] sm:text-xs font-medium tracking-wider uppercase text-stone-700 mb-4">
            Feed Style
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
            {Object.entries(feedExamples).map(([key, style]) => {
              const feedStyle = key as FeedStyle
              const isSelected = selectedFeedStyle === feedStyle
              const isDefault = defaultFeedStyle === feedStyle

              return (
                <div
                  key={key}
                  onClick={() => setSelectedFeedStyle(feedStyle)}
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
      </div>
    )
  }, [selectedFeedStyle, defaultFeedStyle])

  // Dynamic first step content based on whether user has preview feed
  // Use useMemo to prevent recreation on every render
  const firstStepContent = useMemo(() => {
    if (isLoadingPreview) {
      return (
        <div className="space-y-6">
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-2 border-stone-300 border-t-stone-950 rounded-full animate-spin" />
          </div>
        </div>
      )
    }
    
    if (hasPreviewFeed && previewImageUrl) {
      return (
        <div className="space-y-6">
          <p className="text-base sm:text-lg font-light leading-relaxed text-stone-700">
            Great news! We found your preview feed from the free blueprint.
          </p>
          <p className="text-sm font-light text-stone-600">
            You can create your full feed using this style, or choose a new style.
          </p>
          
          {/* Preview Image */}
          <div className="relative w-full max-w-xs mx-auto aspect-[9/16] bg-stone-100 rounded-xl overflow-hidden border-2 border-stone-200">
            {previewImageUrl ? (
              <Image
                src={previewImageUrl}
                alt="Your preview feed"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 320px"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon className="w-12 h-12 text-stone-400" />
              </div>
            )}
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              onClick={() => {
                if (onUsePreviewStyle) {
                  onUsePreviewStyle()
                }
                handleComplete()
              }}
              className="flex-1 bg-stone-950 hover:bg-stone-800 text-white px-6 py-3 text-sm font-medium uppercase tracking-wider transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg shadow-stone-900/20"
            >
              Create Feed Using Preview Style
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button
              onClick={() => {
                if (onChooseNewStyle) {
                  onChooseNewStyle()
                }
                handleComplete()
              }}
              variant="outline"
              className="flex-1 border-stone-300 text-stone-700 hover:bg-stone-50 hover:border-stone-950 px-6 py-3 text-sm font-medium uppercase tracking-wider transition-all duration-200"
            >
              Choose New Style
            </Button>
          </div>
        </div>
      )
    }
    
    // Default content (no preview feed)
    return (
      <div className="space-y-6">
        <p className="text-base sm:text-lg font-light leading-relaxed text-stone-700">
          You're all set! Now you can create a complete Instagram feed with 12 beautiful photos.
        </p>
        <p className="text-sm font-light text-stone-600">
          Each photo will match your style and look amazing together. Let's walk through how it works.
        </p>
      </div>
    )
  }, [isLoadingPreview, hasPreviewFeed, previewImageUrl, onUsePreviewStyle, onChooseNewStyle])

  // Determine step count and order based on whether user has preview feed
  const totalSteps = hasPreviewFeed ? 5 : 4 // 5 steps if preview exists (preview + style + 3 tutorial), 4 steps otherwise (style + 3 tutorial)

  const steps = useMemo(() => {
    const stepList = []

    // Step 0: Preview feed (only if user has preview)
    if (hasPreviewFeed) {
      stepList.push({
        title: "Welcome to your Feed Planner",
        subtitle: `Step 1 of ${totalSteps}`,
        content: firstStepContent,
        icon: Sparkles,
      })
    }

    // Step: Feed Style Selection
    stepList.push({
      title: "Choose Your Feed Style",
      subtitle: `Step ${stepList.length + 1} of ${totalSteps}`,
      content: feedStyleStepContent,
      icon: Palette,
    })

    // Step: Generate photos
    stepList.push({
      title: "Generate your photos",
      subtitle: `Step ${stepList.length + 1} of ${totalSteps}`,
      content: (
        <div className="space-y-6">
          <p className="text-base sm:text-lg font-light leading-relaxed text-stone-700">
            Click any empty placeholder in your grid to generate a photo.
          </p>
          <p className="text-sm font-light text-stone-600">
            Each photo will be unique but match your preview style. You can generate them one at a time, or fill up the whole grid.
          </p>
          <div className="bg-stone-50 rounded-xl p-4 border border-stone-200">
            <p className="text-sm font-light text-stone-600">
              💡 <span className="font-medium">Tip:</span> Start with the first few photos to see how they look together!
            </p>
          </div>
        </div>
      ),
      icon: Grid3x3,
    })

    // Step: Add captions and strategy
    stepList.push({
      title: "Add captions and strategy",
      subtitle: `Step ${stepList.length + 1} of ${totalSteps}`,
      content: (
        <div className="space-y-6">
          <p className="text-base sm:text-lg font-light leading-relaxed text-stone-700">
            Once your photos are ready, you can add captions and get a full strategy guide.
          </p>
          <p className="text-sm font-light text-stone-600">
            Click the "Post" tab to get AI-generated captions for each photo. Click "Strategy" to get a complete guide for your feed.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="border border-stone-300 p-4 rounded-lg bg-white">
              <p className="text-xs font-medium tracking-wider uppercase text-stone-700 mb-1">Post Tab</p>
              <p className="text-xs font-light text-stone-600">AI-generated captions</p>
            </div>
            <div className="border border-stone-300 p-4 rounded-lg bg-white">
              <p className="text-xs font-medium tracking-wider uppercase text-stone-700 mb-1">Strategy Tab</p>
              <p className="text-xs font-light text-stone-600">Complete feed guide</p>
            </div>
          </div>
        </div>
      ),
      icon: FileText,
    })

    // Step: You're all set
    stepList.push({
      title: "You're all set!",
      subtitle: `Step ${stepList.length + 1} of ${totalSteps}`,
      content: (
        <div className="space-y-6">
          <p className="text-base sm:text-lg font-light leading-relaxed text-stone-700">
            That's it! You're ready to create amazing content.
          </p>
          <p className="text-sm font-light text-stone-600">
            When you finish your first feed, you can create a new one anytime. All your feeds are saved so you can come back to them later.
          </p>
          <div className="bg-stone-50 rounded-xl p-4 border border-stone-200">
            <p className="text-sm font-light text-stone-600">
              🎉 <span className="font-medium">Have fun creating!</span> If you need help, just click the help button (?) in the header anytime.
            </p>
          </div>
        </div>
      ),
      icon: Check,
    })

    return stepList
  }, [hasPreviewFeed, totalSteps, firstStepContent, feedStyleStepContent])

  const handleNext = () => {
    // If we're on the feed style step, save the selection
    const currentStepData = steps[currentStep]
    if (currentStepData?.title === "Choose Your Feed Style" && onFeedStyleSelected) {
      onFeedStyleSelected(selectedFeedStyle)
    }

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleComplete()
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const currentStepData = steps[currentStep]
  const Icon = currentStepData.icon
  const progress = ((currentStep + 1) / steps.length) * 100

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
            onClick={handleDismiss}
          />

          {/* Wizard Modal - matching unified wizard */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 pb-24 sm:pb-28 md:pb-32"
            onClick={(e) => e.stopPropagation()}
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 6rem)" }}
          >
            <div
              className={`w-full max-w-3xl max-h-[90vh] overflow-y-auto ${ComponentClasses.card} ${DesignClasses.spacing.padding.lg} relative rounded-2xl shadow-2xl bg-white`}
            >
              {/* Close Button - matching unified wizard */}
              {onDismiss && (
                <button
                  onClick={handleDismiss}
                  className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg transition-colors z-10 hover:bg-stone-100 text-stone-600 hover:text-stone-950"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              )}

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8 py-6"
              >
                {/* Progress Bar - matching unified wizard */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-light tracking-[0.2em] uppercase text-stone-700">{currentStepData.subtitle}</span>
                    <span className="text-xs font-light text-stone-700">{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="h-1 bg-stone-200" />
                </div>

                {/* Title - matching unified wizard typography */}
                <h2
                  style={{ fontFamily: "'Times New Roman', serif" }}
                  className="text-2xl sm:text-3xl md:text-4xl font-light tracking-[0.15em] uppercase text-stone-950"
                >
                  {currentStepData.title}
                </h2>

                {/* Content with icon - interactive animation */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6"
                  >
                    {/* Icon with animation */}
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                      className="flex justify-center"
                    >
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-stone-100 flex items-center justify-center border-2 border-stone-200">
                        <Icon className="w-8 h-8 sm:w-10 sm:h-10 text-stone-700" strokeWidth={1.5} />
                      </div>
                    </motion.div>

                    {/* Content */}
                    <div className="min-h-[120px]">
                      {currentStepData.content}
                    </div>

                    {/* Step indicator dots - interactive */}
                    <div className="flex justify-center gap-2 pt-4">
                      {steps.map((_, index) => (
                        <motion.button
                          key={index}
                          onClick={() => setCurrentStep(index)}
                          className={`h-2 rounded-full transition-all cursor-pointer ${
                            index === currentStep
                              ? "w-8 bg-stone-950"
                              : index < currentStep
                              ? "w-2 bg-stone-400 hover:bg-stone-600"
                              : "w-2 bg-stone-200 hover:bg-stone-300"
                          }`}
                          whileHover={{ scale: 1.2 }}
                          whileTap={{ scale: 0.9 }}
                          aria-label={`Go to step ${index + 1}`}
                        />
                      ))}
                    </div>
                  </motion.div>
                </AnimatePresence>

                {/* Navigation Buttons - matching unified wizard style */}
                <div className="flex items-center justify-between pt-6 border-t border-stone-200">
                  <Button
                    variant="ghost"
                    onClick={currentStep > 0 ? handleBack : handleDismiss}
                    className="text-stone-600 hover:text-stone-950 hover:bg-stone-50 transition-colors"
                  >
                    {currentStep > 0 ? "Back" : "Skip"}
                  </Button>

                  <Button
                    onClick={handleNext}
                    className="bg-stone-950 hover:bg-stone-800 text-white px-6 sm:px-8 py-3 sm:py-4 text-sm font-medium uppercase tracking-wider transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg shadow-stone-900/20"
                  >
                    {currentStep < steps.length - 1 ? (
                      <>
                        Next
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    ) : (
                      <>
                        Get Started
                        <Check className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
