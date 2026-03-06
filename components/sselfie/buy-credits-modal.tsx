"use client"

import { useState, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js"
import { loadStripe } from "@stripe/stripe-js"
import { CREDIT_PACKAGES } from "@/lib/products"
import { startCreditCheckoutSession } from "@/app/actions/stripe"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface BuyCreditsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export default function BuyCreditsModal({ open, onOpenChange, onSuccess }: BuyCreditsModalProps) {
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const startCheckout = useCallback(async () => {
    if (!selectedPackage) return null

    try {
      return await startCreditCheckoutSession(selectedPackage)
    } catch (error) {
      console.error("[v0] Error starting checkout:", error)
      return null
    }
  }, [selectedPackage])

  const handlePackageSelect = (packageId: string) => {
    setSelectedPackage(packageId)
    setIsLoading(true)
  }

  const handleCheckoutComplete = () => {
    setIsLoading(false)
    setSelectedPackage(null)
    onOpenChange(false)
    onSuccess?.()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto border border-white/14 bg-[rgba(9,9,9,0.94)] text-white backdrop-blur-[18px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-serif font-light tracking-[0.03em] text-white">Buy Credits</DialogTitle>
        </DialogHeader>

        {!selectedPackage ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            {CREDIT_PACKAGES.map((pkg) => (
              <div
                key={pkg.id}
                className={`relative border rounded-2xl p-6 transition-all cursor-pointer ${
                  pkg.popular
                    ? "border-white/35 shadow-[0_18px_48px_rgba(0,0,0,0.45)] bg-[rgba(255,255,255,0.06)]"
                    : "border-white/18 bg-[rgba(255,255,255,0.03)] hover:border-white/30"
                }`}
                onClick={() => handlePackageSelect(pkg.id)}
              >
                {pkg.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white text-stone-900 px-3 py-1 rounded-full text-xs font-semibold tracking-[0.08em] uppercase">
                    Most Popular
                  </div>
                )}

                <div className="text-center space-y-4">
                  <div>
                    <div className="text-4xl font-serif font-light text-white">{pkg.credits}</div>
                    <div className="text-sm text-white/65 mt-1">Credits</div>
                  </div>

                  <div className="text-3xl font-serif font-light text-white">
                    ${(pkg.priceInCents / 100).toFixed(2)}
                  </div>

                  <p className="text-sm text-white/70">{pkg.description}</p>

                  <div className="pt-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm text-white/78">
                      <span className="text-[10px] uppercase tracking-[0.16em] text-white/55">Included</span>
                      <span>Generate AI images</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-white/78">
                      <span className="text-[10px] uppercase tracking-[0.16em] text-white/55">Included</span>
                      <span>Create Instagram feeds</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-white/78">
                      <span className="text-[10px] uppercase tracking-[0.16em] text-white/55">Included</span>
                      <span>Never expires</span>
                    </div>
                  </div>

                  <Button
                    className="w-full bg-white text-stone-900 hover:bg-stone-100 rounded-xl font-semibold tracking-[0.04em]"
                    onClick={() => handlePackageSelect(pkg.id)}
                  >
                    Select Package
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-6">
            {isLoading && (
              <EmbeddedCheckoutProvider
                stripe={stripePromise}
                options={{
                  fetchClientSecret: startCheckout,
                  onComplete: handleCheckoutComplete,
                }}
              >
                <EmbeddedCheckout />
              </EmbeddedCheckoutProvider>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
