"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { createLandingCheckoutSession } from "@/app/actions/landing-checkout"
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js"
import { loadStripe } from "@stripe/stripe-js"
import { ArrowLeft, Sparkles } from "lucide-react"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface OneTimeCheckoutClientProps {
  userEmail: string | null
  userName: string | null
  redirectAfterSuccess?: string
}

export default function OneTimeCheckoutClient({
  userEmail,
  userName,
  redirectAfterSuccess = "studio",
}: OneTimeCheckoutClientProps) {
  const router = useRouter()
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleStartCheckout = async () => {
    setIsLoading(true)
    try {
      const result = await createLandingCheckoutSession("one_time_session", redirectAfterSuccess)

      if (result.error) {
        console.error("[v0] Checkout error:", result.error)
        alert("Failed to start checkout. Please try again.")
        setIsLoading(false)
        return
      }

      if (result.clientSecret) {
        setClientSecret(result.clientSecret)
      }
    } catch (error) {
      console.error("[v0] Error starting checkout:", error)
      alert("Something went wrong. Please try again.")
      setIsLoading(false)
    }
  }

  if (clientSecret) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col">
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <div className="max-w-4xl mx-auto p-4 md:p-8">
            <EmbeddedCheckoutProvider stripe={stripePromise} options={{ clientSecret }}>
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8 md:p-12">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-stone-600 hover:text-stone-900 mb-6 transition-colors"
        >
          <ArrowLeft size={20} />
          <span className="text-sm">Back</span>
        </button>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-stone-100 rounded-full mb-4">
            <Sparkles className="w-8 h-8 text-stone-900" />
          </div>
          <h1 className="text-3xl md:text-4xl font-serif font-light mb-4">One-Time SSELFIE Session</h1>
          <p className="text-stone-600 text-lg mb-2">Professional AI Photoshoot</p>
          {userName && <p className="text-stone-500">Welcome back, {userName}!</p>}
        </div>

        <div className="bg-stone-50 rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <span className="text-lg font-medium text-stone-900">One-Time Session</span>
            <span className="text-3xl font-serif font-light text-stone-900">$49</span>
          </div>

          <ul className="space-y-3 text-stone-700">
            <li className="flex items-start gap-3">
              <span className="text-stone-900 mt-1">✓</span>
              <span>One AI model training</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-stone-900 mt-1">✓</span>
              <span>Generate up to 50 professional photos</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-stone-900 mt-1">✓</span>
              <span>Access to all photo styles and settings</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-stone-900 mt-1">✓</span>
              <span>Download high-resolution images</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-stone-900 mt-1">✓</span>
              <span>Valid for 30 days</span>
            </li>
          </ul>
        </div>

        <Button
          onClick={handleStartCheckout}
          disabled={isLoading}
          className="w-full bg-stone-900 hover:bg-stone-800 text-white py-6 text-lg rounded-xl transition-all active:scale-95 disabled:opacity-50"
        >
          {isLoading ? "Loading Checkout..." : "Continue to Checkout"}
        </Button>

        <p className="text-center text-stone-500 text-sm mt-6">Secure payment powered by Stripe</p>
      </div>
    </div>
  )
}
