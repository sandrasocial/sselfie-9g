"use client"

import { Suspense, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js"
import { loadStripe } from "@stripe/stripe-js"
import Image from "next/image"
import { createUpgradeCheckoutSession } from "@/app/actions/upgrade-checkout"
import { trackCheckoutStart } from "@/lib/analytics"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

function CheckoutUpgradeContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const tier = searchParams.get("tier") || "creator"
  const promoCode = searchParams.get("promo")
  
  const [error, setError] = useState<string | null>(null)

  const fetchClientSecret = async () => {
    try {
      setError(null)
      
      // Track checkout start for analytics
      trackCheckoutStart("sselfie_studio_membership")
      
      // Call server action to create checkout session
      const clientSecret = await createUpgradeCheckoutSession(tier, promoCode)
      
      if (!clientSecret) {
        throw new Error("Failed to create checkout session")
      }
      
      return clientSecret
    } catch (err: any) {
      console.error("Checkout error:", err)
      setError(err.message || "Failed to start checkout")
      throw err
    }
  }

  const handleComplete = async () => {
    console.log("[v0] ==================== PAYMENT COMPLETED ====================")
    console.log("[v0] handleComplete triggered")
    
    // Redirect to dashboard after successful checkout
    router.push("/dashboard?upgraded=true")
    console.log("[v0] ==================== END PAYMENT COMPLETED ====================")
  }

  if (error) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <div className="font-serif text-2xl sm:text-3xl font-extralight tracking-[0.3em] uppercase text-stone-900 mb-4">
            OOPS
          </div>
          <p className="text-sm text-stone-600 font-light mb-6">{error}</p>
          <button
            onClick={() => router.push("/")}
            className="bg-stone-950 text-stone-50 px-6 py-3 rounded-lg text-xs font-medium uppercase tracking-wider hover:bg-stone-800 transition-all duration-200"
          >
            Return Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Hero Image Section */}
      <div className="relative h-[30vh] sm:h-[35vh] md:h-[40vh] overflow-hidden">
        <Image
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/_%20%2846%29-ZphddrVpPQn5mS7BINYUlTMSac3s87.jpeg"
          fill
          alt="SSELFIE Checkout"
          className="object-cover object-center"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-stone-50" />

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
          <div className="font-serif text-xl sm:text-2xl md:text-3xl lg:text-4xl font-extralight tracking-[0.3em] uppercase text-white mb-3">
            S S E L F I E
          </div>
          <p className="text-sm sm:text-base text-white/90 font-light">Upgrade to Creator Studio</p>
          {promoCode && (
            <p className="text-xs sm:text-sm text-white/80 font-light mt-2">
              ✨ Special offer: 40% off your first month
            </p>
          )}
        </div>
      </div>

      {/* Checkout Form Section */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="font-serif text-xl sm:text-2xl md:text-3xl font-extralight tracking-[0.15em] sm:tracking-[0.2em] uppercase text-stone-900 mb-3">
            SECURE CHECKOUT
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 font-light leading-relaxed max-w-xl mx-auto">
            Your payment information is encrypted and secure
          </p>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-6 md:p-8 border border-stone-200 shadow-sm">
          <EmbeddedCheckoutProvider
            stripe={stripePromise}
            options={{
              fetchClientSecret,
              onComplete: handleComplete,
            }}
          >
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        </div>

        <div className="mt-6 text-center">
          <p className="text-[10px] sm:text-xs text-stone-500 font-light leading-relaxed">
            Protected by Stripe · SSL Encrypted · PCI Compliant
          </p>
        </div>
      </div>
    </div>
  )
}

export default function CheckoutUpgradePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
          <div className="text-center">
            <div className="font-serif text-xl sm:text-2xl font-extralight tracking-[0.3em] uppercase text-stone-900 mb-4">
              LOADING
            </div>
          </div>
        </div>
      }
    >
      <CheckoutUpgradeContent />
    </Suspense>
  )
}

