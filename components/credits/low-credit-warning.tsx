"use client"

import { useState, useEffect } from "react"

interface LowCreditWarningProps {
  credits: number
  onBuyCredits: () => void
}

export function LowCreditWarning({ credits, onBuyCredits }: LowCreditWarningProps) {
  const [dismissed, setDismissed] = useState(false)

  // Show warning if credits are below 20 (can't train) or below 10 (running very low)
  const showWarning = credits < 20 && !dismissed

  useEffect(() => {
    // Reset dismissed state when credits change significantly
    if (credits >= 25) {
      setDismissed(false)
    }
  }, [credits])

  if (!showWarning) return null

  const isVeryLow = credits < 10
  const cannotTrain = credits < 20

  return (
    <div className="fixed bottom-4 right-4 z-40 max-w-md p-6 bg-[rgba(28,27,25,0.97)] backdrop-blur-[70px] border border-[rgba(195,190,182,0.25)] rounded-2xl shadow-2xl shadow-black/40">
      <div className="flex items-start justify-between mb-4">
        <h3 className="font-['Cormorant_Garamond'] font-light text-xl tracking-[0.2em] uppercase text-[#f0ede8]">
          {isVeryLow ? "CREDITS LOW" : "RUNNING LOW"}
        </h3>
        <button
          onClick={() => setDismissed(true)}
          className="font-['Inter'] text-[#8a8780] hover:text-[#f0ede8] text-xs font-medium tracking-[0.3em] uppercase transition-colors"
        >
          DISMISS
        </button>
      </div>

      <p className="font-['Inter'] text-sm text-[#8a8780] mb-4">
        {isVeryLow ? (
          <>
            You have <strong className="text-[#f0ede8] font-medium">{credits} credits</strong> remaining. You need at least 20 credits to train a model.
          </>
        ) : cannotTrain ? (
          <>
            You have <strong className="text-[#f0ede8] font-medium">{credits} credits</strong> remaining. You need 20 credits to train a model, but you can
            still generate images.
          </>
        ) : null}
      </p>

      <button
        onClick={onBuyCredits}
        className="w-full bg-[#c8c4bb] text-[#0d0c0b] px-6 py-3 rounded-full font-['Inter'] text-xs font-medium uppercase tracking-[0.15em] hover:bg-[#f0ede8] transition-all"
      >
        BUY MORE CREDITS
      </button>
    </div>
  )
}
