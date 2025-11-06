"use client"

import type React from "react"

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
  const [name, setName] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

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

  const handleCompleteAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (password !== confirmPassword) {
      setError("Passwords don't match")
      return
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters")
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch("/api/complete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: session.customerEmail,
          password,
          name,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Failed to complete account")
        setIsSubmitting(false)
        return
      }

      window.location.href = "/studio"
    } catch (err) {
      setError("Something went wrong. Please try again.")
      setIsSubmitting(false)
    }
  }

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
            {isAuthenticated ? "WELCOME BACK" : "PAYMENT SUCCESSFUL"}
          </h1>
          <p className="text-lg text-stone-600 font-light leading-relaxed">
            {isAuthenticated
              ? "Your purchase is complete. Let's continue building your brand empire."
              : "Complete your account setup to access your studio."}
          </p>
        </div>

        {session.metadata?.source === "landing_page" && !isAuthenticated ? (
          <div className="bg-white border-2 border-stone-200 rounded-lg p-8 mb-8">
            <h2 className="font-serif text-2xl font-extralight tracking-[0.2em] uppercase text-stone-900 mb-6">
              COMPLETE YOUR ACCOUNT
            </h2>
            <form onSubmit={handleCompleteAccount} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm text-stone-700 font-medium mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-4 py-3 border-2 border-stone-200 rounded-lg focus:border-stone-900 focus:outline-none transition-colors"
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm text-stone-700 font-medium mb-2">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={session.customerEmail}
                  disabled
                  className="w-full px-4 py-3 border-2 border-stone-200 rounded-lg bg-stone-50 text-stone-500"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm text-stone-700 font-medium mb-2">
                  Choose Password
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full px-4 py-3 border-2 border-stone-200 rounded-lg focus:border-stone-900 focus:outline-none transition-colors"
                  placeholder="At least 8 characters"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm text-stone-700 font-medium mb-2">
                  Confirm Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full px-4 py-3 border-2 border-stone-200 rounded-lg focus:border-stone-900 focus:outline-none transition-colors"
                  placeholder="Re-enter your password"
                />
              </div>

              {error && (
                <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-stone-950 text-stone-50 px-8 py-4 rounded-lg text-sm font-medium uppercase tracking-wider hover:bg-stone-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "SETTING UP..." : "COMPLETE SETUP & ACCESS STUDIO"}
              </button>

              <p className="text-xs text-stone-500 font-light text-center">
                By completing setup, you agree to our Terms of Service and Privacy Policy
              </p>
            </form>
          </div>
        ) : (
          <>
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

            {/* CTA */}
            <div className="text-center">
              <button
                onClick={() => router.push("/studio")}
                className="bg-stone-950 text-stone-50 px-12 py-5 rounded-lg text-base font-medium uppercase tracking-wider hover:bg-stone-800 transition-all duration-200"
              >
                Go to Studio
              </button>
              <p className="text-xs text-stone-500 font-light mt-4">
                A confirmation email has been sent to {session.customerEmail}
              </p>
            </div>
          </>
        )}
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
