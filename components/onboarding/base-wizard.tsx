"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"
import { DesignClasses, ComponentClasses } from "@/lib/design-tokens"

interface BaseWizardProps {
  isOpen: boolean
  onComplete: () => void
  onDismiss?: () => void
  userName?: string | null
  userEmail?: string | null
  existingBlueprintData?: {
    business?: string
    dreamClient?: string
    struggle?: string
  }
}

const COLOR_THEMES = [
  {
    id: "dark-moody",
    name: "Dark & Moody",
    description: "Dramatic blacks and grays with high contrast",
    colors: ["#000000", "#2C2C2C", "#4A4A4A", "#6B6B6B"],
    gradient: "from-black via-stone-800 to-stone-600",
  },
  {
    id: "minimalist-clean",
    name: "Minimalistic & Clean",
    description: "Soft whites, creams, and beiges",
    colors: ["#FFFFFF", "#F5F5F0", "#E8E4DC", "#D4CFC4"],
    gradient: "from-white via-stone-50 to-stone-200",
  },
  {
    id: "beige-creamy",
    name: "Beige & Creamy",
    description: "Warm neutrals and earthy tones",
    colors: ["#F5F1E8", "#E8DCC8", "#D4C4A8", "#B8A88A"],
    gradient: "from-stone-100 via-stone-200 to-stone-300",
  },
  {
    id: "pastel-coastal",
    name: "Pastel & Coastal",
    description: "Soft blues, teals, and aqua tones",
    colors: ["#E8F4F8", "#B8E0E8", "#88CCD8", "#5BA8B8"],
    gradient: "from-cyan-50 via-cyan-100 to-cyan-200",
  },
  {
    id: "warm-terracotta",
    name: "Warm & Terracotta",
    description: "Rust, terracotta, and warm earth tones",
    colors: ["#E8D4C8", "#C8A898", "#A88878", "#886858"],
    gradient: "from-orange-100 via-orange-200 to-orange-300",
  },
  {
    id: "bold-colorful",
    name: "Bold & Colorful",
    description: "Vibrant colors with high energy",
    colors: ["#FF6B9D", "#FFA07A", "#FFD700", "#98D8C8"],
    gradient: "from-pink-300 via-orange-300 to-yellow-300",
  },
  {
    id: "custom",
    name: "Custom Colors",
    description: "Choose your own brand colors",
    colors: ["#D4C5B9", "#A89B8E", "#8B7E71", "#6E6154"],
    gradient: "from-stone-200 via-stone-300 to-stone-400",
    isCustom: true,
  },
]

const VISUAL_AESTHETICS = [
  { id: "minimalist", name: "Minimalist & Clean", description: "Simple, uncluttered, lots of white space" },
  { id: "bold", name: "Bold & Dramatic", description: "High contrast, striking visuals, confident" },
  { id: "soft", name: "Soft & Elegant", description: "Gentle, refined, sophisticated" },
  { id: "edgy", name: "Edgy & Modern", description: "Contemporary, urban, cutting-edge" },
  { id: "natural", name: "Natural & Organic", description: "Earthy, authentic, grounded" },
  { id: "luxurious", name: "Luxurious & Polished", description: "High-end, premium, refined" },
]

// Base wizard steps (6 total: Intro + 5 data steps)
const BASE_STEPS = [
  {
    id: "intro",
    title: "Welcome",
    subtitle: "Let's create your personal brand together",
    mayaMessage:
      "I'm Maya, and I'm here to help you create content that actually looks and sounds like YOU. To do that, I need to understand your unique style, voice, and vision. This will only take a few minutes, and trust me - it's worth it!",
  },
  {
    id: "name",
    title: "What should I call your brand?",
    subtitle: "Step 1 of 6",
    mayaMessage:
      "This could be your business name, your personal brand, or just your name. Whatever feels right to you!",
    field: "name",
    placeholder: "e.g., Sandra Social, The Style Studio, etc.",
  },
  {
    id: "businessType",
    title: "What do you do?",
    subtitle: "Step 2 of 6",
    mayaMessage:
      "Are you a coach, designer, entrepreneur, content creator? Tell me about your work - I want to understand what makes you unique.",
    field: "businessType",
    placeholder: "e.g., Life Coach, Fashion Designer, Content Creator...",
    isTextarea: true,
  },
  {
    id: "colorTheme",
    title: "What's your color aesthetic?",
    subtitle: "Step 3 of 6",
    mayaMessage:
      "Your color palette sets the mood for everything we create together. Choose the aesthetic that feels most like YOU.",
    isColorThemeSelector: true,
  },
  {
    id: "visualAesthetic",
    title: "What's your visual style?",
    subtitle: "Step 4 of 6",
    mayaMessage:
      "Beyond colors, what's the overall vibe of your brand? This helps me understand the mood and feeling of your content.",
    isVisualAestheticSelector: true,
  },
  {
    id: "currentSituation",
    title: "Where are you right now?",
    subtitle: "Step 5 of 6",
    mayaMessage:
      "Are you building your business foundation? Growing your online presence? Scaling? Understanding where you are helps me create photos that match your current journey.",
    field: "currentSituation",
    placeholder: "e.g., Building my business foundation, Growing my online presence...",
    isTextarea: true,
  },
]

export default function BaseWizard({
  isOpen,
  onComplete,
  onDismiss,
  userName,
  userEmail,
  existingBlueprintData,
}: BaseWizardProps) {
  // Pre-fill logic (approved): Name = user's display_name or email, Business Type = from blueprint form_data.business
  const [formData, setFormData] = useState({
    name: userName || userEmail?.split("@")[0] || "",
    businessType: existingBlueprintData?.business || "",
    colorTheme: "",
    visualAesthetic: [] as string[],
    currentSituation: "",
  })
  const [currentStep, setCurrentStep] = useState(0)
  const [isSaving, setIsSaving] = useState(false)
  const [customColors, setCustomColors] = useState<string[]>(["#D4C5B9", "#A89B8E", "#8B7E71", "#6E6154"])

  // Update formData when props change (for pre-filling)
  useEffect(() => {
    if (existingBlueprintData?.business && !formData.businessType) {
      setFormData((prev) => ({
        ...prev,
        businessType: existingBlueprintData.business || prev.businessType,
      }))
    }
  }, [existingBlueprintData])

  const step = BASE_STEPS[currentStep]
  const progress = ((currentStep + 1) / BASE_STEPS.length) * 100
  const isIntroStep = step.id === "intro"
  const isLastStep = currentStep === BASE_STEPS.length - 1

  const handleNext = () => {
    if (currentStep < BASE_STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleComplete = async () => {
    setIsSaving(true)
    try {
      const response = await fetch("/api/onboarding/base-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: formData.name,
          businessType: formData.businessType,
          colorTheme: formData.colorTheme,
          visualAesthetic: JSON.stringify(formData.visualAesthetic),
          currentSituation: formData.currentSituation,
          customColors: formData.colorTheme === "custom" ? JSON.stringify(customColors) : null,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to save base wizard data")
      }

      console.log("[Base Wizard] ✅ Base wizard data saved successfully")
      onComplete()
    } catch (error) {
      console.error("[Base Wizard] Error saving base wizard data:", error)
      alert("Failed to save. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleMultiSelectToggle = (field: string, value: string) => {
    setFormData((prev) => {
      const currentValues = prev[field as keyof typeof prev] as string[]
      const isSelected = currentValues.includes(value)

      return {
        ...prev,
        [field]: isSelected ? currentValues.filter((v) => v !== value) : [...currentValues, value],
      }
    })
  }

  const handleColorThemeSelect = (themeId: string) => {
    setFormData((prev) => ({ ...prev, colorTheme: themeId }))
  }

  const handleCustomColorChange = (index: number, color: string) => {
    const newColors = [...customColors]
    newColors[index] = color
    setCustomColors(newColors)
  }

  const canProceed = () => {
    if (isIntroStep) return true
    if (step.isColorThemeSelector) return formData.colorTheme.length > 0
    if (step.isVisualAestheticSelector) return formData.visualAesthetic.length > 0
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

                  {step.isColorThemeSelector ? (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {COLOR_THEMES.map((theme) => (
                          <button
                            key={theme.id}
                            onClick={() => handleColorThemeSelect(theme.id)}
                            className={`relative p-6 rounded-lg border transition-all text-left hover:shadow-sm ${
                              formData.colorTheme === theme.id
                                ? "border-stone-950 bg-stone-50"
                                : "border-stone-200 hover:border-stone-400"
                            }`}
                          >
                            <div className="flex gap-2 mb-4">
                              {theme.isCustom && formData.colorTheme === "custom"
                                ? customColors.map((color, idx) => (
                                    <div
                                      key={idx}
                                      className="w-10 h-10 rounded-full border border-stone-200"
                                      style={{ backgroundColor: color }}
                                    />
                                  ))
                                : theme.colors.map((color, idx) => (
                                    <div
                                      key={idx}
                                      className="w-10 h-10 rounded-full border border-stone-200"
                                      style={{ backgroundColor: color }}
                                    />
                                  ))}
                            </div>

                            <div className="space-y-2">
                              <p className="text-sm font-medium tracking-wider uppercase text-stone-950">{theme.name}</p>
                              <p className="text-sm font-light text-stone-600">{theme.description}</p>
                            </div>

                            {formData.colorTheme === theme.id && (
                              <div className="absolute top-4 right-4 w-6 h-6 bg-stone-950 rounded-full" />
                            )}
                          </button>
                        ))}
                      </div>

                      {formData.colorTheme === "custom" && (
                        <div className="bg-stone-50 border border-stone-200 rounded-lg p-6 space-y-6">
                          <div className="space-y-2">
                            <h3 className="text-sm font-medium tracking-wider uppercase text-stone-950">
                              CUSTOMIZE YOUR BRAND COLORS
                            </h3>
                            <p className="text-sm font-light text-stone-600">
                              Choose 4 colors that represent your brand. These will be used throughout your content.
                            </p>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {customColors.map((color, index) => (
                              <div key={index} className="space-y-2">
                                <label className="text-xs font-light tracking-[0.2em] uppercase text-stone-500">
                                  Color {index + 1}
                                </label>
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    value={color}
                                    onChange={(e) => handleCustomColorChange(index, e.target.value)}
                                    placeholder="#000000"
                                    className="flex-1 px-4 py-3 text-sm border border-stone-200 rounded-lg bg-white text-stone-950 focus:border-stone-400 focus:outline-none transition-colors"
                                  />
                                  <input
                                    type="color"
                                    value={color}
                                    onChange={(e) => handleCustomColorChange(index, e.target.value)}
                                    className="w-14 h-12 rounded-lg border border-stone-200 cursor-pointer"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : step.isVisualAestheticSelector ? (
                    <div className="space-y-4">
                      <div className="space-y-3">
                        <p className="text-xs font-light tracking-[0.2em] uppercase text-stone-500">SELECT ALL THAT APPLY</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {VISUAL_AESTHETICS.map((aesthetic) => {
                            const isSelected = formData.visualAesthetic.includes(aesthetic.id)
                            return (
                              <button
                                key={aesthetic.id}
                                onClick={() => handleMultiSelectToggle("visualAesthetic", aesthetic.id)}
                                className={`relative p-6 rounded-lg border transition-all text-left hover:shadow-sm ${
                                  isSelected ? "border-stone-950 bg-stone-50" : "border-stone-200 hover:border-stone-400"
                                }`}
                              >
                                <div className="space-y-2">
                                  <p className="text-sm font-medium tracking-wider uppercase text-stone-950">
                                    {aesthetic.name}
                                  </p>
                                  <p className="text-sm font-light text-stone-600">{aesthetic.description}</p>
                                </div>
                                {isSelected && (
                                  <div className="absolute top-4 right-4 w-6 h-6 bg-stone-950 rounded-full flex items-center justify-center">
                                    <div className="w-3 h-3 bg-white rounded-sm" />
                                  </div>
                                )}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  ) : !isIntroStep && step.field ? (
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
                      {isIntroStep ? "LET'S START" : "NEXT"}
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
