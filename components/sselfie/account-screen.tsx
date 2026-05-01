"use client"

import type React from "react"
import { useState, useEffect } from "react"
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
import { ReferralDashboard } from "@/components/referrals/referral-dashboard"
import { MayaIdentityNotes } from "./maya/maya-identity-notes"
import { trackCTAClick } from "@/lib/analytics"

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

interface PersonalPageItem {
  id: string
  title: string
  pageType: string
  status: string
  liveUrl: string
  version: number
  updatedAt: string
}

export default function AccountScreen({ user, creditBalance: _creditBalance }: AccountScreenProps) {
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
  const [_defaultImageCount, setDefaultImageCount] = useState(5)
  const [saveToGallery, setSaveToGallery] = useState(true)
  const [dataForTraining, setDataForTraining] = useState(true)
  const [gender, setGender] = useState<string>("")
  const [ethnicity, setEthnicity] = useState<string>("")
  const [physicalPreferences, setPhysicalPreferences] = useState<string>("")
  const [isUpdatingDemographics, setIsUpdatingDemographics] = useState(false)
  const [showRetrainModal, setShowRetrainModal] = useState(false)
  const [personalPages, setPersonalPages] = useState<PersonalPageItem[]>([])
  
  // Shared state
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  // Danger zone — delete account
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState("")
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const router = useRouter()

  // Fetch all data on mount
  useEffect(() => {
    async function fetchAllData() {
      try {
        const [statsRes, infoRes, imagesRes, bestWorkRes, userInfoRes, subscriptionRes, settingsRes, personalPagesRes] = await Promise.all([
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
          fetch("/api/maya/personal-pages", { credentials: "include" }),
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

        if (personalPagesRes.ok) {
          const data = await personalPagesRes.json()
          setPersonalPages(Array.isArray(data?.pages) ? data.pages : [])
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

  const handleProfileImageUpdate = async (_imageUrl: string) => {
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

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") return
    setIsDeletingAccount(true)
    setDeleteError(null)
    try {
      const response = await fetch("/api/user/delete", {
        method: "DELETE",
        credentials: "include",
      })
      if (response.ok) {
        router.push("/auth/login")
      } else {
        const data = await response.json().catch(() => ({}))
        setDeleteError(data.error ?? "Something went wrong. Please contact support.")
        setIsDeletingAccount(false)
      }
    } catch {
      setDeleteError("Something went wrong. Please contact support.")
      setIsDeletingAccount(false)
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
  const currentTier =
    userInfo?.product_type === "sselfie_studio_membership" || userInfo?.product_type === "brand_studio_membership"
      ? userInfo.product_type
      : "one_time_session"
  // Only show upgrade for users without Creator Studio membership
  const upgradeTargetTier =
    currentTier === "sselfie_studio_membership" || currentTier === "brand_studio_membership"
      ? null // Already on Creator Studio (or legacy Brand Studio)
      : "sselfie_studio_membership"
  const isPastDue = subscriptionInfo?.status === "past_due"
  const sectionWrap = "px-4 sm:px-6 md:px-8"
  const glassCard =
    "rounded-[16px] border border-[color:var(--app-glass-border)] bg-[color:var(--app-glass-bg)] backdrop-blur-[20px]"
  const glassRow =
    "rounded-[12px] border border-[color:var(--app-glass-border)] bg-[color:var(--app-btn-secondary-bg)] px-4 py-3 transition-colors hover:border-[color:var(--app-border)]"
  const sectionLabel = "text-[11px] font-medium uppercase tracking-[0.5em] text-[color:var(--app-text-secondary)]"
  const actionButton =
    "w-full rounded-[6px] border border-[color:var(--app-glass-border)] bg-[color:var(--app-btn-secondary-bg)] px-4 py-4 text-[11px] font-medium uppercase tracking-[0.35em] text-[color:var(--app-text-primary)] transition-colors hover:bg-[color:var(--app-btn-secondary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
  const accountHeroBackground =
    "url('/flatlay-luxury-planning.jpg'), url('https://hebbkx1anhila5yf.public.blob.vercel-storage.com/_%20%2842%29-9YjBZswCzTL0RY7fbkRjXC2uzoaSdO.jpeg')"

  return (
    <div className="account-light space-y-6 pb-28">
      <div className={`${sectionWrap} pt-4 space-y-4`}>
        <div
          className={`${glassCard} account-hero relative overflow-hidden p-6 sm:p-8`}
          style={{
            backgroundImage: `linear-gradient(180deg, rgba(13,12,11,0.24) 0%, rgba(13,12,11,0.82) 100%), ${accountHeroBackground}`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="relative z-10 space-y-5">
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-[0.3em] text-white/75">Account</p>
              <h1 className="display-header text-3xl font-light text-white/95 sm:text-5xl">
                {displayName}
              </h1>
              <p className="max-w-xl text-sm leading-relaxed text-white/90">
                Keep your profile, brand assets, and settings in one place.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <div className="rounded-xl border border-white/15 bg-black/20 px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.26em] text-white/65">Plan</p>
                <p className="mt-1 text-sm text-white">{displayPlan}</p>
              </div>
              <div className="rounded-xl border border-white/15 bg-black/20 px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.26em] text-white/65">Photos</p>
                <p className="mt-1 text-sm text-white">{stats?.totalGenerations || 0}</p>
              </div>
              <div className="rounded-xl border border-white/15 bg-black/20 px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.26em] text-white/65">Assets</p>
                <p className="mt-1 text-sm text-white">{personalPages.length}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-[12px] border border-[color:var(--app-glass-border)] bg-[color:var(--app-btn-secondary-bg)] p-1.5 sm:w-fit">
          <button
            onClick={() => setActiveSection("profile")}
            className={`rounded-[6px] px-4 py-2 text-[11px] font-medium uppercase tracking-[0.32em] transition-colors ${
              activeSection === "profile"
                ? "bg-[color:var(--app-btn-primary-bg)] text-[color:var(--app-btn-primary-text)]"
                : "text-[color:var(--app-text-secondary)] hover:text-[color:var(--app-text-primary)] hover:bg-[color:var(--app-btn-secondary-hover)]"
            }`}
          >
            Profile
          </button>
          <button
            onClick={() => setActiveSection("settings")}
            className={`rounded-[6px] px-4 py-2 text-[11px] font-medium uppercase tracking-[0.32em] transition-colors ${
              activeSection === "settings"
                ? "bg-[color:var(--app-btn-primary-bg)] text-[color:var(--app-btn-primary-text)]"
                : "text-[color:var(--app-text-secondary)] hover:text-[color:var(--app-text-primary)] hover:bg-[color:var(--app-btn-secondary-hover)]"
            }`}
          >
            Settings
          </button>
        </div>
      </div>

      {activeSection === "profile" && (
        <div className={`${sectionWrap} space-y-5`}>
          <div className={`${glassCard} overflow-hidden p-6 sm:p-8`}>
            <div className="text-center space-y-6">
              <button onClick={() => setShowProfileSelector(true)} className="relative inline-block group">
                <Avatar className="h-28 w-28 border-2 border-[color:var(--color-whisper)] sm:h-36 sm:w-36">
                  <AvatarImage
                    src={displayAvatar || "/placeholder.svg"}
                    alt={displayName}
                    className="object-cover object-top"
                  />
                  <AvatarFallback className="bg-white/10 text-5xl font-light text-[color:var(--color-porcelain)] sm:text-6xl">
                    {userInitial}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 transition-all group-hover:bg-black/45">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-porcelain)] opacity-0 transition-opacity group-hover:opacity-100">
                    Edit
                  </span>
                </div>
              </button>

              <div className="space-y-3">
                <h2 className="display-header text-3xl font-light text-[color:var(--color-porcelain)] sm:text-5xl">
                  Your profile
                </h2>
                {profileInfo?.bio && (
                  <p className="mx-auto max-w-xl text-sm leading-relaxed text-[color:var(--color-whisper)]">{profileInfo.bio}</p>
                )}
                <p className="inline-flex rounded-[4px] border border-[color:var(--app-glass-border)] bg-[color:var(--app-btn-secondary-bg)] px-4 py-2 text-[10px] font-medium uppercase tracking-[0.4em] text-[color:var(--app-text-secondary)]">
                  {displayPlan} Member
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: stats?.totalGenerations || 0, label: "Photos" },
                  { value: stats?.favorites || 0, label: "Favourites" },
                ].map((stat) => (
                  <div key={stat.label} className={`${glassRow} text-center`}>
                    <p className="display-header text-3xl font-light text-[color:var(--color-porcelain)]">{stat.value}</p>
                    <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.4em] text-[color:var(--color-smoke)]">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={() => setEditDialogOpen(true)}
            className="w-full rounded-[6px] border border-[color:var(--app-btn-primary-bg)] bg-[color:var(--app-btn-primary-bg)] px-5 py-4 text-[11px] font-medium uppercase tracking-[0.35em] text-[color:var(--app-btn-primary-text)] transition-opacity hover:opacity-90"
          >
            Edit Profile
          </button>

          <div className="space-y-3">
            <button
              onClick={() => setIsBrandSectionExpanded(!isBrandSectionExpanded)}
              className={`w-full ${glassCard} flex items-center justify-between px-5 py-4 transition-colors hover:bg-white/8`}
            >
              <h3 className="display-header text-lg font-light text-[color:var(--color-porcelain)]">Your Brand</h3>
              <span
                className={`text-lg text-[color:var(--color-whisper)] transition-transform duration-200 ${isBrandSectionExpanded ? "rotate-180" : ""}`}
              >
                ▾
              </span>
            </button>
            {isBrandSectionExpanded && (
              <div className="animate-in slide-in-from-top-2 duration-200">
                <PersonalBrandSection userId={user.id || ""} />
              </div>
            )}
          </div>

          <div className={`${glassCard} space-y-4 p-5 sm:p-6`}>
            <div className="flex items-center justify-between gap-4">
              <h3 className="display-header text-xl font-light text-[color:var(--color-porcelain)]">Best Work</h3>
              <button
                onClick={() => setShowBestWorkSelector(true)}
                className="rounded-[6px] border border-[color:var(--app-glass-border)] px-3 py-2 text-[10px] font-medium uppercase tracking-[0.35em] text-[color:var(--app-text-secondary)] transition-colors hover:bg-[color:var(--app-btn-secondary-bg)]"
                disabled={isSavingBestWork}
              >
                Select
              </button>
            </div>

            {isSavingBestWork && (
              <div className="flex items-center justify-center gap-2 py-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                <p className="text-xs text-[color:var(--color-smoke)]">Saving...</p>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              {bestWork.length > 0
                ? bestWork.map((image, index) => (
                    <div
                      key={image.image_id}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      className={`group relative aspect-square cursor-move overflow-hidden rounded-[4px] border border-[color:var(--app-glass-border)] transition-all duration-200 hover:border-[color:var(--app-border)] ${
                        draggedIndex === index ? "scale-95 opacity-60" : ""
                      }`}
                    >
                      <Image
                        src={image.image_url || "/placeholder.svg"}
                        alt={image.category || "Generated image"}
                        fill
                        className="pointer-events-none object-cover object-top"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-all group-hover:bg-black/30">
                        <div className="rounded-md bg-black/70 px-2 py-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <p className="text-[10px] text-[color:var(--color-whisper)]">#{index + 1}</p>
                        </div>
                      </div>
                    </div>
                  ))
                : Array.from({ length: 9 }).map((_, i) => (
                    <button
                      key={`empty-${i}`}
                      onClick={() => setShowBestWorkSelector(true)}
                      className="group flex aspect-square items-center justify-center rounded-[4px] border border-[color:var(--app-glass-border)] bg-[color:var(--app-btn-secondary-bg)] transition-colors hover:bg-[color:var(--app-btn-secondary-hover)]"
                    >
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-smoke)] transition-colors group-hover:text-[color:var(--color-whisper)]">
                          Add
                        </span>
                        <span className="text-[10px] font-light text-[color:var(--color-smoke)] transition-colors group-hover:text-[color:var(--color-whisper)]">
                          {i + 1}
                        </span>
                      </div>
                    </button>
                  ))}
            </div>

            {bestWork.length === 0 && (
              <p className="text-center text-xs text-[color:var(--color-smoke)]">
                Select up to 9 images from your gallery for your profile showcase.
              </p>
            )}
          </div>

          <div className={`${glassCard} p-4 sm:p-5`}>
            <p className={`${sectionLabel} mb-4`}>Referral</p>
            <ReferralDashboard />
          </div>

          <div className={`${glassCard} p-5 sm:p-6`}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="display-header text-xl font-light text-[color:var(--color-porcelain)]">Maya Assets</h3>
              <span className="text-[10px] uppercase tracking-[0.35em] text-[color:var(--color-smoke)]">
                {personalPages.length} total
              </span>
            </div>

            {personalPages.length > 0 ? (
              <div className="space-y-2">
                {personalPages.slice(0, 8).map((page) => (
                  <a
                    key={page.id}
                    href={page.liveUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={`${glassRow} block`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm text-[color:var(--color-whisper)]">{page.title}</p>
                        <p className="mt-1 text-[10px] uppercase tracking-[0.28em] text-[color:var(--color-smoke)]">
                          {page.pageType} · v{page.version}
                        </p>
                      </div>
                      <p className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--color-smoke)]">Open</p>
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[color:var(--color-smoke)]">
                Your Maya assets will appear here after you create a content calendar in chat.
              </p>
            )}
          </div>
        </div>
      )}

      {activeSection === "settings" && (
        <div className={`${sectionWrap} space-y-4 sm:space-y-5`}>
          <div className={`${glassCard} space-y-2 p-5 sm:p-6`}>
            <p className="text-[11px] uppercase tracking-[0.3em] text-[color:var(--color-whisper)]">
              Account settings
            </p>
            <h2 className="display-header text-2xl font-light text-[color:var(--color-porcelain)] sm:text-3xl">
              Billing, preferences, and model controls
            </h2>
          </div>

          {isPastDue && (
            <div className="rounded-[20px] border border-amber-300/35 bg-amber-500/10 p-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.35em] text-amber-100">Payment issue</p>
              <p className="mt-2 text-sm text-amber-50">
                Your subscription is marked as past due. Please update billing details to avoid losing access.
              </p>
            </div>
          )}

          {userInfo && (
            <div className={`${glassCard} space-y-4 p-5 sm:p-6`}>
              <p className={sectionLabel}>Account</p>
              <div className={glassRow}>
                <p className="text-[11px] uppercase tracking-[0.35em] text-[color:var(--color-smoke)]">Email</p>
                <p className="text-sm text-[color:var(--color-whisper)]">{userInfo.email}</p>
              </div>
              <div className={glassRow}>
                <p className="text-[11px] uppercase tracking-[0.35em] text-[color:var(--color-smoke)]">Membership</p>
                <p className="text-sm uppercase text-[color:var(--color-whisper)]">
                  {userInfo.product_type === "sselfie_studio_membership"
                    ? "Studio Member"
                    : userInfo.product_type === "one_time_session"
                      ? "One-Time Session"
                      : "Free"}
                </p>
              </div>
              <div className={glassRow}>
                <p className="text-[11px] uppercase tracking-[0.35em] text-[color:var(--color-smoke)]">Member Since</p>
                <p className="text-sm text-[color:var(--color-whisper)]">{formatDate(userInfo.memberSince)}</p>
              </div>
            </div>
          )}

          {userInfo?.product_type === "sselfie_studio_membership" && (
            <div className={`${glassCard} space-y-4 p-5 sm:p-6`}>
              <p className={sectionLabel}>Subscription</p>
              {subscriptionInfo?.current_period_end && (
                <div className={glassRow}>
                  <p className="text-[11px] uppercase tracking-[0.35em] text-[color:var(--color-smoke)]">Next Billing Date</p>
                  <p className="text-sm text-[color:var(--color-whisper)]">
                    {formatRenewalDate(subscriptionInfo.current_period_end)}
                  </p>
                </div>
              )}
              <button onClick={handleManageSubscription} disabled={isLoadingPortal} className={actionButton}>
                {isLoadingPortal ? "Opening..." : "Manage Subscription"}
              </button>
              <p className="text-xs text-[color:var(--color-smoke)]">
                Update payment method, review invoices, or cancel your membership in Stripe.
              </p>
            </div>
          )}

          {userInfo && upgradeTargetTier && (
            <div className={`${glassCard} space-y-4 p-5 sm:p-6`}>
              <p className={sectionLabel}>Upgrade</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
                <InfoPill label="Upgrade to" value="Creator Studio" />
                <InfoPill label="Credits" value="200 credits / month" />
              </div>

              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  trackCTAClick("account_screen_upgrade", "Upgrade now", "/checkout")
                  setShowUpgradeModal(true)
                }}
                className="w-full rounded-2xl border border-white/30 bg-white/10 px-4 py-4 text-center font-serif text-2xl font-extralight uppercase tracking-[0.2em] text-[color:var(--color-porcelain)] transition-colors hover:bg-white/16"
              >
                Upgrade To Studio
              </button>

              <p className="text-xs text-[color:var(--color-smoke)]">
                Proration is automatic. You can change plans anytime in Stripe.
              </p>
            </div>
          )}

          {(hasActiveSubscription || userInfo?.stripe_customer_id) && !isStudioMembership && (
            <div className={`${glassCard} space-y-4 p-5 sm:p-6`}>
              <p className={sectionLabel}>Billing</p>
              {subscriptionInfo?.current_period_end && (
                <div className={glassRow}>
                  <p className="text-[11px] uppercase tracking-[0.35em] text-[color:var(--color-smoke)]">Session Expires</p>
                  <p className="text-sm text-[color:var(--color-whisper)]">
                    {formatRenewalDate(subscriptionInfo.current_period_end)}
                  </p>
                </div>
              )}
              {userInfo?.stripe_customer_id && (
                <button onClick={handleManageSubscription} disabled={isLoadingPortal} className={actionButton}>
                  {isLoadingPortal ? "Opening..." : "View Invoices"}
                </button>
              )}
            </div>
          )}

          <div className={`${glassCard} space-y-2 p-5 sm:p-6`}>
            <p className={sectionLabel}>Notifications</p>
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

          <div className={`${glassCard} space-y-2 p-5 sm:p-6`}>
            <p className={sectionLabel}>Generation Preferences</p>
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

          <div className={`${glassCard} space-y-2 p-5 sm:p-6`}>
            <p className={sectionLabel}>Privacy & Data</p>
            <ToggleItem
              label="Use my data for training"
              description="Allow your photos to improve Maya"
              value={dataForTraining}
              onChange={(value) => {
                setDataForTraining(value)
                updateSetting("dataForTraining", value)
              }}
            />
          </div>

          <div className={`${glassCard} space-y-4 p-5 sm:p-6`}>
            <p className={sectionLabel}>Brand Assets</p>
            <BrandAssetsManager />
          </div>

          <div className={`${glassCard} space-y-4 p-5 sm:p-6`}>
            <MayaIdentityNotes />
          </div>

          <div className={`${glassCard} space-y-4 p-5 sm:p-6`}>
            <p className={sectionLabel}>Admin</p>
            <button onClick={handleAdminAccess} className={actionButton}>
              Admin Dashboard
            </button>
            <p className="text-xs text-[color:var(--color-smoke)]">Access admin tools and content management.</p>
          </div>

          <div className={`${glassCard} space-y-4 p-5 sm:p-6`}>
            <p className={sectionLabel}>Model Training</p>
            <p className="text-sm leading-relaxed text-[color:var(--color-whisper)]">
              Retrain with new selfies to improve future generation quality.
            </p>
            <button
              onClick={() => setShowRetrainModal(true)}
              className="w-full rounded-2xl border border-white/25 bg-white/8 px-4 py-4 text-[11px] font-medium uppercase tracking-[0.35em] text-[color:var(--color-porcelain)] transition-colors hover:bg-white/14"
            >
              Retrain Model
            </button>
          </div>

          <div className={`${glassCard} space-y-6 p-5 sm:p-6`}>
            <p className={sectionLabel}>Model Information</p>

            <div>
              <label className="mb-3 block text-[11px] uppercase tracking-[0.35em] text-[color:var(--color-smoke)]">
                Gender
              </label>
              <div className="grid grid-cols-3 gap-2">
                {["woman", "man", "non-binary"].map((option) => (
                  <button
                    key={option}
                    onClick={() => setGender(option)}
                    className={`rounded-xl border px-3 py-2 text-xs uppercase tracking-[0.2em] transition-colors ${
                      gender === option
                        ? "border-white/40 bg-white/14 text-[color:var(--color-porcelain)]"
                        : "border-white/12 bg-white/6 text-[color:var(--color-whisper)] hover:bg-white/10"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-3 block text-[11px] uppercase tracking-[0.35em] text-[color:var(--color-smoke)]">
                Ethnicity (Optional)
              </label>
              <select
                value={ethnicity}
                onChange={(e) => setEthnicity(e.target.value)}
                className="w-full rounded-xl border border-white/12 bg-white/6 px-4 py-3 text-sm text-[color:var(--color-whisper)] outline-none transition-colors focus:border-white/30"
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
              <label className="mb-3 block text-[11px] uppercase tracking-[0.35em] text-[color:var(--color-smoke)]">
                Physical Preferences (Optional)
              </label>
              <textarea
                value={physicalPreferences}
                onChange={(e) => setPhysicalPreferences(e.target.value)}
                placeholder="e.g., curvier body type, fuller bust, lighter blonde hair, athletic build"
                rows={3}
                className="w-full resize-none rounded-xl border border-white/12 bg-white/6 px-4 py-3 text-sm text-[color:var(--color-whisper)] outline-none transition-colors focus:border-white/30"
              />
              <p className="mt-2 text-xs text-[color:var(--color-smoke)]">
                These preferences help Maya keep generated images aligned to your profile.
              </p>
            </div>

            <button
              onClick={handleUpdateDemographics}
              disabled={isUpdatingDemographics || !gender}
              className={actionButton}
            >
              {isUpdatingDemographics ? "Updating..." : "Update Model Information"}
            </button>
          </div>

          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full rounded-2xl border border-white/20 bg-white/5 px-4 py-4 text-[11px] font-medium uppercase tracking-[0.35em] text-[color:var(--color-whisper)] transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoggingOut ? "Signing Out..." : "Sign Out"}
          </button>

          {/* Danger Zone */}
          <div className={`${glassCard} space-y-4 p-5 sm:p-6 border border-red-500/20`}>
            <p className={sectionLabel}>Danger Zone</p>
            <p className="text-sm leading-relaxed text-[color:var(--color-whisper)]">
              Permanently delete your account, all images, and cancel any active subscription. This cannot be undone.
            </p>
            <button
              onClick={() => setDeleteDialogOpen(true)}
              className="w-full rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-4 text-[11px] font-medium uppercase tracking-[0.35em] text-red-400 transition-colors hover:bg-red-500/20"
            >
              Delete Account
            </button>
          </div>
        </div>
      )}

      {/* Delete Account Confirmation Dialog */}
      {deleteDialogOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-[rgba(13,15,19,0.97)] p-6 shadow-2xl">
            <h3
              className="mb-2 text-xl font-light uppercase tracking-[0.15em] text-white"
              style={{ fontFamily: '"Cormorant Garamond", serif' }}
            >
              Delete Account
            </h3>
            <p className="mb-5 text-sm leading-relaxed text-white/65">
              This will permanently delete your account, all generated images, chat history, and brand data, and cancel any active subscription.{" "}
              <span className="text-white/90">This cannot be undone.</span>
            </p>
            <p className="mb-2 text-[11px] uppercase tracking-[0.25em] text-white/50">
              Type <span className="text-white font-medium">DELETE</span> to confirm
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE"
              autoComplete="off"
              className="mb-4 w-full rounded-xl border border-white/12 bg-white/6 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-white/30 placeholder:text-white/25"
            />
            {deleteError && (
              <p className="mb-3 text-sm text-red-400">{deleteError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setDeleteDialogOpen(false)
                  setDeleteConfirmText("")
                  setDeleteError(null)
                }}
                disabled={isDeletingAccount}
                className="flex-1 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-[11px] font-medium uppercase tracking-[0.25em] text-white/70 transition-colors hover:bg-white/10 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== "DELETE" || isDeletingAccount}
                className="flex-1 rounded-xl border border-red-500/40 bg-red-500/15 px-4 py-3 text-[11px] font-medium uppercase tracking-[0.25em] text-red-400 transition-colors hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isDeletingAccount ? "Deleting..." : "Delete Forever"}
              </button>
            </div>
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
      className="group -mx-3 flex min-h-[70px] cursor-pointer items-center justify-between rounded-xl border border-white/6 bg-white/4 px-3 py-3 transition-all duration-300 hover:border-white/16 hover:bg-white/8 sm:px-4"
    >
      <div className="min-w-0 flex-1 pr-4">
        <p className="text-sm font-medium text-[color:var(--color-whisper)]">{label}</p>
        <p className="mt-1 text-[11px] text-[color:var(--color-smoke)]">{description}</p>
      </div>
      <div
        className={`relative h-7 w-12 shrink-0 cursor-pointer rounded-full border transition-all duration-300 ${
          value ? "border-white/25 bg-white/18" : "border-white/12 bg-white/6"
        }`}
      >
        <div
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-[color:var(--color-porcelain)] transition-all duration-300 ${
            value ? "translate-x-6" : "translate-x-0.5"
          }`}
        />
      </div>
    </div>
  )
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1 rounded-xl border border-white/10 bg-white/6 px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-smoke)]">{label}</p>
      <p className="text-sm font-medium text-[color:var(--color-whisper)]">{value}</p>
    </div>
  )
}
