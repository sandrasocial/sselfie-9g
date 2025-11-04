"use client"
import { Aperture, ChevronRight, Plus, Grid, Camera, ChevronDown, ChevronUp } from "lucide-react"
import useSWR, { mutate } from "swr"
import { InstagramPhotoPreview } from "./instagram-photo-preview"
import { useState, useMemo, useEffect } from "react"
import BrandProfileWizard from "./brand-profile-wizard"
import {
  StudioHeroSkeleton,
  StudioBrandProfileSkeleton,
  StudioGenerationsSkeleton,
  StudioStatsSkeleton,
} from "./studio-skeleton"
import { DynamicHeroCarousel } from "./dynamic-hero-carousel"
import { ContextualTips } from "./contextual-tips"

interface StudioScreenProps {
  user: any
  hasTrainedModel: boolean
  setActiveTab: (tab: string) => void
  onImageGenerated: () => void
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function StudioScreen({ user, hasTrainedModel, setActiveTab, onImageGenerated }: StudioScreenProps) {
  const [showPreview, setShowPreview] = useState(false)
  const [showBrandWizard, setShowBrandWizard] = useState(false)
  const [isBrandProfileExpanded, setIsBrandProfileExpanded] = useState(false)
  const [showSecondaryContent, setShowSecondaryContent] = useState(false)
  const [selectedGeneration, setSelectedGeneration] = useState<any>(null)

  const COLOR_THEME_MAP: Record<string, { name: string; colors: string[] }> = {
    "dark-moody": {
      name: "Dark & Moody",
      colors: ["#000000", "#2C2C2C", "#4A4A4A", "#6B6B6B"],
    },
    "minimalist-clean": {
      name: "Minimalistic & Clean",
      colors: ["#FFFFFF", "#F5F5F0", "#E8E4DC", "#D4C5F0"],
    },
    "beige-creamy": {
      name: "Beige & Creamy",
      colors: ["#F5F1E8", "#E8DCC8", "#D4C4A8", "#B8A88A"],
    },
    "pastel-coastal": {
      name: "Pastel & Coastal",
      colors: ["#E8F4F8", "#B8E0E8", "#88CCD8", "#5BA8B8"],
    },
    "warm-terracotta": {
      name: "Warm & Terracotta",
      colors: ["#E8DCC8", "#C8A898", "#A88878", "#886858"],
    },
    "bold-colorful": {
      name: "Bold & Colorful",
      colors: ["#FF6B9D", "#FFA07A", "#FFD700", "#98D8C8"],
    },
    custom: {
      name: "Custom Colors",
      colors: ["#D4C5B9", "#A89B8E", "#8B7E71", "#6E6154"],
    },
  }

  const { data: brandStatus } = useSWR(hasTrainedModel ? "/api/profile/personal-brand/status" : null, fetcher, {
    refreshInterval: 0,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 60000,
  })

  const { data: stats, isLoading: statsLoading } = useSWR(
    hasTrainedModel && showSecondaryContent ? "/api/studio/stats" : null,
    fetcher,
    {
      refreshInterval: 60000,
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    },
  )

  const { data: generationsData, isLoading: generationsLoading } = useSWR(
    hasTrainedModel ? "/api/studio/generations?limit=9" : null,
    fetcher,
    {
      refreshInterval: 60000,
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    },
  )

  const { data: sessionData } = useSWR(hasTrainedModel ? "/api/studio/session" : null, fetcher, {
    refreshInterval: 60000,
    revalidateOnFocus: false,
    dedupingInterval: 30000,
  })

  const { data: sessionsData, isLoading: sessionsLoading } = useSWR(
    hasTrainedModel && showSecondaryContent ? "/api/studio/sessions" : null,
    fetcher,
    {
      refreshInterval: 60000,
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    },
  )

  const { data: favoritesData } = useSWR(
    hasTrainedModel && showSecondaryContent ? "/api/studio/favorites?limit=5" : null,
    fetcher,
    {
      refreshInterval: 0,
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    },
  )

  useEffect(() => {
    if (hasTrainedModel && generationsData) {
      const timer = setTimeout(() => {
        setShowSecondaryContent(true)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [hasTrainedModel, generationsData])

  const hasActiveSession = useMemo(() => sessionData?.session, [sessionData])
  const hasRecentGenerations = useMemo(
    () => generationsData?.generations && generationsData.generations.length > 0,
    [generationsData],
  )
  const lastGeneratedImage = useMemo(() => generationsData?.generations?.[0]?.image_url, [generationsData])
  const lastGeneration = useMemo(() => generationsData?.generations?.[0], [generationsData])
  const recentGenerationsCount = useMemo(() => generationsData?.generations?.length || 0, [generationsData])
  const lastGenerationTime = useMemo(() => {
    if (!generationsData?.generations?.[0]?.created_at) return null

    const now = new Date()
    const created = new Date(generationsData.generations[0].created_at)
    const diffMs = now.getTime() - created.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffHours < 1) return "Just now"
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }, [generationsData])

  if (!hasTrainedModel) {
    return (
      <div className="space-y-6 sm:space-y-8 pb-24 sm:pb-28 md:pb-32 overflow-x-hidden max-w-full">
        <div className="pt-4 sm:pt-6 text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-extralight tracking-[0.1em] sm:tracking-[0.2em] md:tracking-[0.3em] text-stone-900 uppercase leading-none mb-2 sm:mb-3 px-4">
            Welcome to Studio
          </h1>
          <p className="text-[10px] sm:text-xs tracking-[0.15em] sm:tracking-[0.2em] md:tracking-[0.3em] uppercase font-light text-stone-400">
            Start Here
          </p>
        </div>

        <div className="bg-white/50 backdrop-blur-3xl border border-white/60 rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-12 text-center shadow-xl shadow-stone-900/5">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/70 backdrop-blur-2xl rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 border border-white/80 shadow-lg shadow-stone-900/5">
            <Aperture size={28} className="sm:w-8 sm:h-8" strokeWidth={1.5} />
          </div>

          <h2 className="text-xl sm:text-2xl md:text-3xl font-serif font-extralight tracking-[0.15em] sm:tracking-[0.2em] text-stone-900 uppercase mb-3 sm:mb-4 px-4">
            Train Your AI First
          </h2>

          <p className="text-sm sm:text-base font-light text-stone-500 mb-6 sm:mb-8 max-w-md mx-auto leading-relaxed px-4">
            Before you can create stunning photos you need to train your personal AI model with your selfies.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-8 sm:mb-10 max-w-2xl mx-auto">
            {[
              { label: "Accurate", desc: "Photos that look like you" },
              { label: "Fast", desc: "20 minute training" },
              { label: "Professional", desc: "Gallery ready results" },
            ].map((item, i) => (
              <div
                key={i}
                className="p-5 sm:p-6 bg-white/60 backdrop-blur-3xl rounded-xl sm:rounded-2xl border border-white/70 shadow-lg shadow-stone-900/5 hover:shadow-xl hover:shadow-stone-900/10 hover:scale-105 transition-all duration-500 group"
              >
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-stone-900 rounded-lg sm:rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-lg shadow-stone-900/20 group-hover:scale-110 transition-transform duration-500">
                  <div className="text-base sm:text-lg font-light text-white">{i + 1}</div>
                </div>
                <div className="text-sm font-light text-stone-900 mb-2">{item.label}</div>
                <div className="text-xs sm:text-sm font-light text-stone-500">{item.desc}</div>
              </div>
            ))}
          </div>

          <button
            onClick={() => setActiveTab("training")}
            className="group relative bg-stone-900 text-white px-8 sm:px-12 py-4 sm:py-5 rounded-xl sm:rounded-2xl font-light tracking-wider text-sm transition-all duration-500 hover:shadow-2xl hover:shadow-stone-900/30 hover:scale-105 active:scale-95 min-h-[52px] sm:min-h-[60px] overflow-hidden w-full sm:w-auto"
          >
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <span className="relative z-10 flex items-center justify-center gap-2">
              Start Training Now
              <ChevronRight
                size={14}
                strokeWidth={1.5}
                className="group-hover:translate-x-1 transition-transform duration-500"
              />
            </span>
          </button>
        </div>

        <div className="bg-white/50 backdrop-blur-3xl border border-white/60 rounded-2xl sm:rounded-3xl p-8 shadow-xl shadow-stone-900/5">
          <h3 className="text-lg sm:text-xl md:text-2xl font-serif font-extralight tracking-[0.15em] sm:tracking-[0.2em] md:tracking-[0.3em] text-stone-900 uppercase mb-6 sm:mb-8">
            What You Will Need
          </h3>

          <div className="space-y-4">
            {[
              { title: "10 to 20 Selfie Photos", desc: "Clear well lit photos of yourself" },
              { title: "Good Lighting", desc: "Natural window light works best" },
              { title: "Variety", desc: "Different angles and expressions" },
              { title: "20 Minutes", desc: "Time for AI training to complete" },
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-start gap-4 p-4 bg-white/60 backdrop-blur-2xl rounded-xl sm:rounded-2xl border border-white/70 shadow-lg shadow-stone-900/5 hover:shadow-xl hover:shadow-stone-900/10 hover:scale-[1.02] transition-all duration-500"
              >
                <div className="w-8 h-8 bg-white/80 backdrop-blur-xl rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 border border-white/70 shadow-inner shadow-stone-900/5">
                  <div className="w-1.5 h-1.5 bg-stone-600 rounded-full"></div>
                </div>
                <div className="flex-1">
                  <h4 className="text-sm sm:text-base font-light text-stone-900 mb-1">{item.title}</h4>
                  <p className="text-xs sm:text-sm font-light text-stone-500">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (generationsLoading && !generationsData) {
    return (
      <>
        <StudioHeroSkeleton />
        <div className="space-y-6 sm:space-y-8 pb-24 sm:pb-28 md:pb-32 pt-8 overflow-x-hidden max-w-full">
          <StudioBrandProfileSkeleton />
          <StudioGenerationsSkeleton />
        </div>
      </>
    )
  }

  return (
    <>
      <DynamicHeroCarousel images={favoritesData?.favorites || []} userName={user?.name?.split(" ")[0] || "Creator"} />

      <div className="space-y-6 sm:space-y-8 pb-24 sm:pb-28 md:pb-32 pt-8 overflow-x-hidden max-w-full">
        {brandStatus && !brandStatus.isCompleted && (
          <div className="bg-white/50 backdrop-blur-3xl border border-white/60 rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-xl shadow-stone-900/5">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex-1">
                <h2 className="font-['Times_New_Roman'] text-xl sm:text-2xl md:text-3xl font-extralight tracking-[0.15em] sm:tracking-[0.2em] uppercase text-stone-900 mb-3">
                  COMPLETE YOUR BRAND PROFILE
                </h2>
                <p className="text-sm text-stone-600 font-light leading-relaxed mb-4">
                  Help Maya understand your style and create personalized content
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 bg-stone-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-stone-950 transition-all duration-500"
                      style={{ width: `${brandStatus.completionPercentage || 0}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-stone-600 tracking-wider">
                    {brandStatus.completionPercentage || 0}%
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowBrandWizard(true)}
                className="bg-stone-950 text-stone-50 px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl text-sm font-medium uppercase tracking-wider hover:bg-stone-800 transition-all duration-200 hover:scale-105 active:scale-95"
              >
                Start Brand Profile
              </button>
            </div>
          </div>
        )}

        {brandStatus && brandStatus.isCompleted && brandStatus.summary && (
          <div className="bg-white/50 backdrop-blur-3xl border border-white/60 rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-xl shadow-stone-900/5">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1">
                  <h2 className="font-['Times_New_Roman'] text-xl sm:text-2xl md:text-3xl font-extralight tracking-[0.15em] sm:tracking-[0.2em] uppercase text-stone-900">
                    BRAND PROFILE
                  </h2>
                  {!isBrandProfileExpanded && brandStatus.summary.colorTheme && (
                    <div className="flex gap-1.5">
                      {COLOR_THEME_MAP[brandStatus.summary.colorTheme]?.colors.slice(0, 4).map((color, idx) => (
                        <div
                          key={idx}
                          className="w-6 h-6 rounded-full border border-stone-200 shadow-sm"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setIsBrandProfileExpanded(!isBrandProfileExpanded)}
                    className="border border-stone-300 text-stone-900 px-4 sm:px-6 py-2 sm:py-3 rounded-xl text-sm font-medium uppercase tracking-wider hover:bg-stone-100 transition-all duration-200 hover:scale-105 active:scale-95 flex items-center gap-2"
                  >
                    {isBrandProfileExpanded ? (
                      <>
                        Collapse
                        <ChevronUp size={16} strokeWidth={1.5} />
                      </>
                    ) : (
                      <>
                        View Details
                        <ChevronDown size={16} strokeWidth={1.5} />
                      </>
                    )}
                  </button>
                  {isBrandProfileExpanded && (
                    <button
                      onClick={() => setShowBrandWizard(true)}
                      className="bg-stone-950 text-stone-50 px-4 sm:px-6 py-2 sm:py-3 rounded-xl text-sm font-medium uppercase tracking-wider hover:bg-stone-800 transition-all duration-200 hover:scale-105 active:scale-95"
                    >
                      Edit Profile
                    </button>
                  )}
                </div>
              </div>

              {isBrandProfileExpanded && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-top-2 duration-300">
                  {brandStatus.summary.colorTheme && (
                    <div className="flex flex-col gap-3">
                      <span className="text-xs uppercase tracking-[0.2em] text-stone-500 font-light">
                        Color Palette
                      </span>
                      <div className="flex gap-2">
                        {COLOR_THEME_MAP[brandStatus.summary.colorTheme]?.colors.map((color, idx) => (
                          <div
                            key={idx}
                            className="w-10 h-10 rounded-full border border-stone-200 shadow-sm"
                            style={{ backgroundColor: color }}
                            title={color}
                          />
                        ))}
                      </div>
                      <span className="text-sm font-light text-stone-900">
                        {COLOR_THEME_MAP[brandStatus.summary.colorTheme]?.name || brandStatus.summary.colorTheme}
                      </span>
                    </div>
                  )}

                  {brandStatus.summary.visualAesthetic && (
                    <div className="flex flex-col gap-3">
                      <span className="text-xs uppercase tracking-[0.2em] text-stone-500 font-light">Visual Style</span>
                      <div className="flex flex-wrap gap-2">
                        {(typeof brandStatus.summary.visualAesthetic === "string"
                          ? JSON.parse(brandStatus.summary.visualAesthetic)
                          : brandStatus.summary.visualAesthetic
                        ).map((style: string, idx: number) => (
                          <span
                            key={idx}
                            className="px-3 py-1.5 bg-stone-100 text-stone-900 rounded-full text-xs font-light tracking-wider capitalize"
                          >
                            {style}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {brandStatus.summary.communicationVoice && (
                    <div className="flex flex-col gap-3">
                      <span className="text-xs uppercase tracking-[0.2em] text-stone-500 font-light">Voice</span>
                      <div className="flex flex-wrap gap-2">
                        {(typeof brandStatus.summary.communicationVoice === "string"
                          ? JSON.parse(brandStatus.summary.communicationVoice)
                          : brandStatus.summary.communicationVoice
                        ).map((voice: string, idx: number) => (
                          <span
                            key={idx}
                            className="px-3 py-1.5 bg-stone-100 text-stone-900 rounded-full text-xs font-light tracking-wider capitalize"
                          >
                            {voice}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {hasRecentGenerations && lastGeneratedImage ? (
          <div className="relative bg-white/50 backdrop-blur-3xl border border-white/60 rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl shadow-stone-900/5">
            <div className="relative h-[300px] sm:h-[400px] overflow-hidden">
              <img
                src={lastGeneratedImage || "/placeholder.svg"}
                alt="Latest generation"
                className="w-full h-full object-cover object-top"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-stone-900/60 via-stone-900/40 to-stone-50" />

              <button onClick={() => setActiveTab("maya")} className="absolute top-6 right-6 group">
                <div className="relative">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-white/80 overflow-hidden shadow-2xl group-hover:scale-110 transition-transform duration-500">
                    <img
                      src="https://i.postimg.cc/fTtCnzZv/out-1-22.png"
                      alt="Maya"
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-lg">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  </div>
                </div>
              </button>

              <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs sm:text-sm tracking-[0.3em] uppercase font-light text-white/80 mb-2">
                      Recent Activity
                    </p>
                    <h2 className="font-['Times_New_Roman'] text-2xl sm:text-3xl md:text-4xl font-extralight tracking-[0.2em] uppercase text-white mb-2">
                      LATEST GENERATIONS
                    </h2>
                    <p className="text-sm text-white/90 font-light">
                      {recentGenerationsCount} {recentGenerationsCount === 1 ? "photo" : "photos"} generated{" "}
                      {lastGenerationTime}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full shadow-lg"></div>
                    <span className="text-xs tracking-[0.2em] uppercase font-light text-white/80">Active</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 sm:p-8 space-y-6">
              <p className="text-sm font-light text-stone-600 leading-relaxed">
                Continue creating stunning AI-generated images with Maya, or browse your gallery
              </p>

              <div className="grid grid-cols-3 gap-2">
                {generationsData.generations.slice(0, 9).map((gen: any, index: number) => (
                  <div
                    key={gen.id}
                    onClick={() => {
                      setSelectedGeneration(gen)
                      setShowPreview(true)
                    }}
                    className="aspect-square bg-stone-200 rounded-lg overflow-hidden cursor-pointer hover:scale-105 transition-transform duration-300 shadow-md hover:shadow-xl"
                  >
                    <img
                      src={gen.image_url || "/placeholder.svg"}
                      alt={`Generation ${index + 1}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                ))}
                {recentGenerationsCount < 9 &&
                  Array.from({ length: 9 - recentGenerationsCount }).map((_, index) => (
                    <div
                      key={`placeholder-${index}`}
                      className="aspect-square bg-stone-100 rounded-lg flex items-center justify-center"
                    >
                      <Camera className="w-6 h-6 text-stone-300" strokeWidth={1.5} />
                    </div>
                  ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => setActiveTab("maya")}
                  className="group relative bg-stone-900 text-white px-6 py-4 rounded-xl font-light tracking-wider text-sm transition-all duration-500 hover:shadow-2xl hover:shadow-stone-900/30 hover:scale-105 active:scale-95 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    <Plus size={16} strokeWidth={1.5} />
                    Create More Photos
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab("gallery")}
                  className="group relative bg-white/60 backdrop-blur-3xl border border-white/70 text-stone-900 px-6 py-4 rounded-xl font-light tracking-wider text-sm transition-all duration-500 hover:bg-white/80 hover:border-white/90 hover:shadow-xl hover:shadow-stone-900/10 hover:scale-[1.02] active:scale-95"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    <Grid size={16} strokeWidth={1.5} />
                    View Gallery
                  </span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setActiveTab("maya")}
            className="group w-full bg-white/50 backdrop-blur-3xl border border-white/60 rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-xl shadow-stone-900/5 hover:bg-white/70 hover:border-white/80 hover:shadow-2xl hover:shadow-stone-900/10 transition-all duration-500 hover:scale-[1.02] active:scale-95"
          >
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-stone-200/60 overflow-hidden flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-500">
                <img
                  src="https://i.postimg.cc/fTtCnzZv/out-1-22.png"
                  alt="Maya - Your Photo Stylist"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-['Times_New_Roman'] text-xl sm:text-2xl font-extralight tracking-[0.15em] uppercase text-stone-900 mb-2">
                  MAYA
                </h3>
                <p className="text-sm font-light text-stone-600 leading-relaxed">
                  Start a photo session with your AI stylist
                </p>
              </div>
              <ChevronRight
                size={20}
                strokeWidth={1.5}
                className="text-stone-400 group-hover:text-stone-900 group-hover:translate-x-1 transition-all duration-500 flex-shrink-0"
              />
            </div>
          </button>
        )}

        <div className="relative bg-white/50 backdrop-blur-3xl border border-white/60 rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl shadow-stone-900/5">
          <div className="relative h-[300px] sm:h-[400px] overflow-hidden">
            <img
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/641-Yz6RWOHjtemWaGCwY5XQjtSCZX9LFH-PLsHrWqBMHmnlpwgDD2JI7xIv34r7Y.png"
              alt="Academy"
              className="w-full h-full object-cover object-center"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-stone-900/60 via-stone-900/50 to-stone-50" />

            <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
              <h2 className="font-['Times_New_Roman'] text-4xl sm:text-5xl md:text-6xl font-extralight tracking-[0.3em] uppercase text-white mb-3">
                ACADEMY
              </h2>
              <p className="text-sm sm:text-base tracking-[0.2em] uppercase font-light text-white/90">
                Master the Art of Content Creation
              </p>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            <p className="text-sm font-light text-stone-600 leading-relaxed">
              Learn professional photography techniques, content strategy, and personal branding from expert tutorials
            </p>

            <button
              onClick={() => setActiveTab("academy")}
              className="group relative bg-stone-900 text-white px-6 py-4 rounded-xl font-light tracking-wider text-sm transition-all duration-500 hover:shadow-2xl hover:shadow-stone-900/30 hover:scale-105 active:scale-95 overflow-hidden w-full sm:w-auto"
            >
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <span className="relative z-10 flex items-center justify-center gap-2">
                Start Learning
                <ChevronRight
                  size={14}
                  strokeWidth={1.5}
                  className="group-hover:translate-x-1 transition-transform duration-500"
                />
              </span>
            </button>
          </div>
        </div>

        {showSecondaryContent ? (
          stats ? (
            <div className="bg-white/50 backdrop-blur-3xl border border-white/60 rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-xl shadow-stone-900/5">
              <h2 className="font-['Times_New_Roman'] text-xl sm:text-2xl md:text-3xl font-extralight tracking-[0.15em] sm:tracking-[0.2em] text-stone-900 uppercase mb-6">
                YOUR CREATIVE JOURNEY
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex flex-col gap-2">
                  <span className="text-3xl font-light text-stone-900">{stats.generationsThisMonth || 0}</span>
                  <span className="text-xs uppercase tracking-wider text-stone-500">Photos Generated This Month</span>
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-3xl font-light text-stone-900">{stats.totalGenerated || 0}</span>
                  <span className="text-xs uppercase tracking-wider text-stone-500">Total Photos Created</span>
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-3xl font-light text-stone-900">{stats.totalFavorites || 0}</span>
                  <span className="text-xs uppercase tracking-wider text-stone-500">Favorite Photos</span>
                </div>
              </div>
              <p className="mt-6 text-sm font-light text-stone-600 italic">
                {stats.generationsThisMonth > 0
                  ? `Amazing work this month, ${user?.name?.split(" ")[0] || "Creator"}!`
                  : `Ready to create something beautiful, ${user?.name?.split(" ")[0] || "Creator"}?`}
              </p>
            </div>
          ) : statsLoading ? (
            <StudioStatsSkeleton />
          ) : null
        ) : null}

        {showSecondaryContent && hasRecentGenerations ? (
          <div className="space-y-6">
            <h3 className="text-lg sm:text-xl md:text-2xl font-serif font-extralight tracking-[0.15em] sm:tracking-[0.2em] md:tracking-[0.3em] text-stone-900 uppercase">
              Recent Activity
            </h3>
            <div className="space-y-1">
              {generationsData.generations.slice(0, 5).map((gen: any) => {
                const timeAgo = gen.created_at
                  ? (() => {
                      const now = new Date()
                      const created = new Date(gen.created_at)
                      const diffMs = now.getTime() - created.getTime()
                      const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
                      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

                      if (diffHours < 24) return `${diffHours}h ago`
                      return `${diffDays}d ago`
                    })()
                  : "Recently"

                return (
                  <div
                    key={gen.id}
                    className="flex items-center justify-between py-5 border-b border-white/40 last:border-b-0 hover:bg-white/30 transition-colors duration-500 px-6 -mx-6 rounded-xl cursor-pointer"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-1.5 h-1.5 bg-stone-500 rounded-full flex-shrink-0"></div>
                      <span className="text-sm font-light text-stone-900 truncate">
                        {gen.category ? `${gen.category} session completed` : "New session started"}
                      </span>
                    </div>
                    <span className="text-xs tracking-[0.15em] uppercase font-light text-stone-400 ml-4 flex-shrink-0">
                      {timeAgo}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        ) : null}

        {showSecondaryContent && sessionsData?.sessions && sessionsData.sessions.length > 0 ? (
          <div className="space-y-6">
            <h3 className="text-lg sm:text-xl md:text-2xl font-serif font-extralight tracking-[0.15em] sm:tracking-[0.2em] md:tracking-[0.3em] text-stone-900 uppercase">
              Session History
            </h3>
            <div className="grid gap-4">
              {sessionsData.sessions.map((session: any) => {
                const timeAgo = session.created_at
                  ? (() => {
                      const now = new Date()
                      const created = new Date(session.created_at)
                      const diffMs = now.getTime() - created.getTime()
                      const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
                      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

                      if (diffHours < 24) return `${diffHours}h ago`
                      return `${diffDays}d ago`
                    })()
                  : "Recently"

                return (
                  <div
                    key={session.id}
                    className="group bg-white/50 backdrop-blur-3xl border border-white/60 rounded-2xl p-6 hover:bg-white/70 hover:border-white/80 transition-all duration-500 shadow-xl shadow-stone-900/5 hover:shadow-2xl hover:shadow-stone-900/10 hover:scale-[1.02] cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-base font-light text-stone-900 mb-1 truncate">
                          {session.session_name || "Photo Session"}
                        </h4>
                        <p className="text-xs font-light text-stone-500">{session.image_count} photos generated</p>
                      </div>
                      <div
                        className={`px-3 py-1 rounded-full text-xs font-light ${
                          session.status === "completed"
                            ? "bg-stone-900 text-white"
                            : session.status === "active"
                              ? "bg-white/80 text-stone-900 border border-stone-200"
                              : "bg-stone-200 text-stone-600"
                        }`}
                      >
                        {session.status}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="tracking-[0.1em] uppercase font-light text-stone-400">Created {timeAgo}</span>
                      <ChevronRight
                        size={14}
                        className="text-stone-400 group-hover:translate-x-1 transition-transform duration-500"
                        strokeWidth={1.5}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : null}

        {showPreview && selectedGeneration && (
          <InstagramPhotoPreview
            image={{
              id: selectedGeneration.id,
              image_url: selectedGeneration.image_url,
              prompt: selectedGeneration.prompt,
              description: selectedGeneration.description,
              category: selectedGeneration.category,
              subcategory: selectedGeneration.subcategory,
              created_at: selectedGeneration.created_at,
              saved: selectedGeneration.saved,
              user_id: user.id,
              is_favorite: selectedGeneration.saved || false,
            }}
            images={generationsData.generations.slice(0, 9).map((gen: any) => ({
              id: gen.id,
              image_url: gen.image_url,
              prompt: gen.prompt,
              description: gen.description,
              category: gen.category,
              subcategory: gen.subcategory,
              created_at: gen.created_at,
              saved: gen.saved,
              user_id: user.id,
              is_favorite: gen.saved || false,
            }))}
            onClose={() => {
              setShowPreview(false)
              setSelectedGeneration(null)
            }}
            onDelete={async () => {
              setShowPreview(false)
              setSelectedGeneration(null)
              onImageGenerated()
              mutate("/api/studio/generations?limit=9")
            }}
            onFavorite={async () => {
              onImageGenerated()
              mutate("/api/studio/generations?limit=9")
            }}
            isFavorited={selectedGeneration.saved || false}
          />
        )}

        {showBrandWizard && (
          <BrandProfileWizard
            isOpen={showBrandWizard}
            onClose={() => setShowBrandWizard(false)}
            onComplete={() => {
              setShowBrandWizard(false)
              mutate("/api/profile/personal-brand/status")
            }}
            existingData={null}
          />
        )}

        {showSecondaryContent && stats && (
          <ContextualTips
            generationCount={stats.totalGenerated || 0}
            hasCompletedBrand={brandStatus?.isCompleted || false}
            favoriteCount={stats.totalFavorites || 0}
          />
        )}
      </div>
    </>
  )
}
