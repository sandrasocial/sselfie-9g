"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { loadStripe } from "@stripe/stripe-js"
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js"
import { CREDIT_PACKAGES } from "@/lib/products"
import { startCreditCheckoutSession } from "@/app/actions/stripe"
import { trackCTAClick } from "@/lib/analytics"

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
      alert("Failed to start checkout. Please try again.")
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
      <div className="min-h-screen bg-black text-white flex flex-col">
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
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-light mb-4" style={{ fontFamily: "'Times New Roman', serif" }}>
            One-Time Credit Packs
          </h1>
          <p className="text-stone-400 text-sm md:text-base">
            Purchase credits to use whenever you need them. No subscription required.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {CREDIT_PACKAGES.map((pkg) => (
            <div
              key={pkg.id}
              className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all"
            >
              <div className="mb-4">
                <h3 className="text-xl font-light mb-2" style={{ fontFamily: "'Times New Roman', serif" }}>
                  {pkg.displayName || pkg.name}
                </h3>
                <p className="text-stone-400 text-xs mb-4">{pkg.description}</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-light" style={{ fontFamily: "'Times New Roman', serif" }}>
                    ${(pkg.priceInCents / 100).toFixed(0)}
                  </span>
                </div>
              </div>
              <button
                onClick={() => handleSelectPackage(pkg.id)}
                disabled={loading}
                className="w-full bg-white text-black px-6 py-3 rounded-full text-xs uppercase tracking-wider hover:bg-stone-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
              >
                {loading && selectedPackage === pkg.id ? "Loading..." : "Purchase"}
              </button>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <button
            onClick={() => router.back()}
            className="text-sm text-stone-400 hover:text-white transition-colors"
          >
            ← Back
          </button>
        </div>
      </div>
    </div>
  )
}

