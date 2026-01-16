"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"
import { DesignClasses, ComponentClasses } from "@/lib/design-tokens"
import Image from "next/image"

interface BlueprintExtensionProps {
  isOpen: boolean
  onComplete: () => void
  onDismiss?: () => void
  userName?: string | null
  existingData?: {
    dreamClient?: string
    struggle?: string
    feedStyle?: string
  }
}

const FEED_STYLES = [
  {
    id: "luxury",
    name: "Dark & Moody",
    colors: ["#0a0a0a", "#2d2d2d", "#4a4a4a"],
    grid: ["selfie", "selfie", "flatlay", "selfie", "selfie", "selfie", "flatlay", "selfie", "selfie"],
    description: "Dramatic blacks and grays with high contrast",
  },
  {
    id: "minimal",
    name: "Light & Minimalistic",
    colors: ["#f5f5f5", "#e5e5e5", "#d4d4d4"],
    grid: ["selfie", "selfie", "selfie", "flatlay", "selfie", "selfie", "selfie", "flatlay", "selfie"],
    description: "Soft whites, creams, and beiges",
  },
  {
    id: "beige",
    name: "Beige Aesthetic",
    colors: ["#c9b8a8", "#a89384", "#8a7968"],
    grid: ["selfie", "flatlay", "selfie", "selfie", "selfie", "selfie", "selfie", "flatlay", "selfie"],
    description: "Warm neutrals and earthy tones",
  },
]

// Blueprint Extension steps (3 steps)
const EXTENSION_STEPS = [
  {
    id: "dreamClient",
    title: "Who is your dream client?",
    subtitle: "Step 1 of 3",
    mayaMessage:
      "Let\u0027s get clear on who you\u0027re creating content for. This helps me craft messaging and visuals that resonate with your ideal audience.",
    field: "dreamClient",
    placeholder: "e.g., Women entrepreneurs, New moms, Career changers...",
  },
  {
    id: "struggle",
    title: "What\u0027s your biggest struggle right now?",
    subtitle: "Step 2 of 3",
    mayaMessage:
      "Understanding your challenges helps me create content that addresses real pain points and positions you as the solution your audience needs.",
    field: "struggle",
    isTextarea: true,
    placeholder:
      "e.g., I struggle with showing up consistently, I don\u0027t know what to post, I feel stuck in my content...",
  },
  {
    id: "feedStyle",
    title: "Choose your feed aesthetic",
    subtitle: "Step 3 of 3",
    mayaMessage:
      "This is the visual vibe that will make your Instagram feed instantly recognizable. Pick the style that feels most like YOU!",
    isFeedStyleSelector: true,
  },
]

export default function BlueprintExtension({
  isOpen,
  onComplete,
  onDismiss,
  userName,
  existingData,
}: BlueprintExtensionProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState<{
    dreamClient: string
    struggle: string
    feedStyle: string
  }>({
    dreamClient: existingData?.dreamClient || "",
    struggle: existingData?.struggle || "",
    feedStyle: existingData?.feedStyle || "",
  })
  const [isSaving, setIsSaving] = useState(false)

  // Pre-fill existing data
  useEffect(() => {
    if (existingData) {
      setFormData({
        dreamClient: existingData.dreamClient || "",
        struggle: existingData.struggle || "",
        feedStyle: existingData.feedStyle || "",
      })
    }
  }, [existingData])

  const step = EXTENSION_STEPS[currentStep]
  const progress = ((currentStep + 1) / EXTENSION_STEPS.length) * 100
  const isLastStep = currentStep === EXTENSION_STEPS.length - 1

  const handleNext = () => {
    if (currentStep < EXTENSION_STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleFeedStyleSelect = (styleId: string) => {
    setFormData((prev) => ({ ...prev, feedStyle: styleId }))
  }

  const handleComplete = async () => {
    setIsSaving(true)
    try {
      // Save blueprint extension data to blueprint_subscribers.form_data
      // Also set users.onboarding_completed = true
      const response = await fetch("/api/onboarding/blueprint-extension-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          dreamClient: formData.dreamClient,
          struggle: formData.struggle,
          feedStyle: formData.feedStyle,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to save blueprint extension")
      }

      console.log("[Blueprint Extension] ✅ Extension completed, onboarding marked as complete")
      onComplete()
    } catch (error) {
      console.error("[Blueprint Extension] Error saving extension:", error)
      alert(error instanceof Error ? error.message : "Failed to save. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  const canProceed = () => {
    if (step.isFeedStyleSelector) return formData.feedStyle.length > 0
    if (!step.field) return true
    return formData[step.field as keyof typeof formData]?.toString().trim().length > 0
  }

  if (!isOpen) {
    return null
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-stone-950/60 backdrop-blur-sm z-[100]"
            onClick={onDismiss}
          />

          {/* Wizard Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 pb-24 sm:pb-28 md:pb-32"
            onClick={(e) => e.stopPropagation()}
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 6rem)" }}
          >
            <div className={`w-full max-w-3xl max-h-[90vh] overflow-y-auto ${ComponentClasses.card} ${DesignClasses.spacing.padding.lg} relative rounded-2xl shadow-2xl`}>
              {/* Close Button */}
              {onDismiss && (
                <button
                  onClick={onDismiss}
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
                {/* Progress Bar */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-light tracking-[0.2em] uppercase text-stone-500">{step.subtitle}</span>
                    <span className="text-xs font-light text-stone-400">{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="h-1 bg-stone-100" />
                </div>

                {/* Maya Message */}
                <div className="bg-stone-50 rounded-lg p-6 border border-stone-200">
                  <div className="space-y-3">
                    <p className="text-xs font-light tracking-[0.3em] uppercase text-stone-950">MAYA</p>
                    <p className="text-base font-normal leading-relaxed text-stone-700">{step.mayaMessage}</p>
                  </div>
                </div>

                {/* Step Content */}
                <div className="space-y-6">
                  <h2 className="font-serif text-3xl md:text-4xl font-extralight tracking-[0.1em] text-stone-950">
                    {step.title}
                  </h2>

                  {step.isFeedStyleSelector ? (
                    <div className="space-y-6">
                      <p className="text-xs font-light tracking-[0.2em] uppercase text-stone-500 text-center mb-4">
                        Pick a vibe that feels like you. Don&apos;t worry, you can always switch things up later!
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                        {FEED_STYLES.map((style) => (
                          <button
                            key={style.id}
                            onClick={() => handleFeedStyleSelect(style.id)}
                            className={`relative p-6 rounded-lg border transition-all text-left hover:shadow-sm ${
                              formData.feedStyle === style.id
                                ? "border-stone-950 bg-stone-50"
                                : "border-stone-200 hover:border-stone-400"
                            }`}
                          >
                            <div className="grid grid-cols-3 gap-2 mb-4">
                              {style.grid.map((type, idx) => (
                                <div
                                  key={idx}
                                  className={`aspect-square rounded ${
                                    style.id === "minimal" ? "border border-stone-300" : ""
                                  }`}
                                  style={{
                                    backgroundColor: type === "selfie" ? style.colors[0] : style.colors[1],
                                  }}
                                />
                              ))}
                            </div>
                            <div className="space-y-2">
                              <p className="text-sm font-medium tracking-wider uppercase text-stone-950">{style.name}</p>
                              <p className="text-sm font-light text-stone-600">{style.description}</p>
                            </div>
                            <div className="flex gap-2 mt-4">
                              {style.colors.map((color, idx) => (
                                <div
                                  key={idx}
                                  className={`w-6 h-6 rounded-full ${
                                    style.id === "minimal" ? "border border-stone-300" : "border border-stone-200"
                                  }`}
                                  style={{ backgroundColor: color }}
                                />
                              ))}
                            </div>
                            {formData.feedStyle === style.id && (
                              <div className="absolute top-4 right-4 w-6 h-6 bg-stone-950 rounded-full flex items-center justify-center">
                                <div className="w-3 h-3 bg-white rounded-sm" />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : step.field ? (
                    <div className="space-y-2">
                      {step.isTextarea ? (
                        <Textarea
                          value={formData[step.field as keyof typeof formData] as string}
                          onChange={(e) => handleInputChange(step.field!, e.target.value)}
                          placeholder={step.placeholder}
                          className="min-h-[140px] resize-none border-stone-200 focus:border-stone-400 text-base leading-relaxed"
                          autoFocus
                        />
                      ) : (
                        <Input
                          value={formData[step.field as keyof typeof formData] as string}
                          onChange={(e) => handleInputChange(step.field!, e.target.value)}
                          placeholder={step.placeholder}
                          className="border-stone-200 focus:border-stone-400 text-base"
                          autoFocus
                        />
                      )}
                    </div>
                  ) : null}
                </div>

                {/* Navigation Buttons */}
                <div className="flex items-center justify-between pt-6 border-t border-stone-200">
                  <Button
                    variant="ghost"
                    onClick={handleBack}
                    disabled={currentStep === 0}
                    className="text-sm font-medium tracking-wider uppercase text-stone-600 hover:text-stone-950 hover:bg-stone-50 disabled:opacity-30"
                  >
                    BACK
                  </Button>

                  {isLastStep ? (
                    <Button
                      onClick={handleComplete}
                      disabled={!canProceed() || isSaving}
                      className="bg-stone-950 hover:bg-stone-800 text-white text-sm font-medium tracking-wider uppercase px-8 py-6 rounded-lg transition-all duration-200"
                    >
                      {isSaving ? "SAVING..." : "COMPLETE"}
                    </Button>
                  ) : (
                    <Button
                      onClick={handleNext}
                      disabled={!canProceed()}
                      className="bg-stone-950 hover:bg-stone-800 text-white text-sm font-medium tracking-wider uppercase px-8 py-6 rounded-lg transition-all duration-200"
                    >
                      NEXT
                    </Button>
                  )}
                </div>
              </motion.div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
