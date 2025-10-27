"use client"

// @ts-nocheck
// Visual artifact reference only. Excluded from strict typing to avoid interfering with app compile.

import { useState, useEffect } from "react"
import { Camera, User, Aperture, Grid, MessageCircle, ImageIcon } from "lucide-react"
import StudioScreen from "./studio-screen"
import TrainingScreen from "./training-screen"
import MayaChatScreen from "./maya-chat-screen"
import GalleryScreen from "./gallery-screen"
import AcademyScreen from "./academy-screen"
import ProfileScreen from "./profile-screen"

const SselfieApp = () => {
  const [activeTab, setActiveTab] = useState("studio")
  const [isLoading, setIsLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [hasTrainedModel, setHasTrainedModel] = useState(false)

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

  const user = {
    name: "Sarah Chen",
    avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
    membershipTier: "Premium",
    followers: "3.2k",
    following: "428",
    posts: "127",
  }

  if (isLoading) {
    return (
      <div className="h-screen bg-white flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/3 w-64 sm:w-96 h-64 sm:h-96 bg-stone-100/40 rounded-full blur-3xl animate-pulse"></div>
          <div
            className="absolute bottom-1/4 right-1/3 w-64 sm:w-96 h-64 sm:h-96 bg-stone-200/30 rounded-full blur-3xl animate-pulse"
            style={{ animationDelay: "1s" }}
          ></div>
        </div>

        <div className="relative z-10 text-center px-6 sm:px-8">
          <div className="mb-12 sm:mb-16 relative w-32 h-32 sm:w-40 sm:h-40 mx-auto">
            {/* Outer spinning ring */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="w-32 h-32 sm:w-40 sm:h-40 rounded-full border-2 border-transparent border-t-stone-950 animate-spin"
                style={{ animationDuration: "2s" }}
              ></div>
            </div>

            {/* Inner spinning ring */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-2 border-transparent border-b-stone-400 animate-spin"
                style={{ animationDuration: "1.5s", animationDirection: "reverse" }}
              ></div>
            </div>

            {/* Logo in center */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-xl sm:rounded-2xl flex items-center justify-center shadow-2xl shadow-stone-900/20 p-2.5 sm:p-3">
                <img
                  src="https://i.postimg.cc/65NtYqMK/Black-transperent-logo.png"
                  alt="SSELFIE Logo"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 sm:space-y-6">
            <h1 className="text-stone-950 text-4xl sm:text-5xl md:text-6xl font-serif font-extralight tracking-[0.5em] leading-none mb-2">
              SSELFIE
            </h1>
            <div className="flex items-center justify-center gap-1.5 sm:gap-2">
              <div className="w-1 h-1 bg-stone-950 rounded-full animate-bounce"></div>
              <div
                className="w-1 h-1 bg-stone-950 rounded-full animate-bounce"
                style={{ animationDelay: "0.1s" }}
              ></div>
              <div
                className="w-1 h-1 bg-stone-950 rounded-full animate-bounce"
                style={{ animationDelay: "0.2s" }}
              ></div>
            </div>
            <p className="text-[10px] sm:text-xs font-light tracking-[0.35em] uppercase text-stone-500 mt-3 sm:mt-4">
              Luxury AI Photography
            </p>
          </div>
        </div>
      </div>
    )
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

      <div className="relative h-full mx-1 sm:mx-2 md:mx-3 pt-1 sm:pt-2 pb-32 sm:pb-32">
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
              <button
                onClick={() => setHasTrainedModel(!hasTrainedModel)}
                className="px-3 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs tracking-wide font-medium bg-white/60 hover:bg-white/80 backdrop-blur-xl rounded-full transition-all duration-300 border border-white/40 shadow-lg shadow-stone-900/10"
                title="Toggle user type"
              >
                {hasTrainedModel ? "Current" : "New"} User
              </button>
              <div className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 bg-white/60 backdrop-blur-xl rounded-full border border-white/40">
                <div className="flex space-x-0.5 sm:space-x-1">
                  <div className="w-0.5 sm:w-1 h-2 sm:h-3 bg-stone-900 rounded-full"></div>
                  <div className="w-0.5 sm:w-1 h-2 sm:h-3 bg-stone-900 rounded-full"></div>
                  <div className="w-0.5 sm:w-1 h-2 sm:h-3 bg-stone-900 rounded-full"></div>
                  <div className="w-0.5 sm:w-1 h-2 sm:h-3 bg-stone-400 rounded-full"></div>
                </div>
                <div className="w-4 sm:w-5 h-4 sm:h-5 bg-stone-900 rounded-full flex items-center justify-center text-white text-[8px] sm:text-[10px] font-bold">
                  95
                </div>
              </div>
            </div>
          </div>

          <div className="h-full px-4 sm:px-6 md:px-8 pb-8 sm:pb-10 md:pb-12 pt-0 overflow-y-auto">
            {activeTab === "studio" && (
              <StudioScreen user={user} hasTrainedModel={hasTrainedModel} setActiveTab={setActiveTab} />
            )}
            {activeTab === "training" && (
              <TrainingScreen user={user} setHasTrainedModel={setHasTrainedModel} setActiveTab={setActiveTab} />
            )}
            {activeTab === "maya" && <MayaChatScreen />}
            {activeTab === "gallery" && <GalleryScreen user={user} />}
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

export default SselfieApp
