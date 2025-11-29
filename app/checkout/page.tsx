"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { loadStripe } from "@stripe/stripe-js"
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js"
import Image from "next/image"

const stripePromise =
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
    : Promise.resolve(null as any)

function CheckoutContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const secret = searchParams.get("client_secret")

    console.log("[v0] Checkout page - client_secret present:", !!secret)
    console.log("[v0] Checkout page - Stripe key present:", !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)

    if (!secret) {
      console.log("[v0] Checkout page - No client_secret found")
      setError("No checkout session found")
      return
    }

    console.log("[v0] Checkout page - Setting client secret")
    setClientSecret(secret)
  }, [searchParams])

  const handleComplete = async () => {
    console.log("[v0] ==================== PAYMENT COMPLETED ====================")
    console.log("[v0] handleComplete triggered")
    console.log("[v0] Client secret:", clientSecret ? "present" : "missing")

    if (clientSecret) {
      const sessionId = clientSecret.split("_secret_")[0]
      console.log("[v0] Extracted session ID:", sessionId)

      try {
        console.log("[v0] Fetching session email from API...")
        const response = await fetch(`/api/checkout-session?session_id=${sessionId}`)
        console.log("[v0] API response status:", response.status)

        const sessionData = await response.json()
        console.log("[v0] Session data:", JSON.stringify(sessionData, null, 2))

        if (sessionData.email) {
          const redirectUrl = `/checkout/success?session_id=${sessionId}&email=${encodeURIComponent(sessionData.email)}`
          console.log("[v0] Redirecting to success page with email:", redirectUrl)
          router.push(redirectUrl)
        } else {
          const redirectUrl = `/checkout/success?session_id=${sessionId}`
          console.log("[v0] No email found, redirecting with session_id only:", redirectUrl)
          router.push(redirectUrl)
        }
      } catch (error) {
        console.error("[v0] Error getting session email:", error)
        const fallbackUrl = `/checkout/success?session_id=${sessionId}`
        console.log("[v0] Fallback redirect:", fallbackUrl)
        router.push(fallbackUrl)
      }
    } else {
      console.error("[v0] No client secret available in handleComplete!")
    }
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

  if (!clientSecret) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="font-serif text-xl sm:text-2xl md:text-3xl lg:text-4xl font-extralight tracking-[0.3em] uppercase text-white mb-3">
            S S E L F I E
          </div>
          <p className="text-sm sm:text-base text-white/90 font-light">Complete your order</p>
        </div>
      </div>
    )
  }

  console.log("[v0] Checkout page - Rendering EmbeddedCheckout component")

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
          <p className="text-sm sm:text-base text-white/90 font-light">Complete your order</p>
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
              clientSecret,
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

export default function CheckoutPage() {
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
      <CheckoutContent />
    </Suspense>
  )
}
