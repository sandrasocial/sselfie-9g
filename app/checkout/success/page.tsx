"use client"

import type React from "react"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { getCheckoutSession } from "@/app/actions/landing-checkout"
import { createClient } from "@/lib/supabase/client"
import Image from "next/image"

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

      const supabase = createClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: session.customerEmail,
        password,
      })

      if (signInError) {
        setError("Account created but failed to sign in. Please try logging in.")
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
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="font-serif text-xl sm:text-2xl font-extralight tracking-[0.3em] uppercase text-stone-900 mb-4">
            LOADING
          </div>
          <div className="text-xs sm:text-sm text-stone-500 font-light">Just a moment...</div>
        </div>
      </div>
    )
  }

  if (!session || session.status !== "complete") {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-2xl text-center">
          <div className="font-serif text-3xl sm:text-4xl md:text-5xl font-extralight tracking-[0.3em] uppercase text-stone-900 mb-4 sm:mb-6">
            PAYMENT PENDING
          </div>
          <p className="text-sm sm:text-base text-stone-600 font-light leading-relaxed mb-6 sm:mb-8 px-4">
            Your payment is being processed. Check your email for confirmation.
          </p>
          <button
            onClick={() => router.push("/")}
            className="bg-stone-950 text-stone-50 px-6 sm:px-8 py-3 sm:py-4 rounded-lg text-xs sm:text-sm font-medium uppercase tracking-wider hover:bg-stone-800 transition-all duration-200 min-h-[44px]"
          >
            Return Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="relative h-[40vh] sm:h-[50vh] md:h-[60vh] overflow-hidden">
        <Image
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/_%20%2842%29-7c6UXso773x523qKCiuawGNpuzsx8n.jpeg"
          fill
          alt="Welcome to SSELFIE"
          className="object-cover object-center"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-stone-50" />

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
          <div className="font-serif text-xl sm:text-2xl md:text-3xl lg:text-4xl font-extralight tracking-[0.3em] uppercase text-white mb-3 sm:mb-4">
            S S E L F I E
          </div>
          <p className="text-sm sm:text-base md:text-lg text-white/90 font-light max-w-md">
            {isAuthenticated ? "Welcome back" : "You're in"}
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 md:py-16">
        {session.metadata?.source === "landing_page" && !isAuthenticated ? (
          <>
            <div className="text-center mb-8 sm:mb-12">
              <h1 className="font-serif text-xl sm:text-2xl md:text-3xl lg:text-4xl font-extralight tracking-[0.15em] sm:tracking-[0.2em] uppercase text-stone-900 mb-3 sm:mb-4 px-2">
                LET'S GET YOU STARTED
              </h1>
              <p className="text-sm sm:text-base text-stone-600 font-light leading-relaxed max-w-xl mx-auto px-4">
                Just a few quick details and you'll be creating your first AI photos. This takes less than a minute.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 sm:p-8 md:p-10 border border-stone-200 shadow-sm">
              <form onSubmit={handleCompleteAccount} className="space-y-5 sm:space-y-6">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-xs sm:text-sm text-stone-700 font-light tracking-wider uppercase mb-2"
                  >
                    Your Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full px-4 py-3 sm:py-4 bg-stone-50 border border-stone-200 rounded-lg focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900 transition-colors text-sm sm:text-base font-light"
                    placeholder="What should we call you?"
                  />
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="block text-xs sm:text-sm text-stone-700 font-light tracking-wider uppercase mb-2"
                  >
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={session.customerEmail}
                    disabled
                    className="w-full px-4 py-3 sm:py-4 bg-stone-100 border border-stone-200 rounded-lg text-stone-500 text-sm sm:text-base font-light"
                  />
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="block text-xs sm:text-sm text-stone-700 font-light tracking-wider uppercase mb-2"
                  >
                    Choose Password
                  </label>
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full px-4 py-3 sm:py-4 bg-stone-50 border border-stone-200 rounded-lg focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900 transition-colors text-sm sm:text-base font-light"
                    placeholder="At least 8 characters"
                  />
                </div>

                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="block text-xs sm:text-sm text-stone-700 font-light tracking-wider uppercase mb-2"
                  >
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full px-4 py-3 sm:py-4 bg-stone-50 border border-stone-200 rounded-lg focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900 transition-colors text-sm sm:text-base font-light"
                    placeholder="One more time"
                  />
                </div>

                {error && (
                  <div className="bg-stone-100 border border-stone-300 rounded-lg p-3 sm:p-4">
                    <p className="text-xs sm:text-sm text-stone-700 font-light">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-stone-950 text-stone-50 px-6 py-3 sm:py-4 rounded-lg text-xs sm:text-sm font-medium uppercase tracking-wider hover:bg-stone-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                >
                  {isSubmitting ? "SETTING UP..." : "LET'S GO"}
                </button>

                <p className="text-[10px] sm:text-xs text-stone-500 font-light text-center leading-relaxed">
                  By continuing, you agree to our Terms of Service and Privacy Policy
                </p>
              </form>
            </div>

            <div className="mt-6 sm:mt-8 text-center">
              <p className="text-xs sm:text-sm text-stone-600 font-light leading-relaxed">
                Check your email for your receipt and welcome message from Sandra 💋
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="text-center mb-8 sm:mb-12">
              <h1 className="font-serif text-xl sm:text-2xl md:text-3xl lg:text-4xl font-extralight tracking-[0.15em] sm:tracking-[0.2em] uppercase text-stone-900 mb-3 sm:mb-4 px-2">
                {isAuthenticated ? "YOU'RE ALL SET" : "ORDER CONFIRMED"}
              </h1>
              <p className="text-sm sm:text-base text-stone-600 font-light leading-relaxed max-w-xl mx-auto px-4">
                {isAuthenticated
                  ? "Your purchase is complete. Time to create something amazing."
                  : "Check your email for next steps."}
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 sm:p-8 md:p-10 border border-stone-200 shadow-sm mb-6 sm:mb-8">
              <h2 className="font-serif text-lg sm:text-xl font-extralight tracking-[0.2em] uppercase text-stone-900 mb-6 sm:mb-8">
                ORDER DETAILS
              </h2>
              <div className="space-y-4 sm:space-y-5">
                <div className="flex justify-between items-center pb-4 border-b border-stone-200">
                  <span className="text-xs sm:text-sm text-stone-500 font-light tracking-wider uppercase">Product</span>
                  <span className="text-sm sm:text-base text-stone-900 font-light">
                    {session.metadata?.product_type === "sselfie_studio_membership"
                      ? "Studio Membership"
                      : session.metadata?.product_type === "one_time_session"
                        ? "One-Time Session"
                        : session.metadata?.product_type === "credit_topup"
                          ? "Credit Top-Up"
                          : "Purchase"}
                  </span>
                </div>
                {session.metadata?.credits && Number(session.metadata.credits) > 0 && (
                  <div className="flex justify-between items-center pb-4 border-b border-stone-200">
                    <span className="text-xs sm:text-sm text-stone-500 font-light tracking-wider uppercase">
                      {session.metadata?.product_type === "sselfie_studio_membership"
                        ? "Monthly Credits"
                        : "Credits Included"}
                    </span>
                    <span className="text-sm sm:text-base text-stone-900 font-light">
                      {session.metadata?.credits} credits
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center pb-4 border-b border-stone-200">
                  <span className="text-xs sm:text-sm text-stone-500 font-light tracking-wider uppercase">Email</span>
                  <span className="text-sm sm:text-base text-stone-900 font-light">{session.customerEmail}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs sm:text-sm text-stone-500 font-light tracking-wider uppercase">Status</span>
                  <span className="text-sm sm:text-base text-stone-700 font-light">Active</span>
                </div>
              </div>
            </div>

            <div className="text-center">
              <button
                onClick={() => router.push("/studio")}
                className="bg-stone-950 text-stone-50 px-8 sm:px-12 py-3 sm:py-4 rounded-lg text-xs sm:text-sm font-medium uppercase tracking-wider hover:bg-stone-800 transition-all duration-200 min-h-[44px]"
              >
                Go to Studio
              </button>
              <p className="text-[10px] sm:text-xs text-stone-500 font-light mt-4 sm:mt-6">
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
        <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
          <div className="text-center">
            <div className="font-serif text-xl sm:text-2xl font-extralight tracking-[0.3em] uppercase text-stone-900 mb-4">
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
