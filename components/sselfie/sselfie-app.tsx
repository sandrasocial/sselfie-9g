"use client"

import { useState, useEffect, useRef } from "react"
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
  Film,
  LayoutGrid,
} from "lucide-react"
import LoadingScreen from "./loading-screen"
import StudioScreen from "./studio-screen"
import TrainingScreen from "./training-screen"
import MayaChatScreen from "./maya-chat-screen"
import GalleryScreen from "./gallery-screen"
import BRollScreen from "./b-roll-screen"
import AcademyScreen from "./academy-screen"
import ProfileScreen from "./profile-screen"
import SettingsScreen from "./settings-screen"
import FeedPlannerScreen from "../feed-planner/feed-planner-screen" // Fixed import path to correct location
import { InstallPrompt } from "./install-prompt"
import { InstallButton } from "./install-button"
import { ServiceWorkerProvider } from "./service-worker-provider"
import BuyCreditsModal from "./buy-credits-modal"
import { LowCreditModal } from "@/components/credits/low-credit-modal"
import { ZeroCreditsUpgradeModal } from "@/components/credits/zero-credits-upgrade-modal"
import { FeedbackButton } from "@/components/feedback/feedback-button"
import { UpgradeOrCredits } from "@/components/UpgradeOrCredits"
import type { User as UserType } from "./types"
import { getAccessState } from "./access"
import { SmartUpgradeBanner } from "@/components/upgrade/smart-upgrade-banner"
import { UpgradeModal } from "@/components/upgrade/upgrade-modal"
import type { UpgradeOpportunity } from "@/lib/upgrade-detection"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

interface SselfieAppProps {
  userId: string
  userName: string | null
  userEmail: string | null
  isWelcome?: boolean
  shouldShowCheckout?: boolean
  subscriptionStatus?: string | null
}

export default function SselfieApp({
  userId,
  userName,
  userEmail,
  isWelcome = false,
  shouldShowCheckout = false,
  subscriptionStatus = null,
}: SselfieAppProps) {
  const getInitialTab = () => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash.slice(1) // Remove the # symbol
      const validTabs = [
        "studio",
        "training",
        "maya",
        "b-roll",
        "gallery",
        "feed-planner",
        "academy",
        "profile",
        "settings",
      ]
      return validTabs.includes(hash) ? hash : "studio"
    }
    return "studio"
  }

  const [activeTab, setActiveTab] = useState(getInitialTab)
  const [isLoading, setIsLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [hasTrainedModel, setHasTrainedModel] = useState(false)
  const [isLoadingTrainingStatus, setIsLoadingTrainingStatus] = useState(true)
  const [creditBalance, setCreditBalance] = useState<number>(0)
  const [isLoadingCredits, setIsLoadingCredits] = useState(true)
  const [showBuyCreditsModal, setShowBuyCreditsModal] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isNavVisible, setIsNavVisible] = useState(true)
  const lastScrollY = useRef(0)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [creditsFetchFailed, setCreditsFetchFailed] = useState(false)
  const upgradeImpressionsLogged = useRef<Set<string>>(new Set())
  const [upgradeOpportunities, setUpgradeOpportunities] = useState<UpgradeOpportunity[]>([])
  const [dismissedUpgradeTypes, setDismissedUpgradeTypes] = useState<Set<string>>(new Set())
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [currentTierForUpgrade] = useState<"one_time_session" | "sselfie_studio_membership" | "brand_studio_membership">(
    "sselfie_studio_membership",
  )

  useEffect(() => {
    const handlePopState = () => {
      const hash = window.location.hash.slice(1)
      const validTabs = [
        "studio",
        "training",
        "maya",
        "b-roll",
        "gallery",
        "feed-planner",
        "academy",
        "profile",
        "settings",
      ]
      if (validTabs.includes(hash)) {
        setActiveTab(hash)
      } else {
        setActiveTab("studio")
      }
    }

    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [])

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

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId)
    // Update URL without triggering a page reload
    window.history.pushState(null, "", `#${tabId}`)
  }

  useEffect(() => {
    const fetchCredits = async () => {
      try {
        const response = await fetch("/api/user/credits")
        if (!response.ok) {
          console.error("[v0] Credit fetch failed with status:", response.status)
          setCreditBalance(0)
          setCreditsFetchFailed(true)
          return
        }
        const data = await response.json()
        console.log("[v0] Credit balance:", data)
        setCreditBalance(data.balance || 0)
        setCreditsFetchFailed(false)
      } catch (error) {
        console.error("[v0] Error fetching credits:", error)
        setCreditBalance(0)
        setCreditsFetchFailed(true)
      } finally {
        setIsLoadingCredits(false)
      }
    }

    fetchCredits()
  }, [])

  const refreshCredits = async () => {
    try {
      const response = await fetch("/api/user/credits")
      const data = await response.json()
      setCreditBalance(data.balance || 0)
    } catch (error) {
      console.error("[v0] Error refreshing credits:", error)
    }
  }

  useEffect(() => {
    const fetchTrainingStatus = async () => {
      try {
        const response = await fetch("/api/training/status")
        const data = await response.json()
        console.log("[v0] Training status data:", data)
        setHasTrainedModel(data.hasTrainedModel || false)
      } catch (error) {
        console.error("[v0] Error fetching training status:", error)
        setHasTrainedModel(false)
      } finally {
        setIsLoadingTrainingStatus(false)
      }
    }

    fetchTrainingStatus()
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 2500)
    const clockTimer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => {
      clearTimeout(timer)
      clearInterval(clockTimer)
    }
  }, [])

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current
    if (!scrollContainer) return

    const handleScroll = () => {
      const currentScrollY = scrollContainer.scrollTop
      const scrollDifference = currentScrollY - lastScrollY.current

      if (currentScrollY < 50) {
        setIsNavVisible(true)
      } else if (scrollDifference < -10) {
        setIsNavVisible(true)
      } else if (scrollDifference > 10) {
        setIsNavVisible(false)
      }

      lastScrollY.current = currentScrollY
    }

    scrollContainer.addEventListener("scroll", handleScroll, { passive: true })
    return () => scrollContainer.removeEventListener("scroll", handleScroll)
  }, [])

  useEffect(() => {
    if (shouldShowCheckout && !isLoadingCredits) {
      // Only show modal if explicitly requested via URL param
    }
  }, [shouldShowCheckout, isLoadingCredits])

  const tabs = [
    { id: "studio", label: "Studio", icon: Camera },
    { id: "training", label: "Training", icon: Aperture },
    { id: "maya", label: "Maya", icon: MessageCircle },
    { id: "b-roll", label: "B-Roll", icon: Film },
    { id: "gallery", label: "Gallery", icon: ImageIcon },
    { id: "feed-planner", label: "Feed", icon: LayoutGrid },
    { id: "academy", label: "Academy", icon: Grid },
    { id: "profile", label: "Profile", icon: User },
    { id: "settings", label: "Settings", icon: Settings },
  ]

  const user: UserType = {
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

  const access = getAccessState({
    credits: creditBalance,
    subscriptionStatus,
  })

  const activeUpgrade = upgradeOpportunities.find((op) => !dismissedUpgradeTypes.has(op.type))
  const shouldShowUpgradeBanner =
    ["studio", "gallery", "maya"].includes(activeTab) && !!activeUpgrade && access.canUseGenerators

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
        className="h-screen bg-linear-to-br from-stone-50 via-stone-100/50 to-stone-50 relative overflow-hidden prevent-horizontal-scroll"
        style={{
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          paddingTop: "env(safe-area-inset-top)",
        }}
      >
        <ServiceWorkerProvider />

      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-stone-200/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-stone-300/20 rounded-full blur-3xl"></div>
      </div>

      {isWelcome && creditBalance === 0 && (
        <div className="hidden absolute top-0 left-0 right-0 z-50 bg-stone-900 text-white py-3 px-4 text-center">
          <p className="text-sm font-medium">
            Welcome to SSELFIE! 🎉 Purchase credits to start creating your professional selfies
          </p>
        </div>
      )}

      <main className="relative h-full mx-1 sm:mx-2 md:mx-3 pb-2 sm:pb-3 md:pb-4">
        <div className="h-full bg-white/30 backdrop-blur-3xl rounded-4xl sm:rounded-[2.5rem] md:rounded-[3rem] border border-white/40 overflow-hidden shadow-2xl shadow-stone-900/10">
          {(activeTab === "studio" || activeTab === "training") && (
            <header className="sticky top-0 z-10 bg-white/70 backdrop-blur-xl border-b border-stone-200/40 px-3 sm:px-4 md:px-6 py-3 pt-safe">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 shrink-0">
                  <div className="font-serif text-xl sm:text-2xl font-extralight tracking-[0.3em] uppercase text-stone-950">
                    SSELFIE
                  </div>
                </div>

                <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/70 border border-white/60 hover:bg-white/90 transition-colors shadow-sm"
                      aria-label="Menu"
                    >
                      <MoreVertical size={18} className="text-stone-600" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64 bg-white/95 backdrop-blur-xl border-stone-200/60 shadow-lg">
                    <div className="px-3 py-2">
                      <div className="text-[10px] tracking-[0.15em] uppercase font-light text-stone-500">
                        Your Credits
                      </div>
                      <div className="text-2xl font-serif font-extralight text-stone-950 tabular-nums mt-1">
                        {creditBalance.toFixed(1)}
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    <div className="px-3 py-2">
                      <div className="text-[10px] tracking-[0.15em] uppercase font-light text-stone-500 mb-1">Navigate</div>
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
                              className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-stone-100/60 text-left transition-colors"
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
            </header>
          )}

          <div
            ref={scrollContainerRef}
            className="h-full px-4 sm:px-6 md:px-8 pb-32 sm:pb-36 md:pb-40 pt-4 sm:pt-6 md:pt-8 overflow-y-auto"
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

            {(activeTab === "studio" || activeTab === "maya" || activeTab === "training") &&
            !access.canUseGenerators ? (
              <UpgradeOrCredits
                feature={activeTab === "studio" ? "Studio" : activeTab === "maya" ? "Maya" : "Training"}
              />
            ) : (
              <>
                {activeTab === "studio" && (
                  <StudioScreen
                    user={user}
                    hasTrainedModel={hasTrainedModel}
                    setActiveTab={handleTabChange}
                    onImageGenerated={refreshCredits}
                  />
                )}
                {activeTab === "training" && (
                  <TrainingScreen
                    user={user}
                    userId={userId}
                    setHasTrainedModel={setHasTrainedModel}
                    setActiveTab={handleTabChange}
                  />
                )}
                {activeTab === "maya" && <MayaChatScreen onImageGenerated={refreshCredits} user={user} />}
                {activeTab === "b-roll" && <BRollScreen user={user} />}
                {activeTab === "gallery" && <GalleryScreen user={user} userId={userId} />}
                {activeTab === "feed-planner" && <FeedPlannerScreen />}
                {activeTab === "academy" && <AcademyScreen />}
                {activeTab === "profile" && <ProfileScreen user={user} creditBalance={creditBalance} />}
                {activeTab === "settings" && <SettingsScreen user={user} creditBalance={creditBalance} />}
              </>
            )}
          </div>
        </div>
      </main>

      {(activeTab === "studio" || activeTab === "training") && (
        <nav
          className={`fixed bottom-0 left-0 right-0 z-40 px-2 sm:px-3 md:px-4 transition-transform duration-300 ease-in-out ${
            isNavVisible ? "translate-y-0" : "translate-y-full"
          }`}
          style={{
            paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))",
          }}
          aria-label="Main navigation"
          aria-hidden={!isNavVisible}
        >
          <div className="bg-white/20 backdrop-blur-3xl rounded-[1.75rem] sm:rounded-4xl md:rounded-[2.5rem] border border-white/40 shadow-2xl shadow-stone-900/20">
            <div className="overflow-x-auto scrollbar-hide px-1.5 sm:px-2 md:px-3 py-2 sm:py-2.5 md:py-3">
              <div className="flex gap-1 sm:gap-2 min-w-max sm:justify-around">
                {tabs.map((tab) => {
                  const Icon = tab.icon
                  const isActive = activeTab === tab.id

                  return (
                    <button
                      key={tab.id}
                      onClick={() => handleTabChange(tab.id)}
                      className={`flex flex-col items-center space-y-1 px-2 sm:px-2.5 md:px-4 py-2 sm:py-2.5 md:py-3 rounded-2xl sm:rounded-2xl md:rounded-3xl transition-all duration-500 ease-out min-w-[60px] sm:min-w-[68px] md:min-w-[76px] relative touch-manipulation ${
                        isActive ? "transform scale-105" : "hover:scale-[1.02] active:scale-95"
                      }`}
                      aria-label={`Navigate to ${tab.label}`}
                      aria-current={isActive ? "page" : undefined}
                    >
                      {isActive && (
                        <div className="absolute inset-0 bg-linear-to-b from-white/90 to-white/70 backdrop-blur-2xl rounded-2xl sm:rounded-2xl md:rounded-3xl shadow-xl shadow-stone-900/20 border border-white/60"></div>
                      )}
                      <div
                        className={`relative z-10 w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-xl sm:rounded-2xl md:rounded-2xl flex items-center justify-center transition-all duration-500 ${
                          isActive ? "bg-stone-950 shadow-lg shadow-stone-900/30" : "bg-white/40 backdrop-blur-xl"
                        }`}
                        aria-hidden="true"
                      >
                        <Icon
                          size={isActive ? 19 : 17}
                          strokeWidth={2}
                          className={`transition-all duration-500 ${isActive ? "text-white" : "text-stone-600"}`}
                        />
                      </div>
                      <span
                        className={`relative z-10 text-[9px] sm:text-[10px] md:text-[11px] font-semibold tracking-wide transition-all duration-500 whitespace-nowrap ${
                          isActive ? "text-stone-900" : "text-stone-500 opacity-70"
                        }`}
                      >
                        {tab.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </nav>
      )}

      <InstallPrompt />

      <BuyCreditsModal
        open={showBuyCreditsModal}
        onOpenChange={setShowBuyCreditsModal}
        onSuccess={handleCreditsPurchased}
      />

      <UpgradeModal
        open={showUpgradeModal}
        currentTier={currentTierForUpgrade}
        targetTier="brand_studio_membership"
        onClose={() => setShowUpgradeModal(false)}
      />

      <LowCreditModal credits={creditBalance} threshold={30} />
      <ZeroCreditsUpgradeModal credits={creditBalance} />

      <FeedbackButton userId={userId} userEmail={userEmail} userName={userName} />
      </div>
  )
}
