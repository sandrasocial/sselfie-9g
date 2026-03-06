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

  // Check if user is free or paid (only show for paid users)
  const { data: blueprintData } = useSWR("/api/blueprint/state", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000, // Cache for 1 minute
  })

  const entitlementType = blueprintData?.entitlement?.type
  const isPaidUser = entitlementType === "paid" || entitlementType === "studio"
  const isFreeUser = entitlementType === "free"

  useEffect(() => {
    // Only show for paid users (not free users)
    // Free users have their own upsell modal (FreeModeUpsellModal) in feed planner
    if (!isPaidUser || isFreeUser) {
      setShowModal(false)
      return
    }

    // Show modal when credits reach exactly 0 and haven't been dismissed
    if (credits === 0 && !dismissed && !showModal && isPaidUser) {
      setShowModal(true)
    }
    
    // Hide modal if credits increase
    if (credits > 0 && showModal) {
      setShowModal(false)
      setDismissed(false) // Reset dismissal when credits are added
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

  // Don't show for free users (they have their own upsell modal)
  if (!isPaidUser || isFreeUser) return null
  
  if (!showModal || credits > 0) return null

  return (
    <>
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/80 p-4 animate-fade-in">
          <div className="relative w-full max-w-sm bg-stone-50 rounded-lg p-6 sm:p-8">
            <h2 className="font-serif text-2xl sm:text-3xl font-extralight tracking-[0.2em] uppercase text-stone-900 text-center mb-3">
              You&apos;ve been creating.
            </h2>

            <p className="text-center text-stone-600 font-light text-sm mb-6">
              You&apos;ve used every credit — that means you&apos;ve been showing up. Keep the momentum going.
              <br /><br />
              Studio gives you 200 credits a month — that&apos;s 100 brand photos, consistently, without having to think about it. Or top up now with a one-time pack if you want to keep it flexible.
            </p>

            <div className="space-y-3 mb-8">
              <button
                onClick={handleUpgrade}
                disabled={isUpgrading}
                className="w-full bg-stone-900 text-stone-50 px-6 py-3 rounded-lg text-xs font-medium uppercase tracking-wider hover:bg-stone-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUpgrading ? "Processing..." : "Join Studio — 200 credits/mo"}
              </button>
              <button
                onClick={handleBuyCredits}
                disabled={isUpgrading}
                className="w-full bg-stone-100 text-stone-900 px-6 py-3 rounded-lg text-xs font-medium uppercase tracking-wider hover:bg-stone-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-stone-300/40"
              >
                Top up with a credit pack
              </button>
              <button
                onClick={handleDismiss}
                className="w-full text-stone-600 hover:text-stone-900 px-6 py-3 text-xs font-light tracking-wider uppercase transition-colors"
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










