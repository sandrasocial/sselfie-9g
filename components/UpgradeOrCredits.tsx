"use client"

import { Button } from "@/components/ui/button"
import { CreditCard, ArrowRight } from "lucide-react"
import { useState } from "react"
import BuyCreditsModal from "@/components/sselfie/buy-credits-modal"
import { startEmbeddedCheckout } from "@/lib/start-embedded-checkout"
import { trackCTAClick } from "@/lib/analytics"

interface UpgradeOrCreditsProps {
  feature?: string
  isPaidBlueprintUser?: boolean
  requiresMembership?: boolean // New prop: true for Maya/Academy (membership-only features)
}

export function UpgradeOrCredits({ 
  feature = "Studio",
  isPaidBlueprintUser = false,
  requiresMembership = false,
}: UpgradeOrCreditsProps) {
  const [showBuyCredits, setShowBuyCredits] = useState(false)
  const [isUpgrading, setIsUpgrading] = useState(false)

  const handleUpgrade = async () => {
    try {
      setIsUpgrading(true)
      trackCTAClick("upgrade_or_credits", "Upgrade to Membership", "/checkout")
      const clientSecret = await startEmbeddedCheckout("sselfie_studio_membership")
      window.location.href = `/checkout?client_secret=${clientSecret}`
    } catch (error) {
      console.error("[UpgradeOrCredits] Error creating checkout:", error)
      // Revenue-protect fallback: route to hosted checkout page if embedded checkout fails.
      window.location.href = "/checkout/membership?fallback=embedded_failed&source=upgrade_or_credits"
    }
  }

  const handleBuyCredits = () => {
    trackCTAClick("upgrade_or_credits", "Buy Credits", "/checkout/credits")
    setShowBuyCredits(true)
  }

  // Update title/message based on feature type
  const title = requiresMembership || isPaidBlueprintUser
    ? "UPGRADE TO MEMBERSHIP" 
    : "OUT OF CREDITS"
  
  const message = requiresMembership
    ? `${feature} is available exclusively for Studio Members. Upgrade to unlock ${feature} and all premium features.`
    : isPaidBlueprintUser
      ? `You have access to Feed Planner. Upgrade to Studio Membership to unlock ${feature} and all features.`
      : `You need credits to use ${feature}. Choose an option below to continue creating.`

  return (
    <>
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <div className="text-center max-w-md space-y-6">
          <div className="w-20 h-20 mx-auto bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.18)] rounded-2xl flex items-center justify-center backdrop-blur-xl">
            <CreditCard size={40} className="text-white/80" />
          </div>

          <div className="space-y-2">
            <h2 className="font-serif text-3xl font-extralight tracking-[0.2em] uppercase text-white">
              {title}
            </h2>
            <p className="text-white/70 font-light text-sm leading-relaxed">
              {message}
            </p>
          </div>

          <div className="space-y-3 pt-4">
            <Button
              onClick={handleUpgrade}
              disabled={isUpgrading}
              className="w-full bg-white text-stone-950 hover:bg-stone-100 rounded-xl py-6 text-sm font-medium tracking-wider uppercase flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUpgrading ? "LOADING..." : "UPGRADE TO MEMBERSHIP"}
              {!isUpgrading && <ArrowRight size={16} />}
            </Button>

            {/* Only show "Buy Credits" option if feature doesn't require membership */}
            {!requiresMembership && (
              <Button
                onClick={handleBuyCredits}
                disabled={isUpgrading}
                variant="outline"
                className="w-full border-white/25 hover:bg-white/10 text-white rounded-xl py-6 text-sm font-medium tracking-wider uppercase flex items-center justify-center gap-2 bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CreditCard size={18} />
                BUY CREDITS
              </Button>
            )}
          </div>

          <div className="pt-6 space-y-2 text-xs text-white/70">
            <div className="flex items-center justify-between px-4 py-2 bg-[rgba(255,255,255,0.1)] rounded-lg border border-white/15">
              <span>Studio Membership</span>
              <span className="font-medium text-white">200 credits/month</span>
            </div>
            <div className="flex items-center justify-between px-4 py-2 bg-[rgba(255,255,255,0.06)] rounded-lg border border-white/10">
              <span>One-time credits</span>
              <span className="font-medium text-white">Never expire</span>
            </div>
          </div>
        </div>
      </div>

      <BuyCreditsModal
        open={showBuyCredits}
        onOpenChange={setShowBuyCredits}
        onSuccess={() => {
          setShowBuyCredits(false)
          window.location.reload()
        }}
      />
    </>
  )
}
