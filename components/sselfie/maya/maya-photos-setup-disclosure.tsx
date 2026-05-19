"use client"

import { useMemo } from "react"

export interface MayaPhotosSetupDisclosureProps {
  isMembership: boolean
  creditBalance: number
  isMessageListEmpty: boolean
  showZeroCreditsNudge: boolean
  onDismissZeroCredits: () => void
  hasTrainedModel: boolean
  onGoToTraining: () => void
  onOpenStudioCheckout: (source: string) => void | Promise<void>
  onOpenBuyCredits: () => void
}

/**
 * Collapses credits, upgrade, and training nudges into one calm support surface.
 * Starts collapsed; user expands to see details.
 */
export default function MayaPhotosSetupDisclosure({
  isMembership,
  creditBalance,
  isMessageListEmpty,
  showZeroCreditsNudge,
  onDismissZeroCredits,
  hasTrainedModel,
  onGoToTraining,
  onOpenStudioCheckout,
  onOpenBuyCredits,
}: MayaPhotosSetupDisclosureProps) {
  const showCreditsReady = !isMembership && creditBalance > 0 && isMessageListEmpty
  const showTraining = !hasTrainedModel

  const digest = useMemo(() => {
    const parts: string[] = []
    if (showCreditsReady) {
      parts.push(`${creditBalance} credit${creditBalance !== 1 ? "s" : ""} ready`)
    }
    if (showZeroCreditsNudge) {
      parts.push("Upgrade or buy credits")
    }
    if (showTraining) {
      parts.push("Optional: train your look")
    }
    return parts.join(" · ")
  }, [showCreditsReady, showZeroCreditsNudge, showTraining, creditBalance])

  if (!showCreditsReady && !showZeroCreditsNudge && !showTraining) {
    return null
  }

  return (
    <div className="mx-3 sm:mx-4 mb-1">
      <details className="group border border-[rgba(195,190,182,0.18)] bg-[rgba(14,12,10,0.45)] rounded-lg overflow-hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 select-none [&::-webkit-details-marker]:hidden">
          <div className="min-w-0 flex-1 text-left">
            <span className="text-[10px] uppercase tracking-[0.2em] text-[#8a8780]">Set Up My Look</span>
            <p className="mt-0.5 text-sm font-light leading-snug text-[#f0ede8]">{digest}</p>
          </div>
          <span
            className="shrink-0 text-lg leading-none text-[#8a8780] transition-transform duration-200 group-open:rotate-90"
            aria-hidden
          >
            ›
          </span>
        </summary>

        <div className="border-t border-[rgba(195,190,182,0.12)] divide-y divide-[rgba(195,190,182,0.10)]">
          {showCreditsReady ? (
            <div className="px-4 py-4">
              <p className="text-xs font-medium text-[#f0ede8]">
                You have {creditBalance} credit{creditBalance !== 1 ? "s" : ""} ready
              </p>
              <p className="mt-1 text-xs text-[#8a8780] leading-relaxed">
                Add a reference image in the bar below if you like, then ask for your first brand photo.
              </p>
            </div>
          ) : null}

          {showZeroCreditsNudge ? (
            <div className="px-4 py-4">
              <p className="text-xs font-medium text-[#f0ede8]">You&apos;ve used your free photos</p>
              <p className="mt-1 text-xs text-[#8a8780] leading-relaxed">
                Studio includes 200 credits a month. You can also buy a one-time pack.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void onOpenStudioCheckout("maya_zero_credits_nudge")}
                  className="shrink-0 text-xs font-medium text-[#0d0c0b] bg-[#c8c4bb] rounded-md px-3 py-1.5 hover:bg-[#f0ede8] transition-colors whitespace-nowrap"
                >
                  Upgrade to Studio
                </button>
                <button
                  type="button"
                  onClick={onOpenBuyCredits}
                  className="shrink-0 text-xs font-medium text-[#8a8780] bg-[rgba(175,170,162,0.08)] border border-[rgba(195,190,182,0.18)] rounded-md px-3 py-1.5 hover:bg-[rgba(175,170,162,0.14)] transition-colors whitespace-nowrap"
                >
                  Buy credits
                </button>
                <button
                  type="button"
                  onClick={onDismissZeroCredits}
                  className="shrink-0 text-xs font-medium text-[#8a8780] rounded-md px-3 py-1.5 hover:text-[#f0ede8] transition-colors whitespace-nowrap"
                >
                  Not now
                </button>
              </div>
            </div>
          ) : null}

          {showTraining ? (
            <div className="px-4 py-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-[#f0ede8]">Set up your look (optional)</p>
                <p className="mt-1 text-xs text-[#8a8780] leading-relaxed">
                  One setup step helps Maya match your face without uploading selfies every time.
                  You can still use photo uploads without setup.
                </p>
              </div>
              <button
                type="button"
                onClick={onGoToTraining}
                className="shrink-0 self-start text-xs font-medium text-[#8a8780] bg-[rgba(175,170,162,0.08)] border border-[rgba(195,190,182,0.18)] rounded-md px-3 py-1.5 hover:bg-[rgba(175,170,162,0.14)] transition-colors whitespace-nowrap"
              >
                Open Setup
              </button>
            </div>
          ) : null}
        </div>
      </details>
    </div>
  )
}
