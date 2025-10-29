"use client"

import { useState } from "react"
import { Aperture, ArrowRight, ArrowLeft, Check, Palette } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import ContentPillarBuilder from "./content-pillar-builder"

interface BrandProfileWizardProps {
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
  existingData?: any
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

const STEPS = [
  {
    id: "intro",
    title: "Hey there! 👋",
    subtitle: "Let's create your personal brand together",
    mayaMessage:
      "I'm Maya, and I'm here to help you create content that actually looks and sounds like YOU. To do that, I need to understand your unique style, voice, and vision. This will only take a few minutes, and trust me - it's worth it!",
  },
  {
    id: "name",
    title: "What should I call your brand?",
    subtitle: "Step 1 of 8",
    mayaMessage:
      "This could be your business name, your personal brand, or just your name. Whatever feels right to you!",
    field: "name",
    placeholder: "e.g., Sandra Social, The Style Studio, etc.",
  },
  {
    id: "businessType",
    title: "What do you do?",
    subtitle: "Step 2 of 8",
    mayaMessage:
      "Are you a coach, designer, entrepreneur, content creator? Tell me about your work - I want to understand what makes you unique.",
    field: "businessType",
    placeholder: "e.g., Life Coach, Fashion Designer, Content Creator...",
    isTextarea: true,
  },
  {
    id: "colorTheme",
    title: "What's your brand aesthetic?",
    subtitle: "Step 3 of 8",
    mayaMessage:
      "Your color palette sets the mood for everything we create together. Choose the aesthetic that feels most like YOU. This helps me keep your images and brand visually consistent.",
    isColorThemeSelector: true,
  },
  {
    id: "currentSituation",
    title: "Where are you right now?",
    subtitle: "Step 4 of 8",
    mayaMessage:
      "Are you building your business foundation? Growing your online presence? Scaling? Understanding where you are helps me create photos that match your current journey.",
    field: "currentSituation",
    placeholder: "e.g., Building my business foundation, Growing my online presence...",
    isTextarea: true,
  },
  {
    id: "transformationStory",
    title: "What's your story?",
    subtitle: "Step 5 of 8",
    mayaMessage:
      "Everyone has a story. What brought you here? What transformation are you going through or have you been through? Your story makes your brand authentic and relatable.",
    field: "transformationStory",
    placeholder: "Share your journey, your why, what drives you...",
    isTextarea: true,
  },
  {
    id: "futureVision",
    title: "Where are you headed?",
    subtitle: "Step 6 of 8",
    mayaMessage:
      "Dream big! Where do you see yourself and your brand in the future? What impact do you want to make? This helps me create photos that align with your vision.",
    field: "futureVision",
    placeholder: "e.g., Recognized expert in my field, Financial freedom and impact...",
    isTextarea: true,
  },
  {
    id: "photoGoals",
    title: "What do you need photos for?",
    subtitle: "Step 7 of 8",
    mayaMessage:
      "Are you building a social media presence? Need professional headshots? Creating content for your website? Knowing this helps me create exactly what you need.",
    field: "photoGoals",
    placeholder: "e.g., Social media content, Professional brand photos, Website images...",
    isTextarea: true,
  },
  {
    id: "contentPillars",
    title: "What will you post about?",
    subtitle: "Step 8 of 8",
    mayaMessage: "Let me help you figure out your content strategy!",
    isContentPillarBuilder: true,
  },
]

export default function BrandProfileWizard({ isOpen, onClose, onComplete, existingData }: BrandProfileWizardProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: existingData?.name || "",
    businessType: existingData?.businessType || "",
    colorTheme: existingData?.colorTheme || "",
    currentSituation: existingData?.currentSituation || "",
    transformationStory: existingData?.transformationStory || "",
    futureVision: existingData?.futureVision || "",
    businessGoals: existingData?.businessGoals || "",
    photoGoals: existingData?.photoGoals || "",
    stylePreferences: existingData?.stylePreferences || "",
  })
  const [contentPillars, setContentPillars] = useState<any[]>([])
  const [customColors, setCustomColors] = useState<string[]>(
    existingData?.customColors ? JSON.parse(existingData.customColors) : ["#D4C5B9", "#A89B8E", "#8B7E71", "#6E6154"],
  )

  const step = STEPS[currentStep]
  const progress = ((currentStep + 1) / STEPS.length) * 100
  const isIntroStep = step.id === "intro"
  const isLastStep = currentStep === STEPS.length - 1

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
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
      const response = await fetch("/api/profile/personal-brand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...formData,
          customColors: formData.colorTheme === "custom" ? JSON.stringify(customColors) : null,
          contentPillars: contentPillars.length > 0 ? JSON.stringify(contentPillars) : null,
          isCompleted: true,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to save brand profile")
      }

      onComplete()
    } catch (error) {
      console.error("[v0] Error saving brand profile:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleColorThemeSelect = (themeId: string) => {
    setFormData((prev) => ({ ...prev, colorTheme: themeId }))
  }

  const handleCustomColorChange = (index: number, color: string) => {
    const newColors = [...customColors]
    newColors[index] = color
    setCustomColors(newColors)
  }

  const handleContentPillarsComplete = (pillars: any[]) => {
    setContentPillars(pillars)
    handleComplete()
  }

  const handleContentPillarsSkip = () => {
    handleComplete()
  }

  const canProceed = () => {
    if (isIntroStep) return true
    if (step.isColorThemeSelector) return formData.colorTheme.length > 0
    if (!step.field) return true
    return formData[step.field as keyof typeof formData]?.trim().length > 0
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-stone-500">
              <span>{step.subtitle}</span>
              <span>{Math.round(progress)}% complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          <div className="flex gap-4 items-start bg-stone-50 rounded-xl p-4">
            <div className="flex-shrink-0 w-12 h-12 bg-stone-950 rounded-full flex items-center justify-center">
              <Aperture size={20} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-stone-950 mb-1">Maya</p>
              <p className="text-sm text-stone-600 leading-relaxed">{step.mayaMessage}</p>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-stone-950">{step.title}</h2>

            {step.isColorThemeSelector ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {COLOR_THEMES.map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => handleColorThemeSelect(theme.id)}
                      className={`relative p-4 rounded-xl border-2 transition-all text-left hover:shadow-md ${
                        formData.colorTheme === theme.id
                          ? "border-stone-950 bg-stone-50"
                          : "border-border hover:border-ring"
                      }`}
                    >
                      <div className="flex gap-2 mb-3">
                        {theme.isCustom && formData.colorTheme === "custom"
                          ? customColors.map((color, idx) => (
                              <div
                                key={idx}
                                className="w-8 h-8 rounded-full border border-border"
                                style={{ backgroundColor: color }}
                              />
                            ))
                          : theme.colors.map((color, idx) => (
                              <div
                                key={idx}
                                className="w-8 h-8 rounded-full border border-border"
                                style={{ backgroundColor: color }}
                              />
                            ))}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {theme.isCustom && <Palette size={14} className="text-stone-600" />}
                          <p className="text-sm font-semibold text-foreground">{theme.name}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">{theme.description}</p>
                      </div>

                      {formData.colorTheme === theme.id && (
                        <div className="absolute top-3 right-3 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                          <Check size={14} className="text-primary-foreground" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                {formData.colorTheme === "custom" && (
                  <div className="bg-card border border-border rounded-xl p-6 space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Palette size={18} className="text-muted-foreground" />
                      <h3 className="text-sm font-semibold text-foreground">Customize Your Brand Colors</h3>
                    </div>
                    <p className="text-xs text-muted-foreground mb-4">
                      Choose 4 colors that represent your brand. These will be used throughout your content.
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      {customColors.map((color, index) => (
                        <div key={index} className="space-y-2">
                          <label className="text-xs font-medium text-muted-foreground">Color {index + 1}</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={color}
                              onChange={(e) => handleCustomColorChange(index, e.target.value)}
                              placeholder="#000000"
                              className="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground"
                            />
                            <input
                              type="color"
                              value={color}
                              onChange={(e) => handleCustomColorChange(index, e.target.value)}
                              className="w-12 h-10 rounded-lg border border-border cursor-pointer"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : step.isContentPillarBuilder ? (
              <ContentPillarBuilder
                userAnswers={formData}
                onComplete={handleContentPillarsComplete}
                onSkip={handleContentPillarsSkip}
              />
            ) : !isIntroStep && step.field ? (
              <div className="space-y-2">
                {step.isTextarea ? (
                  <Textarea
                    value={formData[step.field as keyof typeof formData]}
                    onChange={(e) => handleInputChange(step.field!, e.target.value)}
                    placeholder={step.placeholder}
                    className="min-h-[120px] resize-none"
                    autoFocus
                  />
                ) : (
                  <Input
                    value={formData[step.field as keyof typeof formData]}
                    onChange={(e) => handleInputChange(step.field!, e.target.value)}
                    placeholder={step.placeholder}
                    autoFocus
                  />
                )}
              </div>
            ) : null}
          </div>

          {!step.isContentPillarBuilder && (
            <div className="flex items-center justify-between pt-4 border-t border-stone-200">
              <Button
                variant="ghost"
                onClick={handleBack}
                disabled={currentStep === 0}
                className="text-stone-600 hover:text-stone-950"
              >
                <ArrowLeft size={16} className="mr-2" />
                Back
              </Button>

              {isLastStep ? (
                <Button
                  onClick={handleComplete}
                  disabled={!canProceed() || isSaving}
                  className="bg-stone-950 hover:bg-stone-800 text-white"
                >
                  {isSaving ? (
                    "Saving..."
                  ) : (
                    <>
                      Complete
                      <Check size={16} className="ml-2" />
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={handleNext}
                  disabled={!canProceed()}
                  className="bg-stone-950 hover:bg-stone-800 text-white"
                >
                  {isIntroStep ? "Let's Start" : "Next"}
                  <ArrowRight size={16} className="ml-2" />
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
