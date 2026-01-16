"use client"

import { useState, useEffect } from "react"
import { startEmbeddedCheckout } from "@/lib/start-embedded-checkout"
import { BuyCreditsDialog } from "./buy-credits-dialog"
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
      const clientSecret = await startEmbeddedCheckout("sselfie_studio_membership")
      window.location.href = `/checkout?client_secret=${clientSecret}`
    } catch (error) {
      console.error("[v0] Error creating checkout:", error)
      alert("Failed to start checkout. Please try again.")
      setIsUpgrading(false)
    }
  }

  const handleBuyCredits = () => {
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
              OUT OF CREDITS
            </h2>

            <p className="text-center text-stone-600 font-light text-sm mb-6">
              You&apos;ve used all your credits. Upgrade to Studio Membership for monthly credits, or purchase a one-time session.
            </p>

            <div className="space-y-3 mb-8">
              <button
                onClick={handleUpgrade}
                disabled={isUpgrading}
                className="w-full bg-stone-900 text-stone-50 px-6 py-3 rounded-lg text-xs font-medium uppercase tracking-wider hover:bg-stone-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUpgrading ? "Processing..." : "UPGRADE TO STUDIO"}
              </button>
              <button
                onClick={handleBuyCredits}
                disabled={isUpgrading}
                className="w-full bg-stone-100 text-stone-900 px-6 py-3 rounded-lg text-xs font-medium uppercase tracking-wider hover:bg-stone-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-stone-300/40"
              >
                BUY CREDITS
              </button>
              <button
                onClick={handleDismiss}
                className="w-full text-stone-600 hover:text-stone-900 px-6 py-3 text-xs font-light tracking-wider uppercase transition-colors"
              >
                MAYBE LATER
              </button>
            </div>
          </div>
        </div>
      )}

      {showBuyDialog && <BuyCreditsDialog onClose={() => setShowBuyDialog(false)} />}
    </>
  )
}











