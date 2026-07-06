"use client"

// SSELFIE Studio 3.0 - Create front door.
// Creation decisions live inside Maya. This page is only the calm starting surface:
// type an intention, tap a starter, or ask Maya to open the selfie manager.

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { AESTHETICS } from "./aesthetics"
import { useConcierge } from "./concierge-context"
import { trackAnalyticsEvent } from "@/lib/analytics/client"
import { detectCreationIntent, intentForFormat } from "@/lib/app-v3/maya/intent-router"
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

const STARTER_CHIPS: { format: OutputFormat; label: string; prompt: string }[] = [
  {
    format: "photo",
    label: "Make my first photo",
    prompt: "I want to make my first photo from one selfie.",
  },
  {
    format: "photoshoot",
    label: "Create a full shoot",
    prompt: "I want to create a full shoot in one style.",
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

const CARD_COPY = {
  eyebrow: "Fastest path",
  title: "Start with one selfie.",
  body: "Maya keeps your real face, then helps you choose the format, style, and next step.",
  action: "Add one selfie",
}

function LookbookAction({
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
      className={`group relative block min-h-[260px] w-full overflow-hidden rounded-[8px] bg-[color:var(--ss-night)] text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ss-night)] ${
        tall ? "sm:min-h-[430px]" : "sm:min-h-full"
      }`}
    >
      {image && (
        <Image
          src={image}
          alt=""
          fill
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-cover opacity-90 transition-transform duration-700 ease-out group-hover:scale-[1.025]"
          priority
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-[color:var(--ss-night)]/85 via-[color:var(--ss-night)]/25 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
        <p className="text-[10px] uppercase tracking-[0.28em] text-white/75">{eyebrow}</p>
        <p className="mt-2 font-serif text-[30px] font-light leading-[1.04] text-white sm:text-[40px]">
          {title}
        </p>
        <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-white/82">{body}</p>
        <span className="mt-4 inline-flex min-h-10 items-center rounded-[4px] bg-white px-4 text-[10px] uppercase tracking-[0.18em] text-[color:var(--ss-night)] transition-colors group-hover:bg-[color:var(--ss-seasalt)]">
          {action}
        </span>
      </div>
    </button>
  )
}

export function VisualFrontDoor({
  // MAYA-ADMIN-01: header copy is overridable so the admin mount doesn't show member
  // marketing lines. Defaults keep /app in Sandra's calm, direct product voice.
  eyebrow = "SSELFIE Studio",
  title = "Start with one clear next step.",
  subtitle = "Tell Maya what you want to make. She will ask only what she needs, then guide the rest inside the chat.",
  note = "Included in SSELFIE SUITE: monthly credits · brand photos · content help · your gallery",
  compact = false,
  showTrialFirstRunStep = false,
  cohort = "member",
  hasSelfie = false,
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
  /** VIDEO reliability kill switch: false removes the Video starter tile. */
  videoEnabled?: boolean
} = {}) {
  const { openWithAesthetic } = useConcierge()
  const homeTrackedRef = useRef(false)
  const firstRunTrackedRef = useRef(false)
  const [aesthetics, setAesthetics] = useState<Aesthetic[]>(AESTHETICS)
  const [firstRunAlreadySeen] = useState(readFirstRunSeen)
  const [startText, setStartText] = useState("")

  const shouldShowTrialFirstRun = showTrialFirstRunStep && !hasSelfie && !firstRunAlreadySeen
  const heroImage = aesthetics[0]?.coverImage || AESTHETICS[0]?.coverImage || ""
  const selfieImage = aesthetics[1]?.coverImage || heroImage

  useEffect(() => {
    let alive = true
    fetch("/api/app-v3/aesthetics")
      .then(response => (response.ok ? response.json() : null))
      .then(data => {
        if (!alive || !Array.isArray(data?.aesthetics) || data.aesthetics.length === 0) return
        setAesthetics(data.aesthetics)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (homeTrackedRef.current) return
    homeTrackedRef.current = true
    void trackAnalyticsEvent({
      event: "suite_home_viewed",
      properties: { cohort, hasSelfie, section: "create" },
    })
  }, [cohort, hasSelfie])

  useEffect(() => {
    if (!shouldShowTrialFirstRun || firstRunTrackedRef.current) return
    firstRunTrackedRef.current = true
    markFirstRunSeen()
    void trackAnalyticsEvent({
      event: "suite_trial_first_run_seen",
      properties: { cohort, source: "front_door" },
    })
  }, [cohort, shouldShowTrialFirstRun])

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

  function openSelfieManagerInMaya() {
    trackFirstAction("add_selfie")
    trackInlineStart("selfie_manager", null, "needs_clarify")
    // No fabricated seed and no preset format: the member hasn't said anything yet, so
    // nothing may be sent into the chat on her behalf. Maya opens the reference manager,
    // then asks the ONE next question (format) with her own inline card. Putting words in
    // the member's mouth here is what made every later tap replay "I want to start with
    // one clear selfie." into the thread.
    openWithAesthetic(MAYA_BLANK, {
      creationIntent: { format: null, source: "manual", confidence: "needs_clarify" },
      initialSetupAction: "selfie_manager",
    })
  }

  return (
    <section className={compact ? "w-full" : "mx-auto w-full max-w-6xl px-4 py-7 sm:px-8 sm:py-16"}>
      <header className={compact ? "mb-6" : "mb-7 sm:mb-10"}>
        <p className="text-[10px] uppercase tracking-[0.34em] text-[color:var(--ss-gray)]">
          {eyebrow}
        </p>
        <h1
          className={`mt-3 font-serif font-light leading-[1.05] text-[color:var(--ss-night)] ${
            compact ? "text-[27px] sm:text-[34px]" : "text-[32px] sm:text-[46px]"
          }`}
        >
          {title}
        </h1>
        <p className="mt-3 max-w-md text-[15px] leading-relaxed text-[color:var(--ss-davy)]">
          {subtitle}
        </p>
        {note && (
          <p className="mt-4 max-w-xl text-[12px] leading-relaxed text-[color:var(--ss-gray)]">
            {note}
          </p>
        )}
      </header>

      {shouldShowTrialFirstRun && (
        <div className="mb-9">
          <LookbookAction
            image={selfieImage}
            eyebrow="SSELFIE SUITE"
            title="Hi, I'm Maya. Let's make your first photo."
            body="Add one clear selfie and I'll keep your real face, then build the rest around you."
            action="Add my selfie"
            tall
            onClick={openSelfieManagerInMaya}
          />
        </div>
      )}

      {!shouldShowTrialFirstRun && !compact && (
        <div className="mb-9 overflow-hidden rounded-[10px] border border-[color:var(--ss-silver)]/60 bg-white">
          <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="min-w-0 p-5 sm:p-7">
              <p className="text-[10px] uppercase tracking-[0.3em] text-[color:var(--ss-gray)]">
                Start with Maya
              </p>
              <h2 className="mt-3 font-serif text-[30px] font-light leading-[1.04] text-[color:var(--ss-night)] sm:text-[42px]">
                What do you want to make today?
              </h2>
              <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-[color:var(--ss-davy)]">
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
                    className="min-h-[112px] w-full resize-none rounded-[7px] border border-[color:var(--ss-silver)]/70 bg-[color:var(--ss-seasalt)] px-4 py-3 text-[15px] leading-relaxed text-[color:var(--ss-night)] outline-none transition-colors placeholder:text-[color:var(--ss-gray)] focus:border-[color:var(--ss-night)]"
                  />
                </label>
                <button
                  type="submit"
                  className="min-h-12 w-full rounded-[5px] bg-[color:var(--ss-night)] px-5 py-3 text-[11px] uppercase tracking-[0.18em] text-white transition-opacity hover:opacity-90 sm:w-auto"
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
                    className="min-h-10 rounded-full border border-[color:var(--ss-silver)]/70 bg-white px-3.5 py-2 text-[12px] text-[color:var(--ss-davy)] transition-colors hover:border-[color:var(--ss-night)] hover:text-[color:var(--ss-night)]"
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <p className="mt-5 max-w-lg text-[12px] leading-relaxed text-[color:var(--ss-gray)]">
                Style, inspiration, shot choice, text on image, and selfie details happen with Maya
                after you start. One flow, no second setup screen.
              </p>
            </div>
            <LookbookAction
              image={heroImage}
              eyebrow={CARD_COPY.eyebrow}
              title={CARD_COPY.title}
              body={CARD_COPY.body}
              action={CARD_COPY.action}
              onClick={openSelfieManagerInMaya}
            />
          </div>
        </div>
      )}
    </section>
  )
}
