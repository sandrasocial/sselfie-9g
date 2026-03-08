"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import LoadingSpinner from "@/components/sselfie/loading-spinner"
import { sanitizeRedirect } from "@/lib/security/url-validator"

interface SuccessContentProps {
  initialUserInfo: any
  initialEmail?: string
  purchaseType?: string
  returnTo?: string
}

export function SuccessContent({ initialUserInfo, initialEmail, purchaseType, returnTo }: SuccessContentProps) {
  const router = useRouter()
  const [userInfo, setUserInfo] = useState(initialUserInfo)
  const isBrandEnginePurchase = String(purchaseType || "").startsWith("brand_engine_")
  const isSelfieGuidePurchase = purchaseType === "selfie_guide" || purchaseType === "selfie_guide_bundle"
  const resolvedReturnTo = sanitizeRedirect(returnTo || null, "/brand-strategy")
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [name, setName] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  // Decision 2: Removed access token state - no longer needed for authenticated users

  useEffect(() => {
    // Decision 2: Paid blueprint now uses same flow as other products
    // User info polling is only needed for unauthenticated users (account creation)

    if (initialEmail && !isBrandEnginePurchase) {
      let attempts = 0
      const MAX_ATTEMPTS = 40 // Increased to 80 seconds total

      console.log("[v0] Starting user info polling for email:", initialEmail)

      const pollInterval = setInterval(async () => {
        attempts++
        console.log(`[v0] Polling attempt ${attempts}/${MAX_ATTEMPTS}`)

        try {
          const response = await fetch(`/api/user-by-email?email=${encodeURIComponent(initialEmail)}`)

          if (!response.ok) {
            console.error(`[v0] API returned ${response.status}`)
            throw new Error(`API returned ${response.status}`)
          }

          const data = await response.json()
          console.log("[v0] Poll response:", data)

          if (data.userInfo) {
            console.log("[v0] User info found, setting state:", data.userInfo)
            setUserInfo(data.userInfo)
            clearInterval(pollInterval)
          } else if (attempts >= MAX_ATTEMPTS) {
            console.log("[v0] Max attempts reached, showing default state")
            setUserInfo({ email: initialEmail, hasAccount: false })
            clearInterval(pollInterval)
          }
        } catch (err) {
          console.error("[v0] Polling error:", err)
          if (attempts >= MAX_ATTEMPTS) {
            console.log("[v0] Max attempts reached after error, showing default state")
            setUserInfo({ email: initialEmail, hasAccount: false })
            clearInterval(pollInterval)
          }
        }
      }, 2000) // Poll every 2 seconds

      return () => {
        clearInterval(pollInterval)
      }
    }
  }, [initialEmail, isBrandEnginePurchase, purchaseType])

  // FIX 3: Poll access status before redirecting (wait for webhook to complete)
  const [isPollingAccess, setIsPollingAccess] = useState(false)
  const [pollAttempts, setPollAttempts] = useState(0)
  const MAX_POLL_ATTEMPTS = 60 // 60 attempts × 2s = 120s timeout
  const [pollingMessage, setPollingMessage] = useState("Processing your payment. This can take up to 2 minutes.")
  const [timeRemaining, setTimeRemaining] = useState(120)
  const [showTimeoutActions, setShowTimeoutActions] = useState(false)
  const [isPollingSelfieGuideAccess, setIsPollingSelfieGuideAccess] = useState(false)
  const [selfieGuidePollAttempts, setSelfieGuidePollAttempts] = useState(0)
  const [selfieGuideStatus, setSelfieGuideStatus] = useState("Preparing your guide. This can take up to 2 minutes.")
  const [showSelfieGuideTimeout, setShowSelfieGuideTimeout] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setIsAuthenticated(!!user)

      // For credit topup, redirect immediately (no webhook dependency)
      if (user && purchaseType === "credit_topup") {
        setTimeout(() => {
          router.push("/studio?tab=feed-planner")
        }, 2000)
        return
      }

      if (purchaseType === "brand_strategy_pack") {
        if (user) {
          setTimeout(() => {
            router.push(resolvedReturnTo)
          }, 800)
        } else {
          router.push(`/auth/login?returnTo=${encodeURIComponent(resolvedReturnTo)}`)
        }
        return
      }

      if (user && isSelfieGuidePurchase) {
        setIsPollingSelfieGuideAccess(true)
        setSelfieGuidePollAttempts(0)
        return
      }

      // For paid blueprint, poll access status until webhook completes
      if (user && purchaseType === "paid_blueprint") {
        setIsPollingAccess(true)
        setPollAttempts(0)
      }
    }
    checkAuth()
  }, [isSelfieGuidePurchase, purchaseType, resolvedReturnTo, router])

  useEffect(() => {
    if (!isPollingSelfieGuideAccess || !isAuthenticated || !isSelfieGuidePurchase) {
      return
    }

    const pollGuideAccess = async () => {
      try {
        const response = await fetch("/api/selfie-guide/access-token", { cache: "no-store" })
        const data = await response.json()

        if (response.ok && data.accessToken) {
          setIsPollingSelfieGuideAccess(false)
          setSelfieGuideStatus("Guide ready. Opening now...")
          setTimeout(() => {
            router.push(`/selfie-guide/access/${encodeURIComponent(data.accessToken)}`)
          }, 400)
          return
        }

        setSelfieGuidePollAttempts((prev) => {
          const next = prev + 1

          if (next < 20) {
            setSelfieGuideStatus("Preparing your guide. This can take up to 2 minutes.")
          } else if (next < 40) {
            setSelfieGuideStatus("Payment confirmed. Finalizing your guide access...")
          } else {
            setSelfieGuideStatus("Almost there. Your guide link is still syncing.")
          }

          if (next >= MAX_POLL_ATTEMPTS) {
            setIsPollingSelfieGuideAccess(false)
            setShowSelfieGuideTimeout(true)
          }

          return next
        })
      } catch (error) {
        console.error("[SUCCESS PAGE] Selfie guide polling error:", error)
        setSelfieGuidePollAttempts((prev) => {
          const next = prev + 1
          if (next >= MAX_POLL_ATTEMPTS) {
            setIsPollingSelfieGuideAccess(false)
            setShowSelfieGuideTimeout(true)
          }
          return next
        })
      }
    }

    const interval = setInterval(pollGuideAccess, 2000)
    pollGuideAccess()

    return () => clearInterval(interval)
  }, [isAuthenticated, isPollingSelfieGuideAccess, isSelfieGuidePurchase, router])

  // Poll access status for paid blueprint purchases
  useEffect(() => {
    if (!isPollingAccess || !isAuthenticated || purchaseType !== "paid_blueprint") {
      return
    }

    const pollAccessStatus = async () => {
      try {
        const response = await fetch('/api/feed-planner/access')
        const data = await response.json()

        console.log('[SUCCESS PAGE] Polling access:', {
          attempt: pollAttempts + 1,
          isPaidBlueprint: data.isPaidBlueprint,
        })

        if (data.isPaidBlueprint) {
          // Webhook completed! Redirect to Feed Planner
          console.log('[SUCCESS PAGE] Paid access confirmed, redirecting to feed planner...')
          setIsPollingAccess(false)
          setPollingMessage("Access granted! Redirecting...")
          setTimeout(() => {
            router.push('/feed-planner?purchase=success')
          }, 500)
        } else {
          // Webhook not done yet, continue polling
          setPollAttempts((prev) => {
            const newAttempts = prev + 1
            
            // Update message based on progress (using new attempt count)
            const remaining = 120 - (newAttempts * 2)
            setTimeRemaining(Math.max(0, remaining))

            if (newAttempts < 20) {
              setPollingMessage("Processing your payment. This can take up to 2 minutes.")
            } else if (newAttempts < 40) {
              setPollingMessage("Payment confirmed. Granting access now...")
            } else {
              setPollingMessage("Finalizing access. Almost there...")
            }

            if (newAttempts >= MAX_POLL_ATTEMPTS) {
              // Timeout - show manual actions
              console.log('[SUCCESS PAGE] Polling timeout after 120 seconds')
              setIsPollingAccess(false)
              setShowTimeoutActions(true)
              setPollingMessage("Payment confirmed. Access is still syncing.")
            }
            
            return newAttempts
          })
        }
      } catch (error) {
        console.error('[SUCCESS PAGE] Polling error:', error)
        setPollAttempts((prev) => {
          const newAttempts = prev + 1
          
          // Update message based on progress
          const remaining = 120 - (newAttempts * 2)
          setTimeRemaining(Math.max(0, remaining))

          if (newAttempts >= MAX_POLL_ATTEMPTS) {
            setIsPollingAccess(false)
            setShowTimeoutActions(true)
            setPollingMessage("Payment confirmed. Access is still syncing.")
          }
          
          return newAttempts
        })
      }
    }

    // Poll every 2 seconds
    const interval = setInterval(pollAccessStatus, 2000)

    // Initial poll immediately
    pollAccessStatus()

    return () => clearInterval(interval)
  }, [isPollingAccess, isAuthenticated, purchaseType, pollAttempts, router, initialEmail, userInfo])

  if (isPollingSelfieGuideAccess && isSelfieGuidePurchase) {
    return (
      <div className="min-h-screen bg-[#0d0c0b] flex flex-col items-center justify-center min-h-[400px] space-y-4 p-4">
        <LoadingSpinner size="lg" />
        <p className="text-lg font-medium text-[#f0ede8]">{selfieGuideStatus}</p>
        <p className="text-sm text-[#8a8780]">
          Estimated time remaining: {Math.max(0, 120 - (selfieGuidePollAttempts * 2))}s
        </p>
        <div className="w-64 bg-[rgba(175,170,162,0.20)] rounded-full h-2">
          <div
            className="bg-[#c8c4bb] h-2 rounded-full transition-all duration-1000"
            style={{ width: `${(selfieGuidePollAttempts / MAX_POLL_ATTEMPTS) * 100}%` }}
          />
        </div>
      </div>
    )
  }

  if (showSelfieGuideTimeout && isSelfieGuidePurchase) {
    return (
      <div className="min-h-screen bg-[#0d0c0b] flex flex-col items-center justify-center space-y-6 p-6">
        <div className="bg-[rgba(175,170,162,0.10)] backdrop-blur-[50px] border border-[rgba(195,190,182,0.25)] rounded-2xl p-8 max-w-md w-full text-center space-y-4">
          <h2 className="font-['Cormorant_Garamond'] font-light text-3xl text-[#f0ede8]">
            Your guide is on the way
          </h2>
          <p className="text-[#8a8780] max-w-md">
            Payment went through. Your guide link is still syncing, and the email with your guide and preset pack is on
            the way.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            onClick={() => window.location.reload()}
            variant="default"
            className="bg-[#c8c4bb] text-[#0d0c0b] font-medium tracking-[0.15em] uppercase text-xs px-6 py-3 rounded-full hover:bg-[#f0ede8] transition-colors"
          >
            Refresh Status
          </Button>
          <Button
            onClick={() => router.push("/selfie-guide")}
            variant="outline"
            className="border-[rgba(195,190,182,0.25)] text-[#f0ede8] tracking-[0.15em] uppercase text-xs px-6 py-3 rounded-full hover:bg-[rgba(175,170,162,0.10)] transition-colors"
          >
            Back to Selfie Guide
          </Button>
        </div>
      </div>
    )
  }

  // Decision 2: Removed access token polling - authenticated users redirect via checkAuth
  // Unauthenticated users will see account creation form (same as one-time session)

  // Show polling status
  if (isPollingAccess && purchaseType === "paid_blueprint") {
    return (
      <div className="min-h-screen bg-[#0d0c0b] flex flex-col items-center justify-center min-h-[400px] space-y-4 p-4">
        <LoadingSpinner size="lg" />
        <p className="text-lg font-medium text-[#f0ede8]">{pollingMessage}</p>
        <p className="text-sm text-[#8a8780]">
          {timeRemaining > 0 ? `Estimated time remaining: ${timeRemaining}s` : "Please wait..."}
        </p>
        <div className="w-64 bg-[rgba(175,170,162,0.20)] rounded-full h-2">
          <div
            className="bg-[#c8c4bb] h-2 rounded-full transition-all duration-1000"
            style={{ width: `${(pollAttempts / MAX_POLL_ATTEMPTS) * 100}%` }}
          />
        </div>
      </div>
    )
  }

  // Show timeout actions
  if (showTimeoutActions && purchaseType === "paid_blueprint") {
    return (
      <div className="min-h-screen bg-[#0d0c0b] flex flex-col items-center justify-center space-y-6 p-6">
        <div className="bg-[rgba(175,170,162,0.10)] backdrop-blur-[50px] border border-[rgba(195,190,182,0.25)] rounded-2xl p-8 max-w-md w-full text-center space-y-4">
          <h2 className="font-['Cormorant_Garamond'] font-light text-3xl text-[#f0ede8]">
            Payment Processing
          </h2>
          <p className="text-[#8a8780] max-w-md">
            Your payment was successful. Access is syncing and should complete within a few minutes.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            onClick={() => window.location.reload()}
            variant="default"
            className="bg-[#c8c4bb] text-[#0d0c0b] font-medium tracking-[0.15em] uppercase text-xs px-6 py-3 rounded-full hover:bg-[#f0ede8] transition-colors"
          >
            Refresh Status
          </Button>
          <Button
            onClick={() => router.push('/feed-planner?purchase=success')}
            variant="outline"
            className="border-[rgba(195,190,182,0.25)] text-[#f0ede8] tracking-[0.15em] uppercase text-xs px-6 py-3 rounded-full hover:bg-[rgba(175,170,162,0.10)] transition-colors"
          >
            Continue to Feed Planner
          </Button>
        </div>
        <p className="text-sm text-[#8a8780]">
          If access is not available after 5 minutes, please{" "}
          <a href="mailto:support@sselfie.ai" className="underline text-[#a8a49c] hover:text-[#f0ede8]">
            contact support
          </a>
        </p>
      </div>
    )
  }

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
          email: userInfo.email || initialEmail,
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
        email: userInfo.email || initialEmail,
        password,
      })

      if (signInError) {
        setError("Account created but failed to sign in. Please try logging in.")
        setIsSubmitting(false)
        return
      }

      window.location.href = "/maya"
    } catch (err) {
      setError("Something went wrong. Please try again.")
      setIsSubmitting(false)
    }
  }

  if (purchaseType === "credit_topup") {
    return (
      <div className="min-h-screen bg-[#0d0c0b]">
        <div className="relative h-[40vh] sm:h-[50vh] overflow-hidden">
          <Image
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/_%20%2842%29-7c6UXso773x523qKCiuawGNpuzsx8n.jpeg"
            fill
            alt="Credits Added"
            className="object-cover object-center"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0d0c0b]/60 via-[#0d0c0b]/30 to-[#0d0c0b]" />

          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
            <div className="font-['Cormorant_Garamond'] font-light text-xl sm:text-2xl md:text-3xl lg:text-4xl tracking-[0.3em] sm:tracking-[0.2em] uppercase text-[#f0ede8] mb-3 sm:mb-4">
              CREDITS ADDED
            </div>
            <p className="text-sm sm:text-base md:text-lg text-[#c8c4bb] font-light max-w-md">
              Your credits are ready to use
            </p>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 md:py-16">
          <div className="text-center mb-8 sm:mb-12">
            <h1 className="font-['Cormorant_Garamond'] font-light text-xl sm:text-2xl md:text-3xl lg:text-4xl tracking-[0.15em] sm:tracking-[0.2em] uppercase text-[#f0ede8] mb-3 sm:mb-4 px-2">
              ALL SET
            </h1>
            <p className="text-sm sm:text-base text-[#8a8780] font-light leading-relaxed max-w-xl mx-auto px-4">
              Your credits have been added to your account. Redirecting you back to the studio...
            </p>
          </div>

          <div className="text-center">
            <button
              onClick={() => router.push("/studio?tab=feed-planner")}
              className="bg-[#c8c4bb] text-[#0d0c0b] font-medium tracking-[0.15em] uppercase text-xs px-8 sm:px-12 py-3 sm:py-4 rounded-full hover:bg-[#f0ede8] transition-colors min-h-[44px]"
            >
              Back to Studio
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (isBrandEnginePurchase) {
    return (
      <div className="min-h-screen bg-[#0d0c0b]">
        <div className="relative h-[40vh] sm:h-[50vh] overflow-hidden">
          <Image
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/_%20%2842%29-7c6UXso773x523qKCiuawGNpuzsx8n.jpeg"
            fill
            alt="Brand Engine Confirmation"
            className="object-cover object-center"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0d0c0b]/60 via-[#0d0c0b]/30 to-[#0d0c0b]" />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
            <div className="font-['Cormorant_Garamond'] font-light text-xl sm:text-2xl md:text-3xl lg:text-4xl tracking-[0.3em] uppercase text-[#f0ede8] mb-3">
              PAYMENT CONFIRMED
            </div>
            <p className="text-sm sm:text-base text-[#c8c4bb] font-light max-w-md">
              You&apos;re confirmed for Brand Engine.
            </p>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 md:py-16 text-center">
          <h1 className="font-['Cormorant_Garamond'] font-light text-xl sm:text-2xl md:text-3xl lg:text-4xl tracking-[0.15em] sm:tracking-[0.2em] uppercase text-[#f0ede8] mb-4">
            YOU&apos;RE IN
          </h1>
          <p className="text-sm sm:text-base text-[#8a8780] font-light leading-relaxed max-w-xl mx-auto mb-8">
            We&apos;ve received your payment. You&apos;ll get onboarding details by email soon.
          </p>
          <button
            onClick={() => router.push("/brand-engine")}
            className="bg-[#c8c4bb] text-[#0d0c0b] font-medium tracking-[0.15em] uppercase text-xs px-8 sm:px-12 py-3 sm:py-4 rounded-full hover:bg-[#f0ede8] transition-colors min-h-[44px]"
          >
            Back to Brand Engine
          </button>
        </div>
      </div>
    )
  }

  // Fix #1: Paid blueprint now uses same flow as other products
  // Authenticated users auto-redirect (via checkAuth useEffect)
  // Unauthenticated users see account creation form below

  if (!userInfo && initialEmail) {
    return (
      <div className="min-h-screen bg-[#0d0c0b] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="font-['Cormorant_Garamond'] font-light text-xl sm:text-2xl tracking-[0.3em] sm:tracking-[0.2em] uppercase text-[#f0ede8] mb-4 animate-pulse">
            PREPARING YOUR ACCOUNT
          </div>
          <div className="text-xs sm:text-sm text-[#8a8780] font-light">Setting everything up for you...</div>
        </div>
      </div>
    )
  }

  if (!userInfo && !initialEmail) {
    return (
      <div className="min-h-screen bg-[#0d0c0b] flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-2xl text-center">
          <div className="font-['Cormorant_Garamond'] font-light text-3xl sm:text-4xl md:text-5xl lg:text-4xl tracking-[0.3em] sm:tracking-[0.2em] uppercase text-[#f0ede8] mb-4 sm:mb-6">
            PAYMENT PENDING
          </div>
          <p className="text-sm sm:text-base text-[#8a8780] font-light leading-relaxed mb-6 sm:mb-8 px-4">
            Your payment is being processed. Check your email for confirmation.
          </p>
          <button
            onClick={() => router.push("/")}
            className="bg-[#c8c4bb] text-[#0d0c0b] font-medium tracking-[0.15em] uppercase text-xs px-6 sm:px-8 py-3 sm:py-4 rounded-full hover:bg-[#f0ede8] transition-colors min-h-[44px]"
          >
            Return Home
          </button>
        </div>
      </div>
    )
  }

  if (userInfo && !userInfo.hasAccount && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0d0c0b]">
        <div className="relative h-[40vh] sm:h-[50vh] md:h-[60vh] overflow-hidden">
          <Image
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/_%20%2842%29-7c6UXso773x523qKCiuawGNpuzsx8n.jpeg"
            fill
            alt="Welcome to SSELFIE"
            className="object-cover object-center"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0d0c0b]/60 via-[#0d0c0b]/30 to-[#0d0c0b]" />

          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
            <div className="font-['Cormorant_Garamond'] font-light text-xl sm:text-2xl md:text-3xl lg:text-4xl tracking-[0.3em] sm:tracking-[0.2em] uppercase text-[#f0ede8] mb-3 sm:mb-4">
              S S E L F I E
            </div>
            <p className="text-sm sm:text-base md:text-lg text-[#c8c4bb] font-light max-w-md">You&apos;re in</p>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 md:py-16">
          <div className="text-center mb-8 sm:mb-12">
            <h1 className="font-['Cormorant_Garamond'] font-light text-xl sm:text-2xl md:text-3xl lg:text-4xl tracking-[0.15em] sm:tracking-[0.2em] uppercase text-[#f0ede8] mb-3 sm:mb-4 px-2">
              LET&apos;S GET YOU STARTED
            </h1>
            <p className="text-sm sm:text-base text-[#8a8780] font-light leading-relaxed max-w-xl mx-auto px-4">
              Just a few quick details and you&apos;ll be creating your first AI photos. This takes less than a minute.
            </p>
          </div>

          <div className="bg-[rgba(175,170,162,0.10)] backdrop-blur-[50px] border border-[rgba(195,190,182,0.25)] rounded-2xl p-6 sm:p-8 md:p-10">
            <form onSubmit={handleCompleteAccount} className="space-y-5 sm:space-y-6">
              <div>
                <label
                  htmlFor="name"
                  className="block text-xs sm:text-sm text-[#8a8780] font-light tracking-[0.3em] uppercase mb-2"
                >
                  Your Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-4 py-3 sm:py-4 bg-[rgba(175,170,162,0.10)] border border-[rgba(195,190,182,0.25)] rounded-xl focus:border-[#a8a49c] focus:outline-none transition-colors text-sm sm:text-base text-[#f0ede8] font-light placeholder:text-[#8a8780]"
                  placeholder="What should we call you?"
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-xs sm:text-sm text-[#8a8780] font-light tracking-[0.3em] uppercase mb-2"
                >
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={userInfo.email || initialEmail}
                  disabled
                  className="w-full px-4 py-3 sm:py-4 bg-[rgba(175,170,162,0.06)] border border-[rgba(195,190,182,0.15)] rounded-xl text-[#8a8780] text-sm sm:text-base font-light"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-xs sm:text-sm text-[#8a8780] font-light tracking-[0.3em] uppercase mb-2"
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
                  className="w-full px-4 py-3 sm:py-4 bg-[rgba(175,170,162,0.10)] border border-[rgba(195,190,182,0.25)] rounded-xl focus:border-[#a8a49c] focus:outline-none transition-colors text-sm sm:text-base text-[#f0ede8] font-light placeholder:text-[#8a8780]"
                  placeholder="At least 8 characters"
                />
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-xs sm:text-sm text-[#8a8780] font-light tracking-[0.3em] uppercase mb-2"
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
                  className="w-full px-4 py-3 sm:py-4 bg-[rgba(175,170,162,0.10)] border border-[rgba(195,190,182,0.25)] rounded-xl focus:border-[#a8a49c] focus:outline-none transition-colors text-sm sm:text-base text-[#f0ede8] font-light placeholder:text-[#8a8780]"
                  placeholder="One more time"
                />
              </div>

              {error && (
                <div className="bg-[rgba(175,170,162,0.10)] border border-[rgba(195,190,182,0.25)] rounded-xl p-3 sm:p-4">
                  <p className="text-xs sm:text-sm text-[#f0ede8] font-light">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#c8c4bb] text-[#0d0c0b] font-medium tracking-[0.15em] uppercase text-xs px-6 py-3 sm:py-4 rounded-full hover:bg-[#f0ede8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
              >
                {isSubmitting ? "SETTING UP..." : "LET'S GO"}
              </button>

              <p className="text-[10px] sm:text-xs text-[#8a8780] font-light text-center leading-relaxed">
                By continuing, you agree to our Terms of Service and Privacy Policy
              </p>
            </form>
          </div>

          <div className="mt-6 sm:mt-8 text-center">
            <p className="text-xs sm:text-sm text-[#8a8780] font-light leading-relaxed">
              Check your email for your receipt and welcome message from Sandra
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0d0c0b]">
      <div className="relative h-[40vh] sm:h-[50vh] md:h-[60vh] overflow-hidden">
        <Image
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/_%20%2842%29-7c6UXso773x523qKCiuawGNpuzsx8n.jpeg"
          fill
          alt="Welcome to SSELFIE"
          className="object-cover object-center"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0d0c0b]/60 via-[#0d0c0b]/30 to-[#0d0c0b]" />

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
          <div className="font-['Cormorant_Garamond'] font-light text-xl sm:text-2xl md:text-3xl lg:text-4xl tracking-[0.3em] sm:tracking-[0.2em] uppercase text-[#f0ede8] mb-3 sm:mb-4">
            S S E L F I E
          </div>
          <p className="text-sm sm:text-base md:text-lg text-[#c8c4bb] font-light max-w-md">
            {isAuthenticated ? "Welcome back" : "You're in"}
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 md:py-16">
        {!userInfo.hasAccount && !isAuthenticated ? (
          <>
            <div className="text-center mb-8 sm:mb-12">
              <h1 className="font-['Cormorant_Garamond'] font-light text-xl sm:text-2xl md:text-3xl lg:text-4xl tracking-[0.15em] sm:tracking-[0.2em] uppercase text-[#f0ede8] mb-3 sm:mb-4 px-2">
                LET&apos;S GET YOU STARTED
              </h1>
              <p className="text-sm sm:text-base text-[#8a8780] font-light leading-relaxed max-w-xl mx-auto px-4">
                Just a few quick details and you&apos;ll be creating your first AI photos. This takes less than a minute.
              </p>
            </div>

            <div className="bg-[rgba(175,170,162,0.10)] backdrop-blur-[50px] border border-[rgba(195,190,182,0.25)] rounded-2xl p-6 sm:p-8 md:p-10">
              <form onSubmit={handleCompleteAccount} className="space-y-5 sm:space-y-6">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-xs sm:text-sm text-[#8a8780] font-light tracking-[0.3em] uppercase mb-2"
                  >
                    Your Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full px-4 py-3 sm:py-4 bg-[rgba(175,170,162,0.10)] border border-[rgba(195,190,182,0.25)] rounded-xl focus:border-[#a8a49c] focus:outline-none transition-colors text-sm sm:text-base text-[#f0ede8] font-light placeholder:text-[#8a8780]"
                    placeholder="What should we call you?"
                  />
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="block text-xs sm:text-sm text-[#8a8780] font-light tracking-[0.3em] uppercase mb-2"
                  >
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={userInfo.email || initialEmail}
                    disabled
                    className="w-full px-4 py-3 sm:py-4 bg-[rgba(175,170,162,0.06)] border border-[rgba(195,190,182,0.15)] rounded-xl text-[#8a8780] text-sm sm:text-base font-light"
                  />
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="block text-xs sm:text-sm text-[#8a8780] font-light tracking-[0.3em] uppercase mb-2"
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
                    className="w-full px-4 py-3 sm:py-4 bg-[rgba(175,170,162,0.10)] border border-[rgba(195,190,182,0.25)] rounded-xl focus:border-[#a8a49c] focus:outline-none transition-colors text-sm sm:text-base text-[#f0ede8] font-light placeholder:text-[#8a8780]"
                    placeholder="At least 8 characters"
                  />
                </div>

                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="block text-xs sm:text-sm text-[#8a8780] font-light tracking-[0.3em] uppercase mb-2"
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
                    className="w-full px-4 py-3 sm:py-4 bg-[rgba(175,170,162,0.10)] border border-[rgba(195,190,182,0.25)] rounded-xl focus:border-[#a8a49c] focus:outline-none transition-colors text-sm sm:text-base text-[#f0ede8] font-light placeholder:text-[#8a8780]"
                    placeholder="One more time"
                  />
                </div>

                {error && (
                  <div className="bg-[rgba(175,170,162,0.10)] border border-[rgba(195,190,182,0.25)] rounded-xl p-3 sm:p-4">
                    <p className="text-xs sm:text-sm text-[#f0ede8] font-light">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#c8c4bb] text-[#0d0c0b] font-medium tracking-[0.15em] uppercase text-xs px-6 py-3 sm:py-4 rounded-full hover:bg-[#f0ede8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                >
                  {isSubmitting ? "SETTING UP..." : "LET'S GO"}
                </button>

                <p className="text-[10px] sm:text-xs text-[#8a8780] font-light text-center leading-relaxed">
                  By continuing, you agree to our Terms of Service and Privacy Policy
                </p>
              </form>
            </div>

            <div className="mt-6 sm:mt-8 text-center">
              <p className="text-xs sm:text-sm text-[#8a8780] font-light leading-relaxed">
                Check your email for your receipt and welcome message from Sandra
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="text-center mb-8 sm:mb-12">
              <h1 className="font-['Cormorant_Garamond'] font-light text-xl sm:text-2xl md:text-3xl lg:text-4xl tracking-[0.15em] sm:tracking-[0.2em] uppercase text-[#f0ede8] mb-3 sm:mb-4 px-2">
                {isAuthenticated ? "YOU'RE ALL SET" : "ORDER CONFIRMED"}
              </h1>
              <p className="text-sm sm:text-base text-[#8a8780] font-light leading-relaxed max-w-xl mx-auto px-4">
                {isPollingAccess
                  ? `Setting up your paid access... (${pollAttempts + 1}/${MAX_POLL_ATTEMPTS})`
                  : isAuthenticated
                  ? "Your purchase is complete. Time to create something amazing."
                  : "Check your email for next steps."}
              </p>
            </div>

            <div className="bg-[rgba(175,170,162,0.10)] backdrop-blur-[50px] border border-[rgba(195,190,182,0.25)] rounded-2xl p-6 sm:p-8 md:p-10 mb-6 sm:mb-8">
              <h2 className="font-['Cormorant_Garamond'] font-light text-lg sm:text-xl tracking-[0.2em] uppercase text-[#f0ede8] mb-6 sm:mb-8">
                ORDER DETAILS
              </h2>
              <div className="space-y-4 sm:space-y-5">
                <div className="flex justify-between items-center pb-4 border-b border-[rgba(195,190,182,0.20)]">
                  <span className="text-xs sm:text-sm text-[#8a8780] font-light tracking-[0.3em] uppercase">Product</span>
                  <span className="text-sm sm:text-base text-[#f0ede8] font-light">
                    {userInfo.productType === "sselfie_studio_membership"
                      ? "Studio Membership"
                      : userInfo.productType === "one_time_session"
                        ? "One-Time Session"
                        : userInfo.productType === "credit_topup"
                          ? "Credit Top-Up"
                          : userInfo.productType === "brand_strategy_pack"
                            ? "Brand Strategy Pack"
                            : userInfo.productType === "selfie_guide"
                              ? "Selfie Guide"
                              : userInfo.productType === "selfie_guide_bundle"
                                ? "Selfie Guide + Brand Strategy Bundle"
                                : "Purchase"}
                  </span>
                </div>
                {userInfo.credits && Number(userInfo.credits) > 0 && (
                  <div className="flex justify-between items-center pb-4 border-b border-[rgba(195,190,182,0.20)]">
                    <span className="text-xs sm:text-sm text-[#8a8780] font-light tracking-[0.3em] uppercase">
                      {userInfo.productType === "sselfie_studio_membership" ? "Monthly Credits" : "Credits Included"}
                    </span>
                    <span className="text-sm sm:text-base text-[#f0ede8] font-light">{userInfo.credits} credits</span>
                  </div>
                )}
                <div className="flex justify-between items-center pb-4 border-b border-[rgba(195,190,182,0.20)]">
                  <span className="text-xs sm:text-sm text-[#8a8780] font-light tracking-[0.3em] uppercase">Email</span>
                  <span className="text-sm sm:text-base text-[#f0ede8] font-light">
                    {userInfo.email || initialEmail}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs sm:text-sm text-[#8a8780] font-light tracking-[0.3em] uppercase">Status</span>
                  <span className="text-sm sm:text-base text-[#a8a49c] font-light">Active</span>
                </div>
              </div>
            </div>

            <div className="text-center">
              <button
                onClick={() => router.push("/maya")}
                className="bg-[#c8c4bb] text-[#0d0c0b] font-medium tracking-[0.15em] uppercase text-xs px-8 sm:px-12 py-3 sm:py-4 rounded-full hover:bg-[#f0ede8] transition-colors min-h-[44px]"
              >
                Continue
              </button>
              <p className="text-[10px] sm:text-xs text-[#8a8780] font-light mt-4 sm:mt-6">
                A confirmation email has been sent to {userInfo.email || initialEmail}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
