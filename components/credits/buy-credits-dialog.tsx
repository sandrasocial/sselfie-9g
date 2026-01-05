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
      <div className="fixed inset-0 z-50 bg-stone-50 overflow-y-auto">
        <button
          onClick={() => {
            setSelectedPackage(null)
            setPromoCode("")
            setPromoError("")
            onClose?.()
          }}
          className="fixed top-4 right-4 z-10 text-stone-500 hover:text-stone-900 text-xs font-light tracking-wider uppercase transition-colors bg-white/80 backdrop-blur-sm px-3 py-2 rounded-lg min-h-[44px]"
        >
          CLOSE
        </button>

        <div className="relative h-[20vh] sm:h-[25vh] md:h-[30vh] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-stone-900 to-stone-800" />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
            <div className="font-serif text-lg sm:text-xl md:text-2xl lg:text-3xl font-extralight tracking-[0.25em] sm:tracking-[0.3em] uppercase text-white mb-2 sm:mb-3">
              S S E L F I E
            </div>
            <p className="text-xs sm:text-sm md:text-base text-white/90 font-light">Top up credits</p>
          </div>
        </div>

        <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 md:py-12">
          <div className="text-center mb-4 sm:mb-6 md:mb-8">
            <h1 className="font-serif text-lg sm:text-xl md:text-2xl lg:text-3xl font-extralight tracking-[0.1em] sm:tracking-[0.15em] uppercase text-stone-900 mb-2 sm:mb-3">
              SECURE CHECKOUT
            </h1>
            <p className="text-xs sm:text-sm text-stone-600 font-light leading-relaxed max-w-xl mx-auto px-2">
              Your payment is encrypted and secure
            </p>
          </div>

          {promoError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-center">
              <p className="text-xs text-red-600">{promoError}</p>
            </div>
          )}

          <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-6 lg:p-8 border border-stone-200 shadow-sm">
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
            <p className="text-[10px] sm:text-xs text-stone-500 font-light leading-relaxed px-4">
              Protected by Stripe · SSL Encrypted · PCI Compliant
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/80 p-4">
      <div className="relative w-full max-w-sm sm:max-w-md bg-stone-50 rounded-lg p-5 sm:p-6 md:p-8 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 text-stone-500 hover:text-stone-900 text-xs font-light tracking-wider uppercase transition-colors min-h-[44px] px-3"
        >
          CLOSE
        </button>

        <h2 className="font-serif text-xl sm:text-2xl md:text-3xl font-extralight tracking-[0.2em] uppercase text-stone-900 mb-6 sm:mb-8 pr-12">
          TOP UP
        </h2>

        <div className="mb-4 sm:mb-6">
          <label htmlFor="promo-code" className="block text-xs font-light tracking-wider uppercase text-stone-600 mb-2">
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
            className="w-full px-4 py-3 border border-stone-200 rounded-lg font-light text-sm focus:outline-none focus:border-stone-900 transition-colors uppercase"
          />
          {promoCode && <p className="mt-1 text-xs text-stone-500 font-light">Code will be applied at checkout</p>}
        </div>

        <div className="space-y-3 sm:space-y-4">
          {CREDIT_PACKAGES.map((pkg) => (
            <button
              key={pkg.id}
              onClick={() => setSelectedPackage(pkg.id)}
              className="w-full text-left p-4 sm:p-5 border border-stone-200 rounded-lg hover:border-stone-900 hover:bg-white transition-all group min-h-[72px]"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-serif text-base sm:text-lg font-light text-stone-900 mb-1">
                    {pkg.credits} Credits
                  </div>
                  <div className="text-xs text-stone-500 font-light">
                    ${(pkg.priceInCents / 100 / pkg.credits).toFixed(2)} per credit
                  </div>
                </div>
                <div className="font-serif text-xl sm:text-2xl font-light text-stone-900">
                  ${(pkg.priceInCents / 100).toFixed(0)}
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-5 sm:mt-6 pt-5 sm:pt-6 border-t border-stone-200">
          <div className="text-xs text-stone-600 font-light space-y-2">
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
              <span>3 credits</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
