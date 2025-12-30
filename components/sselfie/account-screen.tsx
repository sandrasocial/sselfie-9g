"use client"

import type React from "react"
import { useState, useEffect } from "react"
import {
  User,
  Settings as SettingsIcon,
  Edit2,
  Plus,
  Aperture,
  Camera,
  ImageIcon,
  X,
  LogOut,
  Bell,
  Shield,
  Mail,
  Calendar,
  CreditCard,
  Package,
  ExternalLink,
  Lock,
  ChevronRight,
} from "lucide-react"
import { useRouter } from "next/navigation"
import EditProfileDialog from "./edit-profile-dialog"
import { ProfileImageSelector } from "@/components/profile-image-selector"
import { BestWorkSelector } from "./best-work-selector"
import PersonalBrandSection from "./personal-brand-section"
import BrandAssetsManager from "./brand-assets-manager"
import { UpgradeModal } from "@/components/upgrade/upgrade-modal"
import RetrainModelModal from "./retrain-model-modal"
import type { User as UserType } from "./types"
import Image from "next/image"
import UnifiedLoading from "./unified-loading"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { DesignClasses } from "@/lib/design-tokens"

interface AccountScreenProps {
  user: UserType
  creditBalance: number
}

type AccountSection = "profile" | "settings"

interface ProfileStats {
  totalGenerations: number
  favorites: number
}

interface ProfileInfo {
  name: string
  avatar: string | null
  bio: string | null
  instagram: string | null
  location: string | null
  product_type: string
  memberSince: string
}

interface BestWorkImage {
  id: string
  image_id: string
  image_url: string
  category?: string
  created_at: string
  is_favorite?: boolean
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

export default function AccountScreen({ user, creditBalance }: AccountScreenProps) {
  const [activeSection, setActiveSection] = useState<AccountSection>("profile")
  
  // Profile state
  const [stats, setStats] = useState<ProfileStats | null>(null)
  const [profileInfo, setProfileInfo] = useState<ProfileInfo | null>(null)
  const [bestWork, setBestWork] = useState<BestWorkImage[]>([])
  const [loading, setLoading] = useState(true)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [showProfileSelector, setShowProfileSelector] = useState(false)
  const [showBestWorkSelector, setShowBestWorkSelector] = useState(false)
  const [allImages, setAllImages] = useState<BestWorkImage[]>([])
  const [isBrandSectionExpanded, setIsBrandSectionExpanded] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [isSavingBestWork, setIsSavingBestWork] = useState(false)
  
  // Settings state
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null)
  const [isLoadingPortal, setIsLoadingPortal] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [mayaUpdates, setMayaUpdates] = useState(true)
  const [defaultImageCount, setDefaultImageCount] = useState(5)
  const [saveToGallery, setSaveToGallery] = useState(true)
  const [dataForTraining, setDataForTraining] = useState(true)
  const [gender, setGender] = useState<string>("")
  const [ethnicity, setEthnicity] = useState<string>("")
  const [physicalPreferences, setPhysicalPreferences] = useState<string>("")
  const [isUpdatingDemographics, setIsUpdatingDemographics] = useState(false)
  const [showRetrainModal, setShowRetrainModal] = useState(false)
  
  // Shared state
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const router = useRouter()

  // Fetch all data on mount
  useEffect(() => {
    async function fetchAllData() {
      try {
        const [statsRes, infoRes, imagesRes, bestWorkRes, userInfoRes, subscriptionRes, settingsRes] = await Promise.all([
          fetch("/api/profile/stats", { credentials: "include" }),
          fetch("/api/profile/info", { credentials: "include" }),
          fetch("/api/images?limit=100", { credentials: "include" }),
          fetch("/api/profile/best-work", { credentials: "include" }),
          fetch("/api/user/info", { credentials: "include" }),
          fetch("/api/profile/info", { credentials: "include" }),
          fetch("/api/settings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ key: "value" }),
          }),
        ])

        if (statsRes.ok) {
          const statsData = await statsRes.json()
          setStats({
            totalGenerations: statsData.totalGenerations || 0,
            favorites: statsData.favorites || 0,
          })
        }

        if (infoRes.ok) {
          const infoData = await infoRes.json()
          setProfileInfo(infoData)
        }

        if (imagesRes.ok) {
          const imagesData = await imagesRes.json()
          const images = imagesData.images || []
          setAllImages(images)
        }

        if (bestWorkRes.ok) {
          const bestWorkData = await bestWorkRes.json()
          setBestWork(bestWorkData.bestWork || [])
        }

        if (userInfoRes.ok) {
          const data = await userInfoRes.json()
          setUserInfo(data)
          setGender(data.gender || "")
          setEthnicity(data.ethnicity || "")
          setPhysicalPreferences(data.physical_preferences || "")
        }

        if (subscriptionRes.ok) {
          const data = await subscriptionRes.json()
          if (data.subscription) {
            setSubscriptionInfo(data.subscription)
          }
        }

        if (settingsRes.ok) {
          const data = await settingsRes.json()
          if (data && data.settings) {
            setEmailNotifications(data.settings.emailNotifications ?? true)
            setMayaUpdates(data.settings.mayaUpdates ?? true)
            setDefaultImageCount(data.settings.defaultImageCount ?? 5)
            setSaveToGallery(data.settings.saveToGallery ?? true)
            setDataForTraining(data.settings.dataForTraining ?? true)
          }
        }
      } catch (error) {
        console.error("[Account] Error fetching data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchAllData()
  }, [])

  // Profile functions
  const refreshProfileData = async () => {
    try {
      const [statsRes, infoRes] = await Promise.all([
        fetch("/api/profile/stats", { credentials: "include" }),
        fetch("/api/profile/info", { credentials: "include" }),
      ])

      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats({
          totalGenerations: statsData.totalGenerations || 0,
          favorites: statsData.favorites || 0,
        })
      }

      if (infoRes.ok) {
        const infoData = await infoRes.json()
        setProfileInfo(infoData)
      }
    } catch (error) {
      console.error("[Account] Error refreshing profile data:", error)
    }
  }

  const handleProfileImageUpdate = async (imageUrl: string) => {
    await refreshProfileData()
    setShowProfileSelector(false)
  }

  const handleBestWorkImageSelect = async () => {
    try {
      setIsSavingBestWork(true)
      const bestWorkRes = await fetch("/api/profile/best-work", { credentials: "include" })
      if (bestWorkRes.ok) {
        const bestWorkData = await bestWorkRes.json()
        setBestWork(bestWorkData.bestWork || [])
      }
    } catch (error) {
      console.error("[Account] Error refreshing best work:", error)
    } finally {
      setIsSavingBestWork(false)
    }
    setShowBestWorkSelector(false)
  }

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault()
    if (draggedIndex !== null && draggedIndex !== index) {
      const newBestWork = [...bestWork]
      const [draggedImage] = newBestWork.splice(draggedIndex, 1)
      newBestWork.splice(index, 0, draggedImage)
      setBestWork(newBestWork)
      setDraggedIndex(index)
    }
  }

  const handleDragEnd = async () => {
    setDraggedIndex(null)
    if (bestWork.length > 0) {
      try {
        setIsSavingBestWork(true)
        const imageIds = bestWork.map((img) => img.image_id)
        const response = await fetch("/api/profile/best-work", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ imageIds }),
        })

        if (!response.ok) {
          console.error("[Account] Failed to save best work order")
        }
      } catch (error) {
        console.error("[Account] Error saving best work order:", error)
      } finally {
        setIsSavingBestWork(false)
      }
    }
  }

  // Settings functions
  const updateSetting = async (key: string, value: boolean | number) => {
    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ [key]: value }),
      })

      if (!response.ok) {
        console.warn("[Account] Failed to update setting:", key)
      }
    } catch (error) {
      console.error("[Account] Error updating setting:", error)
    }
  }

  const handleManageSubscription = async () => {
    setIsLoadingPortal(true)
    try {
      const response = await fetch("/api/stripe/create-portal-session", {
        method: "POST",
        credentials: "include",
      })

      const data = await response.json()

      if (response.ok) {
        window.location.href = data.url
      } else {
        alert(data.message || "Unable to open subscription management. Please try again.")
      }
    } catch (error) {
      console.error("[Account] Error opening portal:", error)
      alert("Unable to open subscription management. Please try again.")
    } finally {
      setIsLoadingPortal(false)
    }
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
        console.error("[Account] Failed to update demographics")
      }
    } catch (error) {
      console.error("[Account] Error updating demographics:", error)
    } finally {
      setIsUpdatingDemographics(false)
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

  // Shared functions
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
        console.error("[Account] Logout failed")
        setIsLoggingOut(false)
      }
    } catch (error) {
      console.error("[Account] Error during logout:", error)
      setIsLoggingOut(false)
    }
  }

  if (loading) {
    return <UnifiedLoading message="Loading your account..." />
  }

  const displayName = profileInfo?.name || user.email?.split("@")[0] || "User"
  const displayAvatar = profileInfo?.avatar || user.avatar || "/placeholder.svg"
  const displayPlan =
    profileInfo?.product_type === "sselfie_studio_membership"
      ? "Studio"
      : profileInfo?.product_type === "one_time_session"
        ? "Session"
        : "Free"
  const userInitial = displayName.charAt(0).toUpperCase()

  const isStudioMembership = userInfo?.product_type === "sselfie_studio_membership"
  const hasActiveSubscription = subscriptionInfo?.status === "active"
  const currentTier = (userInfo?.product_type as any) ?? "one_time_session"
  const upgradeTargetTier =
    currentTier === "brand_studio_membership"
      ? null
      : currentTier === "sselfie_studio_membership"
        ? "brand_studio_membership"
        : "sselfie_studio_membership"

  return (
    <div className="space-y-6 pb-24">
      {/* Tab Switcher */}
      <div className={`flex gap-2 ${DesignClasses.spacing.paddingX.md} pt-4`}>
        <button
          onClick={() => setActiveSection("profile")}
          className={`flex-1 ${DesignClasses.spacing.padding.sm} ${DesignClasses.radius.md} transition-all ${
            activeSection === "profile"
              ? `${DesignClasses.buttonPrimary}`
              : `${DesignClasses.buttonSecondary}`
          }`}
        >
          <span className={DesignClasses.typography.label.button}>Profile</span>
        </button>
        <button
          onClick={() => setActiveSection("settings")}
          className={`flex-1 ${DesignClasses.spacing.padding.sm} ${DesignClasses.radius.md} transition-all ${
            activeSection === "settings"
              ? `${DesignClasses.buttonPrimary}`
              : `${DesignClasses.buttonSecondary}`
          }`}
        >
          <span className={DesignClasses.typography.label.button}>Settings</span>
        </button>
      </div>

      {/* Profile Section */}
      {activeSection === "profile" && (
        <div className="space-y-8">
          <div className="text-center space-y-8 pt-4">
            <button onClick={() => setShowProfileSelector(true)} className="relative inline-block group">
              <Avatar className="w-32 h-32 sm:w-40 sm:h-40 border-2 border-stone-200/60 shadow-sm">
                <AvatarImage
                  src={displayAvatar || "/placeholder.svg"}
                  alt={displayName}
                  className="object-cover object-top"
                />
                <AvatarFallback className="bg-stone-200 text-stone-700 text-5xl sm:text-6xl font-light">
                  {userInitial}
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 bg-stone-950/0 group-hover:bg-stone-950/40 rounded-full transition-all flex items-center justify-center">
                <ImageIcon size={24} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </button>

            <div className="space-y-4">
              <h2 className="text-3xl sm:text-5xl font-serif font-extralight tracking-[0.25em] text-stone-950 uppercase">
                {displayName}
              </h2>
              {profileInfo?.bio && <p className="text-sm text-stone-600 max-w-md mx-auto">{profileInfo.bio}</p>}
              <p className="text-xs tracking-[0.3em] uppercase font-light bg-stone-500/10 px-4 py-2 rounded-full inline-block text-stone-600">
                {displayPlan} Member
              </p>
            </div>

            <div className="grid grid-cols-2 gap-8 pt-4 max-w-sm mx-auto">
              {[
                { value: stats?.totalGenerations || 0, label: "Photos" },
                { value: stats?.favorites || 0, label: "Favorites" },
              ].map((stat, index) => (
                <div key={index} className="text-center space-y-3">
                  <div className="text-3xl sm:text-4xl font-serif font-extralight text-stone-950">{stat.value}</div>
                  <div className="text-xs tracking-[0.15em] uppercase font-light text-stone-500">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => setEditDialogOpen(true)}
            className={`w-full group relative ${DesignClasses.buttonPrimary} overflow-hidden`}
          >
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <span className="relative z-10 flex items-center justify-center gap-2">
              <Edit2 size={16} />
              Edit Profile
            </span>
          </button>

          <div className="space-y-4">
            <button
              onClick={() => setIsBrandSectionExpanded(!isBrandSectionExpanded)}
              className={`w-full flex items-center justify-between ${DesignClasses.spacing.padding.sm} ${DesignClasses.card} hover:bg-white/60 transition-all`}
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-stone-950 rounded-lg shadow-lg">
                  <Aperture size={18} className="text-white" strokeWidth={2.5} />
                </div>
                <h3 className="text-lg sm:text-xl md:text-2xl font-serif font-extralight tracking-[0.15em] text-stone-950 uppercase">
                  Personal Brand
                </h3>
              </div>
              <div className={`transform transition-transform duration-200 ${isBrandSectionExpanded ? "rotate-180" : ""}`}>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="text-stone-600"
                >
                  <path
                    d="M5 7.5L10 12.5L15 7.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </button>
            {isBrandSectionExpanded && (
              <div className="animate-in slide-in-from-top-2 duration-200">
                <PersonalBrandSection userId={user.id || ""} />
              </div>
            )}
          </div>

          <div className="space-y-4 sm:space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base sm:text-xl md:text-2xl font-serif font-extralight tracking-[0.15em] text-stone-950 uppercase">
                Best Work
              </h3>
              <Button
                onClick={() => setShowBestWorkSelector(true)}
                variant="ghost"
                size="sm"
                className="text-xs text-stone-600 hover:text-stone-950"
                disabled={isSavingBestWork}
              >
                <Plus size={14} className="mr-1" />
                Select Photos
              </Button>
            </div>

            {isSavingBestWork && (
              <div className="flex items-center justify-center gap-2 py-2">
                <div className="w-4 h-4 border-2 border-stone-300 border-t-stone-950 rounded-full animate-spin" />
                <p className="text-xs text-stone-600">Saving...</p>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4">
              {bestWork.length > 0
                ? bestWork.map((image, index) => (
                    <div
                      key={image.image_id}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      className={`aspect-square rounded-xl sm:rounded-2xl border border-stone-300/30 overflow-hidden cursor-move group transition-all duration-200 hover:scale-[1.02] hover:shadow-lg relative ${
                        draggedIndex === index ? "opacity-50 scale-95" : ""
                      }`}
                    >
                      <Image
                        src={image.image_url || "/placeholder.svg"}
                        alt={image.category || "Generated image"}
                        fill
                        className="object-cover object-top pointer-events-none"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-stone-950/0 group-hover:bg-stone-950/10 transition-all flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                          <p className="text-xs text-stone-600 font-medium">#{index + 1}</p>
                        </div>
                      </div>
                    </div>
                  ))
                : Array.from({ length: 9 }).map((_, i) => (
                    <div
                      key={`empty-${i}`}
                      onClick={() => setShowBestWorkSelector(true)}
                      className="aspect-square bg-stone-200/30 rounded-xl sm:rounded-2xl border border-stone-300/30 flex items-center justify-center cursor-pointer hover:bg-stone-200/50 transition-colors group"
                    >
                      <div className="flex flex-col items-center gap-1">
                        <Camera
                          size={20}
                          strokeWidth={1.5}
                          className="text-stone-400 group-hover:text-stone-600 transition-colors"
                        />
                        <span className="text-[10px] text-stone-400 group-hover:text-stone-600 transition-colors font-light">
                          {i + 1}
                        </span>
                      </div>
                    </div>
                  ))}
            </div>
            {bestWork.length === 0 && (
              <p className="text-center text-sm text-stone-500 py-4">
                Click the + button or empty slots to select your best work from your gallery
              </p>
            )}
          </div>
        </div>
      )}

      {/* Settings Section */}
      {activeSection === "settings" && (
        <div className={`space-y-4 sm:space-y-6 md:space-y-8 ${DesignClasses.spacing.paddingX.md}`}>
          {userInfo && (
            <div className={DesignClasses.card}>
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
            <div className={DesignClasses.card}>
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

          {userInfo && upgradeTargetTier && (
            <div className="bg-white/70 backdrop-blur-2xl rounded-xl sm:rounded-[1.75rem] p-4 sm:p-6 md:p-8 border border-stone-200/60 shadow-xl shadow-stone-900/10">
              <div className="flex items-center space-x-3 sm:space-x-4 mb-6 sm:mb-8">
                <div className="p-2.5 sm:p-3.5 bg-stone-900 rounded-lg sm:rounded-[1.125rem] shadow-lg">
                  <CreditCard size={18} className="text-white" strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg md:text-xl font-bold text-stone-950">
                    {upgradeTargetTier === "brand_studio_membership" ? "Upgrade to Brand Studio" : "Upgrade to Studio Membership"}
                  </h3>
                  <p className="text-sm text-stone-600">More credits, premium features, priority support.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4">
                <InfoPill
                  label="Current plan"
                  value={
                    userInfo.product_type === "sselfie_studio_membership"
                      ? "Studio Membership"
                      : userInfo.product_type === "one_time_session"
                        ? "One-Time Session"
                        : "Free"
                  }
                />
                <InfoPill
                  label="Upgrade to"
                  value={upgradeTargetTier === "brand_studio_membership" ? "Brand Studio" : "Studio Membership"}
                />
                <InfoPill
                  label="Credits"
                  value={upgradeTargetTier === "brand_studio_membership" ? "300 credits / month" : "150 credits / month"}
                />
              </div>

              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setShowUpgradeModal(true)
                }}
                className="w-full flex items-center justify-center gap-2 text-sm tracking-[0.15em] uppercase font-medium rounded-2xl py-4 bg-stone-900 text-white hover:bg-stone-800 transition-colors active:scale-[0.98]"
              >
                Upgrade now
                <ChevronRight size={14} />
              </button>

              <p className="text-xs text-stone-500 text-center mt-3">
                We'll prorate the change automatically. You can switch back anytime in Stripe.
              </p>
            </div>
          )}

          {((hasActiveSubscription || userInfo?.stripe_customer_id) && !isStudioMembership) && (
            <div className={DesignClasses.card}>
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

          <div className={DesignClasses.card}>
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

          <div className={DesignClasses.card}>
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

          <div className={DesignClasses.card}>
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

          <div className={DesignClasses.card}>
            <div className="flex items-center space-x-3 sm:space-x-4 mb-6 sm:mb-8">
              <div className="p-2.5 sm:p-3.5 bg-stone-950 rounded-lg sm:rounded-[1.125rem] shadow-lg">
                <Package size={18} className="text-white" strokeWidth={2.5} />
              </div>
              <h3 className="text-base sm:text-lg md:text-xl font-bold text-stone-950">Brand Assets</h3>
            </div>
            <BrandAssetsManager />
          </div>

          <div className={DesignClasses.card}>
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

          <div className={DesignClasses.card}>
            <div className="flex items-center space-x-3 sm:space-x-4 mb-6 sm:mb-8">
              <div className="p-2.5 sm:p-3.5 bg-stone-950 rounded-lg sm:rounded-[1.125rem] shadow-lg">
                <Aperture size={18} className="text-white" strokeWidth={2.5} />
              </div>
              <h3 className="text-base sm:text-lg md:text-xl font-bold text-stone-950">Model Training</h3>
            </div>

            <div className="space-y-4 mb-6">
              <p className="text-sm text-stone-600">
                Want to improve your results? Retrain your model with new selfies to get better AI-generated images.
              </p>
              <button
                onClick={() => setShowRetrainModal(true)}
                className="w-full flex items-center justify-center gap-2 text-sm tracking-[0.15em] uppercase font-light border rounded-2xl py-5 transition-colors hover:text-white hover:bg-stone-950 min-h-[56px] text-stone-950 border-stone-950"
              >
                <Aperture size={16} />
                Retrain Model
              </button>
            </div>
          </div>

          <div className={DesignClasses.card}>
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
      )}

      {/* Modals and Dialogs */}
      <EditProfileDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        currentData={{
          name: displayName,
          bio: profileInfo?.bio || null,
          location: profileInfo?.location || null,
          instagram: profileInfo?.instagram || null,
        }}
        onSuccess={refreshProfileData}
      />

      {showProfileSelector && (
        <ProfileImageSelector
          images={allImages.map((img) => ({
            id: img.id.toString(),
            image_url: img.image_url,
            prompt: img.category || "",
            is_favorite: img.is_favorite || false,
          }))}
          currentAvatar={displayAvatar}
          onSelect={handleProfileImageUpdate}
          onClose={() => setShowProfileSelector(false)}
        />
      )}

      {showBestWorkSelector && (
        <BestWorkSelector
          images={allImages}
          currentBestWork={bestWork.map((img) => img.image_id)}
          onClose={() => setShowBestWorkSelector(false)}
          onSave={handleBestWorkImageSelect}
        />
      )}

      {upgradeTargetTier && (
        <UpgradeModal
          open={showUpgradeModal}
          currentTier={currentTier}
          targetTier={upgradeTargetTier}
          onClose={() => setShowUpgradeModal(false)}
        />
      )}

      <RetrainModelModal
        isOpen={showRetrainModal}
        onClose={() => setShowRetrainModal(false)}
        onComplete={() => {
          // Refresh training status after retraining
          window.location.reload()
        }}
        userId={user.id || ""}
        userName={user.name || null}
      />
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
        className={`relative w-12 h-7 sm:w-14 sm:h-8 md:w-16 md:h-9 rounded-full transition-all duration-300 cursor-pointer shadow-inner shrink-0 ${
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

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white/70 px-4 py-3 space-y-1">
      <p className="text-[10px] uppercase tracking-[0.15em] text-stone-500">{label}</p>
      <p className="text-sm font-semibold text-stone-900">{value}</p>
    </div>
  )
}

