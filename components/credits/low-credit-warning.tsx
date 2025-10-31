"use client"

import { useState, useEffect } from "react"

interface LowCreditWarningProps {
  credits: number
  onBuyCredits: () => void
}

export function LowCreditWarning({ credits, onBuyCredits }: LowCreditWarningProps) {
  const [dismissed, setDismissed] = useState(false)

  // Show warning if credits are below 25 (can't train) or below 10 (running very low)
  const showWarning = credits < 25 && !dismissed

  useEffect(() => {
    // Reset dismissed state when credits change significantly
    if (credits >= 25) {
      setDismissed(false)
    }
  }, [credits])

  if (!showWarning) return null

  const isVeryLow = credits < 10
  const cannotTrain = credits < 25

  return (
    <div
      className={`fixed bottom-4 right-4 z-40 max-w-md p-6 rounded-lg shadow-lg ${
        isVeryLow ? "bg-red-50 border-2 border-red-200" : "bg-yellow-50 border-2 border-yellow-200"
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <h3 className="font-['Times_New_Roman'] text-xl font-extralight tracking-[0.2em] uppercase text-stone-900">
          {isVeryLow ? "CREDITS LOW" : "RUNNING LOW"}
        </h3>
        <button
          onClick={() => setDismissed(true)}
          className="text-stone-500 hover:text-stone-900 text-sm font-light tracking-wider uppercase"
        >
          DISMISS
        </button>
      </div>

      <p className="text-sm text-stone-700 font-light mb-4">
        {isVeryLow ? (
          <>
            You have <strong>{credits} credits</strong> remaining. You need at least 25 credits to train a model.
          </>
        ) : cannotTrain ? (
          <>
            You have <strong>{credits} credits</strong> remaining. You need 25 credits to train a model, but you can
            still generate images.
          </>
        ) : null}
      </p>

      <button
        onClick={onBuyCredits}
        className="w-full bg-stone-900 text-stone-50 px-6 py-3 rounded-lg text-sm font-medium uppercase tracking-wider hover:bg-stone-800 transition-all"
      >
        BUY MORE CREDITS
      </button>
    </div>
  )
}
