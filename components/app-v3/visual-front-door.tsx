"use client"

// SSELFIE Studio 3.0 - Visual Front Door.
// A quiet, editorial grid of Prompt Vault aesthetics. Click a vibe to start (this is the
// decision-fatigue remover). Picking a tile hands off to Maya with the vibe preloaded.
// Design system: light luxury editorial - Seasalt surfaces, Night for contrast, Cormorant
// display, generous spacing, no icons/emojis, no gradients/color.

import { memo, useEffect, useRef, useState } from "react"
import Image from "next/image"
import { AESTHETICS } from "./aesthetics"
import { useConcierge } from "./concierge-context"
import { trackAnalyticsEvent } from "@/lib/analytics/client"
import { detectCreationIntent, intentForFormat } from "@/lib/app-v3/maya/intent-router"
import type { Aesthetic, AestheticShot, AppV3AnalyticsCohort, OutputFormat } from "./types"

const MAYA_BLANK: Aesthetic = {
  id: "maya-blank",
  name: "Maya",
  blurb: "Start from your own idea.",
  coverImage: "",
  thumbnails: [],
  shotCount: 0,
  intent:
    "A blank SSELFIE creation session. Ask what she wants to make, then guide her with simple choices.",
}

const FORMAT_STARTERS: { format: OutputFormat; label: string; line: string }[] = [
  { format: "photo", label: "Photo", line: "One clear selfie into a photo you can post." },
  { format: "photoshoot", label: "Photoshoot", line: "A small shoot in one visual world." },
  {
    format: "reel-cover",
    label: "Reel cover",
    line: "A clear cover for the idea you are sharing.",
  },
  { format: "carousel", label: "Carousel", line: "Teach one useful idea in a simple slide flow." },
  {
    format: "story-slide",
    label: "Story",
    line: "A quick story frame for a poll, offer, or reminder.",
  },
  {
    format: "story-sequence",
    label: "Story sequence",
    line: "A full multi-slide story in one clear world.",
  },
  { format: "video", label: "Video", line: "Add subtle motion to a photo you already made." },
]

const STARTER_CHIPS: { format: OutputFormat; label: string; prompt: string }[] = [
  {
    format: "photo",
    label: "Make my first photo",
    prompt: "I want to make my first photo from one selfie.",
  },
  {
    format: "photoshoot",
    label: "Create a full shoot",
    prompt: "I want to create a full shoot in one visual world.",
  },
  {
    format: "reel-cover",
    label: "Make a reel cover",
    prompt: "I want to make a Reel cover.",
  },
  {
    format: "carousel",
    label: "Turn an idea into a carousel",
    prompt: "I want to turn an idea into a carousel.",
  },
  {
    format: "story-sequence",
    label: "Make stories",
    prompt: "I want to make a story sequence.",
  },
]

const FIRST_RUN_SEEN_KEY = "sselfie_app_v3_first_run_seen"

function readFirstRunSeen() {
  if (typeof window === "undefined") return false
  return window.localStorage.getItem(FIRST_RUN_SEEN_KEY) === "true"
}

function markFirstRunSeen() {
  if (typeof window === "undefined") return
  window.localStorage.setItem(FIRST_RUN_SEEN_KEY, "true")
}

// Memoized + receives onOpen as a STABLE prop, so opening the concierge (which changes the
// concierge context value) does NOT re-render every image tile. Subscribing each tile to the
// context made all tiles re-render on open, a long synchronous commit that tripped INP.
const AestheticTile = memo(function AestheticTile({
  aesthetic,
  index,
  onOpen,
}: {
  aesthetic: Aesthetic
  index: number
  onOpen: (a: Aesthetic) => void
}) {
  // Vary tile height slightly for an editorial, non-uniform masonry rhythm.
  const tall = index % 3 === 0
  return (
    <button
      type="button"
      onClick={() => onOpen(aesthetic)}
      className="group relative block w-full overflow-hidden rounded-[2px] bg-[#FFFFFF] text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D0E10]"
      aria-label={`Start a shoot in the ${aesthetic.name} look`}
    >
      <div className={`relative w-full ${tall ? "aspect-[3/4]" : "aspect-[4/5]"}`}>
        <Image
          src={aesthetic.coverImage}
          alt={aesthetic.name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0D0E10]/55 via-transparent to-transparent opacity-90" />
        <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
          <p className="font-serif text-[18px] sm:text-[20px] font-light leading-tight text-white">
            {aesthetic.name}
          </p>
          <p className="mt-1 text-[12px] leading-snug text-white/80">{aesthetic.blurb}</p>
        </div>
      </div>
    </button>
  )
})

const LookbookAction = memo(function LookbookAction({
  image,
  eyebrow,
  title,
  body,
  action,
  onClick,
  tall = false,
}: {
  image: string
  eyebrow: string
  title: string
  body: string
  action: string
  onClick: () => void
  tall?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative block min-h-[240px] w-full overflow-hidden rounded-[8px] bg-[#0D0E10] text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D0E10] ${
        tall ? "sm:min-h-[430px]" : "sm:min-h-[208px]"
      }`}
    >
      {image && (
        <Image
          src={image}
          alt=""
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover opacity-90 transition-transform duration-700 ease-out group-hover:scale-[1.025]"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0D0E10]/85 via-[#0D0E10]/25 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
        <p className="text-[10px] uppercase tracking-[0.28em] text-white/70">{eyebrow}</p>
        <p className="mt-2 font-serif text-[28px] font-light leading-[1.02] text-white sm:text-[36px]">
          {title}
        </p>
        <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-white/80">{body}</p>
        <span className="mt-4 inline-flex min-h-10 items-center rounded-[4px] bg-white px-4 py-2 text-[10px] uppercase tracking-[0.18em] text-[#0D0E10] transition-colors group-hover:bg-[#F8FAFA]">
          {action}
        </span>
      </div>
    </button>
  )
})

function compactAestheticForMaya(aesthetic: Aesthetic, selectedShot: AestheticShot): Aesthetic {
  return {
    ...aesthetic,
    coverImage: selectedShot.image || aesthetic.coverImage,
    thumbnails: [selectedShot.image, ...aesthetic.thumbnails]
      .filter((url): url is string => typeof url === "string" && url.length > 0)
      .slice(0, 4),
    shots: [],
    selectedShot,
    intent: [
      aesthetic.intent,
      `Selected shot: ${selectedShot.title}.`,
      selectedShot.whenToUse ? `Use case: ${selectedShot.whenToUse}` : "",
      selectedShot.mood ? `Mood: ${selectedShot.mood}` : "",
    ]
      .filter(Boolean)
      .join(" "),
  }
}

function ShotPickerDialog({
  aesthetic,
  onClose,
  onSelect,
}: {
  aesthetic: Aesthetic
  onClose: () => void
  onSelect: (shot: AestheticShot) => void
}) {
  const shots = aesthetic.shots ?? []

  return (
    <div className="fixed inset-0 z-[80] bg-[#0D0E10]/55 px-3 py-4 backdrop-blur-sm sm:px-6 sm:py-8">
      <div className="mx-auto flex h-full max-w-6xl flex-col overflow-hidden rounded-[8px] bg-[#F8FAFA] shadow-[0_30px_80px_rgba(13,14,16,0.22)]">
        <div className="flex items-start justify-between gap-5 border-b border-[#C5C6C8]/55 px-5 py-5 sm:px-7">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-[#818283]">Choose the shot</p>
            <h2 className="mt-2 font-serif text-[30px] font-light leading-[1.05] text-[#0D0E10] sm:text-[40px]">
              {aesthetic.name}
            </h2>
            <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-[#6D6E70]">
              Pick the exact frame you want Maya to recreate with your selfie. The vibe stays the
              same, but this shot becomes the reference.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-10 rounded-[4px] border border-[#C5C6C8] px-4 text-[10px] uppercase tracking-[0.18em] text-[#0D0E10] transition-colors hover:border-[#0D0E10]"
          >
            Close
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-7">
          <div className="grid grid-cols-1 gap-3 min-[460px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {shots.map((shot, index) => (
              <button
                key={shot.id || `${shot.title}-${index}`}
                type="button"
                onClick={() => onSelect(shot)}
                className="group overflow-hidden rounded-[7px] border border-[#D8D9DA] bg-white text-left transition-colors hover:border-[#0D0E10]/55 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D0E10]"
              >
                <div className="relative aspect-[4/5] w-full overflow-hidden bg-[#E9EAEB]">
                  <Image
                    src={shot.image}
                    alt={shot.title}
                    fill
                    sizes="(max-width: 640px) 90vw, (max-width: 1024px) 42vw, 25vw"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.025]"
                  />
                </div>
                <div className="p-4">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-[#818283]">
                    Shot {index + 1}
                  </p>
                  <p className="mt-2 text-[14px] font-medium leading-snug text-[#0D0E10]">
                    {shot.title}
                  </p>
                  {shot.whenToUse && (
                    <p className="mt-2 line-clamp-3 text-[12px] leading-relaxed text-[#6D6E70]">
                      {shot.whenToUse}
                    </p>
                  )}
                  <span className="mt-4 inline-flex min-h-9 items-center rounded-[4px] bg-[#0D0E10] px-3 text-[10px] uppercase tracking-[0.16em] text-white transition-colors group-hover:bg-[#282728]">
                    Use this shot
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export function VisualFrontDoor({
  // MAYA-ADMIN-01: header copy is overridable so the admin mount doesn't show member
  // marketing lines. Defaults keep /app exactly as it was.
  eyebrow = "SSELFIE Studio",
  title = "Start with one clear next step.",
  subtitle = "Choose what you want to make, add your selfie, or start from a look. Maya will guide the next step.",
  note = "Included in SSELFIE SUITE: monthly credits · brand photos · content help · your gallery",
  compact = false,
  showTrialFirstRunStep = false,
  cohort = "member",
  hasSelfie = false,
  hasTrainedModel = false,
  onUseTrainedModel,
  videoEnabled = true,
}: {
  eyebrow?: string
  title?: string
  subtitle?: string
  note?: string | null
  compact?: boolean
  showTrialFirstRunStep?: boolean
  cohort?: AppV3AnalyticsCohort
  hasSelfie?: boolean
  hasTrainedModel?: boolean
  onUseTrainedModel?: () => void
  /** VIDEO reliability kill switch: false removes the Video starter tile. */
  videoEnabled?: boolean
} = {}) {
  // Subscribe to the context ONCE here, not in every tile. openWithAesthetic is a stable
  // useCallback, so the memoized tiles below never re-render when the concierge opens.
  const { openWithAesthetic } = useConcierge()
  const firstRunSelfieInputRef = useRef<HTMLInputElement>(null)
  const homeTrackedRef = useRef(false)
  const firstRunTrackedRef = useRef(false)
  const [aesthetics, setAesthetics] = useState<Aesthetic[]>(AESTHETICS)
  const [weeklyLook, setWeeklyLook] = useState<{ aestheticId: string; oneLiner: string } | null>(
    null
  )
  const [frontDoorUploading, setFrontDoorUploading] = useState(false)
  const [frontDoorUploadError, setFrontDoorUploadError] = useState<string | null>(null)
  const [frontDoorHasSelfie, setFrontDoorHasSelfie] = useState(hasSelfie)
  const [firstRunAlreadySeen] = useState(readFirstRunSeen)
  const [shotPickerAesthetic, setShotPickerAesthetic] = useState<Aesthetic | null>(null)
  const [startText, setStartText] = useState("")
  const [manualOpen, setManualOpen] = useState(false)

  const effectiveHasSelfie = hasSelfie || frontDoorHasSelfie
  const shouldShowTrialFirstRun = showTrialFirstRunStep && !effectiveHasSelfie && !firstRunAlreadySeen

  useEffect(() => {
    let alive = true
    fetch("/api/app-v3/aesthetics")
      .then(response => (response.ok ? response.json() : null))
      .then(data => {
        if (!alive || !Array.isArray(data?.aesthetics) || data.aesthetics.length === 0) return
        setAesthetics(data.aesthetics)
        if (data.weeklyLook?.aestheticId) {
          setWeeklyLook({
            aestheticId: String(data.weeklyLook.aestheticId),
            oneLiner: typeof data.weeklyLook.oneLiner === "string" ? data.weeklyLook.oneLiner : "",
          })
        }
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    setFrontDoorHasSelfie(hasSelfie)
  }, [hasSelfie])

  useEffect(() => {
    if (homeTrackedRef.current) return
    homeTrackedRef.current = true
    void trackAnalyticsEvent({
      event: "suite_home_viewed",
      properties: { cohort, hasSelfie: effectiveHasSelfie, section: "create" },
    })
  }, [cohort, effectiveHasSelfie])

  useEffect(() => {
    if (!shouldShowTrialFirstRun || firstRunTrackedRef.current) return
    firstRunTrackedRef.current = true
    markFirstRunSeen()
    void trackAnalyticsEvent({
      event: "suite_trial_first_run_seen",
      properties: { cohort, source: "front_door" },
    })
  }, [cohort, shouldShowTrialFirstRun])

  // The same rotating look the Monday email announces, matched server-side to a tile.
  const weeklyAesthetic = weeklyLook
    ? (aesthetics.find(a => a.id === weeklyLook.aestheticId) ?? null)
    : null

  const heroImage = aesthetics[0]?.coverImage || AESTHETICS[0]?.coverImage || ""
  const selfieImage = aesthetics[1]?.coverImage || heroImage

  function trackFirstAction(action: string) {
    void trackAnalyticsEvent({
      event: "first_action_selected",
      properties: { cohort, action },
    })
  }

  function trackInlineStart(action: string, format: OutputFormat | null, confidence: string) {
    void trackAnalyticsEvent({
      event: "suite_maya_inline_started",
      properties: { cohort, action, format, confidence },
    })
    void trackAnalyticsEvent({
      event: "suite_intent_detected",
      properties: { cohort, action, format, confidence },
    })
  }

  function startFromText() {
    const text = startText.trim()
    const seed = text || "I know I want to create something, but I need Maya to help me choose."
    const intent = detectCreationIntent(seed, "typed")
    trackFirstAction("maya_text_start")
    trackInlineStart("typed_start", intent.format, intent.confidence)
    openWithAesthetic(MAYA_BLANK, {
      format: intent.format ?? undefined,
      seed,
      creationIntent: intent,
    })
  }

  function openStarterChip(item: (typeof STARTER_CHIPS)[number]) {
    const intent = intentForFormat(item.format, "starter_chip")
    trackFirstAction(`starter_${item.format}`)
    trackInlineStart("starter_chip", intent.format, intent.confidence)
    openWithAesthetic(MAYA_BLANK, {
      format: item.format,
      seed: item.prompt,
      creationIntent: intent,
    })
  }

  function openSelfieStart() {
    trackFirstAction("add_selfie")
    const intent = intentForFormat("photo", "starter_chip")
    openWithAesthetic(MAYA_BLANK, {
      format: "photo",
      seed: "I want to start with one selfie and make a photo I can post.",
      creationIntent: intent,
    })
  }

  function openFormat(format: OutputFormat, label: string) {
    trackFirstAction(`format_${format}`)
    const intent = intentForFormat(format, "manual")
    trackInlineStart("manual_format", intent.format, intent.confidence)
    openWithAesthetic(MAYA_BLANK, {
      format,
      seed: `Let's create a ${label.toLowerCase()}.`,
      creationIntent: intent,
    })
  }

  function openAesthetic(aesthetic: Aesthetic) {
    if (aesthetic.shots?.length) {
      trackFirstAction("vault_look_shots")
      setShotPickerAesthetic(aesthetic)
      return
    }
    trackFirstAction("vault_look")
    openWithAesthetic(aesthetic)
  }

  function openAestheticShot(aesthetic: Aesthetic, shot: AestheticShot) {
    trackFirstAction("vault_shot")
    setShotPickerAesthetic(null)
    openWithAesthetic(compactAestheticForMaya(aesthetic, shot), {
      seed: `I want to recreate the "${shot.title}" shot from this vibe with my selfie.`,
      creationIntent: intentForFormat("photo", "vault_shot"),
    })
  }

  function openTrainedModel() {
    trackFirstAction("use_trained_model")
    onUseTrainedModel?.()
  }

  async function handleFirstRunSelfie(file: File) {
    setFrontDoorUploading(true)
    setFrontDoorUploadError(null)
    try {
      const form = new FormData()
      form.append("file", file)
      form.append("slot", "face")
      const res = await fetch("/api/app-v3/upload-selfie", { method: "POST", body: form })
      const data = (await res.json().catch(() => null)) as { url?: string; error?: string } | null
      if (!res.ok || !data?.url) throw new Error(data?.error || "Upload failed")
      setFrontDoorHasSelfie(true)
      void trackAnalyticsEvent({
        event: "activation_selfie_uploaded",
        properties: { cohort, source: "front_door" },
      })
      openWithAesthetic(MAYA_BLANK, {
        format: "photo",
        referenceSelfieUrl: data.url,
        seed: "I added my selfie. Help me make my first photo.",
      })
    } catch (e) {
      setFrontDoorUploadError(e instanceof Error ? e.message : "Upload failed")
    } finally {
      setFrontDoorUploading(false)
    }
  }

  return (
    <section className={compact ? "w-full" : "mx-auto w-full max-w-6xl px-4 py-7 sm:px-8 sm:py-16"}>
      <header className={compact ? "mb-6" : "mb-7 sm:mb-10"}>
        <p className="text-[10px] uppercase tracking-[0.34em] text-[#818283]">{eyebrow}</p>
        <h1
          className={`mt-3 font-serif font-light leading-[1.05] text-[#0D0E10] ${
            compact ? "text-[27px] sm:text-[34px]" : "text-[32px] sm:text-[46px]"
          }`}
        >
          {title}
        </h1>
        <p className="mt-3 max-w-md text-[15px] leading-relaxed text-[#4F5052]">{subtitle}</p>
        {note && <p className="mt-4 max-w-xl text-[12px] leading-relaxed text-[#818283]">{note}</p>}
      </header>

      {shouldShowTrialFirstRun && (
        <div className="mb-9">
          <LookbookAction
            image={selfieImage}
            eyebrow="SSELFIE SUITE"
            title="Hi, I'm Maya. Let's make your first photo."
            body="Add one clear selfie and I'll keep your real face, then build the rest around you."
            action={frontDoorUploading ? "Uploading..." : "Add my selfie"}
            tall
            onClick={() => {
              trackFirstAction("add_selfie")
              firstRunSelfieInputRef.current?.click()
            }}
          />
          {frontDoorUploadError && (
            <p className="mt-3 text-[13px] leading-relaxed text-[#282728]">
              {frontDoorUploadError}
            </p>
          )}
          <input
            ref={firstRunSelfieInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0]
              if (file) void handleFirstRunSelfie(file)
              if (firstRunSelfieInputRef.current) firstRunSelfieInputRef.current.value = ""
            }}
          />
        </div>
      )}

      {!shouldShowTrialFirstRun && !compact && (
        <div className="mb-9 overflow-hidden rounded-[10px] border border-[#C5C6C8]/60 bg-white">
          <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="min-w-0 p-5 sm:p-7">
              <p className="text-[10px] uppercase tracking-[0.3em] text-[#818283]">
                Start with Maya
              </p>
              <h2 className="mt-3 font-serif text-[30px] font-light leading-[1.04] text-[#0D0E10] sm:text-[42px]">
                What do you want to make today?
              </h2>
              <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-[#4F5052]">
                Tell Maya in your own words. She will choose the path, ask only what she needs, and
                keep the next step in front of you.
              </p>

              <form
                className="mt-5 space-y-3"
                onSubmit={event => {
                  event.preventDefault()
                  startFromText()
                }}
              >
                <label className="block">
                  <span className="sr-only">Tell Maya what you want to make</span>
                  <textarea
                    value={startText}
                    onChange={event => setStartText(event.target.value)}
                    rows={3}
                    placeholder="Example: I need a reel cover for my new offer"
                    className="min-h-[112px] w-full resize-none rounded-[7px] border border-[#C5C6C8]/70 bg-[#F8FAFA] px-4 py-3 text-[15px] leading-relaxed text-[#282728] outline-none transition-colors placeholder:text-[#9B9C9D] focus:border-[#0D0E10]"
                  />
                </label>
                <button
                  type="submit"
                  className="min-h-12 w-full rounded-[5px] bg-[#0D0E10] px-5 py-3 text-[11px] uppercase tracking-[0.18em] text-white transition-colors hover:bg-[#282728] sm:w-auto"
                >
                  Ask Maya
                </button>
              </form>

              <div className="mt-5 flex flex-wrap gap-2">
                {STARTER_CHIPS.filter(item => videoEnabled || item.format !== "video").map(item => (
                  <button
                    key={item.format}
                    type="button"
                    onClick={() => openStarterChip(item)}
                    className="min-h-10 rounded-full border border-[#C5C6C8]/70 bg-white px-3.5 py-2 text-[12px] text-[#4F5052] transition-colors hover:border-[#0D0E10] hover:text-[#0D0E10]"
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={() => setManualOpen(open => !open)}
                  className="inline-flex min-h-11 items-center text-[11px] uppercase tracking-[0.16em] text-[#4F5052] underline underline-offset-4 hover:text-[#0D0E10]"
                >
                  {manualOpen ? "Hide manual choices" : "Choose manually"}
                </button>
                {hasTrainedModel && onUseTrainedModel && (
                  <button
                    type="button"
                    onClick={openTrainedModel}
                    className="inline-flex min-h-11 items-center text-[11px] uppercase tracking-[0.16em] text-[#4F5052] underline underline-offset-4 hover:text-[#0D0E10]"
                  >
                    Use my trained model
                  </button>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={openSelfieStart}
              className="group relative min-h-[260px] overflow-hidden bg-[#0D0E10] text-left lg:min-h-full"
            >
              {heroImage && (
                <Image
                  src={heroImage}
                  alt=""
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover opacity-90 transition-transform duration-700 ease-out group-hover:scale-[1.025]"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0D0E10]/85 via-[#0D0E10]/25 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
                <p className="text-[10px] uppercase tracking-[0.28em] text-white/75">
                  Fastest path
                </p>
                <p className="mt-2 font-serif text-[30px] font-light leading-[1.04] text-white sm:text-[40px]">
                  Start with one selfie.
                </p>
                <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-white/82">
                  Maya keeps your real face, then pulls the look, format, and next step around it.
                </p>
                <span className="mt-4 inline-flex min-h-10 items-center rounded-[4px] bg-white px-4 text-[10px] uppercase tracking-[0.18em] text-[#0D0E10] transition-colors group-hover:bg-[#F8FAFA]">
                  Add one selfie
                </span>
              </div>
            </button>
          </div>
        </div>
      )}

      {!shouldShowTrialFirstRun && !compact && manualOpen && (
        <div className="mb-10 border-y border-[#C5C6C8]/50 py-4">
          <p className="mb-3 text-[10px] uppercase tracking-[0.26em] text-[#818283]">
            Manual format choices
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {FORMAT_STARTERS.filter(item => videoEnabled || item.format !== "video").map(item => (
              <button
                key={item.format}
                type="button"
                onClick={() => openFormat(item.format, item.label)}
                className="min-h-[92px] rounded-[6px] border border-[#C5C6C8]/60 bg-white px-3 py-3 text-left transition-colors hover:border-[#0D0E10]/40 active:translate-y-px"
              >
                <span className="block text-[12px] uppercase tracking-[0.18em] text-[#0D0E10]">
                  {item.label}
                </span>
                <span className="mt-2 block text-[12px] leading-relaxed text-[#6D6E70]">
                  {item.line}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {!shouldShowTrialFirstRun && !compact && manualOpen && (
        <div className="mb-5">
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#818283]">
            Start from a Vault look
          </p>
          <p className="mt-2 max-w-md text-[13px] leading-relaxed text-[#6D6E70]">
            Optional. Use these when you want the visual world chosen before Maya starts.
          </p>
        </div>
      )}

      {/* This week's look: the same drop the Monday email announces, one tap into Maya. */}
      {!shouldShowTrialFirstRun && !compact && manualOpen && weeklyAesthetic && (
        <div className="mb-4">
          <button
            type="button"
            onClick={() => openAesthetic(weeklyAesthetic)}
            className="group relative block w-full overflow-hidden rounded-[8px] bg-[#0D0E10] text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D0E10]"
            aria-label={`Start a shoot in this week's look, ${weeklyAesthetic.name}`}
          >
            <div className="relative min-h-[220px] w-full sm:min-h-[260px]">
              <Image
                src={weeklyAesthetic.coverImage}
                alt=""
                fill
                sizes="(max-width: 1024px) 100vw, 896px"
                className="object-cover opacity-90 transition-transform duration-700 ease-out group-hover:scale-[1.02]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0D0E10]/85 via-[#0D0E10]/25 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                <p className="text-[10px] uppercase tracking-[0.28em] text-white/80">
                  New this week
                </p>
                <p className="mt-2 font-serif text-[26px] font-light leading-[1.05] text-white sm:text-[32px]">
                  {weeklyAesthetic.name}
                </p>
                <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-white/80">
                  {weeklyLook?.oneLiner || weeklyAesthetic.blurb}
                </p>
              </div>
            </div>
          </button>
        </div>
      )}

      {/* Editorial masonry: CSS columns for an organic, Pinterest-style flow. */}
      {!shouldShowTrialFirstRun && (!compact ? manualOpen : true) && (
        <div className="[column-fill:_balance] columns-1 gap-3 min-[380px]:columns-2 sm:columns-3 sm:gap-4 lg:columns-4">
          {aesthetics.map((aesthetic, i) => (
            <div key={aesthetic.id} className="mb-3 break-inside-avoid sm:mb-4">
              <AestheticTile aesthetic={aesthetic} index={i} onOpen={openAesthetic} />
            </div>
          ))}
        </div>
      )}

      {shotPickerAesthetic && (
        <ShotPickerDialog
          aesthetic={shotPickerAesthetic}
          onClose={() => setShotPickerAesthetic(null)}
          onSelect={shot => openAestheticShot(shotPickerAesthetic, shot)}
        />
      )}
    </section>
  )
}
