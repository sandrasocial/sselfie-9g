"use client"

import { useState, useEffect } from "react"
import { createLandingCheckout } from "@/app/actions/landing-checkout"
import { Sparkles } from "lucide-react"

interface ZeroCreditsUpgradeModalProps {
  credits: number
  onClose?: () => void
}

export function ZeroCreditsUpgradeModal({ credits, onClose }: ZeroCreditsUpgradeModalProps) {
  const [showModal, setShowModal] = useState(false)
  const [isUpgrading, setIsUpgrading] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Show modal when credits reach exactly 0 and haven't been dismissed
    if (credits === 0 && !dismissed && !showModal) {
      setShowModal(true)
    }
    
    // Hide modal if credits increase
    if (credits > 0 && showModal) {
      setShowModal(false)
      setDismissed(false) // Reset dismissal when credits are added
    }
  }, [credits, dismissed, showModal])

  const handleUpgrade = async () => {
    try {
      setIsUpgrading(true)
      const clientSecret = await createLandingCheckout("sselfie_studio_membership")
      if (clientSecret) {
        window.location.href = `/checkout?client_secret=${clientSecret}`
      }
    } catch (error) {
      console.error("[v0] Error creating checkout:", error)
      alert("Failed to start checkout. Please try again.")
      setIsUpgrading(false)
    }
  }

  const handleBuyCredits = async () => {
    try {
      setIsUpgrading(true)
      // Redirect to studio with checkout modal
      window.location.href = "/studio?showCheckout=true&checkout=one_time"
    } catch (error) {
      console.error("[v0] Error:", error)
      setIsUpgrading(false)
    }
  }

  const handleDismiss = () => {
    setDismissed(true)
    setShowModal(false)
    onClose?.()
  }

  if (!showModal || credits > 0) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/90 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="relative w-full max-w-md bg-white rounded-2xl p-6 sm:p-8 shadow-2xl border border-stone-200/60 animate-in zoom-in-95 duration-300">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-stone-100 to-stone-200 rounded-full flex items-center justify-center mb-4">
            <Sparkles size={32} className="text-stone-600" />
          </div>
          
          <h2 className="font-serif text-2xl sm:text-3xl font-extralight tracking-[0.2em] uppercase text-stone-900 mb-3">
            You're All Out
          </h2>

          <p className="text-sm text-stone-600 font-light mb-2">
            You've used all your credits
          </p>
          
          <p className="text-xs text-stone-500 font-light">
            Upgrade to Studio Membership for monthly credits, or purchase a one-time session
          </p>
        </div>

        <div className="space-y-3 mb-6">
          <button
            onClick={handleUpgrade}
            disabled={isUpgrading}
            className="w-full bg-stone-950 text-white px-6 py-4 rounded-xl text-sm font-medium uppercase tracking-wider hover:bg-stone-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isUpgrading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Loading...
              </>
            ) : (
              "Upgrade to Studio Membership"
            )}
          </button>
          
          <button
            onClick={handleBuyCredits}
            disabled={isUpgrading}
            className="w-full bg-stone-100 text-stone-900 px-6 py-4 rounded-xl text-sm font-medium uppercase tracking-wider hover:bg-stone-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-stone-300/40"
          >
            Buy One-Time Session
          </button>
        </div>

        <button
          onClick={handleDismiss}
          className="w-full text-stone-500 hover:text-stone-700 px-6 py-2 text-xs font-light tracking-wider uppercase transition-colors"
        >
          Maybe Later
        </button>
      </div>
    </div>
  )
}
