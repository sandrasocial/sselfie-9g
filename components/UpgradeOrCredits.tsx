"use client"

import { Button } from "@/components/ui/button"
import { CreditCard, ArrowRight } from "lucide-react"
import { useState } from "react"
import BuyCreditsModal from "@/components/sselfie/buy-credits-modal"

interface UpgradeOrCreditsProps {
  feature?: string
}

export function UpgradeOrCredits({ feature = "Studio" }: UpgradeOrCreditsProps) {
  const [showBuyCredits, setShowBuyCredits] = useState(false)

  const handleUpgrade = () => {
    window.location.href = "/checkout/membership"
  }

  const handleBuyCredits = () => {
    setShowBuyCredits(true)
  }

  return (
    <>
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <div className="text-center max-w-md space-y-6">
          <div className="w-20 h-20 mx-auto bg-stone-100 rounded-2xl flex items-center justify-center">
            <CreditCard size={40} className="text-stone-400" />
          </div>

          <div className="space-y-2">
            <h2 className="font-serif text-3xl font-extralight tracking-[0.2em] uppercase text-stone-900">
              OUT OF CREDITS
            </h2>
            <p className="text-stone-600 font-light text-sm leading-relaxed">
              You need credits to use {feature}. Choose an option below to continue creating.
            </p>
          </div>

          <div className="space-y-3 pt-4">
            <Button
              onClick={handleUpgrade}
              className="w-full bg-stone-900 hover:bg-stone-800 text-white rounded-xl py-6 text-sm font-medium tracking-wider uppercase flex items-center justify-center gap-2"
            >
              UPGRADE TO MEMBERSHIP
              <ArrowRight size={16} />
            </Button>

            <Button
              onClick={handleBuyCredits}
              variant="outline"
              className="w-full border-stone-300 hover:bg-stone-50 text-stone-900 rounded-xl py-6 text-sm font-medium tracking-wider uppercase flex items-center justify-center gap-2 bg-transparent"
            >
              <CreditCard size={18} />
              BUY CREDITS
            </Button>
          </div>

          <div className="pt-6 space-y-2 text-xs text-stone-500">
            <div className="flex items-center justify-between px-4 py-2 bg-stone-50 rounded-lg">
              <span>Studio Membership</span>
              <span className="font-medium text-stone-900">200 credits/month</span>
            </div>
            <div className="flex items-center justify-between px-4 py-2 bg-stone-50 rounded-lg">
              <span>One-time credits</span>
              <span className="font-medium text-stone-900">Never expire</span>
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
