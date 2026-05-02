"use client"
import { Aperture, ChevronRight, Plus, Grid, Camera, ChevronDown } from "lucide-react"
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
import { DesignClasses } from "@/lib/design-tokens"
import { BRAND_COLOR_THEME_MAP } from "@/lib/style-presets"

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

  const COLOR_THEME_MAP = BRAND_COLOR_THEME_MAP

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
          <h1 className="font-['Cormorant_Garamond'] font-light text-3xl sm:text-4xl md:text-5xl tracking-[0.2em] sm:tracking-[0.25em] md:tracking-[0.3em] text-[color:var(--app-text-primary)] uppercase leading-none mb-2 sm:mb-3 px-4">
            Welcome to Studio
          </h1>
          <p className="font-['Inter'] text-[10px] sm:text-xs tracking-[0.3em] sm:tracking-[0.4em] md:tracking-[0.5em] uppercase font-medium text-[color:var(--app-text-secondary)]">
            Start Here
          </p>
        </div>

        <div className="bg-[color:var(--app-glass-bg)] backdrop-blur-[28px] border border-[color:var(--app-glass-border)] rounded-2xl p-6 sm:p-8 text-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[color:var(--app-btn-secondary-bg)] border border-[color:var(--app-glass-border)] rounded-xl flex items-center justify-center mx-auto mb-6">
            <Aperture size={28} className="text-[color:var(--app-text-muted)] sm:w-8 sm:h-8" strokeWidth={1.5} />
          </div>

          <h2 className="font-['Cormorant_Garamond'] font-light text-xl sm:text-2xl md:text-3xl tracking-[0.15em] uppercase text-[color:var(--app-text-primary)] mb-4 px-4">
            Train Your AI First
          </h2>

          <p className="font-['Inter'] text-sm text-[color:var(--app-text-secondary)] mb-6 sm:mb-8 max-w-md mx-auto leading-relaxed px-4">
            Before you can create stunning photos you need to train your personal AI model with your selfies.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-8 sm:mb-10 max-w-2xl mx-auto">
            {[
              { label: "Accurate", desc: "Photos that look like you" },
              { label: "Fast", desc: "A few minutes training" },
              { label: "Professional", desc: "Gallery ready results" },
            ].map((item, i) => (
              <div
                key={i}
                className="p-4 sm:p-5 bg-[color:var(--app-glass-bg)] backdrop-blur-[28px] border border-[color:var(--app-glass-border)] rounded-xl hover:bg-[color:var(--app-btn-secondary-hover)] hover:scale-105 transition-all duration-500 group"
              >
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-[color:var(--stone-dark)] rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-500">
                  <div className="text-base sm:text-lg font-light text-[color:var(--app-text-primary)]">{i + 1}</div>
                </div>
                <div className="font-['Cormorant_Garamond'] font-light text-base text-[color:var(--app-text-primary)] mb-1">{item.label}</div>
                <div className="font-['Inter'] text-xs text-[color:var(--app-text-secondary)]">{item.desc}</div>
              </div>
            ))}
          </div>

          <button
            onClick={() => setActiveTab("training")}
            className="group relative bg-[color:var(--app-btn-primary-bg)] text-[color:var(--app-btn-primary-text)] px-8 py-4 rounded-full font-['Inter'] font-medium text-xs tracking-[0.15em] uppercase hover:bg-[color:var(--stone-dark)] transition-all duration-200 min-h-[52px] sm:min-h-[60px] w-full sm:w-auto flex items-center justify-center gap-2"
          >
            Start Training Now
            <ChevronRight
              size={14}
              strokeWidth={1.5}
              className="group-hover:translate-x-1 transition-transform duration-500"
            />
          </button>
        </div>

        <div className="bg-[color:var(--app-glass-bg)] backdrop-blur-[28px] border border-[color:var(--app-glass-border)] rounded-2xl p-6 sm:p-8">
          <h3 className="font-['Cormorant_Garamond'] font-light text-xl sm:text-2xl tracking-[0.15em] uppercase text-[color:var(--app-text-primary)] mb-6">
            What You Will Need
          </h3>

          <div className="space-y-4">
            {[
              { title: "10 to 20 Selfie Photos", desc: "Clear well lit photos of yourself" },
              { title: "Good Lighting", desc: "Natural window light works best" },
              { title: "Variety", desc: "Different angles and expressions" },
              { title: "A Few Minutes", desc: "Time for AI training to complete" },
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-start gap-4 p-4 bg-[color:var(--app-glass-bg)] backdrop-blur-[28px] border border-[color:var(--app-glass-border)] rounded-xl hover:bg-[color:var(--app-btn-secondary-hover)] hover:scale-[1.02] transition-all duration-500"
              >
                <div className="w-8 h-8 bg-[color:var(--app-btn-secondary-bg)] border border-[color:var(--app-glass-border)] rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                  <div className="w-1.5 h-1.5 bg-[color:var(--stone)] rounded-full"></div>
                </div>
                <div className="flex-1">
                  <h4 className="font-['Cormorant_Garamond'] font-light text-base text-[color:var(--app-text-primary)] mb-1">{item.title}</h4>
                  <p className="font-['Inter'] text-xs text-[color:var(--app-text-secondary)]">{item.desc}</p>
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
          <div className="bg-[color:var(--app-glass-bg)] backdrop-blur-[28px] border border-[color:var(--app-glass-border)] rounded-2xl p-6 sm:p-8">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex-1">
                <h2 className="font-['Cormorant_Garamond'] font-light text-xl sm:text-2xl md:text-3xl tracking-[0.15em] sm:tracking-[0.2em] uppercase text-[color:var(--app-text-primary)] mb-3">
                  COMPLETE YOUR BRAND PROFILE
                </h2>
                <p className="font-['Inter'] text-sm text-[color:var(--app-text-secondary)] leading-relaxed mb-4">
                  Help Maya understand your style and create personalized content
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-1.5 bg-[color:var(--color-whisper)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[color:var(--stone)] transition-all duration-500"
                      style={{ width: `${brandStatus.completionPercentage || 0}%` }}
                    />
                  </div>
                  <span className="font-['Inter'] text-xs font-medium text-[color:var(--app-text-secondary)] tracking-wider">
                    {brandStatus.completionPercentage || 0}%
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowBrandWizard(true)}
                className="bg-[color:var(--app-btn-primary-bg)] text-[color:var(--app-btn-primary-text)] px-6 py-3 rounded-full font-['Inter'] font-medium text-xs tracking-[0.15em] uppercase hover:bg-[color:var(--stone-dark)] transition-all duration-200"
              >
                Start Brand Profile
              </button>
            </div>
          </div>
        )}

        {brandStatus && brandStatus.isCompleted && brandStatus.summary && (
          <div className="bg-[color:var(--app-glass-bg)] backdrop-blur-[28px] border border-[color:var(--app-glass-border)] rounded-2xl p-6 sm:p-8">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <h2 className="font-['Cormorant_Garamond'] font-light text-xl sm:text-2xl md:text-3xl tracking-[0.15em] sm:tracking-[0.2em] uppercase text-[color:var(--app-text-primary)]">
                  BRAND PROFILE
                </h2>
                <div className="flex gap-3">
                  <button
                    onClick={() => setIsBrandProfileExpanded(!isBrandProfileExpanded)}
                    className="font-['Inter'] text-[color:var(--app-text-secondary)] hover:text-[color:var(--app-text-primary)] px-2 py-1 text-xs uppercase tracking-[0.3em] transition-all duration-200 flex items-center gap-1.5 group"
                  >
                    {isBrandProfileExpanded ? "Collapse" : "View Details"}
                    <ChevronDown
                      size={12}
                      strokeWidth={1.5}
                      className={`transition-transform duration-300 group-hover:translate-y-0.5 ${isBrandProfileExpanded ? "rotate-180" : ""}`}
                    />
                  </button>
                  {isBrandProfileExpanded && (
                    <button
                      onClick={() => setShowBrandWizard(true)}
                      className="bg-[color:var(--app-btn-secondary-bg)] text-[color:var(--app-text-primary)] border border-[color:var(--app-glass-border)] px-4 sm:px-6 py-2 sm:py-3 rounded-full font-['Inter'] text-xs font-medium uppercase tracking-[0.15em] hover:bg-[color:var(--app-btn-secondary-hover)] transition-all duration-200"
                    >
                      Edit
                    </button>
                  )}
                </div>
              </div>

              {isBrandProfileExpanded && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-top-2 duration-300 pt-4 border-t border-[color:var(--app-glass-border)]">
                  {brandStatus.summary.colorTheme && (
                    <div className="flex flex-col gap-3">
                      <span className="font-['Inter'] text-[10px] uppercase tracking-[0.5em] text-[color:var(--app-text-secondary)] font-medium">
                        Color Palette
                      </span>
                      <div className="flex gap-2">
                        {COLOR_THEME_MAP[brandStatus.summary.colorTheme]?.colors.map((color, idx) => (
                          <div
                            key={idx}
                            className="w-10 h-10 rounded-full border border-[color:var(--app-glass-border)] shadow-sm"
                            style={{ backgroundColor: color }}
                            title={color}
                          />
                        ))}
                      </div>
                      <span className="font-['Inter'] text-sm text-[color:var(--app-text-primary)]">
                        {COLOR_THEME_MAP[brandStatus.summary.colorTheme]?.name || brandStatus.summary.colorTheme}
                      </span>
                    </div>
                  )}

                  {brandStatus.summary.visualAesthetic && (
                    <div className="flex flex-col gap-3">
                      <span className="font-['Inter'] text-[10px] uppercase tracking-[0.5em] text-[color:var(--app-text-secondary)] font-medium">Visual Style</span>
                      <div className="flex flex-wrap gap-2">
                        {(typeof brandStatus.summary.visualAesthetic === "string"
                          ? JSON.parse(brandStatus.summary.visualAesthetic)
                          : brandStatus.summary.visualAesthetic
                        ).map((style: string, idx: number) => (
                          <span
                            key={idx}
                            className="px-3 py-1.5 bg-[color:var(--app-btn-secondary-bg)] border border-[color:var(--app-glass-border)] text-[color:var(--app-text-primary)] rounded-full font-['Inter'] text-xs tracking-wider capitalize"
                          >
                            {style}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {brandStatus.summary.communicationVoice && (
                    <div className="flex flex-col gap-3">
                      <span className="font-['Inter'] text-[10px] uppercase tracking-[0.5em] text-[color:var(--app-text-secondary)] font-medium">Voice</span>
                      <div className="flex flex-wrap gap-2">
                        {(typeof brandStatus.summary.communicationVoice === "string"
                          ? JSON.parse(brandStatus.summary.communicationVoice)
                          : brandStatus.summary.communicationVoice
                        ).map((voice: string, idx: number) => (
                          <span
                            key={idx}
                            className="px-3 py-1.5 bg-[color:var(--app-btn-secondary-bg)] border border-[color:var(--app-glass-border)] text-[color:var(--app-text-primary)] rounded-full font-['Inter'] text-xs tracking-wider capitalize"
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
          <div className="relative bg-[color:var(--app-glass-bg)] backdrop-blur-[28px] border border-[color:var(--app-glass-border)] rounded-2xl overflow-hidden">
            <div className="relative h-[300px] sm:h-[400px] overflow-hidden">
              <img
                src={lastGeneratedImage || "/placeholder.svg"}
                alt="Latest generation"
                className="w-full h-full object-cover object-top"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-[color:var(--color-obsidian)]/60 via-[color:var(--color-obsidian)]/40 to-[color:var(--color-obsidian)]" />

              <button onClick={() => setActiveTab("maya")} className="absolute top-6 right-6 group">
                <div className="relative">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-[color:var(--color-whisper)] overflow-hidden shadow-2xl group-hover:scale-110 transition-transform duration-500">
                    <img
                      src="https://i.postimg.cc/fTtCnzZv/out-1-22.png"
                      alt="Maya"
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[color:var(--stone-dark)] rounded-full flex items-center justify-center">
                    <div className="w-3 h-3 bg-[color:var(--stone)] rounded-full animate-pulse"></div>
                  </div>
                </div>
              </button>

              <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="font-['Inter'] text-[10px] sm:text-xs tracking-[0.5em] uppercase font-medium text-[color:var(--color-whisper)] mb-2">
                      Recent Activity
                    </p>
                    <h2 className="font-['Cormorant_Garamond'] font-light text-2xl sm:text-3xl md:text-4xl tracking-[0.2em] uppercase text-[color:var(--color-porcelain)] mb-2">
                      LATEST GENERATIONS
                    </h2>
                    <p className="font-['Inter'] text-sm text-[color:var(--color-whisper)]">
                      {recentGenerationsCount} {recentGenerationsCount === 1 ? "photo" : "photos"} generated{" "}
                      {lastGenerationTime}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-[color:var(--stone)] rounded-full"></div>
                    <span className="font-['Inter'] text-[10px] tracking-[0.3em] uppercase font-medium text-[color:var(--color-whisper)]">Active</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 sm:p-8 space-y-6">
              <p className="font-['Inter'] text-sm text-[color:var(--app-text-secondary)] leading-relaxed">
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
                    className="aspect-square bg-[color:var(--app-btn-secondary-bg)] rounded-xl overflow-hidden cursor-pointer hover:scale-105 transition-transform duration-300"
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
                      className="aspect-square bg-[color:var(--app-input-bg)] border border-[color:var(--app-glass-border)] rounded-xl flex items-center justify-center"
                    >
                      <Camera className="w-6 h-6 text-[color:var(--app-text-secondary)]" strokeWidth={1.5} />
                    </div>
                  ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => setActiveTab("maya")}
                  className="group relative bg-[color:var(--app-btn-primary-bg)] text-[color:var(--app-btn-primary-text)] px-6 py-4 rounded-full font-['Inter'] font-medium tracking-[0.15em] text-xs uppercase transition-all duration-200 hover:bg-[color:var(--stone-dark)] hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
                >
                  <Plus size={16} strokeWidth={1.5} />
                  Create More Photos
                </button>
                <button
                  onClick={() => setActiveTab("gallery")}
                  className="group relative bg-[color:var(--app-glass-bg)] backdrop-blur-[28px] border border-[color:var(--app-glass-border)] text-[color:var(--app-text-primary)] px-6 py-4 rounded-full font-['Inter'] font-medium tracking-[0.15em] text-xs uppercase transition-all duration-200 hover:bg-[color:var(--app-btn-secondary-hover)] hover:border-[color:var(--app-input-border)] hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
                >
                  <Grid size={16} strokeWidth={1.5} />
                  View Gallery
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setActiveTab("maya")}
            className="group w-full bg-[color:var(--app-glass-bg)] backdrop-blur-[28px] border border-[color:var(--app-glass-border)] rounded-2xl p-6 sm:p-8 text-left hover:bg-[color:var(--app-btn-secondary-hover)] hover:border-[color:var(--app-input-border)] transition-all duration-300"
          >
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-[color:var(--app-input-border)] overflow-hidden flex-shrink-0 group-hover:scale-110 transition-transform duration-500">
                <img
                  src="https://i.postimg.cc/fTtCnzZv/out-1-22.png"
                  alt="Maya - Your Photo Stylist"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-['Cormorant_Garamond'] font-light text-xl sm:text-2xl tracking-[0.15em] uppercase text-[color:var(--app-text-primary)] mb-2">
                  MAYA
                </h3>
                <p className="font-['Inter'] text-sm text-[color:var(--app-text-secondary)] leading-relaxed">
                  Start a photo session with your AI stylist
                </p>
              </div>
              <ChevronRight
                size={20}
                strokeWidth={1.5}
                className="text-[color:var(--app-text-secondary)] group-hover:text-[color:var(--app-text-primary)] group-hover:translate-x-1 transition-all duration-500 flex-shrink-0"
              />
            </div>
          </button>
        )}

        <div className="relative bg-[color:var(--app-glass-bg)] backdrop-blur-[28px] border border-[color:var(--app-glass-border)] rounded-2xl overflow-hidden">
          <div className="relative h-[300px] sm:h-[400px] overflow-hidden">
            <img
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/641-Yz6RWOHjtemWaGCwY5XQjtSCZX9LFH-PLsHrWqBMHmnlpwgDD2JI7xIv34r7Y.png"
              alt="Academy"
              className="w-full h-full object-cover object-center"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[color:var(--color-obsidian)]/60 via-[color:var(--color-obsidian)]/50 to-[color:var(--color-obsidian)]" />

            <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
              <h2 className="font-['Cormorant_Garamond'] font-light text-4xl sm:text-5xl md:text-6xl tracking-[0.3em] uppercase text-[color:var(--color-porcelain)] mb-3">
                ACADEMY
              </h2>
              <p className="font-['Inter'] text-sm sm:text-base tracking-[0.3em] uppercase font-medium text-[color:var(--color-whisper)]">
                Master the Art of Content Creation
              </p>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            <p className="font-['Inter'] text-sm text-[color:var(--app-text-secondary)] leading-relaxed">
              Learn professional photography techniques, content strategy, and personal branding from expert tutorials
            </p>

            <button
              onClick={() => setActiveTab("academy")}
              className="group relative bg-[color:var(--app-btn-primary-bg)] text-[color:var(--app-btn-primary-text)] px-6 py-4 rounded-full font-['Inter'] font-medium tracking-[0.15em] text-xs uppercase transition-all duration-200 hover:bg-[color:var(--stone-dark)] hover:scale-105 active:scale-95 w-full sm:w-auto flex items-center justify-center gap-2"
            >
              Start Learning
              <ChevronRight
                size={14}
                strokeWidth={1.5}
                className="group-hover:translate-x-1 transition-transform duration-500"
              />
            </button>
          </div>
        </div>

        {showSecondaryContent ? (
          stats ? (
            <div className="bg-[color:var(--app-glass-bg)] backdrop-blur-[28px] border border-[color:var(--app-glass-border)] rounded-2xl p-6 sm:p-8">
              <h2 className="font-['Cormorant_Garamond'] font-light text-xl sm:text-2xl md:text-3xl tracking-[0.15em] sm:tracking-[0.2em] text-[color:var(--app-text-primary)] uppercase mb-6">
                YOUR CREATIVE JOURNEY
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex flex-col gap-2">
                  <span className="font-['Cormorant_Garamond'] font-light text-3xl text-[color:var(--app-text-primary)]">{stats.generationsThisMonth || 0}</span>
                  <span className="font-['Inter'] text-[10px] uppercase tracking-[0.5em] font-medium text-[color:var(--app-text-secondary)]">Photos Generated This Month</span>
                </div>
                <div className="flex flex-col gap-2">
                  <span className="font-['Cormorant_Garamond'] font-light text-3xl text-[color:var(--app-text-primary)]">{stats.totalGenerated || 0}</span>
                  <span className="font-['Inter'] text-[10px] uppercase tracking-[0.5em] font-medium text-[color:var(--app-text-secondary)]">Total Photos Created</span>
                </div>
                <div className="flex flex-col gap-2">
                  <span className="font-['Cormorant_Garamond'] font-light text-3xl text-[color:var(--app-text-primary)]">{stats.totalFavorites || 0}</span>
                  <span className="font-['Inter'] text-[10px] uppercase tracking-[0.5em] font-medium text-[color:var(--app-text-secondary)]">Favorite Photos</span>
                </div>
              </div>
              <p className="mt-6 font-['Inter'] text-sm text-[color:var(--app-text-secondary)] italic">
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
            <h3 className="font-['Cormorant_Garamond'] font-light text-lg sm:text-xl md:text-2xl tracking-[0.2em] sm:tracking-[0.25em] md:tracking-[0.3em] text-[color:var(--app-text-primary)] uppercase">
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
                    className="flex items-center justify-between py-5 border-b border-[color:var(--app-glass-border)] last:border-b-0 hover:bg-[color:var(--app-input-bg)] transition-colors duration-300 px-6 -mx-6 rounded-xl cursor-pointer"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-1.5 h-1.5 bg-[color:var(--stone)] rounded-full flex-shrink-0"></div>
                      <span className="font-['Inter'] text-sm text-[color:var(--app-text-primary)] truncate">
                        {gen.category ? `${gen.category} session completed` : "New session started"}
                      </span>
                    </div>
                    <span className="font-['Inter'] text-[10px] tracking-[0.3em] uppercase font-medium text-[color:var(--app-text-secondary)] ml-4 flex-shrink-0">
                      {timeAgo}
                    </span>
                  </div>
                )
              })}
            </div>
            <button
              onClick={() => setActiveTab("gallery")}
              className="group relative bg-[color:var(--app-glass-bg)] backdrop-blur-[28px] border border-[color:var(--app-glass-border)] text-[color:var(--app-text-primary)] px-6 py-3 rounded-full font-['Inter'] font-medium tracking-[0.15em] text-xs uppercase transition-all duration-200 hover:bg-[color:var(--app-btn-secondary-hover)] hover:border-[color:var(--app-input-border)] hover:scale-[1.02] active:scale-95 w-full sm:w-auto flex items-center justify-center gap-2"
            >
              View All
              <ChevronRight size={16} strokeWidth={1.5} className="group-hover:translate-x-1 transition-transform duration-500" />
            </button>
          </div>
        ) : null}

        {showSecondaryContent && sessionsData?.sessions && sessionsData.sessions.length > 0 ? (
          <div className="space-y-6">
            <h3 className="font-['Cormorant_Garamond'] font-light text-lg sm:text-xl md:text-2xl tracking-[0.2em] sm:tracking-[0.25em] md:tracking-[0.3em] text-[color:var(--app-text-primary)] uppercase">
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
                    className="group bg-[color:var(--app-glass-bg)] backdrop-blur-[28px] border border-[color:var(--app-glass-border)] rounded-2xl p-6 hover:bg-[color:var(--app-btn-secondary-hover)] hover:border-[color:var(--app-input-border)] transition-all duration-300 hover:scale-[1.02] cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-['Cormorant_Garamond'] font-light text-base text-[color:var(--app-text-primary)] mb-1 truncate">
                          {session.session_name || "Photo Session"}
                        </h4>
                        <p className="font-['Inter'] text-xs text-[color:var(--app-text-secondary)]">{session.image_count} photos generated</p>
                      </div>
                      <div
                        className={`px-3 py-1 rounded-full font-['Inter'] text-xs font-medium uppercase tracking-[0.1em] ${
                          session.status === "completed"
                            ? "bg-[color:var(--stone)] text-[color:var(--color-obsidian)]"
                            : session.status === "active"
                              ? "bg-[color:var(--color-whisper)] text-[color:var(--app-text-primary)] border border-[color:var(--app-input-border)]"
                              : "bg-[color:var(--app-btn-secondary-bg)] text-[color:var(--app-text-secondary)]"
                        }`}
                      >
                        {session.status}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-['Inter'] text-[10px] tracking-[0.3em] uppercase font-medium text-[color:var(--app-text-secondary)]">Created {timeAgo}</span>
                      <ChevronRight
                        size={14}
                        className="text-[color:var(--app-text-secondary)] group-hover:text-[color:var(--app-text-primary)] group-hover:translate-x-1 transition-all duration-300"
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
