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
            {session.metadata?.source === "landing_page"
              ? "Your purchase is complete. Check your email to access your account."
              : "Your subscription is active. Let's build your brand empire."}
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
                  {isAuthenticated ? "Access Your Dashboard" : "Check Your Email"}
                </h3>
                <p className="text-sm text-stone-600 font-light">
                  {isAuthenticated
                    ? "Your dashboard is ready. Start creating your first photos."
                    : "We've sent you an email with a link to access your account. Click the link to get started."}
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
          {session.metadata?.source === "landing_page" && !isAuthenticated ? (
            <div className="space-y-4">
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
                <div className="flex items-start gap-3">
                  <svg
                    className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  <div className="text-left">
                    <h3 className="text-base text-blue-900 font-medium mb-1">Check Your Email</h3>
                    <p className="text-sm text-blue-700 font-light">
                      We've sent an access link to <span className="font-medium">{session.customerEmail}</span>. Click
                      the link to set up your password and access your account.
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => router.push("/")}
                className="bg-stone-200 text-stone-700 px-8 py-3 rounded-lg text-sm font-medium uppercase tracking-wider hover:bg-stone-300 transition-all duration-200"
              >
                Return Home
              </button>
              <p className="text-xs text-stone-500 font-light mt-4">
                Didn't receive the email? Check your spam folder or contact support at hello@sselfie.ai
              </p>
            </div>
          ) : isAuthenticated ? (
            <div className="space-y-4">
              <button
                onClick={() => router.push("/studio")}
                className="bg-stone-950 text-stone-50 px-12 py-5 rounded-lg text-base font-medium uppercase tracking-wider hover:bg-stone-800 transition-all duration-200"
              >
                Go to Dashboard
              </button>
              <p className="text-xs text-stone-500 font-light">Your account is ready to use</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
                <div className="flex items-start gap-3">
                  <svg
                    className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  <div className="text-left">
                    <h3 className="text-base text-blue-900 font-medium mb-1">Check Your Email</h3>
                    <p className="text-sm text-blue-700 font-light">
                      We've sent an access link to <span className="font-medium">{session.customerEmail}</span>. Click
                      the link to access your account instantly.
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => router.push("/")}
                className="bg-stone-200 text-stone-700 px-8 py-3 rounded-lg text-sm font-medium uppercase tracking-wider hover:bg-stone-300 transition-all duration-200"
              >
                Return Home
              </button>
              <p className="text-xs text-stone-500 font-light mt-4">
                Didn't receive the email? Check your spam folder or contact support
              </p>
            </div>
          )}
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
