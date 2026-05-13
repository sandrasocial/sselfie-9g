"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { loadStripe } from "@stripe/stripe-js"
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js"
import Image from "next/image"
import { trackCheckoutStart } from "@/lib/analytics"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

const CHECKOUT_COPY: Record<
  string,
  {
    heroTitle: string
    heroBody: string
    heading: string
    blurb: string
    footer: string
  }
> = {
  selfie_guide: {
    heroTitle: "Complete your Selfie Guide order",
    heroBody: "Secure your guide and 7-day challenge.",
    heading: "Secure checkout",
    blurb: "You are buying the Selfie Guide with encrypted Stripe checkout.",
    footer: "Digital purchase. Your guide access is delivered right after payment.",
  },
  starter_kit: {
    heroTitle: "Complete your Starter Kit order",
    heroBody: "Get the presets, quick-start, and guide support in one place.",
    heading: "Secure checkout",
    blurb: "You are buying the Selfie Starter Kit with encrypted Stripe checkout.",
    footer: "Digital purchase. Your Starter Kit access is delivered right after payment.",
  },
  masterclass: {
    heroTitle: "Complete your Masterclass order",
    heroBody: "Unlock Sandra's full selfie method right after payment.",
    heading: "Secure checkout",
    blurb: "You are buying the Selfie Masterclass with encrypted Stripe checkout.",
    footer: "Digital purchase. Your Masterclass access is delivered right after payment.",
  },
}

function CheckoutContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const productType = searchParams.get("product_type") || "unknown"
  const checkoutCopy = CHECKOUT_COPY[productType] ?? {
    heroTitle: "Complete your SSELFIE Studio order",
    heroBody: "Secure your purchase and keep moving.",
    heading: "Secure checkout",
    blurb: "Your payment is encrypted and protected with Stripe.",
    footer: "Cancel anytime. 30-day refund if you're not happy.",
  }

  useEffect(() => {
    const secret = searchParams.get("client_secret")

    console.log("[v0] Checkout page - client_secret present:", !!secret)
    console.log("[v0] Checkout page - Stripe key present:", !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)

    if (!secret) {
      console.log("[v0] Checkout page - No client_secret found")
      setError("No checkout session found")
      return
    }

    // Track checkout page view (checkout started)
    trackCheckoutStart(productType)

    console.log("[v0] Checkout page - Setting client secret")
    setClientSecret(secret)
  }, [productType, searchParams])

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

        // Get product_type from query params or session metadata
        const productTypeFromQuery = searchParams.get("product_type")
        const productTypeFromSession = sessionData.product_type || productTypeFromQuery
        const returnToFromQuery = searchParams.get("return_to")
        const returnToFromSession = sessionData.return_to || returnToFromQuery
        const encodedReturnTo = returnToFromSession ? `&return_to=${encodeURIComponent(returnToFromSession)}` : ""
        
        const brandStrategyBumpParam = sessionData.has_brand_strategy_pack ? "&brand_strategy_bump=1" : ""

        const redirectUrl = `/checkout/success?session_id=${sessionId}${productTypeFromSession ? `&type=${encodeURIComponent(productTypeFromSession)}` : ""}${encodedReturnTo}${brandStrategyBumpParam}`
        console.log("[v0] Redirecting to success page with session_id only:", redirectUrl)
        router.push(redirectUrl)
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
      <div className="min-h-screen bg-[#0d0c0b] flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <div className="font-['Cormorant_Garamond'] font-light text-2xl sm:text-3xl tracking-[0.3em] uppercase text-[#f0ede8] mb-4">
            Something went wrong
          </div>
          <p className="text-sm text-[#8a8780] font-light mb-6">We couldn&apos;t find your checkout session.</p>
          <button
            onClick={() => router.push("/")}
            className="bg-[#c8c4bb] text-[#0d0c0b] font-medium tracking-[0.15em] uppercase text-xs px-6 py-3 rounded-full hover:bg-[#f0ede8] transition-colors"
          >
            Go back to Home
          </button>
        </div>
      </div>
    )
  }

  if (!clientSecret) {
    return (
      <div className="min-h-screen bg-[#0d0c0b] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="font-['Cormorant_Garamond'] font-light text-xl sm:text-2xl md:text-3xl lg:text-4xl tracking-[0.3em] uppercase text-[#f0ede8] mb-3">
            S S E L F I E
          </div>
          <p className="text-sm sm:text-base text-[#8a8780] font-light">Complete your order</p>
        </div>
      </div>
    )
  }

  console.log("[v0] Checkout page - Rendering EmbeddedCheckout component")

  return (
    <div className="min-h-screen bg-[#0d0c0b]">
      {/* Hero Image Section */}
      <div className="relative h-[30vh] sm:h-[35vh] md:h-[40vh] overflow-hidden">
        <Image
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/_%20%2846%29-ZphddrVpPQn5mS7BINYUlTMSac3s87.jpeg"
          fill
          alt="SSELFIE Checkout"
          className="object-cover object-center"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0d0c0b]/60 via-[#0d0c0b]/30 to-[#0d0c0b]" />

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
          <div className="font-['Cormorant_Garamond'] font-light text-xl sm:text-2xl md:text-3xl lg:text-4xl tracking-[0.3em] uppercase text-[#f0ede8] mb-3">
            {checkoutCopy.heroTitle}
          </div>
          <p className="text-sm sm:text-base text-[#c8c4bb] font-light">{checkoutCopy.heroBody}</p>
        </div>
      </div>

      {/* Checkout Form Section */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="text-center mb-6 sm:mb-8">
          <p className="font-['Inter'] font-medium text-[10px] uppercase tracking-[0.5em] text-[#8a8780] mb-3">Secure Checkout</p>
          <h1 className="font-['Cormorant_Garamond'] font-light text-xl sm:text-2xl md:text-3xl text-[#f0ede8] tracking-wide mb-3">
            {checkoutCopy.heading}
          </h1>
          <p className="text-xs sm:text-sm text-[#8a8780] font-light leading-relaxed max-w-xl mx-auto">
            {checkoutCopy.blurb}
          </p>
        </div>

        <div className="bg-[rgba(175,170,162,0.10)] backdrop-blur-[50px] border border-[rgba(195,190,182,0.25)] rounded-2xl p-4 sm:p-6 md:p-8">
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
          <p className="text-[10px] sm:text-xs text-[#8a8780] font-light leading-relaxed">
            Protected by Stripe · SSL Encrypted · PCI Compliant
          </p>
          <p className="text-[10px] sm:text-xs text-[#8a8780] font-light leading-relaxed mt-2">
            {checkoutCopy.footer}
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
        <div className="min-h-screen bg-[#0d0c0b] flex items-center justify-center p-4">
          <div className="text-center">
            <div className="font-['Cormorant_Garamond'] font-light text-xl sm:text-2xl tracking-[0.3em] uppercase text-[#f0ede8] mb-4">
              Loading your checkout
            </div>
            <p className="text-sm text-[#8a8780] font-light">Please wait a moment...</p>
          </div>
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  )
}
