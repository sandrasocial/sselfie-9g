"use client"

import { useState, useEffect } from "react"
import { Camera, User, Aperture, Grid, MessageCircle, ImageIcon, Infinity } from "lucide-react"
import LoadingScreen from "./loading-screen"
import StudioScreen from "./studio-screen"
import TrainingScreen from "./training-screen"
import MayaChatScreen from "./maya-chat-screen"
import GalleryScreen from "./gallery-screen"
import AcademyScreen from "./academy-screen"
import ProfileScreen from "./profile-screen"
import type { User as UserType } from "./types"

interface SselfieAppProps {
  userId: string
  userName: string | null
  userEmail: string | null
}

export default function SselfieApp({ userId, userName, userEmail }: SselfieAppProps) {
  const [activeTab, setActiveTab] = useState("studio")
  const [isLoading, setIsLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [hasTrainedModel, setHasTrainedModel] = useState(false)
  const [isLoadingTrainingStatus, setIsLoadingTrainingStatus] = useState(true)
  const [generationsRemaining, setGenerationsRemaining] = useState<number | null>(null)
  const [isUnlimited, setIsUnlimited] = useState(false)
  const [isLoadingQuota, setIsLoadingQuota] = useState(true)

  useEffect(() => {
    const fetchQuota = async () => {
      try {
        const response = await fetch("/api/quota/status")
        const data = await response.json()
        console.log("[v0] Quota status:", data)

        if (data.isUnlimited) {
          setIsUnlimited(true)
          setGenerationsRemaining(null)
        } else {
          setIsUnlimited(false)
          setGenerationsRemaining(data.remaining || 0)
        }
      } catch (error) {
        console.error("[v0] Error fetching quota:", error)
        setGenerationsRemaining(0)
      } finally {
        setIsLoadingQuota(false)
      }
    }

    fetchQuota()
  }, [])

  const decrementQuota = () => {
    if (!isUnlimited && generationsRemaining !== null && generationsRemaining > 0) {
      setGenerationsRemaining((prev) => (prev !== null ? prev - 1 : 0))
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

  const tabs = [
    { id: "studio", label: "Studio", icon: Camera },
    { id: "training", label: "Training", icon: Aperture },
    { id: "maya", label: "Maya", icon: MessageCircle },
    { id: "gallery", label: "Gallery", icon: ImageIcon },
    { id: "academy", label: "Academy", icon: Grid },
    { id: "profile", label: "Profile", icon: User },
  ]

  const user: UserType = {
    name: userName || "User",
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userEmail}`,
    membershipTier: "Premium",
    followers: "3.2k",
    following: "428",
    posts: "127",
  }

  if (isLoading || isLoadingTrainingStatus || isLoadingQuota) {
    return <LoadingScreen />
  }

  return (
    <div
      className="h-screen bg-gradient-to-br from-stone-50 via-stone-100/50 to-stone-50 relative overflow-hidden"
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      }}
    >
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-stone-200/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-stone-300/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative h-full mx-1 sm:mx-2 md:mx-3 pt-1 sm:pt-2 pb-24 sm:pb-26 md:pb-28">
        <div className="h-full bg-white/30 backdrop-blur-3xl rounded-[2rem] sm:rounded-[2.5rem] md:rounded-[3rem] border border-white/40 overflow-hidden shadow-2xl shadow-stone-900/10">
          <div className="flex justify-between items-center px-4 sm:px-6 md:px-8 py-4 sm:py-5 md:py-6 bg-gradient-to-b from-white/40 to-transparent backdrop-blur-xl border-b border-white/20">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 bg-black/80 backdrop-blur-xl rounded-full">
                <div className="text-white font-medium tracking-wide text-xs sm:text-sm">
                  {currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-3">
              {isUnlimited ? (
                <div className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 backdrop-blur-xl rounded-full border border-amber-400/40">
                  <Infinity size={14} className="text-amber-600" strokeWidth={2.5} />
                  <span className="text-xs sm:text-sm font-semibold text-amber-700 tracking-wide">Unlimited</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-white/60 backdrop-blur-xl rounded-full border border-white/40">
                  <Camera size={14} className="text-stone-700" strokeWidth={2.5} />
                  <span className="text-xs sm:text-sm font-bold text-stone-900 tracking-wide tabular-nums">
                    {generationsRemaining}
                  </span>
                  <span className="text-[10px] sm:text-xs font-medium text-stone-500">left</span>
                </div>
              )}
            </div>
          </div>

          <div className="h-[calc(100%-80px)] sm:h-[calc(100%-88px)] md:h-[calc(100%-96px)] px-4 sm:px-6 md:px-8 pb-4 sm:pb-6 md:pb-8 pt-0 overflow-y-auto">
            {activeTab === "studio" && (
              <StudioScreen
                user={user}
                hasTrainedModel={hasTrainedModel}
                setActiveTab={setActiveTab}
                onImageGenerated={decrementQuota}
              />
            )}
            {activeTab === "training" && (
              <TrainingScreen
                user={user}
                userId={userId}
                setHasTrainedModel={setHasTrainedModel}
                setActiveTab={setActiveTab}
              />
            )}
            {activeTab === "maya" && <MayaChatScreen onImageGenerated={decrementQuota} />}
            {activeTab === "gallery" && <GalleryScreen user={user} userId={userId} />}
            {activeTab === "academy" && <AcademyScreen />}
            {activeTab === "profile" && <ProfileScreen user={user} />}
          </div>
        </div>
      </div>

      <div className="absolute bottom-3 sm:bottom-4 md:bottom-5 left-2 sm:left-3 md:left-4 right-2 sm:right-3 md:right-4">
        <div className="bg-white/20 backdrop-blur-3xl rounded-[1.75rem] sm:rounded-[2rem] md:rounded-[2.5rem] border border-white/40 px-1.5 sm:px-2 md:px-3 py-2.5 sm:py-3 md:py-4 shadow-2xl shadow-stone-900/20">
          <div className="flex justify-around items-center">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-col items-center space-y-1 px-1.5 sm:px-2.5 md:px-4 py-2 sm:py-2.5 md:py-3 rounded-[1rem] sm:rounded-[1.25rem] md:rounded-[1.5rem] transition-all duration-500 ease-out min-w-[52px] sm:min-w-[58px] md:min-w-[68px] relative ${
                    isActive ? "transform scale-105" : "hover:scale-[1.02] active:scale-95"
                  }`}
                >
                  {isActive && (
                    <div className="absolute inset-0 bg-gradient-to-b from-white/90 to-white/70 backdrop-blur-2xl rounded-[1rem] sm:rounded-[1.25rem] md:rounded-[1.5rem] shadow-xl shadow-stone-900/20 border border-white/60"></div>
                  )}
                  <div
                    className={`relative z-10 w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-[0.875rem] sm:rounded-[1rem] md:rounded-[1.125rem] flex items-center justify-center transition-all duration-500 ${
                      isActive ? "bg-stone-950 shadow-lg shadow-stone-900/30" : "bg-white/40 backdrop-blur-xl"
                    }`}
                  >
                    <Icon
                      size={isActive ? 19 : 17}
                      strokeWidth={2}
                      className={`transition-all duration-500 ${isActive ? "text-white" : "text-stone-600"}`}
                    />
                  </div>
                  <span
                    className={`relative z-10 text-[8px] sm:text-[9px] md:text-[10px] font-semibold tracking-wide transition-all duration-500 ${
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
    </div>
  )
}
