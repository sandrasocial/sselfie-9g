"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"

interface FeedWizardStepsProps {
  onComplete: (data: {
    businessType: string
    targetAudience: string
    brandVibe: string
    goals: string
  }) => void
  onSkip: () => void
}

export default function FeedWizardSteps({ onComplete, onSkip }: FeedWizardStepsProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [businessType, setBusinessType] = useState("")
  const [targetAudience, setTargetAudience] = useState("")
  const [brandVibe, setBrandVibe] = useState("")
  const [goals, setGoals] = useState("")

  const totalSteps = 4

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    } else {
      onComplete({ businessType, targetAudience, brandVibe, goals })
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return businessType.trim().length > 0
      case 2:
        return targetAudience.trim().length > 0
      case 3:
        return brandVibe.trim().length > 0
      case 4:
        return goals.trim().length > 0
      default:
        return false
    }
  }

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-6 max-w-2xl mx-auto">
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-stone-600 uppercase tracking-wider">
            Step {currentStep} of {totalSteps}
          </span>
          <button onClick={onSkip} className="text-xs text-stone-500 hover:text-stone-700 transition-colors">
            Skip wizard
          </button>
        </div>
        <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-stone-950 transition-all duration-300"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {/* Step Content */}
      <div className="min-h-[300px]">
        {currentStep === 1 && (
          <div className="space-y-4">
            <div>
              <h3 className="font-['Times_New_Roman'] text-3xl font-extralight tracking-[0.2em] uppercase text-stone-950 mb-2">
                YOUR BUSINESS
              </h3>
              <p className="text-sm text-stone-600 leading-relaxed">
                Tell me what you do. This helps me create content that resonates with your ideal clients.
              </p>
            </div>

            <Input
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value)}
              placeholder="e.g., Life Coach, Fashion Designer, Photographer..."
              className="text-base"
            />

            <div className="grid grid-cols-2 gap-2 pt-2">
              {["Life Coach", "Designer", "Photographer", "Consultant"].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setBusinessType(suggestion)}
                  className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg hover:bg-stone-100 hover:border-stone-300 transition-all text-sm text-stone-700"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-4">
            <div>
              <h3 className="font-['Times_New_Roman'] text-3xl font-extralight tracking-[0.2em] uppercase text-stone-950 mb-2">
                YOUR AUDIENCE
              </h3>
              <p className="text-sm text-stone-600 leading-relaxed">
                Who are you creating content for? Understanding your audience helps me craft the perfect strategy.
              </p>
            </div>

            <Textarea
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="e.g., Women entrepreneurs in their 30s who want to build confidence and grow their business..."
              className="text-base min-h-[120px]"
            />
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-4">
            <div>
              <h3 className="font-['Times_New_Roman'] text-3xl font-extralight tracking-[0.2em] uppercase text-stone-950 mb-2">
                YOUR VIBE
              </h3>
              <p className="text-sm text-stone-600 leading-relaxed">
                What aesthetic speaks to you? This shapes your feed's visual identity.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Elegant Minimalist", desc: "Clean, sophisticated, timeless" },
                { label: "Bold & Confident", desc: "Strong, vibrant, eye-catching" },
                { label: "Warm & Approachable", desc: "Friendly, inviting, authentic" },
                { label: "Moody & Editorial", desc: "Dramatic, artistic, high-fashion" },
              ].map((vibe) => (
                <button
                  key={vibe.label}
                  onClick={() => setBrandVibe(vibe.label)}
                  className={`p-4 border-2 rounded-lg text-left transition-all ${
                    brandVibe === vibe.label
                      ? "border-stone-950 bg-stone-50"
                      : "border-stone-200 hover:border-stone-300 bg-white"
                  }`}
                >
                  <div className="text-sm font-medium text-stone-950 mb-1">{vibe.label}</div>
                  <div className="text-xs text-stone-600">{vibe.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {currentStep === 4 && (
          <div className="space-y-4">
            <div>
              <h3 className="font-['Times_New_Roman'] text-3xl font-extralight tracking-[0.2em] uppercase text-stone-950 mb-2">
                YOUR GOALS
              </h3>
              <p className="text-sm text-stone-600 leading-relaxed">
                What do you want to achieve with your Instagram? This helps me create a strategic feed.
              </p>
            </div>

            <Textarea
              value={goals}
              onChange={(e) => setGoals(e.target.value)}
              placeholder="e.g., Attract high-quality clients, build authority in my niche, grow my email list..."
              className="text-base min-h-[120px]"
            />
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6 pt-6 border-t border-stone-200">
        <Button
          onClick={handleBack}
          variant="ghost"
          disabled={currentStep === 1}
          className="text-stone-600 hover:text-stone-950"
        >
          Back
        </Button>

        <Button
          onClick={handleNext}
          disabled={!canProceed()}
          className="bg-stone-950 hover:bg-stone-800 text-white px-8"
        >
          {currentStep === totalSteps ? "Create My Feed" : "Continue"}
        </Button>
      </div>
    </div>
  )
}
