"use client"

import { X, ArrowRight, Lightbulb } from "lucide-react"
import { UpgradeOpportunity } from "@/lib/upgrade-detection"
import { trackCTAClick } from "@/lib/analytics"

interface SmartUpgradeBannerProps {
  opportunity: UpgradeOpportunity
  onUpgrade: (targetTier: UpgradeOpportunity["suggestedTier"]) => void
  onDismiss?: (type: UpgradeOpportunity["type"]) => void
}

export function SmartUpgradeBanner({ opportunity, onUpgrade, onDismiss }: SmartUpgradeBannerProps) {
  return (
    <div className="flex items-center gap-3 bg-[rgba(175,170,162,0.10)] border border-[rgba(195,190,182,0.20)] rounded-xl px-4 py-3">
      <div className="p-2 rounded-lg bg-[rgba(175,170,162,0.18)] text-[#a8a49c]">
        <Lightbulb size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-['Inter'] font-medium text-[10px] uppercase tracking-[0.5em] text-[#8a8780]">{opportunity.type.replace("_", " ")}</p>
        <p className="text-sm text-[#f0ede8]">{opportunity.message}</p>
      </div>
      <button
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          console.log("[UPGRADE-BANNER] Upgrade button clicked, tier:", opportunity.suggestedTier)
          trackCTAClick("smart_upgrade_banner", "Upgrade", "/checkout")
          onUpgrade(opportunity.suggestedTier)
        }}
        className="inline-flex items-center gap-2 bg-[#c8c4bb] text-[#0d0c0b] font-medium tracking-[0.15em] uppercase text-xs px-4 py-2 rounded-full hover:bg-[#f0ede8] transition-colors active:scale-[0.98]"
      >
        Upgrade
        <ArrowRight size={14} />
      </button>
      {onDismiss && (
        <button
          onClick={() => onDismiss(opportunity.type)}
          className="text-[#8a8780] hover:text-[#f0ede8] transition-colors"
          aria-label="Dismiss upgrade banner"
        >
          <X size={14} />
        </button>
      )}
    </div>
  )
}
