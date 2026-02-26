"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"
import { DesignClasses, ComponentClasses } from "@/lib/design-tokens"
import { BlueprintSelfieUpload } from "@/components/blueprint/blueprint-selfie-upload"
import useSWR from "swr"
import { Loader2, ArrowRight } from "lucide-react"
import { trackAnalyticsEvent } from "@/lib/analytics/client"

interface UnifiedOnboardingWizardProps {
  isOpen: boolean
  onComplete: (data: {
    businessType: string
    idealAudience: string
    audienceChallenge: string
    audienceTransformation: string
    transformationStory: string
    currentSituation?: string
    futureVision?: string
    visualAesthetic: string[]
    feedStyle: string
    feedStyleVariationId?: number | null
    selfieImages: string[]
    fashionStyle?: string[]
    brandInspiration?: string
    inspirationLinks?: string
    contentPillars?: Array<{
      name: string
      description: string
      contentIdeas: string[]
    }>
  }) => void
  onDismiss?: () => void
  userName?: string | null
  existingData?: {
    businessType?: string
    idealAudience?: string
    audienceChallenge?: string
    audienceTransformation?: string
    transformationStory?: string
    currentSituation?: string
    futureVision?: string
    visualAesthetic?: string[]
    feedStyle?: string
    feedStyleVariationId?: number | null
    selfieImages?: string[]
    fashionStyle?: string[]
    brandInspiration?: string
    inspirationLinks?: string
    contentPillars?: Array<{
      name: string
      description: string
      contentIdeas: string[]
    }>
  }
  userEmail?: string | null
  initialStep?: number // Optional: Start wizard at a specific step (0-based index)
}

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

interface FeedStyleVariationOption {
  id: number
  name: string
  description: string | null
  is_default: boolean
  sort_order: number
}


const UNIFIED_STEPS = [
  {
    id: "goal",
    title: "What's your goal?",
    subtitle: "Step 1 of 3",
    stepIndex: 1,
  },
  {
    id: "style",
    title: "What's your style?",
    subtitle: "Step 2 of 3",
    stepIndex: 2,
  },
  {
    id: "ready",
    title: "You're ready!",
    subtitle: "Step 3 of 3",
    stepIndex: 3,
  },
]

export default function UnifiedOnboardingWizard({
  isOpen,
  onComplete,
  onDismiss,
  userName,
  existingData,
  userEmail,
  initialStep = 0, // Default to step 0 (welcome), but allow starting at any step
}: UnifiedOnboardingWizardProps) {
  // SIMPLIFIED: Use existingData (from SWR cache) as single source of truth
  // No localStorage needed - SWR handles caching and persistence
  // If user has completed onboarding, start from step 0 (welcome) with data pre-filled for editing
  // If user is in progress, start from step 0 (they can navigate to where they left off)
  const hasCompletedData = existingData && (
    existingData.businessType ||
    existingData.idealAudience ||
    existingData.transformationStory
  )
  
  // Use initialStep if provided, otherwise default to 0
  // Map old 8-step initialStep (e.g. 5 = selfies) to new 3-step index: 5,4 -> 1 (style), 6,7 -> 2 (ready), else 0 (goal)
  const totalSteps = UNIFIED_STEPS.length
  const mapInitialStep = (raw: number) => {
    if (raw >= 6) return 2 // optional/pillars -> ready
    if (raw >= 4) return 1 // visual/selfies -> style
    if (raw >= 1) return 0 // business/audience/story -> goal
    return 0
  }
  const safeInitialStep = Math.max(0, Math.min(mapInitialStep(initialStep ?? 0), totalSteps - 1))
  const [currentStep, setCurrentStep] = useState(safeInitialStep)
  
  // Reset to initialStep when wizard opens (if initialStep changes)
  useEffect(() => {
    if (isOpen) {
      const safeStep = Math.max(0, Math.min(mapInitialStep(initialStep || 0), totalSteps - 1))
      setCurrentStep(safeStep)
    }
  }, [isOpen, initialStep, totalSteps])
  
  // Initialize formData from existingData if available (for immediate display)
  // This ensures data shows up on first render if existingData is already loaded
  const [formData, setFormData] = useState(() => {
    // Initialize from existingData if available, otherwise empty
    if (existingData && Object.keys(existingData).length > 0) {
      const normalizedVisualAesthetic = Array.isArray(existingData.visualAesthetic)
        ? existingData.visualAesthetic
        : []
      return {
        businessType: existingData.businessType || "",
        idealAudience: existingData.idealAudience || "",
        audienceChallenge: existingData.audienceChallenge || "",
        audienceTransformation: existingData.audienceTransformation || "",
        transformationStory: existingData.transformationStory || "",
        currentSituation: existingData.currentSituation || "",
        futureVision: existingData.futureVision || "",
        visualAesthetic: normalizedVisualAesthetic,
        feedStyle: existingData.feedStyle || "",
        feedStyleVariationId: existingData.feedStyleVariationId ?? null,
        selfieImages: existingData.selfieImages || [],
        fashionStyle: Array.isArray(existingData.fashionStyle) ? existingData.fashionStyle : [],
        brandInspiration: existingData.brandInspiration || "",
        inspirationLinks: existingData.inspirationLinks || "",
        contentPillars: Array.isArray(existingData.contentPillars) ? existingData.contentPillars : [],
      }
    }
    return {
      businessType: "",
      idealAudience: "",
      audienceChallenge: "",
      audienceTransformation: "",
      transformationStory: "",
      currentSituation: "",
      futureVision: "",
      visualAesthetic: [],
      feedStyle: "",
      feedStyleVariationId: null,
      selfieImages: [],
      fashionStyle: [],
      brandInspiration: "",
      inspirationLinks: "",
      contentPillars: [],
    }
  })

  // Update formData when wizard opens with existingData
  // Use a ref to track the last data key we loaded to prevent re-loading the same data
  const lastLoadedDataKeyRef = useRef<string>("")
  
  useEffect(() => {
    // Reset when wizard closes
    if (!isOpen) {
      lastLoadedDataKeyRef.current = ""
      return
    }

    // Create a stable key from existingData to detect if it's actually new data
    const dataKey = existingData && Object.keys(existingData).length > 0
      ? JSON.stringify({
          businessType: existingData.businessType,
          idealAudience: existingData.idealAudience,
          transformationStory: existingData.transformationStory,
        })
      : ""

    // Only load if this is new data (different from what we last loaded)
    if (lastLoadedDataKeyRef.current === dataKey) {
      return // Already loaded this exact data
    }

    // Load data when wizard opens with new data
    if (existingData && Object.keys(existingData).length > 0) {
      const newFormData = {
        businessType: existingData.businessType || "",
        idealAudience: existingData.idealAudience || "",
        audienceChallenge: existingData.audienceChallenge || "",
        audienceTransformation: existingData.audienceTransformation || "",
        transformationStory: existingData.transformationStory || "",
        currentSituation: existingData.currentSituation || "",
        futureVision: existingData.futureVision || "",
        visualAesthetic: Array.isArray(existingData.visualAesthetic) ? existingData.visualAesthetic : [],
        feedStyle: existingData.feedStyle || "",
        feedStyleVariationId: existingData.feedStyleVariationId ?? null,
        selfieImages: existingData.selfieImages || [],
        fashionStyle: Array.isArray(existingData.fashionStyle) ? existingData.fashionStyle : [],
        brandInspiration: existingData.brandInspiration || "",
        inspirationLinks: existingData.inspirationLinks || "",
        contentPillars: Array.isArray(existingData.contentPillars) ? existingData.contentPillars : [],
      }

      // Use functional update to ensure we don't lose any existing formData
      setFormData((prev) => {
        // Only update if the new data is actually different
        if (prev.businessType === newFormData.businessType && 
            prev.idealAudience === newFormData.idealAudience &&
            prev.transformationStory === newFormData.transformationStory) {
          return prev // No change needed
        }
        return newFormData
      })
      lastLoadedDataKeyRef.current = dataKey // Remember what we loaded
      
      // If user has completed data, reset to step 0 (welcome) so they can review/edit
      if (hasCompletedData) {
        setCurrentStep(0)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]) // Only run when wizard opens/closes - existingData changes are handled via dataKey comparison

  const [isSaving, setIsSaving] = useState(false)
  const [isGeneratingPillars, setIsGeneratingPillars] = useState(false)
  const [pillarExplanation, setPillarExplanation] = useState("")

  // Simplified: Fetch images from API once on mount (single source of truth)
  const fetcher = (url: string) => fetch(url).then((res) => res.json())
  const { data: avatarImagesData, mutate: mutateImages } = useSWR("/api/images?type=avatar", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  })

  const { data: variationData } = useSWR(
    formData.feedStyle
      ? `/api/feed-planner/v2/variations?style=${encodeURIComponent(formData.feedStyle)}`
      : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  )

  // Track if user explicitly selected a variation (prevents auto-reset)
  const userExplicitlySelectedVariationRef = useRef(false)
  const previousStyleRef = useRef<string | null>(formData.feedStyle)
  const hasInitializedVariationRef = useRef(false)
  
  // SIMPLIFIED: Set default variation when variationData loads (only if no variation set yet)
  useEffect(() => {
    if (!variationData || userExplicitlySelectedVariationRef.current) return
    
    const variations = (variationData?.variations || []) as FeedStyleVariationOption[]
    if (variations.length === 0) return

    // Only set default if no variation is currently selected
    if (formData.feedStyleVariationId === null || formData.feedStyleVariationId === undefined) {
      const defaultId =
        variationData?.defaultVariationId ||
        variations.find((variation) => variation.is_default)?.id ||
        variations[0]?.id
      if (defaultId) {
        console.log('[Onboarding Wizard] Setting default variation:', defaultId)
        setFormData((prev) => ({ ...prev, feedStyleVariationId: Number(defaultId) }))
        hasInitializedVariationRef.current = true
      }
    }
  }, [variationData, formData.feedStyleVariationId])

  // Handle style change - reset variation to default for new style
  useEffect(() => {
    
    const styleChanged = previousStyleRef.current !== formData.feedStyle && previousStyleRef.current !== null
    if (styleChanged) {
      console.log('[Onboarding Wizard] Style changed, resetting variation')
      previousStyleRef.current = formData.feedStyle
      userExplicitlySelectedVariationRef.current = false // Allow auto-selection for new style
      setFormData((prev) => ({ ...prev, feedStyleVariationId: null })) // Will be set by variationData effect
      hasInitializedVariationRef.current = false
    }
  }, [formData.feedStyle])

  // Load images from API on mount (replace, don't merge)
  // Only update if images actually changed to prevent overwriting formData
  const lastImagesKeyRef = useRef<string>("")
  useEffect(() => {
    if (avatarImagesData?.images && Array.isArray(avatarImagesData.images)) {
      const apiImageUrls = avatarImagesData.images.map((img: any) => img.image_url).filter(Boolean)
      const imagesKey = JSON.stringify(apiImageUrls)
      
      // Only update if images actually changed
      if (lastImagesKeyRef.current !== imagesKey) {
        setFormData((prev) => ({
          ...prev,
          selfieImages: apiImageUrls,
        }))
        lastImagesKeyRef.current = imagesKey
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avatarImagesData])

  // REMOVED: All localStorage logic
  // SWR cache handles persistence automatically
  // Data is saved to database on completion, and SWR fetches it when wizard reopens

  // Clear saved state when wizard completes
  // REMOVED: clearSavedState - no localStorage needed

  // totalSteps is already defined above (line 175) - reuse it here
  const progress = ((currentStep + 1) / totalSteps) * 100
  const step = UNIFIED_STEPS[currentStep]

  const canProceed = () => {
    // Welcome step
    if (step.id === "welcome") return true
    
    // Optional step
    if (step.isOptional) return true
    
    // Selfie upload step
    if (step.isSelfieUpload) {
      return Array.isArray(formData.selfieImages) && formData.selfieImages.length > 0
    }
    
    // Visual selector step
    if (step.isVisualSelector) {
      return formData.feedStyle.length > 0
    }
    
    // Audience builder step
    if (step.isAudienceBuilder) {
      return formData.idealAudience.trim().length > 0
    }
    
    // Text field steps
    if (step.field) {
      const value = formData[step.field as keyof typeof formData]
      if (Array.isArray(value)) {
        return value.length > 0
      }
      return value && value.toString().trim().length > 0
    }
    
    return true
  }

  const handleNext = () => {
    const stepIndex = currentStep + 1 // 1-based
    if (currentStep < totalSteps - 1) {
      trackAnalyticsEvent({
        event: `wizard_step_${stepIndex}_complete`,
        properties: { step: stepIndex, total_steps: totalSteps },
      }).catch(() => {})
      setCurrentStep(currentStep + 1)
    } else {
      handleComplete()
    }
  }

  const handleDismissWithAnalytics = () => {
    const stepIndex = currentStep + 1
    trackAnalyticsEvent({
      event: `wizard_abandoned_at_step_${stepIndex}`,
      properties: { step: stepIndex, total_steps: totalSteps },
    }).catch(() => {})
    onDismiss?.()
  }

  const handleComplete = async () => {
    trackAnalyticsEvent({
      event: "wizard_step_3_complete",
      properties: { step: 3, total_steps: totalSteps },
    }).catch(() => {})

    // Verify selfies are uploaded before proceeding
    const hasSelfies = Array.isArray(formData.selfieImages) && formData.selfieImages.length > 0
    if (!hasSelfies) {
      alert("Please upload at least one selfie before completing the wizard")
      return
    }

    setIsSaving(true)
    try {
      // Save data via API endpoint
      console.log('[Onboarding Wizard] Completing with data:', {
        feedStyle: formData.feedStyle,
        feedStyleVariationId: formData.feedStyleVariationId,
      })
      const payload = {
        ...formData,
        selfieImages: Array.isArray(formData.selfieImages) ? formData.selfieImages : [],
        contentPillars: Array.isArray(formData.contentPillars) ? formData.contentPillars : [],
      }

      // TODO: Update to use unified endpoint in Phase 2
      const response = await fetch("/api/onboarding/unified-onboarding-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("[Unified Wizard] ❌ Completion failed:", errorText || response.status)
        throw new Error(errorText || "Failed to save wizard data")
      }

      console.log("[Unified Wizard] ✅ Completion successful")
      
      // REMOVED: localStorage saving
      // Data is saved to database via API endpoint
      // SWR cache will automatically update when parent component calls mutatePersonalBrand()
      // When wizard reopens, existingData (from SWR) will have the latest data
      onComplete({
        ...formData,
      })
    } catch (error) {
      console.error("[Unified Onboarding] Error saving data:", error)
      alert(error instanceof Error ? error.message : "Failed to save. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleMultiSelectToggle = (field: string, value: string) => {
    setFormData((prev) => {
      const currentValues = (prev[field as keyof typeof prev] as string[]) || []
      const isSelected = currentValues.includes(value)

      return {
        ...prev,
        [field]: isSelected ? currentValues.filter((v) => v !== value) : [...currentValues, value],
      }
    })
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
            className="fixed inset-0 bg-stone-950/60 backdrop-blur-sm z-100"
            onClick={handleDismissWithAnalytics}
          />

          {/* Wizard Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-100 flex items-center justify-center p-4 pb-24 sm:pb-28 md:pb-32"
            onClick={(e) => e.stopPropagation()}
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 6rem)" }}
          >
            <div
              className={`w-full max-w-3xl max-h-[90vh] overflow-y-auto ${ComponentClasses.card} ${DesignClasses.spacing.padding.lg} relative rounded-2xl shadow-2xl bg-white`}
            >
              {/* Close Button */}
              {onDismiss && (
                <button
                  onClick={handleDismissWithAnalytics}
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
                {/* Progress Bar + Step indicator */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-light tracking-[0.2em] uppercase text-stone-700">
                      {currentStep + 1} of 3
                    </span>
                    <span className="text-xs font-light text-stone-700">{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="h-1 bg-stone-200" />
                </div>

                {/* Title */}
                <h2
                  style={{ fontFamily: "'Times New Roman', serif" }}
                  className="text-2xl sm:text-3xl md:text-4xl font-light tracking-[0.15em] uppercase text-stone-950"
                >
                  {step.title}
                </h2>

                {/* Step 1: Goal */}
                {currentStep === 0 && (
                  <div className="space-y-6">
                    <p className="text-base sm:text-lg font-light leading-relaxed text-stone-700">
                      Hi {userName && !userName.includes('@') ? userName : "there"}! 👋 Tell us a bit about what you do and who you're here for.
                    </p>
                    <div>
                      <label className="block text-[10px] sm:text-xs font-medium tracking-wider uppercase text-stone-700 mb-2 sm:mb-3">
                        What do you do?
                      </label>
                      <Input
                        type="text"
                        value={formData.businessType || ""}
                        onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                        placeholder="e.g., Life Coach, Designer, Consultant..."
                        className="w-full border-b border-stone-300 py-3 sm:py-4 focus:outline-none focus:border-stone-950 transition-colors font-light bg-transparent border-t-0 border-l-0 border-r-0 rounded-none text-stone-950"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] sm:text-xs font-medium tracking-wider uppercase text-stone-700 mb-2 sm:mb-3">
                        Who is your ideal audience?
                      </label>
                      <Textarea
                        value={formData.idealAudience}
                        onChange={(e) => setFormData({ ...formData, idealAudience: e.target.value })}
                        placeholder="e.g., Women entrepreneurs building their brand, new moms balancing work and family..."
                        className="w-full border-b border-stone-300 py-3 sm:py-4 focus:outline-none focus:border-stone-950 transition-colors font-light bg-transparent border-t-0 border-l-0 border-r-0 rounded-none text-stone-950 min-h-[80px] resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] sm:text-xs font-medium tracking-wider uppercase text-stone-700 mb-2 sm:mb-3">
                        What's your story? (optional)
                      </label>
                      <Textarea
                        value={formData.transformationStory}
                        onChange={(e) => setFormData({ ...formData, transformationStory: e.target.value })}
                        placeholder="Share your journey or what drives you..."
                        className="w-full border-b border-stone-300 py-3 sm:py-4 focus:outline-none focus:border-stone-950 transition-colors font-light bg-transparent border-t-0 border-l-0 border-r-0 rounded-none text-stone-950 min-h-[80px] resize-none"
                      />
                    </div>
                  </div>
                )}

                {/* Step 2: Style */}
                {currentStep === 1 && (
                  <div className="space-y-6">
                    <p className="text-sm font-light text-stone-600">
                      Pick a vibe that feels like you. Then add 1–3 selfies so we can match your look.
                    </p>

                    <div>
                      <label className="block text-[10px] sm:text-xs font-medium tracking-wider uppercase text-stone-700 mb-4">
                        Feed Style
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
                        {Object.entries(FEED_EXAMPLES).map(([key, style]) => (
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

                    {formData.feedStyle && (
                      <div>
                        <label className="block text-[10px] sm:text-xs font-medium tracking-wider uppercase text-stone-700 mb-4">
                          Choose Variation
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {(variationData?.variations || []).map((variation: FeedStyleVariationOption) => {
                            const isSelected = formData.feedStyleVariationId === variation.id
                            return (
                              <button
                                key={variation.id}
                                onClick={() => {
                                  userExplicitlySelectedVariationRef.current = true
                                  setFormData((prev) => ({ ...prev, feedStyleVariationId: variation.id }))
                                }}
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
                          <p className="text-xs text-stone-500 mt-3">No variations available for this style.</p>
                        )}
                      </div>
                    )}

                    <div>
                      <label className="block text-[10px] sm:text-xs font-medium tracking-wider uppercase text-stone-700 mb-2">
                        Upload 1–3 selfies
                      </label>
                      <p className="text-xs font-light text-stone-500 mb-3">
                        These help AI generate images that match your look.
                      </p>
                      <BlueprintSelfieUpload
                        onUploadComplete={(imageUrls) => {
                          setFormData({ ...formData, selfieImages: imageUrls })
                          mutateImages()
                        }}
                        maxImages={3}
                        initialImages={Array.isArray(formData.selfieImages) ? formData.selfieImages : []}
                      />
                    </div>
                  </div>
                )}

                {/* Step 3: You're ready! — single CTA */}
                {currentStep === 2 && (
                  <div className="space-y-6">
                    <p className="text-base sm:text-lg font-light leading-relaxed text-stone-700">
                      Your feed is ready. One tap and we'll create your first 9-post grid.
                    </p>
                    <p className="text-sm font-light text-stone-600">
                      You can always come back to edit your goal or style from the Feed Planner header.
                    </p>
                    <Button
                      onClick={handleComplete}
                      disabled={isSaving}
                      className="w-full py-6 text-base sm:text-lg font-medium uppercase tracking-wider bg-stone-950 hover:bg-stone-800 text-stone-50 flex items-center justify-center gap-2 shadow-lg"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 size={20} className="animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          Create my first feed
                          <ArrowRight size={20} />
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {/* Navigation — only for steps 1 and 2; step 3 has single CTA above */}
                {currentStep < 2 && (
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4">
                    {currentStep > 0 && (
                      <Button
                        variant="outline"
                        onClick={() => setCurrentStep(currentStep - 1)}
                        className="w-full sm:flex-1 border-stone-300 text-stone-700 hover:bg-stone-50"
                      >
                        Back
                      </Button>
                    )}
                    <Button
                      onClick={handleNext}
                      disabled={!canProceed() || isSaving}
                      className="w-full sm:flex-1 bg-stone-950 text-stone-50 hover:bg-stone-800"
                    >
                      {currentStep === 0 ? "Continue →" : "Continue →"}
                    </Button>
                  </div>
                )}
              </motion.div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
