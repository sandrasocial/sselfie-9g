"use client"

import { useState, useEffect } from "react"
import { Camera, Settings, Aperture, TrendingUp, ImageIcon } from "lucide-react"
import SettingsScreen from "./settings-screen"
import EditProfileDialog from "./edit-profile-dialog"
import PersonalBrandSection from "./personal-brand-section"
import BrandAssetsManager from "./brand-assets-manager"
import { ProfileImageSelector } from "@/components/profile-image-selector"
import type { User } from "./types"
import Image from "next/image"
import UnifiedLoading from "./unified-loading"

interface ProfileScreenProps {
  user: User
}

interface ProfileStats {
  totalGenerations: number
  monthlyGenerations: number
  favorites: number
  trainingModel: {
    trigger_word: string
    training_status: string
    model_type: string
  } | null
  usage: {
    monthly_generations_used: number
    monthly_generations_allowed: number
    plan: string
  }
}

interface ProfileInfo {
  name: string
  avatar: string | null
  bio: string | null
  instagram: string | null
  location: string | null
  plan: string
  memberSince: string
}

interface RecentImage {
  id: number
  selected_url: string
  category: string
  created_at: string
}

export default function ProfileScreen({ user }: ProfileScreenProps) {
  const [activeSection, setActiveSection] = useState("profile")
  const [stats, setStats] = useState<ProfileStats | null>(null)
  const [profileInfo, setProfileInfo] = useState<ProfileInfo | null>(null)
  const [recentWork, setRecentWork] = useState<RecentImage[]>([])
  const [loading, setLoading] = useState(true)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [showProfileSelector, setShowProfileSelector] = useState(false)
  const [allImages, setAllImages] = useState<RecentImage[]>([])

  useEffect(() => {
    async function fetchProfileData() {
      console.log("[v0] Fetching profile data...")
      try {
        const [statsRes, infoRes, workRes, imagesRes] = await Promise.all([
          fetch("/api/profile/stats", { credentials: "include" }),
          fetch("/api/profile/info", { credentials: "include" }),
          fetch("/api/profile/recent-work", { credentials: "include" }),
          fetch("/api/images", { credentials: "include" }),
        ])

        console.log("[v0] Profile stats response:", statsRes.status, statsRes.ok)
        if (statsRes.ok) {
          const statsData = await statsRes.json()
          console.log("[v0] Profile stats:", statsData)
          setStats(statsData)
        } else {
          const error = await statsRes.text()
          console.error("[v0] Profile stats error:", error)
        }

        console.log("[v0] Profile info response:", infoRes.status, infoRes.ok)
        if (infoRes.ok) {
          const infoData = await infoRes.json()
          console.log("[v0] Profile info:", infoData)
          setProfileInfo(infoData)
        } else {
          const error = await infoRes.text()
          console.error("[v0] Profile info error:", error)
        }

        console.log("[v0] Recent work response:", workRes.status, workRes.ok)
        if (workRes.ok) {
          const workData = await workRes.json()
          console.log("[v0] Recent work:", workData)
          setRecentWork(workData.images)
        } else {
          const error = await workRes.text()
          console.error("[v0] Recent work error:", error)
        }

        console.log("[v0] Images response:", imagesRes.status, imagesRes.ok)
        if (imagesRes.ok) {
          const imagesData = await imagesRes.json()
          console.log("[v0] Images data:", imagesData.images?.length || 0, "images")
          setAllImages(imagesData.images || [])
        } else {
          const error = await imagesRes.text()
          console.error("[v0] Images error:", error)
        }
      } catch (error) {
        console.error("[v0] Error fetching profile data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchProfileData()
  }, [])

  const refreshProfileData = async () => {
    try {
      const [statsRes, infoRes, workRes] = await Promise.all([
        fetch("/api/profile/stats", { credentials: "include" }),
        fetch("/api/profile/info", { credentials: "include" }),
        fetch("/api/profile/recent-work", { credentials: "include" }),
      ])

      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData)
      }

      if (infoRes.ok) {
        const infoData = await infoRes.json()
        setProfileInfo(infoData)
      }

      if (workRes.ok) {
        const workData = await workRes.json()
        setRecentWork(workData.images)
      }
    } catch (error) {
      console.error("[v0] Error refreshing profile data:", error)
    }
  }

  const handleProfileImageUpdate = async (imageUrl: string) => {
    await refreshProfileData()
    setShowProfileSelector(false)
  }

  if (activeSection === "settings") {
    return <SettingsScreen onBack={() => setActiveSection("profile")} />
  }

  const displayName = profileInfo?.name || user.email?.split("@")[0] || "User"
  const displayAvatar = profileInfo?.avatar || user.avatar || "/placeholder.svg"
  const displayPlan = profileInfo?.plan || user.membershipTier || "free"

  if (loading) {
    return <UnifiedLoading message="Loading your profile..." />
  }

  return (
    <div className="space-y-8 pb-24">
      <div className="text-center space-y-8 pt-4">
        <button onClick={() => setShowProfileSelector(true)} className="relative inline-block group">
          <img
            src={displayAvatar || "/placeholder.svg"}
            alt={displayName}
            className="w-32 h-32 sm:w-40 sm:h-40 rounded-full object-cover object-top border-2 border-stone-200/60 shadow-sm"
          />
          <div className="absolute inset-0 bg-stone-950/0 group-hover:bg-stone-950/40 rounded-full transition-all flex items-center justify-center">
            <ImageIcon size={24} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-9 h-9 bg-stone-50 rounded-full border-2 border-stone-100 flex items-center justify-center shadow-sm">
            <div className="w-4 h-4 bg-stone-900 rounded-full"></div>
          </div>
        </button>

        <div className="space-y-4">
          <h2 className="text-3xl sm:text-5xl font-serif font-extralight tracking-[0.25em] text-stone-950 uppercase">
            {displayName}
          </h2>
          <p className="text-xs tracking-[0.3em] uppercase font-light bg-stone-500/10 px-4 py-2 rounded-full inline-block text-stone-600">
            {displayPlan} Member
          </p>
        </div>

        <div className="grid grid-cols-3 gap-8 pt-4">
          {[
            { value: stats?.totalGenerations || 0, label: "Photos" },
            { value: stats?.favorites || 0, label: "Favorites" },
            { value: stats?.monthlyGenerations || 0, label: "This Month" },
          ].map((stat, index) => (
            <div key={index} className="text-center space-y-3">
              <div className="text-3xl sm:text-4xl font-serif font-extralight text-stone-950">{stat.value}</div>
              <div className="text-xs tracking-[0.15em] uppercase font-light text-stone-500">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {stats?.trainingModel && (
        <div className="bg-gradient-to-br from-stone-50 to-stone-100/50 rounded-2xl p-6 border border-stone-200/60 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-stone-700 to-stone-800 rounded-xl flex items-center justify-center">
              <Aperture size={18} className="text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold tracking-wide text-stone-950">Your AI Model</h3>
              <p className="text-xs text-stone-600">
                Status:{" "}
                <span className="capitalize">
                  {stats.trainingModel.training_status === "completed" ? "Ready" : stats.trainingModel.training_status}
                </span>
              </p>
            </div>
          </div>
        </div>
      )}

      {stats?.usage && (
        <div className="bg-gradient-to-br from-stone-50 to-stone-100/50 rounded-2xl p-6 border border-stone-200/60 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-stone-600 to-stone-700 rounded-xl flex items-center justify-center">
              <TrendingUp size={18} className="text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold tracking-wide text-stone-950">Monthly Usage</h3>
              <p className="text-xs text-stone-600">
                {stats.usage.monthly_generations_used} / {stats.usage.monthly_generations_allowed} generations
              </p>
            </div>
          </div>
          <div className="bg-white/60 rounded-xl p-4 border border-stone-200/40">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs tracking-wider uppercase text-stone-500">Progress</span>
              <span className="text-xs font-semibold text-stone-950">
                {Math.round((stats.usage.monthly_generations_used / stats.usage.monthly_generations_allowed) * 100)}%
              </span>
            </div>
            <div className="w-full bg-stone-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-stone-700 to-stone-900 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min((stats.usage.monthly_generations_used / stats.usage.monthly_generations_allowed) * 100, 100)}%`,
                }}
              />
            </div>
          </div>
        </div>
      )}

      <PersonalBrandSection userId={user.id} />

      <BrandAssetsManager />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={() => setEditDialogOpen(true)}
          className="group relative bg-stone-950 text-white px-6 py-5 rounded-[1.5rem] font-semibold tracking-wide text-sm transition-all duration-300 hover:shadow-2xl hover:shadow-stone-900/40 hover:scale-105 active:scale-95 min-h-[60px] overflow-hidden"
        >
          <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <span className="relative z-10">Edit Profile</span>
        </button>
        <button
          onClick={() => setActiveSection("settings")}
          className="bg-white/50 backdrop-blur-2xl text-stone-950 px-6 py-5 rounded-[1.5rem] font-semibold text-sm border border-white/60 transition-all duration-300 hover:bg-white/70 hover:border-white/80 hover:scale-105 active:scale-95 flex items-center justify-center gap-3 min-h-[60px] shadow-lg shadow-stone-900/10"
        >
          <div className="w-9 h-9 bg-gradient-to-br from-stone-600 to-stone-700 rounded-xl flex items-center justify-center shadow-lg">
            <Settings size={16} strokeWidth={2.5} className="text-white" />
          </div>
          Settings
        </button>
      </div>

      <div className="space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-base sm:text-xl md:text-2xl font-serif font-extralight tracking-[0.15em] text-stone-950 uppercase">
            Recent Work
          </h3>
          <button className="text-xs sm:text-sm tracking-[0.15em] uppercase font-light transition-colors duration-200 text-stone-600 hover:text-stone-800">
            View All
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4">
          {recentWork.length > 0
            ? recentWork.map((image) => (
                <div
                  key={image.id}
                  className="aspect-square rounded-xl sm:rounded-2xl border border-stone-300/30 overflow-hidden cursor-pointer group transition-all duration-200 hover:scale-[1.02] hover:shadow-lg relative"
                >
                  <Image
                    src={image.selected_url || "/placeholder.svg"}
                    alt={image.category || "Generated image"}
                    fill
                    className="object-cover object-top"
                  />
                </div>
              ))
            : [1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="aspect-square bg-stone-200/30 rounded-xl sm:rounded-2xl border border-stone-300/30 flex items-center justify-center cursor-pointer group transition-all duration-200 hover:scale-[1.02] hover:bg-stone-200/50"
                >
                  <Camera
                    size={20}
                    strokeWidth={1.5}
                    className="text-stone-500 group-hover:text-stone-700 transition-colors"
                  />
                </div>
              ))}
        </div>
      </div>

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
            image_url: img.selected_url,
            prompt: img.category || "",
            is_favorite: false,
          }))}
          currentAvatar={displayAvatar}
          onSelect={handleProfileImageUpdate}
          onClose={() => setShowProfileSelector(false)}
        />
      )}
    </div>
  )
}
