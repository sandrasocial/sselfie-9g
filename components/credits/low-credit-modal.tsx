"use client"

import { useState, useEffect } from "react"
import { BuyCreditsDialog } from "./buy-credits-dialog"

interface LowCreditModalProps {
  credits: number
  threshold?: number
}

export function LowCreditModal({ credits, threshold = 30 }: LowCreditModalProps) {
  const [showWarning, setShowWarning] = useState(false)
  const [showBuyDialog, setShowBuyDialog] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const shouldShow = credits < threshold && credits >= 0 && !dismissed

    if (shouldShow && !showWarning) {
      setShowWarning(true)
    }

    if (credits >= threshold) {
      setDismissed(false)
      setShowWarning(false)
    }
  }, [credits, threshold, dismissed, showWarning])

  const handleDismiss = () => {
    setDismissed(true)
    setShowWarning(false)
  }

  const handleBuyCredits = () => {
    setShowWarning(false)
    setShowBuyDialog(true)
  }

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
