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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(13,12,11,0.90)] backdrop-blur-sm p-4 animate-fade-in">
          <div className="relative w-full max-w-sm bg-[rgba(28,27,25,0.97)] border border-[rgba(195,190,182,0.25)] backdrop-blur-[70px] rounded-2xl p-6 sm:p-8">
            <h2 className="font-['Cormorant_Garamond'] font-light text-2xl sm:text-3xl tracking-[0.2em] uppercase text-[#f0ede8] text-center mb-3">
              LOW CREDITS
            </h2>

            <p className="text-center text-[#8a8780] font-['Inter'] text-sm mb-6">
              You have <strong className="text-[#f0ede8] font-medium">{credits}</strong> credits remaining
            </p>

            <div className="space-y-3 mb-8">
              <button
                onClick={handleBuyCredits}
                className="w-full bg-[#c8c4bb] text-[#0d0c0b] px-6 py-3 rounded-full font-['Inter'] text-xs font-medium uppercase tracking-[0.15em] hover:bg-[#f0ede8] transition-all"
              >
                TOP UP CREDITS
              </button>
              <button
                onClick={handleDismiss}
                className="w-full text-[#8a8780] hover:text-[#f0ede8] px-6 py-3 font-['Inter'] text-xs font-light tracking-[0.15em] uppercase transition-colors"
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
