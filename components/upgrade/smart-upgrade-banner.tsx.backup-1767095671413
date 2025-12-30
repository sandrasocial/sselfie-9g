"use client"

import { X, ArrowRight, Lightbulb } from "lucide-react"
import { UpgradeOpportunity } from "@/lib/upgrade-detection"

interface SmartUpgradeBannerProps {
  opportunity: UpgradeOpportunity
  onUpgrade: (targetTier: UpgradeOpportunity["suggestedTier"]) => void
  onDismiss?: (type: UpgradeOpportunity["type"]) => void
}

export function SmartUpgradeBanner({ opportunity, onUpgrade, onDismiss }: SmartUpgradeBannerProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white/70 backdrop-blur-xl shadow-md shadow-stone-900/10 px-4 py-3">
      <div className="p-2 rounded-lg bg-stone-900 text-white shadow-sm shadow-stone-900/20">
        <Lightbulb size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs uppercase tracking-[0.18em] text-stone-500">{opportunity.type.replace("_", " ")}</p>
        <p className="text-sm text-stone-800">{opportunity.message}</p>
      </div>
      <button
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          console.log("[UPGRADE-BANNER] Upgrade button clicked, tier:", opportunity.suggestedTier)
          onUpgrade(opportunity.suggestedTier)
        }}
        className="inline-flex items-center gap-2 rounded-lg bg-stone-900 text-white px-3 py-2 text-xs font-semibold tracking-[0.16em] uppercase hover:bg-stone-800 transition-colors active:scale-[0.98]"
      >
        Upgrade
        <ArrowRight size={14} />
      </button>
      {onDismiss && (
        <button
          onClick={() => onDismiss(opportunity.type)}
          className="text-stone-400 hover:text-stone-700 transition-colors"
          aria-label="Dismiss upgrade banner"
        >
          <X size={14} />
        </button>
      )}
    </div>
  )
}
