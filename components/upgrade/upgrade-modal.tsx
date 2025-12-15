"use client"

import { useState } from "react"
import { UpgradeComparisonCard } from "@/components/upgrade/upgrade-comparison-card"

type TierId = "one_time_session" | "sselfie_studio_membership" | "brand_studio_membership"

interface UpgradeModalProps {
  open: boolean
  currentTier: TierId
  targetTier?: TierId
  onClose: () => void
}

export function UpgradeModal({ open, currentTier, targetTier = "brand_studio_membership", onClose }: UpgradeModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const handleUpgrade = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/subscription/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetTier }),
      })

      const data = await response.json()
      if (!response.ok) {
        setError(data.error || "Upgrade failed. Please try again.")
        setLoading(false)
        return
      }

      // Success: reload to reflect new tier
      window.location.reload()
    } catch (err: any) {
      setError(err?.message || "Upgrade failed. Please try again.")
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/70 backdrop-blur-sm px-4">
      <div className="w-full max-w-2xl">
        <div className="bg-white/80 backdrop-blur-xl border border-stone-200/70 rounded-3xl shadow-2xl p-4 sm:p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-stone-500">Upgrade</p>
              <h2 className="text-2xl font-serif font-extralight tracking-[0.28em] text-stone-900 uppercase">
                Unlock more with Brand Studio
              </h2>
              <p className="text-sm text-stone-600 mt-1">Get more credits, premium features, and priority support.</p>
            </div>
            <button
              onClick={onClose}
              className="text-stone-400 hover:text-stone-700 text-sm font-medium tracking-[0.18em] uppercase"
            >
              Close
            </button>
          </div>

          <UpgradeComparisonCard
            currentTier={currentTier}
            targetTier={targetTier}
            onUpgrade={handleUpgrade}
            onClose={onClose}
            loading={loading}
          />

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  )
}
