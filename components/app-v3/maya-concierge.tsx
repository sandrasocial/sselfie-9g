"use client"

// SSELFIE Studio 3.0 - Maya Concierge (MAYA-REBUILD-03: conversational rebuild).
//
// This is the missing layer Sandra felt. Instead of a form with one Generate button, Maya
// now holds a real streaming conversation (Claude Sonnet 4.5 via /api/app-v3/maya/chat),
// proposes concept directions inline as cards, and the user clicks one to fire the
// synchronous OpenAI generation (/api/app-v3/maya/generate). "Tweak" is just another message.
//
// Reuses the lean primitives only (ConceptCard, concierge-context). It does NOT port the
// 2,237-line legacy chat interface or any Flux/Pro-mode wiring.

import { useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { useConcierge } from "./concierge-context"
import { ConceptCard, type ConceptGenState } from "./concept-card"
import { ClarifyCard } from "./clarify-card"
import { AdminContentToolCard, type AdminContentToolResult } from "./admin-content-tool-card"
import { Markdown } from "./markdown"
import { TypingDots } from "./loading"
import { ImageLightbox } from "./image-lightbox"
import { TextOverlayLayer } from "./text-overlay-layer"
import {
  InlineFormatChoice,
  InlineResultActions,
  InlineSelfieUpload,
  InlineShotPicker,
  InlineVibePicker,
} from "./maya-inline-components"
import { CreditModal } from "./credit-modal"
import { TrialCapOffer } from "./trial-cap-offer"
import { ReferenceLibraryModal } from "./reference-library-modal"
import { ChatHistoryModal } from "./chat-history-modal"
import { MemoryModal, type Memory } from "./memory-modal"
import { EditMode } from "./edit-mode"
import { trackAnalyticsEvent } from "@/lib/analytics/client"
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
  CreationIntent,
  InlineActionKind,
  OutputFormat,
} from "./types"
import {
  detectCreationIntent,
  intentForFormat,
  needsClarificationIntent,
} from "@/lib/app-v3/maya/intent-router"
import {
  OVERLAY_STYLE_PRESETS,
  resolveOverlayStyle,
  type OverlayFormat,
  type OverlayStyleId,
  type TextOverlaySpec,
} from "@/lib/app-v3/text-overlay"
import { getTextStyleExampleImage, textStyleSampleSpec } from "@/lib/app-v3/text-style-examples"
import { salvageConceptsPayload } from "@/lib/app-v3/concept-salvage"
import {
  colorAdjustmentLine,
  parseTextRefinement,
  typographyAdjustmentLine,
  type TextRefinement,
} from "@/lib/app-v3/text-refinements"
import {
  clearMayaDraft,
  readMayaDraftForSession,
  saveMayaDraft,
  type MayaDraftSnapshot,
} from "./continuity"

/** Maya's profile image (one of Sandra's editorial portraits). Swap freely. */
const MAYA_AVATAR = "/images/ai-prompts/clean-girl-morning-shot-1.jpg"

/** Small round avatar for the chat thread (texting-a-friend feel). */
function Avatar({ src, fallback }: { src: string | null; fallback: string }) {
  return (
    <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full border border-[#C5C6C8]/50 bg-[#ECEDED]">
      {src ? (
        <Image src={src} alt="" fill className="object-cover" sizes="28px" />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-[10px] uppercase text-[#818283]">
          {fallback}
        </span>
      )}
    </div>
  )
}

function compactInlineAestheticForMaya(aesthetic: Aesthetic, selectedShot: AestheticShot): Aesthetic {
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
  "lower-third-accent": "/images/selfie-to-brand-shoot/module-5-content-use/creator-phone-detail.jpg",
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

function TextStyleTemplatePicker({
  format,
  disabled,
  onPick,
}: {
  format: OutputFormat
  disabled?: boolean
  onPick: (style: OverlayStyleId) => void
}) {
  const previewFormat = overlayFormatForOutput(format)
  const frameClass = previewFormat === "carousel" ? "aspect-[4/5]" : "aspect-[9/16]"

  return (
    <div className="space-y-3 rounded-[8px] border border-[#C5C6C8]/60 bg-[#F8FAFA] p-3">
      <div>
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#818283]">Maya pulled six looks</p>
        <p className="mt-1 text-[13px] leading-relaxed text-[#4F5052]">
          Tap the cover style that feels closest. Maya will bake the text into your image from the start.
        </p>
      </div>
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
                <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-[#818283]">
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

function GraphicTextChoiceCard({
  onChoose,
}: {
  onChoose: (mode: GraphicTextMode) => void
}) {
  return (
    <div className="space-y-3 rounded-[8px] border border-[#C5C6C8]/60 bg-white p-4">
      <div>
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#818283]">Text on image</p>
        <p className="mt-1 text-[14px] leading-relaxed text-[#4F5052]">
          Maya can bake short words into the finished image. Choose this now, so nothing shows up
          on your result by surprise.
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
          <span className="block text-[11px] uppercase tracking-[0.16em] text-[#818283]">
            Clean image
          </span>
          <span className="mt-1 block text-[15px] leading-snug">No text, just the visual</span>
        </button>
      </div>
      <p className="text-[12px] leading-relaxed text-[#818283]">
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

// Maya's opener, tab-aware so it always matches the selected format (fixes the "pick one above"
// mismatch). BEFORE a selfie is added it guides the next step; AFTER, it shifts to a "start your
// brand shoot" framing so the system status is clear (the photo case is the one that changes most).
// Sandra-approved short openers (2026-06-11): two lines max before anything happens.
const FORMAT_OPENER: Record<OutputFormat, string> = {
  photo: "Add one selfie and I'll pull directions. Soft window light works best. 🤍",
  photoshoot: "Add one selfie and I'll plan a full shoot in one world. 🤍",
  "reel-cover": "Hit create and I'll show you six cover styles. Tap the one you love and I'll take it from there.",
  carousel: "Hit create and I'll show you six text styles. Tap the one that feels like you and I'll build the slides.",
  "story-slide": "Hit create and I'll show you six styles. Tap the one you love, then pick the story idea that fits.",
  "story-sequence": "Hit create and I'll show you six styles. Tap the one that feels like you and I'll build the sequence.",
  video: "Add or choose the image you want to move, and I'll pull motion directions.",
}
const FORMAT_OPENER_READY: Record<OutputFormat, string> = {
  photo:
    "Your selfie's in, and it's still you. Hit create and pick the direction that feels most like you.",
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
  photo: "Create my photo directions",
  photoshoot: "Create my shoot plan",
  "reel-cover": "Create my cover directions",
  carousel: "Create my carousel directions",
  "story-slide": "Create my story directions",
  "story-sequence": "Create my story sequence directions",
  video: "Create my video directions",
}

type UploadSlot = "face" | "angle" | "side" | "body" | "inspiration" | "video"
type GenerationSource = "selfie" | "trained-model"

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
    .filter((c: any) => c && typeof c.title === "string" && (c.brief == null || typeof c.brief === "object"))
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

/** Pull admin-only content tool results out of Maya's stream (MAYA-ADMIN-01 slice 2). */
function extractAdminContentTool(part: any): AdminContentToolResult | null {
  if (!part || typeof part !== "object") return null
  const toolName = part.toolName || ""
  const isAdminTool =
    part.type === "tool-show_admin_content_sources" ||
    part.type === "tool-create_admin_carousel" ||
    part.type === "tool-create_admin_story_sequence" ||
    part.type === "tool-publish_admin_shoot_to_vault" ||
    part.type === "tool-show_admin_vault_drop_handoff" ||
    (part.type === "dynamic-tool" &&
      [
        "show_admin_content_sources",
        "create_admin_carousel",
        "create_admin_story_sequence",
        "publish_admin_shoot_to_vault",
        "show_admin_vault_drop_handoff",
      ].includes(toolName))
  if (!isAdminTool) return null
  const payload = part.output
  if (!payload || typeof payload.kind !== "string") return null
  if (payload.kind === "sources" && Array.isArray(payload.shoots))
    return payload as AdminContentToolResult
  if (payload.kind === "carousel" && payload.deck) return payload as AdminContentToolResult
  if (payload.kind === "story" && payload.sequence) return payload as AdminContentToolResult
  if (payload.kind === "vault-publish" && payload.dropEmail)
    return payload as AdminContentToolResult
  if (payload.kind === "vault-drop-handoff" && payload.dropEmail)
    return payload as AdminContentToolResult
  if (payload.kind === "error" && typeof payload.message === "string")
    return payload as AdminContentToolResult
  return null
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
  return { question: payload.question, options, allowFreeText: Boolean(payload.allowFreeText) }
}

function wait(ms: number): Promise<void> {
  return new Promise(resolve => window.setTimeout(resolve, ms))
}

function promptAssetIdFromGen(gen?: ConceptGenState): string | null {
  const id = gen?.aiImageId ?? gen?.aiImageIds?.find(item => typeof item === "number") ?? null
  return typeof id === "number" ? `ai_${id}` : null
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
  admin = false,
  hasTrainedModel = false,
  analyticsCohort,
}: {
  admin?: boolean
  hasTrainedModel?: boolean
  analyticsCohort?: AppV3AnalyticsCohort
} = {}) {
  const cohort: AppV3AnalyticsCohort = analyticsCohort ?? (admin ? "admin" : "member")
  const {
    session,
    isOpen,
    openWithAesthetic,
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
  const threadEndRef = useRef<HTMLDivElement>(null)
  const composerRef = useRef<HTMLInputElement>(null)
  const restoredDraftRef = useRef<MayaDraftSnapshot | null>(null)
  if (restoredDraftRef.current === null && session?.startedAt) {
    restoredDraftRef.current = readMayaDraftForSession(session.startedAt)
  }
  const restoredDraft = restoredDraftRef.current
  const lastPulledFormatRef = useRef<string | null>(
    restoredDraft?.messages.length ? (session?.outputFormat ?? null) : null
  )
  // set_format tool parts already acted on (`${messageId}:${format}`), so a switch fires once.
  const formatSwitchAppliedRef = useRef<Set<string>>(new Set())
  // MAYA-GUIDED-TEXT-01 (Sandra 2026-07-02): for graphic formats the text style is the FIRST
  // tap. Until she picks one, the concept pull is held and the six example cards sit inline in
  // the thread. The choice rides every generation in this chat; the chip above the direction
  // cards swaps it later.
  const [textOverlayMode, setTextOverlayMode] = useState<GraphicTextMode | null>(null)
  const [textStyleChoice, setTextStyleChoice] = useState<OverlayStyleId | null>(null)
  const [styleSwapOpen, setStyleSwapOpen] = useState(false)
  const [inlineAesthetics, setInlineAesthetics] = useState<Aesthetic[] | null>(null)
  const [inlineShotPickerAesthetic, setInlineShotPickerAesthetic] = useState<Aesthetic | null>(null)
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
  const [generationSource, setGenerationSource] = useState<GenerationSource>(() =>
    hasTrainedModel ? "trained-model" : "selfie"
  )
  // Per-card generation state, keyed by `${messageId}:${conceptId}`.
  const [genState, setGenState] = useState<Record<string, ConceptGenState>>(
    () => restoredDraft?.genState ?? {}
  )
  // MAYA-GUIDED-TEXT-01: "remove text" is an instant clean-image swap. Keep the previous
  // baked render in memory so "put the text back" can restore it without another API call.
  const hiddenBakedTextRef = useRef<Record<string, Array<string | null>>>({})
  // Fullscreen viewer: the set of image urls currently open (null = closed).
  const [lightbox, setLightbox] = useState<{
    key?: string
    format?: OutputFormat
    images: string[]
    textOverlaySpecs?: TextOverlaySpec[]
  } | null>(null)
  // True Edit Mode target: which generated image we're refining.
  const [editTarget, setEditTarget] = useState<{
    key: string
    url: string
    format: OutputFormat
  } | null>(null)
  const [textRefining, setTextRefining] = useState(false)
  // Out-of-credits modal (opened when /generate returns 402).
  const [creditModal, setCreditModal] = useState<{ open: boolean; balance: number | null }>({
    open: false,
    balance: null,
  })
  // TRIAL-CAP-01: a blocked trial user sees the membership offer (her photos are the proof),
  // never the top-up modal. Members keep the credits path.
  const [trialCapOpen, setTrialCapOpen] = useState(false)
  const showCreditBlock = (balance: number | null) => {
    if (cohort === "trial") setTrialCapOpen(true)
    else setCreditModal({ open: true, balance })
  }
  const showTrialCapIfDepleted = (balance: unknown) => {
    if (cohort === "trial" && typeof balance === "number" && balance <= 0) setTrialCapOpen(true)
  }
  // Past-selfie picker.
  const [libraryOpen, setLibraryOpen] = useState(false)
  // Header overflow menu (New chat / History / Memory live here, not as stacked buttons).
  const [menuOpen, setMenuOpen] = useState(false)
  // Once the conversation starts, the setup block collapses to a one-line strip so the thread
  // owns the screen (the stacked chips/selfie/CTA were hiding Maya's output on phones).
  const [setupOpen, setSetupOpen] = useState(() => restoredDraft?.setupOpen ?? false)
  // Cross-session memory (Phase E): what Maya already knows + the name she was given.
  const [memory, setMemory] = useState<Memory | null>(null)
  const [memoryOpen, setMemoryOpen] = useState(false)
  const [videoGalleryImages, setVideoGalleryImages] = useState<string[] | null>(null)
  const [videoGalleryError, setVideoGalleryError] = useState<string | null>(null)
  const [nameDraft, setNameDraft] = useState("")
  const [namingDismissed, setNamingDismissed] = useState(false)
  const [justNamed, setJustNamed] = useState<string | null>(null)
  // Progressive onboarding: only for members Maya doesn't already know, after first value.
  const [hasBrandProfile, setHasBrandProfile] = useState(true)
  const [generatedOnce, setGeneratedOnce] = useState(() => restoredDraft?.generatedOnce ?? false)
  const [brandDraft, setBrandDraft] = useState("")
  const [brandPromptDismissed, setBrandPromptDismissed] = useState(false)

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
        })
        setHasBrandProfile(d?.hasBrandProfile ?? true)
      })
      .catch(() =>
        setMemory({ agentName: null, brandNotes: null, preferences: null, userAvatarUrl: null })
      )
  }, [isOpen])

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

  // Optional uploads (front face lives in session). Kept simple: hidden until "Add more".
  const [showMore, setShowMore] = useState(false)
  const [threeQuarterUrl, setThreeQuarterUrl] = useState<string | null>(null)
  const [sideProfileUrl, setSideProfileUrl] = useState<string | null>(null)
  const [fullBodyUrl, setFullBodyUrl] = useState<string | null>(null)
  const [inspirationUrl, setInspirationUrl] = useState<string | null>(null)
  // SUITE-UX-02: inspiration attaches straight from the composer (no buried slot).
  const attachInputRef = useRef<HTMLInputElement>(null)

  // SUITE-UX-02 mobile: when the on-screen keyboard opens, iOS shrinks only the VISUAL
  // viewport; a 100dvh drawer keeps its layout height and a dead dark gap opens under the
  // composer. Track the visual viewport and pin the drawer to it while the keyboard is up.
  const [keyboardBox, setKeyboardBox] = useState<{ height: number; top: number } | null>(null)
  useEffect(() => {
    const vv = typeof window !== "undefined" ? window.visualViewport : null
    if (!vv) return
    const update = () => {
      const keyboardLikely = window.innerHeight - vv.height > 80
      setKeyboardBox(keyboardLikely ? { height: vv.height, top: vv.offsetTop } : null)
    }
    vv.addEventListener("resize", update)
    vv.addEventListener("scroll", update)
    update()
    return () => {
      vv.removeEventListener("resize", update)
      vv.removeEventListener("scroll", update)
    }
  }, [])

  // Latest context for the chat transport (read fresh on every send).
  const extrasRef = useRef<{
    aestheticName: string
    aestheticIntent: string
    aestheticId: string
    selectedShot: AestheticShot | null
    format: OutputFormat | null
    creationIntent: CreationIntent | null
    referenceSelfieUrl: string | null
    videoSourceUrl: string | null
    inspirationImageUrl: string | null
    /** MAYA-ADMIN-01: set by the /admin mount; server-verified against the admin email. */
    adminSession?: boolean
  }>({
    aestheticName: "",
    aestheticIntent: "",
    aestheticId: "",
    selectedShot: null,
    format: null,
    creationIntent: null,
    referenceSelfieUrl: null,
    videoSourceUrl: null,
    inspirationImageUrl: null,
    adminSession: admin || undefined,
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
  const [chatId, setChatId] = useState<string>(() => restoredDraft?.chatId ?? newChatId())
  const { messages, sendMessage, status, error, setMessages } = useChat({
    transport,
    id: chatId,
    messages: (restoredDraft?.messages ?? []) as any[],
  })

  const isThinking = status === "submitted" || status === "streaming"

  const [historyOpen, setHistoryOpen] = useState(false)
  const savedCountRef = useRef(restoredDraft?.messages.length ?? 0)
  const appliedDraftSessionRef = useRef<number | null>(restoredDraft?.sessionStartedAt ?? null)

  useEffect(() => {
    if (!session) return
    if (appliedDraftSessionRef.current === session.startedAt) return
    const draft = readMayaDraftForSession(session.startedAt)
    appliedDraftSessionRef.current = session.startedAt
    if (!draft) return

    restoredDraftRef.current = draft
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
    setChatId(draft.chatId)
    setMessages(draft.messages as any)
    setGenState(draft.genState)
    setGeneratedOnce(draft.generatedOnce)
    setSetupOpen(draft.setupOpen)
    setLocalCreationIntent(session.creationIntent ?? null)
  }, [session, setMessages])

  useEffect(() => {
    if (!isOpen || !session) return
    const snapshot: ServerMayaDraftSnapshot = {
      isOpen,
      chatId,
      session,
      savedAt: Date.now(),
      messages,
      genState,
      generatedOnce,
      setupOpen,
    }
    saveMayaDraft({
      chatId: snapshot.chatId,
      sessionStartedAt: snapshot.session.startedAt,
      messages: snapshot.messages,
      genState,
      generatedOnce: snapshot.generatedOnce,
      setupOpen: snapshot.setupOpen,
    })
    const timeout = window.setTimeout(() => {
      void fetch("/api/app-v3/maya/draft", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft: snapshot }),
      }).catch(() => {})
    }, 700)
    return () => window.clearTimeout(timeout)
  }, [chatId, genState, generatedOnce, isOpen, messages, session, setupOpen])

  useEffect(() => {
    if (status !== "ready") return
    if (messages.length === 0 || messages.length === savedCountRef.current) return
    const last = messages[messages.length - 1] as { role?: string } | undefined
    if (last?.role !== "assistant") return
    savedCountRef.current = messages.length
    void fetch("/api/app-v3/maya/chats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: chatId, messages, title: deriveTitle(messages) }),
    }).catch(() => {})
  }, [status, messages, chatId])

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [messages, isThinking])

  // When a new look (or a Content idea) opens Maya, allow its format to pull fresh directions.
  // Kept minimal on purpose: no message/chat mutation here, so it can't race the pull below.
  useEffect(() => {
    if (!session) return
    if (session.startedAt === sessionStartRef.current) return
    sessionStartRef.current = session.startedAt
    lastPulledFormatRef.current = null
    seededMessageSentRef.current = null
    seedRetiredRef.current = false
    setTextStyleChoice(null)
    setStyleSwapOpen(false)
    setInlineShotPickerAesthetic(null)
    setLocalCreationIntent(session.creationIntent ?? null)
  }, [session])

  // Mirror of the active selfie for async callbacks (avoids clobbering a fresh upload).
  useEffect(() => {
    activeSelfieRef.current = session?.referenceSelfieUrl ?? null
  }, [session])

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
        const inspo = asUrl(d?.extras?.inspiration)
        if (angle) setThreeQuarterUrl(prev => prev ?? angle)
        if (side) setSideProfileUrl(prev => prev ?? side)
        if (body) setFullBodyUrl(prev => prev ?? body)
        if (inspo) setInspirationUrl(prev => prev ?? inspo)
      })
      .catch(() => {})
  }, [isOpen, session, setReferenceSelfieUrl])

  useEffect(() => {
    if (!isOpen || inlineAesthetics) return
    fetch("/api/app-v3/aesthetics")
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (!Array.isArray(data?.aesthetics)) return
        setInlineAesthetics(data.aesthetics)
      })
      .catch(() => {})
  }, [inlineAesthetics, isOpen])

  // Maya-guided: once a format is chosen (a chip tap, or preselected from Content), she
  // pulls directions automatically. One pull per format; resets on a new chat or new session.
  // IDENTITY FIRST (P0): nothing streams until the selfie exists - the moment it's added,
  // this same effect fires and pulls the committed format, so upload completes the flow.
  useEffect(() => {
    if (!isOpen || !session) return
    const fmt = session.outputFormat
    if (!fmt || isThinking) return
    const pullIntent = localCreationIntent ?? session.creationIntent ?? intentForFormat(fmt, "manual")
    const hasSpecificSessionWorld =
      session.aesthetic.id !== "maya-blank" && session.aesthetic.id !== "maya-general"
    const needsInitialVisualWorld =
      messages.length === 0 &&
      fmt !== "video" &&
      !hasSpecificSessionWorld &&
      !session.aesthetic.selectedShot
    if (needsInitialVisualWorld) return
    const canUseTrainedModelWithoutSelfie =
      hasTrainedModel && !admin && generationSource === "trained-model" && fmt === "photo"
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
    admin,
    generationSource,
    hasTrainedModel,
    isOpen,
    localCreationIntent,
    messages.length,
    session,
    isThinking,
    sendMessage,
    textStyleChoice,
    textOverlayMode,
  ])

  // Maya-first blank starts: if the Create page opened with typed text but no committed format,
  // send that sentence into Maya so she asks one inline clarifying question. Without this, a
  // needs-clarify session opened to a quiet drawer that still expected the member to pick a chip.
  useEffect(() => {
    if (!isOpen || !session || isThinking) return
    if (session.outputFormat) return
    if (messages.length > 0) return
    const seed = session.seedPrompt?.trim()
    if (!seed) return
    if (seededMessageSentRef.current === session.startedAt) return
    seededMessageSentRef.current = session.startedAt
    sendMessage({ text: seed })
  }, [isOpen, isThinking, messages.length, sendMessage, session])

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
    if (latest && session?.outputFormat !== latest) {
      setTextOverlayMode(null)
      setTextStyleChoice(null)
      setStyleSwapOpen(false)
      setOutputFormat(latest)
    }
  }, [messages, isThinking, session, setOutputFormat])

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
    setStyleSwapOpen(false)
    setOutputFormat(latest)
  }, [messages, isThinking, session, setOutputFormat])

  useEffect(() => {
    if (!hasTrainedModel && generationSource !== "selfie") setGenerationSource("selfie")
  }, [generationSource, hasTrainedModel])

  if (!isOpen || !session) return null
  const { aesthetic, outputFormat, referenceSelfieUrl } = session
  const selectedShot = aesthetic.selectedShot ?? null
  const format: OutputFormat = outputFormat ?? "photo"
  const hasStarted = messages.length > 0
  const activeCreationIntent =
    localCreationIntent ??
    session.creationIntent ??
    (outputFormat ? intentForFormat(outputFormat, "manual") : needsClarificationIntent("manual"))
  const videoSourceUrl = session.videoSourceUrl
  const hasSpecificVisualWorld = aesthetic.id !== "maya-blank" && aesthetic.id !== "maya-general"
  const needsInitialVisualWorld =
    Boolean(outputFormat) && outputFormat !== "video" && !hasStarted && !hasSpecificVisualWorld
  const shouldShowFormatChoice = !outputFormat || (hasStarted && setupOpen)
  const shouldShowVibeChoice =
    Boolean(outputFormat) &&
    outputFormat !== "video" &&
    !hasStarted &&
    Boolean(inlineAesthetics?.length) &&
    (!hasSpecificVisualWorld || Boolean(inlineShotPickerAesthetic))
  const customModelAvailable = hasTrainedModel && format === "photo" && !admin
  const activeGenerationSource: GenerationSource = customModelAvailable
    ? generationSource
    : "selfie"
  const openerLine = outputFormat
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
    format: activeCreationIntent.format ?? outputFormat ?? null,
    creationIntent: activeCreationIntent,
    referenceSelfieUrl,
    videoSourceUrl,
    inspirationImageUrl: inspirationUrl,
    adminSession: admin || undefined,
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
          properties: { cohort, source: "maya_drawer", format },
        })
      } else if (slot === "angle") setThreeQuarterUrl(data.url)
      else if (slot === "side") setSideProfileUrl(data.url)
      else if (slot === "body") setFullBodyUrl(data.url)
      else if (slot === "video") {
        setVideoSourceUrl(data.url)
        setSetupOpen(false)
      } else setInspirationUrl(data.url)
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed")
    } finally {
      setUploadingSlot(null)
    }
  }

  // SUITE-UX-02: removing an optional image must stick across refreshes, so clear the
  // saved copy too (best-effort - local state clears either way).
  function clearSlot(slot: "angle" | "side" | "body" | "inspiration") {
    if (slot === "angle") setThreeQuarterUrl(null)
    else if (slot === "side") setSideProfileUrl(null)
    else if (slot === "body") setFullBodyUrl(null)
    else setInspirationUrl(null)
    void fetch(`/api/app-v3/upload-selfie?slot=${slot}`, { method: "DELETE" }).catch(() => {})
  }

  async function handleSend() {
    const text = input.trim()
    if (!text || isThinking || textRefining) return
    const refinement = parseTextRefinement(text)
    if (refinement && (await applyTextRefinement(refinement))) {
      setInput("")
      return
    }
    commitDetectedIntent(text)
    sendMessage({ text })
    setInput("")
  }

  function handleNewChat() {
    if (isThinking) return
    clearMayaDraft()
    void fetch("/api/app-v3/maya/draft", { method: "DELETE" }).catch(() => {})
    const nextChatId = newChatId()
    setMenuOpen(false)
    setSetupOpen(false)
    savedCountRef.current = 0
    lastPulledFormatRef.current = null
    seededMessageSentRef.current = null
    setTextOverlayMode(null)
    setTextStyleChoice(null)
    setStyleSwapOpen(false)
    setInlineShotPickerAesthetic(null)
    setLocalCreationIntent(null)
    seedRetiredRef.current = true // a clean session never replays the old seeded idea
    restoredDraftRef.current = null
    appliedDraftSessionRef.current = null
    formatSwitchAppliedRef.current.clear()
    setMessages([])
    setGenState({})
    setGeneratedOnce(false)
    setInput("")
    setChatId(nextChatId)
    setHistoryOpen(false)
    // Visible reset (P1): back to the four format chips, NOT an instant re-pull of the same
    // directions (which made "New chat" look like it did nothing). Selfie + memory are kept.
    setOutputFormat(null)
    resetCurrentSession()
  }

  async function handleSelectChat(id: string) {
    try {
      const res = await fetch(`/api/app-v3/maya/chats/${id}`)
      if (!res.ok) return
      const data = (await res.json().catch(() => null)) as { messages?: unknown[] } | null
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
      setChatId(id)
      setGenState({})
      setGeneratedOnce(false)
      setMessages(loaded as any)
      setHistoryOpen(false)
    } catch {
      /* leave history open so the user can retry */
    }
  }

  async function generateConcept(
    key: string,
    concept: ConceptCardData,
    targetFormat: OutputFormat = format,
    overlayStyle?: OverlayStyleId | null
  ) {
    const canUseCustomModel = activeGenerationSource === "trained-model" && targetFormat === "photo"

    if (targetFormat === "video" && !videoSourceUrl) {
      trackRecoveryShown(targetFormat, "missing_video_source")
      setGenState(s => ({
        ...s,
        [key]: { status: "error", error: "Choose or upload the photo you want to animate first." },
      }))
      setSetupOpen(true)
      return
    }
    if (targetFormat !== "video" && !referenceSelfieUrl && !canUseCustomModel) {
      trackRecoveryShown(targetFormat, "missing_selfie")
      setGenState(s => ({
        ...s,
        [key]: { status: "error", error: "Add a selfie first so it still looks like you." },
      }))
      return
    }
    // "Make another version" on a finished card is a re-roll - a friction signal the
    // member pulse tracks server-side (SUITE-UX-02).
    const rerun = genState[key]?.status === "done"
    setGenState(s => ({ ...s, [key]: { status: "generating" } }))
    try {
      if (targetFormat === "video") {
        const startRes = await fetch("/api/app-v3/maya/video/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageUrl: videoSourceUrl,
            motionPrompt: buildVideoMotionPrompt(concept.brief),
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

        if (startRes.status === 402 || startData?.code === "insufficient_credits") {
          setGenState(s => ({ ...s, [key]: { status: "idle" } }))
          trackRecoveryShown(targetFormat, "insufficient_credits")
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
        setGenState(s => ({ ...s, [key]: { status: "done", videoUrl } }))
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
            conceptPrompt: buildCustomModelConceptPrompt(concept.brief),
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

        if (startRes.status === 402 || startData?.code === "insufficient_credits") {
          setGenState(s => ({ ...s, [key]: { status: "idle" } }))
          trackRecoveryShown(targetFormat, "insufficient_credits")
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
          brief: concept.brief,
          format: targetFormat,
          referenceSelfieUrl,
          referenceSelfieUrls: [threeQuarterUrl, sideProfileUrl, fullBodyUrl].filter(Boolean),
          inspirationImageUrl: inspirationUrl,
          aestheticId: aesthetic.id,
          conceptTitle: concept.title,
          rerun,
          ...(graphicTextMode ? { textOverlayMode: graphicTextMode } : {}),
          ...(bakeStyle ? { overlayStyle: bakeStyle } : {}),
          ...(wantsBakedText ? { autoBake: true } : {}),
          // Single-image formats stream progressive previews; carousels keep the JSON path.
          // Auto-baked text needs the JSON path so the baked URL returns with the clean base.
          stream: wantsBakedText ? false : targetFormat !== "carousel",
        }),
      })

      // ── Streaming path: the photo develops in the card as partial frames arrive. ──
      const contentType = res.headers.get("content-type") || ""
      if (res.ok && contentType.includes("text/event-stream") && res.body) {
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ""
        let settled = false
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
              textOverlayMode?: GraphicTextMode
              autoBakeSkipped?: string | null
              aiImageId?: number | null
              aiImageIds?: Array<number | null>
              error?: string
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
                  textOverlayMode: evt!.textOverlayMode,
                  autoBakeSkipped: evt!.autoBakeSkipped,
                  aiImageId: evt!.aiImageId ?? null,
                  aiImageIds: evt!.aiImageIds,
                },
              }))
              setGeneratedOnce(true)
              trackGenerationCompleted(targetFormat, "stream")
              showTrialCapIfDepleted(evt.newBalance)
              settled = true
            } else if (evt?.type === "error") {
              trackRecoveryShown(targetFormat, "stream_error")
              setGenState(s => ({
                ...s,
                [key]: { status: "error", error: evt!.error || "Generation failed" },
              }))
              settled = true
            }
          }
        }
        if (!settled) {
          trackRecoveryShown(targetFormat, "stream_unsettled")
          setGenState(s => ({ ...s, [key]: { status: "error", error: "Generation failed" } }))
        }
        return
      }

      const data = (await res.json().catch(() => null)) as {
        imageUrl?: string
        imageUrls?: string[]
        textOverlaySpecs?: TextOverlaySpec[]
        bakedImageUrls?: Array<string | null>
        textOverlayMode?: GraphicTextMode
        autoBakeSkipped?: string | null
        aiImageId?: number | null
        aiImageIds?: Array<number | null>
        error?: string
        code?: string
        current?: number
        newBalance?: number
      } | null
      if (res.status === 402 || data?.code === "insufficient_credits") {
        // Graceful path: reset the card and open the right offer instead of a raw error.
        setGenState(s => ({ ...s, [key]: { status: "idle" } }))
        trackRecoveryShown(targetFormat, "insufficient_credits")
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
          bakedImageUrls: data?.bakedImageUrls,
          textOverlayMode: data?.textOverlayMode,
          autoBakeSkipped: data?.autoBakeSkipped,
          aiImageId: data?.aiImageId ?? null,
          aiImageIds: data?.aiImageIds,
        },
      }))
      setGeneratedOnce(true) // unlocks the gentle "tell Maya about your brand" moment (value first)
      trackGenerationCompleted(targetFormat, "generate")
      showTrialCapIfDepleted(data?.newBalance)
    } catch (e) {
      trackRecoveryShown(targetFormat, "exception")
      setGenState(s => ({
        ...s,
        [key]: { status: "error", error: e instanceof Error ? e.message : "Generation failed" },
      }))
    }
  }

  async function generatePhotoshootSet(key: string, concepts: ConceptCardData[]) {
    if (!referenceSelfieUrl) {
      trackRecoveryShown("photoshoot", "missing_selfie")
      setGenState(s => ({
        ...s,
        [key]: { status: "error", error: "Add a selfie first so it still looks like you." },
      }))
      return
    }
    const shootConcepts = concepts.slice(0, 9)
    if (shootConcepts.length < 6) {
      trackRecoveryShown("photoshoot", "thin_shoot_plan")
      setGenState(s => ({
        ...s,
        [key]: { status: "error", error: "Ask Maya for a fuller shoot plan first." },
      }))
      return
    }
    setGenState(s => ({ ...s, [key]: { status: "generating" } }))
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
          stream: false,
        }),
      })
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
      if (res.status === 402 || data?.code === "insufficient_credits") {
        setGenState(s => ({ ...s, [key]: { status: "idle" } }))
        trackRecoveryShown("photoshoot", "insufficient_credits")
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
      trackGenerationCompleted("photoshoot", "photoshoot_set")
      showTrialCapIfDepleted(data?.newBalance)
    } catch (e) {
      trackRecoveryShown("photoshoot", "exception")
      setGenState(s => ({
        ...s,
        [key]: { status: "error", error: e instanceof Error ? e.message : "Generation failed" },
      }))
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
      properties: { cohort, action, ...intent, ...properties },
    })
  }

  // Tap-first: choosing a format asks Maya to pull 3 directions for it (no typing needed).
  function handlePickFormat(id: OutputFormat) {
    if (isThinking) return
    if (id !== outputFormat) {
      setTextOverlayMode(null)
      setTextStyleChoice(null)
      setStyleSwapOpen(false)
      lastPulledFormatRef.current = null
    }
    const intent = intentForFormat(id, activeCreationIntent.source === "starter_chip" ? "starter_chip" : "manual")
    setLocalCreationIntent(intent)
    extrasRef.current = { ...extrasRef.current, format: intent.format, creationIntent: intent }
    trackInlineChoice("format_choice", intent)
    setOutputFormat(id) // the auto-pull effect sends the request for the chosen format
    const keepSetupForVibe = id !== "video" && !hasStarted && !hasSpecificVisualWorld
    if (!keepSetupForVibe) {
      setSetupOpen(false) // a committed pick collapses setup so the directions are visible
    }
  }

  function intentForCurrentVibeChoice(source: "manual" | "vault_shot"): CreationIntent {
    const currentFormat = activeCreationIntent.format ?? outputFormat ?? null
    if (!currentFormat) return needsClarificationIntent(source)
    return intentForFormat(currentFormat, source)
  }

  function handleInlineVibePick(nextAesthetic: Aesthetic) {
    if (isThinking) return
    const intent = intentForCurrentVibeChoice("manual")
    trackInlineChoice("choose_vibe", intent, { aestheticId: nextAesthetic.id })
    if (nextAesthetic.shots?.length) {
      setInlineShotPickerAesthetic(nextAesthetic)
      return
    }
    openWithAesthetic(nextAesthetic, {
      format: intent.format ?? undefined,
      seed: session?.seedPrompt ?? undefined,
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
    openWithAesthetic(compactInlineAestheticForMaya(inlineShotPickerAesthetic, shot), {
      format: intent.format ?? undefined,
      seed: `I want to recreate the "${shot.title}" shot from this vibe with my selfie.`,
      referenceSelfieUrl,
      videoSourceUrl,
      creationIntent: intent,
    })
    setInlineShotPickerAesthetic(null)
  }

  function commitDetectedIntent(text: string, source: CreationIntent["source"] = "typed") {
    const intent = detectCreationIntent(text, source)
    setLocalCreationIntent(intent)
    extrasRef.current = { ...extrasRef.current, format: intent.format, creationIntent: intent }
    trackInlineChoice("typed_message", intent)
    if (intent.format && session?.outputFormat !== intent.format) {
      setTextOverlayMode(null)
      setTextStyleChoice(null)
      setStyleSwapOpen(false)
      setOutputFormat(intent.format)
      setSetupOpen(false)
    }
    return intent
  }

  function sendInlineAnswer(answer: string) {
    if (isThinking) return
    commitDetectedIntent(answer, "typed")
    sendMessage({ text: answer })
  }

  function handleNextFormat(
    nextFormat: OutputFormat,
    kind: InlineActionKind,
    styleReferenceUrl?: string | null
  ) {
    if (isThinking) return
    const intent = intentForFormat(nextFormat, "gallery_action")
    setLocalCreationIntent(intent)
    extrasRef.current = { ...extrasRef.current, format: intent.format, creationIntent: intent }
    void trackAnalyticsEvent({
      event: "suite_next_action_selected",
      properties: { cohort, kind, format: nextFormat, style_reference: Boolean(styleReferenceUrl) },
    })
    if (styleReferenceUrl) {
      if (nextFormat === "video") {
        setVideoSourceUrl(styleReferenceUrl)
      } else {
        setInspirationUrl(styleReferenceUrl)
      }
    }
    setTextOverlayMode(null)
    setTextStyleChoice(null)
    setStyleSwapOpen(false)
    setOutputFormat(nextFormat)
    setSetupOpen(false)
    lastPulledFormatRef.current = nextFormat
    seedRetiredRef.current = true
    sendMessage({ text: FORMAT_PHRASE[nextFormat] })
  }

  function trackGenerationCompleted(targetFormat: OutputFormat, source: string) {
    void trackAnalyticsEvent({
      event: "suite_generation_path_completed",
      properties: { cohort, format: targetFormat, source },
    })
  }

  function trackRecoveryShown(targetFormat: OutputFormat, reason: string) {
    void trackAnalyticsEvent({
      event: "suite_maya_recovery_shown",
      properties: { cohort, format: targetFormat, reason },
    })
  }

  function focusComposer() {
    composerRef.current?.focus()
  }
  const userAvatar = memory?.userAvatarUrl ?? null
  const showNaming = memory !== null && !memory.agentName && !namingDismissed && !hasStarted
  // Tiny, value-first: only after she's generated, only if Maya doesn't already know her brand.
  const showBrandPrompt =
    generatedOnce && !hasBrandProfile && !memory?.brandNotes?.trim() && !brandPromptDismissed

  async function saveBrand() {
    const text = brandDraft.trim()
    if (!text) return
    setBrandPromptDismissed(true)
    try {
      const res = await fetch("/api/app-v3/maya/memory", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandNotes: text }),
      })
      const d = (await res.json().catch(() => null)) as Memory | null
      if (res.ok && d) {
        setMemory({
          agentName: d.agentName ?? null,
          brandNotes: d.brandNotes ?? null,
          preferences: d.preferences ?? null,
          userAvatarUrl: d.userAvatarUrl ?? null,
        })
      }
    } catch {
      /* ignore; she can add it later in Memory */
    }
    setBrandDraft("")
  }

  async function saveName() {
    const n = nameDraft.trim()
    if (!n) return
    setNamingDismissed(true)
    try {
      const res = await fetch("/api/app-v3/maya/memory", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentName: n }),
      })
      const d = (await res.json().catch(() => null)) as Memory | null
      if (res.ok && d) {
        setMemory({
          agentName: d.agentName ?? n,
          brandNotes: d.brandNotes ?? null,
          preferences: d.preferences ?? null,
          userAvatarUrl: d.userAvatarUrl ?? null,
        })
      }
    } catch {
      /* ignore; she can name later from Memory */
    }
    setJustNamed(n)
    setNameDraft("")
  }

  type TextRefinementTarget = {
    key: string
    index: number
    cleanImageUrl: string
    spec: TextOverlaySpec
    bakedUrl: string | null
  }

  function textTargetForKey(key: string, index = 0): TextRefinementTarget | null {
    const gen = genState[key]
    if (!gen || gen.status !== "done") return null
    const cleanImageUrl = gen.imageUrls?.[index]
    const spec = gen.textOverlaySpecs?.[index]
    if (!cleanImageUrl || !spec) return null
    return {
      key,
      index,
      cleanImageUrl,
      spec,
      bakedUrl: gen.bakedImageUrls?.[index] ?? null,
    }
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
      updateBakedImage(target.key, target.index, target.cleanImageUrl)
      return true
    }

    if (refinement.kind === "restore-text") {
      const cached = hiddenBakedTextRef.current[target.key]?.[target.index]
      updateBakedImage(target.key, target.index, cached ?? null)
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

    setTextRefining(true)
    updateTextOverlaySpec(target.key, target.index, nextSpec)

    try {
      const res = await fetch("/api/app-v3/maya/bake-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cleanImageUrl: target.cleanImageUrl,
          spec: nextSpec,
          ...(styleAdjustments ? { styleAdjustments } : {}),
        }),
      })
      const data = (await res.json().catch(() => null)) as
        | {
            bakedUrl?: string
            error?: string
            code?: string
            current?: number
            newBalance?: number
          }
        | null

      if (res.status === 402 || data?.code === "insufficient_credits") {
        showCreditBlock(typeof data?.current === "number" ? data.current : null)
        return true
      }
      if (data?.code === "generation_locked" && cohort === "trial") {
        setTrialCapOpen(true)
        return true
      }
      if (!res.ok || !data?.bakedUrl) {
        throw new Error(data?.error || "Text update failed")
      }
      updateBakedImage(target.key, target.index, data.bakedUrl)
      hiddenBakedTextRef.current[target.key] = []
      showTrialCapIfDepleted(data.newBalance)
      return true
    } catch (error) {
      setGenState(state => {
        const current = state[target.key]
        if (!current || current.status !== "done") return state
        return {
          ...state,
          [target.key]: {
            ...current,
            error: error instanceof Error ? error.message : "Text update failed",
          },
        }
      })
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
      return {
        ...state,
        [key]: {
          ...current,
          textOverlaySpecs: nextSpecs,
          ...(nextBaked ? { bakedImageUrls: nextBaked } : {}),
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
  function updateBakedImage(key: string, index: number, bakedUrl: string | null) {
    setGenState(state => {
      const current = state[key]
      if (!current || current.status !== "done" || !current.imageUrls?.length) return state
      const nextBaked = [...(current.bakedImageUrls ?? [])]
      nextBaked[index] = bakedUrl
      return {
        ...state,
        [key]: {
          ...current,
          bakedImageUrls: nextBaked,
        },
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex w-full max-w-[100dvw] justify-end overscroll-x-none [overflow-x:clip]">
      <button
        type="button"
        aria-label="Close"
        onClick={close}
        className="absolute inset-0 bg-[#0D0E10]/30 backdrop-blur-[2px] animate-in fade-in duration-200 motion-reduce:animate-none"
      />
      <aside
        role="dialog"
        aria-label={`${agentLabel}, ${aesthetic.name}`}
        style={
          keyboardBox
            ? { height: keyboardBox.height, transform: `translateY(${keyboardBox.top}px)` }
            : undefined
        }
        className="relative flex h-[100dvh] w-full min-w-0 max-w-[100dvw] flex-col overflow-hidden bg-[#F8FAFA] shadow-xl animate-in fade-in duration-200 ease-out motion-reduce:animate-none sm:max-w-md sm:slide-in-from-right sm:duration-300"
      >
        {/* Header - one calm row. Actions live in a quiet menu, and Close is always visible
            (on phones the drawer is full-width, so the backdrop can't be tapped to leave). */}
        <header className="flex min-w-0 shrink-0 items-center justify-between gap-3 border-b border-[#C5C6C8]/40 px-5 py-3.5 sm:px-6">
          <div className="min-w-0">
            <p className="truncate text-[10px] uppercase tracking-[0.3em] text-[#818283]">
              {agentLabel}
            </p>
            <h2 className="mt-0.5 truncate font-serif text-[21px] font-light leading-tight text-[#0D0E10]">
              {aesthetic.name}
            </h2>
            {selectedShot && (
              <p className="mt-0.5 truncate text-[11px] leading-snug text-[#6D6E70]">
                Shot reference: {selectedShot.title}
              </p>
            )}
          </div>
          <div className="relative flex shrink-0 items-center gap-4">
            <button
              type="button"
              onClick={() => setMenuOpen(v => !v)}
              className="inline-flex min-h-11 items-center py-1 text-[11px] uppercase tracking-[0.14em] text-[#4F5052] hover:text-[#0D0E10]"
            >
              Menu
            </button>
            <button
              type="button"
              onClick={close}
              className="inline-flex min-h-11 items-center py-1 text-[11px] uppercase tracking-[0.14em] text-[#4F5052] hover:text-[#0D0E10]"
            >
              Close
            </button>
            {menuOpen && (
              <>
                <button
                  type="button"
                  aria-label="Close menu"
                  onClick={() => setMenuOpen(false)}
                  className="fixed inset-0 z-10 cursor-default"
                />
                <div className="absolute right-0 top-full z-20 mt-2 w-44 overflow-hidden rounded-[8px] border border-[#C5C6C8]/60 bg-white py-1 shadow-sm">
                  <button
                    type="button"
                    onClick={handleNewChat}
                    disabled={isThinking}
                    className="block min-h-11 w-full px-4 py-2.5 text-left text-[11px] uppercase tracking-[0.14em] text-[#4F5052] hover:bg-[#F1F2F2] hover:text-[#0D0E10] disabled:opacity-40"
                  >
                    New chat
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false)
                      setHistoryOpen(true)
                    }}
                    className="block min-h-11 w-full px-4 py-2.5 text-left text-[11px] uppercase tracking-[0.14em] text-[#4F5052] hover:bg-[#F1F2F2] hover:text-[#0D0E10]"
                  >
                    History
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false)
                      setMemoryOpen(true)
                    }}
                    className="block min-h-11 w-full px-4 py-2.5 text-left text-[11px] uppercase tracking-[0.14em] text-[#4F5052] hover:bg-[#F1F2F2] hover:text-[#0D0E10]"
                  >
                    Memory
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Setup - full block before the conversation starts (the guided beginning), then it
            collapses to a one-line status strip so Maya's output owns the screen. "Change"
            re-opens it for a format switch or a selfie swap. */}
        {hasStarted && !setupOpen && (
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
              <span className="truncate text-[11px] uppercase tracking-[0.14em] text-[#818283]">
                {FORMAT_OPTIONS.find(o => o.id === format)?.label ?? "Photo"}
                {customModelAvailable
                  ? activeGenerationSource === "trained-model"
                    ? " · My trained model"
                    : " · Selfie engine"
                  : ""}
                {format === "video"
                  ? videoSourceUrl
                    ? " · Image selected"
                    : " · Pick image"
                  : referenceSelfieUrl
                    ? " · Selfie in"
                    : " · No selfie yet"}
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
        {(!hasStarted || setupOpen) && (
          <div className="min-h-0 min-w-0 shrink space-y-3 overflow-y-auto overscroll-contain border-b border-[#C5C6C8]/40 px-5 py-4 sm:px-6">
            {shouldShowFormatChoice && (
              <InlineFormatChoice disabled={isThinking} onPick={handlePickFormat} />
            )}

            {shouldShowVibeChoice && (
              <div className="space-y-2">
                {inlineShotPickerAesthetic ? (
                  <>
                    <InlineShotPicker
                      shots={inlineShotPickerAesthetic.shots ?? []}
                      disabled={isThinking}
                      onPick={handleInlineShotPick}
                    />
                    <button
                      type="button"
                      onClick={() => setInlineShotPickerAesthetic(null)}
                      className="inline-flex min-h-11 items-center text-[11px] uppercase tracking-[0.16em] text-[#818283] underline underline-offset-2 hover:text-[#0D0E10]"
                    >
                      Choose another style
                    </button>
                  </>
                ) : (
                  <InlineVibePicker
                    aesthetics={inlineAesthetics}
                    disabled={isThinking}
                    onPick={handleInlineVibePick}
                  />
                )}
              </div>
            )}

            {customModelAvailable && (
              <div className="rounded-[6px] border border-[#C5C6C8]/60 bg-white p-2.5">
                <p className="mb-2 px-1 text-[10px] uppercase tracking-[0.2em] text-[#818283]">
                  Photo source
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    {
                      id: "trained-model" as const,
                      label: "My trained model",
                      note: "Uses your saved model.",
                    },
                    {
                      id: "selfie" as const,
                      label: "Selfie engine",
                      note: "Uses your uploaded selfie.",
                    },
                  ].map(option => {
                    const selected = generationSource === option.id
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setGenerationSource(option.id)}
                        disabled={isThinking}
                        className={`min-h-14 rounded-[4px] border px-3 py-2 text-left transition-colors disabled:opacity-50 ${
                          selected
                            ? "border-[#0D0E10] bg-[#0D0E10] text-white"
                            : "border-[#C5C6C8]/60 bg-[#F8FAFA] text-[#4F5052] hover:border-[#0D0E10]/40"
                        }`}
                      >
                        <span className="block text-[12px] font-medium">{option.label}</span>
                        <span
                          className={`mt-0.5 block text-[10px] leading-relaxed ${
                            selected ? "text-white/70" : "text-[#818283]"
                          }`}
                        >
                          {option.note}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {format === "video" && (
              <div className="rounded-[6px] border border-[#0D0E10]/15 bg-white px-3 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[#818283]">
                      Image to animate
                    </p>
                    <p className="mt-1 text-[13px] leading-relaxed text-[#4F5052]">
                      Pick from your photos or upload a new still image. Maya will send this exact
                      image to the video pipeline.
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
                    <p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-[#818283]">
                      Pick from your photos
                    </p>
                    {videoGalleryImages === null && !videoGalleryError && (
                      <p className="text-[12px] text-[#818283]">Loading photos...</p>
                    )}
                    {videoGalleryError && (
                      <p className="text-[12px] text-[#818283]">{videoGalleryError}</p>
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
                      <p className="text-[12px] text-[#818283]">
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
                        className="inline-flex min-h-11 items-center text-[11px] uppercase tracking-[0.14em] text-[#818283] underline underline-offset-2 hover:text-[#0D0E10]"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
                <input
                  ref={videoInput}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
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
            {format !== "video" && referenceSelfieUrl ? (
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
                    onClick={() => fileInput.current?.click()}
                    disabled={uploadingSlot === "face"}
                    className="inline-flex min-h-11 items-center text-[11px] uppercase tracking-[0.14em] text-[#4F5052] underline underline-offset-2 hover:text-[#0D0E10] disabled:opacity-60"
                  >
                    {uploadingSlot === "face" ? "Uploading…" : "Replace selfie"}
                  </button>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-[#818283]">
                  Maya will keep your skin tone and natural features recognizable, so it&apos;s still
                  you.
                </p>
              </div>
            ) : format !== "video" ? (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  disabled={uploadingSlot === "face"}
                  className="flex min-h-11 items-center gap-2 rounded-[4px] border border-[#C5C6C8]/60 bg-white px-3.5 py-2 text-[12px] text-[#4F5052] hover:border-[#0D0E10]/40 disabled:opacity-60"
                >
                  {uploadingSlot === "face" ? "Uploading…" : "Add your selfie"}
                </button>
                <button
                  type="button"
                  onClick={() => setLibraryOpen(true)}
                  className="inline-flex min-h-11 items-center text-[11px] uppercase tracking-[0.14em] text-[#4F5052] underline underline-offset-2 hover:text-[#0D0E10]"
                >
                  Use a past selfie
                </button>
              </div>
            ) : null}
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0]
                if (f) void handleUpload("face", f)
              }}
            />

            {/* Primary "go": before Maya has pulled directions, one obvious next action so the
              customer never has to type or guess. Reuses handlePickFormat (commits the format,
              which triggers the pull). Hidden once directions exist. */}
            {!hasStarted && (
              <button
                type="button"
                onClick={() => {
                  if (!outputFormat || needsInitialVisualWorld) return
                  // Identity first (P0): with no selfie the CTA commits the format and opens the
                  // upload - the gated auto-pull then starts the moment her selfie is in.
                  handlePickFormat(outputFormat)
                  if (outputFormat === "video" && !videoSourceUrl) {
                    videoInput.current?.click()
                  } else if (!referenceSelfieUrl && activeGenerationSource !== "trained-model") {
                    fileInput.current?.click()
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
            {format !== "video" && (
              <button
                type="button"
                onClick={() => setShowMore(v => !v)}
                className="inline-flex min-h-11 items-center text-[11px] uppercase tracking-[0.16em] text-[#818283] hover:text-[#0D0E10]"
              >
                {showMore ? "Hide extras" : "Add more angles (optional)"}
              </button>
            )}

            {format !== "video" && showMore && (
              <div className="space-y-2">
                <p className="text-[11px] leading-relaxed text-[#818283]">
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
                          className="self-stretch rounded-r-[4px] border border-l-0 border-[#C5C6C8]/60 bg-white px-2.5 text-[12px] text-[#818283] hover:border-[#0D0E10]/40 hover:text-[#0D0E10]"
                        >
                          ×
                        </button>
                      )}
                      <input
                        ref={ref}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={e => {
                          const f = e.target.files?.[0]
                          if (f) void handleUpload(slot, f)
                        }}
                      />
                    </span>
                  ))}
                </div>
              </div>
            )}

            {uploadError && <p className="text-[12px] text-[#282728]">{uploadError}</p>}

            {/* Mid-conversation, setup is an overlay moment: one tap returns to the thread. */}
            {hasStarted && (
              <button
                type="button"
                onClick={() => setSetupOpen(false)}
                className="min-h-11 w-full rounded-[4px] border border-[#C5C6C8]/60 bg-white px-4 py-2.5 text-[11px] uppercase tracking-[0.16em] text-[#4F5052] hover:border-[#0D0E10]/40"
              >
                Back to the conversation
              </button>
            )}
          </div>
        )}

        {/* Thread - the ONLY scroll area. min-h-0 lets this flex child shrink so overflow-y
            actually scrolls (without it, content overflowed and the direction cards were
            unreachable below the fold). */}
        <div className="min-h-0 min-w-0 flex-1 max-w-full space-y-5 overflow-y-auto overscroll-x-none px-4 py-5 [overflow-x:clip] sm:px-6 sm:py-6">
          {/* Static opener */}
          <div className="flex min-w-0 max-w-full items-end gap-2">
            <Avatar src={MAYA_AVATAR} fallback={agentLabel.charAt(0)} />
            <div className="min-w-0 max-w-[calc(100%-2.25rem)] break-words rounded-[6px] rounded-tl-[2px] bg-white p-4 text-[15px] leading-relaxed text-[#282728] [overflow-wrap:anywhere] sm:max-w-[80%]">
              <p>
                {selectedShot
                  ? `${aesthetic.name}. Starting from ${selectedShot.title}.`
                  : `${aesthetic.name}. ${aesthetic.blurb}`}
              </p>
              <p className="mt-2">{openerLine}</p>
            </div>
          </div>

          {/* First-run: name your agent (the ownership moment). Skippable. */}
          {showNaming && (
            <div className="min-w-0 max-w-full rounded-[8px] border border-[#C5C6C8]/60 bg-white p-4 [overflow-x:clip] animate-in fade-in slide-in-from-bottom-2 duration-300 motion-reduce:animate-none">
              <p className="text-[14px] leading-relaxed text-[#282728]">
                One quick thing: what would you like to call me? It makes this ours. 🤍
              </p>
              <div className="mt-3 flex min-w-0 gap-2">
                <input
                  type="text"
                  value={nameDraft}
                  onChange={e => setNameDraft(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      void saveName()
                    }
                  }}
                  placeholder="e.g. Aria"
                  className="min-h-11 min-w-0 flex-1 rounded-[4px] border border-[#C5C6C8]/60 bg-white px-3 py-2.5 text-[15px] text-[#282728] outline-none focus:border-[#0D0E10]"
                />
                <button
                  type="button"
                  onClick={() => void saveName()}
                  disabled={nameDraft.trim().length === 0}
                  className="min-h-11 rounded-[4px] bg-[#0D0E10] px-4 text-[11px] uppercase tracking-[0.16em] text-white disabled:opacity-40"
                >
                  Save
                </button>
              </div>
              <button
                type="button"
                onClick={() => setNamingDismissed(true)}
                className="mt-2 inline-flex min-h-11 items-center text-[11px] uppercase tracking-[0.14em] text-[#818283] hover:text-[#4F5052]"
              >
                Maybe later
              </button>
            </div>
          )}

          {/* Maya acknowledges her new name */}
          {justNamed && (
            <div className="flex min-w-0 max-w-full items-end gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300 motion-reduce:animate-none">
              <Avatar src={MAYA_AVATAR} fallback={justNamed.charAt(0)} />
              <div className="min-w-0 max-w-[calc(100%-2.25rem)] break-words rounded-[6px] rounded-tl-[2px] bg-white p-4 text-[15px] leading-relaxed text-[#282728] [overflow-wrap:anywhere] sm:max-w-[80%]">
                Love it. I&apos;m {justNamed} now. Let&apos;s make something beautiful. 🤍
              </div>
            </div>
          )}

          {/* Prominent selfie requirement: once Maya has proposed directions but there's no
              face yet, make the requirement obvious instead of a quietly-disabled button. */}
          {format === "video" && !videoSourceUrl && hasStarted && (
            <div className="min-w-0 max-w-full rounded-[8px] border border-[#0D0E10]/20 bg-[#0D0E10]/[0.03] p-4 [overflow-x:clip]">
              <p className="font-serif text-[18px] font-light leading-tight text-[#0D0E10]">
                Choose what to animate
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-[#4F5052]">
                Pick a gallery photo or upload a still image, then Maya can create motion options.
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
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[#818283]">
                      Animating this photo
                    </p>
                    <p className="mt-1 text-[13px] leading-relaxed text-[#4F5052]">
                      Maya will use this still as the reference for the motion options and the final
                      video.
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
                onUpload={() => fileInput.current?.click()}
                onUseExisting={() => setLibraryOpen(true)}
              />
            )}

          {messages.map((m: any) => {
            const isUser = m.role === "user"
            const parts = Array.isArray(m.parts) ? m.parts : []
            const text = parts
              .filter((p: any) => p?.type === "text" && typeof p.text === "string")
              .map((p: any) => p.text)
              .join("")
            const conceptPart = parts.map(extractConcepts).find(Boolean) as
              | ConceptCardData[]
              | undefined
            const conceptFormat =
              (parts.map(extractConceptFormat).find(Boolean) as OutputFormat | undefined) ?? format
            const clarifyPart = parts.map(extractClarify).find(Boolean) as ClarifyPrompt | undefined
            const adminContentPart = parts.map(extractAdminContentTool).find(Boolean) as
              | AdminContentToolResult
              | undefined
            // Maya tried to present directions but none survived (truncated/failed tool call):
            // never leave a dead end - offer a one-tap re-pull instead.
            const conceptsLost =
              !isUser &&
              !isThinking &&
              parts.some(isConceptToolPart) &&
              (conceptPart?.length ?? 0) === 0

            return (
              <div
                key={m.id}
                className="min-w-0 max-w-full space-y-4 [overflow-x:clip] animate-in fade-in slide-in-from-bottom-2 duration-300 motion-reduce:animate-none"
              >
                {text.trim() &&
                  (isUser ? (
                    <div className="flex min-w-0 max-w-full flex-row-reverse items-end gap-2">
                      <Avatar src={userAvatar} fallback="You" />
                      <div className="min-w-0 max-w-[calc(100%-2.25rem)] break-words rounded-[6px] rounded-tr-[2px] bg-[#0D0E10] p-3.5 text-[15px] leading-relaxed text-white [overflow-wrap:anywhere] sm:max-w-[80%]">
                        {text}
                      </div>
                    </div>
                  ) : (
                    <div className="flex min-w-0 max-w-full items-end gap-2">
                      <Avatar src={MAYA_AVATAR} fallback={agentLabel.charAt(0)} />
                      <div className="min-w-0 max-w-[calc(100%-2.25rem)] break-words rounded-[6px] rounded-tl-[2px] bg-white p-4 [overflow-wrap:anywhere] sm:max-w-[80%]">
                        <Markdown>{text}</Markdown>
                      </div>
                    </div>
                  ))}

                {clarifyPart && (
                  <ClarifyCard
                    clarify={clarifyPart}
                    onPick={sendInlineAnswer}
                    onFreeText={focusComposer}
                    disabled={isThinking}
                  />
                )}

                {adminContentPart && <AdminContentToolCard result={adminContentPart} />}

                {conceptsLost && (
                  <div className="min-w-0 max-w-full rounded-[6px] bg-[#282728]/5 px-4 py-3 [overflow-x:clip]">
                    <p className="text-[13px] text-[#282728]">
                      Your directions didn&apos;t come through cleanly.
                    </p>
                    <button
                      type="button"
                      onClick={() => sendMessage({ text: FORMAT_PHRASE[format] })}
                      className="mt-2 inline-flex min-h-11 items-center text-[11px] uppercase tracking-[0.16em] text-[#0D0E10] underline underline-offset-2 hover:opacity-70"
                    >
                      Pull fresh directions
                    </button>
                  </div>
                )}

                {conceptPart && conceptPart.length > 0 && conceptFormat === "photoshoot" && (
                  <div className="min-w-0 max-w-full space-y-3 rounded-[8px] border border-[#D8D4CE] bg-white p-4 [overflow-x:clip]">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-[#818283]">
                        Full photoshoot
                      </p>
                      <p className="mt-1 text-[15px] leading-relaxed text-[#282728]">
                        One connected set · {conceptPart.length} shots · one look, varied angles.
                      </p>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {conceptPart.slice(0, 9).map((concept, index) => (
                        <div
                          key={concept.id}
                          className="min-w-0 rounded-[6px] bg-[#F7F4EF] px-3 py-2"
                        >
                          <p className="text-[10px] uppercase tracking-[0.16em] text-[#8B8178]">
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
                      const promptAssetId = admin ? promptAssetIdFromGen(gen) : null
                      return (
                        <div className="space-y-3">
                          {urls.length > 0 && (
                            <button
                              type="button"
                              onClick={() =>
                                setLightbox({
                                  key,
                                  format: "photoshoot",
                                  images: urls,
                                  textOverlaySpecs: gen.textOverlaySpecs,
                                })
                              }
                              className="grid w-full grid-cols-3 gap-2 text-left"
                            >
                              {urls.slice(0, 6).map((url, index) => (
                                <img
                                  key={`${url}-${index}`}
                                  src={url}
                                  alt=""
                                  className="aspect-[4/5] w-full rounded-[6px] object-cover"
                                />
                              ))}
                            </button>
                          )}
                          {gen.status === "error" && (
                            <p className="text-[13px] text-[#8A3B2E]">{gen.error}</p>
                          )}
                          <button
                            type="button"
                            onClick={() => void generatePhotoshootSet(key, conceptPart)}
                            disabled={gen.status === "generating" || !referenceSelfieUrl}
                            className="inline-flex min-h-11 items-center rounded-full bg-[#0D0E10] px-5 text-[11px] uppercase tracking-[0.16em] text-white disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {gen.status === "generating"
                              ? "Creating shoot..."
                              : urls.length > 0
                                ? "Create another set"
                                : "Create full photoshoot"}
                          </button>
                          {promptAssetId && (
                            <a
                              href={`/api/admin/app-v3/generation-prompt?id=${encodeURIComponent(promptAssetId)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex min-h-11 items-center text-[11px] uppercase tracking-[0.16em] text-[#818283] underline underline-offset-2 hover:text-[#4F5052]"
                            >
                              View prompt
                            </a>
                          )}
                        </div>
                      )
                    })()}
                  </div>
                )}

                {conceptPart && conceptPart.length > 0 && conceptFormat !== "photoshoot" && (
                  <div className="min-w-0 max-w-full space-y-3 [overflow-x:clip]">
                    <div className="flex min-w-0 items-center justify-between gap-2">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-[#818283]">
                        Choose your direction
                      </p>
                      {isGraphicOutputFormat(conceptFormat) && textOverlayMode && (
                        <button
                          type="button"
                          onClick={() => {
                            setTextOverlayMode(null)
                            setTextStyleChoice(null)
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
                      )}
                    </div>
                    {isGraphicOutputFormat(conceptFormat) &&
                      textOverlayMode === "with-text" &&
                      styleSwapOpen && (
                      <TextStyleTemplatePicker
                        format={conceptFormat}
                        onPick={style => {
                          setTextStyleChoice(style)
                          setStyleSwapOpen(false)
                        }}
                      />
                    )}
                    {conceptPart.map(concept => {
                      const key = `${m.id}:${concept.id}`
                      const gen = genState[key] ?? { status: "idle" as const }
                      const resultUrls = gen.imageUrls ?? []
                      const latestStyleReferenceUrl =
                        resultUrls.length > 0 ? resultUrls[resultUrls.length - 1] : null
                      return (
                        <ConceptCard
                          key={key}
                          concept={concept}
                          gen={gen}
                          format={conceptFormat}
                          onGenerate={() =>
                            void generateConcept(
                              key,
                              concept,
                              conceptFormat,
                              isGraphicOutputFormat(conceptFormat) &&
                                textOverlayMode === "with-text"
                                ? textStyleChoice
                                : null
                            )
                          }
                          onOpen={urls =>
                            setLightbox({
                              key,
                              format: conceptFormat,
                              images: urls,
                              textOverlaySpecs: genState[key]?.textOverlaySpecs,
                            })
                          }
                          onEdit={() => {
                            const url = (genState[key]?.imageUrls ?? [])[0]
                            if (url) setEditTarget({ key, url, format: conceptFormat })
                          }}
                          disabled={
                            conceptFormat === "video"
                              ? !videoSourceUrl
                              : !referenceSelfieUrl && activeGenerationSource !== "trained-model"
                          }
                          promptAssetId={admin ? promptAssetIdFromGen(gen) : null}
                          resultActions={
                            <InlineResultActions
                              format={conceptFormat}
                              onNextFormat={(nextFormat, kind) =>
                                handleNextFormat(nextFormat, kind, latestStyleReferenceUrl)
                              }
                            />
                          }
                        />
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}

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
                        setStyleSwapOpen(false)
                      }}
                    />
                  ) : (
                    <TextStyleTemplatePicker
                      format={outputFormat}
                      onPick={style => setTextStyleChoice(style)}
                    />
                  )}
                </div>
              </div>
            )}

          {showBrandPrompt && (
            <div className="flex min-w-0 max-w-full items-end gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300 motion-reduce:animate-none">
              <Avatar src={MAYA_AVATAR} fallback={agentLabel.charAt(0)} />
              <div className="min-w-0 max-w-[calc(100%-2.25rem)] break-words rounded-[6px] rounded-tl-[2px] border border-[#C5C6C8]/60 bg-white p-4 [overflow-wrap:anywhere] sm:max-w-[88%]">
                <p className="text-[15px] leading-relaxed text-[#282728]">
                  Love that. So I can make these really yours, tell me a little about your brand:
                  what you do and who you help. 🤍
                </p>
                <textarea
                  value={brandDraft}
                  onChange={e => setBrandDraft(e.target.value)}
                  rows={2}
                  placeholder="e.g. I'm a founder coach for women starting an online business"
                  className="mt-3 w-full resize-none rounded-[4px] border border-[#C5C6C8]/60 bg-white px-3 py-2.5 text-[14px] text-[#282728] outline-none focus:border-[#0D0E10]"
                />
                <div className="mt-2 flex min-w-0 flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => void saveBrand()}
                    disabled={brandDraft.trim().length === 0}
                    className="min-h-11 rounded-[4px] bg-[#0D0E10] px-4 py-2.5 text-[11px] uppercase tracking-[0.16em] text-white disabled:opacity-40"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setBrandPromptDismissed(true)}
                    className="inline-flex min-h-11 items-center text-[11px] uppercase tracking-[0.14em] text-[#818283] hover:text-[#4F5052]"
                  >
                    Not now
                  </button>
                </div>
              </div>
            </div>
          )}

          {isThinking && (
            <div className="flex min-w-0 max-w-full items-center gap-3">
              <TypingDots />
              {!hasConcepts && (
                <span className="min-w-0 break-words text-[13px] text-[#818283] [overflow-wrap:anywhere]">
                  Maya is preparing your directions…
                </span>
              )}
            </div>
          )}

          {error && !isThinking && (
            <div className="min-w-0 max-w-full rounded-[6px] bg-[#282728]/5 px-4 py-3 [overflow-x:clip]">
              <p className="text-[13px] text-[#282728]">
                Maya hit a snag creating your directions.
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

          <div ref={threadEndRef} />
        </div>

        {/* Composer - secondary: refinement only, the happy path is the taps above. One clean
            row (the eyebrow label and the duplicate close button were eating thread space);
            bottom padding respects the iPhone home-indicator safe area. */}
        <div className="min-w-0 shrink-0 border-t border-[#C5C6C8]/40 px-4 pt-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] [overflow-x:clip] sm:px-6">
          {inspirationUrl && (
            <div className="mb-2 flex min-w-0 max-w-full items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={inspirationUrl}
                alt="Inspiration"
                className="h-9 w-9 rounded-[4px] object-cover"
              />
              <span className="min-w-0 flex-1 truncate text-[11px] text-[#818283]">
                Inspiration attached. Maya uses its style, never its face.
              </span>
              <button
                type="button"
                onClick={() => clearSlot("inspiration")}
                className="inline-flex min-h-11 shrink-0 items-center text-[11px] uppercase tracking-[0.14em] text-[#818283] underline underline-offset-2 hover:text-[#0D0E10]"
              >
                Remove
              </button>
            </div>
          )}
          <div className="flex min-w-0 max-w-full gap-2">
            <input
              ref={attachInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0]
                if (file) void handleUpload("inspiration", file)
                if (attachInputRef.current) attachInputRef.current.value = ""
              }}
            />
            <button
              type="button"
              aria-label="Attach an inspiration image"
              title="Attach an inspiration image"
              onClick={() => attachInputRef.current?.click()}
              disabled={uploadingSlot === "inspiration"}
              className="h-12 w-12 shrink-0 rounded-[4px] border border-[#C5C6C8]/60 bg-white text-[20px] font-light leading-none text-[#4F5052] hover:border-[#0D0E10] hover:text-[#0D0E10] disabled:opacity-40"
            >
              {uploadingSlot === "inspiration" ? "…" : "+"}
            </button>
            <input
              ref={composerRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  void handleSend()
                }
              }}
              placeholder={textRefining ? "Maya is updating the text…" : "Want something different? Ask Maya…"}
              className="h-12 min-w-0 flex-1 rounded-[4px] border border-[#C5C6C8]/60 bg-white px-3 text-[15px] text-[#282728] outline-none focus:border-[#0D0E10] min-[380px]:px-4"
            />
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={isThinking || textRefining || input.trim().length === 0}
              className="h-12 rounded-[4px] bg-[#0D0E10] px-3 text-[11px] uppercase tracking-[0.1em] text-white disabled:opacity-40 min-[380px]:px-5 min-[380px]:text-[12px] min-[380px]:tracking-[0.16em]"
            >
              {textRefining ? "Updating" : "Send"}
            </button>
          </div>
        </div>
      </aside>

      {lightbox && (
        <ImageLightbox
          images={lightbox.images}
          textOverlaySpecs={lightbox.textOverlaySpecs}
          bakedImageUrls={lightbox.key ? genState[lightbox.key]?.bakedImageUrls : undefined}
          onClose={() => setLightbox(null)}
        />
      )}

      <CreditModal
        open={creditModal.open}
        balance={creditModal.balance}
        onClose={() => setCreditModal({ open: false, balance: null })}
      />

      <TrialCapOffer open={trialCapOpen} onClose={() => setTrialCapOpen(false)} />

      <ReferenceLibraryModal
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        onPick={url => {
          setSelfieRestored(false) // she chose this one herself
          setReferenceSelfieUrl(url)
        }}
      />

      <ChatHistoryModal
        open={historyOpen}
        currentChatId={chatId}
        onClose={() => setHistoryOpen(false)}
        onSelect={id => void handleSelectChat(id)}
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
          onClose={() => setEditTarget(null)}
          onCreditBlock={balance => {
            setEditTarget(null)
            showCreditBlock(balance)
          }}
          onResult={newUrl =>
            setGenState(s => {
              const prev = s[editTarget.key]?.imageUrls ?? []
              return { ...s, [editTarget.key]: { status: "done", imageUrls: [newUrl, ...prev] } }
            })
          }
        />
      )}
    </div>
  )
}
