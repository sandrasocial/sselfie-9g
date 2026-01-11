"use client"

import { useState, useEffect } from "react"
import { BuyCreditsDialog } from "./buy-credits-dialog"
import useSWR from "swr"

interface LowCreditModalProps {
  credits: number
  threshold?: number
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function LowCreditModal({ credits, threshold = 30 }: LowCreditModalProps) {
  const [showWarning, setShowWarning] = useState(false)
  const [showBuyDialog, setShowBuyDialog] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  // Check if user has paid subscription (paid_blueprint or studio_membership)
  // Only show low credit modal for paid users, not free users
  const { data: blueprintData } = useSWR("/api/blueprint/state", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000, // Cache for 1 minute
  })

  const entitlementType = blueprintData?.entitlement?.type
  const isPaidUser = entitlementType === "paid" || entitlementType === "studio"

  useEffect(() => {
    // Only show for paid users (not free users)
    const shouldShow = isPaidUser && credits < threshold && credits >= 0 && !dismissed

    if (shouldShow && !showWarning) {
      setShowWarning(true)
    }

    if (credits >= threshold || !isPaidUser) {
      setDismissed(false)
      setShowWarning(false)
    }
  }, [credits, threshold, dismissed, showWarning, isPaidUser])

  const handleDismiss = () => {
    setDismissed(true)
    setShowWarning(false)
  }

  const handleBuyCredits = () => {
    setShowWarning(false)
    setShowBuyDialog(true)
  }

  // Don't show for free users
  if (!isPaidUser) return null
  
  if (!showWarning && !showBuyDialog) return null

  return (
    <>
      {showWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/80 p-4 animate-fade-in">
          <div className="relative w-full max-w-sm bg-stone-50 rounded-lg p-6 sm:p-8">
            <h2 className="font-serif text-2xl sm:text-3xl font-extralight tracking-[0.2em] uppercase text-stone-900 text-center mb-3">
              LOW CREDITS
            </h2>

            <p className="text-center text-stone-600 font-light text-sm mb-6">
              You have <strong className="text-stone-900">{credits}</strong> credits remaining
            </p>

            <div className="space-y-3 mb-8">
              <button
                onClick={handleBuyCredits}
                className="w-full bg-stone-900 text-stone-50 px-6 py-3 rounded-lg text-xs font-medium uppercase tracking-wider hover:bg-stone-800 transition-all"
              >
                TOP UP CREDITS
              </button>
              <button
                onClick={handleDismiss}
                className="w-full text-stone-600 hover:text-stone-900 px-6 py-3 text-xs font-light tracking-wider uppercase transition-colors"
              >
                CONTINUE
              </button>
            </div>
          </div>
        </div>
      )}

      {showBuyDialog && <BuyCreditsDialog onClose={() => setShowBuyDialog(false)} />}
    </>
  )
}
