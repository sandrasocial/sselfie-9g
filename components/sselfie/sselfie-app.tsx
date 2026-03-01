"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  Camera,
  User,
  Aperture,
  Grid,
  MessageCircle,
  ImageIcon,
  Settings,
  MoreVertical,
  LogOut,
  LayoutGrid,
  FileText,
} from "lucide-react"
import LoadingScreen from "./loading-screen"
import OnboardingWizard from "./onboarding-wizard"
import BlueprintWelcomeWizard from "./blueprint-welcome-wizard"
// UnifiedOnboardingWizard is now handled exclusively by feed-planner-client.tsx
import MayaChatScreen from "./maya-chat-screen"
import GalleryScreen from "./gallery-screen"
// Note: B-Roll functionality is accessible via Maya Videos tab (b-roll-screen.tsx kept for reference)
import AcademyScreen from "./academy-screen"
import AccountScreen from "./account-screen"
import { FeedPlannerClient } from "../feed-planner" // Use FeedPlannerClient to include wizard logic
import { InstallPrompt } from "./install-prompt"
import { InstallButton } from "./install-button"
import { ServiceWorkerProvider } from "./service-worker-provider"
import BuyCreditsModal from "./buy-credits-modal"
import { LowCreditModal } from "@/components/credits/low-credit-modal"
import { ZeroCreditsUpgradeModal } from "@/components/credits/zero-credits-upgrade-modal"
import { CreditRenewalBanner } from "@/components/credits/credit-renewal-banner"
import { FeedbackButton } from "@/components/feedback/feedback-button"
import { UpgradeOrCredits } from "@/components/UpgradeOrCredits"
import type { User as UserType } from "./types"
import { getAccessState } from "./access"
import { useToast } from "@/hooks/use-toast"
import { SmartUpgradeBanner } from "@/components/upgrade/smart-upgrade-banner"
import { UpgradeModal } from "@/components/upgrade/upgrade-modal"
import type { UpgradeOpportunity } from "@/lib/upgrade-detection"
import { trackAnalyticsEvent } from "@/lib/analytics/client"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Pencil, Palette } from "lucide-react"
import { DesignClasses } from "@/lib/design-tokens"
import { AnimatePresence, motion } from "framer-motion"
import useSWR from "swr"
import { useRouter, useSearchParams } from "next/navigation"
import { ChevronDown, ChevronRight, X } from "lucide-react"
import {
  readStudioTabFromHash,
  readStudioTabFromSearchParams,
  resolveStudioTab,
  type StudioTab,
} from "@/lib/studio/tab-routing"
import {
  shouldApplyBlueprintFallbackRouting,
  shouldRouteMemberToFeedPlannerOnMissingOnboarding,
} from "@/lib/onboarding/studio-onboarding-routing"

interface SselfieAppProps {
  userId: string | number // Can be string or number (from database)
  userName: string | null
  userEmail: string | null
  isWelcome?: boolean
  shouldShowCheckout?: boolean
  subscriptionStatus?: string | null
  productType?: string | null // NEW: "paid_blueprint" | "sselfie_studio_membership" | null
  purchaseSuccess?: boolean // Decision 2: Purchase success flag
  initialTab?: string // Decision 2: Initial tab from URL param
  academyPurchaseSource?: string
  academyPurchaseProduct?: string
  firstTimeProductUser?: boolean
}

const ACADEMY_PRODUCT_TO_TAB: Record<string, "feed-planner" | "maya" | "academy" | "account"> = {
  what_to_say: "feed-planner",
  show_up: "maya",
  get_paid: "account",
  ai_photo_prompts: "maya",
  editing_masterclass: "academy",
  branded_by_sselfie: "academy",
}

export default function SselfieApp({
  userId,
  userName,
  userEmail,
  isWelcome = false,
  shouldShowCheckout = false,
  subscriptionStatus = null,
  productType = null,
  purchaseSuccess = false,
  initialTab,
  academyPurchaseSource,
  academyPurchaseProduct,
  firstTimeProductUser = false,
}: SselfieAppProps) {
  const isUnifiedMayaUiEnabled =
    process.env.NEXT_PUBLIC_FEATURE_UNIFIED_MAYA_UI === "true" ||
    process.env.NEXT_PUBLIC_FEATURE_UNIFIED_MAYA_UI === "1"

  const isMembershipUser =
    (subscriptionStatus === "active" || subscriptionStatus === "trialing") &&
    ["sselfie_studio_membership", "brand_studio_membership", "pro", "one_time_session"].includes(productType || "")

  const getInitialTab = () => {
    if (typeof window !== "undefined") {
      return resolveStudioTab({
        initialTab,
        searchTab: new URLSearchParams(window.location.search).get("tab"),
        hashTab: window.location.hash,
        isMembership: isMembershipUser,
      })
    }

    return resolveStudioTab({
      initialTab,
      searchTab: null,
      hashTab: null,
      isMembership: isMembershipUser,
    })
  }

  const [activeTab, setActiveTab] = useState<StudioTab>(getInitialTab)
  const [showPurchaseSuccess, setShowPurchaseSuccess] = useState(purchaseSuccess)
  const [showAcademyWelcomeBanner, setShowAcademyWelcomeBanner] = useState(
    () => !!(academyPurchaseSource === "academy_purchase" && academyPurchaseProduct),
  )
  const [isLoading, setIsLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [hasTrainedModel, setHasTrainedModel] = useState(false)
  const [isLoadingTrainingStatus, setIsLoadingTrainingStatus] = useState(true)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showBlueprintWelcome, setShowBlueprintWelcome] = useState(false)
  // showBlueprintOnboarding and existingBlueprintData removed - UnifiedOnboardingWizard is now handled by feed-planner-client.tsx
  const [creditBalance, setCreditBalance] = useState<number>(0)
  const [isLoadingCredits, setIsLoadingCredits] = useState(true)
  const [blueprintEntitlementType, setBlueprintEntitlementType] = useState<string | null>(null)
  const simpleFetcher = (url: string) => fetch(url).then((res) => res.json())
  const { data: myProductsData } = useSWR("/api/academy/my-products", simpleFetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  })
  const ownedProducts = Array.isArray(myProductsData?.purchases) ? myProductsData.purchases : []
  const {
    data: trainingStatus,
    error: trainingStatusError,
    isLoading: isTrainingStatusLoading,
  } = useSWR(
    "/api/training/status",
    simpleFetcher,
    {
      refreshInterval: (data) => {
        if (data?.model?.training_status === "training" || data?.model?.training_status === "processing") {
          return 15000
        }
        return 0
      },
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  )
  
  // Feed Planner Pro Mode state (shared with Maya via localStorage)
  const [feedPlannerProMode, setFeedPlannerProMode] = useState<boolean>(() => {
    if (typeof window === "undefined") return false
    const saved = localStorage.getItem("mayaProMode")
    return saved === "true"
  })
  
  // Sync Feed Planner Pro Mode with localStorage changes
  useEffect(() => {
    if (typeof window === "undefined") return
    
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "mayaProMode") {
        setFeedPlannerProMode(e.newValue === "true")
      }
    }
    
    const handleCustomEvent = (e: CustomEvent) => {
      setFeedPlannerProMode(e.detail.mode)
    }
    
    window.addEventListener("storage", handleStorageChange)
    window.addEventListener("feedPlannerModeChanged" as any, handleCustomEvent)
    
    // Also check localStorage periodically for same-window changes
    const interval = setInterval(() => {
      const saved = localStorage.getItem("mayaProMode")
      const newMode = saved === "true"
      if (newMode !== feedPlannerProMode) {
        setFeedPlannerProMode(newMode)
      }
    }, 100)
    
    return () => {
      window.removeEventListener("storage", handleStorageChange)
      window.removeEventListener("feedPlannerModeChanged" as any, handleCustomEvent)
      clearInterval(interval)
    }
  }, [feedPlannerProMode])
  const [showBuyCreditsModal, setShowBuyCreditsModal] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [showFirstPhotoToast, setShowFirstPhotoToast] = useState(false)
  const initialCreditBalanceRef = useRef<number | null>(null)
  const firstPhotoToastShownRef = useRef(false)
  const bottomNavRef = useRef<HTMLElement | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabFromSearchParams = readStudioTabFromSearchParams(searchParams)
  const hasTrackedStudioOpenRef = useRef(false)
  const hasTrackedTtfiStartRef = useRef(false)

  useEffect(() => {
    if (hasTrackedStudioOpenRef.current) return
    hasTrackedStudioOpenRef.current = true
    trackAnalyticsEvent({
      event: "studio_opened",
      properties: {
        product_type: productType || null,
        subscription_status: subscriptionStatus || null,
      },
    })
  }, [productType, subscriptionStatus])

  useEffect(() => {
    trackAnalyticsEvent({
      event: "tab_opened",
      properties: {
        tab: activeTab,
      },
    })
  }, [activeTab])

  useEffect(() => {
    if (activeTab !== "maya" || hasTrackedTtfiStartRef.current) return

    try {
      if (typeof window !== "undefined") {
        const sessionKey = "ttfi_signup_start_tracked"
        if (window.sessionStorage.getItem(sessionKey) === "1") {
          hasTrackedTtfiStartRef.current = true
          return
        }
        window.sessionStorage.setItem(sessionKey, "1")
      }
    } catch {
      // Ignore storage errors (private mode / blocked storage).
    }

    hasTrackedTtfiStartRef.current = true
    trackAnalyticsEvent({
      event: "signup_to_first_gen",
      properties: {
        stage: "start",
        source: "studio_maya_tab_load",
      },
    })
  }, [activeTab])

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return
    const node = bottomNavRef.current
    if (!node || typeof ResizeObserver === "undefined") return

    const updateBottomNavHeight = () => {
      const height = Math.ceil(node.getBoundingClientRect().height)
      if (height > 0) {
        document.documentElement.style.setProperty("--sselfie-bottom-nav-height", `${height}px`)
      }
    }

    updateBottomNavHeight()
    const observer = new ResizeObserver(updateBottomNavHeight)
    observer.observe(node)
    window.addEventListener("resize", updateBottomNavHeight)

    return () => {
      observer.disconnect()
      window.removeEventListener("resize", updateBottomNavHeight)
    }
  }, [])
  
  // Fetch feed list for feed planner header
  const fetcher = async (url: string) => {
    const res = await fetch(url)
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}))
      throw new Error(errorData.details || errorData.error || `Failed to fetch: ${res.status}`)
    }
    const data = await res.json()
    // Validate response structure
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid response format')
    }
    if (!Array.isArray(data.feeds)) {
      return { feeds: [] }
    }
    return data
  }
  const { data: feedListData, error: feedListError, isLoading: isLoadingFeeds, mutate: mutateFeeds } = useSWR(
    activeTab === "feed-planner" ? '/api/feed/list' : null,
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      refreshInterval: 0,
    }
  )
  const feeds = feedListData?.feeds || []
  const currentFeedId = searchParams.get('feedId') ? parseInt(searchParams.get('feedId')!, 10) : null

  // Feed edit modal state
  const [editingFeed, setEditingFeed] = useState<{ id: number; title: string; display_color: string | null } | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editColor, setEditColor] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Preset colors for feed organization
  const presetColors = [
    { name: "Pink", value: "#ec4899" },
    { name: "Purple", value: "#a855f7" },
    { name: "Blue", value: "#3b82f6" },
    { name: "Teal", value: "#14b8a6" },
    { name: "Green", value: "#10b981" },
    { name: "Yellow", value: "#eab308" },
    { name: "Orange", value: "#f97316" },
    { name: "Red", value: "#ef4444" },
    { name: "Rose", value: "#f43f5e" },
    { name: "Indigo", value: "#6366f1" },
    { name: "Gray", value: "#6b7280" },
    { name: "None", value: null },
  ]

  const handleEditFeed = (feed: any) => {
    setEditingFeed({ id: feed.id, title: feed.title || "", display_color: feed.display_color || null })
    setEditTitle(feed.title || "")
    setEditColor(feed.display_color || null)
  }

  const handleSaveFeed = async () => {
    if (!editingFeed) return

    setIsSaving(true)
    try {
      const response = await fetch(`/api/feed/${editingFeed.id}/update-metadata`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim() || undefined,
          display_color: editColor || undefined,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update feed")
      }

      // Refresh feed list
      await mutateFeeds()
      setEditingFeed(null)
    } catch (error) {
      console.error("Error updating feed:", error)
      alert("Failed to update feed. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isNavVisible, setIsNavVisible] = useState(true)
  const lastScrollY = useRef(0)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [creditsFetchFailed, setCreditsFetchFailed] = useState(false)
  const upgradeImpressionsLogged = useRef<Set<string>>(new Set())
  const [upgradeOpportunities, setUpgradeOpportunities] = useState<UpgradeOpportunity[]>([])
  const [dismissedUpgradeTypes, setDismissedUpgradeTypes] = useState<Set<string>>(new Set())
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [currentTierForUpgrade] = useState<"one_time_session" | "sselfie_studio_membership">(
    "sselfie_studio_membership",
  )

  useEffect(() => {
    if (!tabFromSearchParams) return
    setActiveTab((currentTab) => (currentTab === tabFromSearchParams ? currentTab : tabFromSearchParams))
  }, [tabFromSearchParams])

  useEffect(() => {
    const handlePopState = () => {
      const tabFromQuery = readStudioTabFromSearchParams(new URLSearchParams(window.location.search))
      const tabFromHash = readStudioTabFromHash(window.location.hash)
      const nextTab =
        tabFromQuery ??
        tabFromHash ??
        resolveStudioTab({
          initialTab,
          searchTab: null,
          hashTab: null,
          isMembership: isMembershipUser,
        })

      setActiveTab((currentTab) => (currentTab === nextTab ? currentTab : nextTab))
    }

    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [initialTab, isMembershipUser])

  useEffect(() => {
    let isMounted = true
    const loadUpgradeOpportunities = async () => {
      try {
        const response = await fetch("/api/subscription/upgrade-opportunities", { credentials: "include" })
        if (!response.ok) return
        const data = await response.json()
        if (isMounted && data?.opportunities) {
          setUpgradeOpportunities(data.opportunities)
        }
      } catch (error) {
        console.error("[v0] [UPGRADE] Failed to fetch upgrade opportunities", error)
      }
    }

    loadUpgradeOpportunities()
    return () => {
      isMounted = false
    }
  }, [userId])

  // Calculate access state early (needed for handleTabChange)
  const access = getAccessState({
    credits: creditBalance,
    subscriptionStatus,
    productType,
    userEmail,
  })
  // New users: not a member, has welcome credits (just signed up), and hasn't trained a model yet.
  // Once credits hit 0 OR they train a model, they've experienced value and see the full tab bar.
  const isNewUser = !access.isMember && creditBalance > 0 && !hasTrainedModel

  const isPaidBlueprintUserForAccess =
    (access.isPaidBlueprintOnly || blueprintEntitlementType === "paid") && !access.isMember
  const isOneTimeSession = productType === "one_time_session"
  const hasAcademyPurchases = ownedProducts.length > 0
  const academyBlocked = !access.hasFullAccess && !hasAcademyPurchases

  const handleTabChange = (tabId: StudioTab) => {
    // If user has no credits and no subscription, still let them into Maya —
    // but the generation API will surface the upgrade modal naturally when they try.
    // Only hard-block if they've been explicitly downgraded (no credits, no plan, no blueprint).
    setActiveTab(tabId)
    // Keep query tab + hash aligned for deep-linking and back/forward consistency.
    const nextUrl = new URL(window.location.href)
    nextUrl.searchParams.set("tab", tabId)
    nextUrl.hash = tabId
    window.history.pushState(null, "", `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`)
  }

  const refreshCredits = useCallback(async () => {
    try {
      const response = await fetch("/api/user/credits")
      if (!response.ok) {
        console.error("[v0] Credit refresh failed with status:", response.status)
        return // Don't update balance on error
      }
      const data = await response.json()
      setCreditBalance(data.balance || 0)
    } catch (error) {
      console.error("[v0] Error refreshing credits:", error)
      // Don't throw - just log the error
    }
  }, [])

  useEffect(() => {
    const fetchCredits = async () => {
      try {
        const response = await fetch("/api/user/credits")
        if (!response.ok) {
          setCreditBalance(0)
          setCreditsFetchFailed(true)
          return
        }
        const data = await response.json()
        setCreditBalance(data.balance || 0)
        setCreditsFetchFailed(false)
      } catch (error) {
        setCreditBalance(0)
        setCreditsFetchFailed(true)
      } finally {
        setIsLoadingCredits(false)
      }
    }

    fetchCredits()
  }, [])

  useEffect(() => {
    const handleCreditsUpdated = () => {
      refreshCredits()
    }
    window.addEventListener("credits-updated", handleCreditsUpdated)
    return () => window.removeEventListener("credits-updated", handleCreditsUpdated)
  }, [refreshCredits])

  // Capture the initial credit balance once for a new (non-member) user
  useEffect(() => {
    if (initialCreditBalanceRef.current === null && creditBalance > 0 && !access.isMember) {
      initialCreditBalanceRef.current = creditBalance
    }
  }, [creditBalance, access.isMember])

  // Fire first-photo celebration toast when the first credit is spent
  useEffect(() => {
    if (
      !firstPhotoToastShownRef.current &&
      initialCreditBalanceRef.current !== null &&
      creditBalance < initialCreditBalanceRef.current &&
      !access.isMember
    ) {
      firstPhotoToastShownRef.current = true
      setShowFirstPhotoToast(true)
      setTimeout(() => setShowFirstPhotoToast(false), 5000)
    }
  }, [creditBalance, access.isMember])

  useEffect(() => {
    if (!isTrainingStatusLoading || trainingStatusError) {
      setIsLoadingTrainingStatus(false)
    }
  }, [isTrainingStatusLoading, trainingStatusError])

  useEffect(() => {
    if (typeof trainingStatus?.hasTrainedModel === "boolean") {
      setHasTrainedModel(trainingStatus.hasTrainedModel)
    }
  }, [trainingStatus?.hasTrainedModel])

  // Decision 3: Fetch onboarding status and determine initial tab on mount and refresh
  useEffect(() => {
    let mounted = true
    
    const fetchTrainingStatus = async () => {
      try {
        // Fetch onboarding status and blueprint entitlement
        const [onboardingResponse, blueprintResponse] = await Promise.all([
          fetch("/api/user/onboarding-status"),
          fetch("/api/blueprint/state"),
        ])

        if (!mounted) return // Prevent state updates if component unmounted

        const onboardingData = onboardingResponse.ok
          ? await onboardingResponse.json() 
          : { 
              onboarding_completed: false, 
              blueprint_welcome_shown_at: null, 
              hasBlueprintState: false,
              hasBaseWizardData: false,
              hasExtensionData: false
            }
        const blueprintData = blueprintResponse.ok ? await blueprintResponse.json() : null
        if (mounted) {
          setBlueprintEntitlementType(blueprintData?.entitlement?.type ?? null)
        }

        const onboardingCompleted = onboardingData.onboarding_completed || false
        const blueprintWelcomeShown = !!onboardingData.blueprint_welcome_shown_at
        const hasBlueprintState = onboardingData.hasBlueprintState || false
        const hasBaseWizardData = onboardingData.hasBaseWizardData || false

        // Decision 3: Route new blueprint users to blueprint tab if they're not already there
        // Note: Sign-up already redirects to /studio?tab=blueprint, so initialTab should be set
        // This is a fallback for direct navigation or refresh scenarios
        const isBlueprintUser = blueprintData?.entitlement?.type === "free" || blueprintData?.entitlement?.type === "paid"
        
        console.log("[Wizard Debug] 📊 Onboarding State:", {
          onboardingCompleted,
          blueprintWelcomeShown,
          hasBlueprintState,
          hasBaseWizardData,
          hasModel: hasTrainedModel,
          isBlueprintUser,
          entitlementType: blueprintData?.entitlement?.type,
        })
        
        if (
          shouldApplyBlueprintFallbackRouting({
            isBlueprintUser,
            isMember: subscriptionStatus === "active" || subscriptionStatus === "trialing",
            onboardingCompleted,
          }) &&
          mounted
        ) {
          const currentUrlTab = typeof window !== "undefined" 
            ? new URLSearchParams(window.location.search).get("tab") || window.location.hash.slice(1) || null
            : null
          
          // Only route if URL doesn't already specify blueprint tab and we're on default maya
          if (!currentUrlTab || (currentUrlTab === "maya" && !initialTab)) {
            console.log("[Routing] 🔵 Routing blueprint user to feed planner (fallback routing)")
            setActiveTab("feed-planner")
            if (typeof window !== "undefined") {
              const url = new URL(window.location.href)
              url.searchParams.set("tab", "feed-planner")
              window.history.replaceState({}, "", url.toString())
            }
          }
        }

        // Decision 3: Progressive onboarding flow
        // 1. Blueprint Welcome (first time, no state)
        // 2. Base Wizard (after welcome, base data missing)
        // 3. Blueprint Extension (after base, extension data missing for blueprint users)
        // 4. Complete (onboarding_completed = true)

        // Unified wizard saves dreamClient and feedStyle (struggle is not collected)
        // Check for extension data from API response
        const hasExtensionData = onboardingData.hasExtensionData || (
          blueprintData?.blueprint?.formData?.dreamClient && 
          blueprintData?.blueprint?.feedStyle
        )

        // Check if user is a paid blueprint user (doesn't need training wizard)
        const isPaidBlueprintUser = productType === "paid_blueprint" || blueprintData?.entitlement?.type === "paid"
        const shouldSkipTrainingWizard = isBlueprintUser

        console.log("[Wizard Debug] 🔍 Extension Data Check:", {
          hasExtensionData,
          hasExtensionDataFromAPI: onboardingData.hasExtensionData,
          dreamClient: blueprintData?.blueprint?.formData?.dreamClient,
          feedStyle: blueprintData?.blueprint?.feedStyle,
          isPaidBlueprintUser,
          shouldSkipTrainingWizard,
        })

        // For blueprint users, check if onboarding is actually complete (has all required data)
        // If onboarding_completed flag is true but data is missing, treat as incomplete
        const isActuallyCompleted = onboardingCompleted && (
          !isBlueprintUser || // Studio users can complete without blueprint extension
          (hasBaseWizardData && hasExtensionData) // Blueprint users need base + extension
        )

        if (!isActuallyCompleted && mounted) {
          // Check if user is a member (has subscription) - welcome screen is only for members
          const isMember = subscriptionStatus === "active" || subscriptionStatus === "trialing"
          
          // Step 1: Show Blueprint Welcome ONLY for members (not free users)
          // Free users skip welcome and go straight to onboarding wizard
          if (isMember && !blueprintWelcomeShown && !hasBlueprintState && !hasBaseWizardData) {
            console.log("[Blueprint Welcome] 👋 Showing blueprint welcome wizard (member, no state)")
            setShowBlueprintWelcome(true)
            setShowOnboarding(false)
            // Note: UnifiedOnboardingWizard is now handled by feed-planner-client.tsx
          }
          // Step 2: Show Unified Blueprint Onboarding Wizard if welcome shown (members) OR directly for free users
          else if (
            shouldRouteMemberToFeedPlannerOnMissingOnboarding({
              isMember,
              blueprintWelcomeShown,
              hasBaseWizardData,
              hasExtensionData,
            })
          ) {
            console.log("[Blueprint Onboarding] 📝 Onboarding data missing - feed-planner-client.tsx will handle wizard")
            setShowBlueprintWelcome(false)
            setShowOnboarding(false)
            // Route to feed planner - feed-planner-client.tsx will show wizard
            if (activeTab !== "feed-planner") {
              setActiveTab("feed-planner")
            }
          }
          // Free users stay in Maya; activation/welcome flow handles first generation path
          else if (!isMember && (!hasBaseWizardData || !hasExtensionData)) {
            console.log("[Blueprint Onboarding] Free user onboarding missing - staying in Maya welcome flow")
            setShowBlueprintWelcome(false)
            setShowOnboarding(false)
          }
          // Step 3: Show Training Wizard if all onboarding done but no trained model
          // SKIP training wizard for blueprint users (free or paid) since Feed Planner doesn't require LoRA training
          else if ((blueprintWelcomeShown || hasBlueprintState || hasBaseWizardData) && !hasTrainedModel && !shouldSkipTrainingWizard) {
            console.log("[Onboarding] 🎓 Showing training onboarding wizard (onboarding done, no model, non-blueprint user)")
            setShowBlueprintWelcome(false)
            setShowOnboarding(true)
          }
          // No wizards to show
          else {
            console.log("[Wizard Debug] ⚠️ No wizard conditions matched - hiding all wizards")
            if (shouldSkipTrainingWizard && !hasTrainedModel) {
              console.log("[Wizard Debug] ℹ️ Blueprint user - skipping training wizard (not needed for Feed Planner)")
            }
            setShowBlueprintWelcome(false)
            setShowOnboarding(false)
          }
        } else if (mounted) {
          // Onboarding actually completed - no wizards
          console.log("[Wizard Debug] ✅ Onboarding actually complete - hiding all wizards")
          setShowBlueprintWelcome(false)
          setShowOnboarding(false)
        }
      } catch (error) {
        console.error("[v0] Error fetching training/onboarding status:", error)
        // Don't show onboarding on error - let user proceed to app
      }
    }

    fetchTrainingStatus()
    
    return () => {
      mounted = false
    }
  }, []) // Run once on mount - check onboarding status on every page load/refresh

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 2500)
    const clockTimer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => {
      clearTimeout(timer)
      clearInterval(clockTimer)
    }
  }, [])

  useEffect(() => {
    // Always show bottom nav - it should be visible on all tabs
    setIsNavVisible(true)
  }, [activeTab])

  useEffect(() => {
    if (shouldShowCheckout && !isLoadingCredits) {
      // Only show modal if explicitly requested via URL param
    }
  }, [shouldShowCheckout, isLoadingCredits])

  const tabs = [
    { id: "maya", label: "Maya", icon: MessageCircle },
    { id: "gallery", label: "Gallery", icon: ImageIcon },
    { id: "feed-planner", label: "Feed", icon: LayoutGrid },
    { id: "academy", label: "Academy", icon: Grid },
    { id: "account", label: "Account", icon: User },
  ]

  const user: UserType = {
    // Ensure id is a non-empty string for useMayaChat hook (convert number to string if needed)
    id: userId != null ? String(userId).trim() : undefined,
    email: userEmail && typeof userEmail === 'string' && userEmail.trim().length > 0 ? userEmail : undefined,
    name: userName || "User",
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userEmail}`,
    membershipTier: "Premium",
    followers: "3.2k",
    following: "428",
    posts: "127",
  }

  const handleCreditsPurchased = () => {
    refreshCredits()
  }

  // Decision 2: Handle purchase success - refresh credits and show success message
  useEffect(() => {
    if (purchaseSuccess && activeTab === "feed-planner") {
      // Refresh credits to show updated balance (60 credits for paid blueprint)
      refreshCredits()
      
      // Remove purchase=success from URL after a delay (allows user to see success)
      setTimeout(() => {
        if (typeof window !== "undefined") {
          const url = new URL(window.location.href)
          url.searchParams.delete("purchase")
          // Keep tab=feed-planner param
          window.history.replaceState({}, "", url.toString())
          setShowPurchaseSuccess(false)
        }
      }, 3000) // Remove after 3 seconds
    }
  }, [purchaseSuccess, activeTab, refreshCredits])

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true)
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      })

      if (response.ok) {
        window.location.href = "/auth/login"
      } else {
        console.error("[v0] Logout failed")
        setIsLoggingOut(false)
      }
    } catch (error) {
      console.error("[v0] Error during logout:", error)
      setIsLoggingOut(false)
    }
  }

  const activeUpgrade = upgradeOpportunities.find((op) => !dismissedUpgradeTypes.has(op.type))
  const shouldShowUpgradeBanner =
    ["gallery", "maya"].includes(activeTab) && !!activeUpgrade && access.canUseGenerators

  const logUpgradeEvent = async (eventType: "impression" | "dismiss" | "cta_click", opportunityType?: string) => {
    try {
      await fetch("/api/subscription/upgrade-analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventType, opportunityType }),
        keepalive: true,
      })
    } catch (error) {
      console.error("[v0] [UPGRADE] Failed to log analytics", error)
    }
  }

  const dismissUpgrade = (type: string) => {
    setDismissedUpgradeTypes((prev) => new Set([...Array.from(prev), type]))
    logUpgradeEvent("dismiss", type)
  }

  useEffect(() => {
    if (shouldShowUpgradeBanner && activeUpgrade) {
      const key = `${activeUpgrade.type}-impression`
      if (!upgradeImpressionsLogged.current.has(key)) {
        upgradeImpressionsLogged.current.add(key)
        logUpgradeEvent("impression", activeUpgrade.type)
      }
    }
  }, [shouldShowUpgradeBanner, activeUpgrade])

  if (isLoading || isLoadingTrainingStatus || isLoadingCredits) {
    return <LoadingScreen />
  }

  return (
    <div
        className="h-screen relative overflow-hidden prevent-horizontal-scroll"
        style={{
          background: 'radial-gradient(ellipse 150% 100% at 50% 0%, #1c1c1c 0%, #111111 50%, #0d0d0d 100%)',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          paddingTop: "env(safe-area-inset-top)",
        }}
      >
        <ServiceWorkerProvider />

      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-3xl" style={{ background: 'rgba(255,255,255,0.02)' }}></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full blur-3xl" style={{ background: 'rgba(255,255,255,0.015)' }}></div>
      </div>

      {isWelcome && creditBalance === 0 && (
        <div className="hidden absolute top-0 left-0 right-0 z-50 bg-stone-900 text-white py-3 px-4 text-center">
          <p className="text-sm font-medium">
            Your first brand photo is one selfie away. Get credits and let&apos;s get it done — it takes under 2 minutes.
          </p>
        </div>
      )}

      {/* First-photo celebration toast — fires once when the first credit is spent */}
      {showFirstPhotoToast && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-stone-950 text-white px-4 py-3 flex items-center justify-between animate-in slide-in-from-top-2 duration-500">
          <div>
            <p className="text-sm font-medium">Your first brand photo is done.</p>
            <p className="text-xs text-white/60 mt-0.5">You just proved this works. Feed Planner, Gallery &amp; Academy are now yours — go explore.</p>
          </div>
          <button onClick={() => setShowFirstPhotoToast(false)} className="text-white/40 hover:text-white ml-4 shrink-0" aria-label="Dismiss">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Engagement Banners */}
      <CreditRenewalBanner />

      {/* Slice 1.3: Post-purchase welcome banner when opening app with ?source=academy_purchase&product=... */}
      {showAcademyWelcomeBanner &&
        academyPurchaseSource === "academy_purchase" &&
        academyPurchaseProduct &&
        ACADEMY_PRODUCT_TO_TAB[academyPurchaseProduct] && (
          <div className="sticky top-0 z-20 mx-1 sm:mx-2 md:mx-3 mt-2 sm:mt-3 md:mt-4">
            <div className="bg-stone-950 text-white rounded-xl border border-stone-700 shadow-lg overflow-hidden">
              <div className="flex items-center justify-between gap-3 px-4 py-3">
                <button
                  type="button"
                  onClick={() => {
                    const tab = ACADEMY_PRODUCT_TO_TAB[academyPurchaseProduct]
                    if (tab) handleTabChange(tab)
                    setShowAcademyWelcomeBanner(false)
                  }}
                  className="flex-1 flex items-center justify-between gap-2 text-left group"
                >
                  <span className="text-sm font-medium">Welcome! Let&apos;s get started</span>
                  <ChevronRight size={18} className="text-white shrink-0 group-hover:translate-x-0.5 transition-transform" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => setShowAcademyWelcomeBanner(false)}
                  className="shrink-0 p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                  aria-label="Dismiss welcome banner"
                >
                  <X size={18} className="text-white" />
                </button>
              </div>
            </div>
          </div>
        )}

      <main className="relative h-full lg:mx-3 pb-2 sm:pb-3 md:pb-4">
        <div className={`hidden lg:block h-full ${DesignClasses.container} ${activeTab === "maya" ? "overflow-visible" : "overflow-hidden"}`}>
          {/* Hide header when in Maya tab - it has its own header */}
          {activeTab !== "maya" && (
            <header className={`sticky top-0 z-10 border-b ${DesignClasses.border.stone} ${DesignClasses.spacing.paddingX.sm} py-3 pt-safe`} style={{ background: 'rgba(16,16,16,0.88)', backdropFilter: 'blur(20px)' }}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 shrink-0">
                  <div className={`${DesignClasses.typography.heading.h4} text-white`}>
                    SSELFIE
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                  {/* My Feed dropdown - only show in feed planner */}
                  {activeTab === "feed-planner" && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className={`flex items-center gap-1.5 px-3 py-1.5 ${DesignClasses.radius.sm} hover:bg-white/10 transition-colors text-xs font-medium text-white`}
                          aria-label="My Feed"
                          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}
                        >
                          <span>My Feed</span>
                          <ChevronDown size={14} className="text-white/70" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className={`w-56 ${DesignClasses.background.overlay} ${DesignClasses.blur.md} ${DesignClasses.border.stone} shadow-lg`}>
                        <div className="px-3 py-2">
                          <div className={`${DesignClasses.typography.label.uppercase} ${DesignClasses.text.tertiary} mb-2`}>Feed History</div>
                          <div className="max-h-64 overflow-y-auto">
                            {isLoadingFeeds ? (
                              <div className="px-2 py-4 text-center text-xs text-stone-500">Loading feeds...</div>
                            ) : feedListError ? (
                              <div className="px-2 py-4 text-center text-xs text-red-500">Failed to load feeds</div>
                            ) : feeds.length === 0 ? (
                              <div className="px-2 py-4 text-center text-xs text-stone-500">No feeds yet</div>
                            ) : (
                              feeds.map((feed: any) => (
                                <div key={feed.id} className="group relative">
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      // Update search params - router.replace updates URL without navigation
                                      const currentPath = window.location.pathname
                                      router.replace(`${currentPath}?feedId=${feed.id}#feed-planner`)
                                    }}
                                    className={`cursor-pointer ${currentFeedId === feed.id ? 'bg-stone-100' : ''}`}
                                  >
                                    <div className="flex items-center gap-2.5 w-full">
                                      {/* Color indicator - always visible */}
                                      <div
                                        className="w-4 h-4 rounded-full shrink-0 border-2 flex-shrink-0"
                                        style={{
                                          backgroundColor: feed.display_color || '#f5f5f4',
                                          borderColor: feed.display_color || '#d4d4d4',
                                          borderStyle: feed.display_color ? 'solid' : 'dashed',
                                        }}
                                        title={feed.display_color ? `Color: ${feed.display_color}` : 'No color set'}
                                      >
                                        {!feed.display_color && (
                                          <div className="w-full h-full flex items-center justify-center">
                                            <div className="w-1.5 h-1.5 rounded-full bg-stone-400"></div>
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex flex-col flex-1 min-w-0">
                                        <span className="text-sm font-medium text-stone-900 truncate">{feed.title || `Feed ${feed.id}`}</span>
                                        {feed.layout_type === 'preview' ? (
                                          <span className="text-xs text-stone-500">Preview Feed</span>
                                        ) : feed.image_count !== undefined ? (
                                          <span className="text-xs text-stone-500">{feed.image_count}/{feed.layout_type === 'grid_3x4' ? '12' : '9'} images</span>
                                        ) : null}
                                      </div>
                                    </div>
                                  </DropdownMenuItem>
                                  {/* Edit button - appears on hover */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleEditFeed(feed)
                                    }}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-stone-200 rounded"
                                    aria-label="Edit feed"
                                  >
                                    <Pencil size={12} className="text-stone-600" />
                                  </button>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}

                  {/* Feed Edit Modal */}
                  <Dialog open={!!editingFeed} onOpenChange={(open) => !open && setEditingFeed(null)}>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Edit Feed</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div>
                          <label className="text-sm font-medium text-stone-700 mb-1.5 block">
                            Feed Name
                          </label>
                          <Input
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            placeholder="Enter feed name"
                            className="w-full"
                            maxLength={50}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-stone-700 mb-2 block">
                            Color
                          </label>
                          <div className="grid grid-cols-6 gap-2">
                            {presetColors.map((color) => (
                              <button
                                key={color.value || "none"}
                                onClick={() => setEditColor(color.value)}
                                className={`w-10 h-10 rounded-full border-2 transition-all ${
                                  editColor === color.value
                                    ? 'border-stone-900 scale-110'
                                    : 'border-stone-300 hover:border-stone-400'
                                }`}
                                style={{
                                  backgroundColor: color.value || 'transparent',
                                  borderStyle: color.value ? 'solid' : 'dashed',
                                }}
                                aria-label={color.name}
                                title={color.name}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <button
                          onClick={() => setEditingFeed(null)}
                          className="px-4 py-2 text-sm text-stone-600 hover:text-stone-900"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveFeed}
                          disabled={isSaving}
                          className={`px-4 py-2 text-sm font-medium rounded-md ${
                            isSaving
                              ? 'bg-stone-300 text-stone-500 cursor-not-allowed'
                              : 'bg-stone-900 text-white hover:bg-stone-800'
                          }`}
                        >
                          {isSaving ? "Saving..." : "Save"}
                        </button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                  <DropdownMenuTrigger asChild>
                    <button
                      className={`flex items-center justify-center w-9 h-9 ${DesignClasses.radius.sm} hover:bg-white/10 transition-colors`}
                      aria-label="Menu"
                      style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}
                    >
                      <MoreVertical size={18} className="text-white" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className={`w-64 ${DesignClasses.background.overlay} ${DesignClasses.blur.md} ${DesignClasses.border.stone} shadow-lg`}>
                    <div className="px-3 py-2">
                      <div className={`${DesignClasses.typography.label.uppercase} ${DesignClasses.text.tertiary}`}>
                        Your Credits
                      </div>
                      <div className={`text-2xl font-serif font-extralight ${DesignClasses.text.primary} tabular-nums mt-1`}>
                        {creditBalance.toFixed(1)}
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    <div className="px-3 py-2">
                      <div className={`${DesignClasses.typography.label.uppercase} ${DesignClasses.text.tertiary} mb-1`}>Navigate</div>
                      <div className="grid grid-cols-2 gap-1">
                        {tabs.map((tab) => {
                          const Icon = tab.icon
                          return (
                            <button
                              key={`menu-${tab.id}`}
                              onClick={() => {
                                handleTabChange(tab.id)
                                setIsMenuOpen(false)
                              }}
                              className={`flex items-center ${DesignClasses.spacing.gap.sm} px-2 py-2 ${DesignClasses.radius.sm} hover:bg-stone-100/60 text-left transition-colors`}
                            >
                              <Icon size={16} className="text-stone-600" />
                              <span className="text-xs font-medium text-stone-800">{tab.label}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => {
                        setShowBuyCreditsModal(true)
                        setIsMenuOpen(false)
                      }}
                      className="cursor-pointer"
                    >
                      <span className="text-sm">Buy More Credits</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <div className="cursor-pointer">
                        <InstallButton variant="menu" />
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                    >
                      <LogOut size={16} className="mr-2" />
                      <span className="text-sm">{isLoggingOut ? "Signing Out..." : "Sign Out"}</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                </div>
              </div>
            </header>
          )}

          <div
            ref={scrollContainerRef}
            className={`h-full ${DesignClasses.spacing.paddingX.md} pb-32 sm:pb-36 md:pb-40 pt-4 sm:pt-6 md:pt-8 overflow-y-auto`}
          >
            {shouldShowUpgradeBanner && activeUpgrade && (
              <div className="mb-4">
                <SmartUpgradeBanner
                  opportunity={activeUpgrade}
                  onUpgrade={() => {
                    logUpgradeEvent("cta_click", activeUpgrade.type)
                    setShowUpgradeModal(true)
                  }}
                  onDismiss={dismissUpgrade}
                />
              </div>
            )}

            <AnimatePresence mode="wait">
              {activeTab === "maya" &&
            (!access.canUseGenerators || isPaidBlueprintUserForAccess) ? (
                <motion.div
                  key="upgrade-or-credits"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
              <UpgradeOrCredits
                    feature={activeTab === "maya" ? "Maya" : "Training"}
                    isPaidBlueprintUser={isPaidBlueprintUserForAccess}
                    requiresMembership={true}
              />
                </motion.div>
              ) : (
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                >
                {activeTab === "maya" && (
                  <MayaChatScreen 
                    onImageGenerated={refreshCredits} 
                    user={user} 
                    setActiveTab={handleTabChange}
                    userId={userId}
                    hasTrainedModel={hasTrainedModel}
                    isMembership={access.hasFullAccess} // Only membership users see Pro/Classic toggle
                    hideModeComplexity={isUnifiedMayaUiEnabled}
                    academyPurchaseProduct={academyPurchaseProduct}
                    firstTimeProductUser={firstTimeProductUser}
                  />
                )}
                {activeTab === "gallery" && (
                  !access.canUseGenerators ? (
                    <UpgradeOrCredits feature="Gallery" isPaidBlueprintUser={isPaidBlueprintUserForAccess} requiresMembership={true} />
                  ) : (
                    <GalleryScreen user={user} userId={userId} />
                  )
                )}
                {activeTab === "feed-planner" && <FeedPlannerClient userId={userId.toString()} userName={userName} />}
                {activeTab === "academy" && (
                  (!access.canUseGenerators || academyBlocked) ? (
                    <UpgradeOrCredits feature="Academy" isPaidBlueprintUser={isPaidBlueprintUserForAccess} requiresMembership={true} />
                  ) : (
                    <AcademyScreen />
                  )
                )}
                  {activeTab === "account" && <AccountScreen user={user} creditBalance={creditBalance} />}
                </motion.div>
            )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      <nav
          ref={bottomNavRef}
          className={`fixed bottom-0 left-0 right-0 z-[70] px-2 sm:px-3 md:px-4 transition-transform duration-300 ease-in-out ${
            isNavVisible ? "translate-y-0" : "translate-y-full"
          }`}
          style={{
            paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))",
          }}
          aria-label="Main navigation"
          aria-hidden={!isNavVisible}
        >
          <div className={`${DesignClasses.radius.xl} ${DesignClasses.shadows.container}`} style={{ background: 'rgba(16,16,16,0.88)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="overflow-x-auto scrollbar-hide px-1.5 sm:px-2 md:px-3 py-2 sm:py-2.5 md:py-3">
              <div className="flex gap-1 sm:gap-2 min-w-max sm:justify-around">
                {(isNewUser ? tabs.filter((t) => t.id === "maya" || t.id === "account") : tabs).map((tab) => {
                  const Icon = tab.icon
                  const isActive = activeTab === tab.id

                  return (
                    <button
                      key={tab.id}
                      onClick={() => handleTabChange(tab.id)}
                      className={`flex flex-col items-center space-y-1 px-2 sm:px-2.5 md:px-4 py-2 sm:py-2.5 md:py-3 ${DesignClasses.radius.lg} transition-all duration-500 ease-out min-w-[60px] sm:min-w-[68px] md:min-w-[76px] relative touch-manipulation ${
                        isActive ? "transform scale-105" : "hover:scale-[1.02] active:scale-95"
                      }`}
                      aria-label={`Navigate to ${tab.label}`}
                      aria-current={isActive ? "page" : undefined}
                    >
                      {isActive && (
                        <div className={`absolute inset-0 ${DesignClasses.radius.lg} ${DesignClasses.shadows.card}`} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}></div>
                      )}
                      <div
                        className={`relative z-10 w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 ${DesignClasses.radius.md} flex items-center justify-center transition-all duration-500 ${
                          isActive ? `${DesignClasses.shadows.button}` : ``
                        }`}
                        aria-hidden="true"
                        style={isActive ? { background: 'rgba(255,255,255,0.1)' } : { background: 'rgba(255,255,255,0.04)' }}
                      >
                        <Icon
                          size={isActive ? 19 : 17}
                          strokeWidth={2}
                          className={`transition-all duration-500 ${isActive ? "text-white" : "text-white opacity-50"}`}
                        />
                      </div>
                      <span
                        className={`relative z-10 text-[9px] sm:text-[10px] md:text-[11px] font-semibold tracking-wide transition-all duration-500 whitespace-nowrap ${
                          isActive ? "text-white" : "text-white opacity-50"
                        }`}
                      >
                        {tab.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
            {isNewUser && (
              <p className="text-xs text-center py-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Feed Planner, Gallery &amp; Academy unlock after your first photo
              </p>
            )}
          </div>
        </nav>

      <InstallPrompt />

      <BuyCreditsModal
        open={showBuyCreditsModal}
        onOpenChange={setShowBuyCreditsModal}
        onSuccess={handleCreditsPurchased}
      />

      <UpgradeModal
        open={showUpgradeModal}
        currentTier={currentTierForUpgrade}
        targetTier="sselfie_studio_membership"
        onClose={() => setShowUpgradeModal(false)}
      />

      {/* Smart Upsell Modal Detection:
          - LowCreditModal: Only for paid users when credits < 30 (handled inside component)
          - ZeroCreditsUpgradeModal: Only for paid users when credits = 0 (handled inside component)
          - FreeModeUpsellModal: Only for free users in feed planner when 2+ credits used (handled in feed-single-placeholder.tsx)
          These modals have built-in detection to prevent conflicts */}
      <LowCreditModal credits={creditBalance} threshold={30} />
      <ZeroCreditsUpgradeModal credits={creditBalance} />

      {/* Hide feedback button when on maya chat screen or feed planner */}
      {activeTab !== "maya" && activeTab !== "feed-planner" && (
        <FeedbackButton userId={userId} userEmail={userEmail} userName={userName} />
      )}

      {/* Onboarding Wizard */}
      {/* Decision 3: Only show training wizard if blueprint welcome is NOT showing */}
      <OnboardingWizard
        isOpen={showOnboarding && !hasTrainedModel && !showBlueprintWelcome}
        onComplete={() => {
          setShowOnboarding(false)
          setHasTrainedModel(true)
        }}
        onDismiss={() => setShowOnboarding(false)}
        hasTrainedModel={hasTrainedModel}
        userId={userId}
        userName={userName}
      />

      {/* Blueprint Welcome Wizard */}
      <BlueprintWelcomeWizard
        isOpen={showBlueprintWelcome}
        onComplete={async () => {
          try {
            // Decision 3: Mark blueprint welcome as shown (does NOT set onboarding_completed yet)
            const response = await fetch("/api/onboarding/complete-blueprint-welcome", {
              method: "POST",
              credentials: "include",
            })

            if (!response.ok) {
              console.error("[Blueprint Welcome] Failed to mark welcome as completed")
            } else {
              console.log("[Blueprint Welcome] ✅ Welcome wizard completed, blueprint_welcome_shown_at set")
            }

            // Note: feed-planner-client.tsx will fetch and pass existingData to UnifiedOnboardingWizard
            // No need to fetch blueprint data here anymore
          } catch (error) {
            console.error("[Blueprint Welcome] Error completing welcome wizard:", error)
          }

          // Decision 3: Route to feed planner - feed-planner-client.tsx will show unified wizard
          setShowBlueprintWelcome(false)
          // Route to feed planner tab - feed-planner-client.tsx will handle showing the wizard
          setActiveTab("feed-planner")
        }}
        onDismiss={() => setShowBlueprintWelcome(false)}
        userName={userName}
      />

      {/* Unified Onboarding Wizard is now handled exclusively by feed-planner-client.tsx */}
      {/* Removed from here to prevent conflicts - feed-planner-client.tsx shows it when needed */}
      </div>
  )
}
