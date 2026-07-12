"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import LoadingSpinner from "@/components/sselfie/loading-spinner"

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
  eventName?: "one_time_session_studio_click"
  secondaryEventName?: string
  secondaryHref?: string
  secondaryLabel?: string
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
      return "Legacy One-Time Session"
    case "credit_topup":
      return "Credit Top-Up"
    case "selfie_guide":
      return "Selfie Guide"
    case "selfie_guide_bundle":
      return "Selfie Guide + Strategy Bundle"
    case "starter_kit":
      return "Selfie Starter Kit"
    case "prompt_vault":
      return "The AI Photo Prompt Vault"
    case "selfie_ai_photos_kit":
      return "Selfie To AI Photos Kit"
    case "presets_single":
      return "SSELFIE Presets · Single Collection"
    case "presets_bundle":
      return "SSELFIE Presets · Full Collection"
    case "selfie_to_brand_shoot_system":
      return "Selfie to Brand Shoot System"
    case "masterclass":
      return "Selfie Masterclass"
    case "visibility_suite":
      return "Legacy Visibility Suite"
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
      return "Legacy Feed Planner Access"
    case "transform_starter":
      return "SSELFIE Edit Studio · Starter Pack"
    case "transform_topup":
      return "Edit Studio Credit Top-up"
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
const STARTER_KIT_INCLUDES = [
  "Lightroom preset download",
  "Selfie Guide access",
  "Quick-start checklist",
  "7-day content starter",
]
const PROMPT_VAULT_INCLUDES = [
  "Marble Café Wine Editorial",
  "Soft Blazer + Light Denim Street Editorial",
  "Cozy Leather + Oversized Knit Mirror Editorial",
  "Copy-paste prompts with example photos",
]
const SELFIE_AI_PHOTOS_KIT_INCLUDES = [
  "Source selfie checklist",
  "AI photo starter prompts",
  "Still-you fix prompts",
  "3-image starter shoot path",
]
const PRESETS_INCLUDES = [
  "Mobile Lightroom preset files",
  "Desktop Lightroom preset files",
  "Quick setup guide",
  "Tokenized access page",
]
const SELFIE_TO_BRAND_SHOOT_INCLUDES = [
  "Guided Selfie to Brand Shoot workflow",
  "Source selfie and angle guidance",
  "Prompt Vault included",
  "Image selection taste filter",
  "Content-use path for the first result",
]

function getSuccessActionConfig(productType: string | undefined): SuccessActionConfig {
  if (productType === "sselfie_studio_membership" || productType === "sselfie_studio_membership_annual") {
    return {
      href: "/app",
      label: "Plan your first week",
      helper:
        "Your Studio membership is active. Open Maya and start with your first weekly content plan.",
      secondaryHref: "/academy",
      secondaryLabel: "Open Academy",
    }
  }

  if (productType === "starter_kit") {
    return {
      href: "/academy/access/starter-kit",
      label: "Open your Starter Kit",
      helper:
        "Your Lightroom presets, Selfie Guide, and 7-day content starter are ready. Open the kit to download your presets first.",
      secondaryHref: "mailto:support@sselfie.ai?subject=Starter%20Kit%20access",
      secondaryLabel: "Need help? Email support",
    }
  }

  if (productType === "masterclass") {
    return {
      href: "/academy/access/masterclass",
      label: "Open Masterclass",
      helper:
        "Your Masterclass access is ready. Start with the lessons, then use Academy to keep moving through the material.",
      secondaryHref: "/academy",
      secondaryLabel: "Open Masterclass Library",
    }
  }

  if (productType === "prompt_vault") {
    return {
      href: "/prompt-vault",
      label: "Check your email for access",
      helper:
        "Your Prompt Vault is ready. If this page does not open it automatically, use the access link in your inbox.",
      secondaryHref: "mailto:support@sselfie.ai?subject=Prompt%20Vault%20access",
      secondaryLabel: "Need help? Email support",
    }
  }

  if (productType === "selfie_ai_photos_kit") {
    return {
      href: "/selfie-to-ai-photos-kit",
      label: "Check your email for access",
      helper:
        "Your AI Photos Kit is ready. If this page does not open it automatically, use the access link in your inbox.",
      secondaryHref: "mailto:support@sselfie.ai?subject=AI%20Photos%20Kit%20access",
      secondaryLabel: "Need help? Email support",
    }
  }

  if (productType === "presets_single" || productType === "presets_bundle") {
    return {
      href: "/presets",
      label: "Check your email for access",
      helper:
        "Your presets are ready. If this page does not open them automatically, use the access link in your inbox.",
      secondaryHref: "mailto:support@sselfie.ai?subject=SSELFIE%20Presets%20access",
      secondaryLabel: "Need help? Email support",
    }
  }

  if (productType === "selfie_to_brand_shoot_system") {
    return {
      href: "/academy/access/selfie-to-brand-shoot",
      label: "Open The System",
      helper:
        "Your Selfie to Brand Shoot System is ready inside Academy. Open it there so Maya can remember your visual world as you move through the course.",
      secondaryHref: "mailto:support@sselfie.ai?subject=Selfie%20to%20Brand%20Shoot%20access",
      secondaryLabel: "Need help? Email support",
    }
  }

  // PRESERVE_FOR_EXISTING_BUYERS: old academy buyers may still land here after delayed Stripe redirects.
  if (productType === "visibility_suite") {
    return {
      href: "/academy/access/visibility-suite",
      label: "Open your legacy access",
      helper:
        "Your legacy academy access is ready. Open it from your Academy library any time.",
    }
  }

  // LEGACY_ACCESS_ONLY: old academy mini-product buyers may still land here after delayed Stripe redirects.
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
      href: "/work-with-me",
      label: "Explore Private Support",
      helper:
        "Your photoshoot is confirmed. If you want Sandra's eyes on the full picture, private support is the high-touch next step.",
      eventName: "one_time_session_studio_click",
    }
  }

  if (productType === "transform_starter" || productType === "transform_topup") {
    return {
      href: "/app",
      label: "Open Studio",
      helper: "Your visual credits are ready. Open Studio and continue from the current AI workspace.",
    }
  }

  return {
    href: "/app",
    label: "Open Studio",
    helper: "Your purchase is complete. Open Studio and keep going.",
  }
}

export function SuccessContent({
  initialUserInfo,
  initialEmail,
  sessionId,
  purchaseType,
  returnTo: _returnTo,
  brandStrategyBumpSelected = false,
}: SuccessContentProps) {
  const router = useRouter()
  const [userInfo, setUserInfo] = useState(initialUserInfo)
  const isSelfieGuidePurchase = purchaseType === "selfie_guide" || purchaseType === "selfie_guide_bundle"
  const isPromptVaultPurchase = purchaseType === "prompt_vault"
  const isSelfieAiPhotosKitPurchase = purchaseType === "selfie_ai_photos_kit"
  const isPresetsPurchase = purchaseType === "presets_single" || purchaseType === "presets_bundle"
  const isSelfieToBrandShootPurchase = purchaseType === "selfie_to_brand_shoot_system"
  const isBrandEnginePurchase = String(purchaseType || "").startsWith("brand_engine_")
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

    if (sessionId && !isBrandEnginePurchase && !isSelfieGuidePurchase) {
      let attempts = 0
      const MAX_ATTEMPTS = 40 // Increased to 80 seconds total

      console.log("[v0] Starting checkout-scoped user info polling for session:", sessionId)

      const pollInterval = setInterval(async () => {
        attempts++
        console.log(`[v0] Polling attempt ${attempts}/${MAX_ATTEMPTS}`)

        try {
          const response = await fetch(`/api/checkout/user-status?session_id=${encodeURIComponent(sessionId)}`)

          if (response.status === 202) {
            if (attempts >= MAX_ATTEMPTS) {
              console.log("[v0] Max attempts reached while checkout user row is pending")
              clearInterval(pollInterval)
            }
            return
          }

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
            console.log("[v0] Max attempts reached with no checkout user info")
            clearInterval(pollInterval)
          }
        } catch (err) {
          console.error("[v0] Polling error:", err)
          if (attempts >= MAX_ATTEMPTS) {
            console.log("[v0] Max attempts reached after checkout user polling error")
            clearInterval(pollInterval)
          }
        }
      }, 2000) // Poll every 2 seconds

      return () => {
        clearInterval(pollInterval)
      }
    }
  }, [isBrandEnginePurchase, isSelfieGuidePurchase, purchaseType, sessionId])

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
  const [isPollingPromptVaultAccess, setIsPollingPromptVaultAccess] = useState(Boolean(isPromptVaultPurchase && sessionId))
  const [promptVaultPollAttempts, setPromptVaultPollAttempts] = useState(0)
  const [promptVaultStatus, setPromptVaultStatus] = useState("Preparing your Prompt Vault. This can take up to 2 minutes.")
  const [showPromptVaultTimeout, setShowPromptVaultTimeout] = useState(false)
  const [promptVaultRecoveryMessage, setPromptVaultRecoveryMessage] = useState(
    "Your payment went through. Your Prompt Vault access is still syncing.",
  )
  const [isPollingSelfieAiPhotosKitAccess, setIsPollingSelfieAiPhotosKitAccess] = useState(Boolean(isSelfieAiPhotosKitPurchase && sessionId))
  const [selfieAiPhotosKitPollAttempts, setSelfieAiPhotosKitPollAttempts] = useState(0)
  const [selfieAiPhotosKitStatus, setSelfieAiPhotosKitStatus] = useState("Preparing your AI Photos Kit. This can take up to 2 minutes.")
  const [showSelfieAiPhotosKitTimeout, setShowSelfieAiPhotosKitTimeout] = useState(false)
  const [selfieAiPhotosKitRecoveryMessage, setSelfieAiPhotosKitRecoveryMessage] = useState(
    "Your payment went through. Your AI Photos Kit access is still syncing.",
  )
  const [isPollingPresetsAccess, setIsPollingPresetsAccess] = useState(Boolean(isPresetsPurchase && sessionId))
  const [presetsPollAttempts, setPresetsPollAttempts] = useState(0)
  const [presetsStatus, setPresetsStatus] = useState("Preparing your SSELFIE Presets. This can take up to 2 minutes.")
  const [showPresetsTimeout, setShowPresetsTimeout] = useState(false)
  const [presetsRecoveryMessage, setPresetsRecoveryMessage] = useState(
    "Your payment went through. Your SSELFIE Presets access is still syncing.",
  )
  const [isPollingSelfieToBrandShootAccess, setIsPollingSelfieToBrandShootAccess] = useState(false)
  const [selfieToBrandShootPollAttempts, setSelfieToBrandShootPollAttempts] = useState(0)
  const [selfieToBrandShootStatus, setSelfieToBrandShootStatus] = useState("Preparing your Selfie to Brand Shoot System. This can take up to 2 minutes.")
  const [showSelfieToBrandShootTimeout, setShowSelfieToBrandShootTimeout] = useState(false)
  const [selfieToBrandShootRecoveryMessage, setSelfieToBrandShootRecoveryMessage] = useState(
    "Your payment went through. Your Selfie to Brand Shoot access is still syncing.",
  )
  const selfieGuideResolutionTrackedRef = useRef(false)
  const selfieGuideFailureTrackedRef = useRef(false)
  const promptVaultResolutionTrackedRef = useRef(false)
  const promptVaultFailureTrackedRef = useRef(false)
  const selfieAiPhotosKitResolutionTrackedRef = useRef(false)
  const selfieAiPhotosKitFailureTrackedRef = useRef(false)
  const presetsResolutionTrackedRef = useRef(false)
  const presetsFailureTrackedRef = useRef(false)
  const selfieToBrandShootResolutionTrackedRef = useRef(false)
  const selfieToBrandShootFailureTrackedRef = useRef(false)
  // purchaseType (from URL ?type=) is the authoritative source - it reflects what was just
  // purchased. userInfo.productType comes from the subscriptions table (last subscription on
  // the account) and can be a different product entirely for returning users.
  const resolvedProductType = (purchaseType || userInfo?.productType || "") as string
  const successAction = getSuccessActionConfig(resolvedProductType)

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
          router.push("/feed-planner")
        }, 2000)
        return
      }

      // LEGACY_ACCESS_ONLY: Transform purchases now land in the live app instead of the retired Transform surface.
      if (user && (purchaseType === "transform_starter" || purchaseType === "transform_topup")) {
        setTimeout(() => {
          router.push("/app")
        }, 2500)
        return
      }

      if (isSelfieGuidePurchase && (sessionId || user)) {
        setIsPollingSelfieGuideAccess(true)
        setSelfieGuidePollAttempts(0)
        setShowSelfieGuideTimeout(false)
        return
      }

      if (isPromptVaultPurchase && sessionId) {
        setIsPollingPromptVaultAccess(true)
        setPromptVaultPollAttempts(0)
        setShowPromptVaultTimeout(false)
        return
      }

      if (isSelfieAiPhotosKitPurchase && sessionId) {
        setIsPollingSelfieAiPhotosKitAccess(true)
        setSelfieAiPhotosKitPollAttempts(0)
        setShowSelfieAiPhotosKitTimeout(false)
        return
      }

      if (isPresetsPurchase && sessionId) {
        setIsPollingPresetsAccess(true)
        setPresetsPollAttempts(0)
        setShowPresetsTimeout(false)
        return
      }

      if (user && isSelfieToBrandShootPurchase && sessionId) {
        setIsPollingSelfieToBrandShootAccess(true)
        setSelfieToBrandShootPollAttempts(0)
        setShowSelfieToBrandShootTimeout(false)
        return
      }

      // For paid blueprint, poll access status until webhook completes
      if (user && purchaseType === "paid_blueprint") {
        setIsPollingAccess(true)
        setPollAttempts(0)
      }
    }
    checkAuth()
  }, [isPresetsPurchase, isPromptVaultPurchase, isSelfieAiPhotosKitPurchase, isSelfieGuidePurchase, isSelfieToBrandShootPurchase, purchaseType, router, sessionId])

  useEffect(() => {
    if (!isPollingPromptVaultAccess || !isPromptVaultPurchase || !sessionId) {
      return
    }

    const pollPromptVaultAccess = async () => {
      try {
        const response = await fetch(
          `/api/prompt-vault/access-token?session_id=${encodeURIComponent(sessionId)}`,
          { cache: "no-store" },
        )
        const data = await response.json()

        if (response.ok && data.accessToken) {
          setIsPollingPromptVaultAccess(false)
          setPromptVaultStatus("Prompt Vault ready. Opening now...")

          if (!promptVaultResolutionTrackedRef.current) {
            promptVaultResolutionTrackedRef.current = true
            trackClientEvent("prompt_vault_access_resolved", {
              purchase_type: purchaseType || "prompt_vault",
              session_id: sessionId,
            })
          }

          setTimeout(() => {
            router.push(`/access/prompt-vault/${encodeURIComponent(data.accessToken)}?checkout_session=${encodeURIComponent(sessionId)}`)
          }, 400)
          return
        }

        if (response.status >= 400 && response.status < 500 && response.status !== 409) {
          setIsPollingPromptVaultAccess(false)
          setShowPromptVaultTimeout(true)
          setPromptVaultRecoveryMessage(data.error || "We couldn't verify your Prompt Vault access yet.")

          if (!promptVaultFailureTrackedRef.current) {
            promptVaultFailureTrackedRef.current = true
            trackClientEvent("prompt_vault_access_failed", {
              purchase_type: purchaseType || "prompt_vault",
              session_id: sessionId,
              reason: data.error || "client_error",
            })
          }
          return
        }

        setPromptVaultPollAttempts((prev) => {
          const next = prev + 1

          if (next < 20) {
            setPromptVaultStatus("Preparing your Prompt Vault. This can take up to 2 minutes.")
          } else if (next < 40) {
            setPromptVaultStatus("Payment confirmed. Finalizing your vault access...")
          } else {
            setPromptVaultStatus("Almost there. Your vault link is still syncing.")
          }

          if (next >= MAX_POLL_ATTEMPTS) {
            setIsPollingPromptVaultAccess(false)
            setShowPromptVaultTimeout(true)
            setPromptVaultRecoveryMessage("Your payment is confirmed. Your Prompt Vault access is taking longer than expected.")

            if (!promptVaultFailureTrackedRef.current) {
              promptVaultFailureTrackedRef.current = true
              trackClientEvent("prompt_vault_access_failed", {
                purchase_type: purchaseType || "prompt_vault",
                session_id: sessionId,
                reason: "timeout",
              })
            }
          }

          return next
        })
      } catch (error) {
        console.error("[SUCCESS PAGE] Prompt Vault polling error:", error)
        setPromptVaultPollAttempts((prev) => {
          const next = prev + 1
          if (next >= MAX_POLL_ATTEMPTS) {
            setIsPollingPromptVaultAccess(false)
            setShowPromptVaultTimeout(true)
            setPromptVaultRecoveryMessage("Your payment is confirmed. Your Prompt Vault access is taking longer than expected.")

            if (!promptVaultFailureTrackedRef.current) {
              promptVaultFailureTrackedRef.current = true
              trackClientEvent("prompt_vault_access_failed", {
                purchase_type: purchaseType || "prompt_vault",
                session_id: sessionId,
                reason: "network_error",
              })
            }
          }
          return next
        })
      }
    }

    const interval = setInterval(pollPromptVaultAccess, 2000)
    pollPromptVaultAccess()

    return () => clearInterval(interval)
  }, [isPollingPromptVaultAccess, isPromptVaultPurchase, purchaseType, router, sessionId])

  useEffect(() => {
    if (!isPollingSelfieAiPhotosKitAccess || !isSelfieAiPhotosKitPurchase || !sessionId) {
      return
    }

    const pollSelfieAiPhotosKitAccess = async () => {
      try {
        const response = await fetch(
          `/api/selfie-to-ai-photos-kit/access-token?session_id=${encodeURIComponent(sessionId)}`,
          { cache: "no-store" },
        )
        const data = await response.json()

        if (response.ok && data.accessToken) {
          setIsPollingSelfieAiPhotosKitAccess(false)
          setSelfieAiPhotosKitStatus("AI Photos Kit ready. Opening now...")

          if (!selfieAiPhotosKitResolutionTrackedRef.current) {
            selfieAiPhotosKitResolutionTrackedRef.current = true
            trackClientEvent("selfie_ai_photos_kit_access_resolved", {
              purchase_type: purchaseType || "selfie_ai_photos_kit",
              session_id: sessionId,
            })
          }

          setTimeout(() => {
            router.push(`/access/selfie-to-ai-photos-kit/${encodeURIComponent(data.accessToken)}?checkout_session=${encodeURIComponent(sessionId)}`)
          }, 400)
          return
        }

        if (response.status >= 400 && response.status < 500 && response.status !== 409) {
          setIsPollingSelfieAiPhotosKitAccess(false)
          setShowSelfieAiPhotosKitTimeout(true)
          setSelfieAiPhotosKitRecoveryMessage(data.error || "We couldn't verify your AI Photos Kit access yet.")

          if (!selfieAiPhotosKitFailureTrackedRef.current) {
            selfieAiPhotosKitFailureTrackedRef.current = true
            trackClientEvent("selfie_ai_photos_kit_access_failed", {
              purchase_type: purchaseType || "selfie_ai_photos_kit",
              session_id: sessionId,
              reason: data.error || "client_error",
            })
          }
          return
        }

        setSelfieAiPhotosKitPollAttempts((prev) => {
          const next = prev + 1

          if (next < 20) {
            setSelfieAiPhotosKitStatus("Preparing your AI Photos Kit. This can take up to 2 minutes.")
          } else if (next < 40) {
            setSelfieAiPhotosKitStatus("Payment confirmed. Finalizing your Kit access...")
          } else {
            setSelfieAiPhotosKitStatus("Almost there. Your Kit link is still syncing.")
          }

          if (next >= MAX_POLL_ATTEMPTS) {
            setIsPollingSelfieAiPhotosKitAccess(false)
            setShowSelfieAiPhotosKitTimeout(true)
            setSelfieAiPhotosKitRecoveryMessage("Your payment is confirmed. Your AI Photos Kit access is taking longer than expected.")

            if (!selfieAiPhotosKitFailureTrackedRef.current) {
              selfieAiPhotosKitFailureTrackedRef.current = true
              trackClientEvent("selfie_ai_photos_kit_access_failed", {
                purchase_type: purchaseType || "selfie_ai_photos_kit",
                session_id: sessionId,
                reason: "timeout",
              })
            }
          }

          return next
        })
      } catch (error) {
        console.error("[SUCCESS PAGE] AI Photos Kit polling error:", error)
        setSelfieAiPhotosKitPollAttempts((prev) => {
          const next = prev + 1
          if (next >= MAX_POLL_ATTEMPTS) {
            setIsPollingSelfieAiPhotosKitAccess(false)
            setShowSelfieAiPhotosKitTimeout(true)
            setSelfieAiPhotosKitRecoveryMessage("Your payment is confirmed. Your AI Photos Kit access is taking longer than expected.")

            if (!selfieAiPhotosKitFailureTrackedRef.current) {
              selfieAiPhotosKitFailureTrackedRef.current = true
              trackClientEvent("selfie_ai_photos_kit_access_failed", {
                purchase_type: purchaseType || "selfie_ai_photos_kit",
                session_id: sessionId,
                reason: "network_error",
              })
            }
          }
          return next
        })
      }
    }

    const interval = setInterval(pollSelfieAiPhotosKitAccess, 2000)
    pollSelfieAiPhotosKitAccess()

    return () => clearInterval(interval)
  }, [isPollingSelfieAiPhotosKitAccess, isSelfieAiPhotosKitPurchase, purchaseType, router, sessionId])

  useEffect(() => {
    if (!isPollingPresetsAccess || !isPresetsPurchase || !sessionId) {
      return
    }

    const pollPresetsAccess = async () => {
      try {
        const response = await fetch(
          `/api/presets/access-token?session_id=${encodeURIComponent(sessionId)}`,
          { cache: "no-store" },
        )
        const data = await response.json()

        if (response.ok && data.accessToken) {
          setIsPollingPresetsAccess(false)
          setPresetsStatus("SSELFIE Presets ready. Opening now...")

          if (!presetsResolutionTrackedRef.current) {
            presetsResolutionTrackedRef.current = true
            trackClientEvent("presets_access_resolved", {
              purchase_type: purchaseType || "presets",
              session_id: sessionId,
            })
          }

          setTimeout(() => {
            router.push(`/access/presets/${encodeURIComponent(data.accessToken)}?checkout_session=${encodeURIComponent(sessionId)}`)
          }, 400)
          return
        }

        if (response.status >= 400 && response.status < 500 && response.status !== 409) {
          setIsPollingPresetsAccess(false)
          setShowPresetsTimeout(true)
          setPresetsRecoveryMessage(data.error || "We couldn't verify your SSELFIE Presets access yet.")

          if (!presetsFailureTrackedRef.current) {
            presetsFailureTrackedRef.current = true
            trackClientEvent("presets_access_failed", {
              purchase_type: purchaseType || "presets",
              session_id: sessionId,
              reason: data.error || "client_error",
            })
          }
          return
        }

        setPresetsPollAttempts((prev) => {
          const next = prev + 1

          if (next < 20) {
            setPresetsStatus("Preparing your SSELFIE Presets. This can take up to 2 minutes.")
          } else if (next < 40) {
            setPresetsStatus("Payment confirmed. Finalizing your presets access...")
          } else {
            setPresetsStatus("Almost there. Your presets link is still syncing.")
          }

          if (next >= MAX_POLL_ATTEMPTS) {
            setIsPollingPresetsAccess(false)
            setShowPresetsTimeout(true)
            setPresetsRecoveryMessage("Your payment is confirmed. Your SSELFIE Presets access is taking longer than expected.")

            if (!presetsFailureTrackedRef.current) {
              presetsFailureTrackedRef.current = true
              trackClientEvent("presets_access_failed", {
                purchase_type: purchaseType || "presets",
                session_id: sessionId,
                reason: "timeout",
              })
            }
          }

          return next
        })
      } catch (error) {
        console.error("[SUCCESS PAGE] SSELFIE Presets polling error:", error)
        setPresetsPollAttempts((prev) => {
          const next = prev + 1
          if (next >= MAX_POLL_ATTEMPTS) {
            setIsPollingPresetsAccess(false)
            setShowPresetsTimeout(true)
            setPresetsRecoveryMessage("Your payment is confirmed. Your SSELFIE Presets access is taking longer than expected.")

            if (!presetsFailureTrackedRef.current) {
              presetsFailureTrackedRef.current = true
              trackClientEvent("presets_access_failed", {
                purchase_type: purchaseType || "presets",
                session_id: sessionId,
                reason: "network_error",
              })
            }
          }
          return next
        })
      }
    }

    const interval = setInterval(pollPresetsAccess, 2000)
    pollPresetsAccess()

    return () => clearInterval(interval)
  }, [isPollingPresetsAccess, isPresetsPurchase, purchaseType, router, sessionId])

  useEffect(() => {
    if (!isPollingSelfieToBrandShootAccess || !isSelfieToBrandShootPurchase || !sessionId) {
      return
    }

    const pollSelfieToBrandShootAccess = async () => {
      try {
        const response = await fetch(
          `/api/selfie-to-brand-shoot/access-token?session_id=${encodeURIComponent(sessionId)}`,
          { cache: "no-store" },
        )
        const data = await response.json()

        if (response.ok && data.accessToken) {
          setIsPollingSelfieToBrandShootAccess(false)
          setSelfieToBrandShootStatus("Selfie to Brand Shoot ready. Opening now...")

          if (!selfieToBrandShootResolutionTrackedRef.current) {
            selfieToBrandShootResolutionTrackedRef.current = true
            trackClientEvent("selfie_to_brand_shoot_access_resolved", {
              purchase_type: purchaseType || "selfie_to_brand_shoot_system",
              session_id: sessionId,
            })
          }

          setTimeout(() => {
            router.push(`/academy/access/selfie-to-brand-shoot?checkout_session=${encodeURIComponent(sessionId)}`)
          }, 400)
          return
        }

        if (response.status >= 400 && response.status < 500 && response.status !== 409) {
          setIsPollingSelfieToBrandShootAccess(false)
          setShowSelfieToBrandShootTimeout(true)
          setSelfieToBrandShootRecoveryMessage(data.error || "We couldn't verify your Selfie to Brand Shoot access yet.")

          if (!selfieToBrandShootFailureTrackedRef.current) {
            selfieToBrandShootFailureTrackedRef.current = true
            trackClientEvent("selfie_to_brand_shoot_access_failed", {
              purchase_type: purchaseType || "selfie_to_brand_shoot_system",
              session_id: sessionId,
              reason: data.error || "client_error",
            })
          }
          return
        }

        setSelfieToBrandShootPollAttempts((prev) => {
          const next = prev + 1

          if (next < 20) {
            setSelfieToBrandShootStatus("Preparing your Selfie to Brand Shoot System. This can take up to 2 minutes.")
          } else if (next < 40) {
            setSelfieToBrandShootStatus("Payment confirmed. Finalizing your system access...")
          } else {
            setSelfieToBrandShootStatus("Almost there. Your system link is still syncing.")
          }

          if (next >= MAX_POLL_ATTEMPTS) {
            setIsPollingSelfieToBrandShootAccess(false)
            setShowSelfieToBrandShootTimeout(true)
            setSelfieToBrandShootRecoveryMessage("Your payment is confirmed. Your Selfie to Brand Shoot access is taking longer than expected.")

            if (!selfieToBrandShootFailureTrackedRef.current) {
              selfieToBrandShootFailureTrackedRef.current = true
              trackClientEvent("selfie_to_brand_shoot_access_failed", {
                purchase_type: purchaseType || "selfie_to_brand_shoot_system",
                session_id: sessionId,
                reason: "timeout",
              })
            }
          }

          return next
        })
      } catch (error) {
        console.error("[SUCCESS PAGE] Selfie to Brand Shoot polling error:", error)
        setSelfieToBrandShootPollAttempts((prev) => {
          const next = prev + 1
          if (next >= MAX_POLL_ATTEMPTS) {
            setIsPollingSelfieToBrandShootAccess(false)
            setShowSelfieToBrandShootTimeout(true)
            setSelfieToBrandShootRecoveryMessage("Your payment is confirmed. Your Selfie to Brand Shoot access is taking longer than expected.")

            if (!selfieToBrandShootFailureTrackedRef.current) {
              selfieToBrandShootFailureTrackedRef.current = true
              trackClientEvent("selfie_to_brand_shoot_access_failed", {
                purchase_type: purchaseType || "selfie_to_brand_shoot_system",
                session_id: sessionId,
                reason: "network_error",
              })
            }
          }
          return next
        })
      }
    }

    const interval = setInterval(pollSelfieToBrandShootAccess, 2000)
    pollSelfieToBrandShootAccess()

    return () => clearInterval(interval)
  }, [isPollingSelfieToBrandShootAccess, isSelfieToBrandShootPurchase, purchaseType, router, sessionId])

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

  // GA4 purchase conversion event - fires once per unique session_id
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
      prompt_vault: 37,
      selfie_ai_photos_kit: 37,
      selfie_to_brand_shoot_system: 197,
      masterclass: 147,
      visibility_suite: 97,
      what_to_say: 47,
      show_up: 67,
      get_paid: 97,
      concept_cards_pack: 29,
      caption_sprint: 29,
      feed_reset_9grid: 49,
      ai_photo_refresh: 59,
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
      <div className="min-h-screen bg-brand-obsidian flex flex-col items-center justify-center min-h-[400px] space-y-4 p-4">
        <LoadingSpinner size="lg" />
        <p className="text-lg font-medium text-brand-porcelain">{selfieGuideStatus}</p>
        <p className="text-sm text-brand-pearl">
          Estimated time remaining: {Math.max(0, 120 - (selfieGuidePollAttempts * 2))}s
        </p>
        <div className="w-64 bg-[color:var(--glass-bg)] rounded-full h-2">
          <div
            className="bg-brand-whisper h-2 rounded-full transition-all duration-1000"
            style={{ width: `${(selfieGuidePollAttempts / MAX_POLL_ATTEMPTS) * 100}%` }}
          />
        </div>
      </div>
    )
  }

  if (showSelfieGuideTimeout && isSelfieGuidePurchase) {
    return (
      <div className="min-h-screen bg-brand-obsidian flex flex-col items-center justify-center space-y-6 p-6">
        <div className="bg-[color:var(--glass-bg)] backdrop-blur-[50px] border border-[color:var(--div-dark)] rounded-2xl p-8 max-w-md w-full text-center space-y-4">
          <h2 className="font-['Cormorant_Garamond'] font-light text-3xl text-brand-porcelain">
            Your guide is still syncing
          </h2>
          <p className="text-brand-pearl max-w-md">{selfieGuideRecoveryMessage}</p>
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
            className="bg-brand-whisper text-brand-obsidian font-medium tracking-[0.15em] uppercase text-xs px-6 py-3 rounded-full hover:bg-brand-porcelain transition-colors"
          >
            Try Again
          </Button>
          <Button
            asChild
            variant="outline"
            className="border-[color:var(--div-dark)] text-brand-porcelain tracking-[0.15em] uppercase text-xs px-6 py-3 rounded-full hover:bg-[color:var(--glass-bg)] transition-colors"
          >
            <a href="mailto:support@sselfie.ai?subject=Selfie%20Guide%20access%20help">Email Support</a>
          </Button>
        </div>
      </div>
    )
  }

  if (isPollingPromptVaultAccess && isPromptVaultPurchase) {
    return (
      <div className="min-h-screen bg-brand-obsidian flex flex-col items-center justify-center min-h-[400px] space-y-4 p-4">
        <LoadingSpinner size="lg" />
        <p className="text-lg font-medium text-brand-porcelain">{promptVaultStatus}</p>
        <p className="text-sm text-brand-pearl">
          Estimated time remaining: {Math.max(0, 120 - (promptVaultPollAttempts * 2))}s
        </p>
        <div className="w-64 bg-[color:var(--glass-bg)] rounded-full h-2">
          <div
            className="bg-brand-whisper h-2 rounded-full transition-all duration-1000"
            style={{ width: `${(promptVaultPollAttempts / MAX_POLL_ATTEMPTS) * 100}%` }}
          />
        </div>
      </div>
    )
  }

  if (showPromptVaultTimeout && isPromptVaultPurchase) {
    return (
      <div className="min-h-screen bg-brand-obsidian flex flex-col items-center justify-center space-y-6 p-6">
        <div className="bg-[color:var(--glass-bg)] backdrop-blur-[50px] border border-[color:var(--div-dark)] rounded-2xl p-8 max-w-md w-full text-center space-y-4">
          <h2 className="font-['Cormorant_Garamond'] font-light text-3xl text-brand-porcelain">
            Your vault is still syncing
          </h2>
          <p className="text-brand-pearl max-w-md">{promptVaultRecoveryMessage}</p>
          <p className="text-sm text-brand-pearl">
            Your access link is also sent by email after payment.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            onClick={() => {
              setShowPromptVaultTimeout(false)
              setPromptVaultPollAttempts(0)
              setPromptVaultStatus("Preparing your Prompt Vault. This can take up to 2 minutes.")
              setIsPollingPromptVaultAccess(true)
            }}
            variant="default"
            className="bg-brand-whisper text-brand-obsidian font-medium tracking-[0.15em] uppercase text-xs px-6 py-3 rounded-full hover:bg-brand-porcelain transition-colors"
          >
            Try Again
          </Button>
          <Button
            asChild
            variant="outline"
            className="border-[color:var(--div-dark)] text-brand-porcelain tracking-[0.15em] uppercase text-xs px-6 py-3 rounded-full hover:bg-[color:var(--glass-bg)] transition-colors"
          >
            <a href="mailto:support@sselfie.ai?subject=Prompt%20Vault%20access%20help">Email Support</a>
          </Button>
        </div>
      </div>
    )
  }

  if (isPollingSelfieAiPhotosKitAccess && isSelfieAiPhotosKitPurchase) {
    return (
      <div className="min-h-screen bg-brand-obsidian flex flex-col items-center justify-center min-h-[400px] space-y-4 p-4">
        <LoadingSpinner size="lg" />
        <p className="text-lg font-medium text-brand-porcelain">{selfieAiPhotosKitStatus}</p>
        <p className="text-sm text-brand-pearl">
          Estimated time remaining: {Math.max(0, 120 - (selfieAiPhotosKitPollAttempts * 2))}s
        </p>
        <div className="w-64 bg-[color:var(--glass-bg)] rounded-full h-2">
          <div
            className="bg-brand-whisper h-2 rounded-full transition-all duration-1000"
            style={{ width: `${(selfieAiPhotosKitPollAttempts / MAX_POLL_ATTEMPTS) * 100}%` }}
          />
        </div>
      </div>
    )
  }

  if (showSelfieAiPhotosKitTimeout && isSelfieAiPhotosKitPurchase) {
    return (
      <div className="min-h-screen bg-brand-obsidian flex flex-col items-center justify-center space-y-6 p-6">
        <div className="bg-[color:var(--glass-bg)] backdrop-blur-[50px] border border-[color:var(--div-dark)] rounded-2xl p-8 max-w-md w-full text-center space-y-4">
          <h2 className="font-['Cormorant_Garamond'] font-light text-3xl text-brand-porcelain">
            Your Kit is still syncing
          </h2>
          <p className="text-brand-pearl max-w-md">{selfieAiPhotosKitRecoveryMessage}</p>
          <p className="text-sm text-brand-pearl">
            Your access link is also sent by email after payment.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            onClick={() => {
              setShowSelfieAiPhotosKitTimeout(false)
              setSelfieAiPhotosKitPollAttempts(0)
              setSelfieAiPhotosKitStatus("Preparing your AI Photos Kit. This can take up to 2 minutes.")
              setIsPollingSelfieAiPhotosKitAccess(true)
            }}
            variant="default"
            className="bg-brand-whisper text-brand-obsidian font-medium tracking-[0.15em] uppercase text-xs px-6 py-3 rounded-full hover:bg-brand-porcelain transition-colors"
          >
            Try Again
          </Button>
          <Button
            asChild
            variant="outline"
            className="border-[color:var(--div-dark)] text-brand-porcelain tracking-[0.15em] uppercase text-xs px-6 py-3 rounded-full hover:bg-[color:var(--glass-bg)] transition-colors"
          >
            <a href="mailto:support@sselfie.ai?subject=AI%20Photos%20Kit%20access%20help">Email Support</a>
          </Button>
        </div>
      </div>
    )
  }

  if (isPollingPresetsAccess && isPresetsPurchase) {
    return (
      <div className="min-h-screen bg-brand-obsidian flex flex-col items-center justify-center min-h-[400px] space-y-4 p-4">
        <LoadingSpinner size="lg" />
        <p className="text-lg font-medium text-brand-porcelain">{presetsStatus}</p>
        <p className="text-sm text-brand-pearl">
          Estimated time remaining: {Math.max(0, 120 - (presetsPollAttempts * 2))}s
        </p>
        <div className="w-64 bg-[color:var(--glass-bg)] rounded-full h-2">
          <div
            className="bg-brand-whisper h-2 rounded-full transition-all duration-1000"
            style={{ width: `${(presetsPollAttempts / MAX_POLL_ATTEMPTS) * 100}%` }}
          />
        </div>
      </div>
    )
  }

  if (showPresetsTimeout && isPresetsPurchase) {
    return (
      <div className="min-h-screen bg-brand-obsidian flex flex-col items-center justify-center space-y-6 p-6">
        <div className="bg-[color:var(--glass-bg)] backdrop-blur-[50px] border border-[color:var(--div-dark)] rounded-2xl p-8 max-w-md w-full text-center space-y-4">
          <h2 className="font-['Cormorant_Garamond'] font-light text-3xl text-brand-porcelain">
            Your presets are still syncing
          </h2>
          <p className="text-brand-pearl max-w-md">{presetsRecoveryMessage}</p>
          <p className="text-sm text-brand-pearl">
            Your access link is also sent by email after payment.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            onClick={() => {
              setShowPresetsTimeout(false)
              setPresetsPollAttempts(0)
              setPresetsStatus("Preparing your SSELFIE Presets. This can take up to 2 minutes.")
              setIsPollingPresetsAccess(true)
            }}
            variant="default"
            className="bg-brand-whisper text-brand-obsidian font-medium tracking-[0.15em] uppercase text-xs px-6 py-3 rounded-full hover:bg-brand-porcelain transition-colors"
          >
            Try Again
          </Button>
          <Button
            asChild
            variant="outline"
            className="border-[color:var(--div-dark)] text-brand-porcelain tracking-[0.15em] uppercase text-xs px-6 py-3 rounded-full hover:bg-[color:var(--glass-bg)] transition-colors"
          >
            <a href="mailto:support@sselfie.ai?subject=SSELFIE%20Presets%20access%20help">Email Support</a>
          </Button>
        </div>
      </div>
    )
  }

  if (isPollingSelfieToBrandShootAccess && isSelfieToBrandShootPurchase) {
    return (
      <div className="min-h-screen bg-brand-obsidian flex flex-col items-center justify-center min-h-[400px] space-y-4 p-4">
        <LoadingSpinner size="lg" />
        <p className="text-lg font-medium text-brand-porcelain">{selfieToBrandShootStatus}</p>
        <p className="text-sm text-brand-pearl">
          Estimated time remaining: {Math.max(0, 120 - (selfieToBrandShootPollAttempts * 2))}s
        </p>
        <div className="w-64 bg-[color:var(--glass-bg)] rounded-full h-2">
          <div
            className="bg-brand-whisper h-2 rounded-full transition-all duration-1000"
            style={{ width: `${(selfieToBrandShootPollAttempts / MAX_POLL_ATTEMPTS) * 100}%` }}
          />
        </div>
      </div>
    )
  }

  if (showSelfieToBrandShootTimeout && isSelfieToBrandShootPurchase) {
    return (
      <div className="min-h-screen bg-brand-obsidian flex flex-col items-center justify-center space-y-6 p-6">
        <div className="bg-[color:var(--glass-bg)] backdrop-blur-[50px] border border-[color:var(--div-dark)] rounded-2xl p-8 max-w-md w-full text-center space-y-4">
          <h2 className="font-['Cormorant_Garamond'] font-light text-3xl text-brand-porcelain">
            Your system is still syncing
          </h2>
          <p className="text-brand-pearl max-w-md">{selfieToBrandShootRecoveryMessage}</p>
          <p className="text-sm text-brand-pearl">
            Your access link is also sent by email after payment.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            onClick={() => {
              setShowSelfieToBrandShootTimeout(false)
              setSelfieToBrandShootPollAttempts(0)
              setSelfieToBrandShootStatus("Preparing your Selfie to Brand Shoot System. This can take up to 2 minutes.")
              setIsPollingSelfieToBrandShootAccess(true)
            }}
            variant="default"
            className="bg-brand-whisper text-brand-obsidian font-medium tracking-[0.15em] uppercase text-xs px-6 py-3 rounded-full hover:bg-brand-porcelain transition-colors"
          >
            Try Again
          </Button>
          <Button
            asChild
            variant="outline"
            className="border-[color:var(--div-dark)] text-brand-porcelain tracking-[0.15em] uppercase text-xs px-6 py-3 rounded-full hover:bg-[color:var(--glass-bg)] transition-colors"
          >
            <a href="mailto:support@sselfie.ai?subject=Selfie%20to%20Brand%20Shoot%20access%20help">Email Support</a>
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
      <div className="min-h-screen bg-brand-obsidian flex flex-col items-center justify-center min-h-[400px] space-y-4 p-4">
        <LoadingSpinner size="lg" />
        <p className="text-lg font-medium text-brand-porcelain">{pollingMessage}</p>
        <p className="text-sm text-brand-pearl">
          {timeRemaining > 0 ? `Estimated time remaining: ${timeRemaining}s` : "Please wait..."}
        </p>
        <div className="w-64 bg-[color:var(--glass-bg)] rounded-full h-2">
          <div
            className="bg-brand-whisper h-2 rounded-full transition-all duration-1000"
            style={{ width: `${(pollAttempts / MAX_POLL_ATTEMPTS) * 100}%` }}
          />
        </div>
      </div>
    )
  }

  // Show timeout actions
  if (showTimeoutActions && purchaseType === "paid_blueprint") {
    return (
      <div className="min-h-screen bg-brand-obsidian flex flex-col items-center justify-center space-y-6 p-6">
        <div className="bg-[color:var(--glass-bg)] backdrop-blur-[50px] border border-[color:var(--div-dark)] rounded-2xl p-8 max-w-md w-full text-center space-y-4">
          <h2 className="font-['Cormorant_Garamond'] font-light text-3xl text-brand-porcelain">
            Payment Processing
          </h2>
          <p className="text-brand-pearl max-w-md">
            Your payment was successful. Access is syncing and should complete within a few minutes.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            onClick={() => window.location.reload()}
            variant="default"
            className="bg-brand-whisper text-brand-obsidian font-medium tracking-[0.15em] uppercase text-xs px-6 py-3 rounded-full hover:bg-brand-porcelain transition-colors"
          >
            Refresh Status
          </Button>
          <Button
            onClick={() => router.push('/feed-planner?purchase=success')}
            variant="outline"
            className="border-[color:var(--div-dark)] text-brand-porcelain tracking-[0.15em] uppercase text-xs px-6 py-3 rounded-full hover:bg-[color:var(--glass-bg)] transition-colors"
          >
            Continue to Feed Planner
          </Button>
        </div>
        <p className="text-sm text-brand-pearl">
          If access is not available after 5 minutes, please{" "}
          <a href="mailto:support@sselfie.ai" className="underline text-brand-pearl hover:text-white">
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

      // Redirect directly to the product - session is now active in cookies
      router.push(successAction.href)
    } catch {
      setError("Something went wrong. Please try again.")
      setIsSubmitting(false)
    }
  }

  if (purchaseType === "credit_topup") {
    return (
      <div className="min-h-screen bg-brand-obsidian">
        <div className="relative h-[40vh] sm:h-[50vh] overflow-hidden">
          <Image
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/_%20%2842%29-7c6UXso773x523qKCiuawGNpuzsx8n.jpeg"
            fill
            alt="Credits Added"
            className="object-cover object-center"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-brand-obsidian/60 via-brand-obsidian/30 to-brand-obsidian" />

          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
            <div className="font-['Cormorant_Garamond'] font-light text-xl sm:text-2xl md:text-3xl lg:text-4xl tracking-[0.3em] sm:tracking-[0.2em] uppercase text-brand-porcelain mb-3 sm:mb-4">
              CREDITS ADDED
            </div>
            <p className="text-sm sm:text-base md:text-lg text-brand-whisper font-light max-w-md">
              Your credits are ready to use
            </p>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 md:py-16">
          <div className="text-center mb-8 sm:mb-12">
            <h1 className="font-['Cormorant_Garamond'] font-light text-xl sm:text-2xl md:text-3xl lg:text-4xl tracking-[0.15em] sm:tracking-[0.2em] uppercase text-brand-porcelain mb-3 sm:mb-4 px-2">
              ALL SET
            </h1>
            <p className="text-sm sm:text-base text-brand-pearl font-light leading-relaxed max-w-xl mx-auto px-4">
              Your credits have been added to your account. Redirecting you back to Feed Planner...
            </p>
          </div>

          <div className="text-center">
            <button
              onClick={() => router.push("/feed-planner")}
              className="bg-brand-whisper text-brand-obsidian font-medium tracking-[0.15em] uppercase text-xs px-8 sm:px-12 py-3 sm:py-4 rounded-full hover:bg-brand-porcelain transition-colors min-h-[44px]"
            >
              Open Feed Planner
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Fix #1: Paid blueprint now uses same flow as other products
  // Authenticated users auto-redirect (via checkAuth useEffect)
  // Unauthenticated users see account creation form below

  if (!userInfo && sessionId) {
    return (
      <div className="min-h-screen bg-brand-obsidian flex items-center justify-center p-4">
        <div className="text-center">
          <div className="font-['Cormorant_Garamond'] font-light text-xl sm:text-2xl tracking-[0.3em] sm:tracking-[0.2em] uppercase text-brand-porcelain mb-4 animate-pulse">
            PREPARING YOUR PURCHASE
          </div>
          <div className="text-xs sm:text-sm text-brand-pearl font-light">Finalizing everything for you...</div>
        </div>
      </div>
    )
  }

  if (!userInfo && !initialEmail) {
    return (
      <div className="min-h-screen bg-brand-obsidian flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-2xl text-center">
          <div className="font-['Cormorant_Garamond'] font-light text-3xl sm:text-4xl md:text-5xl lg:text-4xl tracking-[0.3em] sm:tracking-[0.2em] uppercase text-brand-porcelain mb-4 sm:mb-6">
            PAYMENT PENDING
          </div>
          <p className="text-sm sm:text-base text-brand-pearl font-light leading-relaxed mb-6 sm:mb-8 px-4">
            Your payment is being processed. Check your email for confirmation.
          </p>
          <button
            onClick={() => router.push("/")}
            className="bg-brand-whisper text-brand-obsidian font-medium tracking-[0.15em] uppercase text-xs px-6 sm:px-8 py-3 sm:py-4 rounded-full hover:bg-brand-porcelain transition-colors min-h-[44px]"
          >
            Return Home
          </button>
        </div>
      </div>
    )
  }

  if (userInfo && !userInfo.hasAccount && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-brand-obsidian">
        <div className="relative h-[40vh] sm:h-[50vh] md:h-[60vh] overflow-hidden">
          <Image
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/_%20%2842%29-7c6UXso773x523qKCiuawGNpuzsx8n.jpeg"
            fill
            alt="Welcome to SSELFIE"
            className="object-cover object-center"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-brand-obsidian/60 via-brand-obsidian/30 to-brand-obsidian" />

          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
            <div className="font-['Cormorant_Garamond'] font-light text-xl sm:text-2xl md:text-3xl lg:text-4xl tracking-[0.3em] sm:tracking-[0.2em] uppercase text-brand-porcelain mb-3 sm:mb-4">
              S S E L F I E
            </div>
            <p className="text-sm sm:text-base md:text-lg text-brand-whisper font-light max-w-md">You&apos;re in</p>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 md:py-16">
          <div className="text-center mb-8 sm:mb-12">
            <h1 className="font-['Cormorant_Garamond'] font-light text-xl sm:text-2xl md:text-3xl lg:text-4xl tracking-[0.15em] sm:tracking-[0.2em] uppercase text-brand-porcelain mb-3 sm:mb-4 px-2">
              LET&apos;S GET YOU STARTED
            </h1>
            <p className="text-sm sm:text-base text-brand-pearl font-light leading-relaxed max-w-xl mx-auto px-4">
              {resolvedProductType === "visibility_suite"
                ? "Your purchase is ready. Create your password so you can access your legacy academy purchase anytime."
                : "Add your password so you can open everything inside SSELFIE. This takes less than a minute."}
            </p>
          </div>

          <div className="bg-[color:var(--glass-bg)] backdrop-blur-[50px] border border-[color:var(--div-dark)] rounded-2xl p-6 sm:p-8 md:p-10">
            <form onSubmit={handleCompleteAccount} className="space-y-5 sm:space-y-6">
              <div>
                <label
                  htmlFor="name"
                  className="block text-xs sm:text-sm text-brand-pearl font-light tracking-[0.3em] uppercase mb-2"
                >
                  Your Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-4 py-3 sm:py-4 bg-[color:var(--glass-bg)] border border-[color:var(--div-dark)] rounded-xl focus:border-stone focus:outline-none transition-colors text-sm sm:text-base text-brand-porcelain font-light placeholder:text-white/40"
                  placeholder="What should we call you?"
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-xs sm:text-sm text-brand-pearl font-light tracking-[0.3em] uppercase mb-2"
                >
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={userInfo.email || initialEmail}
                  disabled
                  className="w-full px-4 py-3 sm:py-4 bg-[color:var(--glass-bg)] border border-[color:var(--div-dark)] rounded-xl text-brand-pearl text-sm sm:text-base font-light"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-xs sm:text-sm text-brand-pearl font-light tracking-[0.3em] uppercase mb-2"
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
                  className="w-full px-4 py-3 sm:py-4 bg-[color:var(--glass-bg)] border border-[color:var(--div-dark)] rounded-xl focus:border-stone focus:outline-none transition-colors text-sm sm:text-base text-brand-porcelain font-light placeholder:text-white/40"
                  placeholder="At least 8 characters"
                />
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-xs sm:text-sm text-brand-pearl font-light tracking-[0.3em] uppercase mb-2"
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
                  className="w-full px-4 py-3 sm:py-4 bg-[color:var(--glass-bg)] border border-[color:var(--div-dark)] rounded-xl focus:border-stone focus:outline-none transition-colors text-sm sm:text-base text-brand-porcelain font-light placeholder:text-white/40"
                  placeholder="One more time"
                />
              </div>

              {error && (
                <div className="bg-[color:var(--glass-bg)] border border-[color:var(--div-dark)] rounded-xl p-3 sm:p-4">
                  <p className="text-xs sm:text-sm text-brand-porcelain font-light">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-brand-whisper text-brand-obsidian font-medium tracking-[0.15em] uppercase text-xs px-6 py-3 sm:py-4 rounded-full hover:bg-brand-porcelain transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
              >
                {isSubmitting
                  ? "SETTING UP..."
                  : resolvedProductType === "visibility_suite"
                    ? "CREATE PASSWORD AND OPEN MY SUITE"
                    : "LET'S GO"}
              </button>

              <p className="text-[10px] sm:text-xs text-brand-pearl font-light text-center leading-relaxed">
                By continuing, you agree to our Terms of Service and Privacy Policy
              </p>
            </form>
          </div>

          <div className="mt-6 sm:mt-8 text-center">
            <p className="text-xs sm:text-sm text-brand-pearl font-light leading-relaxed">
              Check your email for your receipt and welcome message from Sandra
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brand-obsidian">
      <div className="relative h-[40vh] sm:h-[50vh] md:h-[60vh] overflow-hidden">
        <Image
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/_%20%2842%29-7c6UXso773x523qKCiuawGNpuzsx8n.jpeg"
          fill
          alt="Welcome to SSELFIE"
          className="object-cover object-center"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-brand-obsidian/60 via-brand-obsidian/30 to-brand-obsidian" />

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
          <div className="font-['Cormorant_Garamond'] font-light text-xl sm:text-2xl md:text-3xl lg:text-4xl tracking-[0.3em] sm:tracking-[0.2em] uppercase text-brand-porcelain mb-3 sm:mb-4">
            S S E L F I E
          </div>
          <p className="text-sm sm:text-base md:text-lg text-brand-whisper font-light max-w-md">
            {isAuthenticated ? "Welcome back" : "You're in"}
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 md:py-16">
        {!userInfo.hasAccount && !isAuthenticated ? (
          <>
            <div className="text-center mb-8 sm:mb-12">
              <h1 className="font-['Cormorant_Garamond'] font-light text-xl sm:text-2xl md:text-3xl lg:text-4xl tracking-[0.15em] sm:tracking-[0.2em] uppercase text-brand-porcelain mb-3 sm:mb-4 px-2">
                LET&apos;S GET YOU STARTED
              </h1>
              <p className="text-sm sm:text-base text-brand-pearl font-light leading-relaxed max-w-xl mx-auto px-4">
                Add your password so you can open everything inside SSELFIE. This takes less than a minute.
              </p>
            </div>

            <div className="bg-[color:var(--glass-bg)] backdrop-blur-[50px] border border-[color:var(--div-dark)] rounded-2xl p-6 sm:p-8 md:p-10">
              <form onSubmit={handleCompleteAccount} className="space-y-5 sm:space-y-6">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-xs sm:text-sm text-brand-pearl font-light tracking-[0.3em] uppercase mb-2"
                  >
                    Your Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full px-4 py-3 sm:py-4 bg-[color:var(--glass-bg)] border border-[color:var(--div-dark)] rounded-xl focus:border-stone focus:outline-none transition-colors text-sm sm:text-base text-brand-porcelain font-light placeholder:text-white/40"
                    placeholder="What should we call you?"
                  />
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="block text-xs sm:text-sm text-brand-pearl font-light tracking-[0.3em] uppercase mb-2"
                  >
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={userInfo.email || initialEmail}
                    disabled
                    className="w-full px-4 py-3 sm:py-4 bg-[color:var(--glass-bg)] border border-[color:var(--div-dark)] rounded-xl text-brand-pearl text-sm sm:text-base font-light"
                  />
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="block text-xs sm:text-sm text-brand-pearl font-light tracking-[0.3em] uppercase mb-2"
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
                    className="w-full px-4 py-3 sm:py-4 bg-[color:var(--glass-bg)] border border-[color:var(--div-dark)] rounded-xl focus:border-stone focus:outline-none transition-colors text-sm sm:text-base text-brand-porcelain font-light placeholder:text-white/40"
                    placeholder="At least 8 characters"
                  />
                </div>

                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="block text-xs sm:text-sm text-brand-pearl font-light tracking-[0.3em] uppercase mb-2"
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
                    className="w-full px-4 py-3 sm:py-4 bg-[color:var(--glass-bg)] border border-[color:var(--div-dark)] rounded-xl focus:border-stone focus:outline-none transition-colors text-sm sm:text-base text-brand-porcelain font-light placeholder:text-white/40"
                    placeholder="One more time"
                  />
                </div>

                {error && (
                  <div className="bg-[color:var(--glass-bg)] border border-[color:var(--div-dark)] rounded-xl p-3 sm:p-4">
                    <p className="text-xs sm:text-sm text-brand-porcelain font-light">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-brand-whisper text-brand-obsidian font-medium tracking-[0.15em] uppercase text-xs px-6 py-3 sm:py-4 rounded-full hover:bg-brand-porcelain transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                >
                  {isSubmitting ? "SETTING UP..." : "LET'S GO"}
                </button>

                <p className="text-[10px] sm:text-xs text-brand-pearl font-light text-center leading-relaxed">
                  By continuing, you agree to our Terms of Service and Privacy Policy
                </p>
              </form>
            </div>

            <div className="mt-6 sm:mt-8 text-center">
              <p className="text-xs sm:text-sm text-brand-pearl font-light leading-relaxed">
                Check your email for your receipt and welcome message from Sandra
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="text-center mb-8 sm:mb-12">
              <h1 className="font-['Cormorant_Garamond'] font-light text-xl sm:text-2xl md:text-3xl lg:text-4xl tracking-[0.15em] sm:tracking-[0.2em] uppercase text-brand-porcelain mb-3 sm:mb-4 px-2">
                {isAuthenticated ? "YOU'RE ALL SET" : "ORDER CONFIRMED"}
              </h1>
              <p className="text-sm sm:text-base text-brand-pearl font-light leading-relaxed max-w-xl mx-auto px-4">
                {isPollingAccess
                  ? `Setting up your paid access... (${pollAttempts + 1}/${MAX_POLL_ATTEMPTS})`
                  : isAuthenticated
                    ? successAction.helper
                    : "Check your email for next steps."}
              </p>
            </div>

            <div className="bg-[color:var(--glass-bg)] backdrop-blur-[50px] border border-[color:var(--div-dark)] rounded-2xl p-6 sm:p-8 md:p-10 mb-6 sm:mb-8">
              <h2 className="font-['Cormorant_Garamond'] font-light text-lg sm:text-xl tracking-[0.2em] uppercase text-brand-porcelain mb-6 sm:mb-8">
                ORDER DETAILS
              </h2>
              <div className="space-y-4 sm:space-y-5">
                <div className="flex justify-between items-center pb-4 border-b border-[color:var(--div-dark)]">
                  <span className="text-xs sm:text-sm text-brand-pearl font-light tracking-[0.3em] uppercase">Product</span>
                  <span className="text-sm sm:text-base text-brand-porcelain font-light">
                    {getProductLabel(resolvedProductType)}
                  </span>
                </div>
                {resolvedProductType === "visibility_suite" && (
                  <div className="flex justify-between items-start pb-4 border-b border-[color:var(--div-dark)]">
                    <span className="text-xs sm:text-sm text-brand-pearl font-light tracking-[0.3em] uppercase">Included</span>
                    <div className="text-right space-y-1">
                      {VISIBILITY_SUITE_INCLUDES.map(item => (
                        <p key={item} className="text-sm sm:text-base text-brand-porcelain font-light">{item}</p>
                      ))}
                    </div>
                  </div>
                )}
                {resolvedProductType === "starter_kit" && (
                  <div className="flex justify-between items-start pb-4 border-b border-[color:var(--div-dark)]">
                    <span className="text-xs sm:text-sm text-brand-pearl font-light tracking-[0.3em] uppercase">Included</span>
                    <div className="text-right space-y-1">
                      {STARTER_KIT_INCLUDES.map(item => (
                        <p key={item} className="text-sm sm:text-base text-brand-porcelain font-light">{item}</p>
                      ))}
                    </div>
                  </div>
                )}
                {resolvedProductType === "prompt_vault" && (
                  <div className="flex justify-between items-start pb-4 border-b border-[color:var(--div-dark)]">
                    <span className="text-xs sm:text-sm text-brand-pearl font-light tracking-[0.3em] uppercase">Included</span>
                    <div className="text-right space-y-1">
                      {PROMPT_VAULT_INCLUDES.map(item => (
                        <p key={item} className="text-sm sm:text-base text-brand-porcelain font-light">{item}</p>
                      ))}
                    </div>
                  </div>
                )}
                {resolvedProductType === "selfie_ai_photos_kit" && (
                  <div className="flex justify-between items-start pb-4 border-b border-[color:var(--div-dark)]">
                    <span className="text-xs sm:text-sm text-brand-pearl font-light tracking-[0.3em] uppercase">Included</span>
                    <div className="text-right space-y-1">
                      {SELFIE_AI_PHOTOS_KIT_INCLUDES.map(item => (
                        <p key={item} className="text-sm sm:text-base text-brand-porcelain font-light">{item}</p>
                      ))}
                    </div>
                  </div>
                )}
                {(resolvedProductType === "presets_single" || resolvedProductType === "presets_bundle") && (
                  <div className="flex justify-between items-start pb-4 border-b border-[color:var(--div-dark)]">
                    <span className="text-xs sm:text-sm text-brand-pearl font-light tracking-[0.3em] uppercase">Included</span>
                    <div className="text-right space-y-1">
                      {PRESETS_INCLUDES.map(item => (
                        <p key={item} className="text-sm sm:text-base text-brand-porcelain font-light">{item}</p>
                      ))}
                    </div>
                  </div>
                )}
                {resolvedProductType === "selfie_to_brand_shoot_system" && (
                  <div className="flex justify-between items-start pb-4 border-b border-[color:var(--div-dark)]">
                    <span className="text-xs sm:text-sm text-brand-pearl font-light tracking-[0.3em] uppercase">Included</span>
                    <div className="text-right space-y-1">
                      {SELFIE_TO_BRAND_SHOOT_INCLUDES.map(item => (
                        <p key={item} className="text-sm sm:text-base text-brand-porcelain font-light">{item}</p>
                      ))}
                    </div>
                  </div>
                )}
                {userInfo.credits && Number(userInfo.credits) > 0 && CREDIT_GRANTING_TYPES.has(resolvedProductType) && (
                  <div className="flex justify-between items-center pb-4 border-b border-[color:var(--div-dark)]">
                    <span className="text-xs sm:text-sm text-brand-pearl font-light tracking-[0.3em] uppercase">
                      {resolvedProductType === "sselfie_studio_membership" ? "Monthly Credits" : "Credits Included"}
                    </span>
                    <span className="text-sm sm:text-base text-brand-porcelain font-light">{userInfo.credits} credits</span>
                  </div>
                )}
                <div className="flex justify-between items-center pb-4 border-b border-[color:var(--div-dark)]">
                  <span className="text-xs sm:text-sm text-brand-pearl font-light tracking-[0.3em] uppercase">Email</span>
                  <span className="text-sm sm:text-base text-brand-porcelain font-light">
                    {userInfo.email || initialEmail}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs sm:text-sm text-brand-pearl font-light tracking-[0.3em] uppercase">Status</span>
                  <span className="text-sm sm:text-base text-brand-pearl font-light">Active</span>
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
                    // Account exists but not logged in in this browser - send to login with returnTo
                    router.push(`/auth/login?returnTo=${encodeURIComponent(successAction.href)}`)
                  } else {
                    router.push(successAction.href)
                  }
                }}
                className="bg-brand-whisper text-brand-obsidian font-medium tracking-[0.15em] uppercase text-xs px-8 sm:px-12 py-3 sm:py-4 rounded-full hover:bg-brand-porcelain transition-colors min-h-[44px]"
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
                    className="text-[10px] sm:text-xs text-brand-whisper font-light uppercase tracking-[0.2em] underline underline-offset-4"
                  >
                    {successAction.secondaryLabel}
                  </button>
                </div>
              ) : null}
              <p className="text-[10px] sm:text-xs text-brand-pearl font-light mt-4 sm:mt-6">
                A confirmation email has been sent to {userInfo.email || initialEmail}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
