"use client"

import Image from "next/image"
import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { BlueprintSelfieUpload } from "@/components/blueprint/blueprint-selfie-upload"
import useSWR from "swr"
import { CURATED_FEED_STYLE_MAP, type CuratedFeedStyleName } from "@/lib/style-presets"
import type { FeedVisualDirectionMode } from "@/lib/feed-planner/visual-direction"

// Feed style examples (V2 - 7 curated styles)
// V1 code removed - V2 is always enabled
const FEED_EXAMPLES = CURATED_FEED_STYLE_MAP

export type FeedStyle = CuratedFeedStyleName
export type { FeedVisualDirectionMode } from "@/lib/feed-planner/visual-direction"

export interface FeedStyleModalData {
  directionMode: FeedVisualDirectionMode
  feedStyle?: FeedStyle | null
  visualAesthetic?: string[]
  feedStyleVariationId?: number | null
  selfieImages?: string[]
  visualDirectionBrief?: string
  inspirationImageUrl?: string
}

interface FeedStyleModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (data: FeedStyleModalData) => void
  mode?: "first" | "new" | "style"
  defaultFeedStyle?: FeedStyle | null
  defaultFeedStyleVariationId?: number | null // Current feed's variation_id (for existing feeds)
  isLoading?: boolean
  isPreviewFeed?: boolean // Optional: true for preview feeds, false for full feeds
  initialDirectionMode?: FeedVisualDirectionMode | null
  initialVisualDirectionBrief?: string | null
  initialInspirationImageUrl?: string | null
  // V2 is always enabled - useFeedPlannerV2 prop removed
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

interface FeedStyleVariationOption {
  id: number
  name: string
  description: string | null
  is_default: boolean
  sort_order: number
}

interface FeedStylePreviewOption {
  id: number
  name: string
  description: string | null
  previewImageUrl: string | null
}

export default function FeedStyleModal({
  open,
  onOpenChange,
  onConfirm,
  mode = "first",
  defaultFeedStyle,
  defaultFeedStyleVariationId,
  isLoading = false,
  isPreviewFeed = false,
  initialDirectionMode = null,
  initialVisualDirectionBrief = null,
  initialInspirationImageUrl = null,
}: FeedStyleModalProps) {
  // V2 is always enabled

  const [selectedStyle, setSelectedStyle] = useState<FeedStyle | null>(defaultFeedStyle ?? null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [selfieImages, setSelfieImages] = useState<string[]>([])
  const [selectedVariationId, setSelectedVariationId] = useState<number | null>(
    defaultFeedStyleVariationId ?? null
  )
  const [directionMode, setDirectionMode] = useState<FeedVisualDirectionMode | null>(
    initialDirectionMode
  )
  const [visualDirectionBrief, setVisualDirectionBrief] = useState(
    initialVisualDirectionBrief ?? ""
  )
  const [inspirationImageUrl, setInspirationImageUrl] = useState<string | null>(
    initialInspirationImageUrl
  )
  const [isUploadingInspiration, setIsUploadingInspiration] = useState(false)
  const [inspirationError, setInspirationError] = useState<string | null>(null)
  const inspirationInputRef = useRef<HTMLInputElement>(null)

  // Fetch user's current personal brand data
  const {
    data: personalBrandData,
    isLoading: isLoadingPersonalBrand,
    mutate: mutatePersonalBrand,
  } = useSWR(open ? "/api/profile/personal-brand" : null, fetcher, {
    revalidateOnFocus: true, // Revalidate when modal opens
    dedupingInterval: 0, // Always fetch fresh data when modal opens
  })

  // Fetch user's current avatar images
  const { data: avatarImagesData } = useSWR(open ? "/api/images?type=avatar" : null, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  })

  const { data: variationData } = useSWR(
    open && selectedStyle
      ? `/api/feed-planner/v2/variations?style=${encodeURIComponent(selectedStyle)}`
      : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  )
  const { data: stylePreviewData } = useSWR(open ? "/api/feed-planner/v2/styles" : null, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  })

  // Track if user explicitly selected variation (prevents auto-reset)
  const userExplicitlySelectedVariationRef = useRef(false)
  const previousStyleRef = useRef<FeedStyle | null>(selectedStyle)
  const hasInitializedRef = useRef(false)

  // SIMPLIFIED: ONE useEffect for initialization only (runs once when modal opens)
  useEffect(() => {
    if (!open) {
      // Reset everything when modal closes
      setSelectedStyle(defaultFeedStyle ?? null)
      setSelectedVariationId(null)
      setDirectionMode(initialDirectionMode)
      setVisualDirectionBrief(initialVisualDirectionBrief ?? "")
      setInspirationImageUrl(initialInspirationImageUrl)
      setInspirationError(null)
      userExplicitlySelectedVariationRef.current = false
      previousStyleRef.current = null
      hasInitializedRef.current = false
      mutatePersonalBrand() // Refresh for next open
      return
    }

    // Only initialize once when modal opens (not on every data change)
    if (hasInitializedRef.current) {
      return // Already initialized, don't override user's selections
    }

    // When no explicit default was supplied, wait for the saved preference instead of
    // freezing the temporary Dark & Moody fallback before SWR resolves.
    if (!defaultFeedStyle && isLoadingPersonalBrand) return

    hasInitializedRef.current = true
    const initialStyle = defaultFeedStyle ?? selectedStyle
    setSelectedStyle(initialStyle)
    previousStyleRef.current = initialStyle
    setVisualDirectionBrief(initialVisualDirectionBrief ?? "")
    setInspirationImageUrl(initialInspirationImageUrl)

    // Load feed style from personal brand (if no defaultFeedStyle provided)
    if (!defaultFeedStyle && personalBrandData?.data?.settingsPreference) {
      try {
        const settings = Array.isArray(personalBrandData.data.settingsPreference)
          ? personalBrandData.data.settingsPreference
          : typeof personalBrandData.data.settingsPreference === "string"
            ? JSON.parse(personalBrandData.data.settingsPreference)
            : []

        if (Array.isArray(settings) && settings.length > 0) {
          const rawSettingsValue = String(settings[0] || "").trim()
          const settingsValue = rawSettingsValue.toLowerCase()
          const v2Match = Object.keys(FEED_EXAMPLES).find(
            style => style.toLowerCase() === settingsValue
          )
          if (v2Match) {
            setSelectedStyle(v2Match as FeedStyle)
            previousStyleRef.current = v2Match as FeedStyle
            console.log("[Feed Style Modal] Initialized style from personal brand:", v2Match)
          }
        }
      } catch (e) {
        console.warn("[Feed Style Modal] Failed to parse settingsPreference:", e)
      }
    }

    // Load variation (priority: feed data > personal brand > default)
    if (defaultFeedStyleVariationId !== undefined && defaultFeedStyleVariationId !== null) {
      setSelectedVariationId(defaultFeedStyleVariationId)
      console.log(
        "[Feed Style Modal] Initialized variation from feed data:",
        defaultFeedStyleVariationId
      )
    } else if (personalBrandData?.data?.feedStyleVariationId !== undefined) {
      const variationId = Number(personalBrandData.data.feedStyleVariationId)
      if (Number.isFinite(variationId)) {
        setSelectedVariationId(variationId)
        console.log("[Feed Style Modal] Initialized variation from personal brand:", variationId)
      }
    }
    // If no variation found, wait for variationData to load and set default
  }, [
    defaultFeedStyle,
    defaultFeedStyleVariationId,
    isLoadingPersonalBrand,
    mutatePersonalBrand,
    open,
    personalBrandData,
    selectedStyle,
    initialDirectionMode,
    initialVisualDirectionBrief,
    initialInspirationImageUrl,
  ])

  // Set default variation when variationData loads (only if no variation is set yet)
  useEffect(() => {
    if (!open || !variationData || userExplicitlySelectedVariationRef.current) return

    const variations = (variationData?.variations || []) as FeedStyleVariationOption[]
    if (variations.length === 0) return

    // Only set default if no variation is currently selected
    if (selectedVariationId === null) {
      const defaultId =
        variationData?.defaultVariationId ||
        variations.find(variation => variation.is_default)?.id ||
        variations[0]?.id
      if (defaultId) {
        console.log("[Feed Style Modal] Setting default variation on load:", defaultId)
        setSelectedVariationId(Number(defaultId))
      }
    }
  }, [open, variationData, selectedVariationId]) // Only set default if null

  // Handle style change - reset variation to default for new style
  useEffect(() => {
    if (!open) return

    if (selectedStyle && previousStyleRef.current !== selectedStyle) {
      console.log("[Feed Style Modal] Style changed, resetting variation")
      previousStyleRef.current = selectedStyle
      userExplicitlySelectedVariationRef.current = false // Allow auto-selection for new style
      setSelectedVariationId(null) // Will be set by variationData effect
    }
  }, [open, selectedStyle])

  // Load current avatar images
  useEffect(() => {
    if (open && avatarImagesData?.images) {
      const imageUrls = avatarImagesData.images.map((img: any) => img.image_url || img)
      setSelfieImages(imageUrls)
    }
  }, [open, avatarImagesData])

  // Reset advanced section when modal closes
  useEffect(() => {
    if (!open) {
      setShowAdvanced(false)
    }
  }, [open])

  const handleConfirm = () => {
    if (!directionMode) return
    if (directionMode === "curated" && !selectedStyle) return
    if (directionMode === "custom" && visualDirectionBrief.trim().length < 10) return
    if (directionMode === "inspiration" && !inspirationImageUrl) return
    console.log("[Feed Style Modal] Confirming selection:", {
      feedStyle: selectedStyle,
      feedStyleVariationId: selectedVariationId,
      directionMode,
      userExplicitlySelected: userExplicitlySelectedVariationRef.current,
    })
    onConfirm({
      directionMode,
      feedStyle: directionMode === "curated" ? selectedStyle : null,
      feedStyleVariationId: directionMode === "curated" ? selectedVariationId : null,
      selfieImages: selfieImages.length > 0 ? selfieImages : undefined,
      visualDirectionBrief: directionMode === "custom" ? visualDirectionBrief.trim() : undefined,
      inspirationImageUrl:
        directionMode === "inspiration" ? (inspirationImageUrl ?? undefined) : undefined,
    })
  }

  const handleInspirationUpload = async (file: File) => {
    setInspirationError(null)
    setIsUploadingInspiration(true)
    try {
      const form = new FormData()
      form.append("file", file)
      form.append("slot", "inspiration")
      const response = await fetch("/api/app-v3/upload-selfie", { method: "POST", body: form })
      const data = (await response.json().catch(() => null)) as {
        url?: string
        error?: string
      } | null
      if (!response.ok || !data?.url) {
        throw new Error(data?.error || "I could not upload that image. Please try another one.")
      }
      setInspirationImageUrl(data.url)
    } catch (error) {
      setInspirationError(
        error instanceof Error ? error.message : "I could not upload that image. Please try again."
      )
    } finally {
      setIsUploadingInspiration(false)
    }
  }

  const eyebrow =
    mode === "first" ? "Your first grid" : mode === "new" ? "New grid" : "This month’s look"
  const title = mode === "new" ? "How should this grid look?" : "Choose the look for this month."
  const description =
    mode === "style"
      ? "Pick one starting point. Maya will use it across this grid, and nothing changes until you save it."
      : "Start with what feels easiest. Maya can choose, use one of my favourites, follow an inspiration image, or work from your own words."
  const canConfirm =
    Boolean(directionMode) &&
    (directionMode !== "curated" || Boolean(selectedStyle)) &&
    (directionMode !== "custom" || visualDirectionBrief.trim().length >= 10) &&
    (directionMode !== "inspiration" || Boolean(inspirationImageUrl))

  // Portal target - avoids stacking-context traps from Framer Motion wrappers
  // (motion.div with will-change creates a new stacking context that traps fixed children)
  const [portalTarget, setPortalTarget] = useState<Element | null>(null)
  useEffect(() => {
    setPortalTarget(document.body)
  }, [])

  if (!open || !portalTarget) return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-[#0D0E10]/45 backdrop-blur-sm"
            onClick={() => onOpenChange(false)}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-[121] flex items-end justify-center p-0 sm:items-center sm:p-5"
            onClick={e => e.stopPropagation()}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="feed-style-modal-title"
              className="relative flex max-h-[calc(100dvh-0.5rem)] w-full max-w-4xl flex-col overflow-hidden rounded-t-[24px] border border-[#C5C6C8]/65 bg-[#F8FAFA] text-[#0D0E10] shadow-[0_30px_100px_rgba(13,14,16,0.24)] sm:max-h-[92dvh] sm:rounded-[24px]"
            >
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="absolute right-4 top-4 z-10 flex min-h-11 items-center justify-center rounded-full border border-[#C5C6C8] bg-white px-4 text-[#4F5052] transition-colors hover:border-[#0D0E10]/45 hover:text-[#0D0E10]"
                aria-label="Close"
              >
                <span className="text-[10px] uppercase tracking-[0.18em]">Close</span>
              </button>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-7 pt-8 sm:px-7">
                <div className="space-y-7">
                  <div className="pr-20">
                    <p className="text-[10px] uppercase tracking-[0.24em] text-[#818283]">
                      {eyebrow}
                    </p>
                    <h2
                      id="feed-style-modal-title"
                      className="mt-2 font-serif text-[32px] font-light leading-[1.02] text-[#0D0E10] sm:text-[42px]"
                    >
                      {title}
                    </h2>
                    <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-[#4F5052]">
                      {description}
                    </p>
                  </div>

                  <div className="space-y-6">
                    <section aria-labelledby="direction-method-title">
                      <p
                        id="direction-method-title"
                        className="mb-3 text-[10px] uppercase tracking-[0.2em] text-[#6D6E70]"
                      >
                        Choose one starting point
                      </p>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {(
                          [
                            [
                              "maya",
                              "Maya decides",
                              "She uses what she already knows about you and chooses the strongest look for this month.",
                            ],
                            [
                              "curated",
                              "Sandra's favourites",
                              "Choose from the current looks I have saved for SSELFIE grids.",
                            ],
                            [
                              "inspiration",
                              "Upload inspiration",
                              "Show Maya a grid or photo you love. She follows the mood, light and colour, never someone else’s face.",
                            ],
                            [
                              "custom",
                              "Describe it myself",
                              "Say what you like in normal words. Maya will turn it into a clear look.",
                            ],
                          ] as const
                        ).map(([value, label, help]) => {
                          const selected = directionMode === value
                          return (
                            <button
                              key={value}
                              type="button"
                              aria-pressed={selected}
                              onClick={() => {
                                setDirectionMode(value)
                                setInspirationError(null)
                              }}
                              className={`min-h-[6.25rem] rounded-[14px] border p-4 text-left transition-[border-color,background-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D0E10] focus-visible:ring-offset-2 ${
                                selected
                                  ? "border-[#0D0E10] bg-white"
                                  : "border-[#C5C6C8]/70 bg-white/70 hover:border-[#818283]"
                              }`}
                            >
                              <span className="block text-[14px] font-medium text-[#0D0E10]">
                                {label}
                              </span>
                              <span className="mt-1.5 block text-[11px] leading-relaxed text-[#6D6E70]">
                                {help}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </section>

                    {directionMode === "maya" ? (
                      <section className="rounded-[14px] border border-[#C5C6C8]/65 bg-white p-4">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-[#6D6E70]">
                          Maya’s choice
                        </p>
                        <p className="mt-2 text-[13px] leading-relaxed text-[#4F5052]">
                          Maya will use your saved brand, audience, colours and style preferences.
                          If anything important is missing, she will ask before she invents it.
                        </p>
                      </section>
                    ) : null}

                    {directionMode === "custom" ? (
                      <section className="rounded-[14px] border border-[#C5C6C8]/65 bg-white p-4">
                        <label
                          htmlFor="calendar-visual-direction"
                          className="text-[10px] uppercase tracking-[0.2em] text-[#6D6E70]"
                        >
                          Describe your visual direction
                        </label>
                        <textarea
                          id="calendar-visual-direction"
                          value={visualDirectionBrief}
                          onChange={event => setVisualDirectionBrief(event.target.value)}
                          rows={4}
                          maxLength={500}
                          placeholder="For example: bright city mornings, silver details, movement, clean tailoring and photos that feel confident but natural."
                          className="mt-3 min-h-28 w-full resize-y rounded-[10px] border border-[#C5C6C8] bg-[#F8FAFA] px-3 py-3 text-[13px] leading-relaxed text-[#0D0E10] outline-none placeholder:text-[#818283] focus:border-[#0D0E10] focus:ring-2 focus:ring-[#0D0E10]/10"
                        />
                        <p className="mt-2 text-[10px] text-[#818283]">
                          {visualDirectionBrief.length}/500
                        </p>
                      </section>
                    ) : null}

                    {directionMode === "inspiration" ? (
                      <section className="rounded-[14px] border border-[#C5C6C8]/65 bg-white p-4">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-[#6D6E70]">
                          Inspiration image
                        </p>
                        <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-[#4F5052]">
                          Save or screenshot a grid, photo, outfit, room, or colour world you love.
                          Maya will study the direction, then create every post as a separate image.
                          She will not copy another person’s face or turn the screenshot into one
                          grid image.
                        </p>
                        <a
                          href="https://www.pinterest.com/search/pins/?q=instagram%20grid%20inspiration"
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 inline-flex min-h-11 items-center text-[12px] font-medium text-[#0D0E10] underline underline-offset-4"
                        >
                          Open Pinterest for inspiration
                        </a>
                        <input
                          ref={inspirationInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          aria-label="Upload an inspiration image"
                          className="sr-only"
                          onChange={event => {
                            const file = event.target.files?.[0]
                            if (file) void handleInspirationUpload(file)
                            if (inspirationInputRef.current) inspirationInputRef.current.value = ""
                          }}
                        />
                        {inspirationImageUrl ? (
                          <div className="mt-3 flex items-center gap-3 rounded-[12px] bg-[#F8FAFA] p-2.5">
                            <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[9px] border border-[#C5C6C8]">
                              <Image
                                src={inspirationImageUrl}
                                alt="Selected inspiration"
                                fill
                                sizes="64px"
                                className="object-cover"
                              />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-[12px] font-medium text-[#0D0E10]">
                                Inspiration ready
                              </p>
                              <p className="mt-1 text-[11px] leading-relaxed text-[#6D6E70]">
                                Maya uses its visual world, never its identity.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setInspirationImageUrl(null)}
                              className="min-h-11 px-2 text-[11px] text-[#4F5052] underline underline-offset-4"
                            >
                              Remove
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => inspirationInputRef.current?.click()}
                            disabled={isUploadingInspiration}
                            className="mt-3 min-h-12 w-full rounded-full bg-[#0D0E10] px-5 text-[12px] font-medium text-[color:var(--app-btn-primary-text)] disabled:opacity-50 sm:w-auto"
                          >
                            {isUploadingInspiration
                              ? "Uploading inspiration…"
                              : "Choose inspiration image"}
                          </button>
                        )}
                        {inspirationError ? (
                          <p role="alert" className="mt-2 text-[12px] text-destructive">
                            {inspirationError}
                          </p>
                        ) : null}
                      </section>
                    ) : null}

                    {directionMode === "curated" ? (
                      <section>
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <p className="text-[10px] uppercase tracking-[0.2em] text-[#6D6E70]">
                            Sandra’s favourites
                          </p>
                          <p className="text-[10px] text-[#818283]">Updated from the saved preview library</p>
                        </div>
                        <div className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:-mx-7 sm:px-7 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0">
                          {Object.entries(FEED_EXAMPLES).map(([key, style]) => {
                            const feedStyle = key as FeedStyle
                            const isSelected = selectedStyle === feedStyle
                            const preview = (stylePreviewData?.styles || []).find(
                              (item: FeedStylePreviewOption) => item.name === feedStyle
                            ) as FeedStylePreviewOption | undefined

                            return (
                              <button
                                type="button"
                                key={key}
                                onClick={() => setSelectedStyle(feedStyle)}
                                aria-pressed={isSelected}
                                className={`w-[min(78vw,18rem)] shrink-0 snap-center rounded-[16px] border p-3 text-left transition-[border-color,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D0E10] focus-visible:ring-offset-2 md:w-auto ${
                                  isSelected
                                    ? "border-[#0D0E10] bg-white shadow-[0_12px_28px_rgba(13,14,16,0.10)]"
                                    : "border-[#C5C6C8]/70 bg-white hover:border-[#818283]"
                                }`}
                              >
                                {preview?.previewImageUrl ? (
                                  <div className="relative mb-3 aspect-[3/4] overflow-hidden rounded-[10px] bg-[#F8FAFA]">
                                    <Image src={preview.previewImageUrl} alt={`${style.name} grid preview`} fill className="object-cover object-top" sizes="288px" />
                                  </div>
                                ) : (
                                  <div className="mb-3 grid grid-cols-3 gap-1.5 rounded-[10px] bg-[#F8FAFA] p-1.5">
                                    {style.grid.map((type, idx) => (
                                      <span key={idx} aria-hidden className="aspect-[3/4] rounded-[5px] border border-[#0D0E10]/5" style={{ backgroundColor: type === "selfie" ? style.colors[0] : style.colors[1] }} />
                                    ))}
                                  </div>
                                )}
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <h3 className="text-[14px] font-medium text-[#0D0E10]">
                                      {style.name}
                                    </h3>
                                    <div className="mt-2 flex gap-1.5" aria-hidden>
                                      {style.colors.map((color, idx) => (
                                        <span
                                          key={idx}
                                          className="h-5 w-5 rounded-full border border-[#0D0E10]/10"
                                          style={{ backgroundColor: color }}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                  <span
                                    className={`rounded-full px-2.5 py-1 text-[9px] uppercase tracking-[0.14em] ${
                                      isSelected
                                        ? "bg-[#0D0E10] text-[color:var(--app-btn-primary-text)]"
                                        : "bg-[#F8FAFA] text-[#6D6E70]"
                                    }`}
                                  >
                                    {isSelected ? "Selected" : "Choose"}
                                  </span>
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      </section>
                    ) : null}

                    {directionMode === "curated" && selectedStyle && (
                      <div className="rounded-[14px] border border-[#C5C6C8]/65 bg-white p-4">
                        <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-[#6D6E70]">
                          Choose a version
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {(variationData?.variations || []).map(
                            (variation: FeedStyleVariationOption) => {
                              const isSelected = selectedVariationId === variation.id
                              return (
                                <button
                                  type="button"
                                  key={variation.id}
                                  aria-pressed={isSelected}
                                  onClick={() => {
                                    userExplicitlySelectedVariationRef.current = true
                                    setSelectedVariationId(variation.id)
                                  }}
                                  className={`min-h-11 w-full rounded-[10px] border p-3 text-left transition-colors duration-200 ${
                                    isSelected
                                      ? "border-[#0D0E10] bg-[#F8FAFA] text-[#0D0E10]"
                                      : "border-[#C5C6C8]/65 bg-white text-[#4F5052] hover:border-[#818283]"
                                  }`}
                                >
                                  <div className="text-[12px] font-medium">{variation.name}</div>
                                  {variation.description ? (
                                    <p className="mt-1 text-[11px] leading-relaxed text-[#6D6E70]">
                                      {variation.description}
                                    </p>
                                  ) : null}
                                </button>
                              )
                            }
                          )}
                        </div>
                        {variationData?.variations?.length === 0 && (
                          <p className="text-[12px] text-[#6D6E70]">
                            Maya will use the strongest version of this style.
                          </p>
                        )}
                      </div>
                    )}

                    <div className="border-t border-[#C5C6C8]/60 pt-3">
                      <button
                        type="button"
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        aria-expanded={showAdvanced}
                        className="flex min-h-11 w-full items-center justify-between rounded-[8px] px-1 text-[11px] uppercase tracking-[0.15em] text-[#4F5052]"
                      >
                        <span>Selfie references</span>
                        <span className="text-[10px] text-[#818283]">
                          {showAdvanced ? "Hide" : "Optional"}
                        </span>
                      </button>

                      <AnimatePresence>
                        {showAdvanced && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="pt-3">
                              <div className="rounded-[14px] bg-white p-4">
                                <p className="mb-4 text-[12px] leading-relaxed text-[#6D6E70]">
                                  Your saved selfie is already ready. Add more angles only if you
                                  want to.
                                </p>
                                <BlueprintSelfieUpload
                                  onUploadComplete={imageUrls => setSelfieImages(imageUrls)}
                                  maxImages={3}
                                  initialImages={selfieImages}
                                />
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              </div>

              <div
                className="flex shrink-0 items-center gap-3 border-t border-[#C5C6C8]/65 bg-white px-5 py-3 sm:justify-end sm:px-7"
                style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
              >
                <Button
                  variant="ghost"
                  onClick={() => onOpenChange(false)}
                  disabled={isLoading}
                  className="min-h-11 flex-1 rounded-full px-5 text-[11px] uppercase tracking-[0.14em] text-[#4F5052] hover:bg-[#F8FAFA] sm:flex-none"
                >
                  Cancel
                </Button>

                <Button
                  onClick={handleConfirm}
                  disabled={isLoading || isUploadingInspiration || !canConfirm}
                  className="min-h-11 flex-[1.6] rounded-full bg-[#0D0E10] px-6 text-[11px] uppercase tracking-[0.16em] text-[color:var(--app-btn-primary-text)] shadow-none hover:bg-[#282728] sm:flex-none disabled:opacity-40"
                >
                  {isLoading
                    ? isPreviewFeed
                      ? "Creating preview…"
                      : mode === "style"
                        ? "Saving your style…"
                        : "Creating your grid…"
                    : isPreviewFeed
                      ? "Create preview"
                      : mode === "style"
                        ? "Save direction"
                        : "Create my grid"}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    portalTarget
  )
}
