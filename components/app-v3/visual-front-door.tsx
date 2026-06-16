"use client"

// SSELFIE Studio 3.0 - Visual Front Door.
// A quiet, editorial grid of Prompt Vault aesthetics. Click a vibe to start (this is the
// decision-fatigue remover). Picking a tile hands off to Maya with the vibe preloaded.
// Design system: light luxury editorial - Seasalt surfaces, Night for contrast, Cormorant
// display, generous spacing, no icons/emojis, no gradients/color.

import { memo, useEffect, useState } from "react"
import Image from "next/image"
import { AESTHETICS } from "./aesthetics"
import { useConcierge } from "./concierge-context"
import type { Aesthetic, OutputFormat } from "./types"

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
  { format: "photo", label: "Photo", line: "One AI-ready selfie into a shot you can post." },
  { format: "reel-cover", label: "Reel cover", line: "A clear cover for the idea you are sharing." },
  { format: "carousel", label: "Carousel", line: "Teach something useful in a simple slide flow." },
  { format: "story-slide", label: "Story", line: "A quick story frame for a poll, offer, or reminder." },
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
  title = "Start with Maya.",
  subtitle = "Begin blank, choose what you want to make, or start from a look. Maya will guide the next step.",
  note = "Included in SSELFIE SUITE: monthly credits · AI brand shoots · Maya guidance · your gallery",
  compact = false,
  showTrialFirstRunStep = false,
  hasTrainedModel = false,
  onUseTrainedModel,
}: {
  eyebrow?: string
  title?: string
  subtitle?: string
  note?: string | null
  compact?: boolean
  showTrialFirstRunStep?: boolean
  hasTrainedModel?: boolean
  onUseTrainedModel?: () => void
} = {}) {
  // Subscribe to the context ONCE here, not in every tile. openWithAesthetic is a stable
  // useCallback, so the memoized tiles below never re-render when the concierge opens.
  const { openWithAesthetic } = useConcierge()
  const [aesthetics, setAesthetics] = useState<Aesthetic[]>(AESTHETICS)

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

  const heroImage = aesthetics[0]?.coverImage || AESTHETICS[0]?.coverImage || ""
  const selfieImage = aesthetics[1]?.coverImage || heroImage
  const formatImage = aesthetics[2]?.coverImage || heroImage

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

      {showTrialFirstRunStep && (
        <p className="mb-5 border-l border-[#0D0E10] bg-white px-4 py-3 text-[13px] leading-relaxed text-[#3A3632]">
          Step 1: add one selfie so Maya keeps your face.
        </p>
      )}

      {!compact && (
        <div className="mb-9 grid grid-cols-1 gap-3 lg:grid-cols-[1.2fr_0.8fr] lg:gap-4">
          <LookbookAction
            image={heroImage}
            eyebrow="Blank start"
            title="Tell Maya what you want."
            body="No look required. Start with an idea, a product, a caption, a photo, or the content you need today."
            action="Start blank"
            tall
            onClick={() => openWithAesthetic(MAYA_BLANK)}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1 lg:gap-4">
            <LookbookAction
              image={selfieImage}
              eyebrow="Fastest path"
              title="Start with one selfie."
              body="Best when you want Maya to help you make the first photo, cover, or content direction."
              action="Add one selfie"
              onClick={() =>
                openWithAesthetic(MAYA_BLANK, {
                  format: "photo",
                  seed: "I want to start with one selfie and make a photo I can post.",
                })
              }
            />
            {hasTrainedModel && onUseTrainedModel ? (
              <LookbookAction
                image={formatImage}
                eyebrow="Saved model"
                title="Use your trained model."
                body="Create with the model you already trained, inside the new Maya flow."
                action="Use my model"
                onClick={onUseTrainedModel}
              />
            ) : (
              <LookbookAction
                image={formatImage}
                eyebrow="Not sure yet"
                title="Choose the format first."
                body="Pick photo, cover, carousel, story, or video. Maya will ask only what she needs."
                action="Pick a format"
                onClick={() => openWithAesthetic(MAYA_BLANK)}
              />
            )}
          </div>
        </div>
      )}

      {!compact && (
        <div className="mb-10 border-y border-[#C5C6C8]/50 py-4">
          <p className="mb-3 text-[10px] uppercase tracking-[0.26em] text-[#818283]">
            What are we making?
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {FORMAT_STARTERS.map(item => (
              <button
                key={item.format}
                type="button"
                onClick={() =>
                  openWithAesthetic(MAYA_BLANK, {
                    format: item.format,
                    seed: `Let's create a ${item.label.toLowerCase()}.`,
                  })
                }
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

      {!compact && (
        <div className="mb-5">
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#818283]">
            Or start from a Vault look
          </p>
          <p className="mt-2 max-w-md text-[13px] leading-relaxed text-[#6D6E70]">
            Use these when you want the visual world chosen before Maya starts.
          </p>
        </div>
      )}

      {/* Editorial masonry: CSS columns for an organic, Pinterest-style flow. */}
      <div className="[column-fill:_balance] columns-1 gap-3 min-[380px]:columns-2 sm:columns-3 sm:gap-4 lg:columns-4">
        {aesthetics.map((aesthetic, i) => (
          <div key={aesthetic.id} className="mb-3 break-inside-avoid sm:mb-4">
            <AestheticTile aesthetic={aesthetic} index={i} onOpen={openWithAesthetic} />
          </div>
        ))}
      </div>
    </section>
  )
}
