"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import {
  ArrowUpRight,
  Heart,
  History,
  Images,
  Lightbulb,
  Plus,
  Sparkles,
  UserRound,
} from "lucide-react"

import { AESTHETICS, MAYA_DECIDES_AESTHETIC } from "./aesthetics"
import { useConcierge } from "./concierge-context"
import { useIdentityReferences } from "./use-identity-references"
import { MemoryModal } from "./memory-modal"
import { trackAnalyticsEvent } from "@/lib/analytics/client"
import { startMayaJob, type MayaJobEntry } from "@/lib/app-v3/maya/job-analytics"
import {
  detectCreationIntent,
  intentForFormat,
  memberDelegatesFormatChoice,
} from "@/lib/app-v3/maya/intent-router"
import type { AppV3GalleryAsset } from "@/lib/app-v3/gallery-assets"
import type { Aesthetic, AppV3AnalyticsCohort, OutputFormat } from "./types"

interface MayaRecommendation {
  title: string
  rationale: string
  format: OutputFormat
  imageUrl?: string | null
  imageReason?: string | null
}

const FALLBACK_RECOMMENDATION: MayaRecommendation = {
  title: "Create one brand photo you can use today",
  rationale: "Start with one clear image, then Maya will help you turn it into your next post.",
  format: "photo",
}

// Started home picks rotate out for a week so the front door never re-prompts an idea she
// already took into Maya (UX audit: the card kept saying "Create this" after creation).
const STARTED_RECS_KEY = "sselfie.appV3.startedRecommendations.v1"
const STARTED_REC_TTL_MS = 7 * 24 * 60 * 60 * 1000

function readStartedRecommendations(): Set<string> {
  try {
    const raw = window.localStorage.getItem(STARTED_RECS_KEY)
    const parsed = raw ? (JSON.parse(raw) as Record<string, number>) : {}
    const now = Date.now()
    return new Set(
      Object.entries(parsed)
        .filter(([, startedAt]) => typeof startedAt === "number" && now - startedAt < STARTED_REC_TTL_MS)
        .map(([title]) => title)
    )
  } catch {
    return new Set()
  }
}

function markRecommendationStarted(title: string) {
  try {
    const raw = window.localStorage.getItem(STARTED_RECS_KEY)
    const parsed = raw ? (JSON.parse(raw) as Record<string, number>) : {}
    const now = Date.now()
    const next: Record<string, number> = {}
    for (const [key, startedAt] of Object.entries(parsed)) {
      if (typeof startedAt === "number" && now - startedAt < STARTED_REC_TTL_MS) next[key] = startedAt
    }
    next[title] = now
    window.localStorage.setItem(STARTED_RECS_KEY, JSON.stringify(next))
  } catch {
    // best effort; the card simply shows the same pick again
  }
}

const MAYA_GENERAL: Aesthetic = {
  id: "maya-general",
  name: "SSELFIE",
  blurb: "Let's make something that's truly you.",
  coverImage: "",
  thumbnails: [],
  shotCount: 0,
  intent:
    "A general SSELFIE editorial brand session. Help her decide the look from her brand, then create.",
}

const FORMAT_LABEL: Record<OutputFormat, string> = {
  photo: "Photo",
  photoshoot: "Full shoot",
  "reel-cover": "Reel cover",
  carousel: "Carousel",
  "story-slide": "Story slide",
  "story-sequence": "Stories",
  video: "Video",
}

function isOutputFormat(value: unknown): value is OutputFormat {
  return (
    value === "photo" ||
    value === "photoshoot" ||
    value === "reel-cover" ||
    value === "carousel" ||
    value === "story-slide" ||
    value === "story-sequence" ||
    value === "video"
  )
}

const FIRST_RUN_SEEN_KEY = "sselfie_app_v3_first_run_seen"

function readFirstRunSeen() {
  if (typeof window === "undefined") return false
  return window.localStorage.getItem(FIRST_RUN_SEEN_KEY) === "true"
}

function markFirstRunSeen() {
  if (typeof window === "undefined") return
  window.localStorage.setItem(FIRST_RUN_SEEN_KEY, "true")
}

function imageAsset(asset: unknown): asset is AppV3GalleryAsset {
  if (!asset || typeof asset !== "object") return false
  const item = asset as AppV3GalleryAsset
  return item.kind === "image" && typeof item.url === "string" && item.url.startsWith("http")
}

function VisualCard({
  image,
  eyebrow,
  title,
  body,
  action,
  onClick,
  priority = false,
  compact = false,
  disabled = false,
}: {
  image: string
  eyebrow: string
  title: string
  body: string
  action: string
  onClick: () => void
  priority?: boolean
  compact?: boolean
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`group relative block w-full overflow-hidden rounded-[10px] bg-[color:var(--ss-night)] text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ss-night)] focus-visible:ring-offset-2 ${
        compact ? "min-h-[300px]" : "min-h-[430px] sm:min-h-[520px]"
      } disabled:cursor-not-allowed disabled:opacity-55`}
    >
      {image ? (
        <Image
          src={image}
          alt=""
          fill
          priority={priority}
          sizes={compact ? "(max-width: 720px) 88vw, 28vw" : "(max-width: 1024px) 100vw, 54vw"}
          className="object-cover object-center opacity-95 transition-transform duration-700 ease-out group-hover:scale-[1.025]"
        />
      ) : null}
      <div className="absolute inset-0 bg-gradient-to-t from-[color:var(--ss-night)]/90 via-[color:var(--ss-night)]/20 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
        <p className="text-[10px] uppercase tracking-[0.26em] text-white/75">{eyebrow}</p>
        <h3
          className={`mt-2 font-serif font-light leading-[1.04] text-white ${
            compact ? "text-[29px]" : "text-[34px] sm:text-[46px]"
          }`}
        >
          {title}
        </h3>
        <p className="mt-2 max-w-lg text-[13px] leading-relaxed text-white/82">{body}</p>
        <span className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-[5px] bg-white px-4 text-[10px] uppercase tracking-[0.17em] text-[color:var(--ss-night)]">
          {action} <ArrowUpRight size={14} aria-hidden />
        </span>
      </div>
    </button>
  )
}

export function VisualFrontDoor({
  firstName,
  showTrialFirstRunStep = false,
  cohort = "member",
  hasSelfie: initialHasSelfie = false,
  initialPrimarySelfieUrl = null,
  onOpenFavorites,
  hasVaultAccess = false,
  preSelfieChatEnabled = false,
  videoEnabled: _videoEnabled = true,
  operatingLayerEnabled = false,
}: {
  firstName?: string | null
  showTrialFirstRunStep?: boolean
  cohort?: AppV3AnalyticsCohort
  hasSelfie?: boolean
  initialPrimarySelfieUrl?: string | null
  onOpenFavorites?: () => void
  hasVaultAccess?: boolean
  preSelfieChatEnabled?: boolean
  videoEnabled?: boolean
  operatingLayerEnabled?: boolean
} = {}) {
  const { openFresh, openHistory, openWithAesthetic, workspaceBusy } = useConcierge()
  const { hasSelfie, primarySelfieUrl, referenceCount } = useIdentityReferences(
    initialHasSelfie,
    initialPrimarySelfieUrl
  )
  const homeTrackedRef = useRef(false)
  const firstRunTrackedRef = useRef(false)
  const forYouRef = useRef<HTMLElement>(null)
  const savedRef = useRef<HTMLElement>(null)
  const recentRef = useRef<HTMLElement>(null)
  const [aesthetics, setAesthetics] = useState<Aesthetic[]>(AESTHETICS)
  const [weeklyLook, setWeeklyLook] = useState<{ aestheticId: string; name: string } | null>(null)
  const [recommendations, setRecommendations] = useState<MayaRecommendation[]>([])
  const [recommendationStatus, setRecommendationStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle")
  const [recommendationReload, setRecommendationReload] = useState(0)
  const [gallery, setGallery] = useState<AppV3GalleryAsset[]>([])
  const [firstRunAlreadySeen] = useState(readFirstRunSeen)
  const [startText, setStartText] = useState("")
  const [memoryOpen, setMemoryOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)

  const shouldShowTrialFirstRun = showTrialFirstRunStep && !hasSelfie && !firstRunAlreadySeen
  const fallbackImage = aesthetics[0]?.coverImage || AESTHETICS[0]?.coverImage || ""
  // UX audit: once she starts a pick, home must not keep re-prompting the same idea —
  // the audit found the card still saying "Create this" for a carousel already made.
  // Started picks rotate out for a week; if she started them all, the newest pick returns.
  const [startedRecEpoch, setStartedRecEpoch] = useState(0)
  const recommendation = useMemo(() => {
    void startedRecEpoch
    const started = readStartedRecommendations()
    return recommendations.find(item => !started.has(item.title)) ?? recommendations[0] ?? FALLBACK_RECOMMENDATION
  }, [recommendations, startedRecEpoch])
  const recommendationImage = recommendation.imageUrl || fallbackImage
  const alternateWorlds = useMemo(() => {
    const seenImages = new Set<string>([recommendationImage])
    return aesthetics
      .filter(item => item.coverImage && item.id !== "maya-general")
      .filter(item => {
        if (seenImages.has(item.coverImage)) return false
        seenImages.add(item.coverImage)
        return true
      })
      .slice(0, 2)
  }, [aesthetics, recommendationImage])
  const savedLooks = gallery.filter(asset => asset.isFavorite).slice(0, 4)
  const recentShoots = gallery.slice(0, 5)

  useEffect(() => {
    let alive = true
    Promise.allSettled([
      fetch("/api/app-v3/aesthetics").then(response => (response.ok ? response.json() : null)),
      fetch("/api/app-v3/gallery", { cache: "no-store" }).then(response =>
        response.ok ? response.json() : null
      ),
    ]).then(([aestheticResult, galleryResult]) => {
      if (!alive) return
      if (
        aestheticResult.status === "fulfilled" &&
        Array.isArray(aestheticResult.value?.aesthetics)
      ) {
        setAesthetics(aestheticResult.value.aesthetics)
        if (
          aestheticResult.value.weeklyLook?.aestheticId &&
          typeof aestheticResult.value.weeklyLook.name === "string"
        ) {
          setWeeklyLook({
            aestheticId: String(aestheticResult.value.weeklyLook.aestheticId),
            name: aestheticResult.value.weeklyLook.name,
          })
        }
      }
      if (galleryResult.status === "fulfilled" && Array.isArray(galleryResult.value?.assets)) {
        setGallery(galleryResult.value.assets.filter(imageAsset))
      }
    })
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (!hasSelfie) {
      setRecommendationStatus("idle")
      return
    }
    let alive = true
    setRecommendationStatus("loading")
    fetch("/api/app-v3/maya/recommendations")
      .then(response => {
        if (!response.ok) throw new Error("Recommendation request failed")
        return response.json()
      })
      .then(data => {
        if (!alive) return
        const next = Array.isArray(data?.recommendations)
          ? data.recommendations
              .filter((item: unknown): item is MayaRecommendation => {
                if (!item || typeof item !== "object") return false
                const candidate = item as Record<string, unknown>
                return (
                  typeof candidate.title === "string" &&
                  typeof candidate.rationale === "string" &&
                  isOutputFormat(candidate.format)
                )
              })
              .slice(0, 1)
          : []
        setRecommendations(next)
        setRecommendationStatus(next.length ? "ready" : "error")
      })
      .catch(() => {
        if (!alive) return
        setRecommendations([])
        setRecommendationStatus("error")
      })
    return () => {
      alive = false
    }
  }, [hasSelfie, recommendationReload])

  useEffect(() => {
    if (homeTrackedRef.current) return
    homeTrackedRef.current = true
    void trackAnalyticsEvent({
      event: "suite_home_viewed",
      properties: { cohort, hasSelfie, section: "create" },
    })
  }, [cohort, hasSelfie])

  function trackFirstAction(action: MayaJobEntry) {
    startMayaJob({ job: "create_content", surface: "create", entry: action, cohort })
    if (shouldShowTrialFirstRun && !firstRunTrackedRef.current) {
      firstRunTrackedRef.current = true
      markFirstRunSeen()
      void trackAnalyticsEvent({
        event: "suite_trial_first_run_seen",
        properties: { cohort, source: "front_door", action },
      })
    }
    void trackAnalyticsEvent({ event: "first_action_selected", properties: { cohort, action } })
  }

  function openSelfieManagerInMaya(source: "my_selfies" | "add_selfie" = "my_selfies") {
    trackFirstAction(source)
    openWithAesthetic(MAYA_DECIDES_AESTHETIC, {
      format: "photo",
      creationIdea: "Create one strong brand photo I can use today.",
      creationIntent: intentForFormat("photo", "starter_chip"),
      initialSetupAction: "selfie_manager",
      referenceSelfieUrl: primarySelfieUrl,
    })
  }

  function openInspirationManager() {
    trackFirstAction("inspiration")
    openWithAesthetic(MAYA_GENERAL, {
      format: "photo",
      creationIntent: intentForFormat("photo", "starter_chip"),
      initialSetupAction: "inspiration_manager",
      referenceSelfieUrl: primarySelfieUrl,
    })
  }

  function openRecommendation() {
    const intent = intentForFormat(recommendation.format, "content_card")
    trackFirstAction("maya_recommendation")
    markRecommendationStarted(recommendation.title)
    setStartedRecEpoch(epoch => epoch + 1)
    openWithAesthetic(MAYA_DECIDES_AESTHETIC, {
      format: recommendation.format,
      seed: `Let's create this: ${recommendation.title}. ${recommendation.rationale}`,
      creationIdea: `${recommendation.title}. ${recommendation.rationale}`,
      creationIntent: intent,
      referenceSelfieUrl: primarySelfieUrl,
    })
  }

  function openWorld(aesthetic: Aesthetic) {
    trackFirstAction("visual_world")
    openWithAesthetic(aesthetic, {
      format: "photo",
      creationIntent: intentForFormat("photo", "vault_shot"),
      referenceSelfieUrl: primarySelfieUrl,
    })
  }

  function openWeeklyLook() {
    if (!weeklyLook) return
    const matched = aesthetics.find(aesthetic => aesthetic.id === weeklyLook.aestheticId)
    if (!matched) return
    trackFirstAction("weekly_look_chip")
    openWithAesthetic(matched, {
      creationIntent: { format: null, source: "manual", confidence: "needs_clarify" },
      referenceSelfieUrl: primarySelfieUrl,
    })
  }

  function startFromText() {
    const text = startText.trim()
    const seed = text || "I know I want to create something, but I need Maya to help me choose."
    const detectedIntent = detectCreationIntent(seed, "typed")
    const intent =
      detectedIntent.format == null && memberDelegatesFormatChoice(seed)
        ? intentForFormat(recommendation.format, "typed")
        : detectedIntent
    const format = intent.format
    trackFirstAction("maya_text_start")
    void trackAnalyticsEvent({
      event: "suite_intent_detected",
      properties: {
        cohort,
        action: "maya_text_start",
        intent_label: format ?? "needs_clarify",
        ...intent,
      },
    })
    openWithAesthetic(MAYA_DECIDES_AESTHETIC, {
      format: intent.format ?? undefined,
      seed,
      creationIdea: seed,
      creationIntent: intent,
      referenceSelfieUrl: primarySelfieUrl,
    })
  }

  function continueFromAsset(asset: AppV3GalleryAsset) {
    trackFirstAction("continue_recent_shoot")
    openWithAesthetic(MAYA_GENERAL, {
      format: "photo",
      seed: "Continue this visual direction with a fresh photo that belongs to the same shoot.",
      creationIdea: "Continue this shoot.",
      creationIntent: intentForFormat("photo", "gallery_action"),
      referenceSelfieUrl: primarySelfieUrl,
      inspirationImageUrl: asset.url,
    })
  }

  const quickActions = [
    { label: "My selfies", icon: UserRound, action: () => openSelfieManagerInMaya() },
    {
      label: "For you",
      icon: Sparkles,
      action: openRecommendation,
    },
    {
      label: "Saved looks",
      icon: Heart,
      action: () => onOpenFavorites?.(),
    },
    { label: "Inspiration", icon: Lightbulb, action: openInspirationManager },
    {
      label: "Recent shoots",
      icon: History,
      action: () => recentRef.current?.scrollIntoView({ behavior: "smooth" }),
    },
    {
      label: "New",
      icon: Plus,
      action: () => openFresh({ referenceSelfieUrl: primarySelfieUrl }),
    },
  ]

  if (!hasSelfie) {
    return (
      <section className="mx-auto w-full max-w-6xl px-4 py-7 sm:px-8 sm:py-14">
        <header className="mb-7 max-w-xl sm:mb-10">
          <p className="text-[10px] uppercase tracking-[0.34em] text-[color:var(--ss-gray)]">
            Your world
          </p>
          <h1 className="mt-3 font-serif text-[34px] font-light leading-[1.03] text-[color:var(--ss-night)] sm:text-[50px]">
            {shouldShowTrialFirstRun
              ? "Hi, I'm Maya. Let's make your first photo."
              : "Your first brand photo starts here."}
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-[color:var(--ss-davy)]">
            Add one clear selfie. Maya keeps your real face, chooses one strong direction, and
            guides the rest.
          </p>
        </header>
        <VisualCard
          image={fallbackImage}
          eyebrow="SSELFIE SUITE"
          title="Start with one clear selfie."
          body="One photo is enough to begin. You can add more angles later if you want them."
          action={shouldShowTrialFirstRun ? "Add my selfie" : "Add one selfie"}
          onClick={() => openSelfieManagerInMaya("add_selfie")}
          priority
        />
        {preSelfieChatEnabled ? (
          <button
            type="button"
            onClick={() =>
              openWithAesthetic(MAYA_GENERAL, {
                creationIntent: { format: null, source: "manual", confidence: "needs_clarify" },
                initialSetupAction: "plain_chat",
              })
            }
            className="mx-auto mt-4 flex min-h-11 items-center px-3 text-[12px] text-[color:var(--ss-davy)] underline underline-offset-4"
          >
            Have a question first? Ask Maya
          </button>
        ) : null}
      </section>
    )
  }

  return (
    <section className="mx-auto w-full max-w-[1320px] px-4 py-7 sm:px-8 sm:py-12">
      <header className="flex flex-col gap-5 border-b border-[color:var(--ss-silver)]/55 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.34em] text-[color:var(--ss-gray)]">
            Your world
          </p>
          <h1 className="mt-2 font-serif text-[38px] font-light leading-none text-[color:var(--ss-night)] sm:text-[56px]">
            {firstName ? `${firstName}, what are we making?` : "What are we making?"}
          </h1>
          <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-[color:var(--ss-davy)]">
            Explore a direction, continue a shoot, or tell Maya what you need. Your identity stays
            with you across every path.
          </p>
        </div>
        {!operatingLayerEnabled ? (
          <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={openHistory}
          disabled={workspaceBusy}
          className="inline-flex min-h-11 items-center gap-2 self-start rounded-[5px] border border-[color:var(--ss-silver)] bg-white px-4 text-[10px] uppercase tracking-[0.16em] text-[color:var(--ss-night)] sm:self-auto"
        >
          <History size={15} aria-hidden /> Creative tasks
        </button>
        <button
          type="button"
          onClick={() => setMemoryOpen(true)}
          className="inline-flex min-h-11 items-center self-start px-2 text-[11px] text-[color:var(--ss-davy)] underline underline-offset-4 sm:self-auto"
        >
          What Maya knows
        </button>
          </div>
        ) : null}
      </header>

      {workspaceBusy ? (
        <p role="status" className="mt-4 text-[12px] text-[color:var(--ss-davy)]">
          Maya is finishing your current task. You can start something new when it is ready.
        </p>
      ) : null}

      {!operatingLayerEnabled ? (
      <nav
        aria-label="Create shortcuts"
        className="-mx-4 overflow-x-auto px-4 py-5 sm:-mx-8 sm:px-8"
      >
        <div className="flex min-w-max gap-2">
          {quickActions.map(({ label, icon: Icon, action }) => (
            <button
              key={label}
              type="button"
              onClick={action}
              disabled={workspaceBusy}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[color:var(--ss-silver)]/70 bg-white px-4 text-[11px] text-[color:var(--ss-davy)] transition-colors hover:border-[color:var(--ss-night)] hover:text-[color:var(--ss-night)]"
            >
              <Icon size={14} strokeWidth={1.7} aria-hidden /> {label}
            </button>
          ))}
        </div>
      </nav>
      ) : null}

      <section ref={forYouRef} aria-labelledby="for-you-heading" className="scroll-mt-5 pt-2">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.28em] text-[color:var(--ss-gray)]">
              For you
            </p>
            <h2
              id="for-you-heading"
              className="mt-1 font-serif text-[30px] font-light text-[color:var(--ss-night)] sm:text-[38px]"
            >
              Maya&apos;s pick, with room to wander.
            </h2>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-4">
            {weeklyLook && aesthetics.some(aesthetic => aesthetic.id === weeklyLook.aestheticId) ? (
              <button
                type="button"
                onClick={openWeeklyLook}
                disabled={workspaceBusy}
                className="min-h-11 text-[11px] text-[color:var(--ss-davy)] underline underline-offset-4"
              >
                New this week: {weeklyLook.name}
              </button>
            ) : null}
            {recommendationStatus === "error" ? (
              <button
                type="button"
                onClick={() => setRecommendationReload(value => value + 1)}
                disabled={workspaceBusy}
                className="min-h-11 text-[11px] text-[color:var(--ss-davy)] underline underline-offset-4"
              >
                Refresh Maya&apos;s pick
              </button>
            ) : null}
          </div>
        </div>
        <div
          className={
            operatingLayerEnabled
              ? "grid gap-4"
              : "grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.75fr)]"
          }
        >
          <VisualCard
            image={recommendationImage}
            eyebrow={
              recommendationStatus === "loading"
                ? "Maya is choosing"
                : `Maya recommends · ${FORMAT_LABEL[recommendation.format]}`
            }
            title={recommendation.title}
            body={recommendation.rationale}
            action="Create this with Maya"
            onClick={openRecommendation}
            disabled={workspaceBusy}
            priority
          />
          {!operatingLayerEnabled ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            {alternateWorlds.map(world => (
              <VisualCard
                key={world.id}
                image={world.coverImage}
                eyebrow="Another direction"
                title={world.name}
                body={world.blurb}
                action="Recreate this look"
                onClick={() => openWorld(world)}
                compact
                disabled={workspaceBusy}
              />
            ))}
          </div>
          ) : null}
        </div>
      </section>

      <section className="my-12 rounded-[10px] border border-[color:var(--ss-silver)]/60 bg-white p-5 sm:p-7">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <label className="block min-w-0">
            <span className="text-[10px] uppercase tracking-[0.28em] text-[color:var(--ss-gray)]">
              Tell Maya what you need
            </span>
            <textarea
              value={startText}
              onChange={event => setStartText(event.target.value)}
              disabled={workspaceBusy}
              rows={2}
              placeholder="A launch photo, a full shoot, a Reel cover…"
              className="mt-3 min-h-[92px] w-full resize-none border-0 border-b border-[color:var(--ss-silver)] bg-transparent px-0 py-3 font-serif text-[24px] font-light leading-tight text-[color:var(--ss-night)] outline-none placeholder:text-[color:var(--ss-gray)] focus:border-[color:var(--ss-night)]"
            />
          </label>
          <button
            type="button"
            onClick={startFromText}
            disabled={workspaceBusy}
            className="min-h-12 rounded-[5px] bg-[color:var(--ss-night)] px-6 text-[11px] uppercase tracking-[0.18em] text-white"
          >
            Start with Maya
          </button>
        </div>
        {hasVaultAccess ? (
          <p className="mt-3 text-[11px] text-[color:var(--ss-gray)]">
            Your Vault styles are already available inside Maya.
          </p>
        ) : null}
      </section>

      {operatingLayerEnabled ? (
        <div className="-mt-7 mb-10">
          <button
            type="button"
            onClick={() => setMoreOpen(open => !open)}
            aria-expanded={moreOpen}
            aria-controls="maya-create-more"
            className="inline-flex min-h-11 items-center rounded-[5px] border border-[color:var(--ss-silver)] bg-white px-4 text-[10px] uppercase tracking-[0.16em] text-[color:var(--ss-night)]"
          >
            {moreOpen ? "Hide creation options" : "More creation options"}
          </button>
        </div>
      ) : null}

      {operatingLayerEnabled && moreOpen ? (
        <div id="maya-create-more" className="border-t border-[color:var(--ss-silver)]/55 pt-6">
          <div className="flex flex-wrap gap-2" aria-label="More creation options">
            {quickActions.map(({ label, icon: Icon, action }) => (
              <button
                key={label}
                type="button"
                onClick={action}
                disabled={workspaceBusy}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[color:var(--ss-silver)]/70 bg-white px-4 text-[11px] text-[color:var(--ss-davy)] transition-colors hover:border-[color:var(--ss-night)] hover:text-[color:var(--ss-night)]"
              >
                <Icon size={14} strokeWidth={1.7} aria-hidden /> {label}
              </button>
            ))}
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {alternateWorlds.map(world => (
              <VisualCard
                key={world.id}
                image={world.coverImage}
                eyebrow="Another direction"
                title={world.name}
                body={world.blurb}
                action="Recreate this look"
                onClick={() => openWorld(world)}
                compact
                disabled={workspaceBusy}
              />
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-4">
            <button
              type="button"
              onClick={openHistory}
              disabled={workspaceBusy}
              className="min-h-11 text-[11px] text-[color:var(--ss-davy)] underline underline-offset-4"
            >
              History
            </button>
            <button
              type="button"
              onClick={() => setMemoryOpen(true)}
              className="min-h-11 text-[11px] text-[color:var(--ss-davy)] underline underline-offset-4"
            >
              What Maya knows
            </button>
          </div>
        </div>
      ) : null}

      {!operatingLayerEnabled || moreOpen ? (
        <>
      <section
        ref={savedRef}
        aria-labelledby="saved-heading"
        className="scroll-mt-5 border-t border-[color:var(--ss-silver)]/55 py-10"
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.28em] text-[color:var(--ss-gray)]">
              Saved looks
            </p>
            <h2
              id="saved-heading"
              className="mt-1 font-serif text-[30px] font-light text-[color:var(--ss-night)]"
            >
              The directions you kept.
            </h2>
          </div>
          <span className="text-[11px] text-[color:var(--ss-gray)]">
            {savedLooks.length || 0} saved
          </span>
        </div>
        {savedLooks.length ? (
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {savedLooks.map(asset => (
              <button
                key={asset.id}
                type="button"
                onClick={() => continueFromAsset(asset)}
                disabled={workspaceBusy}
                className="group text-left"
              >
                <span className="relative block aspect-[4/5] overflow-hidden rounded-[7px] bg-[color:var(--ss-silver)]/30">
                  <Image
                    src={asset.url}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 48vw, 22vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.025]"
                  />
                </span>
                <span className="mt-2 block text-[11px] text-[color:var(--ss-davy)]">
                  Continue this shoot
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-[8px] border border-dashed border-[color:var(--ss-silver)] p-6 text-[13px] leading-relaxed text-[color:var(--ss-gray)]">
            Keep a result in Maya or tap the heart in Gallery and it will appear here.
          </div>
        )}
      </section>

      <section
        ref={recentRef}
        aria-labelledby="recent-heading"
        className="scroll-mt-5 border-t border-[color:var(--ss-silver)]/55 py-10"
      >
        <div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-[color:var(--ss-gray)]">
            Recent shoots
          </p>
          <h2
            id="recent-heading"
            className="mt-1 font-serif text-[30px] font-light text-[color:var(--ss-night)]"
          >
            Pick up where you left off.
          </h2>
        </div>
        {recentShoots.length ? (
          <div className="-mx-4 mt-5 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
            {recentShoots.map(asset => (
              <button
                key={asset.id}
                type="button"
                onClick={() => continueFromAsset(asset)}
                disabled={workspaceBusy}
                className="group w-[190px] shrink-0 snap-start text-left sm:w-[220px]"
              >
                <span className="relative block aspect-[4/5] overflow-hidden rounded-[7px] bg-[color:var(--ss-silver)]/30">
                  <Image
                    src={asset.url}
                    alt=""
                    fill
                    sizes="220px"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.025]"
                  />
                </span>
                <span className="mt-2 flex items-center justify-between gap-2 text-[11px] text-[color:var(--ss-davy)]">
                  Continue this shoot <ArrowUpRight size={13} aria-hidden />
                </span>
              </button>
            ))}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => openFresh({ referenceSelfieUrl: primarySelfieUrl })}
            disabled={workspaceBusy}
            className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-[5px] border border-[color:var(--ss-night)] px-5 text-[11px] uppercase tracking-[0.16em] text-[color:var(--ss-night)]"
          >
            <Images size={15} aria-hidden /> Start your first shoot
          </button>
        )}
      </section>

      <footer className="border-t border-[color:var(--ss-silver)]/55 py-6 text-[11px] text-[color:var(--ss-gray)]">
        {referenceCount > 0
          ? `${referenceCount} identity ${referenceCount === 1 ? "reference" : "references"} ready for Maya.`
          : "Your saved identity will appear here when it is ready."}
      </footer>
        </>
      ) : null}
      <MemoryModal
        open={memoryOpen}
        onClose={() => setMemoryOpen(false)}
        onSaved={() => setRecommendationReload(current => current + 1)}
      />
    </section>
  )
}
