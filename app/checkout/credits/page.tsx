"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { loadStripe } from "@stripe/stripe-js"
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js"
import { CREDIT_PACKAGES } from "@/lib/products"
import { startCreditCheckoutSession } from "@/app/actions/stripe"
import { trackCTAClick } from "@/lib/analytics"
import { handleCheckoutFailure } from "@/lib/checkout-failure"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

export default function CreditsCheckoutPage() {
  const router = useRouter()
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSelectPackage = async (packageId: string) => {
    setLoading(true)
    setSelectedPackage(packageId)
    
    try {
      trackCTAClick("credits_page", `Select ${packageId}`, "/checkout/credits")
      const secret = await startCreditCheckoutSession(packageId)
      setClientSecret(secret)
    } catch (error) {
      console.error("[v0] Error starting checkout:", error)
      handleCheckoutFailure({
        error,
        source: "credits_checkout_page",
        productId: packageId,
        fallbackPath: "/checkout/credits",
      })
      setSelectedPackage(null)
    } finally {
      setLoading(false)
    }
  }

  const handleComplete = () => {
    router.push("/checkout/success?type=credit_topup")
  }

  if (clientSecret) {
    return (
      <div className="min-h-screen bg-[#0d0c0b] text-[#f0ede8] flex flex-col">
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-4 md:p-8">
            <EmbeddedCheckoutProvider stripe={stripePromise} options={{ clientSecret }}>
              <EmbeddedCheckout onComplete={handleComplete} />
            </EmbeddedCheckoutProvider>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0d0c0b] text-[#f0ede8]">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <p className="font-['Inter'] font-medium text-[10px] uppercase tracking-[0.5em] text-[#8a8780] mb-4">Credits</p>
          <h1 className="font-['Cormorant_Garamond'] font-light text-4xl text-[#f0ede8] tracking-wide mb-4">
            One-Time Credit Packs
          </h1>
          <p className="text-[#8a8780] text-sm">
            Purchase credits to use whenever you need them. No subscription required.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {CREDIT_PACKAGES.map((pkg) => (
            <div
              key={pkg.id}
              className="bg-[rgba(175,170,162,0.10)] backdrop-blur-[50px] border border-[rgba(195,190,182,0.25)] rounded-2xl p-6 hover:border-[rgba(195,190,182,0.40)] transition-all"
            >
              <div className="mb-4">
                <h3 className="font-['Cormorant_Garamond'] text-2xl text-[#f0ede8] mb-2">
                  {pkg.displayName || pkg.name}
                </h3>
                <p className="text-[#8a8780] text-xs mb-4">{pkg.description}</p>
                <div className="flex items-baseline gap-2">
                  <span className="font-['Cormorant_Garamond'] font-light text-3xl text-[#f0ede8]">
                    ${(pkg.priceInCents / 100).toFixed(0)}
                  </span>
                </div>
              </div>
              <button
                onClick={() => handleSelectPackage(pkg.id)}
                disabled={loading}
                className="w-full bg-[#c8c4bb] text-[#0d0c0b] font-medium tracking-[0.15em] uppercase text-xs px-6 py-3 rounded-full hover:bg-[#f0ede8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
              >
                {loading && selectedPackage === pkg.id ? "Loading..." : "Purchase"}
              </button>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <button
            onClick={() => router.back()}
            className="text-sm text-[#8a8780] hover:text-[#f0ede8] transition-colors"
          >
            ← Back
          </button>
        </div>
      </div>
    </div>
  )
}
