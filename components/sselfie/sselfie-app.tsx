"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import LoadingScreen from "./loading-screen"
import BlueprintWelcomeWizard from "./blueprint-welcome-wizard"
// UnifiedOnboardingWizard is now handled exclusively by feed-planner-client.tsx
import MayaChatScreen from "./maya-chat-screen"
import GalleryScreen from "./gallery-screen"
// Note: B-Roll functionality is accessible via Maya Videos tab (b-roll-screen.tsx kept for reference)
import AcademyScreen from "./academy-screen"
import AccountScreen from "./account-screen"
import StudioHubScreen from "./studio-hub-screen"
import { StudioAppTopBar, type StudioAppMayaSubTabItem } from "./studio-app-top-bar"
import { FeedPlannerClient } from "../feed-planner" // Use FeedPlannerClient to include wizard logic
import { InstallPrompt } from "./install-prompt"
import { InstallButton } from "./install-button"
import { ServiceWorkerProvider } from "./service-worker-provider"
import BuyCreditsModal from "./buy-credits-modal"
import { LowCreditModal } from "@/components/credits/low-credit-modal"
import { ZeroCreditsUpgradeModal } from "@/components/credits/zero-credits-upgrade-modal"
import { PostPurchaseWelcomeModal } from "@/components/sselfie/post-purchase-welcome-modal"
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
import { DesignClasses } from "@/lib/design-tokens"
import { AnimatePresence, motion } from "framer-motion"
import useSWR from "swr"
import { useRouter, useSearchParams } from "next/navigation"
import {
  MAYA_MODE_STORAGE_KEY,
  MAYA_MODE_TOUCHED_STORAGE_KEY,
  readMayaProModePreference,
} from "@/lib/maya/mode-storage"
import { isMayaConsolidatedExperienceEnabled } from "@/lib/feature-flags"
import {
  isStudioTab,
  readStudioTabFromHash,
  readStudioTabFromSearchParams,
  resolveStudioTab,
  type StudioTab,
} from "@/lib/studio/tab-routing"
import { scheduleStudioTabUpdate } from "@/lib/studio/tab-sync"
import {
  shouldApplyBlueprintFallbackRouting,
  shouldArmStudioMemberPostPurchaseOnboarding,
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
  userRole?: string | null
  purchaseSuccess?: boolean // Decision 2: Purchase success flag
  initialTab?: string // Decision 2: Initial tab from URL param
  academyPurchaseSource?: string
  academyPurchaseProduct?: string
  firstTimeProductUser?: boolean
}

const ACADEMY_PRODUCT_TO_TAB: Record<string, "feed-planner" | "maya" | "academy" | "account"> = {
  what_to_say: "academy",
  show_up: "academy",
  get_paid: "academy",
  ai_photo_prompts: "maya",
  editing_masterclass: "academy",
  branded_by_sselfie: "academy",
}

type MayaSubTab = StudioAppMayaSubTabItem["id"]

const MAYA_SUB_TABS: StudioAppMayaSubTabItem[] = [
  { id: "photos", label: "Photos" },
  { id: "plan", label: "Plan" },
  { id: "videos", label: "Videos" },
  { id: "training", label: "My Look" },
]

function resolveMayaSubTabFromHash(hash: string | null | undefined): MayaSubTab | null {
  if (!hash) return null
  if (hash.includes("/plan")) return "plan"
  if (hash.includes("/videos")) return "videos"
  if (hash.includes("/training") || hash.includes("/setup")) return "training"
  if (hash.includes("/photos") || hash === "#maya") return "photos"
  return null
}

function readInitialMayaSubTab(): MayaSubTab {
  if (typeof window === "undefined") return "photos"

  const fromHash = resolveMayaSubTabFromHash(window.location.hash)
  if (fromHash) return fromHash

  const savedTab = window.localStorage.getItem("mayaActiveTab")
  return savedTab === "photos" || savedTab === "plan" || savedTab === "videos" || savedTab === "training"
    ? savedTab
    : "photos"
}

export default function SselfieApp({
  userId,
  userName,
  userEmail,
  isWelcome = false,
  shouldShowCheckout = false,
  subscriptionStatus = null,
  productType = null,
  userRole = null,
  purchaseSuccess = false,
  initialTab,
  academyPurchaseSource,
  academyPurchaseProduct,
  firstTimeProductUser = false,
}: SselfieAppProps) {
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
  const [, setShowOnboarding] = useState(false)
  const [showBlueprintWelcome, setShowBlueprintWelcome] = useState(false)
  // showBlueprintOnboarding and existingBlueprintData removed - UnifiedOnboardingWizard is now handled by feed-planner-client.tsx
  const [creditBalance, setCreditBalance] = useState<number>(0)
  const [isLoadingCredits, setIsLoadingCredits] = useState(true)
  const [pendingPostPurchaseStudioOnboarding, setPendingPostPurchaseStudioOnboarding] = useState(false)
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
    return readMayaProModePreference()
  })
  
  // Sync Feed Planner Pro Mode with localStorage changes
  useEffect(() => {
    if (typeof window === "undefined") return
    
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === MAYA_MODE_STORAGE_KEY || e.key === MAYA_MODE_TOUCHED_STORAGE_KEY) {
        setFeedPlannerProMode(readMayaProModePreference())
      }
    }
    
    const handleCustomEvent = (e: CustomEvent) => {
      setFeedPlannerProMode(e.detail.mode)
    }
    
    window.addEventListener("storage", handleStorageChange)
    window.addEventListener("feedPlannerModeChanged" as any, handleCustomEvent)
    
    // Also check localStorage periodically for same-window changes
    const interval = setInterval(() => {
      const newMode = readMayaProModePreference()
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
  /** Maya ≡ slide menu — control lives in StudioAppTopBar while on Maya tab */
  const [mayaNavMenuOpen, setMayaNavMenuOpen] = useState(false)
  const [activeMayaSubTab, setActiveMayaSubTab] = useState<MayaSubTab>(readInitialMayaSubTab)
  const [showFirstPhotoToast, setShowFirstPhotoToast] = useState(false)
  const initialCreditBalanceRef = useRef<number | null>(null)
  const firstPhotoToastShownRef = useRef(false)
  const appHeaderRef = useRef<HTMLElement | null>(null)
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
    if (activeTab !== "maya") setMayaNavMenuOpen(false)
  }, [activeTab])

  useEffect(() => {
    if (typeof window === "undefined") return

    const syncFromLocation = () => {
      const fromHash = resolveMayaSubTabFromHash(window.location.hash)
      if (fromHash) setActiveMayaSubTab(fromHash)
    }

    const syncFromMaya = (event: Event) => {
      const tab = (event as CustomEvent<{ tab?: MayaSubTab }>).detail?.tab
      if (tab === "photos" || tab === "plan" || tab === "videos" || tab === "training") {
        setActiveMayaSubTab(tab)
      }
    }

    window.addEventListener("popstate", syncFromLocation)
    window.addEventListener("hashchange", syncFromLocation)
    window.addEventListener("sselfie:maya-subtab-changed", syncFromMaya)
    return () => {
      window.removeEventListener("popstate", syncFromLocation)
      window.removeEventListener("hashchange", syncFromLocation)
      window.removeEventListener("sselfie:maya-subtab-changed", syncFromMaya)
    }
  }, [])

  useEffect(() => {
    if (typeof document === "undefined") return
    document.documentElement.style.setProperty(
      "--sselfie-bottom-nav-height",
      "max(12px, env(safe-area-inset-bottom, 0px))",
    )
  }, [])

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return
    const node = appHeaderRef.current
    if (!node || typeof ResizeObserver === "undefined") return

    const updateAppHeaderHeight = () => {
      const height = Math.ceil(node.getBoundingClientRect().height)
      if (height > 0) {
        document.documentElement.style.setProperty("--studio-app-header-height", `${height}px`)
      }
    }

    updateAppHeaderHeight()
    const observer = new ResizeObserver(updateAppHeaderHeight)
    observer.observe(node)
    window.addEventListener("resize", updateAppHeaderHeight)

    return () => {
      observer.disconnect()
      window.removeEventListener("resize", updateAppHeaderHeight)
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
  const hubImageIdFromSearchParams = searchParams.get("hubImageId")
  const hubImageUrlFromSearchParams = searchParams.get("hubImageUrl")
  const hubVideoIdFromSearchParams = searchParams.get("hubVideoId")

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
  const lastScrollY = useRef(0)
  const appShellRef = useRef<HTMLDivElement | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const hasRedirectedToAcademyRef = useRef(false)
  const [creditsFetchFailed, setCreditsFetchFailed] = useState(false)
  const upgradeImpressionsLogged = useRef<Set<string>>(new Set())
  const [upgradeOpportunities, setUpgradeOpportunities] = useState<UpgradeOpportunity[]>([])
  const [dismissedUpgradeTypes, setDismissedUpgradeTypes] = useState<Set<string>>(new Set())
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [currentTierForUpgrade] = useState<"one_time_session" | "sselfie_studio_membership">(
    "sselfie_studio_membership",
  )
  const [pendingWelcomeDismissed, setPendingWelcomeDismissed] = useState(false)
  const { data: pendingWelcomeData } = useSWR(
    "/api/user/pending-welcome",
    simpleFetcher,
    { revalidateOnFocus: false, dedupingInterval: 300000 },
  )
  const pendingWelcomeProduct: string | null = pendingWelcomeData?.pending ?? null

  useEffect(() => {
    if (!tabFromSearchParams) return
    setActiveTab((currentTab) => (currentTab === tabFromSearchParams ? currentTab : tabFromSearchParams))
  }, [tabFromSearchParams])

  useEffect(() => {
    if (activeTab !== "maya") return
    const shell = appShellRef.current
    if (!shell) return

    const keepMayaShellPinned = () => {
      shell.scrollTop = 0
    }

    keepMayaShellPinned()
    const firstFrame = window.requestAnimationFrame(() => {
      keepMayaShellPinned()
      window.requestAnimationFrame(keepMayaShellPinned)
    })
    const timeoutId = window.setTimeout(keepMayaShellPinned, 250)

    shell.addEventListener("scroll", keepMayaShellPinned, { passive: true })
    window.addEventListener("resize", keepMayaShellPinned)

    return () => {
      window.cancelAnimationFrame(firstFrame)
      window.clearTimeout(timeoutId)
      shell.removeEventListener("scroll", keepMayaShellPinned)
      window.removeEventListener("resize", keepMayaShellPinned)
    }
  }, [activeTab])

  useEffect(() => {
    let cancelScheduledTabSync: (() => void) | null = null
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

      cancelScheduledTabSync?.()
      cancelScheduledTabSync = scheduleStudioTabUpdate(() => {
        setActiveTab((currentTab) => (currentTab === nextTab ? currentTab : nextTab))
      })
    }

    window.addEventListener("popstate", handlePopState)
    return () => {
      cancelScheduledTabSync?.()
      window.removeEventListener("popstate", handlePopState)
    }
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
    userRole,
  })
  // New users: not a member, has welcome credits (just signed up), and hasn't trained a model yet.
  // Once credits hit 0 OR they train a model, they've experienced value and see the full tab bar.
  const isNewUser = !access.isMember && creditBalance > 0 && !hasTrainedModel

  const isPaidBlueprintUserForAccess =
    (access.isPaidBlueprintOnly || blueprintEntitlementType === "paid") && !access.isMember
  const isOneTimeSession = productType === "one_time_session"
  const isOneTimeAcademyProductBuyer = [
    "starter_kit",
    "prompt_vault",
    "selfie_to_brand_shoot_system",
    "selfie_guide",
    "selfie_guide_bundle",
    "masterclass",
    "editing_masterclass",
    "brand_strategy_pack",
  ].includes(productType || "")
  const hasAcademyPurchases = ownedProducts.length > 0
  const academyBlocked = !access.hasFullAccess && !hasAcademyPurchases

  const { toast } = useToast()

  const handleTabChange = (tabId: StudioTab) => {
    // Guard: if the tab is locked, show an informational toast instead of navigating.
    const tabDef = tabs.find((t) => t.id === tabId)
    if (tabDef?.locked) {
      toast({
        title: `${tabDef.label} · SSELFIE SUITE`,
        description: tabDef.lockMessage ?? "Available with SSELFIE SUITE.",
      })
      return
    }

    setActiveTab(tabId)
    // Keep query tab + hash aligned for deep-linking and back/forward consistency.
    const nextUrl = new URL(window.location.href)
    nextUrl.searchParams.set("tab", tabId)
    nextUrl.hash =
      tabId === "maya"
        ? `maya/${activeMayaSubTab}`
        : tabId
    window.history.pushState(null, "", `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`)
  }

  const handleMayaSubTabChange = (tabId: MayaSubTab) => {
    setActiveMayaSubTab(tabId)
    setActiveTab("maya")

    const hashMap: Record<MayaSubTab, string> = {
      photos: "#maya/photos",
      plan: "#maya/plan",
      videos: "#maya/videos",
      training: "#maya/training",
    }

    const nextUrl = new URL(window.location.href)
    nextUrl.searchParams.set("tab", "maya")
    nextUrl.hash = hashMap[tabId]
    window.history.pushState(null, "", `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`)
    window.localStorage.setItem("mayaActiveTab", tabId)
    window.dispatchEvent(new CustomEvent("sselfie:maya-subtab-change", { detail: { tab: tabId } }))
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
    if (shouldShowCheckout && !isLoadingCredits) {
      // Only show modal if explicitly requested via URL param
    }
  }, [shouldShowCheckout, isLoadingCredits])

  // ─── Tiered nav visibility ────────────────────────────────────────────────
  // Every user sees all 6 tabs; locked tabs are dimmed + show a toast on click.
  // Rules:
  //   Full Studio member / admin → nothing locked
  //   Blueprint-only            → maya, studio, gallery locked
  //   Academy-only buyer        → maya, studio, gallery, feed-planner locked
  //   Free / zero-credit user   → studio, gallery, feed-planner, academy locked
  const isAcademyOnlyUser = hasAcademyPurchases && !access.isMember && !isPaidBlueprintUserForAccess

  // Redirect academy-only buyers to the Academy tab on first load.
  // Placed here (after isAcademyOnlyUser is declared) to avoid a TDZ crash
  // — dep arrays are evaluated immediately when the function body executes.
  useEffect(() => {
    if (!myProductsData) return // wait for SWR to resolve
    if (hasRedirectedToAcademyRef.current) return // only run once
    if (!isAcademyOnlyUser) return // only for academy-only buyers

    // Respect explicit tab param in URL (e.g. from a checkout redirect)
    const explicitTab =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("tab")
        : null
    if (explicitTab && isStudioTab(explicitTab) && explicitTab !== "maya") return

    hasRedirectedToAcademyRef.current = true
    setActiveTab("academy")
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href)
      url.searchParams.set("tab", "academy")
      url.hash = "academy"
      window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`)
    }
  }, [myProductsData, isAcademyOnlyUser])

  const STUDIO_LOCK_MSG = "Included with SSELFIE SUITE"

  type AppTab = { id: StudioTab; label: string; locked?: boolean; lockMessage?: string }

  const BASE_TABS: AppTab[] = [
    { id: "maya",         label: "Maya" },
    { id: "gallery",      label: "Gallery" },
    { id: "academy",      label: "Learn" },
    { id: "account",      label: "Account" },
    { id: "feed-planner", label: "Planner" },
    { id: "studio",       label: "Studio" },
  ]

  const lockedTabIds: StudioTab[] = (() => {
    if (access.hasFullAccess) return []
    if (isPaidBlueprintUserForAccess) return ["maya", "studio", "gallery"]
    if (isAcademyOnlyUser) return ["maya", "studio", "gallery", "feed-planner"]
    // Free / no-credit users
    return ["studio", "gallery", "feed-planner", "academy"]
  })()

  const tabs: AppTab[] = BASE_TABS.map((tab) =>
    lockedTabIds.includes(tab.id)
      ? { ...tab, locked: true, lockMessage: STUDIO_LOCK_MSG }
      : tab,
  )
  const isMayaConsolidated = isMayaConsolidatedExperienceEnabled()
  const primaryTabs = isMayaConsolidated
    ? tabs.filter((tab) => tab.id === "maya" || tab.id === "gallery" || tab.id === "academy" || tab.id === "account")
    : tabs
  const secondaryTabs = tabs.filter((tab) => !primaryTabs.some((primaryTab) => primaryTab.id === tab.id))

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

  const handlePostPurchaseStudioOnboardingHandled = useCallback(() => {
    setPendingPostPurchaseStudioOnboarding(false)
  }, [])

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
  const appShellClassName =
    activeTab === "maya"
      ? "relative h-full overflow-visible"
      : `relative h-full ${DesignClasses.container} overflow-hidden`

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
        ref={appShellRef}
        className="sselfie-app-shell stone-stage h-screen relative overflow-x-hidden"
        style={{
          fontFamily: "var(--font-body)",
          paddingTop: "env(safe-area-inset-top)",
          overflow: activeTab === "maya" ? "clip" : undefined,
        }}
      >
        <ServiceWorkerProvider />

      <div className="pointer-events-none absolute inset-0">
        <div className="app-shell-backdrop absolute inset-[-8%]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--color-porcelain)_28%,transparent)_0%,color-mix(in_srgb,var(--color-pearl)_22%,transparent)_52%,color-mix(in_srgb,var(--color-whisper)_34%,transparent)_100%)]" />
        <div className="absolute top-[-10%] left-[12%] h-[24rem] w-[24rem] rounded-full bg-[color-mix(in_srgb,var(--color-porcelain)_48%,transparent)] blur-[120px]" />
        <div className="absolute bottom-[-14%] right-[10%] h-[22rem] w-[22rem] rounded-full bg-[color-mix(in_srgb,var(--color-whisper)_40%,transparent)] blur-[120px]" />
      </div>

      {isWelcome && creditBalance === 0 && (
        <div className="hidden absolute top-0 left-0 right-0 z-50 bg-stone-900 text-white py-3 px-4 text-center">
          <p className="text-sm font-medium">
            Your first brand photo is one selfie away. Get credits and let&apos;s get it done. It takes under 2 minutes.
          </p>
        </div>
      )}

      {/* Past-due billing banner — shown to users whose payment failed */}
      {subscriptionStatus === "past_due" && (
        <div className="relative z-50 flex items-center justify-between gap-3 bg-[rgba(180,80,60,0.18)] border-b border-[rgba(220,100,80,0.35)] px-4 py-2.5">
          <p className="text-xs text-[color:var(--color-porcelain)] leading-snug">
            <span className="font-medium">Your last payment didn&apos;t go through.</span>{" "}
            Update your card to keep your photos and credits.
          </p>
          <a
            href="/studio?tab=settings"
            className="shrink-0 rounded-sm bg-[color-mix(in_srgb,var(--color-porcelain)_12%,transparent)] hover:bg-[color-mix(in_srgb,var(--color-porcelain)_20%,transparent)] border border-[color-mix(in_srgb,var(--color-porcelain)_20%,transparent)] px-3 py-1 text-xs font-medium text-[color:var(--color-porcelain)] transition-colors whitespace-nowrap"
          >
            Update card →
          </a>
        </div>
      )}

      {/* Zero-credit upgrade banner — shown to non-members who've run out of credits */}
      {creditBalance === 0 && subscriptionStatus !== "active" && subscriptionStatus !== "trialing" && subscriptionStatus !== "past_due" && (
        <div className="relative z-50 flex items-center justify-between gap-3 bg-[color-mix(in_srgb,var(--color-porcelain)_6%,transparent)] border-b border-[color-mix(in_srgb,var(--color-porcelain)_12%,transparent)] px-4 py-2.5">
          <p className="text-xs text-[color:var(--color-whisper)] leading-snug">
            <span className="font-medium text-[color:var(--color-porcelain)]">You&apos;re out of credits.</span>{" "}
            Get the SUITE to keep generating: 200 credits every month.
          </p>
          <a
            href="/checkout/membership"
            className="shrink-0 rounded-sm bg-[color:var(--color-porcelain)] hover:opacity-90 px-3 py-1 text-xs font-medium text-[color:var(--color-obsidian)] transition-opacity whitespace-nowrap"
          >
            Get the SUITE →
          </a>
        </div>
      )}

      {/* First-photo celebration toast — fires once when the first credit is spent */}
      {showFirstPhotoToast && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-[color:var(--app-overlay)] backdrop-blur-[42px] border-b border-[color:var(--glass-border-subtle)] px-4 py-3 flex items-center justify-between animate-in slide-in-from-top-2 duration-500">
          <div>
            <p className="text-sm font-medium text-[color:var(--color-porcelain)]">Your first brand photo is done.</p>
            <p className="text-xs text-[color:var(--color-smoke)] mt-0.5">You just proved this works. Feed Planner, Gallery &amp; Academy are now yours. Go explore.</p>
          </div>
          <button onClick={() => setShowFirstPhotoToast(false)} className="text-[color:var(--color-smoke)] hover:text-[color:var(--color-porcelain)] ml-4 shrink-0" aria-label="Dismiss">
            <span className="text-[10px] tracking-[0.2em] uppercase">Close</span>
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
            <div className="bg-[color:var(--glass-bg)] backdrop-blur-[30px] text-[color:var(--color-porcelain)] rounded-xl border border-[color:var(--glass-input-border)] shadow-lg overflow-hidden">
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
                  <span className="text-sm font-medium text-[color:var(--color-porcelain)]">Welcome! Let&apos;s get started</span>
                  <span className="text-[10px] tracking-[0.2em] uppercase text-[color:var(--color-smoke)] shrink-0 group-hover:text-[color:var(--color-porcelain)] transition-colors" aria-hidden>
                    Open
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowAcademyWelcomeBanner(false)}
                  className="shrink-0 p-1.5 rounded-lg hover:bg-[color:var(--glass-bg-mid)] transition-colors"
                  aria-label="Dismiss welcome banner"
                >
                  <span className="text-[10px] tracking-[0.2em] uppercase text-[color:var(--color-smoke)]">Close</span>
                </button>
              </div>
            </div>
          </div>
        )}

      <StudioAppTopBar
        ref={appHeaderRef}
        tabs={primaryTabs}
        activeTab={activeTab}
        onTabChange={(id) => handleTabChange(id as StudioTab)}
        mayaSubTabs={isMayaConsolidated ? [] : MAYA_SUB_TABS}
        activeMayaSubTab={isMayaConsolidated ? undefined : activeMayaSubTab}
        onMayaSubTabChange={isMayaConsolidated ? undefined : handleMayaSubTabChange}
        trailing={
          <>
            {activeTab === "feed-planner" && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className={`flex items-center gap-1.5 px-3 py-1.5 ${DesignClasses.radius.sm} hover:bg-[color:var(--app-btn-secondary-hover)] transition-colors text-xs font-medium text-[color:var(--app-text-primary)] min-h-[36px]`}
                    aria-label="My Feed"
                    style={{ background: "var(--app-btn-secondary-bg)", border: "1px solid var(--app-glass-border)" }}
                  >
                    <span>Feeds</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="sselfie-app-portal-theme z-[240] w-56 rounded-[16px] border-[color:var(--app-glass-border)] bg-[color:var(--app-glass-bg)] text-[color:var(--app-text-primary)] shadow-[var(--app-shadow-soft)] backdrop-blur-[20px]"
                >
                  <div className="px-3 py-2">
                    <div className={`${DesignClasses.typography.label.uppercase} mb-2 text-[color:var(--app-text-secondary)]`}>Feed History</div>
                    <div className="max-h-64 overflow-y-auto">
                      {isLoadingFeeds ? (
                        <div className="px-2 py-4 text-center text-xs text-[color:var(--app-text-secondary)]">Loading feeds...</div>
                      ) : feedListError ? (
                        <div className="px-2 py-4 text-center text-xs text-red-600">Failed to load feeds</div>
                      ) : feeds.length === 0 ? (
                        <div className="px-2 py-4 text-center text-xs text-[color:var(--app-text-secondary)]">No feeds yet</div>
                      ) : (
                        feeds.map((feed: any) => (
                          <div key={feed.id} className="group relative">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                const currentPath = window.location.pathname
                                router.replace(`${currentPath}?feedId=${feed.id}#feed-planner`)
                              }}
                              className={`cursor-pointer rounded-[8px] text-[color:var(--app-text-primary)] focus:bg-[color:var(--app-btn-secondary-hover)] ${
                                currentFeedId === feed.id ? "bg-[color:var(--app-btn-secondary-bg)]" : ""
                              }`}
                            >
                              <div className="flex items-center gap-2.5 w-full">
                                <div
                                  className="w-4 h-4 rounded-full shrink-0 border-2 flex-shrink-0"
                                  style={{
                                    backgroundColor: feed.display_color || "var(--stone-200)",
                                    borderColor: feed.display_color || "var(--app-input-border)",
                                    borderStyle: feed.display_color ? "solid" : "dashed",
                                  }}
                                  title={feed.display_color ? `Color: ${feed.display_color}` : "No color set"}
                                >
                                  {!feed.display_color && (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <div className="w-1.5 h-1.5 rounded-full bg-[color:var(--app-text-muted)]"></div>
                                    </div>
                                  )}
                                </div>
                                <div className="flex flex-col flex-1 min-w-0">
                                  <span className="text-sm font-medium text-[color:var(--app-text-primary)] truncate">{feed.title || `Feed ${feed.id}`}</span>
                                  {feed.layout_type === "preview" ? (
                                    <span className="text-xs text-[color:var(--app-text-secondary)]">Preview Feed</span>
                                  ) : feed.image_count !== undefined ? (
                                    <span className="text-xs text-[color:var(--app-text-secondary)]">{feed.image_count}/{feed.layout_type === "grid_3x4" ? "12" : "9"} images</span>
                                  ) : null}
                                </div>
                              </div>
                            </DropdownMenuItem>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleEditFeed(feed)
                              }}
                              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 opacity-0 transition-opacity hover:bg-[color:var(--app-btn-secondary-hover)] group-hover:opacity-100"
                              aria-label="Edit feed"
                            >
                              <span className="text-[9px] tracking-[0.2em] uppercase text-[color:var(--app-text-secondary)]">Edit</span>
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  className={`flex items-center justify-center w-9 h-9 ${DesignClasses.radius.sm} hover:bg-[color:var(--app-btn-secondary-hover)] transition-colors`}
                  aria-label="Menu"
                  style={{ background: "var(--app-btn-secondary-bg)", border: "1px solid var(--app-glass-border)" }}
                >
                  <span className="text-base leading-none text-[color:var(--app-text-primary)]">≡</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="sselfie-app-portal-theme z-[240] w-64 rounded-[16px] border-[color:var(--app-glass-border)] bg-[color:var(--app-glass-bg)] text-[color:var(--app-text-primary)] shadow-[var(--app-shadow-soft)] backdrop-blur-[20px]"
              >
                <div className="px-3 py-2">
                  <div className={`${DesignClasses.typography.label.uppercase} text-[color:var(--app-text-secondary)]`}>
                    Your Credits
                  </div>
                  <div className="mt-1 font-serif text-2xl font-extralight tabular-nums text-[color:var(--app-text-primary)]">
                    {creditBalance.toFixed(1)}
                  </div>
                </div>
                <DropdownMenuSeparator className="bg-[color:var(--app-glass-border)]" />
                {activeTab === "maya" && isMayaConsolidated ? (
                  <>
                    <div className="px-3 py-2">
                      <div className={`${DesignClasses.typography.label.uppercase} mb-1 text-[color:var(--app-text-secondary)]`}>Maya</div>
                      <div className="grid grid-cols-2 gap-1">
                        {MAYA_SUB_TABS.map((tab) => {
                          const isSubActive = activeMayaSubTab === tab.id
                          const label =
                            tab.id === "photos"
                              ? "Create"
                              : tab.id === "plan"
                                ? "Captions"
                                : tab.id === "training"
                                  ? "My Look"
                                  : tab.label

                          return (
                            <button
                              key={`maya-menu-${tab.id}`}
                              type="button"
                              onClick={() => {
                                handleMayaSubTabChange(tab.id)
                                setIsMenuOpen(false)
                              }}
                              className={`flex items-center justify-between ${DesignClasses.spacing.gap.sm} px-2 py-2 ${DesignClasses.radius.sm} text-left transition-colors ${
                                isSubActive
                                  ? "bg-[color:var(--app-btn-primary-bg)] text-[color:var(--app-btn-primary-text)]"
                                  : "text-[color:var(--app-text-primary)] hover:bg-[color:var(--app-btn-secondary-hover)]"
                              }`}
                            >
                              <span className="text-xs font-medium">{label}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                    <DropdownMenuSeparator className="bg-[color:var(--app-glass-border)]" />
                  </>
                ) : null}

                <div className="px-3 py-2">
                  <div className={`${DesignClasses.typography.label.uppercase} mb-1 text-[color:var(--app-text-secondary)]`}>
                    {isMayaConsolidated ? "App" : "Navigate"}
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {primaryTabs.map((tab) => {
                      const isMenuTabActive = activeTab === tab.id
                      const isMenuTabLocked = !!tab.locked

                      return (
                        <button
                          key={`menu-${tab.id}`}
                          onClick={() => {
                            handleTabChange(tab.id as StudioTab)
                            if (!isMenuTabLocked) setIsMenuOpen(false)
                          }}
                          className={`flex items-center justify-between ${DesignClasses.spacing.gap.sm} px-2 py-2 ${DesignClasses.radius.sm} text-left transition-colors ${
                            isMenuTabActive && !isMenuTabLocked
                              ? "bg-[color:var(--app-btn-primary-bg)] text-[color:var(--app-btn-primary-text)]"
                              : isMenuTabLocked
                              ? "text-[color:var(--app-text-secondary)] opacity-50 cursor-default"
                              : "text-[color:var(--app-text-primary)] hover:bg-[color:var(--app-btn-secondary-hover)]"
                          }`}
                        >
                          <span className="text-xs font-medium">{tab.label}</span>
                          {isMenuTabLocked && (
                            <svg width="8" height="9" viewBox="0 0 8 9" fill="none" aria-hidden className="shrink-0 opacity-60">
                              <rect x="1" y="4" width="6" height="5" rx="0.5" fill="currentColor" />
                              <path d="M2.5 4V3a1.5 1.5 0 0 1 3 0v1" stroke="currentColor" strokeWidth="1.1" fill="none" strokeLinecap="round" />
                            </svg>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
                {isMayaConsolidated && secondaryTabs.length > 0 ? (
                  <>
                    <DropdownMenuSeparator className="bg-[color:var(--app-glass-border)]" />
                    <div className="px-3 py-2">
                      <div className={`${DesignClasses.typography.label.uppercase} mb-1 text-[color:var(--app-text-secondary)]`}>More tools</div>
                      <div className="grid grid-cols-2 gap-1">
                        {secondaryTabs.map((tab) => {
                          const isMenuTabActive = activeTab === tab.id
                          const isMenuTabLocked = !!tab.locked

                          return (
                            <button
                              key={`secondary-menu-${tab.id}`}
                              onClick={() => {
                                handleTabChange(tab.id as StudioTab)
                                if (!isMenuTabLocked) setIsMenuOpen(false)
                              }}
                              className={`flex items-center justify-between ${DesignClasses.spacing.gap.sm} px-2 py-2 ${DesignClasses.radius.sm} text-left transition-colors ${
                                isMenuTabActive && !isMenuTabLocked
                                  ? "bg-[color:var(--app-btn-primary-bg)] text-[color:var(--app-btn-primary-text)]"
                                  : isMenuTabLocked
                                    ? "text-[color:var(--app-text-secondary)] opacity-50 cursor-default"
                                    : "text-[color:var(--app-text-primary)] hover:bg-[color:var(--app-btn-secondary-hover)]"
                              }`}
                            >
                              <span className="text-xs font-medium">{tab.label}</span>
                              {isMenuTabLocked && (
                                <svg width="8" height="9" viewBox="0 0 8 9" fill="none" aria-hidden className="shrink-0 opacity-60">
                                  <rect x="1" y="4" width="6" height="5" rx="0.5" fill="currentColor" />
                                  <path d="M2.5 4V3a1.5 1.5 0 0 1 3 0v1" stroke="currentColor" strokeWidth="1.1" fill="none" strokeLinecap="round" />
                                </svg>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </>
                ) : null}
                <DropdownMenuSeparator className="bg-[color:var(--app-glass-border)]" />
                <DropdownMenuItem
                  onClick={() => {
                    setShowBuyCreditsModal(true)
                    setIsMenuOpen(false)
                  }}
                  className="cursor-pointer rounded-[8px] text-[color:var(--app-text-primary)] focus:bg-[color:var(--app-btn-secondary-hover)] focus:text-[color:var(--app-text-primary)]"
                >
                  <span className="text-sm">Buy More Credits</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  asChild
                  className="cursor-pointer rounded-[8px] text-[color:var(--app-text-primary)] focus:bg-[color:var(--app-btn-secondary-hover)] focus:text-[color:var(--app-text-primary)]"
                >
                  <div>
                    <InstallButton variant="menu" />
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-[color:var(--app-glass-border)]" />
                <DropdownMenuItem
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="cursor-pointer rounded-[8px] text-red-700 focus:bg-red-500/10 focus:text-red-700"
                >
                  <span className="text-sm">{isLoggingOut ? "Signing Out..." : "Sign Out"}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />

      <Dialog open={!!editingFeed} onOpenChange={(open) => !open && setEditingFeed(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Feed</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-[color:var(--app-text-muted)] mb-1.5 block">
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
              <label className="text-sm font-medium text-[color:var(--app-text-muted)] mb-2 block">
                Color
              </label>
              <div className="grid grid-cols-6 gap-2">
                {presetColors.map((color) => (
                  <button
                    key={color.value || "none"}
                    onClick={() => setEditColor(color.value)}
                    className={`w-10 h-10 rounded-full border-2 transition-all ${
                      editColor === color.value
                        ? "border-[color:var(--color-porcelain)] scale-110"
                        : "border-[color:var(--app-glass-border)] hover:border-[color:var(--app-input-border)]"
                    }`}
                    style={{
                      backgroundColor: color.value || "transparent",
                      borderStyle: color.value ? "solid" : "dashed",
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
              className="px-4 py-2 text-sm text-[color:var(--app-text-secondary)] hover:text-[color:var(--app-text-primary)]"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveFeed}
              disabled={isSaving}
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                isSaving
                  ? "bg-[color:var(--app-btn-secondary-bg)] text-[color:var(--app-text-secondary)] cursor-not-allowed"
                  : "bg-[color:var(--app-btn-primary-bg)] text-[color:var(--app-btn-primary-text)] hover:bg-[color:var(--stone-dark)]"
              }`}
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <main className="relative h-full overflow-hidden lg:mx-3 pb-2 sm:pb-3 md:pb-4">
        <div className={appShellClassName}>

          {/*
            Maya is rendered OUTSIDE the scroll container and AnimatePresence.
            Reason: MayaChatScreen uses position:fixed for its header and input bar.
            Wrapping it in a motion.div (even with opacity-only animation) causes
            Framer Motion to apply will-change/transform, which creates a new
            compositing layer. On iOS Safari this traps position:fixed children
            relative to the layer instead of the viewport — clipping the header
            and misplacing the input bar on real devices.
          */}
          {activeTab === "maya" && (
            <MayaChatScreen
              onImageGenerated={refreshCredits}
              user={user}
              setActiveTab={(tab) => handleTabChange(tab as StudioTab)}
              userId={String(userId)}
              hasTrainedModel={hasTrainedModel}
              isMembership={access.hasFullAccess}
              academyPurchaseProduct={academyPurchaseProduct}
              firstTimeProductUser={firstTimeProductUser}
              pendingPostPurchaseStudioOnboarding={pendingPostPurchaseStudioOnboarding}
              onPostPurchaseStudioOnboardingHandled={handlePostPurchaseStudioOnboardingHandled}
              mayaNavMenuOpen={mayaNavMenuOpen}
              onMayaNavMenuOpenChange={setMayaNavMenuOpen}
            />
          )}

          {/* All non-Maya tabs share the standard scroll container + AnimatePresence */}
          {activeTab !== "maya" && (
            <div
              ref={scrollContainerRef}
              className={`h-full ${DesignClasses.spacing.paddingX.md} pb-8 sm:pb-10 md:pb-12 pt-[calc(var(--studio-app-header-height,80px)+0.5rem)] sm:pt-[calc(var(--studio-app-header-height,80px)+0.75rem)] overflow-y-auto`}
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
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                >
                  {activeTab === "studio" && (
                    <StudioHubScreen />
                  )}
                  {activeTab === "gallery" && (
                    // Gallery is always accessible — users must be able to view their images
                    // even when credits are exhausted or subscription has lapsed.
                    // canUseGenerators only gates NEW generation, not viewing existing images.
                    <GalleryScreen
                      user={user}
                      userId={userId}
                      hasPaidAccess={access.isMember || isPaidBlueprintUserForAccess}
                      hubImageId={hubImageIdFromSearchParams}
                      hubImageUrl={hubImageUrlFromSearchParams}
                      hubVideoId={hubVideoIdFromSearchParams}
                    />
                  )}
                  {activeTab === "feed-planner" && (
                    lockedTabIds.includes("feed-planner") ? (
                      <UpgradeOrCredits
                        feature="Planner"
                        isPaidBlueprintUser={isPaidBlueprintUserForAccess}
                        requiresMembership={true}
                      />
                    ) : (
                      <FeedPlannerClient userId={userId.toString()} userName={userName} />
                    )
                  )}
                  {activeTab === "academy" && (
                    academyBlocked ? (
                      <UpgradeOrCredits feature="Academy" isPaidBlueprintUser={isPaidBlueprintUserForAccess} requiresMembership={true} />
                    ) : (
                      <AcademyScreen />
                    )
                  )}
                  {activeTab === "account" && <AccountScreen user={user} creditBalance={creditBalance} />}
                </motion.div>
              </AnimatePresence>
            </div>
          )}
        </div>
      </main>

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
      <ZeroCreditsUpgradeModal
        credits={creditBalance}
        suppress={!myProductsData || isAcademyOnlyUser || isOneTimeAcademyProductBuyer}
      />

      {/* Post-purchase welcome modal: shown once after any paid checkout */}
      {pendingWelcomeProduct && !pendingWelcomeDismissed && (
        <PostPurchaseWelcomeModal
          productType={pendingWelcomeProduct}
          onDismiss={() => setPendingWelcomeDismissed(true)}
          onNavigate={(tabId) => {
            if (
              shouldArmStudioMemberPostPurchaseOnboarding({
                productType: pendingWelcomeProduct,
                targetTab: tabId,
              })
            ) {
              setPendingPostPurchaseStudioOnboarding(true)
            }
            setActiveTab(tabId as StudioTab)
            setPendingWelcomeDismissed(true)
          }}
        />
      )}

      {/* Hide feedback button when on maya chat screen or feed planner */}
      {activeTab !== "maya" && activeTab !== "feed-planner" && (
        <FeedbackButton userId={String(userId)} userEmail={userEmail} userName={userName} />
      )}

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
