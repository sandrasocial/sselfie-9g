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
} from "lucide-react"
import { useRouter } from "next/navigation"
import BrandAssetsManager from "./brand-assets-manager"

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

  const handleManageSubscription = async () => {
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

  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-stone-50 via-stone-100/50 to-white text-stone-950 relative overflow-hidden">
      <div className="flex items-center gap-4 pt-4">
        {onBack && (
          <button
            onClick={onBack}
            className="p-4 bg-stone-100/50 rounded-2xl border border-stone-200/40 hover:bg-stone-100/70 hover:border-stone-300/50 transition-all duration-200"
          >
            <ChevronRight size={18} className="text-stone-600 transform rotate-180" strokeWidth={1.5} />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl sm:text-4xl font-serif font-extralight tracking-[0.3em] text-stone-950 uppercase">
            Settings
          </h2>
          <p className="text-xs tracking-[0.15em] uppercase font-light mt-2 text-stone-500">Your Preferences</p>
        </div>
        <button
          onClick={() => setShowNavMenu(true)}
          className="font-serif text-sm tracking-[0.3em] uppercase text-stone-600 hover:text-stone-950 transition-colors px-4 py-2"
        >
          MENU
        </button>
      </div>

      {showNavMenu && (
        <>
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50" onClick={() => setShowNavMenu(false)} />
          <div className="fixed inset-y-0 right-0 w-full max-w-sm bg-white z-50 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-stone-200/40">
              <h2 className="font-serif text-xl tracking-[0.3em] uppercase text-stone-950">MENU</h2>
              <button
                onClick={() => setShowNavMenu(false)}
                className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-stone-600" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 px-6 py-6">
              <div className="mb-8">
                <p className="text-[10px] tracking-[0.15em] uppercase font-light text-stone-500 mb-2">YOUR CREDITS</p>
                <p className="text-3xl font-serif font-extralight text-stone-950 tabular-nums">
                  {creditBalance?.toFixed(1) || "0.0"}
                </p>
              </div>

              <nav className="space-y-2">
                <button
                  onClick={() => navigateToTab("studio")}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-stone-100/50 transition-colors text-left"
                >
                  <Home size={20} className="text-stone-600" />
                  <span className="text-sm font-medium text-stone-900">Studio</span>
                </button>

                <button
                  onClick={() => navigateToTab("training")}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-stone-100/50 transition-colors text-left"
                >
                  <Aperture size={20} className="text-stone-600" />
                  <span className="text-sm font-medium text-stone-900">Training</span>
                </button>

                <button
                  onClick={() => navigateToTab("maya")}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-stone-100/50 transition-colors text-left"
                >
                  <MessageCircle size={20} className="text-stone-600" />
                  <span className="text-sm font-medium text-stone-900">Maya</span>
                </button>

                <button
                  onClick={() => navigateToTab("gallery")}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-stone-100/50 transition-colors text-left"
                >
                  <ImageIcon size={20} className="text-stone-600" />
                  <span className="text-sm font-medium text-stone-900">Gallery</span>
                </button>

                <button
                  onClick={() => navigateToTab("academy")}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-stone-100/50 transition-colors text-left"
                >
                  <Grid size={20} className="text-stone-600" />
                  <span className="text-sm font-medium text-stone-900">Academy</span>
                </button>

                <button
                  onClick={() => navigateToTab("profile")}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-stone-100/50 transition-colors text-left"
                >
                  <User size={20} className="text-stone-600" />
                  <span className="text-sm font-medium text-stone-900">Profile</span>
                </button>

                <button
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-stone-100/50 border-l-2 border-stone-950 text-left"
                  disabled
                >
                  <SettingsIcon size={20} className="text-stone-950" />
                  <span className="text-sm font-medium text-stone-900">Settings</span>
                </button>

                <button
                  onClick={handleAdminAccess}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-stone-100/50 transition-colors text-left"
                >
                  <Lock size={20} className="text-stone-600" />
                  <span className="text-sm font-medium text-stone-950">Admin Dashboard</span>
                </button>
              </nav>
            </div>

            <div className="p-6 border-t border-stone-200/40">
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-50"
              >
                <LogOut size={18} />
                {isLoggingOut ? "Signing Out..." : "Sign Out"}
              </button>
            </div>
          </div>
        </>
      )}

      <div className="px-3 py-4 sm:p-8 md:p-12 overflow-y-auto flex-1 space-y-4 sm:space-y-6 md:space-y-8 pb-24 sm:pb-32">
        {console.log("[v0] Settings - userInfo:", userInfo)}
        {console.log("[v0] Settings - subscriptionInfo:", subscriptionInfo)}
        {console.log("[v0] Settings - hasActiveSubscription:", hasActiveSubscription)}
        {console.log("[v0] Settings - isStudioMembership:", isStudioMembership)}

        {userInfo && (
          <div className="bg-white/50 backdrop-blur-2xl rounded-xl sm:rounded-[1.75rem] p-4 sm:p-6 md:p-8 border border-white/60 shadow-xl shadow-stone-900/10">
            <div className="flex items-center space-x-3 sm:space-x-4 mb-6 sm:mb-8">
              <div className="p-2.5 sm:p-3.5 bg-stone-950 rounded-lg sm:rounded-[1.125rem] shadow-lg">
                <User size={18} className="text-white" strokeWidth={2.5} />
              </div>
              <h3 className="text-base sm:text-lg md:text-xl font-bold text-stone-950">Account Information</h3>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 py-3">
                <Mail size={16} className="text-stone-500" />
                <div>
                  <p className="text-xs text-stone-500 uppercase tracking-wider">Email</p>
                  <p className="text-sm font-medium text-stone-950">{userInfo.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 py-3">
                <CreditCard size={16} className="text-stone-500" />
                <div>
                  <p className="text-xs text-stone-500 uppercase tracking-wider">Membership</p>
                  <p className="text-sm font-medium text-stone-950 uppercase">
                    {userInfo.product_type === "sselfie_studio_membership"
                      ? "Studio Member"
                      : userInfo.product_type === "one_time_session"
                        ? "One-Time Session"
                        : "Free"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 py-3">
                <Calendar size={16} className="text-stone-500" />
                <div>
                  <p className="text-xs text-stone-500 uppercase tracking-wider">Member Since</p>
                  <p className="text-sm font-medium text-stone-950">{formatDate(userInfo.memberSince)}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {userInfo?.product_type === "sselfie_studio_membership" && (
          <div className="bg-white/50 backdrop-blur-2xl rounded-xl sm:rounded-[1.75rem] p-4 sm:p-6 md:p-8 border border-white/60 shadow-xl shadow-stone-900/10">
            <div className="flex items-center space-x-3 sm:space-x-4 mb-6 sm:mb-8">
              <div className="p-2.5 sm:p-3.5 bg-stone-950 rounded-lg sm:rounded-[1.125rem] shadow-lg">
                <CreditCard size={18} className="text-white" strokeWidth={2.5} />
              </div>
              <h3 className="text-base sm:text-lg md:text-xl font-bold text-stone-950">Subscription Management</h3>
            </div>

            <div className="space-y-4">
              {subscriptionInfo?.current_period_end && (
                <div className="flex items-center gap-3 py-3">
                  <Calendar size={16} className="text-stone-500" />
                  <div>
                    <p className="text-xs text-stone-500 uppercase tracking-wider">Next Billing Date</p>
                    <p className="text-sm font-medium text-stone-950">
                      {formatRenewalDate(subscriptionInfo.current_period_end)}
                    </p>
                  </div>
                </div>
              )}

              <button
                onClick={handleManageSubscription}
                disabled={isLoadingPortal}
                className="w-full flex items-center justify-center gap-2 text-sm tracking-[0.15em] uppercase font-light border rounded-2xl py-5 transition-colors hover:text-stone-950 hover:bg-stone-100/30 min-h-[56px] text-stone-600 border-stone-300/40 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ExternalLink size={16} />
                {isLoadingPortal ? "Opening..." : "Manage Subscription"}
              </button>

              <p className="text-xs text-stone-500 text-center">
                Update your payment method, view billing history, or cancel your membership anytime
              </p>
            </div>
          </div>
        )}

        {((hasActiveSubscription || userInfo?.stripe_customer_id) && !isStudioMembership) && (
          <div className="bg-white/50 backdrop-blur-2xl rounded-xl sm:rounded-[1.75rem] p-4 sm:p-6 md:p-8 border border-white/60 shadow-xl shadow-stone-900/10">
            <div className="flex items-center space-x-3 sm:space-x-4 mb-6 sm:mb-8">
              <div className="p-2.5 sm:p-3.5 bg-stone-950 rounded-lg sm:rounded-[1.125rem] shadow-lg">
                <CreditCard size={18} className="text-white" strokeWidth={2.5} />
              </div>
              <h3 className="text-base sm:text-lg md:text-xl font-bold text-stone-950">Billing & Invoices</h3>
            </div>

            <div className="space-y-4">
              {subscriptionInfo?.current_period_end && (
                <div className="flex items-center gap-3 py-3">
                  <Calendar size={16} className="text-stone-500" />
                  <div>
                    <p className="text-xs text-stone-500 uppercase tracking-wider">Session Expires</p>
                    <p className="text-sm font-medium text-stone-950">
                      {formatRenewalDate(subscriptionInfo.current_period_end)}
                    </p>
                  </div>
                </div>
              )}

              {userInfo?.stripe_customer_id && (
                <button
                  onClick={handleManageSubscription}
                  disabled={isLoadingPortal}
                  className="w-full flex items-center justify-center gap-2 text-sm tracking-[0.15em] uppercase font-light border rounded-2xl py-5 transition-colors hover:text-stone-950 hover:bg-stone-100/30 min-h-[56px] text-stone-600 border-stone-300/40 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ExternalLink size={16} />
                  {isLoadingPortal ? "Opening..." : "View Invoices"}
                </button>
              )}

              <p className="text-xs text-stone-500 text-center">
                {userInfo?.stripe_customer_id
                  ? "View your invoices and billing history in Stripe"
                  : "Manage your session details and billing information"}
              </p>
            </div>
          </div>
        )}

        <div className="bg-white/50 backdrop-blur-2xl rounded-xl sm:rounded-[1.75rem] p-4 sm:p-6 md:p-8 border border-white/60 shadow-xl shadow-stone-900/10">
          <div className="flex items-center space-x-3 sm:space-x-4 mb-6 sm:mb-8">
            <div className="p-2.5 sm:p-3.5 bg-stone-950 rounded-lg sm:rounded-[1.125rem] shadow-lg">
              <Bell size={18} className="text-white" strokeWidth={2.5} />
            </div>
            <h3 className="text-base sm:text-lg md:text-xl font-bold text-stone-950">Notifications</h3>
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

        <div className="bg-white/50 backdrop-blur-2xl rounded-xl sm:rounded-[1.75rem] p-4 sm:p-6 md:p-8 border border-white/60 shadow-xl shadow-stone-900/10">
          <div className="flex items-center space-x-3 sm:space-x-4 mb-6 sm:mb-8">
            <div className="p-2.5 sm:p-3.5 bg-stone-950 rounded-lg sm:rounded-[1.125rem] shadow-lg">
              <Aperture size={18} className="text-white" strokeWidth={2.5} />
            </div>
            <h3 className="text-base sm:text-lg md:text-xl font-bold text-stone-950">Generation Preferences</h3>
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

        <div className="bg-white/50 backdrop-blur-2xl rounded-xl sm:rounded-[1.75rem] p-4 sm:p-6 md:p-8 border border-white/60 shadow-xl shadow-stone-900/10">
          <div className="flex items-center space-x-3 sm:space-x-4 mb-6 sm:mb-8">
            <div className="p-2.5 sm:p-3.5 bg-stone-950 rounded-lg sm:rounded-[1.125rem] shadow-lg">
              <Shield size={18} className="text-white" strokeWidth={2.5} />
            </div>
            <h3 className="text-base sm:text-lg md:text-xl font-bold text-stone-950">Privacy & Data</h3>
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

        <div className="bg-white/50 backdrop-blur-2xl rounded-xl sm:rounded-[1.75rem] p-4 sm:p-6 md:p-8 border border-white/60 shadow-xl shadow-stone-900/10">
          <div className="flex items-center space-x-3 sm:space-x-4 mb-6 sm:mb-8">
            <div className="p-2.5 sm:p-3.5 bg-stone-950 rounded-lg sm:rounded-[1.125rem] shadow-lg">
              <Package size={18} className="text-white" strokeWidth={2.5} />
            </div>
            <h3 className="text-base sm:text-lg md:text-xl font-bold text-stone-950">Brand Assets</h3>
          </div>
          <BrandAssetsManager />
        </div>

        <div className="bg-white/50 backdrop-blur-2xl rounded-xl sm:rounded-[1.75rem] p-4 sm:p-6 md:p-8 border border-white/60 shadow-xl shadow-stone-900/10">
          <div className="flex items-center space-x-3 sm:space-x-4 mb-6 sm:mb-8">
            <div className="p-2.5 sm:p-3.5 bg-stone-950 rounded-lg sm:rounded-[1.125rem] shadow-lg">
              <Lock size={18} className="text-white" strokeWidth={2.5} />
            </div>
            <h3 className="text-base sm:text-lg md:text-xl font-bold text-stone-950">Admin Access</h3>
          </div>

          <div className="space-y-4">
            <button
              onClick={handleAdminAccess}
              className="w-full flex items-center justify-center gap-2 text-sm tracking-[0.15em] uppercase font-light border rounded-2xl py-5 transition-colors hover:text-stone-950 hover:bg-stone-100/30 min-h-[56px] text-stone-600 border-stone-300/40"
            >
              <Lock size={16} />
              Admin Dashboard
            </button>

            <p className="text-xs text-stone-500 text-center">Access admin tools and content management</p>
          </div>
        </div>

        <div className="bg-white/50 backdrop-blur-2xl rounded-xl sm:rounded-[1.75rem] p-4 sm:p-6 md:p-8 border border-white/60 shadow-xl shadow-stone-900/10">
          <div className="flex items-center space-x-3 sm:space-x-4 mb-6 sm:mb-8">
            <div className="p-2.5 sm:p-3.5 bg-stone-950 rounded-lg sm:rounded-[1.125rem] shadow-lg">
              <User size={18} className="text-white" strokeWidth={2.5} />
            </div>
            <h3 className="text-base sm:text-lg md:text-xl font-bold text-stone-950">Model Information</h3>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-xs text-stone-500 uppercase tracking-wider mb-3">Gender</label>
              <div className="grid grid-cols-3 gap-2">
                {["woman", "man", "non-binary"].map((option) => (
                  <button
                    key={option}
                    onClick={() => setGender(option)}
                    className={`px-4 py-3 text-sm rounded-xl border transition-all ${
                      gender === option
                        ? "bg-stone-950 text-white border-stone-950"
                        : "bg-white text-stone-600 border-stone-300/40 hover:border-stone-400"
                    }`}
                  >
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs text-stone-500 uppercase tracking-wider mb-3">Ethnicity (Optional)</label>
              <select
                value={ethnicity}
                onChange={(e) => setEthnicity(e.target.value)}
                className="w-full px-4 py-3 text-sm rounded-xl border border-stone-300/40 bg-white text-stone-950 focus:outline-none focus:border-stone-400 transition-all"
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
              <label className="block text-xs text-stone-500 uppercase tracking-wider mb-3">
                Physical Preferences (Optional)
              </label>
              <textarea
                value={physicalPreferences}
                onChange={(e) => setPhysicalPreferences(e.target.value)}
                placeholder="e.g., curvier body type, fuller bust, lighter blonde hair, athletic build"
                rows={3}
                className="w-full px-4 py-3 text-sm rounded-xl border border-stone-300/40 bg-white text-stone-950 focus:outline-none focus:border-stone-400 transition-all resize-none"
              />
              <p className="mt-2 text-xs text-stone-500">
                Describe how you'd like to appear in your photos. These preferences will be applied to all future image
                generations.
              </p>
            </div>

            <button
              onClick={handleUpdateDemographics}
              disabled={isUpdatingDemographics || !gender}
              className="w-full flex items-center justify-center gap-2 text-sm tracking-[0.15em] uppercase font-light border rounded-2xl py-5 transition-colors hover:text-white hover:bg-stone-950 min-h-[56px] text-stone-950 border-stone-950 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUpdatingDemographics ? "Updating..." : "Update Model Information"}
            </button>

            <p className="text-xs text-stone-500 text-center">
              This information helps Maya generate accurate AI images that represent you. Physical preferences will be
              applied to all future generations. No retraining required.
            </p>
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-stone-200/30 space-y-3">
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="w-full flex items-center justify-center gap-2 text-sm tracking-[0.15em] uppercase font-light border rounded-2xl py-5 transition-colors hover:text-stone-950 hover:bg-stone-100/30 min-h-[56px] text-stone-600 border-stone-300/40 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <LogOut size={16} />
          {isLoggingOut ? "Signing Out..." : "Sign Out"}
        </button>
      </div>
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
      className="flex items-start justify-between py-3 sm:py-5 hover:bg-white/30 rounded-lg sm:rounded-[1.25rem] px-3 sm:px-6 -mx-3 sm:-mx-6 transition-all duration-300 cursor-pointer group min-h-[68px] sm:min-h-[80px]"
    >
      <div className="flex-1 min-w-0 pr-4">
        <p className="text-xs sm:text-sm md:text-base text-stone-950 font-medium">{label}</p>
        <p className="text-[10px] sm:text-xs text-stone-500 mt-1">{description}</p>
      </div>
      <div
        className={`relative w-12 h-7 sm:w-14 sm:h-8 md:w-16 md:h-9 rounded-full transition-all duration-300 cursor-pointer shadow-inner flex-shrink-0 ${
          value ? "bg-stone-950 shadow-stone-900/30" : "bg-stone-300/60"
        }`}
      >
        <div
          className={`absolute top-1 w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 bg-white rounded-full shadow-lg transition-all duration-300 ${
            value ? "translate-x-6 sm:translate-x-7 md:translate-x-8" : "translate-x-1"
          }`}
        ></div>
      </div>
    </div>
  )
}
