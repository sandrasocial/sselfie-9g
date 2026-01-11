"use client"

import { useState, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js"
import { loadStripe } from "@stripe/stripe-js"
import { CREDIT_PACKAGES } from "@/lib/products"
import { Check } from 'lucide-react'
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-serif font-light text-stone-900">Buy Credits</DialogTitle>
        </DialogHeader>

        {!selectedPackage ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            {CREDIT_PACKAGES.map((pkg) => (
              <div
                key={pkg.id}
                className={`relative border rounded-2xl p-6 hover:border-stone-400 transition-all cursor-pointer ${
                  pkg.popular ? "border-stone-900 shadow-lg" : "border-stone-200"
                }`}
                onClick={() => handlePackageSelect(pkg.id)}
              >
                {pkg.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-stone-900 text-white px-3 py-1 rounded-full text-xs font-medium">
                    Most Popular
                  </div>
                )}

                <div className="text-center space-y-4">
                  <div>
                    <div className="text-4xl font-serif font-light text-stone-900">{pkg.credits}</div>
                    <div className="text-sm text-stone-500 mt-1">Credits</div>
                  </div>

                  <div className="text-3xl font-serif font-light text-stone-900">
                    ${(pkg.priceInCents / 100).toFixed(2)}
                  </div>

                  <p className="text-sm text-stone-600">{pkg.description}</p>

                  <div className="pt-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm text-stone-700">
                      <Check size={16} className="text-stone-900" />
                      <span>Generate AI images</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-stone-700">
                      <Check size={16} className="text-stone-900" />
                      <span>Create Instagram feeds</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-stone-700">
                      <Check size={16} className="text-stone-900" />
                      <span>Never expires</span>
                    </div>
                  </div>

                  <Button
                    className="w-full bg-stone-900 hover:bg-stone-800 text-white rounded-xl"
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
