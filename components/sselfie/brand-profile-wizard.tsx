"use client"

import { useState, useEffect } from "react"
import { Aperture, ArrowRight, ArrowLeft, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"

interface BrandProfileWizardProps {
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
  existingData?: any
}

const STEPS = [
  {
    id: "intro",
    title: "Hey there! 👋",
    subtitle: "Let's create your personal brand together",
    mayaMessage:
      "I'm Maya, and I'm here to help you create photos that actually look like YOU. To do that, I need to understand your unique style and vision. This will only take a few minutes, and trust me - it's worth it!",
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
    id: "currentSituation",
    title: "Where are you right now?",
    subtitle: "Step 3 of 6",
    mayaMessage:
      "Are you building your business foundation? Growing your online presence? Scaling? Understanding where you are helps me create photos that match your current journey.",
    field: "currentSituation",
    placeholder: "e.g., Building my business foundation, Growing my online presence...",
    isTextarea: true,
  },
  {
    id: "transformationStory",
    title: "What's your story?",
    subtitle: "Step 4 of 6",
    mayaMessage:
      "Everyone has a story. What brought you here? What transformation are you going through or have you been through? Your story makes your brand authentic and relatable.",
    field: "transformationStory",
    placeholder: "Share your journey, your why, what drives you...",
    isTextarea: true,
  },
  {
    id: "futureVision",
    title: "Where are you headed?",
    subtitle: "Step 5 of 6",
    mayaMessage:
      "Dream big! Where do you see yourself and your brand in the future? What impact do you want to make? This helps me create photos that align with your vision.",
    field: "futureVision",
    placeholder: "e.g., Recognized expert in my field, Financial freedom and impact...",
    isTextarea: true,
  },
  {
    id: "photoGoals",
    title: "What do you need photos for?",
    subtitle: "Step 6 of 6",
    mayaMessage:
      "Last question! Are you building a social media presence? Need professional headshots? Creating content for your website? Knowing this helps me create exactly what you need.",
    field: "photoGoals",
    placeholder: "e.g., Social media content, Professional brand photos, Website images...",
    isTextarea: true,
  },
]

export default function BrandProfileWizard({ isOpen, onClose, onComplete, existingData }: BrandProfileWizardProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: existingData?.name || "",
    businessType: existingData?.businessType || "",
    currentSituation: existingData?.currentSituation || "",
    transformationStory: existingData?.transformationStory || "",
    futureVision: existingData?.futureVision || "",
    businessGoals: existingData?.businessGoals || "",
    photoGoals: existingData?.photoGoals || "",
    stylePreferences: existingData?.stylePreferences || "",
  })

  useEffect(() => {
    console.log("[v0] BrandProfileWizard mounted, isOpen:", isOpen)
  }, [])

  useEffect(() => {
    console.log("[v0] BrandProfileWizard isOpen changed:", isOpen)
    if (isOpen) {
      console.log("[v0] Dialog should be visible now")
    }
  }, [isOpen])

  const step = STEPS[currentStep]
  const progress = ((currentStep + 1) / STEPS.length) * 100
  const isIntroStep = step.id === "intro"
  const isLastStep = currentStep === STEPS.length - 1

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      console.log("[v0] Moving to next step:", currentStep + 1)
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      console.log("[v0] Moving to previous step:", currentStep - 1)
      setCurrentStep(currentStep - 1)
    }
  }

  const handleComplete = async () => {
    console.log("[v0] Completing brand profile wizard...")
    setIsSaving(true)
    try {
      const response = await fetch("/api/profile/personal-brand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...formData,
          isCompleted: true,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to save brand profile")
      }

      console.log("[v0] Brand profile saved successfully")
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

  const canProceed = () => {
    if (isIntroStep) return true
    if (!step.field) return true
    return formData[step.field as keyof typeof formData]?.trim().length > 0
  }

  console.log("[v0] BrandProfileWizard rendering, isOpen:", isOpen, "currentStep:", currentStep)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="space-y-6 py-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-stone-500">
              <span>{step.subtitle}</span>
              <span>{Math.round(progress)}% complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Maya's Avatar and Message */}
          <div className="flex gap-4 items-start bg-stone-50 rounded-xl p-4">
            <div className="flex-shrink-0 w-12 h-12 bg-stone-950 rounded-full flex items-center justify-center">
              <Aperture size={20} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-stone-950 mb-1">Maya</p>
              <p className="text-sm text-stone-600 leading-relaxed">{step.mayaMessage}</p>
            </div>
          </div>

          {/* Step Content */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-stone-950">{step.title}</h2>

            {!isIntroStep && step.field && (
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
            )}
          </div>

          {/* Navigation Buttons */}
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
        </div>
      </DialogContent>
    </Dialog>
  )
}
