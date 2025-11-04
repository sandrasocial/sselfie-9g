"use client"

import { X, Lightbulb, Sparkles, Target } from "lucide-react"
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
      icon: Target,
      title: "Complete Your Brand Profile",
      description:
        "Help Maya understand your style better by completing your brand profile for more personalized results.",
      action: "Complete Profile",
      color: "bg-blue-50 border-blue-200 text-blue-900",
      iconColor: "text-blue-600",
    })
  }

  // Tip 2: First generations
  if (generationCount < 5 && !dismissedTips.includes("first-generations")) {
    tips.push({
      id: "first-generations",
      icon: Sparkles,
      title: "Experiment with Different Styles",
      description:
        "Try different photo categories to discover what works best for your brand. Each style tells a unique story.",
      action: "Explore Styles",
      color: "bg-purple-50 border-purple-200 text-purple-900",
      iconColor: "text-purple-600",
    })
  }

  // Tip 3: Save favorites
  if (generationCount >= 10 && favoriteCount === 0 && !dismissedTips.includes("save-favorites")) {
    tips.push({
      id: "save-favorites",
      icon: Lightbulb,
      title: "Save Your Best Work",
      description: "Mark your favorite photos to build a curated collection and help Maya learn your preferences.",
      action: "Got It",
      color: "bg-amber-50 border-amber-200 text-amber-900",
      iconColor: "text-amber-600",
    })
  }

  // Tip 4: Consistent generation
  if (generationCount >= 20 && !dismissedTips.includes("consistency")) {
    tips.push({
      id: "consistency",
      icon: Target,
      title: "You're Building Momentum!",
      description: "Consistent content creation is key to building your brand. Keep up the great work!",
      action: "Dismiss",
      color: "bg-green-50 border-green-200 text-green-900",
      iconColor: "text-green-600",
    })
  }

  const dismissTip = (tipId: string) => {
    setDismissedTips((prev) => [...prev, tipId])
  }

  if (tips.length === 0) return null

  return (
    <div className="space-y-4">
      {tips.map((tip) => {
        const Icon = tip.icon
        return (
          <div
            key={tip.id}
            className={`${tip.color} border rounded-2xl p-6 relative animate-in fade-in slide-in-from-top-2 duration-500`}
          >
            <button
              onClick={() => dismissTip(tip.id)}
              className="absolute top-4 right-4 p-1 hover:bg-black/5 rounded-lg transition-colors"
              aria-label="Dismiss tip"
            >
              <X size={16} strokeWidth={1.5} />
            </button>
            <div className="flex gap-4">
              <div className={`w-10 h-10 ${tip.iconColor} flex items-center justify-center flex-shrink-0`}>
                <Icon size={24} strokeWidth={1.5} />
              </div>
              <div className="flex-1 pr-8">
                <h3 className="text-sm font-medium mb-2 tracking-wide">{tip.title}</h3>
                <p className="text-sm opacity-80 leading-relaxed">{tip.description}</p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
