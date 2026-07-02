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
import type { Aesthetic, AppV3AnalyticsCohort, OutputFormat } from "./types"

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
  const [aesthetics, setAesthetics] = useState<Aesthetic[]>(AESTHETICS)
  const [weeklyLook, setWeeklyLook] = useState<{ aestheticId: string; oneLiner: string } | null>(
    null
  )
  const [frontDoorUploading, setFrontDoorUploading] = useState(false)
  const [frontDoorUploadError, setFrontDoorUploadError] = useState<string | null>(null)
  const [frontDoorHasSelfie, setFrontDoorHasSelfie] = useState(hasSelfie)

  const effectiveHasSelfie = hasSelfie || frontDoorHasSelfie
  const shouldShowTrialFirstRun = showTrialFirstRunStep && !effectiveHasSelfie

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

  // The same rotating look the Monday email announces, matched server-side to a tile.
  const weeklyAesthetic = weeklyLook
    ? (aesthetics.find(a => a.id === weeklyLook.aestheticId) ?? null)
    : null

  const heroImage = aesthetics[0]?.coverImage || AESTHETICS[0]?.coverImage || ""
  const selfieImage = aesthetics[1]?.coverImage || heroImage
  const formatImage = aesthetics[2]?.coverImage || heroImage

  function trackFirstAction(action: string) {
    void trackAnalyticsEvent({
      event: "first_action_selected",
      properties: { cohort, action },
    })
  }

  function openBlank() {
    trackFirstAction("start_blank")
    openWithAesthetic(MAYA_BLANK)
  }

  function openSelfieStart() {
    trackFirstAction("add_selfie")
    openWithAesthetic(MAYA_BLANK, {
      format: "photo",
      seed: "I want to start with one selfie and make a photo I can post.",
    })
  }

  function openFormatPicker() {
    trackFirstAction("pick_format")
    openWithAesthetic(MAYA_BLANK)
  }

  function openFormat(format: OutputFormat, label: string) {
    trackFirstAction(`format_${format}`)
    openWithAesthetic(MAYA_BLANK, {
      format,
      seed: `Let's create a ${label.toLowerCase()}.`,
    })
  }

  function openAesthetic(aesthetic: Aesthetic) {
    trackFirstAction("vault_look")
    openWithAesthetic(aesthetic)
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
        <div className="mb-9 grid grid-cols-1 gap-3 lg:grid-cols-[1.2fr_0.8fr] lg:gap-4">
          <LookbookAction
            image={heroImage}
            eyebrow="Blank start"
            title="Tell Maya what you want."
            body="No look required. Start with an idea, a product, a caption, a photo, or the content you need today."
            action="Start blank"
            tall
            onClick={openBlank}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1 lg:gap-4">
            <LookbookAction
              image={selfieImage}
              eyebrow="Fastest path"
              title="Start with one selfie."
              body="Best when you want the first photo, cover, or content direction without overthinking it."
              action="Add one selfie"
              onClick={openSelfieStart}
            />
            {hasTrainedModel && onUseTrainedModel ? (
              <LookbookAction
                image={formatImage}
                eyebrow="Saved model"
                title="Use your trained model."
                body="Create with the model you already trained, inside Maya."
                action="Use my model"
                onClick={openTrainedModel}
              />
            ) : (
              <LookbookAction
                image={formatImage}
                eyebrow="Not sure yet"
                title="Choose the format first."
                body="Pick photo, photoshoot, cover, carousel, story, or video. Maya will only ask what she needs."
                action="Pick a format"
                onClick={openFormatPicker}
              />
            )}
          </div>
        </div>
      )}

      {!shouldShowTrialFirstRun && !compact && (
        <div className="mb-10 border-y border-[#C5C6C8]/50 py-4">
          <p className="mb-3 text-[10px] uppercase tracking-[0.26em] text-[#818283]">
            What are we making?
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

      {!shouldShowTrialFirstRun && !compact && (
        <div className="mb-5">
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#818283]">
            Or start from a Vault look
          </p>
          <p className="mt-2 max-w-md text-[13px] leading-relaxed text-[#6D6E70]">
            Use these when you want the look chosen before Maya starts.
          </p>
        </div>
      )}

      {/* This week's look: the same drop the Monday email announces, one tap into Maya. */}
      {!shouldShowTrialFirstRun && !compact && weeklyAesthetic && (
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
      {!shouldShowTrialFirstRun && (
        <div className="[column-fill:_balance] columns-1 gap-3 min-[380px]:columns-2 sm:columns-3 sm:gap-4 lg:columns-4">
          {aesthetics.map((aesthetic, i) => (
            <div key={aesthetic.id} className="mb-3 break-inside-avoid sm:mb-4">
              <AestheticTile aesthetic={aesthetic} index={i} onOpen={openAesthetic} />
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
