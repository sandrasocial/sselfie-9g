"use client"

import { useState } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "framer-motion"
import { Sparkles, Grid3x3, FileText, Check, ArrowRight, X } from "lucide-react"

interface WelcomeWizardProps {
  open: boolean
  onComplete: () => void
  onDismiss?: () => void
}

/**
 * Welcome Wizard for Paid Blueprint Users
 * 
 * Simple, warm tutorial explaining how to use the full feed planner
 * Uses everyday language - no AI fluff
 */
export default function WelcomeWizard({ open, onComplete, onDismiss }: WelcomeWizardProps) {
  const [currentStep, setCurrentStep] = useState(0)

  const steps = [
    {
      title: "Welcome to your Feed Planner!",
      content: (
        <div className="space-y-4">
          <p className="text-stone-700 text-lg">
            You're all set! Now you can create a complete Instagram feed with 12 beautiful photos.
          </p>
          <p className="text-stone-600">
            Each photo will match your style and look amazing together. Let's walk through how it works.
          </p>
        </div>
      ),
      icon: Sparkles,
    },
    {
      title: "Generate your photos",
      content: (
        <div className="space-y-4">
          <p className="text-stone-700 text-lg">
            Click any empty placeholder in your grid to generate a photo.
          </p>
          <p className="text-stone-600">
            Each photo will be unique but match your preview style. You can generate them one at a time, or fill up the whole grid.
          </p>
          <div className="bg-stone-50 p-4 rounded-lg border border-stone-200">
            <p className="text-sm text-stone-600">
              💡 Tip: Start with the first few photos to see how they look together!
            </p>
          </div>
        </div>
      ),
      icon: Grid3x3,
    },
    {
      title: "Add captions and strategy",
      content: (
        <div className="space-y-4">
          <p className="text-stone-700 text-lg">
            Once your photos are ready, you can add captions and get a full strategy guide.
          </p>
          <p className="text-stone-600">
            Click the "Post" tab to get AI-generated captions for each photo. Click "Strategy" to get a complete guide for your feed.
          </p>
        </div>
      ),
      icon: FileText,
    },
    {
      title: "You're all set!",
      content: (
        <div className="space-y-4">
          <p className="text-stone-700 text-lg">
            That's it! You're ready to create amazing content.
          </p>
          <p className="text-stone-600">
            When you finish your first feed, you can create a new one anytime. All your feeds are saved so you can come back to them later.
          </p>
          <div className="bg-stone-50 p-4 rounded-lg border border-stone-200">
            <p className="text-sm text-stone-600">
              🎉 Have fun creating! If you need help, just click the help button anytime.
            </p>
          </div>
        </div>
      ),
      icon: Check,
    },
  ]

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

  const currentStepData = steps[currentStep]
  const Icon = currentStepData.icon

  return (
    <Dialog open={open} onOpenChange={handleDismiss}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        <div className="relative">
          {/* Progress bar */}
          <div className="h-1 bg-stone-100">
            <motion.div
              className="h-full bg-stone-900"
              initial={{ width: 0 }}
              animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          {/* Content */}
          <div className="p-8 md:p-12">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                {/* Icon */}
                <div className="flex justify-center">
                  <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center">
                    <Icon className="w-8 h-8 text-stone-700" />
                  </div>
                </div>

                {/* Title */}
                <h2 className="text-2xl md:text-3xl font-serif font-light text-stone-900 text-center">
                  {currentStepData.title}
                </h2>

                {/* Content */}
                <div className="min-h-[120px]">
                  {currentStepData.content}
                </div>

                {/* Step indicator */}
                <div className="flex justify-center gap-2 pt-4">
                  {steps.map((_, index) => (
                    <div
                      key={index}
                      className={`h-2 rounded-full transition-all ${
                        index === currentStep
                          ? "w-8 bg-stone-900"
                          : index < currentStep
                          ? "w-2 bg-stone-400"
                          : "w-2 bg-stone-200"
                      }`}
                    />
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer buttons */}
          <div className="border-t border-stone-200 p-6 flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={currentStep > 0 ? handleBack : handleDismiss}
              className="text-stone-600 hover:text-stone-900"
            >
              {currentStep > 0 ? "Back" : "Skip"}
            </Button>

            <Button
              onClick={handleNext}
              className="bg-stone-900 hover:bg-stone-800 text-white"
            >
              {currentStep < steps.length - 1 ? (
                <>
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              ) : (
                <>
                  Get Started
                  <Check className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
