"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { getCheckoutSession } from "@/app/actions/landing-checkout"
import { createClient } from "@/lib/supabase/client"

function SuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setIsAuthenticated(!!user)
    }
    checkAuth()
  }, [])

  useEffect(() => {
    const sessionId = searchParams.get("session_id")
    if (sessionId) {
      getCheckoutSession(sessionId).then((data) => {
        setSession(data)
        setLoading(false)
      })
    } else {
      setLoading(false)
    }
  }, [searchParams])

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center">
          <div className="font-serif text-2xl font-extralight tracking-[0.3em] uppercase text-stone-900 mb-4">
            PROCESSING
          </div>
          <div className="text-sm text-stone-500 font-light">Please wait...</div>
        </div>
      </div>
    )
  }

  if (!session || session.status !== "complete") {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
        <div className="max-w-2xl text-center">
          <div className="font-serif text-4xl md:text-6xl font-extralight tracking-[0.3em] uppercase text-stone-900 mb-6">
            PAYMENT PENDING
          </div>
          <p className="text-base text-stone-600 font-light leading-relaxed mb-8">
            Your payment is being processed. Please check your email for confirmation.
          </p>
          <button
            onClick={() => router.push("/")}
            className="bg-stone-950 text-stone-50 px-8 py-4 rounded-lg text-sm font-medium uppercase tracking-wider hover:bg-stone-800 transition-all duration-200"
          >
            Return Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
      <div className="max-w-3xl w-full">
        {/* Success Header */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="font-serif text-4xl md:text-6xl font-extralight tracking-[0.3em] uppercase text-stone-900 mb-4">
            WELCOME TO SSELFIE
          </h1>
          <p className="text-lg text-stone-600 font-light leading-relaxed">
            Your subscription is active. Let's build your brand empire.
          </p>
        </div>

        {/* Order Details */}
        <div className="bg-white border-2 border-stone-200 rounded-lg p-8 mb-8">
          <h2 className="font-serif text-2xl font-extralight tracking-[0.2em] uppercase text-stone-900 mb-6">
            ORDER DETAILS
          </h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-4 border-b border-stone-200">
              <span className="text-sm text-stone-500 font-light tracking-wider uppercase">Product</span>
              <span className="text-base text-stone-900 font-medium">
                {session.metadata?.product_type === "sselfie_studio_membership"
                  ? "STUDIO MEMBERSHIP"
                  : session.metadata?.product_type === "one_time_session"
                    ? "ONE-TIME SESSION"
                    : session.metadata?.product_type === "credit_topup"
                      ? "CREDIT TOP-UP"
                      : "PURCHASE"}
              </span>
            </div>
            {session.metadata?.credits && Number(session.metadata.credits) > 0 && (
              <div className="flex justify-between items-center pb-4 border-b border-stone-200">
                <span className="text-sm text-stone-500 font-light tracking-wider uppercase">
                  {session.metadata?.product_type === "sselfie_studio_membership"
                    ? "Monthly Credits"
                    : "Credits Included"}
                </span>
                <span className="text-base text-stone-900 font-medium">{session.metadata?.credits} credits</span>
              </div>
            )}
            <div className="flex justify-between items-center pb-4 border-b border-stone-200">
              <span className="text-sm text-stone-500 font-light tracking-wider uppercase">Email</span>
              <span className="text-base text-stone-900 font-medium">{session.customerEmail}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-stone-500 font-light tracking-wider uppercase">Status</span>
              <span className="text-base text-green-600 font-medium">ACTIVE</span>
            </div>
          </div>
        </div>

        {/* Next Steps */}
        <div className="bg-stone-100 rounded-lg p-8 mb-8">
          <h2 className="font-serif text-2xl font-extralight tracking-[0.2em] uppercase text-stone-900 mb-6">
            NEXT STEPS
          </h2>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-stone-900 text-stone-50 rounded-full flex items-center justify-center text-sm font-medium">
                1
              </div>
              <div>
                <h3 className="text-base text-stone-900 font-medium mb-1">
                  {isAuthenticated ? "Access Your Dashboard" : "Create Your Account"}
                </h3>
                <p className="text-sm text-stone-600 font-light">
                  {isAuthenticated
                    ? "Your dashboard is ready. Start creating your first photos."
                    : "Check your email to set up your account and access your subscription."}
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-stone-900 text-stone-50 rounded-full flex items-center justify-center text-sm font-medium">
                2
              </div>
              <div>
                <h3 className="text-base text-stone-900 font-medium mb-1">Upload Your Selfies</h3>
                <p className="text-sm text-stone-600 font-light">
                  Train your AI model with 10-20 selfies to get started.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-stone-900 text-stone-50 rounded-full flex items-center justify-center text-sm font-medium">
                3
              </div>
              <div>
                <h3 className="text-base text-stone-900 font-medium mb-1">Meet Maya</h3>
                <p className="text-sm text-stone-600 font-light">
                  Your AI strategist will guide you through creating your first professional photos.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <button
            onClick={() => router.push(isAuthenticated ? "/" : "/auth/sign-up")}
            className="bg-stone-950 text-stone-50 px-12 py-5 rounded-lg text-base font-medium uppercase tracking-wider hover:bg-stone-800 transition-all duration-200"
          >
            {isAuthenticated ? "Go to Dashboard" : "Create Account"}
          </button>
          <p className="text-xs text-stone-500 font-light mt-4">
            A confirmation email has been sent to {session.customerEmail}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-stone-50 flex items-center justify-center">
          <div className="text-center">
            <div className="font-serif text-2xl font-extralight tracking-[0.3em] uppercase text-stone-900 mb-4">
              LOADING
            </div>
          </div>
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  )
}
