"use client"

import { useState, useEffect, useMemo } from "react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { motion, AnimatePresence } from "framer-motion"
import { DesignClasses } from "@/lib/design-tokens"
import useSWR from "swr"
import Image from "next/image"
import { FEED_STARTER_STYLE_MAP, type FeedStarterStyleId } from "@/lib/style-presets"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

// Feed style examples (matching unified wizard)
const feedExamples = FEED_STARTER_STYLE_MAP

export type FeedStyle = FeedStarterStyleId

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
 * Welcome Wizard for legacy Feed Planner buyers
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
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/25 border-t-white" />
          </div>
        </div>
      )
    }
    
    if (hasPreviewFeed && previewImageUrl) {
      return (
        <div className="space-y-6">
          <p className="text-base sm:text-lg font-light leading-relaxed text-white/80">
            Great news! We found your preview feed from the free blueprint.
          </p>
          <p className="text-sm font-light text-white/65">
            You can create your full feed using this style, or choose a new style.
          </p>
          
          {/* Preview Image */}
          <div className="relative mx-auto aspect-[9/16] w-full max-w-xs overflow-hidden rounded-xl border border-white/20 bg-white/[0.05]">
            {previewImageUrl ? (
              <Image
                src={previewImageUrl}
                alt="Your preview feed"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 320px"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <span className="text-[11px] uppercase tracking-[0.25em] text-white/45">Preview</span>
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
              className="flex-1 rounded-full border border-white/25 bg-white/10 px-6 py-3 text-sm font-medium uppercase tracking-[0.2em] text-white transition-all duration-200 hover:scale-105 hover:bg-white/15 active:scale-95 shadow-lg"
            >
              Create Feed Using Preview Style
            </Button>
            <Button
              onClick={() => {
                if (onChooseNewStyle) {
                  onChooseNewStyle()
                }
                handleComplete()
              }}
              variant="outline"
              className="flex-1 border-white/25 bg-white/[0.04] px-6 py-3 text-sm font-medium uppercase tracking-[0.2em] text-white/75 transition-all duration-200 hover:border-white/45 hover:bg-white/10 hover:text-white"
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
        <p className="text-base sm:text-lg font-light leading-relaxed text-white/80">
          Your first 60 credits are ready.
        </p>
        <p className="text-sm font-light text-white/65">
          Create a complete 9-post feed in minutes. Let&apos;s walk through how it works.
        </p>
        <Button
          onClick={handleComplete}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-white/90 py-5 text-sm font-medium uppercase tracking-[0.2em] text-black shadow-lg transition-colors hover:bg-white"
        >
          Generate my first feed now →
        </Button>
        <p className="text-center text-xs text-white/35">Or continue the walkthrough below</p>
      </div>
    )
  }, [isLoadingPreview, hasPreviewFeed, previewImageUrl, onUsePreviewStyle, onChooseNewStyle, handleComplete])

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
      })
    } else {
      stepList.push({
        title: "Your first 60 credits are ready",
        subtitle: "Step 1 of 3",
        content: (
          <div className="space-y-6">
            <p className="text-base sm:text-lg font-light leading-relaxed text-white/80">
              Create your first 9-post feed in minutes.
            </p>
            <p className="text-sm font-light text-white/65">
              Each photo will be unique but cohesive. Here&apos;s how it works.
            </p>
          </div>
        ),
      })
    }

    // Step 2: How it works (combined — generate photos + captions/strategy)
    stepList.push({
      title: "How it works",
      subtitle: "Step 2 of 3",
      content: (
        <div className="space-y-6">
          <p className="text-base sm:text-lg font-light leading-relaxed text-white/80">
            Click any empty slot in your grid to create a photo. Then use the Post tab for captions and the Plan tab for what to make next.
          </p>
          <div className="rounded-xl border border-white/15 bg-white/[0.04] p-4">
            <p className="text-sm font-light text-white/65">
              Start with a few photos to see how they look together.
            </p>
          </div>
        </div>
      ),
    })

    // Step 3: You're ready — single CTA per content doc
    stepList.push({
      title: "You're ready!",
      subtitle: "Step 3 of 3",
      content: (
        <div className="space-y-6">
          <p className="text-base sm:text-lg font-light leading-relaxed text-white/80">
            Your first 60 credits are ready — create your first feed below.
          </p>
          <Button
            onClick={handleComplete}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-white/25 bg-white/10 py-6 text-base font-medium uppercase tracking-[0.2em] text-white shadow-lg transition-colors hover:bg-white/15"
          >
            Create my first feed
          </Button>
        </div>
      ),
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
  const progress = ((currentStep + 1) / steps.length) * 100

  const [portalTarget, setPortalTarget] = useState<Element | null>(null)
  useEffect(() => { setPortalTarget(document.body) }, [])

  if (!open || !portalTarget) return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop - matching unified wizard */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md"
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
            <div className={`relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-white/20 bg-[rgba(13,15,19,0.94)] ${DesignClasses.spacing.padding.lg} text-white shadow-2xl backdrop-blur-2xl`}>
              {/* Close Button - matching unified wizard */}
              {onDismiss && (
                <button
                  onClick={handleDismiss}
                  className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-lg text-white/65 transition-colors hover:bg-white/10 hover:text-white"
                  aria-label="Close"
                >
                  <span className="text-[10px] uppercase tracking-[0.2em]">Close</span>
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
                    <span className="text-xs font-light uppercase tracking-[0.2em] text-white/70">{currentStepData.subtitle}</span>
                    <span className="text-xs font-light text-white/70">{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="h-1 bg-white/20" />
                </div>

                {/* Title - matching unified wizard typography */}
                <h2
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                  className="text-2xl font-light uppercase tracking-[0.15em] text-white sm:text-3xl md:text-4xl"
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
                    {/* Step indicator */}
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                      className="flex justify-center"
                    >
                      <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-white/20 bg-white/8 sm:h-20 sm:w-20">
                        <span className="text-xs uppercase tracking-[0.3em] text-white/70">0{currentStep + 1}</span>
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
                              ? "w-8 bg-white"
                              : index < currentStep
                              ? "w-2 bg-white/50 hover:bg-white/70"
                              : "w-2 bg-white/20 hover:bg-white/35"
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
                <div className="flex items-center justify-between border-t border-white/15 pt-6">
                  <Button
                    variant="ghost"
                    onClick={currentStep > 0 ? handleBack : handleDismiss}
                    className="text-white/65 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    {currentStep > 0 ? "Back" : "Skip"}
                  </Button>

                  <Button
                    onClick={handleNext}
                    className="px-6 py-3 text-sm font-medium uppercase tracking-[0.2em] sm:px-8 sm:py-4 rounded-full border border-white/25 bg-white/10 text-white transition-all duration-200 hover:bg-white/15 hover:scale-105 active:scale-95 shadow-lg"
                  >
                    {currentStep < steps.length - 1 ? (
                      <>
                        Next
                      </>
                    ) : (
                      <>
                        Create my first feed
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    portalTarget
  )
}
