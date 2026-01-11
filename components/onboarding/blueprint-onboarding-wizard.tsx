"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"
import { DesignClasses, ComponentClasses } from "@/lib/design-tokens"
import Image from "next/image"
import { BlueprintSelfieUpload } from "@/components/blueprint/blueprint-selfie-upload"

interface BlueprintOnboardingWizardProps {
  isOpen: boolean
  onComplete: (data: {
    business: string
    dreamClient: string
    vibe: string
    lightingKnowledge: string
    angleAwareness: string
    editingStyle: string
    consistencyLevel: string
    currentSelfieHabits: string
    feedStyle: string
    selfieImages?: string[]
  }) => void
  onDismiss?: () => void
  userName?: string | null
  existingData?: {
    business?: string
    dreamClient?: string
    vibe?: string
    lightingKnowledge?: string
    angleAwareness?: string
    editingStyle?: string
    consistencyLevel?: string
    currentSelfieHabits?: string
    feedStyle?: string
    selfieImages?: string[]
  }
  userEmail?: string | null
}

// Feed style examples (from old blueprint form)
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

const VIBES = ["Luxury", "Minimal", "Beige", "Warm", "Edgy", "Professional"]

const WIZARD_STEPS = [
  {
    id: "step1",
    title: "Tell me about your brand",
    subtitle: "Step 1 of 4",
    fields: ["business", "dreamClient", "vibe"],
  },
  {
    id: "step2",
    title: "Your content skills",
    subtitle: "Step 2 of 4",
    fields: ["lightingKnowledge", "angleAwareness", "editingStyle", "consistencyLevel", "currentSelfieHabits"],
  },
  {
    id: "step3",
    title: "Choose your feed aesthetic",
    subtitle: "Step 3 of 4",
    fields: ["feedStyle"],
  },
  {
    id: "step4",
    title: "Upload your selfies",
    subtitle: "Step 4 of 4",
    fields: ["selfieImages"],
  },
]

const WIZARD_STORAGE_KEY = "blueprint_onboarding_wizard_state"

export default function BlueprintOnboardingWizard({
  isOpen,
  onComplete,
  onDismiss,
  userName,
  existingData,
  userEmail,
}: BlueprintOnboardingWizardProps) {
  // Load saved state from localStorage or use existing data
  const loadSavedState = () => {
    if (typeof window === "undefined") {
      return {
        currentStep: 0,
        formData: {
          business: existingData?.business || "",
          dreamClient: existingData?.dreamClient || "",
          vibe: existingData?.vibe || "",
          lightingKnowledge: existingData?.lightingKnowledge || "",
          angleAwareness: existingData?.angleAwareness || "",
          editingStyle: existingData?.editingStyle || "",
          consistencyLevel: existingData?.consistencyLevel || "",
          currentSelfieHabits: existingData?.currentSelfieHabits || "",
          feedStyle: existingData?.feedStyle || "",
          selfieImages: existingData?.selfieImages || [],
        },
      }
    }

    try {
      const saved = localStorage.getItem(WIZARD_STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        // Merge with existing data (existing data takes precedence)
        return {
          currentStep: parsed.currentStep || 0,
          formData: {
            business: existingData?.business || parsed.formData?.business || "",
            dreamClient: existingData?.dreamClient || parsed.formData?.dreamClient || "",
            vibe: existingData?.vibe || parsed.formData?.vibe || "",
            lightingKnowledge: existingData?.lightingKnowledge || parsed.formData?.lightingKnowledge || "",
            angleAwareness: existingData?.angleAwareness || parsed.formData?.angleAwareness || "",
            editingStyle: existingData?.editingStyle || parsed.formData?.editingStyle || "",
            consistencyLevel: existingData?.consistencyLevel || parsed.formData?.consistencyLevel || "",
            currentSelfieHabits: existingData?.currentSelfieHabits || parsed.formData?.currentSelfieHabits || "",
            feedStyle: existingData?.feedStyle || parsed.formData?.feedStyle || "",
            selfieImages: existingData?.selfieImages || parsed.formData?.selfieImages || [],
          },
        }
      }
    } catch (error) {
      console.error("[Blueprint Wizard] Error loading saved state:", error)
    }

    return {
      currentStep: 0,
      formData: {
        business: existingData?.business || "",
        dreamClient: existingData?.dreamClient || "",
        vibe: existingData?.vibe || "",
        lightingKnowledge: existingData?.lightingKnowledge || "",
        angleAwareness: existingData?.angleAwareness || "",
        editingStyle: existingData?.editingStyle || "",
        consistencyLevel: existingData?.consistencyLevel || "",
        currentSelfieHabits: existingData?.currentSelfieHabits || "",
        feedStyle: existingData?.feedStyle || "",
        selfieImages: existingData?.selfieImages || [],
      },
    }
  }

  const savedState = loadSavedState()
  const [currentStep, setCurrentStep] = useState(savedState.currentStep)
  const [formData, setFormData] = useState(savedState.formData)
  const [isSaving, setIsSaving] = useState(false)

  // Save state to localStorage whenever formData or currentStep changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(
          WIZARD_STORAGE_KEY,
          JSON.stringify({
            currentStep,
            formData,
          })
        )
      } catch (error) {
        console.error("[Blueprint Wizard] Error saving state:", error)
      }
    }
  }, [currentStep, formData])

  // Clear saved state when wizard completes
  const clearSavedState = () => {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(WIZARD_STORAGE_KEY)
      } catch (error) {
        console.error("[Blueprint Wizard] Error clearing saved state:", error)
      }
    }
  }

  const totalSteps = WIZARD_STEPS.length
  const progress = ((currentStep + 1) / totalSteps) * 100
  const step = WIZARD_STEPS[currentStep]

  const canProceed = () => {
    // For selfie upload step, check if at least 1 image is uploaded
    if (step.id === "step4") {
      return Array.isArray(formData.selfieImages) && formData.selfieImages.length > 0
    }
    
    return step.fields.every((field) => {
      const value = formData[field as keyof typeof formData]
      if (Array.isArray(value)) {
        return value.length > 0
      }
      return value && value.toString().trim().length > 0
    })
  }

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleComplete()
    }
  }

  const handleComplete = async () => {
    // Verify selfies are uploaded before proceeding
    const hasSelfies = Array.isArray(formData.selfieImages) && formData.selfieImages.length > 0
    if (!hasSelfies) {
      alert("Please upload at least one selfie before completing the wizard")
      return
    }

    console.log("[Blueprint Wizard] Completing wizard with data:", {
      hasBusiness: !!formData.business,
      hasDreamClient: !!formData.dreamClient,
      hasVibe: !!formData.vibe,
      hasFeedStyle: !!formData.feedStyle,
      selfieCount: formData.selfieImages?.length || 0,
      selfies: formData.selfieImages,
    })

    setIsSaving(true)
    try {
      // Save data via API endpoint
      // Note: selfieImages are already uploaded and saved to user_avatar_images via upload-selfies endpoint
      const payload = {
        ...formData,
        // Ensure selfieImages is passed correctly
        selfieImages: Array.isArray(formData.selfieImages) ? formData.selfieImages : [],
      }

      console.log("[Blueprint Wizard] Sending completion request with payload:", {
        ...payload,
        selfieImages: payload.selfieImages, // Explicitly log selfies
      })

      const response = await fetch("/api/onboarding/blueprint-onboarding-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error("[Blueprint Wizard] ❌ Completion failed:", errorData)
        throw new Error(errorData.error || "Failed to save blueprint data")
      }

      console.log("[Blueprint Wizard] ✅ Completion successful")
      
      // Clear saved state on successful completion
      clearSavedState()
      onComplete(formData)
    } catch (error) {
      console.error("[Blueprint Onboarding] Error saving data:", error)
      alert(error instanceof Error ? error.message : "Failed to save. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

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
            <div
              className={`w-full max-w-3xl max-h-[90vh] overflow-y-auto ${ComponentClasses.card} ${DesignClasses.spacing.padding.lg} relative rounded-2xl shadow-2xl`}
            >
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

                {/* Title */}
                <h2
                  style={{ fontFamily: "'Times New Roman', serif" }}
                  className="text-2xl sm:text-3xl md:text-4xl font-light tracking-[0.15em] uppercase text-stone-950"
                >
                  {step.title}
                </h2>

                {/* Step 1: Business + Dream Client + Vibe */}
                {currentStep === 0 && (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-[10px] sm:text-xs font-medium tracking-wider uppercase text-stone-700 mb-2 sm:mb-3">
                        What do you do?
                      </label>
                      <Input
                        type="text"
                        value={formData.business}
                        onChange={(e) => setFormData({ ...formData, business: e.target.value })}
                        placeholder="e.g., Life Coach, Designer, Consultant..."
                        className="w-full border-b border-stone-300 py-3 sm:py-4 focus:outline-none focus:border-stone-950 transition-colors font-light bg-transparent border-t-0 border-l-0 border-r-0 rounded-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] sm:text-xs font-medium tracking-wider uppercase text-stone-700 mb-2 sm:mb-3">
                        Who do you help?
                      </label>
                      <Input
                        type="text"
                        value={formData.dreamClient}
                        onChange={(e) => setFormData({ ...formData, dreamClient: e.target.value })}
                        placeholder="e.g., Women entrepreneurs, New moms, Career changers..."
                        className="w-full border-b border-stone-300 py-3 sm:py-4 focus:outline-none focus:border-stone-950 transition-colors font-light bg-transparent border-t-0 border-l-0 border-r-0 rounded-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] sm:text-xs font-medium tracking-wider uppercase text-stone-700 mb-2 sm:mb-3">
                        What&apos;s your vibe?
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                        {VIBES.map((vibe) => (
                          <button
                            key={vibe}
                            onClick={() => setFormData({ ...formData, vibe: vibe.toLowerCase() })}
                            className={`py-3 sm:py-3 px-3 sm:px-4 text-[10px] sm:text-xs tracking-wider uppercase border transition-all duration-200 ${
                              formData.vibe === vibe.toLowerCase()
                                ? "border-stone-950 bg-stone-950 text-stone-50"
                                : "border-stone-300 text-stone-700 hover:border-stone-950"
                            }`}
                          >
                            {vibe}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Content Skills */}
                {currentStep === 1 && (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-[10px] sm:text-xs font-medium tracking-wider uppercase text-stone-700 mb-2 sm:mb-3">
                        How&apos;s your lighting knowledge?
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                        {[
                          { value: "expert", label: "I know my angles & light" },
                          { value: "good", label: "Pretty good" },
                          { value: "basic", label: "Basic understanding" },
                          { value: "learning", label: "Still learning" },
                        ].map((option) => (
                          <button
                            key={option.value}
                            onClick={() => setFormData({ ...formData, lightingKnowledge: option.value })}
                            className={`py-3 px-4 text-xs tracking-wider uppercase border transition-all duration-200 ${
                              formData.lightingKnowledge === option.value
                                ? "border-stone-950 bg-stone-950 text-stone-50"
                                : "border-stone-300 text-stone-700 hover:border-stone-950"
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] sm:text-xs font-medium tracking-wider uppercase text-stone-700 mb-2 sm:mb-3">
                        Do you know your best angles?
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                        {[
                          { value: "yes", label: "Yes, I've got this!" },
                          { value: "no", label: "Not really" },
                        ].map((option) => (
                          <button
                            key={option.value}
                            onClick={() => setFormData({ ...formData, angleAwareness: option.value })}
                            className={`py-3 px-4 text-xs tracking-wider uppercase border transition-all duration-200 ${
                              formData.angleAwareness === option.value
                                ? "border-stone-950 bg-stone-950 text-stone-50"
                                : "border-stone-300 text-stone-700 hover:border-stone-950"
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] sm:text-xs font-medium tracking-wider uppercase text-stone-700 mb-2 sm:mb-3">
                        How do you edit your photos?
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                        {[
                          { value: "consistent", label: "Consistent preset/style" },
                          { value: "sometimes", label: "Sometimes I edit" },
                          { value: "minimal", label: "Minimal editing" },
                          { value: "none", label: "No editing" },
                        ].map((option) => (
                          <button
                            key={option.value}
                            onClick={() => setFormData({ ...formData, editingStyle: option.value })}
                            className={`py-3 px-4 text-xs tracking-wider uppercase border transition-all duration-200 ${
                              formData.editingStyle === option.value
                                ? "border-stone-950 bg-stone-950 text-stone-50"
                                : "border-stone-300 text-stone-700 hover:border-stone-950"
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] sm:text-xs font-medium tracking-wider uppercase text-stone-700 mb-2 sm:mb-3">
                        How consistent are you with posting?
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                        {[
                          { value: "daily", label: "Daily or almost daily" },
                          { value: "weekly", label: "Few times a week" },
                          { value: "monthly", label: "Once a week or less" },
                          { value: "sporadic", label: "Very sporadic" },
                        ].map((option) => (
                          <button
                            key={option.value}
                            onClick={() => setFormData({ ...formData, consistencyLevel: option.value })}
                            className={`py-3 px-4 text-xs tracking-wider uppercase border transition-all duration-200 ${
                              formData.consistencyLevel === option.value
                                ? "border-stone-950 bg-stone-950 text-stone-50"
                                : "border-stone-300 text-stone-700 hover:border-stone-950"
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] sm:text-xs font-medium tracking-wider uppercase text-stone-700 mb-2 sm:mb-3">
                        How do you currently use selfies in your content?
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                        {[
                          { value: "strategic", label: "Strategic & planned" },
                          { value: "regular", label: "Regular but random" },
                          { value: "occasional", label: "Occasionally" },
                          { value: "rarely", label: "Rarely or never" },
                        ].map((option) => (
                          <button
                            key={option.value}
                            onClick={() => setFormData({ ...formData, currentSelfieHabits: option.value })}
                            className={`py-3 px-4 text-xs tracking-wider uppercase border transition-all duration-200 ${
                              formData.currentSelfieHabits === option.value
                                ? "border-stone-950 bg-stone-950 text-stone-50"
                                : "border-stone-300 text-stone-700 hover:border-stone-950"
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3: Feed Style */}
                {currentStep === 2 && (
                  <div className="space-y-6">
                    <p className="text-sm font-light text-stone-600 mb-6">
                      Pick a vibe that feels like you. Don&apos;t worry, you can always switch things up later!
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
                      {Object.entries(feedExamples).map(([key, style]) => (
                        <div
                          key={key}
                          onClick={() => setFormData({ ...formData, feedStyle: key })}
                          className={`cursor-pointer transition-all duration-300 ${
                            formData.feedStyle === key ? "scale-105" : "hover:scale-102"
                          }`}
                        >
                          <div className="border-2 border-stone-200 p-4 bg-white">
                            <div className="grid grid-cols-3 gap-2 mb-4">
                              {style.grid.map((type, idx) => (
                                <div
                                  key={idx}
                                  className={`aspect-square rounded ${
                                    key === "minimal" ? "border border-stone-300" : ""
                                  }`}
                                  style={{
                                    backgroundColor: type === "selfie" ? style.colors[0] : style.colors[1],
                                  }}
                                />
                              ))}
                            </div>
                            <h3 className="text-sm font-medium tracking-wider uppercase text-stone-950 mb-2">
                              {style.name}
                            </h3>
                            <div className="flex gap-2">
                              {style.colors.map((color, idx) => (
                                <div
                                  key={idx}
                                  className={`w-6 h-6 rounded-full ${
                                    key === "minimal" ? "border border-stone-300" : "border border-stone-200"
                                  }`}
                                  style={{ backgroundColor: color }}
                                />
                              ))}
                            </div>
                            <button
                              className={`w-full py-3 mt-4 text-xs tracking-[0.2em] sm:tracking-[0.3em] uppercase border transition-all duration-200 ${
                                formData.feedStyle === key
                                  ? "border-stone-950 bg-stone-950 text-stone-50"
                                  : "border-stone-300 text-stone-700 hover:border-stone-950"
                              }`}
                            >
                              {formData.feedStyle === key ? "SELECTED" : "SELECT"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 4: Selfie Upload */}
                {currentStep === 3 && (
                  <div className="space-y-6">
                    <div>
                      <p className="text-sm font-light text-stone-600 mb-2">
                        Upload 1-3 selfies to use as reference images for generating your feed.
                      </p>
                      <p className="text-xs font-light text-stone-500 mb-6">
                        These will help AI generate images that match your style and aesthetic.
                      </p>
                    </div>

                    <BlueprintSelfieUpload
                      onUploadComplete={(imageUrls) => {
                        setFormData({ ...formData, selfieImages: imageUrls })
                      }}
                      maxImages={3}
                      initialImages={Array.isArray(formData.selfieImages) ? formData.selfieImages : []}
                      email={userEmail || undefined}
                    />
                  </div>
                )}

                {/* Navigation */}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4">
                  {currentStep > 0 && (
                    <Button
                      variant="outline"
                      onClick={() => setCurrentStep(currentStep - 1)}
                      className="w-full sm:flex-1"
                    >
                      Back
                    </Button>
                  )}
                  <Button
                    onClick={handleNext}
                    disabled={!canProceed() || isSaving}
                    className="w-full sm:flex-1 bg-stone-950 text-stone-50 hover:bg-stone-800"
                  >
                    {isSaving ? "Saving..." : currentStep === totalSteps - 1 ? "Complete" : "Continue →"}
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
