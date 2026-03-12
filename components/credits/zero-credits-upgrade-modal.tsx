"use client"

import { useState, useEffect } from "react"
import { startEmbeddedCheckout } from "@/lib/start-embedded-checkout"
import { BuyCreditsDialog } from "./buy-credits-dialog"
import { trackCTAClick } from "@/lib/analytics"
import useSWR from "swr"

interface ZeroCreditsUpgradeModalProps {
  credits: number
  onClose?: () => void
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function ZeroCreditsUpgradeModal({ credits, onClose }: ZeroCreditsUpgradeModalProps) {
  const [showModal, setShowModal] = useState(false)
  const [isUpgrading, setIsUpgrading] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [showBuyDialog, setShowBuyDialog] = useState(false)

  // Show for both free and paid users when credits reach 0 — free users at 0 are at peak upgrade intent.
  const { data: blueprintData } = useSWR("/api/blueprint/state", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000, // Cache for 1 minute
  })

  const entitlementType = blueprintData?.entitlement?.type
  const isPaidUser = entitlementType === "paid" || entitlementType === "studio"
  const isFreeUser = entitlementType === "free"

  useEffect(() => {
    // Show for paid users AND free users when credits reach 0.
    // Free users reaching 0 credits are at peak upgrade intent — catch them here.
    const isKnownUser = isPaidUser || isFreeUser
    if (!isKnownUser) {
      setShowModal(false)
      return
    }

    // Show modal when credits reach exactly 0 and haven't been dismissed
    if (credits === 0 && !dismissed && !showModal) {
      setShowModal(true)
    }

    // Hide modal if credits increase (e.g. after top-up)
    if (credits > 0 && showModal) {
      setShowModal(false)
      setDismissed(false)
    }
  }, [credits, dismissed, showModal, isPaidUser, isFreeUser])

  const handleUpgrade = async () => {
    try {
      setIsUpgrading(true)
      trackCTAClick("zero_credits_modal", "Upgrade to Studio", "/checkout")
      const clientSecret = await startEmbeddedCheckout("sselfie_studio_membership")
      window.location.href = `/checkout?client_secret=${clientSecret}`
    } catch (error) {
      console.error("[v0] Error creating checkout:", error)
      // Revenue-protect fallback: send users to hosted membership checkout if embedded fails.
      window.location.href = "/checkout/membership?fallback=embedded_failed&source=zero_credits_modal"
    }
  }

  const handleBuyCredits = () => {
    trackCTAClick("zero_credits_modal", "Buy Credits", "/checkout/credits")
    setShowModal(false)
    setShowBuyDialog(true)
  }

  const handleDismiss = () => {
    setDismissed(true)
    setShowModal(false)
    onClose?.()
  }

  if (!showModal || credits > 0) return null

  return (
    <>
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(13,12,11,0.90)] backdrop-blur-sm p-4 animate-fade-in">
          <div className="relative w-full max-w-sm bg-[rgba(28,27,25,0.97)] border border-[rgba(195,190,182,0.25)] backdrop-blur-[70px] rounded-2xl p-6 sm:p-8">
            <h2 className="font-['Cormorant_Garamond'] font-light text-2xl sm:text-3xl tracking-[0.2em] uppercase text-[#f0ede8] text-center mb-3">
              You&apos;ve been creating.
            </h2>

            <p className="text-center text-[#8a8780] font-['Inter'] text-sm mb-6">
              You&apos;ve used every credit — that means you&apos;ve been showing up. Keep the momentum going.
              <br /><br />
              Studio gives you 200 credits a month — that&apos;s 100 brand photos, consistently, without having to think about it. Or top up now with a one-time pack if you want to keep it flexible.
            </p>

            <div className="space-y-3 mb-8">
              <button
                onClick={handleUpgrade}
                disabled={isUpgrading}
                className="w-full bg-[#c8c4bb] text-[#0d0c0b] px-6 py-3 rounded-full font-['Inter'] text-xs font-medium uppercase tracking-[0.15em] hover:bg-[#f0ede8] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUpgrading ? "Processing..." : "Join Studio — 200 credits/mo"}
              </button>
              <button
                onClick={handleBuyCredits}
                disabled={isUpgrading}
                className="w-full bg-[rgba(175,170,162,0.10)] text-[#f0ede8] px-6 py-3 rounded-full font-['Inter'] text-xs font-medium uppercase tracking-[0.15em] hover:bg-[rgba(175,170,162,0.18)] transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-[rgba(195,190,182,0.25)]"
              >
                Top up with a credit pack
              </button>
              <button
                onClick={handleDismiss}
                className="w-full text-[#8a8780] hover:text-[#f0ede8] px-6 py-3 font-['Inter'] text-xs font-light tracking-[0.15em] uppercase transition-colors"
              >
                Not right now
              </button>
            </div>
          </div>
        </div>
      )}

      {showBuyDialog && <BuyCreditsDialog onClose={() => setShowBuyDialog(false)} />}
    </>
  )
}










