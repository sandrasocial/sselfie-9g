"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { motion, AnimatePresence } from "framer-motion"
import { Sparkles, Grid3x3, Check, ArrowRight, X, Image as ImageIcon } from "lucide-react"
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
  userChosePreviewStyle?: boolean | null // Track if user chose to use preview style (skip style selection step)
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
  userChosePreviewStyle,
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
          You&apos;re all set! Now you can create a complete Instagram feed with 12 beautiful photos.
        </p>
        <p className="text-sm font-light text-stone-600">
          Each photo will match your style and look amazing together. Let&apos;s walk through how it works.
        </p>
      </div>
    )
  }, [isLoadingPreview, hasPreviewFeed, previewImageUrl, onUsePreviewStyle, onChooseNewStyle])

  // Max 3 steps (A-02 / §1.4): Welcome → How it works → You're ready
  const totalSteps = 3
  const steps = useMemo(() => {
    const stepList = []

    // Step 1: Welcome or Preview discovery
    if (hasPreviewFeed && previewImageUrl) {
      stepList.push({
        title: "Great news! We found your preview feed",
        subtitle: "Step 1 of 3",
        content: firstStepContent,
        icon: Sparkles,
      })
    } else {
      stepList.push({
        title: "Welcome to your Feed Planner",
        subtitle: "Step 1 of 3",
        content: (
          <div className="space-y-6">
            <p className="text-base sm:text-lg font-light leading-relaxed text-stone-700">
              You&apos;re all set! Create a 9-post feed that matches your style.
            </p>
            <p className="text-sm font-light text-stone-600">
              Each photo will be unique but cohesive. Here&apos;s how it works.
            </p>
          </div>
        ),
        icon: Sparkles,
      })
    }

    // Step 2: How it works (combined — generate photos + captions/strategy)
    stepList.push({
      title: "How it works",
      subtitle: "Step 2 of 3",
      content: (
        <div className="space-y-6">
          <p className="text-base sm:text-lg font-light leading-relaxed text-stone-700">
            Click any empty slot in your grid to generate a photo. Then use the Post tab for captions and the Strategy tab for a full guide.
          </p>
          <div className="bg-stone-50 rounded-xl p-4 border border-stone-200">
            <p className="text-sm font-light text-stone-600">
              💡 Start with a few photos to see how they look together.
            </p>
          </div>
        </div>
      ),
      icon: Grid3x3,
    })

    // Step 3: You're ready — single CTA per content doc
    stepList.push({
      title: "You're ready!",
      subtitle: "Step 3 of 3",
      content: (
        <div className="space-y-6">
          <p className="text-base sm:text-lg font-light leading-relaxed text-stone-700">
            Your feed is ready. One tap and we&apos;ll create your first 9-post grid.
          </p>
          <Button
            onClick={handleComplete}
            className="w-full py-6 text-base font-medium uppercase tracking-wider bg-stone-950 hover:bg-stone-800 text-white flex items-center justify-center gap-2 shadow-lg"
          >
            Create my first feed
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      ),
      icon: Check,
    })

    return stepList
  }, [hasPreviewFeed, previewImageUrl, firstStepContent])

  const handleNext = () => {
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
                        Create my first feed
                        <ArrowRight className="w-4 h-4 ml-2" />
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
