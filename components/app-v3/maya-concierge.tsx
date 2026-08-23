"use client"

// SSELFIE Studio 3.0 - Maya Concierge (MAYA-REBUILD-03: conversational rebuild).
//
// This is the missing layer Sandra felt. Instead of a form with one Generate button, Maya
// now holds a real streaming conversation (Claude Sonnet 5 via /api/app-v3/maya/chat),
// proposes concept directions inline as cards, and the user clicks one to fire the
// synchronous OpenAI generation (/api/app-v3/maya/generate). "Tweak" is just another message.
//
// Reuses the lean primitives only (ConceptCard, concierge-context). It does NOT port the
// 2,237-line legacy chat interface or any Flux/Pro-mode wiring.

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import dynamic from "next/dynamic"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { useConcierge } from "./concierge-context"
import { ConceptCard, type ConceptGenState } from "./concept-card"
import { ClarifyCard } from "./clarify-card"
import { FeedPlanPreviewCard, type FeedPlanPreviewDay } from "./feed-plan-preview-card"
import { Markdown } from "./markdown"
import { TypingDots } from "./loading"
import { ImageLightbox } from "./image-lightbox"
import { TextOverlayLayer } from "./text-overlay-layer"
import {
  InlineProjectStart,
  InlineResultActions,
  InlineSelfieUpload,
  InlineShotDirectorCard,
  InlineShotPicker,
  InlineVibePicker,
} from "./maya-inline-components"
import { CreditModal } from "./credit-modal"
import { TrialCapOffer } from "./trial-cap-offer"
import { SelfieReferenceManagerModal } from "./selfie-reference-manager-modal"
import { retryGeneratedImageOnce } from "./image-retry"
import { ChatHistoryModal } from "./chat-history-modal"
import { MemoryModal, type Memory } from "./memory-modal"
import { EditMode } from "./edit-mode"
import { AESTHETICS, MAYA_DECIDES_AESTHETIC, MAYA_GENERAL_AESTHETIC } from "./aesthetics"
import { trackAnalyticsEvent } from "@/lib/analytics/client"
import { finishMayaJob, recordMayaJobDecision } from "@/lib/app-v3/maya/job-analytics"
import { newMayaTaskId } from "@/lib/app-v3/maya/context-envelope"
import {
  createMayaAction,
  mayaActionIdempotencyKey,
  restoreMayaActionStatus,
  type MayaActionDescriptor,
} from "@/lib/app-v3/maya/action-protocol"
import { MayaActionCard } from "./maya-action-card"
import { MayaGuidanceWorkspace } from "./maya-guidance-workspace"
import type { ConceptCard as ConceptCardData, ClarifyPrompt } from "@/lib/app-v3/maya/concept-types"
import {
  buildCustomModelConceptPrompt,
  buildVideoMotionPrompt,
} from "@/lib/app-v3/custom-model-brief"
import type { ServerMayaDraftSnapshot } from "@/lib/app-v3/maya/draft-snapshot"
import type {
  Aesthetic,
  AestheticShot,
  AppV3AnalyticsCohort,
  CalendarPostTarget,
  ConciergeSession,
  CreationIntent,
  GenerationSource,
  InlineActionKind,
  LastGenerationSnapshot,
  OutputFormat,
  ShotDirectorIntent,
  ShotDirectorMode,
} from "./types"
import type { SkoolHandoffKey, SkoolMayaHandoff } from "@/lib/app-v3/maya/skool-handoff"
import { SkoolMayaHandoffCard } from "./skool-maya-handoff-card"
import {
  detectCreationIntent,
  intentForFormat,
  needsClarificationIntent,
} from "@/lib/app-v3/maya/intent-router"
import { isConceptPlanReady } from "@/lib/app-v3/maya/concept-plan-readiness"
import { shouldContinueCompletedFormatSwitch } from "@/lib/app-v3/maya/next-action"
import { shouldSkipMayaTaskHistoryLookup } from "@/lib/app-v3/maya/task-hydration"
import {
  OVERLAY_STYLE_PRESETS,
  resolveOverlayStyle,
  type OverlayFormat,
  type OverlayStyleId,
  type TextOverlaySpec,
} from "@/lib/app-v3/text-overlay"
import { getTextStyleExampleImage, textStyleSampleSpec } from "@/lib/app-v3/text-style-examples"
import { salvageConceptsPayload } from "@/lib/app-v3/concept-salvage"
import { downloadAllSlides } from "@/lib/app-v3/download-all-slides"
import { recordSuiteDownloadForReview } from "@/lib/testimonials/review-capture-client"
import {
  applyEditedConceptCopy,
  type EditableConceptCopy,
} from "@/lib/app-v3/maya/concept-copy-edit"
import {
  colorAdjustmentLine,
  parseTextRefinement,
  typographyAdjustmentLine,
  type TextRefinement,
} from "@/lib/app-v3/text-refinements"
import {
  clearMayaDraft,
  readMayaLastActiveTaskId,
  readMayaDraftForSession,
  readMayaTaskDraft,
  readMayaTaskDraftState,
  saveMayaDraft,
  saveMayaLastActiveTaskId,
  saveMayaTaskDraft,
  type MayaDraftSnapshot,
} from "./continuity"

/** Maya's profile image (one of Sandra's editorial portraits). Swap freely. */
const MAYA_AVATAR = "/images/ai-prompts/clean-girl-morning-shot-1.jpg"

const MayaFounderTestMode = dynamic(
  () =>
    import("./maya-founder-test-mode").then(module => ({
      default: module.MayaFounderTestMode,
    })),
  { ssr: false }
)

const NEXT_POST_REQUEST =
  "Help me create one finished post I can publish. Start with one of my saved selfies and use what you know about my current priority or unfinished work. Choose one strong idea, the format, and a SSELFIE visual direction for me. Include the words I need so the result is ready to use. Ask only one question if it would materially change the post."

/** Small editorial avatar for the conversation thread. */
function Avatar({ src, fallback }: { src: string | null; fallback: string }) {
  return (
    <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-[2px] border border-[#C5C6C8]/50 bg-[#ECEDED]">
      {src ? (
        <Image src={src} alt="" fill className="object-cover" sizes="28px" />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-[10px] uppercase text-[#6D6E70]">
          {fallback}
        </span>
      )}
    </div>
  )
}
function compactInlineAestheticForMaya(
  aesthetic: Aesthetic,
  selectedShot: AestheticShot
): Aesthetic {
  const thumbnails = [
    selectedShot.image,
    ...(aesthetic.thumbnails ?? []).filter(url => url !== selectedShot.image),
  ].slice(0, 3)
  return {
    ...aesthetic,
    coverImage: selectedShot.image,
    thumbnails,
    selectedShot,
    intent: [
      aesthetic.intent,
      `Selected shot: ${selectedShot.title}. Recreate this frame's composition, camera distance, pose logic, styling, light, and background world with the member's real face.`,
      selectedShot.whenToUse ? `Use case: ${selectedShot.whenToUse}` : "",
      selectedShot.mood ? `Mood: ${selectedShot.mood}` : "",
      selectedShot.stylePrompt ? `Shot styling DNA: ${selectedShot.stylePrompt}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  }
}

const STYLE_PREVIEW_BACKGROUNDS: Record<OverlayStyleId, string> = {
  "editorial-serif-center": "/images/selfie-to-brand-shoot/module-5-content-use/detail-coffee.jpg",
  "lower-third-accent":
    "/images/selfie-to-brand-shoot/module-5-content-use/creator-phone-detail.jpg",
  "top-band-minimal": "/images/selfie-to-brand-shoot/module-5-content-use/quiet-product-detail.jpg",
  "quote-statement": "/images/selfie-to-brand-shoot/module-5-content-use/detail-wine.jpg",
  "series-cover": "/images/selfie-to-brand-shoot/module-5-content-use/lifestyle-work-laptop.jpg",
  "cutout-editorial": "/images/selfie-to-brand-shoot/module-5-content-use/detail-coffee.jpg",
}

type GraphicTextMode = "with-text" | "without-text"

function isGraphicOutputFormat(format: OutputFormat): boolean {
  return (
    format === "reel-cover" ||
    format === "story-slide" ||
    format === "story-sequence" ||
    format === "carousel"
  )
}

function isStoryGraphicFormat(format: OutputFormat | null | undefined): boolean {
  return format === "story-slide" || format === "story-sequence"
}

function overlayFormatForOutput(format: OutputFormat): OverlayFormat {
  if (format === "carousel") return "carousel"
  if (format === "story-slide") return "story-slide"
  if (format === "story-sequence") return "story-sequence"
  return "reel-cover"
}

function normalizeOverlayStyleId(value: unknown): OverlayStyleId | null {
  if (typeof value !== "string") return null
  const id = value.trim()
  return OVERLAY_STYLE_PRESETS.some(preset => preset.id === id) ? (id as OverlayStyleId) : null
}

const TEXT_STYLE_VARIATIONS: { label: string; styleAdjustments: string }[] = [
  {
    label: "Softer ink",
    styleAdjustments:
      "Keep the exact same layout and placement. Use softer charcoal ink instead of stark black.",
  },
  {
    label: "Stronger contrast",
    styleAdjustments:
      "Keep the exact same layout and placement. Increase text contrast and weight slightly.",
  },
  {
    label: "No accent",
    styleAdjustments:
      "Keep the exact same layout and placement. Remove decorative accents and keep the type clean.",
  },
]

function TextStyleTemplatePicker({
  format,
  disabled,
  rememberedStyle,
  onPick,
}: {
  format: OutputFormat
  disabled?: boolean
  rememberedStyle?: OverlayStyleId | null
  onPick: (style: OverlayStyleId) => void
}) {
  const previewFormat = overlayFormatForOutput(format)
  const frameClass = previewFormat === "carousel" ? "aspect-[4/5]" : "aspect-[9/16]"
  const rememberedPreset = rememberedStyle ? resolveOverlayStyle(rememberedStyle) : null

  return (
    <div className="space-y-3 rounded-[8px] border border-[#C5C6C8]/60 bg-[#F8FAFA] p-3">
      <div>
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#6D6E70]">
          Maya pulled six looks
        </p>
        <p className="mt-1 text-[13px] leading-relaxed text-[#4F5052]">
          Tap the cover style that feels closest. Maya will bake the text into your image from the
          start.
        </p>
      </div>
      {rememberedPreset && (
        <button
          type="button"
          onClick={() => onPick(rememberedPreset.id)}
          disabled={disabled}
          className="min-h-12 w-full rounded-[6px] border border-[#0D0E10]/25 bg-white px-3 py-2.5 text-left transition-colors hover:border-[#0D0E10] disabled:opacity-45"
        >
          <span className="block text-[12px] font-medium text-[#0D0E10]">Use your usual style</span>
          <span className="mt-1 block text-[11px] leading-relaxed text-[#6D6E70]">
            {rememberedPreset.name}
          </span>
        </button>
      )}
      <div className="grid grid-cols-2 gap-2">
        {OVERLAY_STYLE_PRESETS.map(preset => {
          const exampleUrl = getTextStyleExampleImage(preset.id)
          const fallbackUrl = STYLE_PREVIEW_BACKGROUNDS[preset.id]
          const spec = textStyleSampleSpec(preset.id, previewFormat)
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onPick(preset.id)}
              disabled={disabled}
              className="group min-w-0 rounded-[7px] border border-[#C5C6C8]/70 bg-white p-1.5 text-left transition hover:border-[#0D0E10] hover:bg-[#F1F2F2] disabled:cursor-not-allowed disabled:opacity-45"
            >
              <div className={`relative overflow-hidden rounded-[5px] bg-[#0D0E10] ${frameClass}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={exampleUrl ?? fallbackUrl}
                  alt=""
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover opacity-90 transition-transform duration-300 group-hover:scale-[1.02]"
                />
                {!exampleUrl && <TextOverlayLayer spec={spec} />}
              </div>
              <div className="min-w-0 px-1 pb-1 pt-2">
                <p className="truncate font-serif text-[15px] leading-tight text-[#0D0E10]">
                  {preset.name}
                </p>
                <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-[#6D6E70]">
                  {preset.hint}
                </p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function GraphicTextChoiceCard({ onChoose }: { onChoose: (mode: GraphicTextMode) => void }) {
  return (
    <div className="space-y-3 rounded-[8px] border border-[#C5C6C8]/60 bg-white p-4">
      <div>
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#6D6E70]">Text on image</p>
        <p className="mt-1 text-[14px] leading-relaxed text-[#4F5052]">
          Maya can bake short words into the finished image. Choose this now, so nothing appears on
          your result by surprise.
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onChoose("with-text")}
          className="min-h-20 rounded-[6px] border border-[#0D0E10] bg-[#0D0E10] px-4 py-3 text-left text-white transition hover:bg-[#282728]"
        >
          <span className="block text-[11px] uppercase tracking-[0.16em] text-white/65">
            Baked in
          </span>
          <span className="mt-1 block text-[15px] leading-snug">Add text to the image</span>
        </button>
        <button
          type="button"
          onClick={() => onChoose("without-text")}
          className="min-h-20 rounded-[6px] border border-[#C5C6C8]/70 bg-[#F8FAFA] px-4 py-3 text-left text-[#0D0E10] transition hover:border-[#0D0E10]"
        >
          <span className="block text-[11px] uppercase tracking-[0.16em] text-[#6D6E70]">
            Clean image
          </span>
          <span className="mt-1 block text-[15px] leading-snug">No text, just the visual</span>
        </button>
      </div>
      <p className="text-[12px] leading-relaxed text-[#6D6E70]">
        If you choose no text, Maya still writes suggested words below the result so you can copy
        them into Instagram, Canva, or your caption.
      </p>
    </div>
  )
}

/** Stable conversation id (client-side). */
function newChatId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID()
  return `c_${Date.now()}_${Math.floor(Math.random() * 1e6)}`
}

/** Title a conversation from its first user message. */
function deriveTitle(msgs: any[]): string | null {
  const firstUser = msgs.find(m => m?.role === "user")
  if (!firstUser) return null
  const parts = Array.isArray(firstUser.parts) ? firstUser.parts : []
  const text = parts
    .filter((p: any) => p?.type === "text" && typeof p.text === "string")
    .map((p: any) => p.text)
    .join(" ")
    .trim()
  return text ? text.slice(0, 80) : null
}

function summarizeCreativeTask(genState: Record<string, ConceptGenState>) {
  const states = Object.values(genState)
  const creating = states.some(state => state.status === "generating")
  const finished = states.filter(state => state.status === "done")
  const outputCount = finished.reduce(
    (total, state) => total + (state.imageUrls?.length ?? (state.videoUrl ? 1 : 0)),
    0
  )
  const newest = [...finished]
    .reverse()
    .find(state => state.bakedImageUrls?.some(Boolean) || state.imageUrls?.length)
  const thumbnailUrl =
    newest?.bakedImageUrls?.find((url): url is string => Boolean(url)) ??
    newest?.imageUrls?.[0] ??
    null
  return {
    status: creating
      ? ("creating" as const)
      : outputCount > 0
        ? ("ready" as const)
        : ("planning" as const),
    outputCount,
    thumbnailUrl,
  }
}

function durableCreativeTaskState(genState: Record<string, ConceptGenState>) {
  return Object.fromEntries(
    Object.entries(genState).map(([key, state]) => {
      const durable = { ...state }
      delete durable.previewUrl
      return [key, durable]
    })
  ) as Record<string, ConceptGenState>
}

const FORMAT_OPTIONS: { id: OutputFormat; label: string }[] = [
  { id: "photo", label: "Photo" },
  { id: "photoshoot", label: "Photoshoot" },
  { id: "reel-cover", label: "Reel cover" },
  { id: "carousel", label: "Carousel" },
  { id: "story-slide", label: "Story slide" },
  { id: "story-sequence", label: "Story sequence" },
  { id: "video", label: "Video" },
]

// Tapping a format is the first guided step: it asks Maya (in natural words) to pull directions.
const FORMAT_PHRASE: Record<OutputFormat, string> = {
  photo: "Let's create photos.",
  photoshoot: "Let's create a full photoshoot.",
  "reel-cover": "Let's make a Reel cover.",
  carousel: "Let's make a carousel.",
  "story-slide": "Let's make a Story slide.",
  "story-sequence": "Let's make a full story sequence.",
  video: "Let's add motion to a photo.",
}

const CAPTION_START_REQUEST =
  "Help me build a caption for one post. Start by asking what the post is about, then write the finished caption in my voice."

// System-authored turns (tap-generated pulls, retries, hands-free continuations) must never
// render as words the member typed — fabricated "YOU" bubbles were a direct trust complaint
// in the 2026-07-28 UX audit. The transport still needs a user turn, so these exact strings
// are recognized at render time and shown as a neutral status line instead.
const SYSTEM_TURN_LABEL: Record<string, string> = {
  [FORMAT_PHRASE.photo]: "Starting photos",
  [FORMAT_PHRASE.photoshoot]: "Starting a full photoshoot",
  [FORMAT_PHRASE["reel-cover"]]: "Starting a Reel cover",
  [FORMAT_PHRASE.carousel]: "Starting a carousel",
  [FORMAT_PHRASE["story-slide"]]: "Starting a Story slide",
  [FORMAT_PHRASE["story-sequence"]]: "Starting a Story sequence",
  [FORMAT_PHRASE.video]: "Adding motion to a photo",
  [CAPTION_START_REQUEST]: "Starting a caption",
  "Continue with what we already created.": "Continuing with what you already created",
  "Let's create photos using my trained model.": "Starting photos with your trained model",
  "Help me choose what to make today.": "Choosing what to make today",
}

function MayaPathChooser({
  disabled,
  onPickFormat,
  onStartCaption,
  onStartEdit,
}: {
  disabled: boolean
  onPickFormat: (format: OutputFormat) => void
  onStartCaption: () => void
  onStartEdit?: () => void
}) {
  const actionClass =
    "min-h-11 border border-[color:var(--suite-night)] bg-white px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-[color:var(--suite-night)] transition-colors hover:bg-[color:var(--suite-night)] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--suite-accent)] disabled:opacity-40"

  return (
    <section className="suite-maya-paths" aria-label="Choose your creative path">
      <article className="suite-maya-path suite-maya-path--photos">
        <p className="suite-maya-path-kicker">AI Photos</p>
        <h3>Create the image first.</h3>
        <p>Make one strong photo or direct a complete shoot from your selfies.</p>
        <div className="suite-maya-path-actions">
          <button
            type="button"
            onClick={() => onPickFormat("photo")}
            disabled={disabled}
            className={actionClass}
          >
            Create a photo
          </button>
          <button
            type="button"
            onClick={() => onPickFormat("photoshoot")}
            disabled={disabled}
            className={actionClass}
          >
            Plan a photoshoot
          </button>
        </div>
      </article>

      <article className="suite-maya-path suite-maya-path--edit">
        <p className="suite-maya-path-kicker">Edit a Photo</p>
        <h3>Start from what you have.</h3>
        <p>Choose a Gallery photo, then use a preset or make one precise change.</p>
        <div className="suite-maya-path-actions">
          <button
            type="button"
            onClick={onStartEdit}
            disabled={disabled || !onStartEdit}
            className={actionClass}
          >
            Choose a photo
          </button>
        </div>
      </article>

      <article className="suite-maya-path suite-maya-path--post">
        <p className="suite-maya-path-kicker">Build a Post</p>
        <h3>Turn the idea into something ready.</h3>
        <p>Create the words, designed slides or story sequence around one clear message.</p>
        <div className="suite-maya-path-actions suite-maya-path-actions--three">
          <button
            type="button"
            onClick={() => onPickFormat("carousel")}
            disabled={disabled}
            className={actionClass}
          >
            Carousel
          </button>
          <button
            type="button"
            onClick={onStartCaption}
            disabled={disabled}
            className={actionClass}
          >
            Caption
          </button>
          <button
            type="button"
            onClick={() => onPickFormat("story-sequence")}
            disabled={disabled}
            className={actionClass}
          >
            Stories
          </button>
        </div>
      </article>
    </section>
  )
}

// Maya's opener, tab-aware so it always matches the selected format (fixes the "pick one above"
// mismatch). BEFORE a selfie is added it guides the next step; AFTER, it shifts to a "start your
// brand shoot" framing so the system status is clear (the photo case is the one that changes most).
// Sandra-approved short openers (2026-06-11): two lines max before anything happens.
const FORMAT_OPENER: Record<OutputFormat, string> = {
  photo: "Add one selfie and I'll show you a few ideas. Soft window light works best. 🤍",
  photoshoot: "Add one selfie and I'll plan a full shoot in one world. 🤍",
  "reel-cover":
    "Hit create and I'll show you six cover styles. Tap the one you love and I'll take it from there.",
  carousel:
    "Hit create and I'll show you six text styles. Tap the one that feels like you and I'll build the slides.",
  "story-slide":
    "Hit create and I'll show you six styles. Tap the one you love, then pick the story idea that fits.",
  "story-sequence":
    "Hit create and I'll show you six styles. Tap the one that feels like you and I'll build the sequence.",
  video:
    "Add or choose the image you want to move, and I'll show you a few ways to bring it to life.",
}
const FORMAT_OPENER_READY: Record<OutputFormat, string> = {
  photo:
    "Your selfie's in, and it's still you. I chose a clear starting direction below. You decide before I create it.",
  photoshoot:
    "Your selfie's in, and it's still you. Hit create and I'll build the full shoot plan.",
  "reel-cover":
    "Your selfie's in, and it's still you. Hit create and tap the cover style you love. I'll do the rest.",
  carousel:
    "Your selfie's in, and it's still you. Hit create and tap the text style that feels like you.",
  "story-slide":
    "Your selfie's in, and it's still you. Hit create and tap the style you love. Then pick your story idea.",
  "story-sequence":
    "Your selfie's in, and it's still you. Hit create and tap the style that feels like you.",
  video: "Your image is in. Hit create and pick the motion that feels most natural.",
}

// The primary "go" button. It commits the chosen format, which triggers Maya to pull directions,
// so the customer never has to type to move forward.
const CTA_LABEL: Record<OutputFormat, string> = {
  photo: "Show me photo ideas",
  photoshoot: "Plan my shoot",
  "reel-cover": "Show me cover ideas",
  carousel: "Show me carousel ideas",
  "story-slide": "Show me story ideas",
  "story-sequence": "Plan my full story",
  video: "Show me motion ideas",
}

const IMAGE_UPLOAD_ACCEPT = "image/jpeg,image/png,image/webp"

type UploadSlot = "face" | "angle" | "side" | "body" | "inspiration" | "video"

/** Pull the 3 concepts out of an emit_concepts tool part (output first, input while streaming).
 *  `rawInput` is the salvage path: if the tool call finished but failed schema validation (a
 *  truncated stream, a missing field), the SDK clears `input` and keeps the raw payload there -
 *  without this fallback the cards a user watched stream in would vanish when Maya finishes.
 *  When the tool JSON was CUT mid-stream (token ceiling - the story-sequence/story-slide killer,
 *  2026-07-03), rawInput is a raw STRING: salvageConceptsPayload rescues every complete concept. */
function extractConcepts(part: any): ConceptCardData[] | null {
  if (!part || typeof part !== "object") return null
  if (part.type !== "tool-emit_concepts" && part.type !== "dynamic-tool") return null
  const payload =
    part.output?.concepts ??
    part.input?.concepts ??
    part.rawInput?.concepts ??
    salvageConceptsPayload(part.rawInput ?? part.input)?.concepts
  if (!Array.isArray(payload)) return null
  // Story/graphic concepts are creativePlan-led and may arrive without a full photo brief
  // (live 2026-07-03: requiring brief.outfit here silently discarded intact story slides).
  // Keep any concept with a title and coerce the brief so the prompt compiler's clean()
  // guards see strings, never undefined.
  return payload
    .filter(
      (c: any) =>
        c && typeof c.title === "string" && (c.brief == null || typeof c.brief === "object")
    )
    .map((c: any) => {
      const brief = c.brief && typeof c.brief === "object" ? c.brief : {}
      const str = (v: unknown) => (typeof v === "string" ? v : "")
      return {
        ...c,
        brief: {
          ...brief,
          outfit: str(brief.outfit),
          setting: str(brief.setting),
          mood: str(brief.mood),
          pose: str(brief.pose),
          cameraSpec: str(brief.cameraSpec),
          lighting: str(brief.lighting),
        },
      }
    })
}

/** Pull the format attached to an emit_concepts batch. This prevents an old sticky session
 *  mode (for example video) from hijacking a newly emitted photo/card batch. */
function extractConceptFormat(part: any): OutputFormat | null {
  if (!part || typeof part !== "object") return null
  if (part.type !== "tool-emit_concepts" && part.type !== "dynamic-tool") return null
  const fmt =
    part.output?.format ??
    part.input?.format ??
    part.rawInput?.format ??
    salvageConceptsPayload(part.rawInput ?? part.input)?.format
  return FORMAT_OPTIONS.some(o => o.id === fmt) ? (fmt as OutputFormat) : null
}

/** Did this assistant part attempt emit_concepts at all? (Drives the lost-cards retry state.) */
function isConceptToolPart(part: any): boolean {
  if (!part || typeof part !== "object") return false
  return (
    part.type === "tool-emit_concepts" ||
    (part.type === "dynamic-tool" && part.toolName === "emit_concepts")
  )
}

/** Pull the requested format out of a set_format tool part (SUITE-UX-02: conversational
 *  format switching - "make me a carousel" mid-chat works without tapping a chip). */
function extractFormatSwitch(part: any): OutputFormat | null {
  if (!part || typeof part !== "object") return null
  if (
    part.type !== "tool-set_format" &&
    !(part.type === "dynamic-tool" && part.toolName === "set_format")
  ) {
    return null
  }
  const fmt = part.output?.format ?? part.input?.format
  return FORMAT_OPTIONS.some(o => o.id === fmt) ? (fmt as OutputFormat) : null
}

/** Pull the show_feed_plan tool's real DB lookup out of Maya's stream (Feed Planner Phase 2c).
 *  Unlike emit_concepts this is a genuine server-side query, not model-generated JSON, so there's
 *  no truncation/salvage concern - `output` is either populated or the part isn't this tool. */
function extractFeedPlanDays(part: any): FeedPlanPreviewDay[] | null {
  if (!part || typeof part !== "object") return null
  if (
    part.type !== "tool-show_feed_plan" &&
    !(part.type === "dynamic-tool" && part.toolName === "show_feed_plan")
  ) {
    return null
  }
  const days = part.output?.days
  return Array.isArray(days) ? (days as FeedPlanPreviewDay[]) : null
}

/** Pull an inline question out of an ask_clarify tool part. */
function extractClarify(part: any): ClarifyPrompt | null {
  if (!part || typeof part !== "object") return null
  if (part.type !== "tool-ask_clarify" && part.type !== "dynamic-tool") return null
  const payload = part.output ?? part.input
  if (!payload || typeof payload.question !== "string" || !Array.isArray(payload.options))
    return null
  const options = payload.options.filter((o: any) => typeof o === "string" && o.trim().length > 0)
  if (options.length === 0) return null
  return {
    kind: payload.kind === "format" ? "format" : "detail",
    question: payload.question,
    options,
    allowFreeText: Boolean(payload.allowFreeText),
  }
}

function wait(ms: number): Promise<void> {
  return new Promise(resolve => window.setTimeout(resolve, ms))
}

function newGenerationRequestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`
}

async function pollCustomModelGeneration(
  predictionId: string,
  generationId: number
): Promise<string> {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const res = await fetch(
      `/api/app-v3/maya/custom-model/check?predictionId=${encodeURIComponent(predictionId)}&generationId=${generationId}`
    )
    const data = (await res.json().catch(() => null)) as {
      status?: string
      imageUrl?: string
      error?: string
    } | null

    if (!res.ok) throw new Error(data?.error || "Generation failed")
    if (data?.status === "succeeded" && data.imageUrl) return data.imageUrl
    if (data?.status === "failed") throw new Error(data.error || "Generation failed")

    await wait(attempt < 10 ? 1500 : 2500)
  }

  throw new Error("Maya is still creating this. Try again in a moment.")
}

async function pollVideoGeneration(predictionId: string, videoId: number): Promise<string> {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const res = await fetch(
      `/api/app-v3/maya/video/check?predictionId=${encodeURIComponent(predictionId)}&videoId=${videoId}`
    )
    const data = (await res.json().catch(() => null)) as {
      status?: string
      videoUrl?: string
      error?: string
    } | null

    if (!res.ok) throw new Error(data?.error || "Video failed")
    if (data?.status === "succeeded" && data.videoUrl) return data.videoUrl
    if (data?.status === "failed") throw new Error(data.error || "Video failed")

    await wait(attempt < 12 ? 2000 : 3500)
  }

  throw new Error("Maya is still making the video. Try again in a moment.")
}

export function MayaConcierge({
  operatingLayerEnabled = false,
  homeMode = false,
  firstName,
  hasTrainedModel = false,
  analyticsCohort,
  onOpenCalendar,
  calendarSurfaceActive = false,
  calendarIncluded = true,
  skoolHandoff = null,
  onStartEdit,
}: {
  operatingLayerEnabled?: boolean
  /** Member Maya Home: the conversation is the page, not a modal over the page. */
  homeMode?: boolean
  firstName?: string | null
  hasTrainedModel?: boolean
  analyticsCohort?: AppV3AnalyticsCohort
  onOpenCalendar?: () => void
  /** Prevents a Create-tab generation from ever spilling into a previously selected slot. */
  calendarSurfaceActive?: boolean
  /** Exact product capability. Maya Essential finishes inline and never writes hidden Calendar rows. */
  calendarIncluded?: boolean
  /** Fixed server allowlist entry selected by the authenticated /app page. */
  skoolHandoff?: SkoolMayaHandoff | null
  /** Opens Gallery in source-photo mode, then hands the chosen image to the existing editor. */
  onStartEdit?: () => void
} = {}) {
  const cohort: AppV3AnalyticsCohort = analyticsCohort ?? "member"
  const {
    session,
    isOpen,
    historyRequestId,
    setWorkspaceBusy,
    restoreHistoryTask,
    updateCurrentSession,
    markCalendarTargetAnnounced,
    completeCalendarTarget,
    clearCalendarDelivery,
    updateCalendarTargetCaption,
    resetCurrentSession,
    setOutputFormat,
    setReferenceSelfieUrl,
    setVideoSourceUrl,
    close,
  } = useConcierge()
  const fileInput = useRef<HTMLInputElement>(null)
  const angleInput = useRef<HTMLInputElement>(null)
  const sideInput = useRef<HTMLInputElement>(null)
  const bodyInput = useRef<HTMLInputElement>(null)
  const inspoInput = useRef<HTMLInputElement>(null)
  const videoInput = useRef<HTMLInputElement>(null)
  const skoolHandoffStartedRef = useRef<SkoolHandoffKey | null>(null)
  // The thread's own scroll container. Scrolled directly (scrollTop), never via
  // Element.scrollIntoView on a sentinel - scrollIntoView can walk past the nearest
  // scrollable ancestor and disturb an OUTER container on WebKit, which is what was
  // corrupting the keyboard-viewport tracking below on mobile (2026-07-21 live report:
  // the drawer landed behind the shell / lower-half-only after the first message).
  const threadRef = useRef<HTMLDivElement>(null)
  const scrollThreadToBottom = useCallback(() => {
    const el = threadRef.current
    if (!el) return
    el.scrollTo?.({ top: el.scrollHeight, behavior: "smooth" })
  }, [])
  const composerRef = useRef<HTMLTextAreaElement>(null)
  // Chat-input best practice (2026-07-29 report): multiline composer. Desktop: Enter sends,
  // Shift+Enter breaks the line. Touch: Enter breaks the line, the Send button sends —
  // the same contract as every major mobile chat app.
  const coarsePointerRef = useRef<boolean | null>(null)
  const isCoarsePointer = () => {
    if (coarsePointerRef.current === null) {
      coarsePointerRef.current =
        typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches === true
    }
    return coarsePointerRef.current
  }
  const resizeComposer = () => {
    const el = composerRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, 144)}px`
  }
  const drawerCloseRef = useRef<HTMLButtonElement>(null)
  const drawerRef = useRef<HTMLElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const [isDesktopWorkspace, setIsDesktopWorkspace] = useState(false)
  const restoredDraftRef = useRef<MayaDraftSnapshot | null>(null)
  // Seed the draft ONCE per mount. Re-seeding whenever the ref is null let a "Start new"
  // session re-restore the previous thread: the save effect below could persist the old
  // messages under the NEW session key for one stale commit, and this line read them back.
  const draftSeededRef = useRef(false)
  if (!draftSeededRef.current && session?.startedAt) {
    draftSeededRef.current = true
    restoredDraftRef.current =
      operatingLayerEnabled && session.mayaContext?.taskId
        ? readMayaTaskDraftState(session.mayaContext.taskId)
        : readMayaDraftForSession(session.startedAt)
  }
  const restoredDraft = restoredDraftRef.current
  const lastPulledFormatRef = useRef<string | null>(
    restoredDraft?.messages.length ? (session?.outputFormat ?? null) : null
  )
  // set_format tool parts already acted on (`${messageId}:${format}`), so a switch fires once.
  const formatSwitchAppliedRef = useRef<Set<string>>(new Set())
  // MAYA-GUIDED-TEXT-02: one bake continuation per result card at a time. The generation
  // completion paths (auto) and the card's "Try text again" button (manual) share this.
  const bakeContinuationKeysRef = useRef<Set<string>>(new Set())
  // MAYA-GUIDED-TEXT-01 (Sandra 2026-07-02): for graphic formats the text style is the FIRST
  // tap. Until she picks one, the concept pull is held and the six example cards sit inline in
  // the thread. The choice rides every generation in this chat; the chip above the direction
  // cards swaps it later.
  const [textOverlayMode, setTextOverlayMode] = useState<GraphicTextMode | null>(
    () => restoredDraft?.textOverlayMode ?? null
  )
  const [textStyleChoice, setTextStyleChoice] = useState<OverlayStyleId | null>(
    () => restoredDraft?.textStyleChoice ?? null
  )
  const [textStyleAdjustments, setTextStyleAdjustments] = useState<string | null>(
    () => restoredDraft?.textStyleAdjustments ?? null
  )
  const [styleSwapOpen, setStyleSwapOpen] = useState(false)
  const [inlineAesthetics, setInlineAesthetics] = useState<Aesthetic[]>(AESTHETICS)
  const [aestheticsFallback, setAestheticsFallback] = useState(false)
  const [inlineShotPickerAesthetic, setInlineShotPickerAesthetic] = useState<Aesthetic | null>(null)
  const [pendingShotDirector, setPendingShotDirector] = useState<{
    aesthetic: Aesthetic
    shot: AestheticShot
    intent: CreationIntent
  } | null>(null)
  const sessionStartRef = useRef<number | null>(restoredDraft ? (session?.startedAt ?? null) : null)
  const seededMessageSentRef = useRef<number | null>(
    restoredDraft?.messages.length ? (session?.startedAt ?? null) : null
  )
  const [localCreationIntent, setLocalCreationIntent] = useState<CreationIntent | null>(
    () => session?.creationIntent ?? null
  )
  // "New chat" retires the session's seeded idea (a Content recommendation) without mutating
  // the session itself; a genuinely new session re-arms it.
  const seedRetiredRef = useRef(Boolean(restoredDraft?.messages.length))

  const [uploadingSlot, setUploadingSlot] = useState<UploadSlot | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [input, setInput] = useState("")
  // Collapse the composer back to one row once the message is sent (value cleared).
  useEffect(() => {
    if (input === "" && composerRef.current) composerRef.current.style.height = "auto"
  }, [input])
  const [pendingClarifyKind, setPendingClarifyKind] = useState<"format" | "detail" | null>(null)
  const [generationSource, setGenerationSource] = useState<GenerationSource>(
    () => restoredDraft?.generationSource ?? "selfie"
  )
  // Per-card generation state, keyed by `${messageId}:${conceptId}`.
  const [genState, setGenState] = useState<Record<string, ConceptGenState>>(
    () => restoredDraft?.genState ?? {}
  )
  const inFlightGenerationKeysRef = useRef<Set<string>>(new Set())
  const recoveringGenerationKeysRef = useRef<Set<string>>(new Set())
  // Authoritative snapshot of the most recent completed render (2026 UX contract rule 4):
  // sent with every chat turn so Maya's belief about "what just rendered" is ground truth.
  const [lastGeneration, setLastGeneration] = useState<LastGenerationSnapshot | null>(
    () => restoredDraft?.lastGeneration ?? null
  )
  const workspacePathRef = useRef<ConciergeSession["workspacePath"]>(
    session?.workspacePath ?? null
  )
  useEffect(() => {
    const nextPath = session?.workspacePath ?? null
    if (workspacePathRef.current === nextPath) return
    workspacePathRef.current = nextPath
    // A lane switch starts a clean task. Never let a previous lane's generated cards or
    // authoritative render snapshot influence the new chat before its task hydration lands.
    setGenState({})
    setLastGeneration(null)
    setLocalCreationIntent(session?.creationIntent ?? null)
    lastPulledFormatRef.current = null
  }, [session?.creationIntent, session?.workspacePath])
  // MAYA-GUIDED-TEXT-01: "remove text" is an instant clean-image swap. Keep the previous
  // baked render in memory so "put the text back" can restore it without another API call.
  const hiddenBakedTextRef = useRef<Record<string, Array<string | null>>>({})
  const hiddenBakedImageIdsRef = useRef<Record<string, Array<number | null>>>({})
  // Fullscreen viewer: the set of image urls currently open (null = closed).
  const [lightbox, setLightbox] = useState<{
    key?: string
    format?: OutputFormat
    images: string[]
    assetIds?: Array<string | number | null>
    bakedAssetIds?: Array<string | number | null>
    formats?: Array<string | null>
    textOverlaySpecs?: TextOverlaySpec[]
    /** Which slide to open on (a specific thumbnail tap), not always slide 1. */
    startIndex?: number
    /** Names the "Download all" zip. */
    conceptTitle?: string | null
  } | null>(null)
  // The lightbox freezes assetIds/bakedAssetIds at open time (asset-lineage contract: id and
  // format arrays must come from one consistent read, never mixed live/frozen per field - see
  // tests/app-v3-asset-lineage.test.tsx). But a with-text carousel can still be baking slides
  // client-side (bakeMissingTextSlides) while she's looking at it, and each finished bake
  // writes a real bakedAiImageIds entry into genState. Re-sync the frozen snapshot whenever
  // that happens, so a slide's Download/Favorite target updates the moment its text lands
  // instead of staying attributed to the clean image until she reopens the viewer.
  const liveLightboxBakedIds = lightbox?.key ? genState[lightbox.key]?.bakedAiImageIds : undefined
  useEffect(() => {
    // Narrowed to this one concept's bakedAiImageIds array (not the whole genState object):
    // genState changes on every streaming preview frame across every open generation, and this
    // sync only matters for the ONE concept currently in the viewer.
    if (!lightbox?.key || !liveLightboxBakedIds || liveLightboxBakedIds.length === 0) return
    setLightbox(current => {
      if (!current || current.key !== lightbox.key) return current
      const currentIds = current.bakedAssetIds ?? []
      const changed =
        liveLightboxBakedIds.length !== currentIds.length ||
        liveLightboxBakedIds.some((id, i) => id !== currentIds[i])
      return changed ? { ...current, bakedAssetIds: liveLightboxBakedIds } : current
    })
  }, [liveLightboxBakedIds, lightbox?.key])
  // True Edit Mode target: which generated image we're refining.
  const [editTarget, setEditTarget] = useState<{
    key: string
    url: string
    format: OutputFormat
    sourceImageId: number | null
    sourceTitle: string | null
    chatId: string
    sessionStartedAt: number
  } | null>(null)
  const [editBusy, setEditBusy] = useState(false)
  const [textRefining, setTextRefining] = useState(false)
  // Which photoshoot-set generation key is currently zipping a bulk download (null = none).
  const [photoshootBulkDownloadKey, setPhotoshootBulkDownloadKey] = useState<string | null>(null)
  // Out-of-credits modal (opened when /generate returns 402).
  const [creditModal, setCreditModal] = useState<{ open: boolean; balance: number | null }>({
    open: false,
    balance: null,
  })
  // TRIAL-CAP-01: a blocked trial user sees the membership offer (her photos are the proof),
  // never the top-up modal. Members keep the credits path.
  const [trialCapOpen, setTrialCapOpen] = useState(false)
  // Pre-generation freeze fix (UX audit 2026-07-06 #1): the balance is visible IN the
  // drawer, so "will this use up my credits?" never blocks the first image.
  const [creditBalance, setCreditBalance] = useState<number | null>(null)
  const [creditsUnlimited, setCreditsUnlimited] = useState(false)
  const showCreditBlock = (balance: number | null) => {
    if (typeof balance === "number") setCreditBalance(balance)
    if (cohort === "trial") setTrialCapOpen(true)
    else setCreditModal({ open: true, balance })
  }
  const showTrialCapIfDepleted = (balance: unknown) => {
    if (typeof balance === "number") setCreditBalance(balance)
    if (cohort === "trial" && typeof balance === "number" && balance <= 0) setTrialCapOpen(true)
  }
  // Past-selfie picker.
  // One selfie surface everywhere in chat: the full reference manager (main selfie +
  // saved selfies + angle/side/body/inspiration slots), not a raw file picker.
  const [selfieManagerOpen, setSelfieManagerOpen] = useState(false)
  const [selfieManagerInitialFocus, setSelfieManagerInitialFocus] = useState<
    "face" | "inspiration"
  >("face")
  const openSelfieManager = useCallback((initialFocus: "face" | "inspiration" = "face") => {
    setSelfieManagerInitialFocus(initialFocus)
    setSelfieManagerOpen(true)
  }, [])
  // Header overflow menu (New chat / History / Memory live here, not as stacked buttons).
  const [menuOpen, setMenuOpen] = useState(false)
  const [newChatConfirming, setNewChatConfirming] = useState(false)
  // Once the conversation starts, the setup block collapses to a one-line strip so the thread
  // owns the screen (the stacked chips/selfie/CTA were hiding Maya's output on phones).
  const [setupOpen, setSetupOpen] = useState(() => restoredDraft?.setupOpen ?? false)
  // A graphic CTA can reveal its required text choice before the first chat message exists.
  // Relying only on messages.length left setup mounted, so "Show me carousel ideas" looked inert.
  const [preMessageThreadOpen, setPreMessageThreadOpen] = useState(false)
  // Cross-session memory (Phase E): what Maya already knows + the name she was given.
  const [memory, setMemory] = useState<Memory | null>(null)
  const [memoryOpen, setMemoryOpen] = useState(false)
  const [videoGalleryImages, setVideoGalleryImages] = useState<string[] | null>(null)
  const [videoGalleryError, setVideoGalleryError] = useState<string | null>(null)
  // Progressive onboarding: only for members Maya doesn't already know, after first value.
  const [hasBrandProfile, setHasBrandProfile] = useState(true)
  const [generatedOnce, setGeneratedOnce] = useState(() => restoredDraft?.generatedOnce ?? false)
  const [valueUsed, setValueUsed] = useState(() => restoredDraft?.valueUsed ?? false)
  const [brandDraft, setBrandDraft] = useState("")
  const [brandPromptDismissed, setBrandPromptDismissed] = useState(false)
  const [brandSaveState, setBrandSaveState] = useState<"idle" | "saving" | "error">("idle")
  // Value-first: the brand interview waits until she has actually used/downloaded a result.
  const showBrandPrompt =
    valueUsed && !hasBrandProfile && !memory?.brandNotes?.trim() && !brandPromptDismissed

  useEffect(() => {
    if (!showBrandPrompt) return
    const frame = window.requestAnimationFrame(() => {
      scrollThreadToBottom()
    })
    return () => window.cancelAnimationFrame(frame)
  }, [showBrandPrompt, scrollThreadToBottom])

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)")
    const sync = () => setIsDesktopWorkspace(media.matches)
    sync()
    media.addEventListener("change", sync)
    return () => media.removeEventListener("change", sync)
  }, [])

  useEffect(() => {
    if (!isOpen) return
    fetch("/api/app-v3/maya/memory")
      .then(r => r.json())
      .then(d => {
        setMemory({
          agentName: d?.agentName ?? null,
          brandNotes: d?.brandNotes ?? null,
          preferences: d?.preferences ?? null,
          userAvatarUrl: d?.userAvatarUrl ?? null,
          preferredOverlayStyle: d?.preferredOverlayStyle ?? null,
        })
        setHasBrandProfile(d?.hasBrandProfile ?? true)
      })
      .catch(() =>
        setMemory({
          agentName: null,
          brandNotes: null,
          preferences: null,
          userAvatarUrl: null,
          preferredOverlayStyle: null,
        })
      )
  }, [isOpen])

  // Her remembered baked-text style. Derived here, above the conversational format-switch
  // effect that reads it (a later declaration would be a TDZ crash via the deps array).
  const rememberedOverlayStyle = normalizeOverlayStyleId(memory?.preferredOverlayStyle)

  useEffect(() => {
    if (!isOpen || session?.outputFormat !== "video") return
    setVideoGalleryImages(null)
    setVideoGalleryError(null)
    fetch("/api/app-v3/gallery")
      .then(r => r.json())
      .then(d => setVideoGalleryImages(Array.isArray(d?.images) ? d.images.slice(0, 12) : []))
      .catch(() => setVideoGalleryError("Couldn't load your photos. Upload one instead."))
  }, [isOpen, session?.outputFormat])

  // Identity persistence (QA P1-3): returning members shouldn't re-upload their face. When Maya
  // opens with no active selfie, quietly restore the newest saved one (user_avatar_images).
  const [selfieRestored, setSelfieRestored] = useState(false)
  const activeSelfieRef = useRef<string | null>(null)
  const restoreTriedRef = useRef<number | null>(null)
  // True only when the active session came back with existing messages (draft restore or
  // reopening an old chat). Gates the saved-inspiration restore below: creative direction
  // may return to work-in-progress, but must never silently attach to a fresh creation.
  const sessionResumedWithHistoryRef = useRef(false)

  // Optional uploads (front face lives in session). Kept simple: hidden until "Add more".
  const [showMore, setShowMore] = useState(false)
  const [threeQuarterUrl, setThreeQuarterUrl] = useState<string | null>(null)
  const [sideProfileUrl, setSideProfileUrl] = useState<string | null>(null)
  const [fullBodyUrl, setFullBodyUrl] = useState<string | null>(null)
  const [inspirationUrl, setInspirationUrl] = useState<string | null>(
    session?.inspirationImageUrl ?? null
  )
  // SUITE-UX-02: inspiration attaches straight from the composer (no buried slot).
  const attachInputRef = useRef<HTMLInputElement>(null)
  const pendingInspirationIntentRef = useRef<CreationIntent | null>(null)

  // SUITE-UX-02 mobile: when the on-screen keyboard opens, iOS shrinks only the VISUAL
  // viewport; a 100dvh drawer keeps its layout height and a dead dark gap opens under the
  // composer. Track the visual viewport and pin the drawer to it while the keyboard is up.
  //
  // 2026-07-21 live report: the drawer landed behind the shell (or showed only its lower
  // half) after the first message, every time after. Root cause: a "scroll" listener here
  // ALSO recomputed keyboardBox, but visualViewport "scroll" fires for ANY pan of the visual
  // viewport - including a transient one WebKit can trigger just from scrolling the thread's
  // own overflow-y-auto content (the auto-scroll-to-bottom effect below runs on every new
  // message). If that transient pan landed keyboardBox.top on a stray value, nothing ever
  // corrected it, because the keyboard often never fully closes between messages, so no
  // fresh "resize" event ever fires to fix it - the drawer stayed wrongly translated for the
  // rest of the session. Keyboard open/close is fundamentally a RESIZE signal (the viewport's
  // height changes); it is never a "scroll" signal, so only resize is tracked now.
  const [keyboardBox, setKeyboardBox] = useState<{ height: number; top: number } | null>(null)
  useEffect(() => {
    if (homeMode) {
      setKeyboardBox(null)
      return
    }
    const vv = typeof window !== "undefined" ? window.visualViewport : null
    if (!vv) return
    // 2026-07-29 live report: the drawer sometimes "drops down" on its own (create page
    // visible behind it) until the member taps to refocus. Root cause: a viewport resize
    // with no keyboard involved (iOS toolbar show/hide, partial keyboard dismissal) could
    // still satisfy the >80px shrink heuristic and latch a positive offsetTop, and nothing
    // corrected it until the NEXT resize. The keyboard only exists while an editable
    // element is focused, so that focus is now a hard precondition for translating the
    // drawer, and blur always clears the transform.
    const editableFocused = () => {
      const active = document.activeElement
      if (!active) return false
      const tag = active.tagName
      return (
        tag === "TEXTAREA" || tag === "INPUT" || (active as HTMLElement).isContentEditable === true
      )
    }
    let blurTimeout: number | null = null
    const update = () => {
      const keyboardLikely = editableFocused() && window.innerHeight - vv.height > 80
      // Defensive clamp: a legitimate keyboard-open offset is never negative and never
      // larger than the visible viewport itself. Never let a stray reading push the drawer
      // off-screen.
      const top = Math.max(0, Math.min(vv.offsetTop, vv.height))
      setKeyboardBox(keyboardLikely ? { height: vv.height, top } : null)
    }
    // On blur the keyboard dismisses, but iOS fires the blur before (and occasionally
    // without) the matching viewport resize — re-evaluate shortly after so the drawer can
    // never stay translated with no keyboard on screen.
    const onFocusChange = () => {
      update()
      if (blurTimeout !== null) window.clearTimeout(blurTimeout)
      blurTimeout = window.setTimeout(update, 250)
    }
    vv.addEventListener("resize", update)
    window.addEventListener("focusin", onFocusChange)
    window.addEventListener("focusout", onFocusChange)
    update()
    return () => {
      vv.removeEventListener("resize", update)
      window.removeEventListener("focusin", onFocusChange)
      window.removeEventListener("focusout", onFocusChange)
      if (blurTimeout !== null) window.clearTimeout(blurTimeout)
    }
  }, [homeMode])

  // Latest context for the chat transport (read fresh on every send).
  const extrasRef = useRef<{
    aestheticName: string
    aestheticIntent: string
    aestheticId: string
    selectedShot: AestheticShot | null
    workspacePath: ConciergeSession["workspacePath"]
    format: OutputFormat | null
    creationIntent: CreationIntent | null
    shotDirector: ShotDirectorIntent | null
    referenceSelfieUrl: string | null
    videoSourceUrl: string | null
    inspirationImageUrl: string | null
    /** The member's carried idea - structured context, never a replayed user message. */
    creationIdea: string | null
    /** Ground truth about the most recent completed render in this session. */
    lastGeneration: LastGenerationSnapshot | null
    /** Explicit task context; Calendar styling must never be inferred for ordinary Maya work. */
    mayaContext: ConciergeSession["mayaContext"]
    skoolHandoffKey: SkoolHandoffKey | null
  }>({
    aestheticName: "",
    aestheticIntent: "",
    aestheticId: "",
    selectedShot: null,
    workspacePath: null,
    format: null,
    creationIntent: null,
    shotDirector: null,
    referenceSelfieUrl: null,
    videoSourceUrl: null,
    inspirationImageUrl: null,
    creationIdea: null,
    lastGeneration: null,
    mayaContext: null,
    skoolHandoffKey: null,
  })

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/app-v3/maya/chat",
        prepareSendMessagesRequest: ({ messages }) => ({
          body: { messages, ...extrasRef.current },
        }),
      }),
    []
  )

  // Conversation persistence (Phase C). Client-driven save on each completed turn.
  const [chatId, setChatId] = useState<string>(() =>
    operatingLayerEnabled && session?.mayaContext?.taskId
      ? session.mayaContext.taskId
      : (restoredDraft?.chatId ?? newChatId())
  )
  // Keep one client-side Chat instance while the persistence id changes. @ai-sdk/react creates
  // a brand-new Chat during render when its `id` option changes; a same-click setMessages call
  // still targets the previous instance, so history hydration would be discarded.
  const { messages, sendMessage, status, error, setMessages } = useChat({
    transport,
    messages: (restoredDraft?.messages ?? []) as any[],
  })
  const isThinking = status === "submitted" || status === "streaming"
  const workspaceBusy =
    editBusy ||
    isThinking ||
    textRefining ||
    inFlightGenerationKeysRef.current.size > 0 ||
    Object.values(genState).some(state => state.status === "generating")

  useEffect(() => {
    setWorkspaceBusy(workspaceBusy)
  }, [setWorkspaceBusy, workspaceBusy])

  useEffect(
    () => () => {
      setWorkspaceBusy(false)
    },
    [setWorkspaceBusy]
  )

  const [historyOpen, setHistoryOpen] = useState(false)
  const [latestResumeTask, setLatestResumeTask] = useState<{
    id: string
    title: string
  } | null>(null)
  const savedCountRef = useRef(restoredDraft?.messages.length ?? 0)
  const [chatSaveError, setChatSaveError] = useState(false)
  const [chatSaveRetry, setChatSaveRetry] = useState(0)
  const [calendarDeliveryError, setCalendarDeliveryError] = useState<string | null>(null)
  const [draftSyncError, setDraftSyncError] = useState(false)
  const [draftSyncRetry, setDraftSyncRetry] = useState(0)
  const appliedDraftSessionRef = useRef<number | null>(restoredDraft?.sessionStartedAt ?? null)
  const appliedTaskIdRef = useRef<string | null>(
    operatingLayerEnabled && restoredDraft && session?.mayaContext?.taskId
      ? session.mayaContext.taskId
      : null
  )
  const hydratedTaskIdRef = useRef<string | null>(appliedTaskIdRef.current)
  const conciergeMountedAtRef = useRef(Date.now())
  const [taskHydrationEpoch, setTaskHydrationEpoch] = useState(0)
  // The chatId that belongs to the CURRENT session. For one commit after a session switch,
  // the rendered chatId/messages are still the previous thread's - the save effect must not
  // persist that stale pairing under the new session key ("Start new shows the old chat").
  const sessionChatIdRef = useRef<string | null>(
    operatingLayerEnabled && session?.mayaContext?.taskId
      ? session.mayaContext.taskId
      : (restoredDraft?.chatId ?? null)
  )
  // Changing useChat's id and hydrating its messages can span two React commits. Suppress the
  // first save for the destination id so the previous conversation can never overwrite a past
  // chat during that transition.
  const suppressChatSaveForIdRef = useRef<string | null>(null)
  const homeTaskInitiatedRef = useRef(false)
  const chatSaveSignatureRef = useRef("")
  const calendarHandoffSentRef = useRef<string | null>(
    session?.calendarTarget?.announced ? (session.calendarTarget.requestId ?? null) : null
  )

  const hydrateTaskConversation = useCallback(
    (snapshot: ServerMayaDraftSnapshot, activeSession: NonNullable<typeof session>) => {
      const taskId = activeSession.mayaContext?.taskId
      if (!taskId || snapshot.chatId !== taskId) return
      const restoredSession = snapshot.session
      const restoringCalendarPost = activeSession.mayaContext?.job === "finish_calendar_post"

      updateCurrentSession(restoredSession.aesthetic as Aesthetic, {
        format: restoringCalendarPost
          ? (activeSession.outputFormat ?? undefined)
          : (restoredSession.outputFormat ?? undefined),
        referenceSelfieUrl: restoredSession.referenceSelfieUrl ?? activeSession.referenceSelfieUrl,
        videoSourceUrl: restoredSession.videoSourceUrl,
        inspirationImageUrl: restoredSession.inspirationImageUrl,
        creationIntent: restoringCalendarPost
          ? activeSession.creationIntent
          : restoredSession.creationIntent,
        shotDirector: restoredSession.shotDirector,
        generationSource: snapshot.generationSource,
        creationIdea: restoringCalendarPost
          ? activeSession.creationIdea
          : restoredSession.creationIdea,
      })
      sessionResumedWithHistoryRef.current = snapshot.messages.length > 0
      savedCountRef.current = snapshot.messages.length
      lastPulledFormatRef.current = snapshot.messages.length
        ? (activeSession.outputFormat ?? null)
        : null
      seedRetiredRef.current = Boolean(snapshot.messages.length)
      formatSwitchAppliedRef.current.clear()
      for (const message of snapshot.messages as any[]) {
        if (message?.role !== "assistant" || !Array.isArray(message.parts)) continue
        for (const part of message.parts) {
          const format = extractFormatSwitch(part)
          if (format) formatSwitchAppliedRef.current.add(`${message.id}:${format}`)
        }
      }
      sessionChatIdRef.current = taskId
      suppressChatSaveForIdRef.current = taskId
      setChatId(taskId)
      setMessages(snapshot.messages as any[])
      setGenState(snapshot.genState as Record<string, ConceptGenState>)
      setGeneratedOnce(snapshot.generatedOnce)
      setLastGeneration(snapshot.lastGeneration ?? null)
      setTextOverlayMode(snapshot.textOverlayMode ?? null)
      setTextStyleChoice(snapshot.textStyleChoice ?? null)
      setTextStyleAdjustments(snapshot.textStyleAdjustments ?? null)
      setGenerationSource(
        snapshot.generationSource === "trained-model" && hasTrainedModel
          ? "trained-model"
          : "selfie"
      )
      setValueUsed(snapshot.valueUsed === true)
      setSetupOpen(snapshot.setupOpen)
      setPreMessageThreadOpen(false)
      setLocalCreationIntent(activeSession.creationIntent ?? null)
      if (snapshot.messages.length > 0 && activeSession.calendarTarget) {
        // Hydration and the provider's announced-state update paint on separate commits. Claim
        // this request synchronously so the handoff effect cannot send a duplicate turn in the
        // gap between restoring the messages and painting `announced: true`.
        calendarHandoffSentRef.current = activeSession.calendarTarget.requestId
        markCalendarTargetAnnounced(activeSession.calendarTarget.requestId)
      }
    },
    [hasTrainedModel, markCalendarTargetAnnounced, setMessages, updateCurrentSession]
  )

  useEffect(() => {
    if (!session) return
    if (operatingLayerEnabled && session.mayaContext) {
      const taskId = session.mayaContext.taskId
      if (appliedTaskIdRef.current === taskId) return
      appliedTaskIdRef.current = taskId
      appliedDraftSessionRef.current = session.startedAt
      sessionStartRef.current = session.startedAt
      hydratedTaskIdRef.current = null
      restoredDraftRef.current = null
      sessionResumedWithHistoryRef.current = false
      savedCountRef.current = 0
      lastPulledFormatRef.current = null
      seedRetiredRef.current = false
      formatSwitchAppliedRef.current.clear()
      inFlightGenerationKeysRef.current.clear()
      pendingInspirationIntentRef.current = null
      homeTaskInitiatedRef.current = false
      sessionChatIdRef.current = taskId
      suppressChatSaveForIdRef.current = taskId
      setChatId(taskId)
      setMessages([])
      setGenState({})
      setGeneratedOnce(false)
      setLastGeneration(null)
      setTextOverlayMode(null)
      setTextStyleChoice(null)
      setTextStyleAdjustments(null)
      setInspirationUrl(session.inspirationImageUrl ?? null)
      setGenerationSource(
        session.generationSource === "trained-model" && hasTrainedModel ? "trained-model" : "selfie"
      )
      setValueUsed(false)
      setSetupOpen(false)
      setPreMessageThreadOpen(false)
      setLocalCreationIntent(session.creationIntent ?? null)

      let cancelled = false
      void (async () => {
        let snapshot = readMayaTaskDraft(taskId)
        const skipHistoryLookup = shouldSkipMayaTaskHistoryLookup({
          taskId,
          sessionStartedAt: session.startedAt,
          conciergeMountedAt: conciergeMountedAtRef.current,
          hasLocalSnapshot: Boolean(snapshot),
        })
        if (!snapshot && !skipHistoryLookup) {
          const response = await fetch(`/api/app-v3/maya/chats/${encodeURIComponent(taskId)}`)
          if (response.ok) {
            const data = (await response.json().catch(() => null)) as {
              messages?: unknown[]
              workspace?: ServerMayaDraftSnapshot | null
            } | null
            if (data?.workspace?.chatId === taskId) {
              snapshot = {
                ...data.workspace,
                messages: Array.isArray(data.messages) ? data.messages : data.workspace.messages,
              }
              saveMayaTaskDraft(snapshot)
            }
          }
        }
        if (cancelled || appliedTaskIdRef.current !== taskId) return
        if (snapshot) hydrateTaskConversation(snapshot, session)
        hydratedTaskIdRef.current = taskId
        setTaskHydrationEpoch(value => value + 1)
      })().catch(() => {
        if (cancelled || appliedTaskIdRef.current !== taskId) return
        hydratedTaskIdRef.current = taskId
        setTaskHydrationEpoch(value => value + 1)
      })

      return () => {
        cancelled = true
      }
    }
    if (appliedDraftSessionRef.current === session.startedAt) return
    const draft = readMayaDraftForSession(session.startedAt)
    appliedDraftSessionRef.current = session.startedAt
    if (!draft) {
      sessionResumedWithHistoryRef.current = false
      restoredDraftRef.current = null
      savedCountRef.current = 0
      lastPulledFormatRef.current = null
      seedRetiredRef.current = false
      formatSwitchAppliedRef.current.clear()
      inFlightGenerationKeysRef.current.clear()
      pendingInspirationIntentRef.current = null
      const freshChatId = newChatId()
      sessionChatIdRef.current = freshChatId
      suppressChatSaveForIdRef.current = freshChatId
      setChatId(freshChatId)
      setMessages([])
      setGenState({})
      setGeneratedOnce(false)
      setLastGeneration(null)
      setTextOverlayMode(null)
      setTextStyleChoice(null)
      setTextStyleAdjustments(null)
      setGenerationSource(
        session.generationSource === "trained-model" && hasTrainedModel ? "trained-model" : "selfie"
      )
      setValueUsed(false)
      setSetupOpen(false)
      setPreMessageThreadOpen(false)
      setLocalCreationIntent(session.creationIntent ?? null)
      return
    }

    restoredDraftRef.current = draft
    sessionResumedWithHistoryRef.current = draft.messages.length > 0
    savedCountRef.current = draft.messages.length
    lastPulledFormatRef.current = draft.messages.length ? (session.outputFormat ?? null) : null
    seedRetiredRef.current = Boolean(draft.messages.length)
    sessionStartRef.current = session.startedAt
    for (const m of draft.messages as any[]) {
      if (m?.role !== "assistant" || !Array.isArray(m.parts)) continue
      for (const p of m.parts) {
        const fmt = extractFormatSwitch(p)
        if (fmt) formatSwitchAppliedRef.current.add(`${m.id}:${fmt}`)
      }
    }
    sessionChatIdRef.current = draft.chatId
    suppressChatSaveForIdRef.current = draft.chatId
    setChatId(draft.chatId)
    setMessages(draft.messages as any)
    setGenState(draft.genState)
    setGeneratedOnce(draft.generatedOnce)
    setLastGeneration(draft.lastGeneration ?? null)
    setTextOverlayMode(draft.textOverlayMode ?? null)
    setTextStyleChoice(draft.textStyleChoice ?? null)
    setTextStyleAdjustments(draft.textStyleAdjustments ?? null)
    setGenerationSource(
      draft.generationSource === "trained-model" && hasTrainedModel ? "trained-model" : "selfie"
    )
    setValueUsed(draft.valueUsed === true)
    setSetupOpen(draft.setupOpen)
    setPreMessageThreadOpen(false)
    setLocalCreationIntent(session.creationIntent ?? null)
  }, [hasTrainedModel, hydrateTaskConversation, operatingLayerEnabled, session, setMessages])

  // A progressive preview can update many times per second. Persist only the durable projection
  // so transient frames neither bloat storage nor continuously cancel either save debounce.
  const durableGenStateSignature = JSON.stringify(durableCreativeTaskState(genState))

  useEffect(() => {
    if (!isOpen || !session) return
    if (operatingLayerEnabled && session.mayaContext && session.mayaContext.taskId !== chatId) {
      return
    }
    // Stale-commit guard: right after a session switch, this render's chatId/messages still
    // belong to the PREVIOUS thread. Saving them under the new session key is how "Start
    // new" used to resurrect the old conversation.
    if (sessionChatIdRef.current !== null && sessionChatIdRef.current !== chatId) return
    const durableGenState = JSON.parse(durableGenStateSignature) as Record<string, ConceptGenState>
    const snapshot: ServerMayaDraftSnapshot = {
      isOpen,
      chatId,
      session,
      savedAt: Date.now(),
      messages,
      genState: durableGenState,
      generatedOnce,
      setupOpen,
      lastGeneration,
      textOverlayMode,
      textStyleChoice,
      textStyleAdjustments,
      generationSource,
      valueUsed,
    }
    if (operatingLayerEnabled && session.mayaContext) {
      saveMayaTaskDraft(snapshot)
    } else {
      saveMayaDraft({
        chatId: snapshot.chatId,
        sessionStartedAt: snapshot.session.startedAt,
        messages: snapshot.messages,
        genState: durableGenState,
        generatedOnce: snapshot.generatedOnce,
        setupOpen: snapshot.setupOpen,
        lastGeneration,
        textOverlayMode,
        textStyleChoice,
        textStyleAdjustments,
        generationSource,
        valueUsed,
      })
    }
    setDraftSyncError(false)
    const timeout = window.setTimeout(() => {
      void fetch("/api/app-v3/maya/draft", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft: snapshot }),
      })
        .then(response => {
          if (!response.ok) throw new Error(`Draft sync returned ${response.status}`)
        })
        .catch(() => setDraftSyncError(true))
    }, 700)
    return () => window.clearTimeout(timeout)
  }, [
    chatId,
    durableGenStateSignature,
    generatedOnce,
    generationSource,
    isOpen,
    lastGeneration,
    messages,
    operatingLayerEnabled,
    session,
    setupOpen,
    textOverlayMode,
    textStyleAdjustments,
    textStyleChoice,
    valueUsed,
    draftSyncRetry,
  ])

  useEffect(() => {
    if (status !== "ready" || !session) return
    const persistEmptyLearningTask =
      operatingLayerEnabled && session.mayaContext?.job === "learn_next"
    if (operatingLayerEnabled && session.mayaContext && session.mayaContext.taskId !== chatId) {
      return
    }
    if (sessionChatIdRef.current !== null && sessionChatIdRef.current !== chatId) return
    if (suppressChatSaveForIdRef.current === chatId) {
      suppressChatSaveForIdRef.current = null
      // A handoff can hydrate its first useful message in the same commit that changes the
      // task id. The stale-save guard must skip that commit, then deliberately retry; otherwise
      // a Learn handoff with no later interaction never reaches History or Maya Home resume.
      if (messages.length > 0 || persistEmptyLearningTask) {
        setChatSaveRetry(value => value + 1)
      }
      return
    }
    const durableGenState = JSON.parse(durableGenStateSignature) as Record<string, ConceptGenState>
    const task = summarizeCreativeTask(durableGenState)
    if (
      messages.length === 0 &&
      task.outputCount === 0 &&
      task.status !== "creating" &&
      !persistEmptyLearningTask
    ) {
      return
    }
    const signature = JSON.stringify({
      chatId,
      messageIds: messages.map((message: any) => message?.id),
      genState: durableGenState,
      lastGeneration,
      setupOpen,
      textOverlayMode,
      textStyleChoice,
      generationSource,
      retry: chatSaveRetry,
    })
    if (chatSaveSignatureRef.current === signature) return
    const messageCount = messages.length
    const savedAt = Date.now()
    const workspace: ServerMayaDraftSnapshot = {
      isOpen,
      chatId,
      session,
      savedAt,
      messages,
      genState: durableGenState,
      generatedOnce,
      setupOpen,
      lastGeneration,
      textOverlayMode,
      textStyleChoice,
      textStyleAdjustments,
      generationSource,
      valueUsed,
    }
    setChatSaveError(false)
    const timeout = window.setTimeout(() => {
      chatSaveSignatureRef.current = signature
      void fetch("/api/app-v3/maya/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: chatId,
          messages,
          title:
            deriveTitle(messages) ??
            session.creationIdea?.slice(0, 80) ??
            (persistEmptyLearningTask ? "Continue your lesson" : session.aesthetic.name),
          savedAt,
          workspace,
          taskStatus: task.status,
          thumbnailUrl: task.thumbnailUrl,
          outputCount: task.outputCount,
        }),
      })
        .then(response => {
          if (!response.ok) throw new Error(`Chat save returned ${response.status}`)
          savedCountRef.current = Math.max(savedCountRef.current, messageCount)
        })
        .catch(() => {
          chatSaveSignatureRef.current = ""
          setChatSaveError(true)
        })
    }, 500)
    return () => window.clearTimeout(timeout)
  }, [
    chatId,
    chatSaveRetry,
    durableGenStateSignature,
    generatedOnce,
    generationSource,
    isOpen,
    lastGeneration,
    messages,
    operatingLayerEnabled,
    session,
    setupOpen,
    status,
    textOverlayMode,
    textStyleAdjustments,
    textStyleChoice,
    valueUsed,
  ])

  useEffect(() => {
    // Maya Home begins with the path chooser, not a new message. Keep its first lane visible on
    // phones instead of treating the chooser like the bottom of an active conversation.
    if (homeMode && !session?.outputFormat && messages.length === 0) return
    scrollThreadToBottom()
  }, [
    messages,
    isThinking,
    preMessageThreadOpen,
    session?.outputFormat,
    textOverlayMode,
    textStyleChoice,
    homeMode,
    session?.outputFormat,
    scrollThreadToBottom,
  ])

  useEffect(() => {
    if (messages.length > 0 && preMessageThreadOpen) setPreMessageThreadOpen(false)
  }, [messages.length, preMessageThreadOpen])

  // When a new look (or a Content idea) opens Maya, allow its format to pull fresh directions.
  // Kept minimal on purpose: no message/chat mutation here, so it can't race the pull below.
  useEffect(() => {
    if (!session) return
    if (session.startedAt === sessionStartRef.current) return
    sessionStartRef.current = session.startedAt
    lastPulledFormatRef.current = null
    seededMessageSentRef.current = null
    seedRetiredRef.current = false
    pendingInspirationIntentRef.current = null
    setTextStyleChoice(null)
    setTextStyleAdjustments(null)
    setStyleSwapOpen(false)
    setInlineShotPickerAesthetic(null)
    setPendingShotDirector(null)
    setLastGeneration(null) // a new session has no completed render yet
    setPreMessageThreadOpen(false)
    setLocalCreationIntent(session.creationIntent ?? null)
    setInspirationUrl(session.inspirationImageUrl ?? null)
    setGenerationSource(
      session.generationSource === "trained-model" && hasTrainedModel ? "trained-model" : "selfie"
    )
    if (
      session.initialSetupAction === "selfie_manager" ||
      session.initialSetupAction === "inspiration_manager"
    ) {
      setSetupOpen(true)
      openSelfieManager(
        session.initialSetupAction === "inspiration_manager" ? "inspiration" : "face"
      )
      // Retire the launch instruction immediately. Waiting for the child Close event left a
      // race where the parent session effect could reopen the manager before the close painted.
      updateCurrentSession(session.aesthetic, {
        initialSetupAction: null,
      })
    }
  }, [hasTrainedModel, openSelfieManager, session, updateCurrentSession])

  // Mirror of the active selfie for async callbacks (avoids clobbering a fresh upload).
  useEffect(() => {
    activeSelfieRef.current = session?.referenceSelfieUrl ?? null
  }, [session])

  // "Continue history" from the launcher: the chat list shows as soon as the drawer opens.
  const lastHistoryRequestRef = useRef(historyRequestId)
  const historyLoadRequestRef = useRef(0)
  useEffect(() => {
    if (historyRequestId === 0 || historyRequestId === lastHistoryRequestRef.current) return
    if (workspaceBusy) return
    lastHistoryRequestRef.current = historyRequestId
    setHistoryOpen(true)
  }, [historyRequestId, workspaceBusy])

  // Balance on open; generation responses keep it fresh via showTrialCapIfDepleted.
  useEffect(() => {
    if (!isOpen) return
    let alive = true
    fetch("/api/app-v3/account")
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (!alive || !d) return
        if (typeof d.credits === "number") setCreditBalance(d.credits)
        setCreditsUnlimited(d.creditsUnlimited === true)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [isOpen])

  // Identity persistence (QA P1-3 + SUITE-UX-02): one quiet restore attempt per session.
  // Brings back the newest saved face selfie AND the optional slots (side profile, full
  // body, inspiration) so nothing has to be re-uploaded after a refresh. New members with
  // no saved images are unaffected (empty library keeps the identity-first gate in place).
  useEffect(() => {
    if (!isOpen || !session) return
    if (restoreTriedRef.current === session.startedAt) return
    restoreTriedRef.current = session.startedAt
    fetch("/api/app-v3/reference-library")
      .then(r => r.json())
      .then(d => {
        const latest = Array.isArray(d?.images)
          ? d.images.find((u: unknown): u is string => typeof u === "string" && u.length > 0)
          : null
        if (latest && !activeSelfieRef.current) {
          setSelfieRestored(true)
          setReferenceSelfieUrl(latest)
        }
        // Optional slots: restore only into empty state - never clobber something the
        // member just uploaded or removed this session.
        const asUrl = (v: unknown): string | null =>
          typeof v === "string" && v.length > 0 ? v : null
        const angle = asUrl(d?.extras?.threeQuarter)
        const side = asUrl(d?.extras?.sideProfile)
        const body = asUrl(d?.extras?.fullBody)
        const inspiration = asUrl(d?.extras?.inspiration)
        if (angle) setThreeQuarterUrl(prev => prev ?? angle)
        if (side) setSideProfileUrl(prev => prev ?? side)
        if (body) setFullBodyUrl(prev => prev ?? body)
        // Identity (face/angles) always restores; INSPIRATION is creative direction and
        // restores only into a session that resumed with existing messages (refresh or
        // reopening work-in-progress). A fresh creation never inherits an old inspiration
        // image, whatever the entry point - it silently steered new requests toward an
        // unrelated look (contract 2026-07-13, first-result non-regression rules).
        if (sessionResumedWithHistoryRef.current) {
          if (inspiration) setInspirationUrl(prev => prev ?? inspiration)
        }
      })
      .catch(() => {})
  }, [isOpen, session, setReferenceSelfieUrl])

  const retryAesthetics = useCallback(async () => {
    setAestheticsFallback(false)
    try {
      const response = await fetch("/api/app-v3/aesthetics")
      const data = response.ok ? await response.json() : null
      if (!Array.isArray(data?.aesthetics) || data.aesthetics.length === 0) {
        throw new Error("No looks returned")
      }
      setInlineAesthetics(data.aesthetics)
    } catch {
      // Bundled Vault looks are a real, usable fallback. A slow/failed request must never
      // strand the member behind a disabled "Choose a style" button.
      setInlineAesthetics(AESTHETICS)
      setAestheticsFallback(true)
    }
  }, [])

  useEffect(() => {
    if (!isOpen) return
    void retryAesthetics()
  }, [isOpen, retryAesthetics])

  // A new task gets one visible Calendar handoff after its post-scoped history has hydrated.
  useEffect(() => {
    const target = session?.calendarTarget
    if (!calendarSurfaceActive || !isOpen || !target || target.announced || isThinking) return
    if (
      operatingLayerEnabled &&
      (target.requestedAction === "redo_caption" || target.requestedAction === "improve_caption")
    ) {
      return
    }
    if (
      operatingLayerEnabled &&
      session?.mayaContext &&
      hydratedTaskIdRef.current !== session.mayaContext.taskId
    ) {
      return
    }
    if (calendarHandoffSentRef.current === target.requestId) return
    calendarHandoffSentRef.current = target.requestId
    const intent = intentForFormat(target.plannedFormat, "content_card")
    lastPulledFormatRef.current = target.plannedFormat
    setGenerationSource("selfie")
    setLocalCreationIntent(intent)
    extrasRef.current = {
      ...extrasRef.current,
      format: target.plannedFormat,
      creationIntent: intent,
      creationIdea: target.caption || target.contentPillar || `Calendar post ${target.position}`,
    }
    const idea = target.caption?.trim() || target.contentPillar?.trim()
    const formatName =
      target.plannedFormat === "carousel"
        ? "carousel"
        : target.plannedFormat === "reel-cover"
          ? "Reel cover"
          : "photo"
    const text = target.hasImage
      ? `Let's create a fresh ${formatName} option for post ${target.position}${idea ? ` about: ${idea}` : ""}. Keep the current Calendar post safe.`
      : `Let's create the ${formatName} for post ${target.position}${idea ? ` about: ${idea}` : ""}.`
    markCalendarTargetAnnounced(target.requestId)
    sendMessage({ text })
  }, [
    calendarSurfaceActive,
    isOpen,
    isThinking,
    markCalendarTargetAnnounced,
    operatingLayerEnabled,
    sendMessage,
    session?.calendarTarget,
    session?.mayaContext,
    taskHydrationEpoch,
  ])

  // Maya-guided: once a format is chosen (a chip tap, or preselected from Content), she
  // pulls directions automatically. One pull per format; resets on a new chat or new session.
  // IDENTITY FIRST (P0): nothing streams until the selfie exists - the moment it's added,
  // this same effect fires and pulls the committed format, so upload completes the flow.
  useEffect(() => {
    if (!isOpen || !session) return
    if (
      operatingLayerEnabled &&
      (session.calendarTarget?.requestedAction === "redo_caption" ||
        session.calendarTarget?.requestedAction === "improve_caption")
    ) {
      return
    }
    if (
      operatingLayerEnabled &&
      session.mayaContext &&
      hydratedTaskIdRef.current !== session.mayaContext.taskId
    ) {
      return
    }
    // Uploading can update the active selfie before the member confirms it. Do not start
    // Maya behind the reference manager; Continue is the explicit handoff into creation.
    if (selfieManagerOpen) return
    const fmt = session.outputFormat
    if (!fmt || isThinking) return
    const pullIntent =
      localCreationIntent ?? session.creationIntent ?? intentForFormat(fmt, "manual")
    const hasSpecificSessionWorld = session.aesthetic.id !== "maya-general"
    const needsInitialVisualWorld =
      messages.length === 0 &&
      fmt !== "video" &&
      !hasSpecificSessionWorld &&
      !session.aesthetic.selectedShot
    if (needsInitialVisualWorld) return
    const canUseTrainedModelWithoutSelfie =
      hasTrainedModel && generationSource === "trained-model" && fmt === "photo"
    if (fmt === "video" && !session.videoSourceUrl) return
    if (fmt !== "video" && !session.referenceSelfieUrl && !canUseTrainedModelWithoutSelfie) return
    // Graphic formats wait for an explicit text choice. If she wants text, she picks the
    // baked style before Maya pulls directions; if she wants clean images, Maya still writes
    // copy suggestions for her to use elsewhere.
    if (isGraphicOutputFormat(fmt)) {
      if (!textOverlayMode) return
      if (textOverlayMode === "with-text" && !textStyleChoice) return
    }
    if (lastPulledFormatRef.current === fmt) return
    const isFirstPull = lastPulledFormatRef.current === null
    lastPulledFormatRef.current = fmt
    extrasRef.current = { ...extrasRef.current, format: fmt, creationIntent: pullIntent }
    // First pull may carry a seeded idea (a Content recommendation); after that, plain format.
    const seed = !seedRetiredRef.current ? session.seedPrompt : null
    const text =
      isFirstPull && seed
        ? canUseTrainedModelWithoutSelfie
          ? `${seed} Use my trained model as the photo source.`
          : seed
        : canUseTrainedModelWithoutSelfie
          ? "Let's create photos using my trained model."
          : FORMAT_PHRASE[fmt]
    sendMessage({ text })
  }, [
    generationSource,
    hasTrainedModel,
    isOpen,
    localCreationIntent,
    messages.length,
    operatingLayerEnabled,
    selfieManagerOpen,
    session,
    isThinking,
    sendMessage,
    textStyleChoice,
    textOverlayMode,
    taskHydrationEpoch,
  ])

  // Maya-first blank starts: if the Create page opened with typed text but no committed format,
  // send that sentence into Maya so she asks one inline clarifying question. Without this, a
  // needs-clarify session opened to a quiet drawer that still expected the member to pick a chip.
  useEffect(() => {
    if (!isOpen || !session || isThinking) return
    if (
      operatingLayerEnabled &&
      session.mayaContext &&
      hydratedTaskIdRef.current !== session.mayaContext.taskId
    ) {
      return
    }
    if (session.outputFormat) return
    if (messages.length > 0) return
    const seed = session.seedPrompt?.trim()
    if (!seed) return
    if (seededMessageSentRef.current === session.startedAt) return
    seededMessageSentRef.current = session.startedAt
    sendMessage({ text: seed })
  }, [
    isOpen,
    isThinking,
    messages.length,
    operatingLayerEnabled,
    sendMessage,
    session,
    taskHydrationEpoch,
  ])

  // Conversational format switching (SUITE-UX-02): when Maya calls set_format mid-chat
  // ("make me a carousel" typed, no chip), commit the switch here - the auto-pull effect
  // above then fetches fresh directions for the new format. Each tool part applies once;
  // loadChat pre-seeds historical parts so reopening an old chat never re-fires a switch.
  useEffect(() => {
    if (isThinking) return
    let latest: OutputFormat | null = null
    for (const m of messages as any[]) {
      if (m?.role !== "assistant" || !Array.isArray(m.parts)) continue
      for (const p of m.parts) {
        const fmt = extractFormatSwitch(p)
        if (!fmt) continue
        const key = `${m.id}:${fmt}`
        if (formatSwitchAppliedRef.current.has(key)) continue
        formatSwitchAppliedRef.current.add(key)
        latest = fmt
      }
    }
    if (!latest) return

    const intent = intentForFormat(latest, homeMode ? "starter_chip" : "gallery_action")
    const commitSwitchedFormat = () => {
      if (homeMode && session?.aesthetic.id === MAYA_DECIDES_AESTHETIC.id) {
        // "Maya decides" belongs to the earlier asset, not every future format in the thread.
        // Retire that automatic world while preserving a world the member chose herself.
        updateCurrentSession(MAYA_GENERAL_AESTHETIC, {
          format: latest,
          referenceSelfieUrl: session?.referenceSelfieUrl ?? null,
          videoSourceUrl: session?.videoSourceUrl ?? null,
          creationIntent: intent,
        })
      } else {
        setOutputFormat(latest)
      }
    }

    if (
      shouldContinueCompletedFormatSwitch({
        selectedFormat: session?.outputFormat ?? null,
        switchedFormat: latest,
        textMode: textOverlayMode,
        textStyleSelected: Boolean(textStyleChoice),
      })
    ) {
      setLocalCreationIntent(intent)
      extrasRef.current = { ...extrasRef.current, format: latest, creationIntent: intent }
      // The format and any required text choice are already committed. Mark this recovery pull
      // as owned here so the general auto-pull effect cannot send a duplicate turn.
      lastPulledFormatRef.current = latest
      sendMessage({ text: "Continue with what we already created." })
      return
    }

    // A typed confirmation can commit the format before Maya's set_format acknowledgement
    // arrives. Graphic formats are still incomplete at that point: expose the text decision
    // instead of leaving the thread parked with neither concepts nor a visible next action.
    if (session?.outputFormat === latest) {
      setLocalCreationIntent(intent)
      extrasRef.current = { ...extrasRef.current, format: latest, creationIntent: intent }
      commitSwitchedFormat()
      if (isGraphicOutputFormat(latest) && rememberedOverlayStyle) {
        setTextOverlayMode("with-text")
        setTextStyleChoice(rememberedOverlayStyle)
        lastPulledFormatRef.current = latest
        sendMessage({ text: "Continue with what we already created." })
      } else {
        lastPulledFormatRef.current = null
      }
      return
    }

    if (session?.outputFormat !== latest) {
      // The pull that follows must run AS the switched format. Without refreshing the intent
      // here, a stale session creationIntent (the previous format, high confidence) outranks
      // extras.format on the server, Maya answers the pull in the OLD format and calls
      // set_format again: the "On it, switching to carousels" dead end she reported.
      setLocalCreationIntent(intent)
      extrasRef.current = { ...extrasRef.current, format: latest, creationIntent: intent }
      if (isGraphicOutputFormat(latest) && rememberedOverlayStyle) {
        // A style she deliberately saved can continue with her. Without that evidence,
        // changing format must reveal the text/no-text choice instead of silently baking
        // the same template into every slide.
        setTextOverlayMode("with-text")
        setTextStyleChoice(rememberedOverlayStyle)
      } else {
        setTextOverlayMode(null)
        setTextStyleChoice(null)
      }
      setTextStyleAdjustments(null)
      setStyleSwapOpen(false)
      // Re-arm the auto-pull too: if this format was already pulled earlier in the thread,
      // a stale lastPulledFormatRef blocks both the pull and the inline text-choice cards.
      lastPulledFormatRef.current = null
      commitSwitchedFormat()
    }
  }, [
    messages,
    isThinking,
    rememberedOverlayStyle,
    sendMessage,
    session,
    setOutputFormat,
    textOverlayMode,
    textStyleChoice,
    updateCurrentSession,
    homeMode,
  ])

  useEffect(() => {
    if (isThinking) return
    let latest: OutputFormat | null = null
    for (const m of messages as any[]) {
      if (m?.role !== "assistant" || !Array.isArray(m.parts)) continue
      for (const p of m.parts) {
        const fmt = extractConceptFormat(p)
        if (fmt) latest = fmt
      }
    }
    if (!latest || session?.outputFormat === latest) return
    lastPulledFormatRef.current = latest
    setTextOverlayMode(null)
    setTextStyleChoice(null)
    setTextStyleAdjustments(null)
    setStyleSwapOpen(false)
    setOutputFormat(latest)
  }, [messages, isThinking, session, setOutputFormat])

  useEffect(() => {
    if (!hasTrainedModel && generationSource !== "selfie") setGenerationSource("selfie")
  }, [generationSource, hasTrainedModel])

  // The drawer is the active workspace, not a second page behind the app. Put keyboard focus
  // inside it, restore focus when it closes, and make Escape predictable without dismissing a
  // nested editor or modal at the same time.
  useEffect(() => {
    if (homeMode) return
    if (!isOpen) return
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    const drawerElement = drawerRef.current
    previousFocusRef.current = previouslyFocused
    const frame = window.requestAnimationFrame(() => drawerCloseRef.current?.focus())
    return () => {
      window.cancelAnimationFrame(frame)
      // React runs this cleanup while the old launcher node can still report `isConnected`,
      // then replaces it as the drawer unmounts. Restore focus after that commit so it lands
      // on a node that remains in the post-close DOM.
      window.requestAnimationFrame(() => {
        if (
          previouslyFocused &&
          previouslyFocused !== document.body &&
          previouslyFocused.isConnected &&
          !drawerElement?.contains(previouslyFocused)
        ) {
          previouslyFocused.focus()
        } else {
          document.querySelector<HTMLElement>('[aria-label="Open Maya"]')?.focus()
        }
      })
      previousFocusRef.current = null
    }
  }, [homeMode, isOpen])

  useEffect(() => {
    if (!isOpen || isDesktopWorkspace || homeMode) return
    const previousBodyOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = previousBodyOverflow
    }
  }, [homeMode, isDesktopWorkspace, isOpen])

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      const childModalOpen =
        historyOpen ||
        memoryOpen ||
        selfieManagerOpen ||
        Boolean(lightbox) ||
        creditModal.open ||
        trialCapOpen ||
        Boolean(editTarget)

      if (event.key === "Tab" && !childModalOpen && !homeMode) {
        const focusable = Array.from(
          drawerRef.current?.querySelectorAll<HTMLElement>(
            'button:not([disabled]), summary, a[href], input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          ) ?? []
        ).filter(element => element.offsetParent !== null)
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
        return
      }

      if (event.key !== "Escape") return
      if (selfieManagerOpen || Boolean(lightbox)) return
      if (historyOpen) {
        setHistoryOpen(false)
        return
      }
      if (memoryOpen) {
        setMemoryOpen(false)
        return
      }
      if (creditModal.open) {
        setCreditModal({ open: false, balance: null })
        return
      }
      if (trialCapOpen) {
        setTrialCapOpen(false)
        return
      }
      if (editTarget) {
        setEditTarget(null)
        return
      }
      if (menuOpen) {
        setMenuOpen(false)
        return
      }
      if (!homeMode) close()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [
    close,
    creditModal.open,
    editTarget,
    historyOpen,
    homeMode,
    isOpen,
    lightbox,
    memoryOpen,
    menuOpen,
    selfieManagerOpen,
    trialCapOpen,
  ])

  // A paid OpenAI request outlives this drawer. When a refresh or navigation interrupts the
  // response, the durable request id survives in the draft and this watcher reconnects it to
  // the exact Gallery rows written by the server. It never starts a second paid request.
  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    const startedKeys: string[] = []
    const pendingEntries = Object.entries(genState).filter(
      (
        entry
      ): entry is [
        string,
        ConceptGenState & { pendingRequest: NonNullable<ConceptGenState["pendingRequest"]> },
      ] => entry[1].status === "generating" && Boolean(entry[1].pendingRequest)
    )

    for (const [key, state] of pendingEntries) {
      if (
        inFlightGenerationKeysRef.current.has(key) ||
        recoveringGenerationKeysRef.current.has(key)
      ) {
        continue
      }
      recoveringGenerationKeysRef.current.add(key)
      startedKeys.push(key)
      const pending = state.pendingRequest
      void (async () => {
        const contentType = pending.format === "story-sequence" ? "story-slide" : pending.format
        const cutoff = pending.startedAt - 2 * 60 * 1000
        let latest: Array<{ url: string; id: number | null }> = []
        for (let attempt = 0; attempt < 72 && !cancelled; attempt += 1) {
          if (attempt > 0) await wait(5_000)
          try {
            const response = await fetch("/api/app-v3/gallery", { cache: "no-store" })
            if (!response.ok) continue
            const data = (await response.json().catch(() => null)) as {
              assets?: Array<{
                id?: string
                kind?: string
                contentType?: string
                url?: string
                createdAt?: string
                generationRef?: string | null
              }>
            } | null
            latest = (data?.assets ?? [])
              .filter(
                asset =>
                  asset.kind === "image" &&
                  asset.contentType === contentType &&
                  asset.generationRef?.includes(pending.clientRequestId) &&
                  typeof asset.url === "string" &&
                  Date.parse(asset.createdAt || "") >= cutoff
              )
              .map(asset => {
                const match = asset.id?.match(/^ai_(\d+)$/)
                return {
                  url: asset.url as string,
                  id: match ? Number.parseInt(match[1], 10) : null,
                }
              })
            if (latest.length >= pending.expectedCount) break
          } catch {
            // Offline is expected here; keep the durable creating state and retry quietly.
          }
        }
        if (cancelled) return
        if (latest.length > 0) {
          const completed = latest.slice(0, pending.expectedCount)
          setGenState(current => {
            const active = current[key]?.pendingRequest
            if (active?.clientRequestId !== pending.clientRequestId) return current
            return {
              ...current,
              [key]: {
                status: "done",
                imageUrls: completed.map(item => item.url),
                aiImageId: completed[0]?.id ?? null,
                aiImageIds: completed.map(item => item.id),
              },
            }
          })
          setGeneratedOnce(true)
          setLastGeneration({
            format: pending.format,
            imageCount: completed.length,
            styleName: session?.aesthetic?.name?.trim() || null,
            conceptTitle: null,
            usedInspiration: Boolean(inspirationUrl),
            usedTrainedModel: false,
          })
        } else {
          setGenState(current => {
            const active = current[key]?.pendingRequest
            if (active?.clientRequestId !== pending.clientRequestId) return current
            return {
              ...current,
              [key]: {
                status: "error",
                error:
                  "Maya could not reconnect this request yet. Check Gallery first; if it is not there, retrying is safe because the original request id is preserved.",
              },
            }
          })
        }
        recoveringGenerationKeysRef.current.delete(key)
      })()
    }

    return () => {
      cancelled = true
      for (const key of startedKeys) recoveringGenerationKeysRef.current.delete(key)
    }
  }, [genState, generationSource, inspirationUrl, isOpen, session?.aesthetic?.name])

  // Maya Home is the stable front door, including after a reload. Keep the member's most
  // recent task one action away instead of making her rediscover it through a product section
  // or the History menu.
  useEffect(() => {
    if (!homeMode || !isOpen || session?.outputFormat) {
      setLatestResumeTask(null)
      return
    }

    let cancelled = false
    const preferredTaskId = readMayaLastActiveTaskId()
    void fetch("/api/app-v3/maya/chats", { cache: "no-store" })
      .then(response => {
        if (!response.ok) throw new Error(`Chat history returned ${response.status}`)
        return response.json()
      })
      .then((data: { chats?: Array<{ id?: unknown; title?: unknown }> }) => {
        if (cancelled) return
        const chats = Array.isArray(data?.chats) ? data.chats : []
        const preferred = chats.find(
          task => typeof task?.id === "string" && task.id === preferredTaskId && task.id !== chatId
        )
        const latest =
          preferred ?? chats.find(task => typeof task?.id === "string" && task.id !== chatId)
        setLatestResumeTask(
          latest && typeof latest.id === "string"
            ? {
                id: latest.id,
                title:
                  typeof latest.title === "string" && latest.title.trim()
                    ? latest.title.trim()
                    : "your last task",
              }
            : null
        )
      })
      .catch(() => {
        if (!cancelled) setLatestResumeTask(null)
      })

    return () => {
      cancelled = true
    }
  }, [chatId, homeMode, isOpen, session?.outputFormat])

  // Keep exact-task intent separate from the shell's selected section. Maya Home deliberately
  // replaces the old section on reload, but should still know whether the member last worked on
  // post 7, a lesson, or an ordinary conversation.
  useEffect(() => {
    const taskId = session?.mayaContext?.taskId
    if (taskId && hydratedTaskIdRef.current !== taskId) return
    if (
      homeMode &&
      session?.mayaContext?.job === "create_content" &&
      !homeTaskInitiatedRef.current
    ) {
      return
    }
    const meaningfulTask =
      Boolean(session?.outputFormat) ||
      messages.length > 0 ||
      (session?.mayaContext?.job != null && session.mayaContext.job !== "create_content")
    if (!operatingLayerEnabled || !taskId || !meaningfulTask) return
    saveMayaLastActiveTaskId(taskId)
  }, [
    homeMode,
    messages.length,
    operatingLayerEnabled,
    session?.mayaContext,
    session?.outputFormat,
    taskHydrationEpoch,
  ])

  if (!isOpen || !session) return null
  const { aesthetic, outputFormat, referenceSelfieUrl } = session
  const selectedShot = aesthetic.selectedShot ?? null
  const format: OutputFormat = outputFormat ?? "photo"
  const hasStarted = messages.length > 0
  const skoolHandoffReady = Boolean(skoolHandoff && !hasStarted)
  const threadVisible = hasStarted || preMessageThreadOpen || homeMode || skoolHandoffReady
  const activeCreationIntent =
    localCreationIntent ??
    session.creationIntent ??
    (outputFormat ? intentForFormat(outputFormat, "manual") : needsClarificationIntent("manual"))
  // First value is deliberately narrower than the rest of Maya. When the member chose
  // "Start with one selfie", the format and delegation are already decided: one photo,
  // with Maya choosing the strongest visual world. Advanced setup returns after result one.
  const guidedFirstPhoto =
    aesthetic.id === "maya-decides" &&
    outputFormat === "photo" &&
    activeCreationIntent.source === "starter_chip" &&
    !generatedOnce
  const plainPreSelfieChat =
    session.initialSetupAction === "plain_chat" && !referenceSelfieUrl && !outputFormat
  const generalHomeConversation = homeMode && !outputFormat
  const videoSourceUrl = session.videoSourceUrl
  const mayaChoosesVisualWorld = session.aesthetic.id === "maya-decides"
  const hasSpecificVisualWorld = mayaChoosesVisualWorld || aesthetic.id !== "maya-general"
  const needsInitialVisualWorld =
    Boolean(outputFormat) && outputFormat !== "video" && !hasStarted && !hasSpecificVisualWorld
  const shouldShowProjectStart = !outputFormat
  const shouldShowVibeChoice =
    Boolean(outputFormat) &&
    outputFormat !== "video" &&
    !hasStarted &&
    Boolean(inlineAesthetics?.length) &&
    (!hasSpecificVisualWorld || Boolean(inlineShotPickerAesthetic))
  const customModelAvailable = hasTrainedModel && format === "photo"
  const activeGenerationSource: GenerationSource = customModelAvailable
    ? generationSource
    : "selfie"
  const closeSelfieManager = () => {
    // initialSetupAction is a one-shot launch instruction. If it stays on the session,
    // the parent effect immediately re-opens the child after its local open state changes.
    updateCurrentSession(aesthetic, { initialSetupAction: null })
    setSelfieManagerOpen(false)
    setSelfieManagerInitialFocus("face")
  }
  const learningTaskActive =
    operatingLayerEnabled &&
    session.mayaContext?.job === "learn_next" &&
    session.mayaContext.surface === "learn"
  const workspaceTitle = generalHomeConversation
    ? firstName?.trim()
      ? `${firstName.trim()}, what are we making?`
      : "What are we making?"
    : learningTaskActive
      ? "Learn with Maya"
      : calendarSurfaceActive && session.calendarTarget
        ? `Post ${session.calendarTarget.position} · ${session.calendarTarget.feedTitle || "Current grid"}`
        : mayaChoosesVisualWorld
          ? "Create with Maya"
          : aesthetic.name
  const captionActionTarget =
    operatingLayerEnabled &&
    calendarSurfaceActive &&
    session.calendarTarget &&
    (session.calendarTarget.requestedAction === "redo_caption" ||
      session.calendarTarget.requestedAction === "improve_caption")
      ? session.calendarTarget
      : null
  const captionAction = captionActionTarget
    ? (() => {
        const idempotencyKey = mayaActionIdempotencyKey(
          session.mayaContext?.taskId ?? chatId,
          "improve_caption",
          captionActionTarget.feedId,
          captionActionTarget.postId,
          captionActionTarget.requestedAction
        )
        const descriptor = createMayaAction({
          id: `caption-${idempotencyKey}`,
          taskId: session.mayaContext?.taskId ?? chatId,
          kind: "improve_caption",
          title:
            captionActionTarget.requestedAction === "redo_caption"
              ? `Create the caption for post ${captionActionTarget.position}`
              : `Improve the caption for post ${captionActionTarget.position}`,
          reason:
            captionActionTarget.requestedAction === "redo_caption"
              ? "Maya writes it in your voice. You can undo."
              : "Maya rewrites it in your voice. Your current caption is saved and you can undo.",
          target: {
            feedId: captionActionTarget.feedId,
            postId: captionActionTarget.postId,
          },
          creditCost: 0,
          requiresConfirmation: false,
          canUndo: true,
          idempotencyKey,
        })
        return captionActionTarget.captionActionStatus
          ? restoreMayaActionStatus(descriptor, captionActionTarget.captionActionStatus)
          : descriptor
      })()
    : null

  async function executeCalendarCaptionAction(target: CalendarPostTarget) {
    const improving = target.requestedAction === "improve_caption"
    const response = await fetch(
      `/api/feed/${target.feedId}/${improving ? "enhance-caption" : "regenerate-caption"}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          postId: target.postId,
          ...(improving ? { currentCaption: target.caption ?? "" } : {}),
        }),
      }
    )
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(data.error || "Maya could not finish that caption.")
    }
    const nextCaption = improving ? data.enhancedCaption : data.caption
    if (typeof nextCaption !== "string" || !nextCaption.trim()) {
      throw new Error("Maya did not return a finished caption.")
    }
    updateCalendarTargetCaption(target.requestId, nextCaption, "succeeded")
    window.dispatchEvent(
      new CustomEvent("calendar:feed-updated", { detail: { feedId: target.feedId } })
    )
  }

  async function undoCalendarCaptionAction(target: CalendarPostTarget) {
    const previousCaption = target.actionPreviousCaption ?? ""
    const response = await fetch(`/api/feed/${target.feedId}/update-caption`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ postId: target.postId, caption: previousCaption }),
    })
    if (!response.ok) throw new Error("That caption could not be restored.")
    updateCalendarTargetCaption(target.requestId, previousCaption, "undone")
    window.dispatchEvent(
      new CustomEvent("calendar:feed-updated", { detail: { feedId: target.feedId } })
    )
  }
  const openerLine = generalHomeConversation
    ? "Choose a clear path below, or tell me what you want to say, share, or sell. I'll keep the right tools and the conversation together."
    : outputFormat
      ? activeGenerationSource === "trained-model" && outputFormat === "photo"
        ? "Your trained model is ready. Hit create and pick the direction that feels most like you."
        : format === "video"
          ? videoSourceUrl
            ? FORMAT_OPENER_READY[outputFormat]
            : FORMAT_OPENER[outputFormat]
          : referenceSelfieUrl
            ? FORMAT_OPENER_READY[outputFormat]
            : FORMAT_OPENER[outputFormat]
      : referenceSelfieUrl
        ? "Pick what we're making next. Your selfie is already in."
        : "Pick what we're making next, then add one selfie."

  // Keep the transport context current.
  extrasRef.current = {
    aestheticName: aesthetic.name,
    aestheticIntent: aesthetic.intent,
    aestheticId: aesthetic.id,
    selectedShot: aesthetic.selectedShot ?? null,
    workspacePath: session.workspacePath ?? null,
    format: activeCreationIntent.format ?? outputFormat ?? null,
    creationIntent: activeCreationIntent,
    shotDirector: session.shotDirector ?? null,
    referenceSelfieUrl,
    videoSourceUrl,
    inspirationImageUrl: inspirationUrl,
    creationIdea: session.creationIdea ?? null,
    lastGeneration,
    mayaContext: session.mayaContext ?? null,
    skoolHandoffKey: skoolHandoff?.key ?? null,
  }

  function handleSkoolHandoffStart() {
    if (!skoolHandoff || isThinking) return
    if (skoolHandoffStartedRef.current === skoolHandoff.key) return
    skoolHandoffStartedRef.current = skoolHandoff.key
    if (homeMode) homeTaskInitiatedRef.current = true
    void trackAnalyticsEvent({
      event: "learn_maya_handoff",
      properties: { source: "skool", lesson_key: skoolHandoff.key },
    })
    sendMessage({ text: skoolHandoff.starterPrompt })
  }

  async function handleUpload(slot: UploadSlot, file: File) {
    setUploadError(null)
    setUploadingSlot(slot)
    try {
      const form = new FormData()
      form.append("file", file)
      // Video uploads are transient sources; selfie/reference slots persist for reuse.
      form.append("slot", slot)
      const res = await fetch("/api/app-v3/upload-selfie", { method: "POST", body: form })
      const data = (await res.json().catch(() => null)) as { url?: string; error?: string } | null
      if (!res.ok || !data?.url) throw new Error(data?.error || "Upload failed")
      if (slot === "face") {
        setSelfieRestored(false) // she chose this one herself
        setReferenceSelfieUrl(data.url)
        if (!needsInitialVisualWorld) {
          setSetupOpen(false) // replacement done: give the screen back to the thread
        }
        void trackAnalyticsEvent({
          event: "activation_selfie_uploaded",
          properties: { cohort, source: "maya_drawer" },
        })
        void trackAnalyticsEvent({
          event: "suite_inline_selfie_uploaded",
          properties: { cohort, source: "maya_drawer", format: outputFormat ?? null },
        })
      } else if (slot === "angle") setThreeQuarterUrl(data.url)
      else if (slot === "side") setSideProfileUrl(data.url)
      else if (slot === "body") setFullBodyUrl(data.url)
      else if (slot === "video") {
        setVideoSourceUrl(data.url)
        setSetupOpen(false)
      } else
        handleInspirationReady(
          data.url,
          pendingInspirationIntentRef.current ? "style_picker" : "upload"
        )
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed")
    } finally {
      setUploadingSlot(null)
    }
  }

  // Clear the saved copy first. If persistence fails, keep the visible photo so refresh cannot
  // surprise her by bringing back something the UI claimed was removed.
  async function clearSlot(slot: "angle" | "side" | "body" | "inspiration") {
    setUploadError(null)
    try {
      const response = await fetch(`/api/app-v3/upload-selfie?slot=${slot}`, { method: "DELETE" })
      if (!response.ok) throw new Error("Could not remove that photo")
      if (slot === "angle") setThreeQuarterUrl(null)
      else if (slot === "side") setSideProfileUrl(null)
      else if (slot === "body") setFullBodyUrl(null)
      else handleInspirationReady(null, "manager")
    } catch {
      setUploadError("That photo is still saved. Please try removing it again.")
    }
  }

  async function handleSend() {
    const text = input.trim()
    if (!text || isThinking || textRefining) return
    if (homeMode) homeTaskInitiatedRef.current = true
    const refinement = parseTextRefinement(text)
    if (refinement && (await applyTextRefinement(refinement))) {
      setInput("")
      return
    }
    commitDetectedIntent(text, "typed", {
      suppressAutoPull: true,
      // Once a format exists, ordinary chat is refinement. The server's set_format tool is
      // the only owner of an explicit mid-conversation switch. This prevents topic/style
      // answers such as "Quiet Luxury" or "tell my story" from corrupting the active format.
      preserveCommittedFormat:
        pendingClarifyKind !== "format" && Boolean(activeCreationIntent.format),
    })
    sendMessage({ text })
    setInput("")
    setPendingClarifyKind(null)
  }

  function startFinishedPostRefinement(format: OutputFormat) {
    const starter = "Make this more like me by "
    setInput(starter)
    void trackAnalyticsEvent({
      event: "suite_post_refinement_started",
      properties: { cohort, format },
    })
    window.requestAnimationFrame(() => {
      composerRef.current?.focus()
      composerRef.current?.setSelectionRange(starter.length, starter.length)
      resizeComposer()
      scrollThreadToBottom()
    })
  }

  function handleNewChat() {
    if (workspaceBusy) return
    if (messages.length > 0 && !newChatConfirming) {
      setNewChatConfirming(true)
      return
    }
    setNewChatConfirming(false)
    homeTaskInitiatedRef.current = false
    clearMayaDraft()
    void fetch("/api/app-v3/maya/draft", { method: "DELETE" }).catch(() => {})
    const nextChatId = operatingLayerEnabled ? newMayaTaskId() : newChatId()
    setMenuOpen(false)
    setSetupOpen(false)
    savedCountRef.current = 0
    lastPulledFormatRef.current = null
    seededMessageSentRef.current = null
    setTextOverlayMode(null)
    setTextStyleChoice(null)
    setTextStyleAdjustments(null)
    setStyleSwapOpen(false)
    setInlineShotPickerAesthetic(null)
    setPendingShotDirector(null)
    setLocalCreationIntent(null)
    seedRetiredRef.current = true // a clean session never replays the old seeded idea
    sessionResumedWithHistoryRef.current = false // a clean session never inherits old inspiration
    restoredDraftRef.current = null
    appliedDraftSessionRef.current = null
    formatSwitchAppliedRef.current.clear()
    setMessages([])
    setGenState({})
    setGeneratedOnce(false)
    setLastGeneration(null)
    setValueUsed(false)
    setInput("")
    setPreMessageThreadOpen(false)
    sessionChatIdRef.current = nextChatId
    suppressChatSaveForIdRef.current = nextChatId
    setChatId(nextChatId)
    setHistoryOpen(false)
    // Visible reset (P1): back to the four format chips, NOT an instant re-pull of the same
    // directions (which made "New chat" look like it did nothing). Selfie + memory are kept.
    setOutputFormat(null)
    resetCurrentSession(nextChatId)
  }

  async function handleSelectChat(id: string) {
    if (workspaceBusy) throw new Error("Maya is busy")
    const requestId = ++historyLoadRequestRef.current
    const res = await fetch(`/api/app-v3/maya/chats/${id}`)
    if (!res.ok) throw new Error(`Chat returned ${res.status}`)
    const data = (await res.json().catch(() => null)) as {
      messages?: unknown[]
      workspace?: ServerMayaDraftSnapshot | null
    } | null
    if (requestId !== historyLoadRequestRef.current) return
    saveMayaLastActiveTaskId(id)
    const loaded = Array.isArray(data?.messages) ? data.messages : []
    savedCountRef.current = loaded.length
    // Historical set_format parts are already-acted-on: seed them so reopening an old
    // chat never replays a format switch (and the auto-pull it triggers).
    for (const m of loaded as any[]) {
      if (m?.role !== "assistant" || !Array.isArray(m.parts)) continue
      for (const p of m.parts) {
        const fmt = extractFormatSwitch(p)
        if (fmt) formatSwitchAppliedRef.current.add(`${m.id}:${fmt}`)
      }
    }
    sessionChatIdRef.current = id
    suppressChatSaveForIdRef.current = id
    setChatId(id)
    const workspace = data?.workspace ?? null
    if (workspace) {
      const restoredSession = (
        !calendarIncluded &&
        (workspace.session.mayaContext?.surface === "calendar" || workspace.session.calendarTarget)
          ? { ...workspace.session, mayaContext: null, calendarTarget: null }
          : workspace.session
      ) as ConciergeSession
      if (operatingLayerEnabled) {
        appliedTaskIdRef.current = id
        hydratedTaskIdRef.current = id
        sessionStartRef.current = restoredSession.startedAt
        lastPulledFormatRef.current = loaded.length ? (restoredSession.outputFormat ?? null) : null
        seedRetiredRef.current = Boolean(loaded.length)
        if (loaded.length > 0 && restoredSession.calendarTarget) {
          calendarHandoffSentRef.current = restoredSession.calendarTarget.requestId
          markCalendarTargetAnnounced(restoredSession.calendarTarget.requestId)
        }
        restoreHistoryTask(id, restoredSession)
        saveMayaTaskDraft({ ...workspace, session: restoredSession, chatId: id, messages: loaded })
        if (calendarIncluded && restoredSession.mayaContext?.surface === "calendar") {
          onOpenCalendar?.()
        }
      }
      updateCurrentSession(restoredSession.aesthetic as Aesthetic, {
        format: restoredSession.outputFormat ?? undefined,
        referenceSelfieUrl: restoredSession.referenceSelfieUrl,
        videoSourceUrl: restoredSession.videoSourceUrl,
        inspirationImageUrl: restoredSession.inspirationImageUrl,
        creationIntent: restoredSession.creationIntent,
        shotDirector: restoredSession.shotDirector,
        generationSource: workspace.generationSource,
        creationIdea: restoredSession.creationIdea,
      })
      setGenState(workspace.genState as Record<string, ConceptGenState>)
      setGeneratedOnce(workspace.generatedOnce)
      setLastGeneration(workspace.lastGeneration ?? null)
      setTextOverlayMode(workspace.textOverlayMode ?? null)
      setTextStyleChoice(workspace.textStyleChoice ?? null)
      setTextStyleAdjustments(workspace.textStyleAdjustments ?? null)
      setGenerationSource(
        workspace.generationSource === "trained-model" && hasTrainedModel
          ? "trained-model"
          : "selfie"
      )
      setValueUsed(workspace.valueUsed === true)
      setSetupOpen(workspace.setupOpen)
    } else {
      if (operatingLayerEnabled) {
        appliedTaskIdRef.current = id
        hydratedTaskIdRef.current = id
        restoreHistoryTask(id)
      }
      setGenState({})
      setGeneratedOnce(false)
      setLastGeneration(null)
    }
    sessionResumedWithHistoryRef.current = loaded.length > 0
    setMessages(loaded as any)
    setHistoryOpen(false)
  }

  async function recoverSingleImageFromGallery(
    clientRequestId: string,
    startedAtMs: number,
    expectedFormat: OutputFormat,
    maxAttempts: number
  ): Promise<{ url: string; aiImageId: number | null } | null> {
    const expectedContentType = expectedFormat === "story-sequence" ? "story-slide" : expectedFormat
    const cutoff = startedAtMs - 2 * 60 * 1000
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      if (attempt > 0) await new Promise(resolve => setTimeout(resolve, 5_000))
      try {
        const response = await fetch("/api/app-v3/gallery", { cache: "no-store" })
        if (!response.ok) continue
        const data = (await response.json().catch(() => null)) as {
          assets?: Array<{
            id?: string
            kind?: string
            contentType?: string
            url?: string
            createdAt?: string
            generationRef?: string | null
          }>
        } | null
        const asset = (data?.assets ?? []).find(
          item =>
            item.kind === "image" &&
            item.contentType === expectedContentType &&
            item.generationRef?.includes(clientRequestId) &&
            typeof item.url === "string" &&
            item.url.length > 0 &&
            Date.parse(item.createdAt || "") >= cutoff
        )
        if (!asset?.url) continue
        const idMatch = asset.id?.match(/^ai_(\d+)$/)
        return {
          url: asset.url,
          aiImageId: idMatch ? Number.parseInt(idMatch[1], 10) : null,
        }
      } catch {
        // The browser may be briefly offline while the server finishes and stores the image.
      }
    }
    return null
  }

  function announceCalendarUpdated(feedId: number) {
    window.dispatchEvent(new CustomEvent("calendar:feed-updated", { detail: { feedId } }))
  }

  async function beginCalendarGeneration(
    target: CalendarPostTarget,
    generationRequestId: string
  ): Promise<void> {
    const response = await fetch(`/api/feed/${target.feedId}/maya-generation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "start",
        postId: target.postId,
        requestId: generationRequestId,
      }),
    })
    const data = (await response.json().catch(() => null)) as { error?: string } | null
    if (!response.ok) {
      throw new Error(data?.error || "Maya could not start this Calendar post.")
    }
    setCalendarDeliveryError(null)
    announceCalendarUpdated(target.feedId)
  }

  async function failCalendarGeneration(
    target: CalendarPostTarget,
    generationRequestId: string
  ): Promise<void> {
    await fetch(`/api/feed/${target.feedId}/maya-generation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "fail",
        postId: target.postId,
        requestId: generationRequestId,
      }),
    }).catch(() => null)
    announceCalendarUpdated(target.feedId)
  }

  async function attachCalendarGeneration(
    target: CalendarPostTarget,
    generationRequestId: string,
    imageUrls: string[],
    aiImageIds: Array<number | null>
  ): Promise<boolean> {
    const imageUrl = imageUrls[0]
    const aiImageId = aiImageIds[0] ?? null
    if (!imageUrl) return false
    // Pre-existing ReferenceError fixed 2026-07-29: `idempotencyKey` was an undefined name,
    // so every calendar attach after a generation threw at runtime. One generation request
    // attaching to one post is the idempotent unit.
    const idempotencyKey = mayaActionIdempotencyKey(
      "apply_to_post",
      target.feedId,
      target.postId,
      generationRequestId
    )
    const response = await fetch(`/api/feed/${target.feedId}/replace-post-image`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-maya-action-idempotency-key": idempotencyKey,
      },
      body: JSON.stringify({
        postId: target.postId,
        imageUrl,
        imageUrls,
        aiImageId,
        generationRequestId,
      }),
    })
    const data = (await response.json().catch(() => null)) as {
      error?: string
      captionStatus?: string
      post?: { caption?: string | null }
    } | null
    if (!response.ok) {
      await failCalendarGeneration(target, generationRequestId)
      setCalendarDeliveryError(
        data?.error || "Your photo is safe in Gallery, but it did not reach the Calendar yet."
      )
      return false
    }
    completeCalendarTarget(target.requestId, {
      generationRequestId,
      imageUrl,
      imageUrls,
      aiImageId,
      previousImageUrl: target.imageUrl,
      previousMediaUrls: target.mediaUrls,
      previousAiImageId: target.aiImageId,
      previousCaption: target.caption,
      deliveredCaption: data?.post?.caption ?? target.caption,
    })
    setCalendarDeliveryError(null)
    announceCalendarUpdated(target.feedId)
    void trackAnalyticsEvent({
      event: "calendar_photo_added",
      properties: {
        feedId: target.feedId,
        postId: target.postId,
        source: "maya_concierge",
        format: target.plannedFormat,
        mediaCount: imageUrls.length,
      },
    })
    if (data?.captionStatus === "ready" || data?.captionStatus === "preserved") {
      void trackAnalyticsEvent({
        event: "calendar_post_ready",
        properties: { feedId: target.feedId, postId: target.postId, source: "maya_concierge" },
      })
      finishMayaJob({ job: "finish_calendar_post", outcome: "completed" })
    }
    return true
  }

  async function placeExistingPhotoInCalendar(
    target: CalendarPostTarget,
    imageUrl: string,
    aiImageId: number | null,
    idempotencyKey = `manual:${Date.now()}`,
    requireCaption = false
  ): Promise<boolean> {
    const existingDelivery = target.delivery?.imageUrl === imageUrl ? target.delivery : null
    const response = await fetch(`/api/feed/${target.feedId}/replace-post-image`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-maya-action-idempotency-key": idempotencyKey,
      },
      body: JSON.stringify({ postId: target.postId, imageUrl, imageUrls: [imageUrl], aiImageId }),
    })
    const data = (await response.json().catch(() => null)) as {
      error?: string
      captionStatus?: string
      post?: { caption?: string | null }
    } | null
    if (!response.ok) {
      setCalendarDeliveryError(data?.error || "That photo did not reach the Calendar.")
      return false
    }
    const deliveredCaption = data?.post?.caption ?? target.caption
    completeCalendarTarget(target.requestId, {
      generationRequestId: idempotencyKey,
      imageUrl,
      imageUrls: [imageUrl],
      aiImageId,
      previousImageUrl: existingDelivery ? existingDelivery.previousImageUrl : target.imageUrl,
      previousMediaUrls: existingDelivery ? existingDelivery.previousMediaUrls : target.mediaUrls,
      previousAiImageId: existingDelivery ? existingDelivery.previousAiImageId : target.aiImageId,
      previousCaption: existingDelivery ? existingDelivery.previousCaption : target.caption,
      deliveredCaption,
    })
    announceCalendarUpdated(target.feedId)
    if (requireCaption && (data?.captionStatus === "unavailable" || !deliveredCaption?.trim())) {
      const message = `The photo is in post ${target.position}, but the caption did not finish. Try again safely.`
      setCalendarDeliveryError(message)
      throw new Error(message)
    }
    setCalendarDeliveryError(null)
    if (data?.captionStatus === "ready" || data?.captionStatus === "preserved") {
      void trackAnalyticsEvent({
        event: "calendar_post_ready",
        properties: { feedId: target.feedId, postId: target.postId, source: "maya_concierge" },
      })
      finishMayaJob({ job: "finish_calendar_post", outcome: "completed" })
    }
    return true
  }

  async function saveFinishedPostToCalendar(input: {
    assetIds: number[]
    conceptTitle: string
    captionContext: string
    finishedCaption: string
  }): Promise<
    { scheduledAt: string; position?: number; caption?: string | null } | "forbidden" | null
  > {
    const response = await fetch("/api/app-v3/maya/feed-plan/place-photo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
    if (response.status === 403) return "forbidden"
    const data = (await response.json().catch(() => null)) as {
      error?: string
      scheduledAt?: string
      position?: number
      caption?: string | null
    } | null
    if (!response.ok) throw new Error(data?.error || "The ready post did not reach Calendar.")
    if (!data?.scheduledAt) throw new Error("Calendar did not return a ready-post receipt.")
    return {
      scheduledAt: data.scheduledAt,
      ...(typeof data.position === "number" ? { position: data.position } : {}),
      caption: typeof data.caption === "string" ? data.caption : null,
    }
  }

  async function undoCalendarDelivery() {
    const target = session?.calendarTarget
    if (!target?.delivery) return
    if (target.delivery.deliveredCaption !== target.delivery.previousCaption) {
      const captionResponse = await fetch(`/api/feed/${target.feedId}/update-caption`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: target.postId,
          caption: target.delivery.previousCaption ?? "",
        }),
      })
      const captionData = (await captionResponse.json().catch(() => null)) as {
        error?: string
      } | null
      if (!captionResponse.ok) {
        const message = captionData?.error || "The caption did not undo. Please try again."
        setCalendarDeliveryError(message)
        throw new Error(message)
      }
    }
    const restorePrevious = Boolean(target.delivery.previousImageUrl)
    const response = await fetch(
      `/api/feed/${target.feedId}/${restorePrevious ? "replace-post-image" : "remove-post-image"}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          restorePrevious
            ? {
                postId: target.postId,
                imageUrl: target.delivery.previousImageUrl,
                imageUrls: target.delivery.previousMediaUrls,
                aiImageId: target.delivery.previousAiImageId,
              }
            : { postId: target.postId }
        ),
      }
    )
    const data = (await response.json().catch(() => null)) as { error?: string } | null
    if (!response.ok) {
      const message = data?.error || "That did not undo. Please try again."
      setCalendarDeliveryError(message)
      throw new Error(message)
    }
    clearCalendarDelivery(target.requestId)
    setCalendarDeliveryError(null)
    announceCalendarUpdated(target.feedId)
  }

  async function generateConcept(
    key: string,
    concept: ConceptCardData,
    targetFormat: OutputFormat = format,
    overlayStyle?: OverlayStyleId | null,
    editedCopy?: EditableConceptCopy[],
    actionRequestId?: string
  ) {
    // MAYA-COPY-PREVIEW-01: she may have edited the exact words before spending a credit.
    // Every other field (visual world, imagePromptDirection, purpose, reference strategy)
    // stays exactly as Maya wrote it - only the baked text is ever hers to change here.
    const effectiveBrief =
      editedCopy && editedCopy.length > 0
        ? applyEditedConceptCopy(concept.brief, editedCopy)
        : concept.brief
    const canUseCustomModel = activeGenerationSource === "trained-model" && targetFormat === "photo"

    if (targetFormat === "video" && !videoSourceUrl) {
      trackRecoveryShown(targetFormat, "missing_video_source", {
        phase: "generate_request",
        planState: "blocked",
      })
      setGenState(s => ({
        ...s,
        [key]: { status: "error", error: "Choose or upload the photo you want to animate first." },
      }))
      setSetupOpen(true)
      if (actionRequestId) throw new Error("Choose the photo you want to animate first.")
      return
    }
    if (targetFormat !== "video" && !referenceSelfieUrl && !canUseCustomModel) {
      trackRecoveryShown(targetFormat, "missing_selfie", {
        phase: "generate_request",
        planState: "blocked",
      })
      setGenState(s => ({
        ...s,
        [key]: { status: "error", error: "Add a selfie first so it still looks like you." },
      }))
      if (actionRequestId) throw new Error("Add a selfie first so it still looks like you.")
      return
    }
    // "Make another version" on a finished card is a re-roll - a friction signal the
    // member pulse tracks server-side (SUITE-UX-02).
    const rerun = genState[key]?.status === "done"
    if (inFlightGenerationKeysRef.current.has(key)) {
      // Only a genuinely running generation may swallow the tap. A key left behind by an
      // interrupted stream (tab hidden mid-generation, renderer reload) used to make every
      // later "Create this" tap a silent no-op (2026-07-29 audit, issue A).
      if (genState[key]?.status === "generating") return
      inFlightGenerationKeysRef.current.delete(key)
    }
    inFlightGenerationKeysRef.current.add(key)
    const activeMayaJob = session?.mayaContext?.job ?? "create_content"
    recordMayaJobDecision(activeMayaJob)
    let generationRequestId: string | null = null
    let generationStartedAt = 0
    if (targetFormat !== "video" && !canUseCustomModel) {
      generationRequestId = actionRequestId ?? newGenerationRequestId()
      generationStartedAt = Date.now()
    }
    const expectedOutputCount = Math.max(
      1,
      targetFormat === "carousel" || targetFormat === "story-sequence"
        ? (effectiveBrief.graphic?.creativePlan?.outputs?.length ??
            effectiveBrief.graphic?.slides?.length ??
            effectiveBrief.graphic?.slideCount ??
            1)
        : 1
    )
    setGenState(s => ({
      ...s,
      [key]: {
        status: "generating",
        ...(generationRequestId
          ? {
              pendingRequest: {
                clientRequestId: generationRequestId,
                startedAt: generationStartedAt,
                format: targetFormat,
                expectedCount: Math.min(9, expectedOutputCount),
              },
            }
          : {}),
      },
    }))
    const activeCalendarTarget = session?.calendarTarget
    const calendarTargetForRequest =
      targetFormat === activeCalendarTarget?.plannedFormat &&
      generationRequestId &&
      !operatingLayerEnabled &&
      calendarSurfaceActive &&
      activeCalendarTarget &&
      !activeCalendarTarget.delivery
        ? activeCalendarTarget
        : null
    let calendarSettled = !calendarTargetForRequest
    if (calendarTargetForRequest && generationRequestId) {
      try {
        await beginCalendarGeneration(calendarTargetForRequest, generationRequestId)
      } catch (error) {
        setGenState(s => ({
          ...s,
          [key]: {
            status: "error",
            error:
              error instanceof Error ? error.message : "Maya could not start this Calendar post.",
          },
        }))
        inFlightGenerationKeysRef.current.delete(key)
        return
      }
    }
    let generationResponseStatus: number | null = null
    let generationServerCode: string | null = null
    let streamResponseStarted = false
    let generationServerVerdict = false
    const isSingleImageRequest =
      targetFormat !== "carousel" &&
      targetFormat !== "story-sequence" &&
      targetFormat !== "photoshoot"
    const restorePaidSingleImage = async (
      source: "stream_recovered" | "request_recovered",
      maxAttempts: number
    ) => {
      if (!isSingleImageRequest || !generationRequestId || maxAttempts <= 0) return false
      const recovered = await recoverSingleImageFromGallery(
        generationRequestId,
        generationStartedAt,
        targetFormat,
        maxAttempts
      )
      if (!recovered) return false
      setGenState(state => ({
        ...state,
        [key]: {
          status: "done",
          imageUrls: [recovered.url],
          aiImageId: recovered.aiImageId,
          aiImageIds: [recovered.aiImageId],
        },
      }))
      setGeneratedOnce(true)
      recordCompletedRender(targetFormat, 1, concept.title)
      trackGenerationCompleted(targetFormat, source)
      if (calendarTargetForRequest && generationRequestId) {
        await attachCalendarGeneration(
          calendarTargetForRequest,
          generationRequestId,
          [recovered.url],
          [recovered.aiImageId]
        )
        calendarSettled = true
      }
      return true
    }
    try {
      if (targetFormat === "video") {
        const startRes = await fetch("/api/app-v3/maya/video/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageUrl: videoSourceUrl,
            motionPrompt: buildVideoMotionPrompt(effectiveBrief),
            imageDescription: concept.description,
            category: "editorial",
          }),
        })
        const startData = (await startRes.json().catch(() => null)) as {
          videoId?: number
          predictionId?: string
          error?: string
          code?: string
          current?: number
          newBalance?: number
        } | null
        generationResponseStatus = startRes.status
        generationServerCode = startData?.code ?? null

        if (startRes.status === 402 || startData?.code === "insufficient_credits") {
          setGenState(s => ({ ...s, [key]: { status: "idle" } }))
          trackRecoveryShown(targetFormat, "insufficient_credits", {
            phase: "generate_request",
            responseStatus: startRes.status,
            serverCode: startData?.code,
          })
          showCreditBlock(typeof startData?.current === "number" ? startData.current : null)
          return
        }
        if (startData?.code === "generation_locked" && cohort === "trial") {
          setGenState(s => ({ ...s, [key]: { status: "idle" } }))
          setTrialCapOpen(true)
          return
        }

        if (!startRes.ok || !startData?.videoId || !startData?.predictionId) {
          throw new Error(startData?.error || "Video failed")
        }

        const videoUrl = await pollVideoGeneration(startData.predictionId, startData.videoId)
        setGenState(s => ({
          ...s,
          [key]: {
            status: "done",
            videoUrl,
            videoAssetId: `video_${startData.videoId}`,
          },
        }))
        recordCompletedRender("video", 1, concept.title)
        setGeneratedOnce(true)
        trackGenerationCompleted(targetFormat, "video")
        showTrialCapIfDepleted(startData.newBalance)
        return
      }

      if (canUseCustomModel) {
        const startRes = await fetch("/api/app-v3/maya/custom-model/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conceptTitle: concept.title,
            conceptDescription: concept.description,
            conceptPrompt: buildCustomModelConceptPrompt(effectiveBrief),
            category: "portrait",
          }),
        })
        const startData = (await startRes.json().catch(() => null)) as {
          generationId?: number
          predictionId?: string
          error?: string
          code?: string
          current?: number
        } | null
        generationResponseStatus = startRes.status
        generationServerCode = startData?.code ?? null

        if (startRes.status === 402 || startData?.code === "insufficient_credits") {
          setGenState(s => ({ ...s, [key]: { status: "idle" } }))
          trackRecoveryShown(targetFormat, "insufficient_credits", {
            phase: "generate_request",
            responseStatus: startRes.status,
            serverCode: startData?.code,
          })
          showCreditBlock(typeof startData?.current === "number" ? startData.current : null)
          return
        }
        if (startData?.code === "generation_locked" && cohort === "trial") {
          setGenState(s => ({ ...s, [key]: { status: "idle" } }))
          setTrialCapOpen(true)
          return
        }

        if (!startRes.ok || !startData?.generationId || !startData?.predictionId) {
          throw new Error(startData?.error || "Generation failed")
        }

        const url = await pollCustomModelGeneration(startData.predictionId, startData.generationId)
        setGenState(s => ({ ...s, [key]: { status: "done", imageUrls: [url] } }))
        setGeneratedOnce(true)
        recordCompletedRender(targetFormat, 1, concept.title)
        trackGenerationCompleted(targetFormat, "custom_model")
        return
      }

      // The chat-level text choice rides every graphic generation. Text is either baked into the
      // final image, or kept off the visual with Maya's suggested words shown below the result.
      const wantsGraphicText =
        isGraphicOutputFormat(targetFormat) && textOverlayMode === "with-text"
      const graphicTextMode =
        isGraphicOutputFormat(targetFormat) && textOverlayMode ? textOverlayMode : null
      const bakeStyle = overlayStyle ?? (wantsGraphicText ? textStyleChoice : null)
      const wantsBakedText = Boolean(bakeStyle && isGraphicOutputFormat(targetFormat))
      const res = await fetch("/api/app-v3/maya/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brief: effectiveBrief,
          format: targetFormat,
          referenceSelfieUrl,
          referenceSelfieUrls: [threeQuarterUrl, sideProfileUrl, fullBodyUrl].filter(Boolean),
          inspirationImageUrl: inspirationUrl,
          aestheticId: aesthetic.id,
          conceptTitle: concept.title,
          clientRequestId: generationRequestId as string,
          rerun,
          ...(graphicTextMode ? { textOverlayMode: graphicTextMode } : {}),
          ...(bakeStyle ? { overlayStyle: bakeStyle } : {}),
          ...(textStyleAdjustments ? { styleAdjustments: textStyleAdjustments } : {}),
          ...(wantsBakedText ? { autoBake: true } : {}),
          // Single-image formats stream progressive previews; carousels keep the JSON path.
          // Auto-baked text needs the JSON path so the baked URL returns with the clean base.
          stream: wantsBakedText ? false : targetFormat !== "carousel",
        }),
      })
      generationResponseStatus = res.status

      // ── Streaming path: the photo develops in the card as partial frames arrive. ──
      const contentType = res.headers.get("content-type") || ""
      if (res.ok && contentType.includes("text/event-stream") && res.body) {
        streamResponseStarted = true
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ""
        let settled = false
        let streamFailure: Error | null = null
        while (true) {
          const { value, done } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const chunks = buffer.split("\n\n")
          buffer = chunks.pop() ?? ""
          for (const chunk of chunks) {
            const line = chunk.trim()
            if (!line.startsWith("data: ")) continue
            let evt: {
              type?: string
              b64?: string
              imageUrls?: string[]
              textOverlaySpecs?: TextOverlaySpec[]
              bakedImageUrls?: Array<string | null>
              bakedAiImageIds?: Array<number | null>
              textOverlayMode?: GraphicTextMode
              autoBakeSkipped?: string | null
              aiImageId?: number | null
              aiImageIds?: Array<number | null>
              error?: string
              code?: string
              newBalance?: number
            } | null = null
            try {
              evt = JSON.parse(line.slice(6))
            } catch {
              continue
            }
            if (evt?.type === "partial" && evt.b64) {
              const previewUrl = `data:image/png;base64,${evt.b64}`
              setGenState(s => ({ ...s, [key]: { status: "generating", previewUrl } }))
            } else if (
              evt?.type === "done" &&
              Array.isArray(evt.imageUrls) &&
              evt.imageUrls.length > 0
            ) {
              setGenState(s => ({
                ...s,
                [key]: {
                  status: "done",
                  imageUrls: evt!.imageUrls,
                  textOverlaySpecs: evt!.textOverlaySpecs,
                  bakedImageUrls: evt!.bakedImageUrls,
                  bakedAiImageIds: evt!.bakedAiImageIds,
                  textOverlayMode: evt!.textOverlayMode,
                  autoBakeSkipped: evt!.autoBakeSkipped,
                  aiImageId: evt!.aiImageId ?? null,
                  aiImageIds: evt!.aiImageIds,
                },
              }))
              setGeneratedOnce(true)
              recordCompletedRender(targetFormat, evt.imageUrls.length, concept.title)
              trackGenerationCompleted(targetFormat, "stream")
              showTrialCapIfDepleted(evt.newBalance)
              // MAYA-GUIDED-TEXT-02: she asked for baked text. If the generate function's
              // time budget skipped any slide's bake (routine for multi-slide carousels),
              // continue it from here: each bake-text call is its own server function, so
              // the 300s generation ceiling no longer decides whether her text arrives.
              if (
                evt.textOverlayMode === "with-text" &&
                Array.isArray(evt.textOverlaySpecs) &&
                evt.textOverlaySpecs.length > 0
              ) {
                const cleanUrls = evt.imageUrls
                const specs = evt.textOverlaySpecs
                const primaryImageId = evt.aiImageId ?? null
                const imageIds = evt.aiImageIds
                const baked = evt.bakedImageUrls ?? cleanUrls.map(() => null)
                void bakeMissingTextSlides({
                  key,
                  conceptTitle: concept.title,
                  cleanImages: cleanUrls,
                  specs,
                  aiImageIds: cleanUrls.map(
                    (_, index) => imageIds?.[index] ?? (index === 0 ? primaryImageId : null)
                  ),
                  bakedImageUrls: baked,
                  stopOnError: false,
                }).catch(() => {})
              }
              if (calendarTargetForRequest && generationRequestId) {
                const calendarImageUrls =
                  evt.bakedImageUrls?.map((url, index) => url ?? evt!.imageUrls![index]) ??
                  evt.imageUrls
                const calendarImageIds =
                  evt.bakedAiImageIds?.map((id, index) => id ?? evt!.aiImageIds?.[index] ?? null) ??
                  evt.aiImageIds ??
                  evt.imageUrls.map((_, index) => (index === 0 ? (evt!.aiImageId ?? null) : null))
                await attachCalendarGeneration(
                  calendarTargetForRequest,
                  generationRequestId,
                  calendarImageUrls,
                  calendarImageIds
                )
                calendarSettled = true
              }
              generationServerVerdict = true
              settled = true
            } else if (evt?.type === "error") {
              generationServerCode = evt.code ?? "stream_error"
              trackRecoveryShown(targetFormat, "stream_error", {
                phase: "stream",
                responseStatus: generationResponseStatus,
                serverCode: generationServerCode,
              })
              setGenState(s => ({
                ...s,
                [key]: { status: "error", error: evt!.error || "Generation failed" },
              }))
              generationServerVerdict = true
              settled = true
              streamFailure = new Error(evt.error || "Generation failed")
            }
          }
        }
        if (!settled) {
          const recovered = await restorePaidSingleImage("stream_recovered", 3)
          if (!recovered) {
            trackRecoveryShown(targetFormat, "stream_unsettled", {
              phase: "stream",
              responseStatus: generationResponseStatus,
              serverCode: "stream_unsettled",
            })
            setGenState(s => ({
              ...s,
              [key]: {
                status: "error",
                error:
                  "The connection ended before the final photo arrived. Check Photos before trying again.",
              },
            }))
            streamFailure = new Error(
              "The connection ended before the final photo arrived. Check Photos before trying again."
            )
          }
        }
        if (streamFailure && actionRequestId) throw streamFailure
        return
      }

      const data = (await res.json().catch(() => null)) as {
        imageUrl?: string
        imageUrls?: string[]
        textOverlaySpecs?: TextOverlaySpec[]
        bakedImageUrls?: Array<string | null>
        bakedAiImageIds?: Array<number | null>
        textOverlayMode?: GraphicTextMode
        autoBakeSkipped?: string | null
        aiImageId?: number | null
        aiImageIds?: Array<number | null>
        error?: string
        code?: string
        current?: number
        newBalance?: number
      } | null
      generationServerVerdict = data !== null
      generationServerCode = data?.code ?? null
      if (res.status === 402 || data?.code === "insufficient_credits") {
        // Graceful path: reset the card and open the right offer instead of a raw error.
        setGenState(s => ({ ...s, [key]: { status: "idle" } }))
        trackRecoveryShown(targetFormat, "insufficient_credits", {
          phase: "generate_request",
          responseStatus: res.status,
          serverCode: data?.code,
        })
        showCreditBlock(typeof data?.current === "number" ? data.current : null)
        if (actionRequestId) throw new Error(data?.error || "Not enough credits")
        return
      }
      if (data?.code === "generation_locked" && cohort === "trial") {
        setGenState(s => ({ ...s, [key]: { status: "idle" } }))
        setTrialCapOpen(true)
        if (actionRequestId) throw new Error(data?.error || "Generation is not available yet")
        return
      }
      const urls =
        Array.isArray(data?.imageUrls) && data.imageUrls.length > 0
          ? data.imageUrls
          : data?.imageUrl
            ? [data.imageUrl]
            : []
      if (!res.ok || urls.length === 0) throw new Error(data?.error || "Generation failed")
      setGenState(s => ({
        ...s,
        [key]: {
          status: "done",
          imageUrls: urls,
          textOverlaySpecs: data?.textOverlaySpecs,
          bakedImageUrls: data?.bakedImageUrls,
          bakedAiImageIds: data?.bakedAiImageIds,
          textOverlayMode: data?.textOverlayMode,
          autoBakeSkipped: data?.autoBakeSkipped,
          aiImageId: data?.aiImageId ?? null,
          aiImageIds: data?.aiImageIds,
        },
      }))
      setGeneratedOnce(true) // unlocks the gentle "tell Maya about your brand" moment (value first)
      recordCompletedRender(targetFormat, urls.length, concept.title)
      trackGenerationCompleted(targetFormat, "generate")
      showTrialCapIfDepleted(data?.newBalance)
      // MAYA-GUIDED-TEXT-02: same client-side bake continuation as the streaming path.
      if (
        data &&
        data.textOverlayMode === "with-text" &&
        Array.isArray(data.textOverlaySpecs) &&
        data.textOverlaySpecs.length > 0
      ) {
        const specs = data.textOverlaySpecs
        const primaryImageId = data.aiImageId ?? null
        const imageIds = data.aiImageIds
        const baked = data.bakedImageUrls ?? urls.map(() => null)
        void bakeMissingTextSlides({
          key,
          conceptTitle: concept.title,
          cleanImages: urls,
          specs,
          aiImageIds: urls.map(
            (_, index) => imageIds?.[index] ?? (index === 0 ? primaryImageId : null)
          ),
          bakedImageUrls: baked,
          stopOnError: false,
        }).catch(() => {})
      }
      if (calendarTargetForRequest && generationRequestId) {
        const calendarImageUrls =
          data?.bakedImageUrls?.map((url, index) => url ?? urls[index]) ?? urls
        const calendarDelivery = {
          imageUrls: calendarImageUrls,
          aiImageIds:
            data?.bakedAiImageIds?.map((id, index) => id ?? data?.aiImageIds?.[index] ?? null) ??
            data?.aiImageIds ??
            urls.map((_, index) => (index === 0 ? (data?.aiImageId ?? null) : null)),
        }
        await attachCalendarGeneration(
          calendarTargetForRequest,
          generationRequestId,
          calendarDelivery.imageUrls,
          calendarDelivery.aiImageIds
        )
        calendarSettled = true
      }
    } catch (e) {
      const recoveryAttempts =
        generationResponseStatus === null || (streamResponseStarted && !generationServerVerdict)
          ? 18
          : generationResponseStatus >= 500 && !generationServerVerdict
            ? 3
            : 0
      if (await restorePaidSingleImage("request_recovered", recoveryAttempts)) return
      trackRecoveryShown(targetFormat, "exception", {
        phase: "generate_request",
        responseStatus: generationResponseStatus,
        serverCode: generationServerCode,
      })
      setGenState(s => ({
        ...s,
        [key]: { status: "error", error: e instanceof Error ? e.message : "Generation failed" },
      }))
      if (actionRequestId) throw e instanceof Error ? e : new Error("Generation failed")
    } finally {
      if (calendarTargetForRequest && generationRequestId && !calendarSettled) {
        await failCalendarGeneration(calendarTargetForRequest, generationRequestId)
      }
      inFlightGenerationKeysRef.current.delete(key)
    }
  }

  // CREDIT-INTEGRITY-01: a full shoot runs 2 to 4 minutes on the server. On mobile the
  // connection often drops first, the server finishes anyway, and the photos land in her
  // gallery while the old code told her "failed" and let her pay for retry after retry.
  // After a lost response we watch the gallery for the set before ever claiming failure.
  async function recoverPhotoshootFromGallery(
    clientRequestId: string,
    startedAtMs: number,
    expectedCount: number,
    maxAttempts = 15
  ): Promise<string[] | null> {
    const needed = expectedCount
    // small allowance for client/server clock skew
    const cutoff = startedAtMs - 2 * 60 * 1000
    let latestFresh: string[] = []
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 20_000))
      try {
        const res = await fetch("/api/app-v3/gallery", { cache: "no-store" })
        if (!res.ok) continue
        const data = (await res.json().catch(() => null)) as {
          assets?: Array<{
            kind?: string
            contentType?: string
            url?: string
            createdAt?: string
            generationRef?: string | null
          }>
        } | null
        const fresh = (data?.assets || []).filter(
          asset =>
            asset.kind === "image" &&
            asset.contentType === "photoshoot" &&
            asset.generationRef?.includes(clientRequestId) &&
            typeof asset.url === "string" &&
            asset.url &&
            Date.parse(asset.createdAt || "") >= cutoff
        )
        latestFresh = fresh.map(asset => asset.url as string)
        if (fresh.length >= needed) {
          return latestFresh.slice(0, expectedCount)
        }
      } catch {
        // offline or transient: keep waiting, the server may still be finishing the shoot
      }
    }
    // A partial set is still delivered value. The reconciliation job returns credits for
    // missing legs; never hide the images that did finish behind a generic error.
    return latestFresh.length > 0 ? latestFresh : null
  }

  async function generatePhotoshootSet(key: string, concepts: ConceptCardData[]) {
    if (!referenceSelfieUrl) {
      trackRecoveryShown("photoshoot", "missing_selfie", {
        phase: "generate_request",
        planState: "blocked",
      })
      setGenState(s => ({
        ...s,
        [key]: { status: "error", error: "Add a selfie first so it still looks like you." },
      }))
      return
    }
    const shootConcepts = concepts.slice(0, 9)
    if (shootConcepts.length < 6) {
      trackRecoveryShown("photoshoot", "thin_shoot_plan", {
        phase: "chat_plan",
        planState: "invalid",
      })
      setGenState(s => ({
        ...s,
        [key]: {
          status: "error",
          error: "Let me finish the full shoot plan first. Ask me again in a moment.",
        },
      }))
      return
    }
    if (inFlightGenerationKeysRef.current.has(key)) {
      // Same stale-lock recovery as generateConcept: only a live generation may swallow the tap.
      if (genState[key]?.status === "generating") return
      inFlightGenerationKeysRef.current.delete(key)
    }
    inFlightGenerationKeysRef.current.add(key)
    const clientRequestId = newGenerationRequestId()
    const shootStartedAt = Date.now()
    setGenState(s => ({
      ...s,
      [key]: {
        status: "generating",
        pendingRequest: {
          clientRequestId,
          startedAt: shootStartedAt,
          format: "photoshoot",
          expectedCount: shootConcepts.length,
        },
      },
    }))
    // true once we parsed a real server reply; false means the response was lost in transit
    let gotServerVerdict = false
    let responseStatus: number | null = null
    let responseCode: string | null = null
    try {
      const res = await fetch("/api/app-v3/maya/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brief: shootConcepts[0].brief,
          shootBriefs: shootConcepts.map(concept => concept.brief),
          format: "photoshoot",
          referenceSelfieUrl,
          referenceSelfieUrls: [threeQuarterUrl, sideProfileUrl, fullBodyUrl].filter(Boolean),
          inspirationImageUrl: inspirationUrl,
          aestheticId: aesthetic.id,
          conceptTitle: "Full photoshoot",
          clientRequestId,
          stream: false,
        }),
      })
      responseStatus = res.status
      const data = (await res.json().catch(() => null)) as {
        imageUrl?: string
        imageUrls?: string[]
        textOverlaySpecs?: TextOverlaySpec[]
        aiImageId?: number | null
        aiImageIds?: Array<number | null>
        error?: string
        code?: string
        current?: number
        newBalance?: number
      } | null
      gotServerVerdict = data !== null
      responseCode = data?.code ?? null
      if (res.status === 402 || data?.code === "insufficient_credits") {
        setGenState(s => ({ ...s, [key]: { status: "idle" } }))
        trackRecoveryShown("photoshoot", "insufficient_credits", {
          phase: "generate_request",
          responseStatus: res.status,
          serverCode: data?.code,
        })
        showCreditBlock(typeof data?.current === "number" ? data.current : null)
        return
      }
      if (data?.code === "generation_locked" && cohort === "trial") {
        setGenState(s => ({ ...s, [key]: { status: "idle" } }))
        setTrialCapOpen(true)
        return
      }
      const urls =
        Array.isArray(data?.imageUrls) && data.imageUrls.length > 0
          ? data.imageUrls
          : data?.imageUrl
            ? [data.imageUrl]
            : []
      if (!res.ok || urls.length === 0) throw new Error(data?.error || "Generation failed")
      setGenState(s => ({
        ...s,
        [key]: {
          status: "done",
          imageUrls: urls,
          textOverlaySpecs: data?.textOverlaySpecs,
          aiImageId: data?.aiImageId ?? null,
          aiImageIds: data?.aiImageIds,
        },
      }))
      setGeneratedOnce(true)
      recordCompletedRender("photoshoot", urls.length, "Full photoshoot")
      trackGenerationCompleted("photoshoot", "photoshoot_set")
      showTrialCapIfDepleted(data?.newBalance)
    } catch (e) {
      const shouldAttemptRecovery =
        !gotServerVerdict || (responseStatus !== null && responseStatus >= 500)
      if (shouldAttemptRecovery) {
        // No server reply reached us. The shoot is usually still finishing: keep the card in
        // its working state and watch the gallery for the set instead of claiming failure.
        // A parsed 5xx gets three checks (the server already stopped); a dropped connection
        // gets the full five-minute window because the server may still be rendering.
        const recovered = await recoverPhotoshootFromGallery(
          clientRequestId,
          shootStartedAt,
          shootConcepts.length,
          gotServerVerdict ? 3 : 15
        )
        if (recovered && recovered.length > 0) {
          setGenState(s => ({
            ...s,
            [key]: { status: "done", imageUrls: recovered },
          }))
          setGeneratedOnce(true)
          recordCompletedRender("photoshoot", recovered.length, "Full photoshoot")
          trackGenerationCompleted("photoshoot", "photoshoot_set_recovered")
          return
        }
        trackRecoveryShown("photoshoot", "lost_response", {
          phase: "stream",
          responseStatus,
          serverCode: responseCode ?? "lost_response",
        })
        setGenState(s => ({
          ...s,
          [key]: {
            status: "error",
            error:
              "The connection dropped. If your photos finished, they are in your gallery. Any credits for photos that never arrived come back on their own within minutes.",
          },
        }))
        return
      }
      trackRecoveryShown("photoshoot", "exception", {
        phase: "generate_request",
        responseStatus,
        serverCode: responseCode,
      })
      setGenState(s => ({
        ...s,
        [key]: { status: "error", error: e instanceof Error ? e.message : "Generation failed" },
      }))
    } finally {
      inFlightGenerationKeysRef.current.delete(key)
    }
  }

  // Are Maya's direction cards already on screen? Drives the loading-vs-typing copy.
  const hasConcepts = messages.some(
    (m: any) => Array.isArray(m?.parts) && m.parts.some((p: any) => !!extractConcepts(p))
  )
  const agentLabel = memory?.agentName?.trim() || "Maya"

  function trackInlineChoice(
    action: string,
    intent: CreationIntent,
    properties: Record<string, unknown> = {}
  ) {
    void trackAnalyticsEvent({
      event: "suite_inline_choice_selected",
      properties: { cohort, action, ...intent, ...properties },
    })
    void trackAnalyticsEvent({
      event: "suite_intent_detected",
      properties: {
        cohort,
        action,
        intent_label: intent.format ?? "needs_clarify",
        ...intent,
        ...properties,
      },
    })
  }

  // Tap-first: choosing a format asks Maya to pull 3 directions for it (no typing needed).
  function handlePickFormat(id: OutputFormat) {
    if (isThinking) return
    // Always re-arm the graphic-text gate and the auto-pull - including when she re-taps
    // the SAME format mid-thread to start a fresh piece. Gating this on id !== outputFormat
    // left textOverlayMode/textStyleChoice/lastPulledFormatRef stale, so the inline text
    // question cards never re-appeared and the chip tap was a silent no-op.
    setTextOverlayMode(null)
    setTextStyleChoice(null)
    setTextStyleAdjustments(null)
    setStyleSwapOpen(false)
    setPendingShotDirector(null)
    lastPulledFormatRef.current = null
    const intent = intentForFormat(
      id,
      activeCreationIntent.source === "starter_chip" ? "starter_chip" : "manual"
    )
    setLocalCreationIntent(intent)
    extrasRef.current = { ...extrasRef.current, format: intent.format, creationIntent: intent }
    trackInlineChoice("format_choice", intent)
    setOutputFormat(id) // the auto-pull effect sends the request for the chosen format
    const keepSetupForVibe = id !== "video" && !hasStarted && !hasSpecificVisualWorld
    if (keepSetupForVibe && homeMode) {
      setSetupOpen(true)
    } else if (!keepSetupForVibe) {
      setPreMessageThreadOpen(true)
      setSetupOpen(false) // a committed pick collapses setup so the directions are visible
    }
  }

  function handleCaptionPath() {
    if (isThinking) return
    homeTaskInitiatedRef.current = true
    setPreMessageThreadOpen(true)
    setSetupOpen(false)
    sendMessage({ text: CAPTION_START_REQUEST })
  }

  function handleProjectStart() {
    if (isThinking || !session) return
    homeTaskInitiatedRef.current = true
    const intent = intentForFormat("photo", "starter_chip")
    setLocalCreationIntent(intent)
    extrasRef.current = { ...extrasRef.current, format: "photo", creationIntent: intent }
    trackInlineChoice("start_project", intent)
    setTextOverlayMode(null)
    setTextStyleChoice(null)
    setTextStyleAdjustments(null)
    setStyleSwapOpen(false)
    setSetupOpen(false)
    updateCurrentSession(MAYA_GENERAL_AESTHETIC, {
      format: "photo",
      seed: NEXT_POST_REQUEST,
      creationIdea: NEXT_POST_REQUEST,
      referenceSelfieUrl,
      creationIntent: intent,
    })
  }

  function intentForCurrentVibeChoice(source: "manual" | "vault_shot"): CreationIntent {
    const currentFormat = activeCreationIntent.format ?? outputFormat ?? null
    if (!currentFormat) return needsClarificationIntent(source)
    return intentForFormat(currentFormat, source)
  }

  // Cross-session relay context (2026 UX contract rule 3): when a style tap opens a fresh
  // session, the member's idea travels as STRUCTURED context on every chat request - never
  // by replaying her earlier sentence as a new user message. The visible first turn of the
  // new session is only the tap's own terse phrase.
  function carriedCreationIdea(): string | null {
    return session?.creationIdea ?? session?.seedPrompt ?? null
  }

  // Rule 4 of the 2026 UX contract: after every completed render, record ground truth so
  // every later chat turn carries an authoritative snapshot instead of thread inference.
  function recordCompletedRender(
    format: OutputFormat,
    imageCount: number,
    conceptTitle?: string | null
  ) {
    setLastGeneration({
      format,
      imageCount,
      styleName: session?.aesthetic?.name?.trim() || null,
      conceptTitle: conceptTitle?.trim() || null,
      usedInspiration: Boolean(inspirationUrl),
      usedTrainedModel: generationSource === "trained-model",
    })
  }

  function handleInspirationReady(
    url: string | null,
    source: "upload" | "style_picker" | "manager"
  ) {
    setInspirationUrl(url)
    if (!url) {
      pendingInspirationIntentRef.current = null
      return
    }

    const intent = pendingInspirationIntentRef.current ?? intentForCurrentVibeChoice("manual")
    pendingInspirationIntentRef.current = null
    const nextFormat = intent.format ?? outputFormat ?? null
    const shouldCommitAsStyle =
      Boolean(nextFormat) &&
      nextFormat !== "video" &&
      !hasSpecificVisualWorld &&
      messages.length === 0

    if (!shouldCommitAsStyle) return

    trackInlineChoice("inspiration_style_committed", intent, { source })
    lastPulledFormatRef.current = null
    seedRetiredRef.current = false
    setLocalCreationIntent(intent)
    updateCurrentSession(MAYA_DECIDES_AESTHETIC, {
      format: nextFormat ?? undefined,
      seed: "Use my inspiration image as the style direction and show me the best starting options.",
      creationIdea: carriedCreationIdea(),
      referenceSelfieUrl,
      videoSourceUrl,
      creationIntent: intent,
    })
    setSetupOpen(false)
  }

  function handleInlineVibePick(nextAesthetic: Aesthetic) {
    if (isThinking) return
    const intent = intentForCurrentVibeChoice("manual")
    trackInlineChoice("choose_vibe", intent, { aestheticId: nextAesthetic.id })
    setPendingShotDirector(null)
    if (nextAesthetic.shots?.length) {
      setInlineShotPickerAesthetic(nextAesthetic)
      return
    }
    lastPulledFormatRef.current = null
    seedRetiredRef.current = false
    setLocalCreationIntent(intent)
    updateCurrentSession(nextAesthetic, {
      format: intent.format ?? undefined,
      creationIdea: carriedCreationIdea(),
      referenceSelfieUrl,
      videoSourceUrl,
      creationIntent: intent,
    })
  }

  function handleInlineUseInspiration() {
    if (isThinking) return
    const intent = intentForCurrentVibeChoice("manual")
    trackInlineChoice("use_inspiration", intent)
    pendingInspirationIntentRef.current = intent
    if (inspirationUrl) {
      handleInspirationReady(inspirationUrl, "style_picker")
      return
    }
    attachInputRef.current?.click()
  }

  function handleInlineMayaDecides() {
    if (isThinking) return
    const intent = intentForCurrentVibeChoice("manual")
    trackInlineChoice("maya_decides", intent, { aestheticId: MAYA_DECIDES_AESTHETIC.id })
    lastPulledFormatRef.current = null
    seedRetiredRef.current = false
    setLocalCreationIntent(intent)
    updateCurrentSession(MAYA_DECIDES_AESTHETIC, {
      format: intent.format ?? undefined,
      seed: "Choose the strongest SSELFIE style direction for this and show me the best starting options.",
      creationIdea: carriedCreationIdea(),
      referenceSelfieUrl,
      videoSourceUrl,
      creationIntent: intent,
    })
  }

  function handleInlineShotPick(shot: AestheticShot) {
    if (isThinking || !inlineShotPickerAesthetic) return
    const intent = intentForCurrentVibeChoice("vault_shot")
    trackInlineChoice("choose_shot", intent, {
      aestheticId: inlineShotPickerAesthetic.id,
      shotId: shot.id,
    })
    setPendingShotDirector({ aesthetic: inlineShotPickerAesthetic, shot, intent })
  }

  function handleShotDirectorChoice(mode: ShotDirectorMode, requestedShotCount: 6 | 8 | 9) {
    if (isThinking || !pendingShotDirector) return
    const { aesthetic: chosenAesthetic, shot, intent } = pendingShotDirector
    const wantsFullShoot = mode === "collection-shoot" || mode === "new-shoot"
    const nextFormat: OutputFormat = wantsFullShoot ? "photoshoot" : (intent.format ?? "photo")
    const nextIntent = intentForFormat(nextFormat, "vault_shot")
    const shotDirector: ShotDirectorIntent = { mode, requestedShotCount }
    const seed =
      mode === "recreate-shot"
        ? `Recreate the "${shot.title}" shot with my selfie.`
        : mode === "more-angles"
          ? `Pull three different angles of the "${shot.title}" look with my selfie. Keep the same style, but vary the pose, camera distance, and crop.`
          : mode === "collection-shoot"
            ? `Plan a ${requestedShotCount}-shot full shoot that recreates the "${chosenAesthetic.name}" collection, starting from "${shot.title}".`
            : `Plan a ${requestedShotCount}-shot new shoot in the "${chosenAesthetic.name}" style, using "${shot.title}" as the anchor.`
    trackInlineChoice("shot_director", nextIntent, {
      aestheticId: chosenAesthetic.id,
      shotId: shot.id,
      directorMode: mode,
      requestedShotCount,
    })
    lastPulledFormatRef.current = null
    seedRetiredRef.current = false
    setLocalCreationIntent(nextIntent)
    updateCurrentSession(compactInlineAestheticForMaya(chosenAesthetic, shot), {
      format: nextFormat,
      seed,
      creationIdea: carriedCreationIdea(),
      referenceSelfieUrl,
      videoSourceUrl,
      creationIntent: nextIntent,
      shotDirector,
    })
    setInlineShotPickerAesthetic(null)
    setPendingShotDirector(null)
  }

  function commitDetectedIntent(
    text: string,
    source: CreationIntent["source"] = "typed",
    opts: { suppressAutoPull?: boolean; preserveCommittedFormat?: boolean } = {}
  ) {
    const detected = detectCreationIntent(text, source)
    const intent =
      opts.preserveCommittedFormat && activeCreationIntent.format
        ? { ...activeCreationIntent, confidence: "high" as const }
        : detected
    setLocalCreationIntent(intent)
    extrasRef.current = { ...extrasRef.current, format: intent.format, creationIntent: intent }
    trackInlineChoice("typed_message", intent)
    if (opts.suppressAutoPull && intent.format) {
      lastPulledFormatRef.current = intent.format
    }
    if (intent.format && session?.outputFormat !== intent.format) {
      setTextOverlayMode(null)
      setTextStyleChoice(null)
      setTextStyleAdjustments(null)
      setStyleSwapOpen(false)
      setOutputFormat(intent.format)
      setSetupOpen(false)
    }
    return intent
  }

  function sendInlineAnswer(answer: string, kind: "format" | "detail" = "detail") {
    if (isThinking) return
    if (kind === "format") {
      commitDetectedIntent(answer, "typed", { suppressAutoPull: true })
    } else {
      commitDetectedIntent(answer, "typed", {
        suppressAutoPull: true,
        preserveCommittedFormat: true,
      })
    }
    sendMessage({ text: answer })
    setPendingClarifyKind(null)
  }

  function handleNextFormat(
    nextFormat: OutputFormat,
    kind: InlineActionKind,
    styleReferenceUrl?: string | null,
    selection: "recommended" | "more" = "more"
  ) {
    if (isThinking) return
    const intent = intentForFormat(nextFormat, "gallery_action")
    const needsGraphicTextChoice = isGraphicOutputFormat(nextFormat)
    setLocalCreationIntent(intent)
    extrasRef.current = { ...extrasRef.current, format: intent.format, creationIntent: intent }
    void trackAnalyticsEvent({
      event: "suite_next_action_selected",
      properties: {
        cohort,
        kind,
        selection,
        from_format: format,
        to_format: nextFormat,
        style_reference: Boolean(styleReferenceUrl),
      },
    })
    if (styleReferenceUrl) {
      if (nextFormat === "video") {
        setVideoSourceUrl(styleReferenceUrl)
      } else {
        setInspirationUrl(styleReferenceUrl)
      }
    }
    setStyleSwapOpen(false)
    setOutputFormat(nextFormat)
    setSetupOpen(false)
    seedRetiredRef.current = true
    if (!needsGraphicTextChoice) {
      setTextOverlayMode(null)
      setTextStyleChoice(null)
      setTextStyleAdjustments(null)
      lastPulledFormatRef.current = nextFormat
      sendMessage({ text: FORMAT_PHRASE[nextFormat] })
      return
    }
    // Graphic next-steps previously stopped here waiting for a text choice the member could
    // not see — "Turn this into Stories" and the carousel/stories chips did nothing visible
    // (2026-07-29 live audit). A member with a remembered text style continues hands-free,
    // the same doctrine as the conversational set_format switch (the style chip above the
    // concept cards still swaps it before any credit is spent). First-timers keep the
    // explicit with-text / without-text gate, scrolled into view so the tap always has a
    // visible response.
    setTextStyleAdjustments(null)
    if (rememberedOverlayStyle) {
      setTextOverlayMode("with-text")
      setTextStyleChoice(rememberedOverlayStyle)
      lastPulledFormatRef.current = nextFormat
      sendMessage({ text: FORMAT_PHRASE[nextFormat] })
      return
    }
    setTextOverlayMode(null)
    setTextStyleChoice(null)
    lastPulledFormatRef.current = null
    requestAnimationFrame(() => scrollThreadToBottom())
  }

  function trackGenerationCompleted(targetFormat: OutputFormat, source: string) {
    void trackAnalyticsEvent({
      event: "suite_generation_path_completed",
      properties: { cohort, format: targetFormat, source },
    })
  }

  function trackRecoveryShown(
    targetFormat: OutputFormat,
    reason: string,
    diagnostics: {
      phase: "chat_plan" | "generate_request" | "stream" | "finish_post"
      responseStatus?: number | null
      serverCode?: string | null
      planState?: "ready" | "invalid" | "blocked" | null
    }
  ) {
    void trackAnalyticsEvent({
      event: "suite_maya_recovery_shown",
      properties: {
        cohort,
        format: targetFormat,
        reason,
        phase: diagnostics.phase,
        response_status: diagnostics.responseStatus ?? null,
        server_code: diagnostics.serverCode ?? null,
        plan_state: diagnostics.planState ?? null,
      },
    })
  }

  function focusComposer(kind: "format" | "detail" = "detail") {
    setPendingClarifyKind(kind)
    composerRef.current?.focus()
  }

  function savePreferredOverlayStyle(style: OverlayStyleId) {
    setMemory(current =>
      current
        ? { ...current, preferredOverlayStyle: style }
        : {
            agentName: null,
            brandNotes: null,
            preferences: null,
            userAvatarUrl: null,
            preferredOverlayStyle: style,
          }
    )
    void fetch("/api/app-v3/maya/memory", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preferredOverlayStyle: style }),
    })
      .then(r => (r.ok ? r.json() : null))
      .then((data: Memory | null) => {
        if (!data) return
        setMemory({
          agentName: data.agentName ?? null,
          brandNotes: data.brandNotes ?? null,
          preferences: data.preferences ?? null,
          userAvatarUrl: data.userAvatarUrl ?? null,
          preferredOverlayStyle: data.preferredOverlayStyle ?? style,
        })
      })
      .catch(() => {})
  }

  function handleTextStylePick(style: OverlayStyleId) {
    setTextStyleChoice(style)
    setTextStyleAdjustments(null)
    savePreferredOverlayStyle(style)
  }

  const userAvatar = memory?.userAvatarUrl ?? null

  async function saveBrand() {
    const text = brandDraft.trim()
    if (!text) return
    setBrandSaveState("saving")
    try {
      const res = await fetch("/api/app-v3/maya/memory", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandNotes: text }),
      })
      const d = (await res.json().catch(() => null)) as Memory | null
      if (!res.ok || !d) throw new Error("Brand save failed")
      setMemory({
        agentName: d.agentName ?? null,
        brandNotes: d.brandNotes ?? null,
        preferences: d.preferences ?? null,
        userAvatarUrl: d.userAvatarUrl ?? null,
      })
      setBrandDraft("")
      setBrandPromptDismissed(true)
      setBrandSaveState("idle")
    } catch {
      setBrandSaveState("error")
    }
  }

  type TextRefinementTarget = {
    key: string
    index: number
    cleanImageUrl: string
    cleanImageId: number | null
    spec: TextOverlaySpec
    bakedUrl: string | null
  }

  function textTargetForKey(key: string, index = 0): TextRefinementTarget | null {
    const gen = genState[key]
    if (!gen || gen.status !== "done") return null
    const cleanImageUrl = gen.imageUrls?.[index]
    const cleanImageId = gen.aiImageIds?.[index] ?? (index === 0 ? (gen.aiImageId ?? null) : null)
    const spec = gen.textOverlaySpecs?.[index]
    if (!cleanImageUrl || !spec) return null
    return {
      key,
      index,
      cleanImageUrl,
      cleanImageId,
      spec,
      bakedUrl: gen.bakedImageUrls?.[index] ?? null,
    }
  }

  async function bakeMissingTextSlides(args: {
    key: string
    conceptTitle: string
    cleanImages: string[]
    specs: TextOverlaySpec[]
    aiImageIds: Array<number | null>
    bakedImageUrls: Array<string | null>
    /** true = manual retry semantics (first failure throws to the card); false = best effort
     *  per slide, failed slides simply keep their "Try text again" button. */
    stopOnError: boolean
  }): Promise<void> {
    const { key, conceptTitle, cleanImages, specs, aiImageIds, bakedImageUrls, stopOnError } = args
    const missingIndexes = specs
      .map((_, index) => index)
      .filter(index => cleanImages[index] && !bakedImageUrls[index])
    if (missingIndexes.length === 0) return
    if (bakeContinuationKeysRef.current.has(key)) {
      // The auto continuation is already baking this card. Auto callers may drop the
      // duplicate silently, but a manual "Try text again" tap must never look dead
      // (2026-07-29 audit, issue A) — tell the card what is happening instead.
      if (stopOnError) throw new Error("Maya is still adding your words — give it a moment.")
      return
    }
    bakeContinuationKeysRef.current.add(key)

    setTextRefining(true)
    try {
      const queue = [...missingIndexes]
      const bakeOne = async (index: number): Promise<void> => {
        const res = await fetch("/api/app-v3/maya/bake-text", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cleanImageUrl: cleanImages[index],
            cleanImageId: aiImageIds[index] ?? undefined,
            conceptTitle,
            spec: specs[index],
          }),
        })
        const data = (await res.json().catch(() => null)) as {
          bakedUrl?: string
          aiImageId?: number | null
          error?: string
          code?: string
          current?: number
          newBalance?: number
        } | null

        if (res.status === 402 || data?.code === "insufficient_credits") {
          queue.length = 0
          showCreditBlock(typeof data?.current === "number" ? data.current : null)
          throw new Error(data?.error || "Not enough credits to add the text")
        }
        if (data?.code === "generation_locked" && cohort === "trial") {
          queue.length = 0
          setTrialCapOpen(true)
          throw new Error(data?.error || "Photo-making is paused")
        }
        if (!res.ok || !data?.bakedUrl) {
          throw new Error(data?.error || "The text did not go through")
        }

        updateBakedImage(key, index, data.bakedUrl, data.aiImageId ?? null)
        showTrialCapIfDepleted(data.newBalance)
      }
      // Two bakes in flight: a 7-slide continuation finishes in a few waves without
      // hammering the image API. Each bake-text call is its own server function with its
      // own 300s ceiling, so a long carousel can never outrun the generation route again.
      const workers = Array.from({ length: Math.min(2, queue.length) }, async () => {
        while (queue.length > 0) {
          const index = queue.shift()
          if (index === undefined) return
          try {
            await bakeOne(index)
          } catch (error) {
            if (stopOnError) {
              queue.length = 0
              throw error
            }
            console.error(`[maya] text bake continuation failed for slide ${index + 1}:`, error)
          }
        }
      })
      await Promise.all(workers)
    } finally {
      bakeContinuationKeysRef.current.delete(key)
      setTextRefining(false)
    }
  }

  async function retryMissingBakedText(key: string, conceptTitle: string): Promise<void> {
    const current = genState[key]
    if (!current || current.status !== "done") throw new Error("That result is not ready yet")
    const cleanImages = current.imageUrls ?? []
    await bakeMissingTextSlides({
      key,
      conceptTitle,
      cleanImages,
      specs: current.textOverlaySpecs ?? [],
      aiImageIds: cleanImages.map(
        (_, index) =>
          current.aiImageIds?.[index] ?? (index === 0 ? (current.aiImageId ?? null) : null)
      ),
      bakedImageUrls: current.bakedImageUrls ?? [],
      stopOnError: true,
    })
  }

  function findTextRefinementTarget(): TextRefinementTarget | null {
    if (lightbox?.key) {
      const target = textTargetForKey(lightbox.key, 0)
      if (target) return target
    }
    const entries = Object.keys(genState).reverse()
    for (const key of entries) {
      const gen = genState[key]
      if (!gen?.imageUrls?.length) continue
      for (let index = 0; index < gen.imageUrls.length; index += 1) {
        const target = textTargetForKey(key, index)
        if (target) return target
      }
    }
    return null
  }

  async function applyTextRefinement(refinement: TextRefinement): Promise<boolean> {
    const target = findTextRefinementTarget()
    if (!target) return false
    // Story slides/sequences are content-planning surfaces, not text-layer editing surfaces.
    // If she types exact story text ("make it say...", "use this line..."), let Maya see it
    // and rebuild the story brief instead of silently routing her back into the old Text Studio
    // architecture against the latest overlay spec.
    if (isStoryGraphicFormat(target.spec.format)) return false

    if (refinement.kind === "remove-text") {
      const current = genState[target.key]
      hiddenBakedTextRef.current[target.key] = [...(current?.bakedImageUrls ?? [])]
      hiddenBakedImageIdsRef.current[target.key] = [...(current?.bakedAiImageIds ?? [])]
      updateBakedImage(target.key, target.index, target.cleanImageUrl, target.cleanImageId)
      return true
    }

    if (refinement.kind === "restore-text") {
      const cached = hiddenBakedTextRef.current[target.key]?.[target.index]
      const cachedId = hiddenBakedImageIdsRef.current[target.key]?.[target.index] ?? null
      updateBakedImage(target.key, target.index, cached ?? null, cachedId)
      return true
    }

    let nextSpec = target.spec
    let styleAdjustments: string | undefined
    if (refinement.kind === "reword") {
      nextSpec = { ...target.spec, headline: refinement.headline }
    } else if (refinement.kind === "switch-style") {
      const preset = resolveOverlayStyle(refinement.style)
      nextSpec = {
        ...target.spec,
        style: preset.id,
        position: preset.lockedPosition ?? preset.defaultPosition ?? target.spec.position,
      }
    } else if (refinement.kind === "color") {
      styleAdjustments = colorAdjustmentLine(refinement.color)
    } else if (refinement.kind === "adjust") {
      styleAdjustments = typographyAdjustmentLine(refinement.instruction)
    }

    const previousTextState = genState[target.key]
    const restoreTextRefinementState = (message?: string) => {
      if (!previousTextState) return
      setGenState(state => ({
        ...state,
        [target.key]: message ? { ...previousTextState, error: message } : previousTextState,
      }))
    }

    setTextRefining(true)
    updateTextOverlaySpec(target.key, target.index, nextSpec)

    try {
      const res = await fetch("/api/app-v3/maya/bake-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cleanImageUrl: target.cleanImageUrl,
          cleanImageId: target.cleanImageId ?? undefined,
          conceptTitle: target.spec.headline,
          spec: nextSpec,
          ...(styleAdjustments ? { styleAdjustments } : {}),
        }),
      })
      const data = (await res.json().catch(() => null)) as {
        bakedUrl?: string
        aiImageId?: number | null
        error?: string
        code?: string
        current?: number
        newBalance?: number
      } | null

      if (res.status === 402 || data?.code === "insufficient_credits") {
        restoreTextRefinementState()
        showCreditBlock(typeof data?.current === "number" ? data.current : null)
        return true
      }
      if (data?.code === "generation_locked" && cohort === "trial") {
        restoreTextRefinementState()
        setTrialCapOpen(true)
        return true
      }
      if (!res.ok || !data?.bakedUrl) {
        throw new Error(data?.error || "Text update failed")
      }
      updateBakedImage(target.key, target.index, data.bakedUrl, data.aiImageId ?? null)
      hiddenBakedTextRef.current[target.key] = []
      hiddenBakedImageIdsRef.current[target.key] = []
      showTrialCapIfDepleted(data.newBalance)
      return true
    } catch (error) {
      restoreTextRefinementState(error instanceof Error ? error.message : "Text update failed")
      return true
    } finally {
      setTextRefining(false)
    }
  }

  function updateTextOverlaySpec(key: string, index: number, spec: TextOverlaySpec) {
    setGenState(state => {
      const current = state[key]
      if (!current || current.status !== "done" || !current.imageUrls?.length) return state
      const nextSpecs = [...(current.textOverlaySpecs ?? [])]
      nextSpecs[index] = spec
      // A baked render carries the OLD words in its pixels; changing the design retires it
      // so no surface shows stale text. The clean base is untouched; re-apply bakes fresh.
      const nextBaked = current.bakedImageUrls ? [...current.bakedImageUrls] : undefined
      if (nextBaked) nextBaked[index] = null
      const nextBakedIds = current.bakedAiImageIds ? [...current.bakedAiImageIds] : undefined
      if (nextBakedIds) nextBakedIds[index] = null
      return {
        ...state,
        [key]: {
          ...current,
          textOverlaySpecs: nextSpecs,
          ...(nextBaked ? { bakedImageUrls: nextBaked } : {}),
          ...(nextBakedIds ? { bakedAiImageIds: nextBakedIds } : {}),
        },
      }
    })
    setLightbox(current => {
      if (!current || current.key !== key) return current
      const nextSpecs = [...(current.textOverlaySpecs ?? [])]
      nextSpecs[index] = spec
      return { ...current, textOverlaySpecs: nextSpecs }
    })
  }

  // TEXT-STUDIO-01: a bake landed; store it next to the clean base (index-aligned).
  function updateBakedImage(
    key: string,
    index: number,
    bakedUrl: string | null,
    bakedAiImageId: number | null = null
  ) {
    setGenState(state => {
      const current = state[key]
      if (!current || current.status !== "done" || !current.imageUrls?.length) return state
      const nextBaked = [...(current.bakedImageUrls ?? [])]
      const nextBakedIds = [...(current.bakedAiImageIds ?? [])]
      nextBaked[index] = bakedUrl
      nextBakedIds[index] = bakedAiImageId
      return {
        ...state,
        [key]: {
          ...current,
          bakedImageUrls: nextBaked,
          bakedAiImageIds: nextBakedIds,
        },
      }
    })
  }

  const childOverlayOpen =
    historyOpen ||
    memoryOpen ||
    selfieManagerOpen ||
    Boolean(lightbox) ||
    creditModal.open ||
    trialCapOpen ||
    Boolean(editTarget)

  return (
    <div
      className={
        homeMode
          ? "relative z-10 mx-auto flex h-[calc(100dvh-4.75rem-env(safe-area-inset-bottom))] min-h-[34rem] w-full max-w-5xl justify-center overscroll-x-none px-0 [overflow-x:clip] sm:px-5 sm:py-5"
          : "pointer-events-none fixed inset-0 z-50 flex w-full max-w-[100dvw] items-end justify-end overscroll-x-none [overflow-x:clip] lg:items-stretch"
      }
    >
      {!homeMode && (
        <button
          type="button"
          tabIndex={-1}
          aria-hidden="true"
          aria-label="Close"
          onClick={close}
          className="pointer-events-auto absolute inset-0 bg-[#0D0E10]/30 backdrop-blur-[2px] animate-in fade-in duration-200 motion-reduce:animate-none lg:hidden"
        />
      )}
      <aside
        ref={drawerRef}
        role={homeMode ? "region" : "dialog"}
        aria-modal={homeMode ? undefined : !childOverlayOpen && !isDesktopWorkspace}
        aria-hidden={childOverlayOpen ? true : undefined}
        aria-labelledby="maya-workspace-title"
        data-maya-task-id={operatingLayerEnabled ? session.mayaContext?.taskId : undefined}
        data-maya-job={operatingLayerEnabled ? session.mayaContext?.job : undefined}
        data-maya-surface={operatingLayerEnabled ? session.mayaContext?.surface : undefined}
        data-maya-feed-id={operatingLayerEnabled ? session.mayaContext?.feedId : undefined}
        data-maya-post-id={operatingLayerEnabled ? session.mayaContext?.postId : undefined}
        data-maya-post-position={
          operatingLayerEnabled ? session.mayaContext?.postPosition : undefined
        }
        data-maya-course-id={
          operatingLayerEnabled ? session.mayaContext?.lessonRef?.courseId : undefined
        }
        data-maya-lesson-id={
          operatingLayerEnabled ? session.mayaContext?.lessonRef?.lessonId : undefined
        }
        data-maya-format={session.outputFormat ?? "none"}
        data-maya-inspiration={inspirationUrl ? "present" : "none"}
        style={
          keyboardBox
            ? { height: keyboardBox.height, transform: `translateY(${keyboardBox.top}px)` }
            : undefined
        }
        className={
          homeMode
            ? "suite-maya-panel pointer-events-auto relative flex h-full w-full min-w-0 max-w-[58rem] flex-col overflow-hidden border-x border-[#C5C6C8]/40 bg-[#F8FAFA] shadow-[0_18px_65px_rgba(13,14,16,0.06)] sm:rounded-[6px] sm:border"
            : "suite-maya-panel pointer-events-auto relative flex h-[94dvh] w-full min-w-0 max-w-[100dvw] flex-col overflow-hidden rounded-t-[6px] border border-[#C5C6C8]/55 bg-[#F8FAFA] shadow-[0_-18px_60px_rgba(13,14,16,0.16)] animate-in slide-in-from-bottom-4 duration-300 ease-out motion-reduce:animate-none lg:h-[100dvh] lg:w-[27rem] lg:rounded-none lg:border-y-0 lg:border-r-0 lg:shadow-[-18px_0_60px_rgba(13,14,16,0.10)] lg:slide-in-from-right"
        }
      >
        {/* Header - one calm row. Actions live in a quiet menu, and Close is always visible
            (on phones the drawer is full-width, so the backdrop can't be tapped to leave). */}
        <header className="suite-maya-header flex min-w-0 shrink-0 items-center justify-between gap-3 border-b border-[#C5C6C8]/40 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="truncate text-[10px] uppercase tracking-[0.3em] text-[#6D6E70]">
              {agentLabel}
            </p>
            <h2
              id="maya-workspace-title"
              className="mt-0.5 max-w-[18rem] font-serif text-[19px] font-light leading-tight text-[#0D0E10] sm:max-w-none sm:text-[21px]"
            >
              {workspaceTitle}
            </h2>
            {homeMode && generalHomeConversation && (
              <p className="mt-0.5 truncate text-[11px] leading-snug text-[#6D6E70]">
                One idea in. One finished post out.
              </p>
            )}
            {selectedShot && (
              <p className="mt-0.5 truncate text-[11px] leading-snug text-[#6D6E70]">
                Shot reference: {selectedShot.title}
              </p>
            )}
            {(creditsUnlimited || creditBalance != null) && (
              <p className="mt-0.5 truncate text-[11px] leading-snug text-[#6D6E70]">
                {creditsUnlimited ? "Unlimited credits" : `${creditBalance} credits`}
              </p>
            )}
          </div>
          <div className="relative flex shrink-0 items-center gap-4">
            {homeMode && cohort === "admin" && (
              <MayaFounderTestMode
                messages={messages}
                context={{
                  surface: session.mayaContext?.surface ?? "create",
                  taskId: session.mayaContext?.taskId ?? null,
                  job: session.mayaContext?.job ?? null,
                  chatId,
                  outputFormat: session.outputFormat ?? null,
                  feedId: session.mayaContext?.feedId ?? null,
                  postId: session.mayaContext?.postId ?? null,
                  postPosition: session.mayaContext?.postPosition ?? null,
                  courseId: session.mayaContext?.lessonRef?.courseId ?? null,
                  lessonId: session.mayaContext?.lessonRef?.lessonId ?? null,
                }}
              />
            )}
            <button
              type="button"
              onClick={() => {
                if (menuOpen) setNewChatConfirming(false)
                setMenuOpen(v => !v)
              }}
              aria-expanded={menuOpen}
              aria-controls="maya-workspace-menu"
              className="inline-flex min-h-11 items-center py-1 text-[11px] uppercase tracking-[0.14em] text-[#4F5052] hover:text-[#0D0E10]"
            >
              Menu
            </button>
            {!homeMode && (
              <button
                ref={drawerCloseRef}
                type="button"
                onClick={close}
                className="inline-flex min-h-11 items-center py-1 text-[11px] uppercase tracking-[0.14em] text-[#4F5052] hover:text-[#0D0E10]"
              >
                Close
              </button>
            )}
            {menuOpen && (
              <>
                <button
                  type="button"
                  aria-label="Close menu"
                  aria-hidden="true"
                  tabIndex={-1}
                  onClick={() => {
                    setMenuOpen(false)
                    setNewChatConfirming(false)
                  }}
                  className="fixed inset-0 z-10 cursor-default"
                />
                <div
                  id="maya-workspace-menu"
                  role="group"
                  aria-label="Maya actions"
                  className="absolute right-0 top-full z-20 mt-2 w-44 overflow-hidden rounded-[8px] border border-[#C5C6C8]/60 bg-white py-1 shadow-sm"
                >
                  <button
                    type="button"
                    onClick={handleNewChat}
                    disabled={workspaceBusy}
                    className="block min-h-11 w-full px-4 py-2.5 text-left text-[11px] uppercase tracking-[0.14em] text-[#4F5052] hover:bg-[#F1F2F2] hover:text-[#0D0E10] disabled:opacity-40"
                  >
                    {newChatConfirming ? "Confirm new post" : "New post"}
                  </button>
                  {newChatConfirming && (
                    <button
                      type="button"
                      onClick={() => setNewChatConfirming(false)}
                      className="block min-h-11 w-full px-4 py-2.5 text-left text-[11px] uppercase tracking-[0.14em] text-[#4F5052] hover:bg-[#F1F2F2] hover:text-[#0D0E10]"
                    >
                      Keep this post
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false)
                      setNewChatConfirming(false)
                      setHistoryOpen(true)
                    }}
                    disabled={workspaceBusy}
                    className="block min-h-11 w-full px-4 py-2.5 text-left text-[11px] uppercase tracking-[0.14em] text-[#4F5052] hover:bg-[#F1F2F2] hover:text-[#0D0E10] disabled:opacity-40"
                  >
                    Work
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false)
                      setNewChatConfirming(false)
                      setMemoryOpen(true)
                    }}
                    className="block min-h-11 w-full px-4 py-2.5 text-left text-[11px] uppercase tracking-[0.14em] text-[#4F5052] hover:bg-[#F1F2F2] hover:text-[#0D0E10]"
                  >
                    Brand profile
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        {learningTaskActive && session.mayaContext ? (
          <MayaGuidanceWorkspace
            key={session.mayaContext.taskId}
            className="flex-1"
            request={{
              taskId: session.mayaContext.taskId,
              job: "learn_next",
              ...(session.mayaContext.lessonRef
                ? { lessonRef: session.mayaContext.lessonRef }
                : {}),
            }}
          />
        ) : null}
        {!learningTaskActive ? (
          <>
            {calendarSurfaceActive && session.calendarTarget && (
              <div className="shrink-0 border-b border-[#C5C6C8]/40 bg-white/70 px-5 py-2.5 sm:px-6">
                <div className="flex min-w-0 items-center justify-between gap-3">
                  <p role="status" className="min-w-0 text-[12px] leading-relaxed text-[#4F5052]">
                    <span className="font-medium text-[#0D0E10]">
                      Post {session.calendarTarget.position}.
                    </span>{" "}
                    {session.calendarTarget.delivery
                      ? session.calendarTarget.delivery.deliveredCaption?.trim()
                        ? "Ready in your Calendar."
                        : "Photo added. The caption needs another try."
                      : session.calendarTarget.hasImage
                        ? "Your current photo stays safe while we make another option."
                        : workspaceBusy
                          ? "Maya is working on it now."
                          : "Choose a direction and Maya will place it here."}
                  </p>
                  {session.calendarTarget.delivery && !operatingLayerEnabled && (
                    <button
                      type="button"
                      onClick={() => void undoCalendarDelivery()}
                      className="min-h-11 shrink-0 text-[10px] uppercase tracking-[0.14em] text-[#4F5052] underline underline-offset-2 hover:text-[#0D0E10]"
                    >
                      Undo
                    </button>
                  )}
                </div>
                {calendarDeliveryError && (
                  <p role="alert" className="mt-1 text-[12px] leading-relaxed text-[#4F5052]">
                    {calendarDeliveryError}
                  </p>
                )}
              </div>
            )}

            {captionActionTarget && captionAction ? (
              <div className="shrink-0 border-b border-[#C5C6C8]/40 bg-white/70 px-5 py-3 sm:px-6">
                <MayaActionCard
                  key={captionAction.id}
                  descriptor={captionAction}
                  directExecute
                  result={
                    captionActionTarget.captionActionStatus === "succeeded"
                      ? (captionActionTarget.caption ?? null)
                      : null
                  }
                  preview={
                    captionActionTarget.requestedAction === "redo_caption"
                      ? `Create a fresh caption for post ${captionActionTarget.position}. The post changes only after you confirm.`
                      : `Improve the current caption for post ${captionActionTarget.position}. You can undo and restore the current words.`
                  }
                  onExecute={() => executeCalendarCaptionAction(captionActionTarget)}
                  onUndo={() => undoCalendarCaptionAction(captionActionTarget)}
                />
              </div>
            ) : null}

            {/* Setup - full block before the conversation starts (the guided beginning), then it
            collapses to a one-line status strip so Maya's output owns the screen. "Change"
            re-opens it for a format switch or a selfie swap. */}
            {threadVisible &&
              !setupOpen &&
              !guidedFirstPhoto &&
              !plainPreSelfieChat &&
              !generalHomeConversation && (
                <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#C5C6C8]/40 px-5 py-2.5 sm:px-6">
                  <span className="flex min-w-0 items-center gap-2.5">
                    {(format === "video" ? videoSourceUrl : referenceSelfieUrl) && (
                      <span className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full border border-[#C5C6C8]/50">
                        <Image
                          src={(format === "video" ? videoSourceUrl : referenceSelfieUrl) as string}
                          alt={format === "video" ? "Image to animate" : "Your selfie"}
                          fill
                          className="object-cover"
                          sizes="28px"
                        />
                      </span>
                    )}
                    <span className="truncate text-[11px] uppercase tracking-[0.14em] text-[#6D6E70]">
                      {FORMAT_OPTIONS.find(o => o.id === format)?.label ?? "Photo"}
                      {/* "Selfie engine" was internal jargon leaking into the member UI (UX audit
                    2026-07-28); say what it means instead. */}
                      {customModelAvailable
                        ? activeGenerationSource === "trained-model"
                          ? " · My trained model"
                          : " · From your selfie"
                        : ""}
                      {format === "video"
                        ? videoSourceUrl
                          ? " · Image selected"
                          : " · Pick image"
                        : referenceSelfieUrl
                          ? customModelAvailable
                            ? ""
                            : " · Selfie in"
                          : " · No selfie yet"}
                      {format !== "video" && inspirationUrl ? " · Inspiration in" : ""}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setSetupOpen(true)}
                    className="inline-flex min-h-11 shrink-0 items-center text-[11px] uppercase tracking-[0.14em] text-[#4F5052] underline underline-offset-2 hover:text-[#0D0E10]"
                  >
                    Change
                  </button>
                </div>
              )}
            {(!threadVisible || setupOpen) && !plainPreSelfieChat && !generalHomeConversation && (
              <div className="min-h-0 min-w-0 shrink space-y-3 overflow-y-auto overscroll-contain border-b border-[#C5C6C8]/40 px-5 py-4 sm:px-6">
                {guidedFirstPhoto && (
                  <div
                    className="rounded-[8px] border border-[#C5C6C8]/55 bg-[#F8FAFA] p-4"
                    aria-live="polite"
                  >
                    <p className="text-[10px] uppercase tracking-[0.22em] text-[#6D6E70]">
                      Your first photo
                    </p>
                    <div className="mt-3 flex items-center gap-3">
                      {referenceSelfieUrl && (
                        <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-[#C5C6C8]/50 bg-white">
                          <Image
                            src={referenceSelfieUrl}
                            alt="Your selfie"
                            fill
                            className="object-cover"
                            sizes="48px"
                          />
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="font-serif text-[22px] font-light leading-tight text-[#0D0E10]">
                          {referenceSelfieUrl ? "Selfie ready" : "One selfie is enough"}
                        </p>
                        <p className="mt-1 text-[13px] leading-relaxed text-[#6D6E70]">
                          {referenceSelfieUrl
                            ? "Maya is preparing one strong recommendation for you."
                            : "Add one clear selfie. Maya will recommend the strongest direction and guide the rest."}
                        </p>
                      </div>
                    </div>
                    {!referenceSelfieUrl && (
                      <button
                        type="button"
                        onClick={() => openSelfieManager()}
                        className="mt-4 min-h-12 w-full rounded-[6px] bg-[#0D0E10] px-4 py-3 text-[12px] uppercase tracking-[0.16em] text-white hover:bg-[#282728]"
                      >
                        Add my selfie
                      </button>
                    )}
                  </div>
                )}

                {!guidedFirstPhoto && shouldShowProjectStart && (
                  <InlineProjectStart disabled={isThinking} onStart={handleProjectStart} />
                )}

                {!guidedFirstPhoto && shouldShowVibeChoice && (
                  <div className="space-y-2">
                    {inlineShotPickerAesthetic ? (
                      <>
                        {pendingShotDirector ? (
                          <InlineShotDirectorCard
                            aestheticName={pendingShotDirector.aesthetic.name}
                            shot={pendingShotDirector.shot}
                            disabled={isThinking}
                            onBack={() => setPendingShotDirector(null)}
                            onPick={handleShotDirectorChoice}
                          />
                        ) : (
                          <InlineShotPicker
                            shots={inlineShotPickerAesthetic.shots ?? []}
                            disabled={isThinking}
                            onPick={handleInlineShotPick}
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setPendingShotDirector(null)
                            setInlineShotPickerAesthetic(null)
                          }}
                          className="inline-flex min-h-11 items-center text-[11px] uppercase tracking-[0.16em] text-[#6D6E70] underline underline-offset-2 hover:text-[#0D0E10]"
                        >
                          Choose another style
                        </button>
                      </>
                    ) : (
                      <>
                        {aestheticsFallback && (
                          <div className="flex items-center justify-between gap-3 rounded-[6px] border border-[#C5C6C8]/60 bg-[#F8FAFA] px-3 py-2.5">
                            <p className="text-[12px] leading-relaxed text-[#4F5052]">
                              Using the looks already saved in SUITE.
                            </p>
                            <button
                              type="button"
                              onClick={() => void retryAesthetics()}
                              className="inline-flex min-h-10 shrink-0 items-center text-[11px] uppercase tracking-[0.14em] text-[#4F5052] underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D0E10]"
                            >
                              Retry
                            </button>
                          </div>
                        )}
                        {inspirationUrl && (
                          <p className="px-1 pb-1 text-[12px] leading-relaxed text-[#6D6E70]">
                            Your inspiration image is in. Pick a style and Maya keeps that style as
                            the world, using your inspiration for pose, light, and mood.
                          </p>
                        )}
                        <InlineVibePicker
                          aesthetics={inlineAesthetics}
                          disabled={isThinking}
                          onPick={handleInlineVibePick}
                          onUseInspiration={handleInlineUseInspiration}
                          onLetMayaDecide={handleInlineMayaDecides}
                        />
                      </>
                    )}
                  </div>
                )}

                {format === "video" && (
                  <div className="rounded-[6px] border border-[#0D0E10]/15 bg-white px-3 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.2em] text-[#6D6E70]">
                          Image to animate
                        </p>
                        <p className="mt-1 text-[13px] leading-relaxed text-[#4F5052]">
                          Pick from your photos or upload a new still image. Maya will send this
                          exact image to the video pipeline.
                        </p>
                      </div>
                      {videoSourceUrl && (
                        <span className="relative h-14 w-11 shrink-0 overflow-hidden rounded-[4px] border border-[#C5C6C8]/50">
                          <Image
                            src={videoSourceUrl}
                            alt="Selected image to animate"
                            fill
                            className="object-cover"
                            sizes="44px"
                          />
                        </span>
                      )}
                    </div>
                    <div className="mt-3 space-y-3">
                      <div>
                        <p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-[#6D6E70]">
                          Pick from your photos
                        </p>
                        {videoGalleryImages === null && !videoGalleryError && (
                          <p className="text-[12px] text-[#6D6E70]">Loading photos...</p>
                        )}
                        {videoGalleryError && (
                          <p className="text-[12px] text-[#6D6E70]">{videoGalleryError}</p>
                        )}
                        {videoGalleryImages && videoGalleryImages.length > 0 && (
                          <div className="flex gap-2 overflow-x-auto pb-1">
                            {videoGalleryImages.map(url => {
                              const selected = videoSourceUrl === url
                              return (
                                <button
                                  key={url}
                                  type="button"
                                  onClick={() => setVideoSourceUrl(url)}
                                  className={`relative h-20 w-16 shrink-0 overflow-hidden rounded-[4px] border-2 ${
                                    selected
                                      ? "border-[#0D0E10]"
                                      : "border-[#C5C6C8]/50 hover:border-[#0D0E10]/50"
                                  }`}
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={url}
                                    alt="Gallery photo"
                                    className="h-full w-full object-cover"
                                    loading="lazy"
                                  />
                                </button>
                              )
                            })}
                          </div>
                        )}
                        {videoGalleryImages && videoGalleryImages.length === 0 && (
                          <p className="text-[12px] text-[#6D6E70]">
                            No gallery photos yet. Upload one from your device.
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => videoInput.current?.click()}
                          disabled={uploadingSlot === "video"}
                          className="min-h-11 rounded-[4px] border border-[#C5C6C8]/60 bg-white px-3.5 py-2 text-[12px] text-[#4F5052] hover:border-[#0D0E10]/40 disabled:opacity-60"
                        >
                          {uploadingSlot === "video" ? "Uploading..." : "Upload new photo"}
                        </button>
                        {videoSourceUrl && (
                          <button
                            type="button"
                            onClick={() => setVideoSourceUrl(null)}
                            className="inline-flex min-h-11 items-center text-[11px] uppercase tracking-[0.14em] text-[#6D6E70] underline underline-offset-2 hover:text-[#0D0E10]"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>
                    <input
                      ref={videoInput}
                      type="file"
                      accept={IMAGE_UPLOAD_ACCEPT}
                      className="hidden"
                      onChange={e => {
                        const f = e.target.files?.[0]
                        if (f) void handleUpload("video", f)
                        if (videoInput.current) videoInput.current.value = ""
                      }}
                    />
                  </div>
                )}

                {/* Front-face selfie: an action before upload, a calm status after. */}
                {!guidedFirstPhoto &&
                  (format !== "video" && referenceSelfieUrl ? (
                    <div className="rounded-[6px] border border-[#0D0E10]/15 bg-white px-3 py-2.5">
                      <div className="flex items-center justify-between gap-3">
                        <span className="flex min-w-0 items-center gap-2.5">
                          <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full border border-[#C5C6C8]/50">
                            <Image
                              src={referenceSelfieUrl}
                              alt="Your selfie"
                              fill
                              className="object-cover"
                              sizes="32px"
                            />
                          </span>
                          <span className="truncate text-[13px] font-medium text-[#0D0E10]">
                            {selfieRestored ? "Using your saved selfie" : "Selfie added"}
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => openSelfieManager()}
                          disabled={uploadingSlot === "face"}
                          className="inline-flex min-h-11 items-center text-[11px] uppercase tracking-[0.14em] text-[#4F5052] underline underline-offset-2 hover:text-[#0D0E10] disabled:opacity-60"
                        >
                          {uploadingSlot === "face" ? "Uploading…" : "Replace selfie"}
                        </button>
                      </div>
                      <p className="mt-1 text-[11px] leading-relaxed text-[#6D6E70]">
                        Maya will keep your skin tone and natural features recognizable, so
                        it&apos;s still you.
                      </p>
                    </div>
                  ) : format !== "video" ? (
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => openSelfieManager()}
                        disabled={uploadingSlot === "face"}
                        className="flex min-h-11 items-center gap-2 rounded-[4px] border border-[#C5C6C8]/60 bg-white px-3.5 py-2 text-[12px] text-[#4F5052] hover:border-[#0D0E10]/40 disabled:opacity-60"
                      >
                        {uploadingSlot === "face" ? "Uploading…" : "Add your selfie"}
                      </button>
                      <button
                        type="button"
                        onClick={() => openSelfieManager()}
                        className="inline-flex min-h-11 items-center text-[11px] uppercase tracking-[0.14em] text-[#4F5052] underline underline-offset-2 hover:text-[#0D0E10]"
                      >
                        Use a past selfie
                      </button>
                    </div>
                  ) : null)}
                <input
                  ref={fileInput}
                  type="file"
                  accept={IMAGE_UPLOAD_ACCEPT}
                  className="hidden"
                  onChange={e => {
                    const f = e.target.files?.[0]
                    if (f) void handleUpload("face", f)
                    if (fileInput.current) fileInput.current.value = ""
                  }}
                />

                {/* Primary "go": before Maya has pulled directions, one obvious next action so the
              customer never has to type or guess. Reuses handlePickFormat (commits the format,
              which triggers the pull). Hidden once directions exist. */}
                {!guidedFirstPhoto && !hasStarted && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!outputFormat || needsInitialVisualWorld) return
                      // Identity first (P0): with no selfie the CTA commits the format and opens the
                      // upload - the gated auto-pull then starts the moment her selfie is in.
                      handlePickFormat(outputFormat)
                      if (outputFormat === "video" && !videoSourceUrl) {
                        videoInput.current?.click()
                      } else if (
                        !referenceSelfieUrl &&
                        activeGenerationSource !== "trained-model"
                      ) {
                        openSelfieManager()
                      }
                    }}
                    disabled={isThinking || !outputFormat || needsInitialVisualWorld}
                    className="min-h-12 w-full rounded-[6px] bg-[#0D0E10] px-4 py-3 text-[12px] uppercase tracking-[0.14em] text-white transition-colors hover:bg-[#282728] disabled:cursor-not-allowed disabled:opacity-50 sm:tracking-[0.18em]"
                  >
                    {isThinking
                      ? "Creating…"
                      : needsInitialVisualWorld
                        ? "Choose a style first"
                        : !outputFormat
                          ? "Pick a format to start"
                          : outputFormat === "video"
                            ? videoSourceUrl
                              ? CTA_LABEL[outputFormat]
                              : "Choose image to animate"
                            : referenceSelfieUrl || activeGenerationSource === "trained-model"
                              ? CTA_LABEL[outputFormat]
                              : "Add my selfie to start"}
                  </button>
                )}

                {/* Optional extras - tucked away so a single selfie still just works */}
                {!guidedFirstPhoto && format !== "video" && (
                  <button
                    type="button"
                    onClick={() => setShowMore(v => !v)}
                    className="inline-flex min-h-11 items-center text-[11px] uppercase tracking-[0.16em] text-[#6D6E70] hover:text-[#0D0E10]"
                  >
                    {showMore ? "Hide extras" : "Add more angles (optional)"}
                  </button>
                )}

                {!guidedFirstPhoto && format !== "video" && showMore && (
                  <div className="space-y-2">
                    <p className="text-[11px] leading-relaxed text-[#6D6E70]">
                      For stronger likeness, add 1-3 extra identity photos: a three-quarter face,
                      side profile, and full-body shot. Inspiration is separate: Maya uses it for
                      pose, light, or vibe, never as your face.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        {
                          slot: "angle" as const,
                          ref: angleInput,
                          added: !!threeQuarterUrl,
                          label: "Three-quarter face",
                        },
                        {
                          slot: "side" as const,
                          ref: sideInput,
                          added: !!sideProfileUrl,
                          label: "Side profile",
                        },
                        {
                          slot: "body" as const,
                          ref: bodyInput,
                          added: !!fullBodyUrl,
                          label: "Full body",
                        },
                        {
                          slot: "inspiration" as const,
                          ref: inspoInput,
                          added: !!inspirationUrl,
                          label: "Inspiration pose/vibe",
                        },
                      ].map(({ slot, ref, added, label }) => (
                        <span key={slot} className="inline-flex items-center">
                          <button
                            type="button"
                            onClick={() => ref.current?.click()}
                            disabled={uploadingSlot === slot}
                            title={added ? `Change ${label.toLowerCase()}` : undefined}
                            className={`min-h-11 border border-[#C5C6C8]/60 bg-white px-3 py-2 text-[12px] text-[#4F5052] hover:border-[#0D0E10]/40 disabled:opacity-60 ${added ? "rounded-l-[4px]" : "rounded-[4px]"}`}
                          >
                            {added
                              ? `✓ ${label}`
                              : uploadingSlot === slot
                                ? "Uploading…"
                                : `+ ${label}`}
                          </button>
                          {added && (
                            <button
                              type="button"
                              onClick={() => clearSlot(slot)}
                              aria-label={`Remove ${label.toLowerCase()}`}
                              title={`Remove ${label.toLowerCase()}`}
                              className="self-stretch rounded-r-[4px] border border-l-0 border-[#C5C6C8]/60 bg-white px-2.5 text-[12px] text-[#6D6E70] hover:border-[#0D0E10]/40 hover:text-[#0D0E10]"
                            >
                              ×
                            </button>
                          )}
                          <input
                            ref={ref}
                            type="file"
                            accept={IMAGE_UPLOAD_ACCEPT}
                            className="hidden"
                            onChange={e => {
                              const f = e.target.files?.[0]
                              if (f) void handleUpload(slot, f)
                              if (ref.current) ref.current.value = ""
                            }}
                          />
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Mid-conversation, setup is an overlay moment: one tap returns to the thread. */}
                {!guidedFirstPhoto && threadVisible && (
                  <button
                    type="button"
                    onClick={() => setSetupOpen(false)}
                    className="min-h-11 w-full rounded-[4px] border border-[#C5C6C8]/60 bg-white px-4 py-2.5 text-[11px] uppercase tracking-[0.16em] text-[#4F5052] hover:border-[#0D0E10]/40"
                  >
                    Back to the conversation
                  </button>
                )}

                {uploadError && <p className="text-[12px] text-[#282728]">{uploadError}</p>}
              </div>
            )}

            {plainPreSelfieChat && !hasStarted && !skoolHandoff && (
              <div className="min-h-0 flex-1" aria-hidden />
            )}

            {/* Thread - the ONLY scroll area. min-h-0 lets this flex child shrink so overflow-y
            actually scrolls (without it, content overflowed and the direction cards were
            unreachable below the fold). */}
            <div
              ref={threadRef}
              role="log"
              aria-live="polite"
              aria-relevant="additions text"
              aria-label="Conversation with Maya"
              aria-hidden={!threadVisible || setupOpen}
              className={`suite-maya-thread min-h-0 min-w-0 flex-1 max-w-full space-y-5 overscroll-x-none px-4 py-5 [overflow-x:clip] sm:px-6 sm:py-6 ${
                !threadVisible || setupOpen ? "hidden" : "overflow-y-auto"
              }`}
            >
              {/* Static opener */}
              <div className="flex min-w-0 max-w-full items-end gap-2">
                <Avatar src={MAYA_AVATAR} fallback={agentLabel.charAt(0)} />
                <div className="suite-card suite-maya-message suite-maya-message--maya min-w-0 max-w-[calc(100%-2.25rem)] break-words rounded-[4px] rounded-tl-none bg-white p-4 text-[15px] leading-relaxed text-[#282728] [overflow-wrap:anywhere] sm:max-w-[80%]">
                  <p>
                    {skoolHandoffReady && skoolHandoff
                      ? `Continue from ${skoolHandoff.lessonTitle}.`
                      : generalHomeConversation
                        ? "Start exactly where you are."
                        : selectedShot
                          ? `${aesthetic.name}. Starting from ${selectedShot.title}.`
                          : `${aesthetic.name}. ${aesthetic.blurb}`}
                  </p>
                  {!skoolHandoffReady ? <p className="mt-2">{openerLine}</p> : null}
                  {skoolHandoffReady && skoolHandoff ? (
                    <SkoolMayaHandoffCard
                      handoff={skoolHandoff}
                      disabled={isThinking}
                      onStart={handleSkoolHandoffStart}
                    />
                  ) : null}
                  {generalHomeConversation && !hasStarted && !skoolHandoffReady && (
                    <div className="mt-4 space-y-3">
                      {latestResumeTask && (
                        <button
                          type="button"
                          onClick={() => {
                            const task = latestResumeTask
                            setLatestResumeTask(null)
                            void handleSelectChat(task.id).catch(() => setLatestResumeTask(task))
                          }}
                          disabled={workspaceBusy}
                          className="flex min-h-11 w-full items-center justify-between gap-3 rounded-[6px] border border-[#0D0E10]/20 bg-[#0D0E10] px-4 py-2.5 text-left text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D0E10] focus-visible:ring-offset-2 disabled:opacity-40"
                        >
                          <span className="min-w-0">
                            <span className="block text-[10px] uppercase tracking-[0.16em] text-white/65">
                              Continue your post about
                            </span>
                            <span className="block truncate text-[13px] leading-snug">
                              {latestResumeTask.title}
                            </span>
                          </span>
                          <span className="shrink-0 text-[11px] uppercase tracking-[0.14em]">
                            Resume
                          </span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {generalHomeConversation && !hasStarted && !skoolHandoffReady ? (
                <MayaPathChooser
                  disabled={isThinking}
                  onPickFormat={handlePickFormat}
                  onStartCaption={handleCaptionPath}
                  onStartEdit={onStartEdit}
                />
              ) : null}

              {/* Prominent selfie requirement: once Maya has proposed directions but there's no
              face yet, make the requirement obvious instead of a quietly-disabled button. */}
              {format === "video" && !videoSourceUrl && hasStarted && (
                <div className="min-w-0 max-w-full rounded-[8px] border border-[#0D0E10]/20 bg-[#0D0E10]/[0.03] p-4 [overflow-x:clip]">
                  <p className="font-serif text-[18px] font-light leading-tight text-[#0D0E10]">
                    Choose what to animate
                  </p>
                  <p className="mt-1 text-[13px] leading-relaxed text-[#4F5052]">
                    Pick a gallery photo or upload a still image, then Maya can create motion
                    options.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setSetupOpen(true)}
                      className="min-h-11 rounded-[4px] bg-[#0D0E10] px-4 py-2.5 text-[11px] uppercase tracking-[0.16em] text-white"
                    >
                      Pick image
                    </button>
                    <button
                      type="button"
                      onClick={() => videoInput.current?.click()}
                      disabled={uploadingSlot === "video"}
                      className="min-h-11 rounded-[4px] border border-[#C5C6C8]/60 bg-white px-4 py-2.5 text-[11px] uppercase tracking-[0.16em] text-[#4F5052] hover:border-[#0D0E10]/40 disabled:opacity-60"
                    >
                      {uploadingSlot === "video" ? "Uploading..." : "Upload"}
                    </button>
                  </div>
                </div>
              )}

              {format === "video" && videoSourceUrl && (
                <div className="flex min-w-0 max-w-full items-end gap-2">
                  <Avatar src={MAYA_AVATAR} fallback={agentLabel.charAt(0)} />
                  <div className="min-w-0 max-w-[calc(100%-2.25rem)] rounded-[8px] border border-[#C5C6C8]/60 bg-white p-3 [overflow-x:clip] sm:max-w-[84%]">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="relative h-24 w-16 shrink-0 overflow-hidden rounded-[5px] bg-[#F1F2F2]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={videoSourceUrl}
                          alt="Selected photo to animate"
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-[#6D6E70]">
                          Animating this photo
                        </p>
                        <p className="mt-1 text-[13px] leading-relaxed text-[#4F5052]">
                          Maya will use this still as the reference for the motion options and the
                          final video.
                        </p>
                        <button
                          type="button"
                          onClick={() => setSetupOpen(true)}
                          className="mt-1 inline-flex min-h-9 items-center text-[10px] uppercase tracking-[0.14em] text-[#0D0E10] underline underline-offset-2 hover:opacity-70"
                        >
                          Change photo
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {format !== "video" &&
                !referenceSelfieUrl &&
                hasStarted &&
                activeGenerationSource !== "trained-model" && (
                  <InlineSelfieUpload
                    title="Start your brand shoot"
                    description="Add one clear selfie and Maya turns it into the result you chose."
                    uploading={uploadingSlot === "face"}
                    onUpload={() => openSelfieManager()}
                    onUseExisting={() => openSelfieManager()}
                  />
                )}

              {(() => {
                // Preserve the first finished-photo marker for existing result-card behavior.
                let firstDonePhotoKey: string | null = null
                for (const m of messages as any[]) {
                  if (m?.role !== "assistant" || !Array.isArray(m.parts)) continue
                  const msgConcepts = m.parts.map(extractConcepts).find(Boolean) as
                    | ConceptCardData[]
                    | undefined
                  if (!msgConcepts?.length) continue
                  const msgFormat =
                    (m.parts.map(extractConceptFormat).find(Boolean) as OutputFormat | undefined) ??
                    format
                  for (const c of msgConcepts) {
                    const k = `${m.id}:${c.id}`
                    const completed =
                      genState[k]?.status === "done" &&
                      ((genState[k]?.imageUrls?.length ?? 0) > 0 || Boolean(genState[k]?.videoUrl))
                    if (!completed) continue
                    if (!firstDonePhotoKey && msgFormat === "photo") firstDonePhotoKey = k
                  }
                }
                return messages.map((m: any) => {
                  const isUser = m.role === "user"
                  const parts = Array.isArray(m.parts) ? m.parts : []
                  const text = parts
                    .filter((p: any) => p?.type === "text" && typeof p.text === "string")
                    .map((p: any) => p.text)
                    .join("")
                  const conceptToolPart = parts.find((part: any) => Boolean(extractConcepts(part)))
                  const conceptPart = conceptToolPart
                    ? (extractConcepts(conceptToolPart) as ConceptCardData[] | null)
                    : null
                  const conceptFormat =
                    (parts.map(extractConceptFormat).find(Boolean) as OutputFormat | undefined) ??
                    format
                  const conceptPlanReady = conceptToolPart
                    ? isConceptPlanReady(conceptToolPart, conceptFormat, isThinking)
                    : false
                  const clarifyPart = parts.map(extractClarify).find(Boolean) as
                    | ClarifyPrompt
                    | undefined
                  const feedPlanDays = parts.map(extractFeedPlanDays).find(Boolean) as
                    | FeedPlanPreviewDay[]
                    | undefined
                  // Maya tried to present directions but none survived (truncated/failed tool call):
                  // never leave a dead end - offer a one-tap re-pull instead.
                  const conceptsLost =
                    !isUser &&
                    !isThinking &&
                    parts.some(isConceptToolPart) &&
                    (conceptPart?.length ?? 0) === 0

                  const renderConceptCard = (concept: ConceptCardData, recommended: boolean) => {
                    const key = `${m.id}:${concept.id}`
                    const gen = genState[key] ?? { status: "idle" as const }
                    const resultUrls = gen.imageUrls ?? []
                    const latestStyleReferenceUrl =
                      resultUrls.length > 0 ? resultUrls[resultUrls.length - 1] : null
                    const actionTaskId = session?.mayaContext?.taskId ?? chatId
                    const actionTarget =
                      calendarSurfaceActive && session?.calendarTarget
                        ? session.calendarTarget
                        : null
                    const creationActionKind =
                      actionTarget && !actionTarget.caption?.trim() ? "create_both" : "create_image"
                    const creationActionIdempotencyKey = mayaActionIdempotencyKey(
                      actionTaskId,
                      creationActionKind,
                      key,
                      conceptFormat
                    )
                    const resultAiImageId = gen.aiImageIds?.[0] ?? gen.aiImageId ?? null
                    const applyIdempotencyKey =
                      actionTarget && latestStyleReferenceUrl
                        ? mayaActionIdempotencyKey(
                            actionTaskId,
                            "apply_to_post",
                            actionTarget.feedId,
                            actionTarget.postId,
                            resultAiImageId ?? latestStyleReferenceUrl
                          )
                        : null
                    const applyAction: MayaActionDescriptor | null =
                      actionTarget && latestStyleReferenceUrl && applyIdempotencyKey
                        ? (() => {
                            const next = createMayaAction({
                              id: `apply-${applyIdempotencyKey}`,
                              taskId: actionTaskId,
                              kind: "apply_to_post",
                              title: `Use this in post ${actionTarget.position}`,
                              reason: "It completes the Calendar post you selected.",
                              target: { feedId: actionTarget.feedId, postId: actionTarget.postId },
                              creditCost: 0,
                              requiresConfirmation: true,
                              canUndo: true,
                              idempotencyKey: applyIdempotencyKey,
                            })
                            return actionTarget.delivery?.imageUrl === latestStyleReferenceUrl &&
                              actionTarget.delivery.deliveredCaption?.trim()
                              ? restoreMayaActionStatus(next, "succeeded")
                              : next
                          })()
                        : null

                    return (
                      <ConceptCard
                        key={key}
                        concept={concept}
                        gen={gen}
                        format={conceptFormat}
                        eyebrow={recommended ? "Maya recommends" : "Another direction"}
                        onDownloaded={() => setValueUsed(true)}
                        onGenerate={editedCopy =>
                          void generateConcept(
                            key,
                            concept,
                            conceptFormat,
                            isGraphicOutputFormat(conceptFormat) && textOverlayMode === "with-text"
                              ? textStyleChoice
                              : null,
                            editedCopy,
                            gen.status === "done" ? undefined : creationActionIdempotencyKey
                          )
                        }
                        onOpen={(urls, startIndex) =>
                          setLightbox({
                            key,
                            format: conceptFormat,
                            images: urls,
                            assetIds:
                              gen.aiImageIds ??
                              (gen.aiImageId != null ? [gen.aiImageId] : undefined),
                            bakedAssetIds: gen.bakedAiImageIds,
                            formats: urls.map(() => conceptFormat),
                            textOverlaySpecs: genState[key]?.textOverlaySpecs,
                            startIndex,
                            conceptTitle: concept.title,
                          })
                        }
                        onEdit={() => {
                          const current = genState[key]
                          const url = (current?.imageUrls ?? [])[0]
                          const sourceImageId =
                            current?.aiImageIds?.[0] ?? current?.aiImageId ?? null
                          if (url) {
                            setEditTarget({
                              key,
                              url,
                              format: conceptFormat,
                              sourceImageId,
                              sourceTitle: concept.title,
                              chatId,
                              sessionStartedAt: session?.startedAt ?? 0,
                            })
                          }
                        }}
                        onAddToCalendar={
                          // Calendar placement is only a Calendar-originated job. General Maya
                          // creation finishes in place through onFinishPost below.
                          conceptFormat !== "video" &&
                          calendarSurfaceActive &&
                          session?.calendarTarget &&
                          !(operatingLayerEnabled && actionTarget)
                            ? async () => {
                                const current = genState[key]
                                // Prefer the baked (text-carrying) slide over its clean base.
                                const urls = (current?.imageUrls ?? []).map(
                                  (cleanUrl, index) => current?.bakedImageUrls?.[index] ?? cleanUrl
                                )
                                const url = urls[0]
                                if (!url) return null
                                const aiImageId =
                                  current?.aiImageIds?.[0] ?? current?.aiImageId ?? null
                                const selectedCalendarPost = session.calendarTarget
                                if (conceptFormat === "photo") {
                                  if (selectedCalendarPost.delivery?.imageUrl === url) {
                                    return {
                                      scheduledAt:
                                        selectedCalendarPost.scheduledAt ??
                                        new Date().toISOString(),
                                    }
                                  }
                                  const placed = await placeExistingPhotoInCalendar(
                                    selectedCalendarPost,
                                    url,
                                    aiImageId
                                  )
                                  return placed
                                    ? {
                                        scheduledAt:
                                          selectedCalendarPost.scheduledAt ??
                                          new Date().toISOString(),
                                      }
                                    : null
                                }
                                return null
                              }
                            : undefined
                        }
                        onFinishPost={
                          conceptFormat !== "video" &&
                          !calendarSurfaceActive &&
                          !(operatingLayerEnabled && actionTarget)
                            ? async () => {
                                const current = genState[key]
                                const urls = (current?.imageUrls ?? []).map(
                                  (cleanUrl, index) => current?.bakedImageUrls?.[index] ?? cleanUrl
                                )
                                if (!urls[0]) return null
                                try {
                                  const response = await fetch("/api/app-v3/maya/finish-post", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                      conceptTitle: concept.title,
                                      conceptDescription: concept.description,
                                      format: conceptFormat,
                                      captionContext: [
                                        concept.description,
                                        ...(concept.brief.graphic?.creativePlan?.outputs ?? [])
                                          .flatMap(output => [output.title, output.body])
                                          .filter(
                                            (line): line is string =>
                                              typeof line === "string" && line.trim().length > 0
                                          ),
                                      ]
                                        .join(". ")
                                        .slice(0, 1200),
                                    }),
                                  })
                                  if (!response.ok) return null
                                  const data = await response.json()
                                  const finishedPost = {
                                    caption: typeof data.caption === "string" ? data.caption : null,
                                  }
                                  setGenState(state => ({
                                    ...state,
                                    [key]: { ...state[key], finishedPost },
                                  }))
                                  void trackAnalyticsEvent({
                                    event: "suite_post_caption_ready",
                                    properties: {
                                      cohort,
                                      format: conceptFormat,
                                      asset_id:
                                        current?.bakedAiImageIds?.[0] ??
                                        current?.aiImageIds?.[0] ??
                                        current?.aiImageId ??
                                        null,
                                      media_count: urls.length,
                                    },
                                  })
                                  if (!calendarIncluded) {
                                    finishMayaJob({ job: "create_content", outcome: "completed" })
                                  }
                                  return finishedPost
                                } catch {
                                  return null
                                }
                              }
                            : undefined
                        }
                        onSaveReadyPost={
                          calendarIncluded &&
                          conceptFormat !== "video" &&
                          !calendarSurfaceActive &&
                          !(operatingLayerEnabled && actionTarget)
                            ? async finishedCaption => {
                                const current = genState[key]
                                const urls = (current?.imageUrls ?? []).map(
                                  (cleanUrl, index) => current?.bakedImageUrls?.[index] ?? cleanUrl
                                )
                                const imageUrl = urls[0]
                                if (!imageUrl) return null
                                const assetIds = (current?.imageUrls ?? []).map((_, index) => {
                                  const bakedUrl = current?.bakedImageUrls?.[index]
                                  const selectedId = bakedUrl
                                    ? current?.bakedAiImageIds?.[index]
                                    : (current?.aiImageIds?.[index] ??
                                      (index === 0 ? current?.aiImageId : null))
                                  return typeof selectedId === "number" &&
                                    Number.isInteger(selectedId) &&
                                    selectedId > 0
                                    ? selectedId
                                    : null
                                })
                                if (assetIds.some(id => id === null)) return null
                                const receipt = await saveFinishedPostToCalendar({
                                  assetIds: assetIds as number[],
                                  conceptTitle: concept.title,
                                  captionContext: [
                                    concept.description,
                                    ...(concept.brief.graphic?.creativePlan?.outputs ?? [])
                                      .flatMap(output => [output.title, output.body])
                                      .filter(
                                        (line): line is string =>
                                          typeof line === "string" && line.trim().length > 0
                                      ),
                                  ]
                                    .join(". ")
                                    .slice(0, 1200),
                                  finishedCaption,
                                })
                                if (!receipt || receipt === "forbidden") return receipt
                                setGenState(state => ({
                                  ...state,
                                  [key]: { ...state[key], calendarPlacement: receipt },
                                }))
                                finishMayaJob({ job: "create_content", outcome: "completed" })
                                return receipt
                              }
                            : undefined
                        }
                        onOpenReadyPost={calendarIncluded ? onOpenCalendar : undefined}
                        disabled={
                          !conceptPlanReady ||
                          (conceptFormat === "video"
                            ? !videoSourceUrl
                            : !referenceSelfieUrl && activeGenerationSource !== "trained-model")
                        }
                        disabledReason={
                          !conceptPlanReady
                            ? null
                            : conceptFormat === "video"
                              ? "Choose the photo you want to animate first."
                              : "Add a selfie first so it still looks like you."
                        }
                        initialCalendarPlacement={gen.calendarPlacement ?? null}
                        initialFinishedPost={gen.finishedPost ?? null}
                        showCalendarOffer={key === firstDonePhotoKey}
                        resultActions={
                          <div className="space-y-3">
                            {operatingLayerEnabled && applyAction && latestStyleReferenceUrl ? (
                              <MayaActionCard
                                key={applyAction.id}
                                descriptor={applyAction}
                                preview={`Replace ${actionTarget?.hasImage ? "the current photo" : "the empty photo slot"} in post ${actionTarget?.position}. The finished asset stays in Photos if you undo.`}
                                onExecute={action =>
                                  placeExistingPhotoInCalendar(
                                    actionTarget as CalendarPostTarget,
                                    latestStyleReferenceUrl,
                                    resultAiImageId,
                                    action.idempotencyKey,
                                    creationActionKind === "create_both"
                                  ).then(placed => {
                                    if (!placed)
                                      throw new Error("That photo did not reach the Calendar.")
                                  })
                                }
                                onUndo={() => undoCalendarDelivery()}
                              />
                            ) : null}
                            <InlineResultActions
                              onRefine={() => startFinishedPostRefinement(conceptFormat)}
                            />
                          </div>
                        }
                        onRetryText={
                          isGraphicOutputFormat(conceptFormat) && textOverlayMode === "with-text"
                            ? () => retryMissingBakedText(key, concept.title)
                            : undefined
                        }
                      />
                    )
                  }

                  return (
                    <div
                      key={m.id}
                      className="min-w-0 max-w-full space-y-4 [overflow-x:clip] animate-in fade-in slide-in-from-bottom-2 duration-300 motion-reduce:animate-none"
                    >
                      {text.trim() &&
                        (isUser && SYSTEM_TURN_LABEL[text.trim()] ? (
                          <p className="text-center text-[11px] uppercase tracking-[0.16em] text-[#9A9B9D]">
                            {SYSTEM_TURN_LABEL[text.trim()]}
                          </p>
                        ) : isUser ? (
                          <div className="flex min-w-0 max-w-full flex-row-reverse items-end gap-2">
                            <Avatar src={userAvatar} fallback="You" />
                            <div className="suite-maya-message suite-maya-message--user min-w-0 max-w-[calc(100%-2.25rem)] whitespace-pre-wrap break-words rounded-[4px] rounded-br-none bg-[#0D0E10] px-4 py-3 text-[15px] leading-relaxed text-white [overflow-wrap:anywhere] sm:max-w-[80%]">
                              {text}
                            </div>
                          </div>
                        ) : (
                          <div className="flex min-w-0 max-w-full items-end gap-2">
                            <Avatar src={MAYA_AVATAR} fallback={agentLabel.charAt(0)} />
                            <div className="suite-maya-message suite-maya-message--maya min-w-0 max-w-[calc(100%-2.25rem)] break-words rounded-[4px] rounded-bl-none border border-[#C5C6C8]/30 bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(13,14,16,0.04)] [overflow-wrap:anywhere] sm:max-w-[80%]">
                              <Markdown>{text}</Markdown>
                            </div>
                          </div>
                        ))}

                      {clarifyPart && (
                        <ClarifyCard
                          clarify={clarifyPart}
                          onPick={answer => sendInlineAnswer(answer, clarifyPart.kind)}
                          onFreeText={() => focusComposer(clarifyPart.kind)}
                          disabled={isThinking}
                        />
                      )}

                      {feedPlanDays && calendarIncluded && (
                        <FeedPlanPreviewCard
                          days={feedPlanDays}
                          onOpenCalendar={() => {
                            window.location.href = "/app?view=calendar"
                          }}
                        />
                      )}

                      {conceptsLost && (
                        <div className="min-w-0 max-w-full rounded-[10px] bg-[#282728]/5 px-4 py-3 [overflow-x:clip]">
                          <p className="text-[13px] text-[#282728]">
                            That didn&apos;t come through. One tap and Maya tries again.
                          </p>
                          <button
                            type="button"
                            onClick={() => sendMessage({ text: FORMAT_PHRASE[format] })}
                            className="mt-2 inline-flex min-h-11 items-center text-[11px] uppercase tracking-[0.16em] text-[#0D0E10] underline underline-offset-2 hover:opacity-70"
                          >
                            Try again
                          </button>
                        </div>
                      )}

                      {conceptPart && conceptPart.length > 0 && !conceptPlanReady && (
                        <div className="min-w-0 max-w-full rounded-[10px] bg-[#282728]/5 px-4 py-3 [overflow-x:clip]">
                          <p role="status" className="text-[13px] text-[#282728]">
                            {isThinking
                              ? "Maya is finishing this plan. Create will unlock when it is ready."
                              : "That plan needs one quick fix before you create it."}
                          </p>
                          {!isThinking && (
                            <button
                              type="button"
                              onClick={() => sendMessage({ text: FORMAT_PHRASE[conceptFormat] })}
                              className="mt-2 inline-flex min-h-11 items-center text-[11px] uppercase tracking-[0.16em] text-[#0D0E10] underline underline-offset-2 hover:opacity-70"
                            >
                              Ask Maya to fix it
                            </button>
                          )}
                        </div>
                      )}

                      {conceptPart && conceptPart.length > 0 && conceptFormat === "photoshoot" && (
                        <div className="min-w-0 max-w-full space-y-3 rounded-[8px] border border-[#C5C6C8] bg-white p-4 [overflow-x:clip]">
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.2em] text-[#6D6E70]">
                              Full photoshoot
                            </p>
                            <p className="mt-1 text-[15px] leading-relaxed text-[#282728]">
                              One connected set · {conceptPart.length} shots · one look, varied
                              angles.
                            </p>
                          </div>
                          <div className="grid gap-2 sm:grid-cols-2">
                            {conceptPart.slice(0, 9).map((concept, index) => (
                              <div
                                key={concept.id}
                                className="min-w-0 rounded-[6px] bg-[#F8FAFA] px-3 py-2"
                              >
                                <p className="text-[10px] uppercase tracking-[0.16em] text-[#6D6E70]">
                                  {String(index + 1).padStart(2, "0")} ·{" "}
                                  {concept.brief.shotRole?.replaceAll("-", " ") || "shot"}
                                </p>
                                <p className="mt-1 truncate text-[13px] text-[#282728]">
                                  {concept.title}
                                </p>
                              </div>
                            ))}
                          </div>
                          {(() => {
                            const key = `${m.id}:photoshoot-set`
                            const gen = genState[key] ?? { status: "idle" as const }
                            const urls = gen.imageUrls ?? []
                            const shootTitle = `Photoshoot · ${urls.length} shots`
                            const openPhotoshootLightbox = (startIndex?: number) =>
                              setLightbox({
                                key,
                                format: "photoshoot",
                                images: urls,
                                assetIds:
                                  gen.aiImageIds ??
                                  (gen.aiImageId != null ? [gen.aiImageId] : undefined),
                                bakedAssetIds: gen.bakedAiImageIds,
                                formats: urls.map(() => "photoshoot"),
                                textOverlaySpecs: gen.textOverlaySpecs,
                                startIndex,
                                conceptTitle: shootTitle,
                              })
                            return (
                              <div className="space-y-3">
                                {urls.length > 0 && (
                                  <div
                                    role="group"
                                    aria-label={`${urls.length} generated photos`}
                                    className="grid w-full grid-cols-3 gap-2"
                                  >
                                    {urls.slice(0, 6).map((url, index) => (
                                      <button
                                        key={`${url}-${index}`}
                                        type="button"
                                        onClick={() => openPhotoshootLightbox(index)}
                                        aria-label={`View shot ${index + 1} of ${urls.length} full screen`}
                                        className="group relative aspect-[4/5] w-full overflow-hidden rounded-[6px] text-left"
                                      >
                                        <img
                                          src={url}
                                          alt=""
                                          onError={retryGeneratedImageOnce}
                                          className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                                        />
                                        {index === 5 && urls.length > 6 && (
                                          <span className="absolute inset-0 flex items-center justify-center bg-[#0D0E10]/55 text-[13px] font-medium text-white">
                                            +{urls.length - 6} more
                                          </span>
                                        )}
                                      </button>
                                    ))}
                                  </div>
                                )}
                                {gen.status === "error" && (
                                  <p role="alert" className="text-[13px] text-[#8A3B2E]">
                                    {gen.error}
                                  </p>
                                )}
                                {urls.length > 0 && (
                                  <div className="flex flex-wrap items-center gap-3">
                                    <button
                                      type="button"
                                      onClick={() => openPhotoshootLightbox()}
                                      className="inline-flex min-h-11 items-center justify-center rounded-[8px] border border-[#0D0E10] bg-white px-4 py-3 text-center text-[11px] uppercase tracking-[0.14em] text-[#0D0E10] transition-colors hover:bg-[#F1F2F2]"
                                    >
                                      View all {urls.length} shots
                                    </button>
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        if (photoshootBulkDownloadKey === key) return
                                        setPhotoshootBulkDownloadKey(key)
                                        const allUrls = urls.map(
                                          (url, i) => gen.bakedImageUrls?.[i] ?? url
                                        )
                                        const started = await downloadAllSlides(allUrls, shootTitle)
                                        setPhotoshootBulkDownloadKey(null)
                                        if (!started) return
                                        void recordSuiteDownloadForReview({
                                          source: "concept-card",
                                          assetId: null,
                                          format: "photoshoot",
                                        })
                                      }}
                                      disabled={photoshootBulkDownloadKey === key}
                                      className="inline-flex min-h-11 items-center justify-center rounded-[8px] px-3 py-3 text-center text-[11px] uppercase tracking-[0.14em] text-[#4F5052] underline underline-offset-4 disabled:opacity-50"
                                    >
                                      {photoshootBulkDownloadKey === key
                                        ? "Preparing…"
                                        : `Download all ${urls.length}`}
                                    </button>
                                  </div>
                                )}
                                {urls.length === 0 ? (
                                  <button
                                    type="button"
                                    onClick={() => void generatePhotoshootSet(key, conceptPart)}
                                    disabled={
                                      !conceptPlanReady ||
                                      gen.status === "generating" ||
                                      !referenceSelfieUrl
                                    }
                                    className="inline-flex min-h-11 items-center rounded-full bg-[#0D0E10] px-5 text-[11px] uppercase tracking-[0.16em] text-white disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    {gen.status === "generating"
                                      ? "Creating shoot..."
                                      : `Create full photoshoot · ${conceptPart.length} credits`}
                                  </button>
                                ) : null}
                              </div>
                            )
                          })()}
                        </div>
                      )}

                      {conceptPart && conceptPart.length > 0 && conceptFormat !== "photoshoot" && (
                        <div className="min-w-0 max-w-full space-y-3 [overflow-x:clip]">
                          {isGraphicOutputFormat(conceptFormat) && textOverlayMode && (
                            <div className="flex min-w-0 items-center justify-end">
                              <button
                                type="button"
                                onClick={() => {
                                  setTextOverlayMode(null)
                                  setTextStyleChoice(null)
                                  setTextStyleAdjustments(null)
                                  setStyleSwapOpen(false)
                                  lastPulledFormatRef.current = null
                                }}
                                className="shrink-0 rounded-[4px] border border-[#C5C6C8]/70 bg-white px-2.5 py-1.5 text-[10px] uppercase tracking-[0.14em] text-[#4F5052] hover:border-[#0D0E10]"
                              >
                                {textOverlayMode === "with-text" && textStyleChoice
                                  ? `${resolveOverlayStyle(textStyleChoice).name} · text`
                                  : "No text"}{" "}
                                · change
                              </button>
                            </div>
                          )}
                          {isGraphicOutputFormat(conceptFormat) &&
                            textOverlayMode === "with-text" &&
                            styleSwapOpen && (
                              <TextStyleTemplatePicker
                                format={conceptFormat}
                                rememberedStyle={rememberedOverlayStyle}
                                onPick={style => {
                                  handleTextStylePick(style)
                                  setStyleSwapOpen(false)
                                }}
                              />
                            )}
                          {isGraphicOutputFormat(conceptFormat) &&
                            textOverlayMode === "with-text" &&
                            rememberedOverlayStyle &&
                            textStyleChoice === rememberedOverlayStyle &&
                            !styleSwapOpen && (
                              <div className="min-w-0 rounded-[6px] border border-[#C5C6C8]/60 bg-[#F8FAFA] p-3">
                                <p className="text-[10px] uppercase tracking-[0.18em] text-[#6D6E70]">
                                  Usual style variations
                                </p>
                                <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                                  <button
                                    type="button"
                                    onClick={() => setTextStyleAdjustments(null)}
                                    className={`min-h-10 shrink-0 rounded-full border px-3 text-[11px] uppercase tracking-[0.12em] ${
                                      !textStyleAdjustments
                                        ? "border-[#0D0E10] bg-[#0D0E10] text-white"
                                        : "border-[#C5C6C8]/70 bg-white text-[#4F5052]"
                                    }`}
                                  >
                                    Original
                                  </button>
                                  {TEXT_STYLE_VARIATIONS.map(variation => {
                                    const selected =
                                      textStyleAdjustments === variation.styleAdjustments
                                    return (
                                      <button
                                        key={variation.label}
                                        type="button"
                                        onClick={() =>
                                          setTextStyleAdjustments(variation.styleAdjustments)
                                        }
                                        className={`min-h-10 shrink-0 rounded-full border px-3 text-[11px] uppercase tracking-[0.12em] ${
                                          selected
                                            ? "border-[#0D0E10] bg-[#0D0E10] text-white"
                                            : "border-[#C5C6C8]/70 bg-white text-[#4F5052]"
                                        }`}
                                      >
                                        {variation.label}
                                      </button>
                                    )
                                  })}
                                </div>
                                <p className="mt-1 text-[11px] leading-relaxed text-[#6D6E70]">
                                  Layout stays the same. Only the text finish changes.
                                </p>
                              </div>
                            )}
                          {renderConceptCard(conceptPart[0], true)}
                          {conceptPart.length > 1 && (
                            <details className="group rounded-[8px] border border-[#C5C6C8]/55 bg-white">
                              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-4 text-[11px] uppercase tracking-[0.14em] text-[#4F5052] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0D0E10]">
                                See more ideas
                                <span className="font-serif text-[16px] font-light text-[#6D6E70]">
                                  {conceptPart.length - 1}
                                </span>
                              </summary>
                              <div className="space-y-3 border-t border-[#C5C6C8]/45 p-3">
                                {conceptPart
                                  .slice(1)
                                  .map(concept => renderConceptCard(concept, false))}
                              </div>
                            </details>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })
              })()}

              {/* Graphic formats need an explicit text decision before Maya pulls directions. This
              prevents surprise text on generated results and keeps the old Text Studio fallback
              retired: with text means baked text; without text means clean image + copy suggestions. */}
              {outputFormat &&
                isGraphicOutputFormat(outputFormat) &&
                (!textOverlayMode || (textOverlayMode === "with-text" && !textStyleChoice)) &&
                lastPulledFormatRef.current !== outputFormat && (
                  <div className="flex min-w-0 max-w-full items-end gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300 motion-reduce:animate-none">
                    <Avatar src={MAYA_AVATAR} fallback={agentLabel.charAt(0)} />
                    <div className="min-w-0 max-w-[calc(100%-2.25rem)] flex-1 sm:max-w-[88%]">
                      {!textOverlayMode ? (
                        <GraphicTextChoiceCard
                          onChoose={mode => {
                            setTextOverlayMode(mode)
                            setTextStyleChoice(null)
                            setTextStyleAdjustments(null)
                            setStyleSwapOpen(false)
                          }}
                        />
                      ) : (
                        <TextStyleTemplatePicker
                          format={outputFormat}
                          rememberedStyle={rememberedOverlayStyle}
                          onPick={handleTextStylePick}
                        />
                      )}
                    </div>
                  </div>
                )}

              {/* MAYA'S FIRST COFFEE invite: after she uses her first result, Maya offers a
              3-question get-to-know-you IN CHAT (persona carries the interview; answers save
              to her real brand profile via save_brand_profile). The old one-box free-text
              stays as the fallback path for someone who'd rather type it in one go. */}
              {showBrandPrompt && (
                <div className="flex min-w-0 max-w-full items-end gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300 motion-reduce:animate-none">
                  <Avatar src={MAYA_AVATAR} fallback={agentLabel.charAt(0)} />
                  <div className="min-w-0 max-w-[calc(100%-2.25rem)] break-words rounded-[6px] rounded-tl-[2px] border border-[#C5C6C8]/60 bg-white p-4 [overflow-wrap:anywhere] sm:max-w-[88%]">
                    <p className="text-[15px] leading-relaxed text-[#282728]">
                      Love that. Can I ask you three quick things? Then everything I make starts
                      sounding like you: your business, your story, your words.
                    </p>
                    <div className="mt-3 flex min-w-0 flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setBrandPromptDismissed(true)
                          sendMessage({ text: "Yes, ask me your three questions." })
                        }}
                        className="min-h-11 rounded-[4px] bg-[#0D0E10] px-4 py-2.5 text-[11px] uppercase tracking-[0.16em] text-white"
                      >
                        Ask away
                      </button>
                      <button
                        type="button"
                        onClick={() => setBrandPromptDismissed(true)}
                        className="inline-flex min-h-11 items-center text-[11px] uppercase tracking-[0.14em] text-[#6D6E70] hover:text-[#4F5052]"
                      >
                        Not now
                      </button>
                    </div>
                    <details className="mt-3">
                      <summary className="cursor-pointer text-[11px] uppercase tracking-[0.14em] text-[#6D6E70] hover:text-[#4F5052]">
                        Rather type it yourself?
                      </summary>
                      <textarea
                        value={brandDraft}
                        onChange={e => setBrandDraft(e.target.value)}
                        rows={2}
                        placeholder="e.g. I'm a founder coach for women starting an online business"
                        className="mt-2 w-full resize-none rounded-[4px] border border-[#C5C6C8]/60 bg-white px-3 py-2.5 text-[14px] text-[#282728] outline-none focus:border-[#0D0E10]"
                      />
                      <button
                        type="button"
                        onClick={() => void saveBrand()}
                        disabled={brandDraft.trim().length === 0 || brandSaveState === "saving"}
                        className="mt-2 min-h-11 rounded-[4px] bg-[#0D0E10] px-4 py-2.5 text-[11px] uppercase tracking-[0.16em] text-white disabled:opacity-40"
                      >
                        {brandSaveState === "saving" ? "Saving…" : "Save"}
                      </button>
                      {brandSaveState === "error" && (
                        <p role="alert" className="mt-2 text-[12px] text-[#4F5052]">
                          That did not save. Your words are still here so you can try again.
                        </p>
                      )}
                    </details>
                  </div>
                </div>
              )}

              {isThinking && (
                <div role="status" className="flex min-w-0 max-w-full items-center gap-3">
                  <TypingDots />
                  {!hasConcepts && (
                    <span className="min-w-0 break-words text-[13px] text-[#6D6E70] [overflow-wrap:anywhere]">
                      {generalHomeConversation
                        ? "Maya is thinking with you…"
                        : "Maya is preparing your directions…"}
                    </span>
                  )}
                </div>
              )}

              {error && !isThinking && (
                <div
                  role="alert"
                  className="min-w-0 max-w-full rounded-[6px] bg-[#282728]/5 px-4 py-3 [overflow-x:clip]"
                >
                  <p className="text-[13px] text-[#282728]">
                    {generalHomeConversation
                      ? "Maya hit a snag answering that."
                      : "Maya hit a snag creating your directions."}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      const lastUserMessage = [...messages]
                        .reverse()
                        .find((message: any) => message?.role === "user")
                      const retryText = Array.isArray(lastUserMessage?.parts)
                        ? lastUserMessage.parts
                            .filter(
                              (part: any) => part?.type === "text" && typeof part.text === "string"
                            )
                            .map((part: any) => part.text)
                            .join("")
                            .trim()
                        : ""
                      sendMessage({ text: retryText || FORMAT_PHRASE[format] })
                    }}
                    className="mt-2 inline-flex min-h-11 items-center text-[11px] uppercase tracking-[0.16em] text-[#0D0E10] underline underline-offset-2 hover:opacity-70"
                  >
                    Try again
                  </button>
                </div>
              )}

              {chatSaveError && (
                <div
                  role="alert"
                  className="min-w-0 max-w-full rounded-[6px] bg-[#282728]/5 px-4 py-3"
                >
                  <p className="text-[13px] text-[#282728]">
                    This conversation has not reached your history yet. Your work is still on this
                    device.
                  </p>
                  <button
                    type="button"
                    onClick={() => setChatSaveRetry(value => value + 1)}
                    className="mt-2 inline-flex min-h-11 items-center text-[11px] uppercase tracking-[0.16em] text-[#0D0E10] underline underline-offset-2"
                  >
                    Save again
                  </button>
                </div>
              )}

              {draftSyncError && (
                <div
                  role="alert"
                  className="min-w-0 max-w-full rounded-[6px] bg-[#282728]/5 px-4 py-3"
                >
                  <p className="text-[13px] text-[#282728]">
                    Your latest workspace changes have not synced yet. Keep this window open and try
                    again.
                  </p>
                  <button
                    type="button"
                    onClick={() => setDraftSyncRetry(value => value + 1)}
                    className="mt-2 inline-flex min-h-11 items-center text-[11px] uppercase tracking-[0.16em] text-[#0D0E10] underline underline-offset-2"
                  >
                    Sync again
                  </button>
                </div>
              )}
            </div>

            {/* Composer - secondary: refinement only, the happy path is the taps above. One clean
            row (the eyebrow label and the duplicate close button were eating thread space);
            bottom padding respects the iPhone home-indicator safe area. */}
            <div
              className={`suite-maya-composer min-w-0 shrink-0 border-t border-[#C5C6C8]/40 px-4 pt-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] [overflow-x:clip] sm:px-6 ${guidedFirstPhoto ? "hidden" : ""}`}
            >
              {inspirationUrl && (
                <div className="mb-2 flex min-w-0 max-w-full items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={inspirationUrl}
                    alt="Inspiration"
                    className="h-9 w-9 rounded-[8px] object-cover"
                  />
                  <span className="min-w-0 flex-1 truncate text-[11px] text-[#6D6E70]">
                    Inspiration attached. Maya uses its style, never its face.
                  </span>
                  <button
                    type="button"
                    onClick={() => clearSlot("inspiration")}
                    className="inline-flex min-h-11 shrink-0 items-center text-[11px] uppercase tracking-[0.14em] text-[#6D6E70] underline underline-offset-2 hover:text-[#0D0E10]"
                  >
                    Remove
                  </button>
                </div>
              )}
              <div className="flex min-w-0 max-w-full gap-2">
                <input
                  ref={attachInputRef}
                  type="file"
                  accept={IMAGE_UPLOAD_ACCEPT}
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (file) void handleUpload("inspiration", file)
                    if (attachInputRef.current) attachInputRef.current.value = ""
                  }}
                />
                {!plainPreSelfieChat && !generalHomeConversation && (
                  <button
                    type="button"
                    aria-label="Attach an inspiration image"
                    title="Attach an inspiration image"
                    onClick={() => attachInputRef.current?.click()}
                    disabled={uploadingSlot === "inspiration"}
                    className="h-12 w-12 shrink-0 rounded-[4px] border border-[#C5C6C8]/60 bg-white text-[20px] font-light leading-none text-[#4F5052] transition-[transform,border-color,color] duration-150 hover:border-[#0D0E10] hover:text-[#0D0E10] active:scale-95 disabled:opacity-40"
                  >
                    {uploadingSlot === "inspiration" ? "…" : "+"}
                  </button>
                )}
                <textarea
                  ref={composerRef}
                  rows={1}
                  aria-label="Message Maya"
                  value={input}
                  onChange={e => {
                    setInput(e.target.value)
                    resizeComposer()
                  }}
                  onKeyDown={e => {
                    // Desktop: Enter sends, Shift+Enter breaks the line. Touch keyboards use
                    // Enter for line breaks and the Send button to send (standard chat UX).
                    if (e.key === "Enter" && !e.shiftKey && !isCoarsePointer()) {
                      e.preventDefault()
                      void handleSend()
                    }
                  }}
                  placeholder={
                    textRefining
                      ? "Maya is updating the text…"
                      : generalHomeConversation
                        ? "Or tell Maya what you need…"
                        : "Want something different? Ask Maya…"
                  }
                  className="suite-maya-input max-h-36 min-h-12 min-w-0 flex-1 resize-none rounded-[4px] border border-[#C5C6C8]/60 bg-white px-4 py-3 text-[15px] leading-snug text-[#282728] outline-none transition-[border-color,box-shadow] duration-150 min-[380px]:px-5"
                />
                <button
                  type="button"
                  onClick={() => void handleSend()}
                  disabled={isThinking || textRefining || input.trim().length === 0}
                  className="suite-maya-send h-12 rounded-[4px] px-4 text-[11px] uppercase tracking-[0.1em] text-white transition-[transform,opacity] duration-150 hover:opacity-90 active:scale-95 disabled:opacity-40 min-[380px]:px-6 min-[380px]:text-[12px] min-[380px]:tracking-[0.16em]"
                >
                  {textRefining ? "Updating" : "Send"}
                </button>
              </div>
            </div>
          </>
        ) : null}
      </aside>

      {lightbox && (
        <ImageLightbox
          images={lightbox.images}
          assetIds={lightbox.assetIds}
          bakedAssetIds={lightbox.bakedAssetIds}
          formats={lightbox.formats}
          textOverlaySpecs={lightbox.textOverlaySpecs}
          bakedImageUrls={lightbox.key ? genState[lightbox.key]?.bakedImageUrls : undefined}
          conceptTitle={lightbox.conceptTitle}
          startIndex={lightbox.startIndex}
          onDownloaded={() => setValueUsed(true)}
          onClose={() => setLightbox(null)}
        />
      )}

      <CreditModal
        open={creditModal.open}
        balance={creditModal.balance}
        onClose={() => setCreditModal({ open: false, balance: null })}
      />

      <TrialCapOffer open={trialCapOpen} onClose={() => setTrialCapOpen(false)} />

      {/* In-thread selfie management: commits the URL in place via setReferenceSelfieUrl.
          Never route this through the front door's onContinue handler - that starts a new
          session and would wipe the running conversation. */}
      <SelfieReferenceManagerModal
        open={selfieManagerOpen}
        initialFaceUrl={referenceSelfieUrl}
        initialFocus={selfieManagerInitialFocus}
        hideOptionalReferences={guidedFirstPhoto}
        onClose={closeSelfieManager}
        onFaceReady={(url, source) => {
          setSelfieRestored(false) // she chose this one herself
          setReferenceSelfieUrl(url)
          if (source === "upload") {
            void trackAnalyticsEvent({
              event: "activation_selfie_uploaded",
              properties: { cohort, source: "maya_selfie_manager" },
            })
            void trackAnalyticsEvent({
              event: "suite_inline_selfie_uploaded",
              properties: {
                cohort,
                source: "maya_selfie_manager",
                format: outputFormat ?? null,
              },
            })
          }
        }}
        onExtraReady={(slot, url) => {
          if (slot === "angle") setThreeQuarterUrl(url)
          else if (slot === "side") setSideProfileUrl(url)
          else if (slot === "body") setFullBodyUrl(url)
          else if (slot === "inspiration") handleInspirationReady(url, "manager")
        }}
        onContinue={url => {
          setSelfieRestored(false)
          setReferenceSelfieUrl(url)
          closeSelfieManager()
          setSetupOpen(false)
        }}
      />

      <ChatHistoryModal
        open={historyOpen}
        currentChatId={chatId}
        onClose={() => setHistoryOpen(false)}
        onSelect={handleSelectChat}
      />

      <MemoryModal
        open={memoryOpen}
        onClose={() => setMemoryOpen(false)}
        onSaved={m => setMemory(m)}
      />

      {editTarget && (
        <EditMode
          imageUrl={editTarget.url}
          format={editTarget.format}
          sourceImageId={editTarget.sourceImageId}
          sourceTitle={editTarget.sourceTitle}
          onBusyChange={setEditBusy}
          onClose={() => setEditTarget(null)}
          onCreditBlock={balance => {
            setEditTarget(null)
            showCreditBlock(balance)
          }}
          onResult={(newUrl, aiImageId) =>
            setGenState(s => {
              if (
                editTarget.chatId !== chatId ||
                editTarget.sessionStartedAt !== (session?.startedAt ?? 0)
              ) {
                return s
              }
              const current = s[editTarget.key]
              const nextUrls = [...(current?.imageUrls ?? [])]
              const nextIds = [...(current?.aiImageIds ?? [])]
              const nextBaked = [...(current?.bakedImageUrls ?? [])]
              const nextBakedIds = [...(current?.bakedAiImageIds ?? [])]
              nextUrls[0] = newUrl
              nextIds[0] = aiImageId ?? null
              nextBaked[0] = null
              nextBakedIds[0] = null
              return {
                ...s,
                [editTarget.key]: {
                  ...(current ?? { status: "done" }),
                  status: "done",
                  imageUrls: nextUrls,
                  aiImageId: aiImageId ?? current?.aiImageId ?? null,
                  aiImageIds: nextIds,
                  bakedImageUrls: nextBaked,
                  bakedAiImageIds: nextBakedIds,
                },
              }
            })
          }
        />
      )}
    </div>
  )
}
