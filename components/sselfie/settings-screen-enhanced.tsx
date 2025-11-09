"use client"

import { useState, useEffect } from "react"
import {
  Bell,
  Aperture,
  Shield,
  User,
  LogOut,
  Mail,
  Calendar,
  CreditCard,
  Palette,
  ImageIcon,
  ExternalLink,
  Loader2,
  X,
  Home,
  MessageCircle,
  ImageIcon as ImageIconLucide,
  Grid,
  UserIcon,
  SettingsIcon,
} from "lucide-react"
import { useRouter } from "next/navigation"
import PersonalBrandSection from "./personal-brand-section"
import BrandAssetsManager from "./brand-assets-manager"
import type { User as UserType } from "./types"
import ToggleItem from "./toggle-item" // Assuming ToggleItem is a separate component

interface SettingsScreenProps {
  user: UserType
  creditBalance: number
}

interface UserInfo {
  email: string
  name: string
  plan: string
  memberSince: string
  subscription?: {
    status: string
    currentPeriodEnd: string
    productType: string
  }
}

export default function SettingsScreen({ user, creditBalance }: SettingsScreenProps) {
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isLoadingPortal, setIsLoadingPortal] = useState(false)
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [showNavMenu, setShowNavMenu] = useState(false)
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [mayaUpdates, setMayaUpdates] = useState(true)
  const [saveToGallery, setSaveToGallery] = useState(true)
  const [dataForTraining, setDataForTraining] = useState(true)

  const fetchUserInfo = async () => {
    try {
      const response = await fetch("/api/user/info", {
        credentials: "include",
      })
      if (response.ok) {
        const data = await response.json()
        setUserInfo(data)
      }
    } catch (error) {
      console.error("[v0] Error fetching user info:", error)
    }
  }

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        credentials: "include",
      })

      if (!response.ok) {
        return
      }

      const data = await response.json()

      if (data && data.settings) {
        setEmailNotifications(data.settings.emailNotifications ?? true)
        setMayaUpdates(data.settings.mayaUpdates ?? true)
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
      const response = await fetch("/api/stripe/create-portal-session", {
        method: "POST",
        credentials: "include",
      })

      if (response.ok) {
        const { url } = await response.json()
        window.location.href = url
      } else {
        console.error("[v0] Failed to create portal session")
        alert("Unable to open subscription management. Please try again.")
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
        router.push("/auth/login")
      } else {
        setIsLoggingOut(false)
      }
    } catch (error) {
      console.error("[v0] Error during logout:", error)
      setIsLoggingOut(false)
    }
  }

  const handleNavigation = (tab: string) => {
    window.location.hash = tab
    setShowNavMenu(false)
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

  const getPlanDisplayName = (plan: string) => {
    if (plan === "sselfie_studio_membership") return "Studio Membership"
    if (plan === "one_time_session") return "One-Time Session"
    return "Free"
  }

  useEffect(() => {
    fetchUserInfo()
    fetchSettings()
  }, [])

  return (
    <div className="space-y-8 pb-24">
      <div className="pt-4">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div>
            <h2 className="text-2xl sm:text-4xl font-serif font-extralight tracking-[0.3em] text-stone-950 uppercase">
              Settings
            </h2>
            <p className="text-xs tracking-[0.15em] uppercase font-light mt-2 text-stone-500">
              Manage Your Preferences
            </p>
          </div>
          <button
            onClick={() => setShowNavMenu(!showNavMenu)}
            className="flex items-center justify-center px-3 h-9 sm:h-10 rounded-lg hover:bg-stone-100/50 transition-colors touch-manipulation active:scale-95"
            aria-label="Navigation menu"
            aria-expanded={showNavMenu}
          >
            <span className="text-xs sm:text-sm font-serif tracking-[0.2em] text-stone-950 uppercase">MENU</span>
          </button>
        </div>
      </div>

      {showNavMenu && (
        <>
          <div
            className="fixed inset-0 bg-stone-950/20 backdrop-blur-sm z-40 animate-in fade-in duration-200"
            onClick={() => setShowNavMenu(false)}
          />

          <div className="fixed top-0 right-0 bottom-0 w-80 bg-white/95 backdrop-blur-3xl border-l border-stone-200 shadow-2xl z-50 animate-in slide-in-from-right duration-300 flex flex-col">
            <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-stone-200/50">
              <h3 className="text-sm font-serif font-extralight tracking-[0.2em] uppercase text-stone-950">Menu</h3>
              <button
                onClick={() => setShowNavMenu(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-stone-100 transition-colors"
                aria-label="Close menu"
              >
                <X size={18} className="text-stone-600" strokeWidth={2} />
              </button>
            </div>

            <div className="flex-shrink-0 px-6 py-6 border-b border-stone-200/50">
              <div className="text-[10px] tracking-[0.15em] uppercase font-light text-stone-500 mb-2">Your Credits</div>
              <div className="text-3xl font-serif font-extralight text-stone-950 tabular-nums">
                {creditBalance.toFixed(1)}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 py-2">
              <button
                onClick={() => handleNavigation("studio")}
                className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-stone-50 transition-colors touch-manipulation"
              >
                <Home size={18} className="text-stone-600" strokeWidth={2} />
                <span className="text-sm font-medium text-stone-700">Studio</span>
              </button>
              <button
                onClick={() => handleNavigation("training")}
                className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-stone-50 transition-colors touch-manipulation"
              >
                <Aperture size={18} className="text-stone-600" strokeWidth={2} />
                <span className="text-sm font-medium text-stone-700">Training</span>
              </button>
              <button
                onClick={() => handleNavigation("maya")}
                className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-stone-50 transition-colors touch-manipulation"
              >
                <MessageCircle size={18} className="text-stone-600" strokeWidth={2} />
                <span className="text-sm font-medium text-stone-700">Maya</span>
              </button>
              <button
                onClick={() => handleNavigation("gallery")}
                className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-stone-50 transition-colors touch-manipulation"
              >
                <ImageIconLucide size={18} className="text-stone-600" strokeWidth={2} />
                <span className="text-sm font-medium text-stone-700">Gallery</span>
              </button>
              <button
                onClick={() => handleNavigation("academy")}
                className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-stone-50 transition-colors touch-manipulation"
              >
                <Grid size={18} className="text-stone-600" strokeWidth={2} />
                <span className="text-sm font-medium text-stone-700">Academy</span>
              </button>
              <button
                onClick={() => handleNavigation("profile")}
                className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-stone-50 transition-colors touch-manipulation"
              >
                <UserIcon size={18} className="text-stone-600" strokeWidth={2} />
                <span className="text-sm font-medium text-stone-700">Profile</span>
              </button>
              <button
                onClick={() => handleNavigation("settings")}
                className="w-full flex items-center gap-3 px-6 py-4 text-left bg-stone-100/50 border-l-2 border-stone-950"
              >
                <SettingsIcon size={18} className="text-stone-950" strokeWidth={2} />
                <span className="text-sm font-medium text-stone-950">Settings</span>
              </button>
            </div>

            <div className="flex-shrink-0 px-6 py-4 border-t border-stone-200/50 bg-white/95">
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
              >
                <LogOut size={16} strokeWidth={2} />
                <span>{isLoggingOut ? "Signing Out..." : "Sign Out"}</span>
              </button>
            </div>
          </div>
        </>
      )}

      <div className="space-y-6">
        {/* Account Information */}
        {userInfo && (
          <div className="bg-white/50 backdrop-blur-2xl rounded-xl sm:rounded-[1.75rem] p-4 sm:p-6 md:p-8 border border-white/60 shadow-xl shadow-stone-900/10">
            <div className="flex items-center space-x-3 sm:space-x-4 mb-6 sm:mb-8">
              <div className="p-2.5 sm:p-3.5 bg-stone-950 rounded-lg sm:rounded-[1.125rem] shadow-lg">
                <User size={18} className="text-white" strokeWidth={2.5} />
              </div>
              <h3 className="text-base sm:text-lg md:text-xl font-bold text-stone-950">Account</h3>
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
                <div className="flex-1">
                  <p className="text-xs text-stone-500 uppercase tracking-wider">Plan</p>
                  <p className="text-sm font-medium text-stone-950 uppercase">{getPlanDisplayName(userInfo.plan)}</p>
                  {userInfo.subscription && userInfo.subscription.status === "active" && (
                    <p className="text-xs text-stone-500 mt-1">
                      {userInfo.subscription.productType === "sselfie_studio_membership"
                        ? `Renews ${formatRenewalDate(userInfo.subscription.currentPeriodEnd)}`
                        : `Expires ${formatRenewalDate(userInfo.subscription.currentPeriodEnd)}`}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 py-3">
                <Calendar size={16} className="text-stone-500" />
                <div>
                  <p className="text-xs text-stone-500 uppercase tracking-wider">Member Since</p>
                  <p className="text-sm font-medium text-stone-950">{formatDate(userInfo.memberSince)}</p>
                </div>
              </div>

              {userInfo.subscription && userInfo.subscription.productType === "sselfie_studio_membership" && (
                <div className="pt-4 border-t border-stone-200/30">
                  <button
                    onClick={handleManageSubscription}
                    disabled={isLoadingPortal}
                    className="w-full text-sm tracking-[0.15em] uppercase font-light border rounded-2xl py-4 transition-colors hover:text-stone-950 hover:bg-stone-100/30 min-h-[52px] text-stone-600 border-stone-300/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isLoadingPortal ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <ExternalLink size={16} />
                        Manage Subscription
                      </>
                    )}
                  </button>
                  <p className="text-xs text-stone-500 text-center mt-2">
                    Update payment method, view billing history, or cancel subscription
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="bg-white/50 backdrop-blur-2xl rounded-xl sm:rounded-[1.75rem] p-4 sm:p-6 md:p-8 border border-white/60 shadow-xl shadow-stone-900/10">
          <div className="flex items-center space-x-3 sm:space-x-4 mb-6">
            <div className="p-2.5 sm:p-3.5 bg-stone-950 rounded-lg sm:rounded-[1.125rem] shadow-lg">
              <Palette size={18} className="text-white" strokeWidth={2.5} />
            </div>
            <h3 className="text-base sm:text-lg md:text-xl font-bold text-stone-950">Personal Brand</h3>
          </div>
          <PersonalBrandSection userId={user.id || ""} />
        </div>

        <div className="bg-white/50 backdrop-blur-2xl rounded-xl sm:rounded-[1.75rem] p-4 sm:p-6 md:p-8 border border-white/60 shadow-xl shadow-stone-900/10">
          <div className="flex items-center space-x-3 sm:space-x-4 mb-6">
            <div className="p-2.5 sm:p-3.5 bg-stone-950 rounded-lg sm:rounded-[1.125rem] shadow-lg">
              <ImageIcon size={18} className="text-white" strokeWidth={2.5} />
            </div>
            <h3 className="text-base sm:text-lg md:text-xl font-bold text-stone-950">Brand Assets</h3>
          </div>
          <BrandAssetsManager />
        </div>

        {/* Notifications */}
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

        {/* Generation Preferences */}
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

        {/* Privacy & Data */}
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
      </div>
    </div>
  )
}
