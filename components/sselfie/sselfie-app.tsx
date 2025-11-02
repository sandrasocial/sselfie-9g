"use client"

import { useState, useEffect } from "react"
import { Camera, User, Aperture, Grid, MessageCircle, ImageIcon, LayoutGrid, Coins } from "lucide-react"
import LoadingScreen from "./loading-screen"
import StudioScreen from "./studio-screen"
import TrainingScreen from "./training-screen"
import MayaChatScreen from "./maya-chat-screen"
import GalleryScreen from "./gallery-screen"
import AcademyScreen from "./academy-screen"
import ProfileScreen from "./profile-screen"
import FeedDesignerScreen from "./feed-designer-screen"
import { InstallPrompt } from "./install-prompt"
import { InstallButton } from "./install-button"
import { ServiceWorkerProvider } from "./service-worker-provider"
import BuyCreditsModal from "./buy-credits-modal"
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
  const [creditBalance, setCreditBalance] = useState<number>(0)
  const [isLoadingCredits, setIsLoadingCredits] = useState(true)
  const [showBuyCreditsModal, setShowBuyCreditsModal] = useState(false)

  useEffect(() => {
    const fetchCredits = async () => {
      try {
        const response = await fetch("/api/user/credits")
        const data = await response.json()
        console.log("[v0] Credit balance:", data)
        setCreditBalance(data.balance || 0)
      } catch (error) {
        console.error("[v0] Error fetching credits:", error)
        setCreditBalance(0)
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

  const tabs = [
    { id: "studio", label: "Studio", icon: Camera },
    { id: "training", label: "Training", icon: Aperture },
    { id: "maya", label: "Maya", icon: MessageCircle },
    { id: "gallery", label: "Gallery", icon: ImageIcon },
    { id: "academy", label: "Academy", icon: Grid },
    { id: "profile", label: "Profile", icon: User },
    { id: "feed-designer", label: "Feed Designer", icon: LayoutGrid },
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

  if (isLoading || isLoadingTrainingStatus || isLoadingCredits) {
    return <LoadingScreen />
  }

  return (
    <div
      className="h-screen bg-gradient-to-br from-stone-50 via-stone-100/50 to-stone-50 relative overflow-hidden prevent-horizontal-scroll"
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      }}
    >
      <ServiceWorkerProvider />

      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-stone-200/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-stone-300/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative h-full mx-1 sm:mx-2 md:mx-3 pb-24 sm:pb-26 md:pb-28">
        <div className="h-full bg-white/30 backdrop-blur-3xl rounded-[2rem] sm:rounded-[2.5rem] md:rounded-[3rem] border border-white/40 overflow-hidden shadow-2xl shadow-stone-900/10">
          <div className="sticky top-0 z-10 bg-white/40 backdrop-blur-xl border-b border-stone-200/40 px-4 sm:px-6 md:px-8 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-stone-950 rounded-xl flex items-center justify-center">
                  <Coins size={16} className="text-stone-50" />
                </div>
                <div>
                  <div className="text-xs tracking-[0.15em] uppercase font-light text-stone-500">Credits</div>
                  <div className="text-lg font-serif font-extralight text-stone-950">{creditBalance.toFixed(1)}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <InstallButton />
                <button
                  onClick={() => setShowBuyCreditsModal(true)}
                  className="text-xs tracking-[0.15em] uppercase font-light text-stone-600 hover:text-stone-900 transition-colors"
                >
                  Buy More
                </button>
              </div>
            </div>
          </div>

          <div className="h-full px-4 sm:px-6 md:px-8 pb-32 sm:pb-36 md:pb-40 pt-4 sm:pt-6 md:pt-8 overflow-y-auto">
            {activeTab === "studio" && (
              <StudioScreen
                user={user}
                hasTrainedModel={hasTrainedModel}
                setActiveTab={setActiveTab}
                onImageGenerated={refreshCredits}
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
            {activeTab === "maya" && <MayaChatScreen onImageGenerated={refreshCredits} />}
            {activeTab === "gallery" && <GalleryScreen user={user} userId={userId} />}
            {activeTab === "academy" && <AcademyScreen />}
            {activeTab === "profile" && <ProfileScreen user={user} creditBalance={creditBalance} />}
            {activeTab === "feed-designer" && <FeedDesignerScreen />}
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 safe-area-bottom z-50 px-2 sm:px-3 md:px-4 pb-3 sm:pb-4 md:pb-5">
        <div className="bg-white/20 backdrop-blur-3xl rounded-[1.75rem] sm:rounded-[2rem] md:rounded-[2.5rem] border border-white/40 shadow-2xl shadow-stone-900/20">
          <div className="overflow-x-auto scrollbar-hide px-1.5 sm:px-2 md:px-3 py-2.5 sm:py-3 md:py-4">
            <div className="flex gap-1 sm:gap-2 min-w-max sm:justify-around">
              {tabs.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex flex-col items-center space-y-1 px-2 sm:px-2.5 md:px-4 py-2 sm:py-2.5 md:py-3 rounded-[1rem] sm:rounded-[1.25rem] md:rounded-[1.5rem] transition-all duration-500 ease-out min-w-[60px] sm:min-w-[68px] md:min-w-[76px] relative touch-manipulation ${
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
      </div>

      {/* InstallPrompt component */}
      <InstallPrompt />

      {/* Buy Credits Modal */}
      <BuyCreditsModal
        open={showBuyCreditsModal}
        onOpenChange={setShowBuyCreditsModal}
        onSuccess={handleCreditsPurchased}
      />
    </div>
  )
}
