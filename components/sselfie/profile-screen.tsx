"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Camera, Edit2, ImageIcon, Plus, Aperture, X, Home, MessageCircle, ImageIcon as ImageIconLucide, Grid, UserIcon, SettingsIcon, LogOut, Film } from 'lucide-react'
import { useRouter } from 'next/navigation'
import EditProfileDialog from "./edit-profile-dialog"
import { ProfileImageSelector } from "@/components/profile-image-selector"
import { BestWorkSelector } from "./best-work-selector"
import PersonalBrandSection from "./personal-brand-section"
import type { User } from "./types"
import Image from "next/image"
import UnifiedLoading from "./unified-loading"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

interface ProfileScreenProps {
  user: User
  creditBalance: number
}

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
  id: string // Changed from number to string to match GalleryImage
  image_id: string // Added - This is the actual image ID (ai_123, gen_456)
  image_url: string
  category?: string
  created_at: string
  is_favorite?: boolean
}

export default function ProfileScreen({ user, creditBalance }: ProfileScreenProps) {
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
  const [showNavMenu, setShowNavMenu] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const router = useRouter()

  useEffect(() => {
    async function fetchProfileData() {
      try {
        const [statsRes, infoRes, imagesRes, bestWorkRes] = await Promise.all([
          fetch("/api/profile/stats", { credentials: "include" }),
          fetch("/api/profile/info", { credentials: "include" }),
          fetch("/api/images?limit=100", { credentials: "include" }),
          fetch("/api/profile/best-work", { credentials: "include" }),
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
      console.error("[v0] Error refreshing profile data:", error)
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
      console.error("[v0] Error refreshing best work:", error)
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
          console.error("[v0] Failed to save best work order")
        }
      } catch (error) {
        console.error("[v0] Error saving best work order:", error)
      } finally {
        setIsSavingBestWork(false)
      }
    }
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

  const handleNavigation = (tab: string) => {
    window.location.hash = tab
    setShowNavMenu(false)
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
        console.error("[v0] Logout failed")
        setIsLoggingOut(false)
      }
    } catch (error) {
      console.error("[v0] Error during logout:", error)
      setIsLoggingOut(false)
    }
  }

  if (loading) {
    return <UnifiedLoading message="Loading your profile..." />
  }

  return (
    <div className="space-y-8 pb-24">
      <div className="flex items-center justify-between pt-4">
        <h2 className="text-2xl sm:text-4xl font-serif font-extralight tracking-[0.3em] text-stone-950 uppercase">
          Profile
        </h2>
        <button
          onClick={() => setShowNavMenu(!showNavMenu)}
          className="flex items-center justify-center px-3 h-9 sm:h-10 rounded-lg hover:bg-stone-100/50 transition-colors touch-manipulation active:scale-95"
          aria-label="Navigation menu"
          aria-expanded={showNavMenu}
        >
          <span className="text-xs sm:text-sm font-serif tracking-[0.2em] text-stone-950 uppercase">MENU</span>
        </button>
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
                onClick={() => handleNavigation("b-roll")}
                className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-stone-50 transition-colors touch-manipulation"
              >
                <Film size={18} className="text-stone-600" strokeWidth={2} />
                <span className="text-sm font-medium text-stone-700">B-roll</span>
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
                className="w-full flex items-center gap-3 px-6 py-4 text-left bg-stone-100/50 border-l-2 border-stone-950"
              >
                <UserIcon size={18} className="text-stone-950" strokeWidth={2} />
                <span className="text-sm font-medium text-stone-950">Profile</span>
              </button>
              <button
                onClick={() => handleNavigation("settings")}
                className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-stone-50 transition-colors touch-manipulation"
              >
                <SettingsIcon size={18} className="text-stone-600" strokeWidth={2} />
                <span className="text-sm font-medium text-stone-700">Settings</span>
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
        className="w-full group relative bg-stone-950 text-white px-6 py-5 rounded-[1.5rem] font-semibold tracking-wide text-sm transition-all duration-300 hover:shadow-2xl hover:shadow-stone-900/40 hover:scale-105 active:scale-95 overflow-hidden"
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
          className="w-full flex items-center justify-between p-4 bg-white/50 backdrop-blur-2xl rounded-xl border border-white/60 shadow-xl shadow-stone-900/10 hover:bg-white/60 transition-all"
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
                  key={image.image_id} // Use image_id as key for stability
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
            image_url: img.image_url, // Changed from selected_url to image_url
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
          currentBestWork={bestWork.map((img) => img.image_id)} // Fix: Pass image_id instead of id for proper selection matching
          onClose={() => setShowBestWorkSelector(false)}
          onSave={handleBestWorkImageSelect}
        />
      )}
    </div>
  )
}
