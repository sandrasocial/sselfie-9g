"use client"

import { useState } from "react"
import { getProductById } from "@/lib/products"

type TierId = "one_time_session" | "sselfie_studio_membership"

interface UpgradeModalProps {
  open: boolean
  currentTier: TierId
  targetTier?: TierId
  onClose: () => void
}

export function UpgradeModal({ open, currentTier, targetTier = "sselfie_studio_membership", onClose }: UpgradeModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const handleUpgrade = async () => {
    setLoading(true)
    setError(null)
    try {
      console.log("[UPGRADE] Starting upgrade to:", targetTier)
      const response = await fetch("/api/subscription/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ targetTier }),
      })

      const data = await response.json()
      console.log("[UPGRADE] Response:", data)
      
      if (!response.ok) {
        let errorMsg = data.error || "Upgrade failed. Please try again."
        
        // Provide more user-friendly error messages
        if (errorMsg.includes("Stripe Price ID not configured")) {
          errorMsg = "Upgrade service is temporarily unavailable. Please contact support or try again later."
        } else if (errorMsg.includes("not configured")) {
          errorMsg = "Upgrade service is temporarily unavailable. Please contact support."
        }
        
        console.error("[UPGRADE] Error:", errorMsg, "Raw error:", data.error)
        setError(errorMsg)
        setLoading(false)
        return
      }

      // Check for clientSecret (either directly or in requiresCheckout response)
      if (data?.clientSecret || (data?.requiresCheckout && data?.clientSecret)) {
        // No existing subscription: start embedded checkout
        const clientSecret = data.clientSecret
        console.log("[UPGRADE] Redirecting to checkout with clientSecret")
        window.location.href = `/checkout?client_secret=${clientSecret}`
        return
      }

      // Success via subscription update: reload to reflect new tier
      if (data?.success) {
        console.log("[UPGRADE] Upgrade successful, reloading page")
        window.location.reload()
        return
      }

      // Fallback: if we get here, something unexpected happened
      console.warn("[UPGRADE] Unexpected response format:", data)
      setError("Upgrade completed but response was unexpected. Please refresh the page.")
      setLoading(false)
    } catch (err: any) {
      console.error("[UPGRADE] Exception:", err)
      setError(err?.message || "Upgrade failed. Please try again.")
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/80 p-4 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div className="relative w-full max-w-sm bg-stone-50 rounded-lg p-6 sm:p-8" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-serif text-2xl sm:text-3xl font-extralight tracking-[0.2em] uppercase text-stone-900 text-center mb-3">
          UPGRADE
        </h2>

        <p className="text-center text-stone-600 font-light text-sm mb-6">
          Upgrade to <strong className="text-stone-900">{targetName}</strong> and get <strong className="text-stone-900">{targetCredits} credits{isSubscription ? " / month" : ""}</strong>
        </p>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-600 text-center">{error}</p>
          </div>
        )}

        <div className="space-y-3 mb-8">
          <button
            onClick={handleUpgrade}
            disabled={loading}
            className="w-full bg-stone-900 text-stone-50 px-6 py-3 rounded-lg text-xs font-medium uppercase tracking-wider hover:bg-stone-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Processing..." : `UPGRADE TO ${targetName.toUpperCase()}`}
          </button>
          <button
            onClick={onClose}
            className="w-full text-stone-600 hover:text-stone-900 px-6 py-3 text-xs font-light tracking-wider uppercase transition-colors"
          >
            MAYBE LATER
          </button>
        </div>
      </div>
    </div>
  )
}
