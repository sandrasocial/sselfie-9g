"use client"

import { useState, useEffect } from "react"
import {
  Bell,
  Aperture,
  Shield,
  User,
  ChevronRight,
  LogOut,
  Mail,
  Calendar,
  CreditCard,
  Package,
  ExternalLink,
  X,
  Home,
  MessageCircle,
  ImageIcon,
  Grid,
  SettingsIcon,
  Lock,
  Film,
} from "lucide-react"
import { useRouter } from "next/navigation"
import BrandAssetsManager from "./brand-assets-manager"
import { UpgradeModal } from "@/components/upgrade/upgrade-modal"
import { getAccessLabel } from "@/lib/customer-access-labels"
import { notifyAnalyticsLogout } from "@/lib/analytics/auth-browser-signal"

interface SettingsScreenProps {
  onBack?: () => void // Made onBack optional since it's not always provided
  user?: {
    name: string
    avatar: string
    membershipTier: string
    followers: string
    following: string
    posts: string
  }
  creditBalance?: number
}

interface UserInfo {
  email: string
  name: string
  product_type: string
  memberSince: string
  gender?: string
  ethnicity?: string
  physical_preferences?: string
  stripe_customer_id?: string | null
}

interface SubscriptionInfo {
  product_type: string
  status: string
  current_period_end?: string
  stripe_subscription_id?: string
}

export default function SettingsScreen({ onBack, user, creditBalance }: SettingsScreenProps) {
  const router = useRouter()
  const [showNavMenu, setShowNavMenu] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null)
  const [isLoadingPortal, setIsLoadingPortal] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [showCancelIntercept, setShowCancelIntercept] = useState(false)
  const [isApplyingDiscount, setIsApplyingDiscount] = useState(false)
  const [discountApplied, setDiscountApplied] = useState(false)

  const [emailNotifications, setEmailNotifications] = useState(true)
  const [mayaUpdates, setMayaUpdates] = useState(true)
  const [defaultImageCount, setDefaultImageCount] = useState(5)
  const [saveToGallery, setSaveToGallery] = useState(true)
  const [dataForTraining, setDataForTraining] = useState(true)

  const [gender, setGender] = useState<string>("")
  const [ethnicity, setEthnicity] = useState<string>("")
  const [physicalPreferences, setPhysicalPreferences] = useState<string>("")
  const [isUpdatingDemographics, setIsUpdatingDemographics] = useState(false)

  useEffect(() => {
    fetchUserInfo()
    fetchSubscriptionInfo()
    fetchSettings()
  }, [])

  const fetchUserInfo = async () => {
    try {
      const response = await fetch("/api/user/info", {
        credentials: "include",
      })
      if (response.ok) {
        const data = await response.json()
        setUserInfo(data)
        setGender(data.gender || "")
        setEthnicity(data.ethnicity || "")
        setPhysicalPreferences(data.physical_preferences || "")
      }
    } catch (error) {
      console.error("[v0] Error fetching user info:", error)
    }
  }

  const fetchSubscriptionInfo = async () => {
    try {
      const response = await fetch("/api/profile/info", {
        credentials: "include",
      })
      if (response.ok) {
        const data = await response.json()
        if (data.subscription) {
          setSubscriptionInfo(data.subscription)
        }
      }
    } catch (error) {
      console.error("[v0] Error fetching subscription info:", error)
    }
  }

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ key: "value" }),
      })

      if (!response.ok) {
        console.warn("[v0] Settings API returned error, using defaults")
        return
      }

      const data = await response.json()

      if (data && data.settings) {
        setEmailNotifications(data.settings.emailNotifications ?? true)
        setMayaUpdates(data.settings.mayaUpdates ?? true)
        setDefaultImageCount(data.settings.defaultImageCount ?? 5)
        setSaveToGallery(data.settings.saveToGallery ?? true)
        setDataForTraining(data.settings.dataForTraining ?? true)
      }
    } catch (error) {
      console.error("[v0] Error fetching settings:", error)
    }
  }

  const updateSetting = async (key: string, value: boolean | number) => {
    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ [key]: value }),
      })

      if (!response.ok) {
        console.warn("[v0] Failed to update setting:", key)
      }
    } catch (error) {
      console.error("[v0] Error updating setting:", error)
    }
  }

  const handleApplyRetentionDiscount = async () => {
    setIsApplyingDiscount(true)
    try {
      const response = await fetch("/api/stripe/apply-retention-discount", {
        method: "POST",
        credentials: "include",
      })
      if (response.ok) {
        setDiscountApplied(true)
        setTimeout(() => setShowCancelIntercept(false), 3000)
      } else {
        const data = await response.json()
        alert(data.error || "Couldn't apply discount. Please try again.")
      }
    } catch {
      alert("Something went wrong. Please try again.")
    } finally {
      setIsApplyingDiscount(false)
    }
  }

  const handleManageSubscription = async () => {
    // For active Studio members, show cancel intercept first
    if (isStudioMembership && hasActiveSubscription) {
      setShowCancelIntercept(true)
      return
    }
    setIsLoadingPortal(true)
    try {
      console.log("[v0] Opening subscription management portal...")

      const response = await fetch("/api/stripe/create-portal-session", {
        method: "POST",
        credentials: "include",
      })

      const data = await response.json()

      if (response.ok) {
        console.log("[v0] Portal session created, redirecting to:", data.url)
        window.location.href = data.url
      } else {
        console.error("[v0] Failed to create portal session:", response.status, data)
        alert(data.message || "Unable to open subscription management. Please try again.")
      }
    } catch (error) {
      console.error("[v0] Error opening portal:", error)
      alert("Unable to open subscription management. Please try again.")
    } finally {
      setIsLoadingPortal(false)
    }
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      })

      if (response.ok) {
        notifyAnalyticsLogout()
        console.log("[v0] Logout successful, redirecting to login...")
        router.push("/auth/login")
      } else {
        console.error("[v0] Logout failed")
        setIsLoggingOut(false)
      }
    } catch (error) {
      console.error("[v0] Error during logout:", error)
      setIsLoggingOut(false)
    }
  }

  const handleAdminAccess = () => {
    router.push("/admin")
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    })
  }

  const formatRenewalDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    })
  }

  const isStudioMembership = userInfo?.product_type === "sselfie_studio_membership"
  const hasActiveSubscription = subscriptionInfo?.status === "active"
  const currentTier = (userInfo?.product_type as any) ?? "one_time_session"
  // Only show upgrade for users without Creator Studio membership
  const upgradeTargetTier =
    currentTier === "sselfie_studio_membership" || currentTier === "brand_studio_membership"
      ? null // Already on Creator Studio (or legacy Brand Studio)
      : "sselfie_studio_membership"

  const navigateToTab = (tabId: string) => {
    window.location.hash = tabId
    window.location.reload()
  }

  const handleUpdateDemographics = async () => {
    if (!gender) {
      return
    }

    setIsUpdatingDemographics(true)
    try {
      const response = await fetch("/api/user/update-demographics", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          gender,
          ethnicity,
          physical_preferences: physicalPreferences,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setGender(data.gender || "")
        setEthnicity(data.ethnicity || "")
        setPhysicalPreferences(data.physical_preferences || "")
      } else {
        console.error("[v0] Failed to update demographics")
      }
    } catch (error) {
      console.error("[v0] Error updating demographics:", error)
    } finally {
      setIsUpdatingDemographics(false)
    }
  }

  const displayMembership = getAccessLabel(userInfo?.product_type)

  const settingsCardClass =
    "rounded-[22px] border border-white/10 bg-[rgba(25,23,21,0.82)] p-4 shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-6 md:p-8"
  const settingsIconShellClass =
    "p-2.5 sm:p-3 rounded-xl border border-white/14 bg-white/10 text-[color:var(--color-porcelain)]"
  const settingsSectionTitleClass =
    "text-base sm:text-lg md:text-xl font-semibold text-[color:var(--color-porcelain)]"

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#0d0c0b] text-[color:var(--color-porcelain)]">

      {/* Cancel intercept modal */}
      {showCancelIntercept && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-[#1a1917] border border-[rgba(240,237,232,0.12)] p-6 shadow-2xl">
            {discountApplied ? (
              <div className="text-center py-4">
                <p className="text-2xl mb-3">✓</p>
                <p className="text-[#f0ede8] font-light text-lg mb-2">Done.</p>
                <p className="text-[#8a8780] text-sm leading-relaxed">
                  50% off applied to your next bill. See you next month.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between mb-5">
                  <h3 className="text-[#f0ede8] font-light text-xl tracking-wide">Before you go.</h3>
                  <button
                    onClick={() => setShowCancelIntercept(false)}
                    className="text-[#8a8780] hover:text-[#f0ede8] transition-colors p-1"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="space-y-2 mb-5">
                  {[
                    `${creditBalance ?? 0} credits you've built up`,
                    "Your trained AI model",
                    "Your Maya chat history and brand memory",
                    "Access to unlimited photo generation",
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-2.5">
                      <span className="text-[rgba(220,100,80,0.8)] text-xs">✕</span>
                      <span className="text-[#8a8780] text-sm">{item}</span>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl border border-[rgba(240,237,232,0.1)] bg-[rgba(240,237,232,0.04)] p-4 mb-5">
                  <p className="text-[#f0ede8] text-sm font-medium mb-1">Stay for 50% off next month</p>
                  <p className="text-[#8a8780] text-xs leading-relaxed">
                    One click. No commitment. If it still doesn&apos;t feel right after that, cancel anytime.
                  </p>
                </div>

                <div className="space-y-2.5">
                  <button
                    onClick={handleApplyRetentionDiscount}
                    disabled={isApplyingDiscount}
                    className="w-full rounded-xl bg-[#f0ede8] text-[#0d0c0b] text-sm font-medium py-3.5 transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {isApplyingDiscount ? "Applying..." : "Yes - give me 50% off next month"}
                  </button>
                  <button
                    onClick={() => setShowCancelIntercept(false)}
                    className="w-full rounded-xl border border-[rgba(240,237,232,0.12)] text-[#c8c4bb] text-sm font-light py-3 transition-colors hover:text-[#f0ede8] hover:border-[rgba(240,237,232,0.25)]"
                  >
                    I&apos;ll keep my Studio
                  </button>
                  <button
                    onClick={async () => {
                      setShowCancelIntercept(false)
                      setIsLoadingPortal(true)
                      try {
                        const res = await fetch("/api/stripe/create-portal-session", { method: "POST", credentials: "include" })
                        const data = await res.json()
                        if (res.ok) window.location.href = data.url
                      } finally {
                        setIsLoadingPortal(false)
                      }
                    }}
                    className="w-full text-center text-xs text-[#8a8780] hover:text-[#c8c4bb] py-1 transition-colors"
                  >
                    I still want to manage my subscription →
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div
        className="mx-3 mt-4 rounded-2xl border border-white/10 px-3 pb-4 pt-4 sm:mx-4 sm:px-4 md:mx-6 md:px-6"
        style={{
          backgroundImage:
            "linear-gradient(180deg, rgba(13,12,11,0.14) 0%, rgba(13,12,11,0.72) 100%), url('/flatlay-luxury-planning.jpg'), url('https://hebbkx1anhila5yf.public.blob.vercel-storage.com/_%20%2842%29-9YjBZswCzTL0RY7fbkRjXC2uzoaSdO.jpeg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="flex items-center gap-4">
        {onBack && (
          <button
            onClick={onBack}
            className="rounded-xl border border-white/20 bg-black/25 p-3 transition-all duration-200 hover:bg-black/40"
          >
            <ChevronRight
              size={18}
              className="rotate-180 text-[color:var(--color-porcelain)]"
              strokeWidth={1.5}
            />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-serif font-extralight uppercase tracking-[0.24em] text-[color:var(--color-porcelain)] sm:text-4xl">
            Settings
          </h2>
          <p className="mt-2 text-xs font-light uppercase tracking-[0.15em] text-white/80">
            Calm control over your account
          </p>
        </div>
        <button
          onClick={() => setShowNavMenu(true)}
          className="rounded-xl border border-white/20 bg-black/25 px-4 py-2 font-serif text-sm uppercase tracking-[0.3em] text-white/85 transition-colors hover:bg-black/40"
        >
          MENU
        </button>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
          <div className="rounded-xl border border-white/15 bg-black/20 px-3 py-2">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/65">Plan</p>
            <p className="mt-1 text-sm text-white">{displayMembership}</p>
          </div>
          <div className="rounded-xl border border-white/15 bg-black/20 px-3 py-2">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/65">Credits</p>
            <p className="mt-1 text-sm text-white tabular-nums">{creditBalance?.toFixed(0) || "0"}</p>
          </div>
          <div className="rounded-xl border border-white/15 bg-black/20 px-3 py-2">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/65">Status</p>
            <p className="mt-1 text-sm text-white capitalize">{subscriptionInfo?.status || "ready"}</p>
          </div>
        </div>
      </div>

      {showNavMenu && (
        <>
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50" onClick={() => setShowNavMenu(false)} />
          <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col border-l border-white/10 bg-[#12100f] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 p-6">
              <h2 className="font-serif text-xl uppercase tracking-[0.3em] text-[color:var(--color-porcelain)]">
                MENU
              </h2>
              <button
                onClick={() => setShowNavMenu(false)}
                className="rounded-lg p-2 transition-colors hover:bg-white/10"
              >
                <X size={20} className="text-white/70" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 px-6 py-6">
              <div className="mb-8">
                <p className="mb-2 text-[10px] font-light uppercase tracking-[0.15em] text-white/60">
                  YOUR CREDITS
                </p>
                <p className="text-3xl font-serif font-extralight tabular-nums text-[color:var(--color-porcelain)]">
                  {creditBalance?.toFixed(1) || "0.0"}
                </p>
              </div>

              <nav className="space-y-2">
                <button
                  onClick={() => navigateToTab("studio")}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/8 transition-colors text-left"
                >
                  <Home size={20} className="text-white/65" />
                  <span className="text-sm font-medium text-white/90">Studio</span>
                </button>

                <button
                  onClick={() => navigateToTab("training")}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/8 transition-colors text-left"
                >
                  <Aperture size={20} className="text-white/65" />
                  <span className="text-sm font-medium text-white/90">Training</span>
                </button>

                <button
                  onClick={() => navigateToTab("maya")}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/8 transition-colors text-left"
                >
                  <MessageCircle size={20} className="text-white/65" />
                  <span className="text-sm font-medium text-white/90">Maya</span>
                </button>

                {/* Videos moved to Maya Videos tab */}
                <button
                  onClick={() => {
                    window.location.hash = "#maya/videos"
                    window.location.reload()
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/8 transition-colors text-left"
                >
                  <Film size={20} className="text-white/65" />
                  <span className="text-sm font-medium text-white/90">Videos</span>
                </button>

                <button
                  onClick={() => navigateToTab("feed-planner")}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/8 transition-colors text-left"
                >
                  <Grid size={20} className="text-white/65" />
                  <span className="text-sm font-medium text-white/90">Feed Planner</span>
                </button>

                <button
                  onClick={() => navigateToTab("gallery")}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/8 transition-colors text-left"
                >
                  <ImageIcon size={20} className="text-white/65" />
                  <span className="text-sm font-medium text-white/90">Gallery</span>
                </button>

                <button
                  onClick={() => navigateToTab("academy")}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/8 transition-colors text-left"
                >
                  <Grid size={20} className="text-white/65" />
                  <span className="text-sm font-medium text-white/90">Academy</span>
                </button>

                <button
                  onClick={() => navigateToTab("profile")}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/8 transition-colors text-left"
                >
                  <User size={20} className="text-white/65" />
                  <span className="text-sm font-medium text-white/90">Profile</span>
                </button>

                <button
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-l-2 border-[color:var(--color-porcelain)] bg-white/10 text-left"
                  disabled
                >
                  <SettingsIcon size={20} className="text-[color:var(--color-porcelain)]" />
                  <span className="text-sm font-medium text-[color:var(--color-porcelain)]">Settings</span>
                </button>

                <button
                  onClick={handleAdminAccess}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/8 transition-colors text-left"
                >
                  <Lock size={20} className="text-white/65" />
                  <span className="text-sm font-medium text-white">Admin Dashboard</span>
                </button>
              </nav>
            </div>

            <div className="p-6 border-t border-white/10">
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-red-300 hover:bg-red-500/10 rounded-xl transition-colors disabled:opacity-50"
              >
                <LogOut size={18} />
                {isLoggingOut ? "Signing Out..." : "Sign Out"}
              </button>
            </div>
          </div>
        </>
      )}

      <div className="flex-1 space-y-4 overflow-y-auto px-3 py-4 pb-24 sm:space-y-6 sm:p-8 sm:pb-32 md:space-y-8 md:p-12">

        {userInfo && (
          <div className={settingsCardClass}>
            <div className="flex items-center space-x-3 sm:space-x-4 mb-6 sm:mb-8">
              <div className={settingsIconShellClass}>
                <User size={18} className="text-[color:var(--color-porcelain)]" strokeWidth={2} />
              </div>
              <h3 className={settingsSectionTitleClass}>Account Information</h3>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 py-3">
                <Mail size={16} className="text-white/55" />
                <div>
                  <p className="text-xs text-white/55 uppercase tracking-wider">Email</p>
                  <p className="text-sm font-medium text-[color:var(--color-porcelain)]">{userInfo.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 py-3">
                <CreditCard size={16} className="text-white/55" />
                <div>
                  <p className="text-xs text-white/55 uppercase tracking-wider">Access</p>
                  <p className="text-sm font-medium uppercase text-[color:var(--color-porcelain)]">{displayMembership}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 py-3">
                <Calendar size={16} className="text-white/55" />
                <div>
                  <p className="text-xs text-white/55 uppercase tracking-wider">Member Since</p>
                  <p className="text-sm font-medium text-[color:var(--color-porcelain)]">{formatDate(userInfo.memberSince)}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {userInfo?.product_type === "sselfie_studio_membership" && (
          <div className={settingsCardClass}>
            <div className="flex items-center space-x-3 sm:space-x-4 mb-6 sm:mb-8">
              <div className={settingsIconShellClass}>
                <CreditCard size={18} className="text-[color:var(--color-porcelain)]" strokeWidth={2} />
              </div>
              <h3 className={settingsSectionTitleClass}>Subscription Management</h3>
            </div>

            <div className="space-y-4">
              {subscriptionInfo?.current_period_end && (
                <div className="flex items-center gap-3 py-3">
                  <Calendar size={16} className="text-white/55" />
                  <div>
                    <p className="text-xs text-white/55 uppercase tracking-wider">Next Billing Date</p>
                    <p className="text-sm font-medium text-[color:var(--color-porcelain)]">
                      {formatRenewalDate(subscriptionInfo.current_period_end)}
                    </p>
                  </div>
                </div>
              )}

              <button
                onClick={handleManageSubscription}
                disabled={isLoadingPortal}
                className="w-full flex min-h-[56px] items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/5 py-5 text-sm font-light uppercase tracking-[0.15em] text-white/85 transition-colors hover:bg-white/12 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ExternalLink size={16} />
                {isLoadingPortal ? "Opening..." : "Manage Subscription"}
              </button>

              <p className="text-xs text-center text-white/60">
                Update your payment method, view billing history, or cancel your membership anytime
              </p>
            </div>
          </div>
        )}

        {userInfo && upgradeTargetTier && (
          <div className={settingsCardClass}>
            <div className="flex items-center space-x-3 sm:space-x-4 mb-6 sm:mb-8">
              <div className={settingsIconShellClass}>
                <CreditCard size={18} className="text-[color:var(--color-porcelain)]" strokeWidth={2} />
              </div>
              <div>
                <h3 className={settingsSectionTitleClass}>Upgrade to Creator Studio</h3>
                <p className="text-sm text-white/65">More credits, premium features, priority support.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4">
              <InfoPill
                label="Current plan"
                value={getAccessLabel(userInfo.product_type)}
              />
              <InfoPill
                label="Upgrade to"
                value="Creator Studio"
              />
              <InfoPill
                label="Credits"
                value="100 credits / month"
              />
            </div>

            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                console.log("[SETTINGS] Upgrade button clicked, opening modal")
                setShowUpgradeModal(true)
              }}
              className="w-full flex items-center justify-center gap-2 rounded-2xl border border-white/25 bg-white/12 py-4 text-sm font-medium uppercase tracking-[0.15em] text-[color:var(--color-porcelain)] transition-colors hover:bg-white/18 active:scale-[0.98]"
            >
              Upgrade now
              <ChevronRight size={14} />
            </button>

            <p className="mt-3 text-center text-xs text-white/60">
              We’ll prorate the change automatically. You can switch back anytime in Stripe.
            </p>
          </div>
        )}

        {((hasActiveSubscription || userInfo?.stripe_customer_id) && !isStudioMembership) && (
          <div className={settingsCardClass}>
            <div className="flex items-center space-x-3 sm:space-x-4 mb-6 sm:mb-8">
              <div className={settingsIconShellClass}>
                <CreditCard size={18} className="text-[color:var(--color-porcelain)]" strokeWidth={2} />
              </div>
              <h3 className={settingsSectionTitleClass}>Billing & Invoices</h3>
            </div>

            <div className="space-y-4">
              {subscriptionInfo?.current_period_end && (
                <div className="flex items-center gap-3 py-3">
                  <Calendar size={16} className="text-white/55" />
                  <div>
                    <p className="text-xs uppercase tracking-wider text-white/55">Session Expires</p>
                    <p className="text-sm font-medium text-[color:var(--color-porcelain)]">
                      {formatRenewalDate(subscriptionInfo.current_period_end)}
                    </p>
                  </div>
                </div>
              )}

              {userInfo?.stripe_customer_id && (
                <button
                  onClick={handleManageSubscription}
                  disabled={isLoadingPortal}
                  className="w-full flex min-h-[56px] items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/5 py-5 text-sm font-light uppercase tracking-[0.15em] text-white/85 transition-colors hover:bg-white/12 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ExternalLink size={16} />
                  {isLoadingPortal ? "Opening..." : "View Invoices"}
                </button>
              )}

              <p className="text-center text-xs text-white/60">
                {userInfo?.stripe_customer_id
                  ? "View your invoices and billing history in Stripe"
                  : "Manage your session details and billing information"}
              </p>
            </div>
          </div>
        )}

        <div className={settingsCardClass}>
          <div className="flex items-center space-x-3 sm:space-x-4 mb-6 sm:mb-8">
            <div className={settingsIconShellClass}>
              <Bell size={18} className="text-[color:var(--color-porcelain)]" strokeWidth={2} />
            </div>
            <h3 className={settingsSectionTitleClass}>Notifications</h3>
          </div>

          <div className="space-y-1 sm:space-y-2">
            <ToggleItem
              label="Email notifications"
              description="Get notified when your photos are ready"
              value={emailNotifications}
              onChange={(value) => {
                setEmailNotifications(value)
                updateSetting("emailNotifications", value)
              }}
            />
            <ToggleItem
              label="Maya updates"
              description="Receive tips and new features from Maya"
              value={mayaUpdates}
              onChange={(value) => {
                setMayaUpdates(value)
                updateSetting("mayaUpdates", value)
              }}
            />
          </div>
        </div>

        <div className={settingsCardClass}>
          <div className="flex items-center space-x-3 sm:space-x-4 mb-6 sm:mb-8">
            <div className={settingsIconShellClass}>
              <Aperture size={18} className="text-[color:var(--color-porcelain)]" strokeWidth={2} />
            </div>
            <h3 className={settingsSectionTitleClass}>Generation Preferences</h3>
          </div>

          <div className="space-y-1 sm:space-y-2">
            <ToggleItem
              label="Auto-save to gallery"
              description="Automatically save generated photos to your gallery"
              value={saveToGallery}
              onChange={(value) => {
                setSaveToGallery(value)
                updateSetting("saveToGallery", value)
              }}
            />
          </div>
        </div>

        <div className={settingsCardClass}>
          <div className="flex items-center space-x-3 sm:space-x-4 mb-6 sm:mb-8">
            <div className={settingsIconShellClass}>
              <Shield size={18} className="text-[color:var(--color-porcelain)]" strokeWidth={2} />
            </div>
            <h3 className={settingsSectionTitleClass}>Privacy & Data</h3>
          </div>

          <div className="space-y-1 sm:space-y-2">
            <ToggleItem
              label="Use my data for training"
              description="Help improve Maya by allowing your photos to enhance the AI model"
              value={dataForTraining}
              onChange={(value) => {
                setDataForTraining(value)
                updateSetting("dataForTraining", value)
              }}
            />
          </div>
        </div>

        <div className={settingsCardClass}>
          <div className="flex items-center space-x-3 sm:space-x-4 mb-6 sm:mb-8">
            <div className={settingsIconShellClass}>
              <Package size={18} className="text-[color:var(--color-porcelain)]" strokeWidth={2} />
            </div>
            <h3 className={settingsSectionTitleClass}>Brand Assets</h3>
          </div>
          <BrandAssetsManager />
        </div>

        <div className={settingsCardClass}>
          <div className="flex items-center space-x-3 sm:space-x-4 mb-6 sm:mb-8">
            <div className={settingsIconShellClass}>
              <Lock size={18} className="text-[color:var(--color-porcelain)]" strokeWidth={2} />
            </div>
            <h3 className={settingsSectionTitleClass}>Admin Access</h3>
          </div>

          <div className="space-y-4">
            <button
              onClick={handleAdminAccess}
              className="w-full flex min-h-[56px] items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/5 py-5 text-sm font-light uppercase tracking-[0.15em] text-white/85 transition-colors hover:bg-white/12"
            >
              <Lock size={16} />
              Admin Dashboard
            </button>

            <p className="text-center text-xs text-white/60">Access admin tools and content management</p>
          </div>
        </div>

        <div className={settingsCardClass}>
          <div className="flex items-center space-x-3 sm:space-x-4 mb-6 sm:mb-8">
            <div className={settingsIconShellClass}>
              <User size={18} className="text-[color:var(--color-porcelain)]" strokeWidth={2} />
            </div>
            <h3 className={settingsSectionTitleClass}>Model Information</h3>
          </div>

          <div className="space-y-6">
            <div>
              <label className="mb-3 block text-xs uppercase tracking-wider text-white/55">Gender</label>
              <div className="grid grid-cols-3 gap-2">
                {["woman", "man", "non-binary"].map((option) => (
                  <button
                    key={option}
                    onClick={() => setGender(option)}
                    className={`px-4 py-3 text-sm rounded-xl border transition-all ${
                      gender === option
                        ? "border-white/35 bg-white/16 text-[color:var(--color-porcelain)]"
                        : "border-white/14 bg-white/6 text-white/80 hover:bg-white/10"
                    }`}
                  >
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-3 block text-xs uppercase tracking-wider text-white/55">
                Ethnicity (Optional)
              </label>
              <select
                value={ethnicity}
                onChange={(e) => setEthnicity(e.target.value)}
                className="w-full rounded-xl border border-white/14 bg-white/6 px-4 py-3 text-sm text-[color:var(--color-porcelain)] transition-all focus:border-white/30 focus:outline-none"
              >
                <option value="">Select ethnicity</option>
                <option value="Black">Black</option>
                <option value="White">White</option>
                <option value="Asian">Asian</option>
                <option value="Latina/Latino">Latina/Latino</option>
                <option value="Middle Eastern">Middle Eastern</option>
                <option value="South Asian">South Asian</option>
                <option value="Mixed">Mixed</option>
                <option value="Other">Other</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>

            <div>
              <label className="mb-3 block text-xs uppercase tracking-wider text-white/55">
                Physical Preferences (Optional)
              </label>
              <textarea
                value={physicalPreferences}
                onChange={(e) => setPhysicalPreferences(e.target.value)}
                placeholder="e.g., curvier body type, fuller bust, lighter blonde hair, athletic build"
                rows={3}
                className="w-full resize-none rounded-xl border border-white/14 bg-white/6 px-4 py-3 text-sm text-[color:var(--color-porcelain)] transition-all focus:border-white/30 focus:outline-none"
              />
              <p className="mt-2 text-xs text-white/60">
                Describe how you&apos;d like to appear in your photos. These preferences will be applied to all future image
                generations.
              </p>
            </div>

            <button
              onClick={handleUpdateDemographics}
              disabled={isUpdatingDemographics || !gender}
              className="w-full flex min-h-[56px] items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/5 py-5 text-sm font-light uppercase tracking-[0.15em] text-white/85 transition-colors hover:bg-white/12 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isUpdatingDemographics ? "Updating..." : "Update Model Information"}
            </button>

            <p className="text-center text-xs text-white/60">
              This information helps Maya generate accurate AI images that represent you. Physical preferences will be
              applied to all future generations. No retraining required.
            </p>
          </div>
        </div>
      </div>

      <div className="mx-3 mb-4 mt-2 space-y-3 border-t border-white/10 pt-6 sm:mx-4 md:mx-6">
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="w-full flex min-h-[56px] items-center justify-center gap-2 rounded-2xl border border-white/18 bg-white/5 py-5 text-sm font-light uppercase tracking-[0.15em] text-white/75 transition-colors hover:bg-white/12 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <LogOut size={16} />
          {isLoggingOut ? "Signing Out..." : "Sign Out"}
        </button>
      </div>

      {upgradeTargetTier && (
        <UpgradeModal
          open={showUpgradeModal}
          currentTier={currentTier}
          targetTier={upgradeTargetTier}
          onClose={() => setShowUpgradeModal(false)}
        />
      )}
    </div>
  )
}

function ToggleItem({
  label,
  description,
  value,
  onChange,
}: {
  label: string
  description: string
  value: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <div
      onClick={() => onChange(!value)}
      className="group -mx-3 flex min-h-[68px] cursor-pointer items-start justify-between rounded-lg px-3 py-3 transition-all duration-300 hover:bg-white/8 sm:-mx-6 sm:min-h-[80px] sm:rounded-[1.25rem] sm:px-6 sm:py-5"
    >
      <div className="flex-1 min-w-0 pr-4">
        <p className="text-xs font-medium text-[color:var(--color-porcelain)] sm:text-sm md:text-base">
          {label}
        </p>
        <p className="mt-1 text-[10px] text-white/60 sm:text-xs">{description}</p>
      </div>
      <div
        className={`relative h-7 w-12 shrink-0 cursor-pointer rounded-full border transition-all duration-300 sm:h-8 sm:w-14 md:h-9 md:w-16 ${
          value ? "border-white/28 bg-white/22" : "border-white/14 bg-white/8"
        }`}
      >
        <div
          className={`absolute top-1 h-5 w-5 rounded-full bg-[color:var(--color-porcelain)] transition-all duration-300 sm:h-6 sm:w-6 md:h-7 md:w-7 ${
            value ? "translate-x-6 sm:translate-x-7 md:translate-x-8" : "translate-x-1"
          }`}
        ></div>
      </div>
    </div>
  )
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1 rounded-xl border border-white/14 bg-white/6 px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.15em] text-white/55">{label}</p>
      <p className="text-sm font-semibold text-[color:var(--color-porcelain)]">{value}</p>
    </div>
  )
}
