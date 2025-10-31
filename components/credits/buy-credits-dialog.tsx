"use client"

import { useState, useCallback } from "react"
import { loadStripe } from "@stripe/stripe-js"
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js"
import { CREDIT_PACKAGES } from "@/lib/products"
import { startCreditCheckoutSession } from "@/app/actions/stripe"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

export function BuyCreditsDialog({ onClose }: { onClose?: () => void }) {
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null)

  const startCheckout = useCallback(() => startCreditCheckoutSession(selectedPackage!), [selectedPackage])

  if (selectedPackage) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/80">
        <div className="relative w-full max-w-2xl bg-stone-50 p-8 rounded-lg">
          <button
            onClick={() => {
              setSelectedPackage(null)
              onClose?.()
            }}
            className="absolute top-4 right-4 text-stone-500 hover:text-stone-900 text-sm font-light tracking-wider uppercase"
          >
            CLOSE
          </button>
          <EmbeddedCheckoutProvider stripe={stripePromise} options={{ fetchClientSecret: startCheckout }}>
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/80 p-4">
      <div className="relative w-full max-w-4xl bg-stone-50 p-8 md:p-12 rounded-lg">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-stone-500 hover:text-stone-900 text-sm font-light tracking-wider uppercase"
        >
          CLOSE
        </button>

        <h2 className="font-serif text-4xl md:text-5xl font-extralight tracking-[0.3em] uppercase text-stone-900 mb-4">
          BUY CREDITS
        </h2>
        <p className="text-sm text-stone-500 font-light mb-12">Purchase additional credits to continue creating</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {CREDIT_PACKAGES.map((pkg) => (
            <button
              key={pkg.id}
              onClick={() => setSelectedPackage(pkg.id)}
              className={`relative p-8 border-2 rounded-lg text-left transition-all hover:border-stone-900 ${
                pkg.popular ? "border-stone-900 bg-stone-100" : "border-stone-200 bg-stone-50"
              }`}
            >
              {pkg.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-stone-900 text-stone-50 px-4 py-1 text-xs tracking-wider uppercase">
                  POPULAR
                </div>
              )}

              <div className="mb-6">
                <h3 className="font-serif text-2xl font-extralight tracking-[0.2em] uppercase text-stone-900 mb-2">
                  {pkg.name}
                </h3>
                <p className="text-sm text-stone-500 font-light">{pkg.description}</p>
              </div>

              <div className="mb-6">
                <div className="font-serif text-4xl font-extralight text-stone-900">
                  ${(pkg.priceInCents / 100).toFixed(0)}
                </div>
                <div className="text-xs text-stone-500 font-light tracking-wider uppercase mt-1">
                  {pkg.credits} CREDITS
                </div>
              </div>

              <div className="text-xs text-stone-500 font-light">
                ${(pkg.priceInCents / 100 / pkg.credits).toFixed(2)} per credit
              </div>
            </button>
          ))}
        </div>

        <div className="mt-12 p-6 bg-stone-100 rounded-lg">
          <h3 className="font-serif text-xl font-extralight tracking-[0.2em] uppercase text-stone-900 mb-4">
            CREDIT USAGE
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-stone-900 font-medium mb-1">Training (25 credits)</div>
              <div className="text-stone-500 font-light">Train your AI model with your photos</div>
            </div>
            <div>
              <div className="text-stone-900 font-medium mb-1">Image (1 credit)</div>
              <div className="text-stone-500 font-light">Generate a professional photo</div>
            </div>
            <div>
              <div className="text-stone-900 font-medium mb-1">Animation (2.5 credits)</div>
              <div className="text-stone-500 font-light">Create an animated video</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
