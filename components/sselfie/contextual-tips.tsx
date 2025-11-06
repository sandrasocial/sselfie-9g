"use client"

import { X } from "lucide-react"
import { useState } from "react"

interface ContextualTipsProps {
  generationCount: number
  hasCompletedBrand: boolean
  favoriteCount: number
}

export function ContextualTips({ generationCount, hasCompletedBrand, favoriteCount }: ContextualTipsProps) {
  const [dismissedTips, setDismissedTips] = useState<string[]>([])

  const tips = []

  // Tip 1: Complete brand profile
  if (!hasCompletedBrand && !dismissedTips.includes("brand-profile")) {
    tips.push({
      id: "brand-profile",
      title: "Complete Your Brand Profile",
      description:
        "Help Maya understand your style better by completing your brand profile for more personalized results.",
    })
  }

  // Tip 2: First generations
  if (generationCount < 5 && !dismissedTips.includes("first-generations")) {
    tips.push({
      id: "first-generations",
      title: "Experiment with Different Styles",
      description:
        "Try different photo categories to discover what works best for your brand. Each style tells a unique story.",
    })
  }

  // Tip 3: Save favorites
  if (generationCount >= 10 && favoriteCount === 0 && !dismissedTips.includes("save-favorites")) {
    tips.push({
      id: "save-favorites",
      title: "Save Your Best Work",
      description: "Mark your favorite photos to build a curated collection and help Maya learn your preferences.",
    })
  }

  // Tip 4: Consistent generation
  if (generationCount >= 20 && !dismissedTips.includes("consistency")) {
    tips.push({
      id: "consistency",
      title: "You're Building Momentum",
      description: "Consistent content creation is key to building your brand. Keep up the great work.",
    })
  }

  const dismissTip = (tipId: string) => {
    setDismissedTips((prev) => [...prev, tipId])
  }

  if (tips.length === 0) return null

  return (
    <div className="space-y-4">
      {tips.map((tip) => {
        return (
          <div
            key={tip.id}
            className="bg-white/50 backdrop-blur-3xl border border-white/60 rounded-2xl sm:rounded-3xl p-6 sm:p-8 relative animate-in fade-in slide-in-from-top-2 duration-500 shadow-xl shadow-stone-900/5"
          >
            <button
              onClick={() => dismissTip(tip.id)}
              className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 hover:bg-stone-100 rounded-lg transition-colors"
              aria-label="Dismiss"
            >
              <X size={16} strokeWidth={1.5} className="text-stone-400" />
            </button>
            <div className="pr-8">
              <h3 className="font-['Times_New_Roman'] text-lg sm:text-xl font-extralight tracking-[0.15em] uppercase text-stone-900 mb-3">
                {tip.title}
              </h3>
              <p className="text-sm font-light text-stone-600 leading-relaxed">{tip.description}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
