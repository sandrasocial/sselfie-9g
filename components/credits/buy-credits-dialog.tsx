"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { loadStripe } from "@stripe/stripe-js"
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js"
import { CREDIT_PACKAGES } from "@/lib/products"
import { startCreditCheckoutSession } from "@/app/actions/stripe"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

export function BuyCreditsDialog({ onClose }: { onClose?: () => void }) {
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null)
  const [promoCode, setPromoCode] = useState("")
  const [promoError, setPromoError] = useState("")
  const [isValidatingPromo, setIsValidatingPromo] = useState(false)
  const router = useRouter()

  const startCheckout = useCallback(async () => {
    try {
      setIsValidatingPromo(true)
      setPromoError("")
      return await startCreditCheckoutSession(selectedPackage!, promoCode || undefined)
    } catch (error: any) {
      setPromoError(error.message || "Failed to start checkout")
      throw error
    } finally {
      setIsValidatingPromo(false)
    }
  }, [selectedPackage, promoCode])

  const handleComplete = useCallback(async () => {
    router.push("/checkout/success?type=credit_topup")
  }, [router])

  if (selectedPackage) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0d0c0b] overflow-y-auto">
        <button
          onClick={() => {
            setSelectedPackage(null)
            setPromoCode("")
            setPromoError("")
            onClose?.()
          }}
          className="fixed top-4 right-4 z-10 font-['Inter'] text-[#8a8780] hover:text-[#f0ede8] text-xs font-medium tracking-[0.5em] uppercase transition-colors bg-[rgba(175,170,162,0.10)] backdrop-blur-sm px-3 py-2 rounded-full min-h-[44px]"
        >
          CLOSE
        </button>

        <div className="relative h-[20vh] sm:h-[25vh] md:h-[30vh] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-[#1c1b19] to-[#0d0c0b]" />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
            <div className="font-['Cormorant_Garamond'] font-light text-lg sm:text-xl md:text-2xl lg:text-3xl tracking-[0.25em] sm:tracking-[0.3em] uppercase text-[#f0ede8] mb-2 sm:mb-3">
              S S E L F I E
            </div>
            <p className="font-['Inter'] text-[10px] tracking-[0.5em] uppercase font-medium text-[#8a8780]">Top up credits</p>
          </div>
        </div>

        <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 md:py-12">
          <div className="text-center mb-4 sm:mb-6 md:mb-8">
            <h1 className="font-['Cormorant_Garamond'] font-light text-lg sm:text-xl md:text-2xl lg:text-3xl tracking-[0.1em] sm:tracking-[0.15em] uppercase text-[#f0ede8] mb-2 sm:mb-3">
              SECURE CHECKOUT
            </h1>
            <p className="font-['Inter'] text-xs sm:text-sm text-[#8a8780] leading-relaxed max-w-xl mx-auto px-2">
              Your payment is encrypted and secure
            </p>
          </div>

          {promoError && (
            <div className="mb-4 p-3 bg-[rgba(175,170,162,0.10)] border border-[rgba(195,190,182,0.25)] rounded-2xl text-center">
              <p className="text-xs text-[#8a8780]">{promoError}</p>
            </div>
          )}

          <div className="bg-[rgba(175,170,162,0.10)] backdrop-blur-[50px] rounded-2xl p-3 sm:p-4 md:p-6 lg:p-8 border border-[rgba(195,190,182,0.25)]">
            <EmbeddedCheckoutProvider
              stripe={stripePromise}
              options={{
                fetchClientSecret: startCheckout,
                onComplete: handleComplete,
              }}
            >
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          </div>

          <div className="mt-4 sm:mt-6 text-center">
            <p className="font-['Inter'] text-[10px] sm:text-xs text-[#8a8780] leading-relaxed px-4">
              Protected by Stripe · SSL Encrypted · PCI Compliant
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(13,12,11,0.90)] backdrop-blur-sm p-4">
      <div className="relative w-full max-w-sm sm:max-w-md bg-[rgba(28,27,25,0.97)] border border-[rgba(195,190,182,0.25)] backdrop-blur-[70px] rounded-2xl p-5 sm:p-6 md:p-8 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 font-['Inter'] text-[#8a8780] hover:text-[#f0ede8] text-xs font-medium tracking-[0.5em] uppercase transition-colors min-h-[44px] px-3"
        >
          CLOSE
        </button>

        <h2 className="font-['Cormorant_Garamond'] font-light text-xl sm:text-2xl md:text-3xl tracking-[0.2em] uppercase text-[#f0ede8] mb-6 sm:mb-8 pr-12">
          TOP UP
        </h2>

        <div className="mb-4 sm:mb-6">
          <label htmlFor="promo-code" className="block font-['Inter'] text-[10px] font-medium tracking-[0.5em] uppercase text-[#8a8780] mb-2">
            Promo Code (Optional)
          </label>
          <input
            id="promo-code"
            type="text"
            value={promoCode}
            onChange={(e) => {
              setPromoCode(e.target.value.toUpperCase())
              setPromoError("")
            }}
            placeholder="Enter code"
            className="w-full px-4 py-3 border border-[rgba(195,190,182,0.25)] bg-[rgba(175,170,162,0.10)] rounded-xl font-['Inter'] text-[#f0ede8] text-sm placeholder:text-[#8a8780] focus:outline-none focus:border-[rgba(195,190,182,0.50)] transition-colors uppercase"
          />
          {promoCode && <p className="mt-1 text-xs text-[#8a8780] font-['Inter']">Code will be applied at checkout</p>}
        </div>

        <div className="space-y-3 sm:space-y-4">
          {CREDIT_PACKAGES.map((pkg) => (
            <button
              key={pkg.id}
              onClick={() => setSelectedPackage(pkg.id)}
              className="w-full text-left p-4 sm:p-5 border border-[rgba(195,190,182,0.25)] bg-[rgba(175,170,162,0.10)] rounded-xl hover:border-[rgba(195,190,182,0.50)] hover:bg-[rgba(175,170,162,0.18)] transition-all group min-h-[72px]"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-['Cormorant_Garamond'] font-light text-base sm:text-lg text-[#f0ede8] mb-1">
                    {pkg.credits} Credits
                  </div>
                  <div className="font-['Inter'] text-xs text-[#8a8780]">
                    ${(pkg.priceInCents / 100 / pkg.credits).toFixed(2)} per credit
                  </div>
                </div>
                <div className="font-['Cormorant_Garamond'] font-light text-xl sm:text-2xl text-[#f0ede8]">
                  ${(pkg.priceInCents / 100).toFixed(0)}
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-5 sm:mt-6 pt-5 sm:pt-6 border-t border-[rgba(195,190,182,0.15)]">
          <div className="font-['Inter'] text-xs text-[#8a8780] space-y-2">
            <div className="flex justify-between">
              <span>Training</span>
              <span>25 credits</span>
            </div>
            <div className="flex justify-between">
              <span>Image</span>
              <span>1 credit</span>
            </div>
            <div className="flex justify-between">
              <span>Animation</span>
              <span>10 credits</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
