"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import LoadingSpinner from "@/components/sselfie/loading-spinner"
import { sanitizeRedirect } from "@/lib/security/url-validator"

interface SuccessContentProps {
  initialUserInfo: any
  initialEmail?: string
  sessionId?: string
  purchaseType?: string
  returnTo?: string
  brandStrategyBumpSelected?: boolean
}

type SuccessActionConfig = {
  href: string
  label: string
  helper: string
  eventName?: "one_time_session_studio_click" | "brand_strategy_pack_studio_click"
  secondaryHref?: string
  secondaryLabel?: string
  secondaryEventName?: "brand_strategy_pack_studio_click"
}

function trackClientEvent(event: string, properties?: Record<string, unknown>) {
  import("@/lib/analytics/client")
    .then(({ trackAnalyticsEvent }) => trackAnalyticsEvent({ event, properties }))
    .catch(() => {})
}

function getProductLabel(productType: string | undefined) {
  switch (productType) {
    case "sselfie_studio_membership":
      return "Studio Membership"
    case "sselfie_studio_membership_annual":
      return "Studio Membership"
    case "one_time_session":
      return "Starter Photoshoot"
    case "credit_topup":
      return "Credit Top-Up"
    case "brand_strategy_pack":
      return "Brand Strategy Pack"
    case "selfie_guide":
      return "Selfie Guide"
    case "selfie_guide_bundle":
      return "Selfie Guide + Brand Strategy Bundle"
    case "starter_kit":
      return "Selfie Starter Kit"
    case "masterclass":
      return "Selfie Masterclass"
    case "visibility_suite":
      return "Visibility To Paid Suite"
    case "what_to_say":
      return "What To Say"
    case "show_up":
      return "Show Up"
    case "get_paid":
      return "Get Paid"
    case "concept_cards_pack":
      return "Concept Cards"
    case "caption_sprint":
      return "Caption Sprint"
    case "feed_reset_9grid":
      return "Feed Reset"
    case "ai_photo_refresh":
      return "AI Photo Refresh"
    case "paid_blueprint":
      return "30-Day Visibility Reset"
    case "transform_starter":
      return "SSELFIE Transform — Starter Pack"
    case "transform_topup":
      return "Transform Credit Top-up"
    default:
      return "Purchase"
  }
}

const CREDIT_GRANTING_TYPES = new Set([
  "sselfie_studio_membership",
  "sselfie_studio_membership_annual",
  "one_time_session",
  "paid_blueprint",
])

const VISIBILITY_SUITE_INCLUDES = ["What To Say", "Show Up", "Get Paid", "Maya Visibility Plan"]

function getSuccessActionConfig(productType: string | undefined, resolvedReturnTo: string): SuccessActionConfig {
  if (productType === "sselfie_studio_membership" || productType === "sselfie_studio_membership_annual") {
    return {
      href: "/studio?tab=maya&welcome=weekly-system",
      label: "Plan your first week",
      helper:
        "Your Studio membership is active. Open Maya and start with your first weekly content plan.",
      secondaryHref: "/academy",
      secondaryLabel: "Open Academy",
    }
  }

  if (productType === "brand_strategy_pack") {
    return {
      href: resolvedReturnTo,
      label: "Open your strategy",
      helper: "We're getting your private setup link ready now. This usually takes a few seconds.",
      secondaryHref: "/private-shoot",
      secondaryLabel: "Private Offer",
      secondaryEventName: "brand_strategy_pack_studio_click",
    }
  }

  if (productType === "starter_kit") {
    return {
      href: "/academy/access/starter-kit",
      label: "Open your Starter Kit",
      helper:
        "Your Starter Kit is ready. Start with the quick win, then use the 7-day starter to create your first brand-ready week.",
    }
  }

  if (productType === "masterclass") {
    return {
      href: "/academy/access/brand-strategy",
      label: "Start with Brand Strategy",
      helper:
        "Your Masterclass includes Brand Strategy Pack. Complete your positioning first, then move into the lessons with a clearer offer.",
      secondaryHref: "/academy",
      secondaryLabel: "Open Masterclass Library",
    }
  }

  if (productType === "visibility_suite") {
    return {
      href: "/academy/access/visibility-suite",
      label: "Open your Visibility To Paid Path",
      helper:
        "Your Suite is ready. Start with What To Say, then move through Show Up, Get Paid, and your Maya Visibility Plan.",
    }
  }

  if (productType === "what_to_say") {
    return {
      href: "/academy/access/what-to-say",
      label: "Start What To Say",
      helper: "Your focused product home is ready. Start with the message fix workflow.",
    }
  }

  if (productType === "show_up") {
    return {
      href: "/academy/access/show-up",
      label: "Open Show Up",
      helper: "Your focused product home is ready. Start with your 7-day posting workflow.",
    }
  }

  if (productType === "get_paid") {
    return {
      href: "/academy/access/get-paid",
      label: "Open Get Paid",
      helper: "Your focused product home is ready. Start with your buyer-path workflow.",
    }
  }

  if (productType === "concept_cards_pack") {
    return {
      href: "/academy/access/concept-cards",
      label: "Open Concept Cards",
      helper: "Your focused product home is ready. Start with one topic and ten post angles.",
    }
  }

  if (productType === "caption_sprint") {
    return {
      href: "/academy/access/captions",
      label: "Open Caption Sprint",
      helper: "Your focused product home is ready. Start with your caption bank.",
    }
  }

  if (productType === "feed_reset_9grid") {
    return {
      href: "/academy/access/feed-reset",
      label: "Open Feed Reset",
      helper: "Your focused product home is ready. Start with your next nine posts.",
    }
  }

  if (productType === "ai_photo_refresh") {
    return {
      href: "/academy/access/ai-photo-refresh",
      label: "Open AI Photo Refresh",
      helper: "Your focused product home is ready. Start with your visual direction.",
    }
  }

  if (productType === "one_time_session") {
    return {
      href: "/private-shoot",
      label: "Explore Private Support",
      helper:
        "Your photoshoot is confirmed. If you want Sandra's eyes on the full picture, private support is the high-touch next step.",
      eventName: "one_time_session_studio_click",
    }
  }

  if (productType === "transform_starter" || productType === "transform_topup") {
    return {
      href: "/transform/studio",
      label: "Open Transform",
      helper: "Your 15 credits are ready. Upload a photo and choose your first aesthetic.",
    }
  }

  return {
    href: "/studio",
    label: "Open Studio",
    helper: "Your purchase is complete. Open Studio and keep going.",
  }
}

export function SuccessContent({
  initialUserInfo,
  initialEmail,
  sessionId,
  purchaseType,
  returnTo,
  brandStrategyBumpSelected = false,
}: SuccessContentProps) {
  const router = useRouter()
  const [userInfo, setUserInfo] = useState(initialUserInfo)
  const isBrandEnginePurchase = false // Brand Engine retired — no new purchases
  const isSelfieGuidePurchase = purchaseType === "selfie_guide" || purchaseType === "selfie_guide_bundle"
  const isBrandStrategyPurchase = purchaseType === "brand_strategy_pack"
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

    if (initialEmail && !isBrandEnginePurchase && !isSelfieGuidePurchase && !isBrandStrategyPurchase) {
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
  }, [initialEmail, isBrandEnginePurchase, isBrandStrategyPurchase, isSelfieGuidePurchase, purchaseType])

  // FIX 3: Poll access status before redirecting (wait for webhook to complete)
  const [isPollingAccess, setIsPollingAccess] = useState(false)
  const [pollAttempts, setPollAttempts] = useState(0)
  const MAX_POLL_ATTEMPTS = 60 // 60 attempts × 2s = 120s timeout
  const [pollingMessage, setPollingMessage] = useState("Processing your payment. This can take up to 2 minutes.")
  const [timeRemaining, setTimeRemaining] = useState(120)
  const [showTimeoutActions, setShowTimeoutActions] = useState(false)
  const [isPollingSelfieGuideAccess, setIsPollingSelfieGuideAccess] = useState(Boolean(isSelfieGuidePurchase && sessionId))
  const [selfieGuidePollAttempts, setSelfieGuidePollAttempts] = useState(0)
  const [selfieGuideStatus, setSelfieGuideStatus] = useState("Preparing your guide. This can take up to 2 minutes.")
  const [showSelfieGuideTimeout, setShowSelfieGuideTimeout] = useState(false)
  const [selfieGuideRecoveryMessage, setSelfieGuideRecoveryMessage] = useState(
    "Your payment went through. Your guide access is still syncing.",
  )
  const [isPollingBrandStrategySetup, setIsPollingBrandStrategySetup] = useState(
    Boolean(isBrandStrategyPurchase && sessionId),
  )
  const [brandStrategyPollAttempts, setBrandStrategyPollAttempts] = useState(0)
  const [brandStrategyStatus, setBrandStrategyStatus] = useState("Preparing your private setup link.")
  const [showBrandStrategyTimeout, setShowBrandStrategyTimeout] = useState(false)
  const selfieGuideResolutionTrackedRef = useRef(false)
  const selfieGuideFailureTrackedRef = useRef(false)
  // purchaseType (from URL ?type=) is the authoritative source — it reflects what was just
  // purchased. userInfo.productType comes from the subscriptions table (last subscription on
  // the account) and can be a different product entirely for returning users.
  const resolvedProductType = (purchaseType || userInfo?.productType || "") as string
  const successAction = getSuccessActionConfig(resolvedProductType, resolvedReturnTo)

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

      // For transform, redirect to transform studio after brief confirmation
      if (user && (purchaseType === "transform_starter" || purchaseType === "transform_topup")) {
        setTimeout(() => {
          router.push("/transform/studio?checkout=success")
        }, 2500)
        return
      }

      if (isBrandStrategyPurchase && sessionId) {
        setIsPollingBrandStrategySetup(true)
        setBrandStrategyPollAttempts(0)
        setShowBrandStrategyTimeout(false)
        return
      }

      if (isSelfieGuidePurchase && (sessionId || user)) {
        setIsPollingSelfieGuideAccess(true)
        setSelfieGuidePollAttempts(0)
        setShowSelfieGuideTimeout(false)
        return
      }

      // For paid blueprint, poll access status until webhook completes
      if (user && purchaseType === "paid_blueprint") {
        setIsPollingAccess(true)
        setPollAttempts(0)
      }
    }
    checkAuth()
  }, [isBrandStrategyPurchase, isSelfieGuidePurchase, purchaseType, router, sessionId])

  useEffect(() => {
    if (!isPollingBrandStrategySetup || !sessionId || !isBrandStrategyPurchase) {
      return
    }

    const pollSetupToken = async () => {
      try {
        const response = await fetch(
          `/api/brand-strategy/setup-token?session_id=${encodeURIComponent(sessionId)}`,
          { cache: "no-store" },
        )
        const data = await response.json()

        if (response.ok && data.setupToken) {
          setIsPollingBrandStrategySetup(false)
          router.push(`/brand-strategy/setup/${encodeURIComponent(data.setupToken)}`)
          return
        }

        if (response.status === 409) {
          setBrandStrategyPollAttempts((prev) => {
            const next = prev + 1
            setBrandStrategyStatus(
              next < 20
                ? "Preparing your private setup link."
                : next < 40
                  ? "Payment confirmed. Building your setup link now..."
                  : "Almost there. Your strategy setup is still syncing.",
            )

            if (next >= MAX_POLL_ATTEMPTS) {
              setIsPollingBrandStrategySetup(false)
              setShowBrandStrategyTimeout(true)
            }

            return next
          })
          return
        }

        setIsPollingBrandStrategySetup(false)
        setShowBrandStrategyTimeout(true)
      } catch (error) {
        console.error("[SUCCESS PAGE] Brand strategy setup polling error:", error)
        setBrandStrategyPollAttempts((prev) => {
          const next = prev + 1
          if (next >= MAX_POLL_ATTEMPTS) {
            setIsPollingBrandStrategySetup(false)
            setShowBrandStrategyTimeout(true)
          }
          return next
        })
      }
    }

    const interval = setInterval(pollSetupToken, 2000)
    pollSetupToken()

    return () => clearInterval(interval)
  }, [isBrandStrategyPurchase, isPollingBrandStrategySetup, router, sessionId])

  useEffect(() => {
    if (!isPollingSelfieGuideAccess || !isSelfieGuidePurchase || (!sessionId && !isAuthenticated)) {
      return
    }

    const pollGuideAccess = async () => {
      try {
        const response = await fetch(
          sessionId
            ? `/api/selfie-guide/access-token?session_id=${encodeURIComponent(sessionId)}`
            : "/api/selfie-guide/access-token",
          { cache: "no-store" },
        )
        const data = await response.json()

        if (response.ok && data.accessToken) {
          setIsPollingSelfieGuideAccess(false)
          setSelfieGuideStatus("Guide ready. Opening now...")

          if (!selfieGuideResolutionTrackedRef.current) {
            selfieGuideResolutionTrackedRef.current = true
            trackClientEvent("selfie_guide_access_resolved", {
              purchase_type: purchaseType || "selfie_guide",
              session_id: sessionId || null,
            })
          }

          setTimeout(() => {
            const qs = new URLSearchParams()
            if (sessionId) {
              qs.set("checkout_session", sessionId)
            }
            if (brandStrategyBumpSelected) {
              qs.set("brand_strategy_bump", "1")
            }
            const search = qs.toString()
            router.push(`/selfie-guide/access/${encodeURIComponent(data.accessToken)}${search ? `?${search}` : ""}`)
          }, 400)
          return
        }

        if (response.status >= 400 && response.status < 500 && response.status !== 409) {
          setIsPollingSelfieGuideAccess(false)
          setShowSelfieGuideTimeout(true)
          setSelfieGuideRecoveryMessage(data.error || "We couldn't verify your guide access yet.")

          if (!selfieGuideFailureTrackedRef.current) {
            selfieGuideFailureTrackedRef.current = true
            trackClientEvent("selfie_guide_access_failed", {
              purchase_type: purchaseType || "selfie_guide",
              session_id: sessionId || null,
              reason: data.error || "client_error",
            })
          }
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
            setSelfieGuideRecoveryMessage("Your payment is confirmed. Your guide access is taking longer than expected.")

            if (!selfieGuideFailureTrackedRef.current) {
              selfieGuideFailureTrackedRef.current = true
              trackClientEvent("selfie_guide_access_failed", {
                purchase_type: purchaseType || "selfie_guide",
                session_id: sessionId || null,
                reason: "timeout",
              })
            }
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
            setSelfieGuideRecoveryMessage("Your payment is confirmed. Your guide access is taking longer than expected.")

            if (!selfieGuideFailureTrackedRef.current) {
              selfieGuideFailureTrackedRef.current = true
              trackClientEvent("selfie_guide_access_failed", {
                purchase_type: purchaseType || "selfie_guide",
                session_id: sessionId || null,
                reason: "network_error",
              })
            }
          }
          return next
        })
      }
    }

    const interval = setInterval(pollGuideAccess, 2000)
    pollGuideAccess()

    return () => clearInterval(interval)
  }, [
    brandStrategyBumpSelected,
    isAuthenticated,
    isPollingSelfieGuideAccess,
    isSelfieGuidePurchase,
    purchaseType,
    router,
    sessionId,
  ])

  // GA4 purchase conversion event — fires once per unique session_id
  useEffect(() => {
    if (!sessionId || typeof window === "undefined") return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof (window as any).gtag !== "function") return

    const productPrices: Record<string, number> = {
      sselfie_studio_membership: 97,
      sselfie_studio_membership_annual: 970,
      selfie_guide: 17,
      selfie_guide_bundle: 27,
      starter_kit: 37,
      masterclass: 147,
      visibility_suite: 97,
      what_to_say: 47,
      show_up: 67,
      get_paid: 97,
      concept_cards_pack: 29,
      caption_sprint: 29,
      feed_reset_9grid: 49,
      ai_photo_refresh: 59,
      brand_strategy_pack: 19,
      paid_blueprint: 47,
      credit_topup: 25,
      one_time_session: 45,
    }
    const resolvedType = purchaseType || "unknown"
    const value = productPrices[resolvedType] ?? 0

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).gtag("event", "purchase", {
      transaction_id: sessionId,
      value,
      currency: [
        "visibility_suite",
        "what_to_say",
        "show_up",
        "get_paid",
        "concept_cards_pack",
        "caption_sprint",
        "feed_reset_9grid",
        "ai_photo_refresh",
      ].includes(resolvedType) ? "EUR" : "USD",
      items: [
        {
          item_id: resolvedType,
          item_name: resolvedType.replace(/_/g, " "),
          price: value,
          quantity: 1,
        },
      ],
    })
    console.log("[GA4] Purchase event fired:", { transaction_id: sessionId, value, type: resolvedType })
  }, [sessionId, purchaseType])

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
        <p className="text-sm text-[#f5f5f5]">
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
            Your guide is still syncing
          </h2>
          <p className="text-[#f5f5f5] max-w-md">{selfieGuideRecoveryMessage}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            onClick={() => {
              setShowSelfieGuideTimeout(false)
              setSelfieGuidePollAttempts(0)
              setSelfieGuideStatus("Preparing your guide. This can take up to 2 minutes.")
              setIsPollingSelfieGuideAccess(true)
            }}
            variant="default"
            className="bg-[#c8c4bb] text-[#0d0c0b] font-medium tracking-[0.15em] uppercase text-xs px-6 py-3 rounded-full hover:bg-[#f0ede8] transition-colors"
          >
            Try Again
          </Button>
          <Button
            asChild
            variant="outline"
            className="border-[rgba(195,190,182,0.25)] text-[#f0ede8] tracking-[0.15em] uppercase text-xs px-6 py-3 rounded-full hover:bg-[rgba(175,170,162,0.10)] transition-colors"
          >
            <a href="mailto:support@sselfie.ai?subject=Selfie%20Guide%20access%20help">Email Support</a>
          </Button>
        </div>
      </div>
    )
  }

  if (isPollingBrandStrategySetup && isBrandStrategyPurchase) {
    return (
      <div className="min-h-screen bg-[#0d0c0b] flex flex-col items-center justify-center min-h-[400px] space-y-4 p-4">
        <LoadingSpinner size="lg" />
        <p className="text-lg font-medium text-[#f0ede8]">{brandStrategyStatus}</p>
        <p className="text-sm text-[#f5f5f5]">
          Estimated time remaining: {Math.max(0, 120 - (brandStrategyPollAttempts * 2))}s
        </p>
        <div className="w-64 bg-[rgba(175,170,162,0.20)] rounded-full h-2">
          <div
            className="bg-[#c8c4bb] h-2 rounded-full transition-all duration-1000"
            style={{ width: `${(brandStrategyPollAttempts / MAX_POLL_ATTEMPTS) * 100}%` }}
          />
        </div>
      </div>
    )
  }

  if (showBrandStrategyTimeout && isBrandStrategyPurchase) {
    return (
      <div className="min-h-screen bg-[#0d0c0b] flex flex-col items-center justify-center space-y-6 p-6">
        <div className="bg-[rgba(175,170,162,0.10)] backdrop-blur-[50px] border border-[rgba(195,190,182,0.25)] rounded-2xl p-8 max-w-md w-full text-center space-y-4">
          <h2 className="font-['Cormorant_Garamond'] font-light text-3xl text-[#f0ede8]">
            Your strategy is still syncing
          </h2>
          <p className="text-[#f5f5f5] max-w-md">
            Your payment went through. We&apos;re still preparing your private setup link.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            onClick={() => {
              setShowBrandStrategyTimeout(false)
              setBrandStrategyPollAttempts(0)
              setBrandStrategyStatus("Preparing your private setup link.")
              setIsPollingBrandStrategySetup(true)
            }}
            variant="default"
            className="bg-[#c8c4bb] text-[#0d0c0b] font-medium tracking-[0.15em] uppercase text-xs px-6 py-3 rounded-full hover:bg-[#f0ede8] transition-colors"
          >
            Try Again
          </Button>
          <Button
            onClick={() => {
              trackClientEvent("brand_strategy_pack_studio_click", {
                source_product: "brand_strategy_pack",
                source_surface: "checkout_timeout",
              })
              router.push("/private-shoot")
            }}
            variant="outline"
            className="border-[rgba(195,190,182,0.25)] text-[#f0ede8] tracking-[0.15em] uppercase text-xs px-6 py-3 rounded-full hover:bg-[rgba(175,170,162,0.10)] transition-colors"
          >
            Private Offer
          </Button>
        </div>
        <p className="text-sm text-[#f5f5f5]">
          We also sent your setup link by email. If you still need help,{" "}
          <a href="mailto:support@sselfie.ai" className="underline text-[#f5f5f5] hover:text-white">
            contact support
          </a>
          .
        </p>
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
        <p className="text-sm text-[#f5f5f5]">
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
          <p className="text-[#f5f5f5] max-w-md">
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
        <p className="text-sm text-[#f5f5f5]">
          If access is not available after 5 minutes, please{" "}
          <a href="mailto:support@sselfie.ai" className="underline text-[#f5f5f5] hover:text-white">
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

      // Redirect directly to the product — session is now active in cookies
      router.push(successAction.href)
    } catch {
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
            <p className="text-sm sm:text-base text-[#f5f5f5] font-light leading-relaxed max-w-xl mx-auto px-4">
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
          <p className="text-sm sm:text-base text-[#f5f5f5] font-light leading-relaxed max-w-xl mx-auto mb-8">
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
            PREPARING YOUR PURCHASE
          </div>
          <div className="text-xs sm:text-sm text-[#f5f5f5] font-light">Finalizing everything for you...</div>
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
          <p className="text-sm sm:text-base text-[#f5f5f5] font-light leading-relaxed mb-6 sm:mb-8 px-4">
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
            <p className="text-sm sm:text-base text-[#f5f5f5] font-light leading-relaxed max-w-xl mx-auto px-4">
              {resolvedProductType === "visibility_suite"
                ? "Your purchase is ready. Create your password so you can access your Visibility To Paid Suite anytime."
                : "Add your password so you can open everything inside SSELFIE. This takes less than a minute."}
            </p>
          </div>

          <div className="bg-[rgba(175,170,162,0.10)] backdrop-blur-[50px] border border-[rgba(195,190,182,0.25)] rounded-2xl p-6 sm:p-8 md:p-10">
            <form onSubmit={handleCompleteAccount} className="space-y-5 sm:space-y-6">
              <div>
                <label
                  htmlFor="name"
                  className="block text-xs sm:text-sm text-[#f5f5f5] font-light tracking-[0.3em] uppercase mb-2"
                >
                  Your Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-4 py-3 sm:py-4 bg-[rgba(175,170,162,0.10)] border border-[rgba(195,190,182,0.25)] rounded-xl focus:border-[#a8a49c] focus:outline-none transition-colors text-sm sm:text-base text-[#f0ede8] font-light placeholder:text-white/40"
                  placeholder="What should we call you?"
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-xs sm:text-sm text-[#f5f5f5] font-light tracking-[0.3em] uppercase mb-2"
                >
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={userInfo.email || initialEmail}
                  disabled
                  className="w-full px-4 py-3 sm:py-4 bg-[rgba(175,170,162,0.06)] border border-[rgba(195,190,182,0.15)] rounded-xl text-[#f5f5f5] text-sm sm:text-base font-light"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-xs sm:text-sm text-[#f5f5f5] font-light tracking-[0.3em] uppercase mb-2"
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
                  className="w-full px-4 py-3 sm:py-4 bg-[rgba(175,170,162,0.10)] border border-[rgba(195,190,182,0.25)] rounded-xl focus:border-[#a8a49c] focus:outline-none transition-colors text-sm sm:text-base text-[#f0ede8] font-light placeholder:text-white/40"
                  placeholder="At least 8 characters"
                />
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-xs sm:text-sm text-[#f5f5f5] font-light tracking-[0.3em] uppercase mb-2"
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
                  className="w-full px-4 py-3 sm:py-4 bg-[rgba(175,170,162,0.10)] border border-[rgba(195,190,182,0.25)] rounded-xl focus:border-[#a8a49c] focus:outline-none transition-colors text-sm sm:text-base text-[#f0ede8] font-light placeholder:text-white/40"
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
                {isSubmitting
                  ? "SETTING UP..."
                  : resolvedProductType === "visibility_suite"
                    ? "CREATE PASSWORD AND OPEN MY SUITE"
                    : "LET'S GO"}
              </button>

              <p className="text-[10px] sm:text-xs text-[#f5f5f5] font-light text-center leading-relaxed">
                By continuing, you agree to our Terms of Service and Privacy Policy
              </p>
            </form>
          </div>

          <div className="mt-6 sm:mt-8 text-center">
            <p className="text-xs sm:text-sm text-[#f5f5f5] font-light leading-relaxed">
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
              <p className="text-sm sm:text-base text-[#f5f5f5] font-light leading-relaxed max-w-xl mx-auto px-4">
                Add your password so you can open everything inside SSELFIE. This takes less than a minute.
              </p>
            </div>

            <div className="bg-[rgba(175,170,162,0.10)] backdrop-blur-[50px] border border-[rgba(195,190,182,0.25)] rounded-2xl p-6 sm:p-8 md:p-10">
              <form onSubmit={handleCompleteAccount} className="space-y-5 sm:space-y-6">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-xs sm:text-sm text-[#f5f5f5] font-light tracking-[0.3em] uppercase mb-2"
                  >
                    Your Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full px-4 py-3 sm:py-4 bg-[rgba(175,170,162,0.10)] border border-[rgba(195,190,182,0.25)] rounded-xl focus:border-[#a8a49c] focus:outline-none transition-colors text-sm sm:text-base text-[#f0ede8] font-light placeholder:text-white/40"
                    placeholder="What should we call you?"
                  />
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="block text-xs sm:text-sm text-[#f5f5f5] font-light tracking-[0.3em] uppercase mb-2"
                  >
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={userInfo.email || initialEmail}
                    disabled
                    className="w-full px-4 py-3 sm:py-4 bg-[rgba(175,170,162,0.06)] border border-[rgba(195,190,182,0.15)] rounded-xl text-[#f5f5f5] text-sm sm:text-base font-light"
                  />
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="block text-xs sm:text-sm text-[#f5f5f5] font-light tracking-[0.3em] uppercase mb-2"
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
                    className="w-full px-4 py-3 sm:py-4 bg-[rgba(175,170,162,0.10)] border border-[rgba(195,190,182,0.25)] rounded-xl focus:border-[#a8a49c] focus:outline-none transition-colors text-sm sm:text-base text-[#f0ede8] font-light placeholder:text-white/40"
                    placeholder="At least 8 characters"
                  />
                </div>

                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="block text-xs sm:text-sm text-[#f5f5f5] font-light tracking-[0.3em] uppercase mb-2"
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
                    className="w-full px-4 py-3 sm:py-4 bg-[rgba(175,170,162,0.10)] border border-[rgba(195,190,182,0.25)] rounded-xl focus:border-[#a8a49c] focus:outline-none transition-colors text-sm sm:text-base text-[#f0ede8] font-light placeholder:text-white/40"
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

                <p className="text-[10px] sm:text-xs text-[#f5f5f5] font-light text-center leading-relaxed">
                  By continuing, you agree to our Terms of Service and Privacy Policy
                </p>
              </form>
            </div>

            <div className="mt-6 sm:mt-8 text-center">
              <p className="text-xs sm:text-sm text-[#f5f5f5] font-light leading-relaxed">
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
              <p className="text-sm sm:text-base text-[#f5f5f5] font-light leading-relaxed max-w-xl mx-auto px-4">
                {isPollingAccess
                  ? `Setting up your paid access... (${pollAttempts + 1}/${MAX_POLL_ATTEMPTS})`
                  : isAuthenticated
                    ? successAction.helper
                    : "Check your email for next steps."}
              </p>
            </div>

            <div className="bg-[rgba(175,170,162,0.10)] backdrop-blur-[50px] border border-[rgba(195,190,182,0.25)] rounded-2xl p-6 sm:p-8 md:p-10 mb-6 sm:mb-8">
              <h2 className="font-['Cormorant_Garamond'] font-light text-lg sm:text-xl tracking-[0.2em] uppercase text-[#f0ede8] mb-6 sm:mb-8">
                ORDER DETAILS
              </h2>
              <div className="space-y-4 sm:space-y-5">
                <div className="flex justify-between items-center pb-4 border-b border-[rgba(195,190,182,0.20)]">
                  <span className="text-xs sm:text-sm text-[#f5f5f5] font-light tracking-[0.3em] uppercase">Product</span>
                  <span className="text-sm sm:text-base text-[#f0ede8] font-light">
                    {getProductLabel(resolvedProductType)}
                  </span>
                </div>
                {resolvedProductType === "visibility_suite" && (
                  <div className="flex justify-between items-start pb-4 border-b border-[rgba(195,190,182,0.20)]">
                    <span className="text-xs sm:text-sm text-[#f5f5f5] font-light tracking-[0.3em] uppercase">Included</span>
                    <div className="text-right space-y-1">
                      {VISIBILITY_SUITE_INCLUDES.map(item => (
                        <p key={item} className="text-sm sm:text-base text-[#f0ede8] font-light">{item}</p>
                      ))}
                    </div>
                  </div>
                )}
                {userInfo.credits && Number(userInfo.credits) > 0 && CREDIT_GRANTING_TYPES.has(resolvedProductType) && (
                  <div className="flex justify-between items-center pb-4 border-b border-[rgba(195,190,182,0.20)]">
                    <span className="text-xs sm:text-sm text-[#f5f5f5] font-light tracking-[0.3em] uppercase">
                      {resolvedProductType === "sselfie_studio_membership" ? "Monthly Credits" : "Credits Included"}
                    </span>
                    <span className="text-sm sm:text-base text-[#f0ede8] font-light">{userInfo.credits} credits</span>
                  </div>
                )}
                <div className="flex justify-between items-center pb-4 border-b border-[rgba(195,190,182,0.20)]">
                  <span className="text-xs sm:text-sm text-[#f5f5f5] font-light tracking-[0.3em] uppercase">Email</span>
                  <span className="text-sm sm:text-base text-[#f0ede8] font-light">
                    {userInfo.email || initialEmail}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs sm:text-sm text-[#f5f5f5] font-light tracking-[0.3em] uppercase">Status</span>
                  <span className="text-sm sm:text-base text-[#f5f5f5] font-light">Active</span>
                </div>
              </div>
            </div>

            <div className="text-center">
              <button
                onClick={() => {
                  if (successAction.eventName) {
                    trackClientEvent(successAction.eventName, {
                      source_product: resolvedProductType,
                    })
                  }
                  if (!isAuthenticated && userInfo?.hasAccount) {
                    // Account exists but not logged in in this browser — send to login with returnTo
                    router.push(`/auth/login?returnTo=${encodeURIComponent(successAction.href)}`)
                  } else {
                    router.push(successAction.href)
                  }
                }}
                className="bg-[#c8c4bb] text-[#0d0c0b] font-medium tracking-[0.15em] uppercase text-xs px-8 sm:px-12 py-3 sm:py-4 rounded-full hover:bg-[#f0ede8] transition-colors min-h-[44px]"
              >
                {!isAuthenticated && userInfo?.hasAccount ? "Log in to open your products" : successAction.label}
              </button>
              {successAction.secondaryHref && successAction.secondaryLabel ? (
                <div className="mt-4">
                  <button
                    onClick={() => {
                      if (successAction.secondaryEventName) {
                        trackClientEvent(successAction.secondaryEventName, {
                          source_product: resolvedProductType,
                        })
                      }
                      router.push(successAction.secondaryHref!)
                    }}
                    className="text-[10px] sm:text-xs text-[#c8c4bb] font-light uppercase tracking-[0.2em] underline underline-offset-4"
                  >
                    {successAction.secondaryLabel}
                  </button>
                </div>
              ) : null}
              <p className="text-[10px] sm:text-xs text-[#f5f5f5] font-light mt-4 sm:mt-6">
                A confirmation email has been sent to {userInfo.email || initialEmail}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
