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
import { Aperture, Check, MessageCircle, Loader2 } from "lucide-react"
import { Card } from "@/components/ui/card"

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

// Visual aesthetics (from brand profile wizard)
const VISUAL_AESTHETICS = [
  { id: "minimal", name: "Minimal", description: "Clean, simple, uncluttered" },
  { id: "luxury", name: "Luxury", description: "Elegant, sophisticated, premium" },
  { id: "warm", name: "Warm", description: "Cozy, inviting, comfortable" },
  { id: "edgy", name: "Edgy", description: "Bold, unconventional, daring" },
  { id: "professional", name: "Professional", description: "Polished, corporate, refined" },
  { id: "beige", name: "Beige Aesthetic", description: "Neutral, earthy, calm" },
]

// Feed style examples (from blueprint wizard)
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

// Fashion styles (from brand profile wizard)
const FASHION_STYLES = [
  { id: "casual", name: "Casual", description: "Everyday, relaxed, comfortable" },
  { id: "business", name: "Business", description: "Professional, formal, polished" },
  { id: "bohemian", name: "Bohemian", description: "Free-spirited, artistic, eclectic" },
  { id: "classic", name: "Classic", description: "Timeless, elegant, enduring" },
  { id: "trendy", name: "Trendy", description: "Fashion-forward, current, modern" },
  { id: "athletic", name: "Athletic", description: "Sporty, active, functional" },
]

const UNIFIED_STEPS = [
  {
    id: "welcome",
    title: "Welcome",
    subtitle: "Let\u0027s get started",
  },
  {
    id: "business",
    title: "What do you do?",
    subtitle: "Step 1 of 8",
    field: "businessType",
  },
  {
    id: "audience",
    title: "Who is your ideal audience?",
    subtitle: "Step 2 of 8",
    isAudienceBuilder: true,
  },
  {
    id: "story",
    title: "What\u0027s your story?",
    subtitle: "Step 3 of 8",
    field: "transformationStory",
    isTextarea: true,
  },
  {
    id: "visual",
    title: "What\u0027s your visual style?",
    subtitle: "Step 4 of 8",
    isVisualSelector: true,
  },
  {
    id: "selfies",
    title: "Upload your selfies",
    subtitle: "Step 5 of 8",
    isSelfieUpload: true,
  },
  {
    id: "optional",
    title: "Optional details",
    subtitle: "Step 6 of 8",
    isOptional: true,
  },
  {
    id: "brandPillars",
    title: "Create your content pillars",
    subtitle: "Step 7 of 8 (Optional)",
    isBrandPillars: true,
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
  // Clamp initialStep to valid range (0 to totalSteps - 1)
  const totalSteps = UNIFIED_STEPS.length
  const safeInitialStep = Math.max(0, Math.min(initialStep, totalSteps - 1))
  const [currentStep, setCurrentStep] = useState(safeInitialStep)
  
  // Reset to initialStep when wizard opens (if initialStep changes)
  useEffect(() => {
    if (isOpen) {
      const safeStep = Math.max(0, Math.min(initialStep || 0, totalSteps - 1))
      setCurrentStep(safeStep)
    }
  }, [isOpen, initialStep, totalSteps])
  
  // Initialize formData from existingData if available (for immediate display)
  // This ensures data shows up on first render if existingData is already loaded
  const [formData, setFormData] = useState(() => {
    // Initialize from existingData if available, otherwise empty
    if (existingData && Object.keys(existingData).length > 0) {
      return {
        businessType: existingData.businessType || "",
        idealAudience: existingData.idealAudience || "",
        audienceChallenge: existingData.audienceChallenge || "",
        audienceTransformation: existingData.audienceTransformation || "",
        transformationStory: existingData.transformationStory || "",
        currentSituation: existingData.currentSituation || "",
        futureVision: existingData.futureVision || "",
        visualAesthetic: Array.isArray(existingData.visualAesthetic) ? existingData.visualAesthetic : [],
        feedStyle: existingData.feedStyle || "",
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
      return formData.visualAesthetic.length > 0 && formData.feedStyle.length > 0
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

    setIsSaving(true)
    try {
      // Save data via API endpoint
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
      onComplete(formData)
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
              className={`w-full max-w-3xl max-h-[90vh] overflow-y-auto ${ComponentClasses.card} ${DesignClasses.spacing.padding.lg} relative rounded-2xl shadow-2xl bg-white`}
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
                    <span className="text-xs font-light tracking-[0.2em] uppercase text-stone-700">{step.subtitle}</span>
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

                {/* Step 1: Welcome */}
                {currentStep === 0 && (
                  <div className="space-y-6">
                    <p className="text-base sm:text-lg font-light leading-relaxed text-stone-700">
                      Hi {userName && !userName.includes('@') ? userName : "there"}! 👋 Let\u0027s create content that actually looks and sounds like you. This will only take a few minutes.
                    </p>
                    <p className="text-sm font-light text-stone-600">
                      We\u0027ll ask you a few questions about your brand, style, and goals. Your answers help us generate personalized content just for you.
                    </p>
                  </div>
                )}

                {/* Step 2: Business Type */}
                {currentStep === 1 && (
                  <div className="space-y-6">
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
                      {/* Debug: Show current formData value */}
                      {process.env.NODE_ENV === 'development' && (
                        <p className="text-xs text-stone-400 mt-1">Debug: formData.businessType = &quot;{formData.businessType}&quot;</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Step 3: Audience Builder */}
                {currentStep === 2 && (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-[10px] sm:text-xs font-medium tracking-wider uppercase text-stone-700 mb-2 sm:mb-3">
                        Who is your ideal audience?
                      </label>
                      <Textarea
                        value={formData.idealAudience}
                        onChange={(e) => setFormData({ ...formData, idealAudience: e.target.value })}
                        placeholder="e.g., Women entrepreneurs looking to build their personal brand, New moms balancing work and family..."
                        className="w-full border-b border-stone-300 py-3 sm:py-4 focus:outline-none focus:border-stone-950 transition-colors font-light bg-transparent border-t-0 border-l-0 border-r-0 rounded-none text-stone-950 min-h-[100px] resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] sm:text-xs font-medium tracking-wider uppercase text-stone-700 mb-2 sm:mb-3">
                        What challenge do they face?
                      </label>
                      <Textarea
                        value={formData.audienceChallenge}
                        onChange={(e) => setFormData({ ...formData, audienceChallenge: e.target.value })}
                        placeholder="e.g., Struggling to stand out online, Overwhelmed by content creation..."
                        className="w-full border-b border-stone-300 py-3 sm:py-4 focus:outline-none focus:border-stone-950 transition-colors font-light bg-transparent border-t-0 border-l-0 border-r-0 rounded-none text-stone-950 min-h-[80px] resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] sm:text-xs font-medium tracking-wider uppercase text-stone-700 mb-2 sm:mb-3">
                        What transformation do they want?
                      </label>
                      <Textarea
                        value={formData.audienceTransformation}
                        onChange={(e) => setFormData({ ...formData, audienceTransformation: e.target.value })}
                        placeholder="e.g., Build a strong personal brand, Create consistent content..."
                        className="w-full border-b border-stone-300 py-3 sm:py-4 focus:outline-none focus:border-stone-950 transition-colors font-light bg-transparent border-t-0 border-l-0 border-r-0 rounded-none text-stone-950 min-h-[80px] resize-none"
                      />
                    </div>
                  </div>
                )}

                {/* Step 4: Story */}
                {currentStep === 3 && (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-[10px] sm:text-xs font-medium tracking-wider uppercase text-stone-700 mb-2 sm:mb-3">
                        What\u0027s your story?
                      </label>
                      <Textarea
                        value={formData.transformationStory}
                        onChange={(e) => setFormData({ ...formData, transformationStory: e.target.value })}
                        placeholder="Share your journey, your why, what drives you..."
                        className="w-full border-b border-stone-300 py-3 sm:py-4 focus:outline-none focus:border-stone-950 transition-colors font-light bg-transparent border-t-0 border-l-0 border-r-0 rounded-none text-stone-950 min-h-[150px] resize-none"
                      />
                    </div>
                  </div>
                )}

                {/* Step 5: Visual Style + Feed Style (merged) */}
                {currentStep === 4 && (
                  <div className="space-y-6">
                    <p className="text-sm font-light text-stone-600 mb-6">
                      Pick a vibe that feels like you. Don\u0027t worry, you can always switch things up later!
                    </p>

                    {/* Visual Aesthetic Selection */}
                    <div>
                      <label className="block text-[10px] sm:text-xs font-medium tracking-wider uppercase text-stone-700 mb-4">
                        Visual Aesthetic (Select all that apply)
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {VISUAL_AESTHETICS.map((aesthetic) => {
                          const isSelected = formData.visualAesthetic.includes(aesthetic.id)
                          return (
                            <button
                              key={aesthetic.id}
                              onClick={() => handleMultiSelectToggle("visualAesthetic", aesthetic.id)}
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

                    {/* Feed Style Selection (from blueprint wizard) */}
                    <div>
                      <label className="block text-[10px] sm:text-xs font-medium tracking-wider uppercase text-stone-700 mb-4">
                        Feed Style
                      </label>
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
                  </div>
                )}

                {/* Step 6: Selfie Upload */}
                {currentStep === 5 && (
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
                        // Update local state for immediate UI feedback
                        setFormData({ ...formData, selfieImages: imageUrls })
                        // Trigger SWR revalidation to sync with API
                        mutateImages()
                      }}
                      maxImages={3}
                      initialImages={Array.isArray(formData.selfieImages) ? formData.selfieImages : []}
                    />
                  </div>
                )}

                {/* Step 6: Optional Details */}
                {currentStep === 6 && (
                  <div className="space-y-6">
                    <p className="text-sm font-light text-stone-600 mb-6">
                      These are optional, but they help us create even more personalized content for you.
                    </p>

                    {/* Fashion Style */}
                    <div>
                      <label className="block text-[10px] sm:text-xs font-medium tracking-wider uppercase text-stone-700 mb-4">
                        Fashion Style (Optional - Select all that apply)
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {FASHION_STYLES.map((style) => {
                          const isSelected = (formData.fashionStyle || []).includes(style.id)
                          return (
                            <button
                              key={style.id}
                              onClick={() => handleMultiSelectToggle("fashionStyle", style.id)}
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

                    {/* Brand Inspiration */}
                    <div>
                      <label className="block text-[10px] sm:text-xs font-medium tracking-wider uppercase text-stone-700 mb-2 sm:mb-3">
                        Who inspires you? (Optional)
                      </label>
                      <Input
                        type="text"
                        value={formData.brandInspiration}
                        onChange={(e) => setFormData({ ...formData, brandInspiration: e.target.value })}
                        placeholder="e.g., @creator1, @creator2, Brand Name..."
                        className="w-full border-b border-stone-300 py-3 sm:py-4 focus:outline-none focus:border-stone-950 transition-colors font-light bg-transparent border-t-0 border-l-0 border-r-0 rounded-none text-stone-950"
                      />
                    </div>
                  </div>
                )}

                {/* Step 7: Brand Pillars (Optional) */}
                {currentStep === 7 && (
                  <div className="space-y-6">
                    {formData.contentPillars && formData.contentPillars.length > 0 ? (
                      <>
                        {/* Maya's Explanation */}
                        {pillarExplanation && (
                          <div className="flex gap-4 items-start bg-stone-50 rounded-xl p-4">
                            <div className="flex-shrink-0 w-12 h-12 bg-stone-950 rounded-full flex items-center justify-center">
                              <Aperture size={20} className="text-white" />
                            </div>
                            <div className="flex-1">
                              <p className="text-xs font-semibold text-stone-950 mb-1">Maya</p>
                              <p className="text-sm text-stone-600 leading-relaxed">{pillarExplanation}</p>
                            </div>
                          </div>
                        )}

                        {/* Content Pillars Grid */}
                        <div className="grid gap-4">
                          {formData.contentPillars.map((pillar: any, index: number) => (
                            <Card
                              key={index}
                              className="p-4 border-stone-200 bg-white"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-semibold text-stone-950">{pillar.name}</h3>
                                    <Check size={16} className="text-stone-950" />
                                  </div>
                                  <p className="text-sm text-stone-600">{pillar.description}</p>
                                </div>
                              </div>

                              {/* Content Ideas */}
                              {pillar.contentIdeas && pillar.contentIdeas.length > 0 && (
                                <div className="mt-3 space-y-1">
                                  <p className="text-xs font-medium text-stone-500 mb-2">Post ideas:</p>
                                  {pillar.contentIdeas.map((idea: string, i: number) => (
                                    <div key={i} className="flex items-start gap-2">
                                      <span className="text-xs text-stone-400 mt-0.5">•</span>
                                      <p className="text-xs text-stone-600">{idea}</p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </Card>
                          ))}
                        </div>

                        <div className="flex gap-3 pt-4 border-t border-stone-200">
                          <Button
                            onClick={() => {
                              setFormData({ ...formData, contentPillars: [] })
                              setPillarExplanation("")
                            }}
                            variant="ghost"
                            className="text-stone-600"
                          >
                            Start over
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Maya's Introduction */}
                        <div className="flex gap-4 items-start bg-stone-50 rounded-xl p-4">
                          <div className="flex-shrink-0 w-12 h-12 bg-stone-950 rounded-full flex items-center justify-center">
                            <Aperture size={20} className="text-white" />
                          </div>
                          <div className="flex-1">
                            <p className="text-xs font-semibold text-stone-950 mb-1">Maya</p>
                            <p className="text-sm text-stone-600 leading-relaxed">
                            Now let\u0027s figure out what you\u0027ll actually post about! Content pillars are the main themes you\u0027ll create
                              content around. Think of them as your content categories - they keep your feed organized and make it easy
                              to come up with post ideas.
                            </p>
                            <p className="text-sm text-stone-600 leading-relaxed mt-2">
                            Based on everything you\u0027ve told me about your brand, I can suggest pillars that will work perfectly for
                              you. Ready?
                            </p>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                          <Button
                            onClick={async () => {
                              setIsGeneratingPillars(true)
                              try {
                                // Prepare user answers for Maya
                                const userAnswers = {
                                  businessType: formData.businessType,
                                  idealAudience: formData.idealAudience,
                                  audienceChallenge: formData.audienceChallenge,
                                  audienceTransformation: formData.audienceTransformation,
                                  transformationStory: formData.transformationStory,
                                  visualAesthetic: formData.visualAesthetic.join(", "),
                                  feedStyle: formData.feedStyle,
                                }

                                const response = await fetch("/api/maya/content-pillars", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  credentials: "include",
                                  body: JSON.stringify({ userAnswers }),
                                })

                                if (!response.ok) {
                                  throw new Error("Failed to generate content pillars")
                                }

                                const data = await response.json()
                                setFormData({ ...formData, contentPillars: data.pillars })
                                setPillarExplanation(data.explanation)
                              } catch (error) {
                                console.error("[Unified Wizard] Error generating pillars:", error)
                                alert("Failed to generate content pillars. Please try again.")
                              } finally {
                                setIsGeneratingPillars(false)
                              }
                            }}
                            disabled={isGeneratingPillars}
                            className="flex-1 bg-stone-950 hover:bg-stone-800 text-white"
                          >
                            {isGeneratingPillars ? (
                              <>
                                <Loader2 size={16} className="mr-2 animate-spin" />
                                Maya is thinking...
                              </>
                            ) : (
                              <>
                                <MessageCircle size={16} className="mr-2" />
                                Help me create content pillars
                              </>
                            )}
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Navigation */}
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
