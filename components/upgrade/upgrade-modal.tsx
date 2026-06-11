"use client"

import { useState } from "react"
import { getProductById } from "@/lib/products"
import { trackCTAClick } from "@/lib/analytics"

type TierId = "one_time_session" | "sselfie_studio_membership"

interface UpgradeModalProps {
  open: boolean
  currentTier: TierId
  targetTier?: TierId
  onClose: () => void
}

export function UpgradeModal({ open, currentTier: _currentTier, targetTier = "sselfie_studio_membership", onClose }: UpgradeModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const handleUpgrade = async () => {
    setLoading(true)
    setError(null)
    try {
      trackCTAClick("upgrade_modal", `Upgrade to ${targetName}`, "/checkout")
      const response = await fetch("/api/subscription/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ targetTier }),
      })

      const data = await response.json()
      
      if (!response.ok) {
        let errorMsg = data.error || "Upgrade failed. Please try again."
        
        // Provide more user-friendly error messages
        if (errorMsg.includes("Stripe Price ID not configured")) {
          errorMsg = "Upgrade service is temporarily unavailable. Please contact support or try again later."
        } else if (errorMsg.includes("not configured")) {
          errorMsg = "Upgrade service is temporarily unavailable. Please contact support."
        }
        
        setError(errorMsg)
        setLoading(false)
        return
      }

      // Check for clientSecret (either directly or in requiresCheckout response)
      if (data?.clientSecret || (data?.requiresCheckout && data?.clientSecret)) {
        // No existing subscription: start embedded checkout
        const clientSecret = data.clientSecret
        window.location.href = `/checkout?client_secret=${clientSecret}`
        return
      }

      // Success via subscription update: reload to reflect new tier
      if (data?.success) {
        window.location.reload()
        return
      }

      // Fallback: if we get here, something unexpected happened
      setError("Upgrade completed but response was unexpected. Please refresh the page.")
      setLoading(false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upgrade failed. Please try again.")
      setLoading(false)
    }
  }

  const targetProduct = getProductById(targetTier)
  const targetName = targetTier === "sselfie_studio_membership"
    ? "Creator Studio"
    : "One-Time Session"
  const targetCredits = targetProduct?.credits || (targetTier === "sselfie_studio_membership" ? 200 : 50)
  const isSubscription = targetTier !== "one_time_session"

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(13,12,11,0.80)] p-4 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        className="relative w-full max-w-sm bg-[rgba(175,170,162,0.15)] backdrop-blur-[70px] border border-[rgba(195,190,182,0.25)] rounded-3xl p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-['Cormorant_Garamond'] font-light mb-3 text-center text-2xl text-[#f0ede8] sm:text-3xl">
          Ready to keep going?
        </h2>

        <p className="mb-6 text-center text-sm font-light text-[#8a8780]">
          {isSubscription
            ? (
              <>
                Creator Studio gives you{" "}
                <strong className="text-[#f0ede8]">{targetCredits} credits a month</strong>, that&apos;s{" "}
                {Math.floor(targetCredits / 2)} brand photos. One monthly plan, everything you need to show up consistently without scrambling for content.
              </>
            ) : (
              <>
                <strong className="text-[#f0ede8]">{targetName}</strong> gives you{" "}
                <strong className="text-[#f0ede8]">{targetCredits} credits</strong> to use whenever you need them.
              </>
            )}
        </p>

        {error && (
          <div className="mb-4 rounded-xl border border-red-300/35 bg-red-500/15 p-3">
            <p className="text-center text-sm text-red-100">{error}</p>
          </div>
        )}

        <div className="space-y-3 mb-8">
          <button
            onClick={handleUpgrade}
            disabled={loading}
            className="w-full bg-[#c8c4bb] text-[#0d0c0b] font-medium tracking-[0.15em] uppercase text-xs px-6 py-3 rounded-full hover:bg-[#f0ede8] transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Processing..." : isSubscription ? "Yes, join the SUITE" : `Get ${targetName}`}
          </button>
          <button
            onClick={onClose}
            className="w-full text-sm text-[#8a8780] hover:text-[#f0ede8] transition-colors text-center py-2"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  )
}
