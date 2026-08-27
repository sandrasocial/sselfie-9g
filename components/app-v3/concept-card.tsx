"use client"

// SSELFIE Studio 3.0 - Concept Card (03, restyled 05A, multi-image 05D, guided 05F).
// One of the 3 directions Maya pulls. Maya-guided + tap-first: BEFORE generating it is a clean
// text card (title + one line + "Generate this") - no empty image frame that looks broken.
// While generating, a framed spinner. When done, the result (tap to open) with a confident
// success state: Use/Download primary, Regenerate secondary, "Ask Maya to tweak" tiny.

import type { ConceptCard as ConceptCardData } from "@/lib/app-v3/maya/concept-types"
import { useState, type ReactNode } from "react"
import type { OutputFormat } from "./types"
import { Spinner } from "./loading"
import type { TextOverlaySpec } from "@/lib/app-v3/text-overlay"
import { retryGeneratedImageOnce } from "./image-retry"
import { recordSuiteDownloadForReview } from "@/lib/testimonials/review-capture-client"
import { initiateAssetDownload } from "@/lib/app-v3/download-asset"
import { downloadAllSlides } from "@/lib/app-v3/download-all-slides"
import {
  getEditableConceptCopy,
  type EditableConceptCopy,
} from "@/lib/app-v3/maya/concept-copy-edit"
import { trackAnalyticsEvent } from "@/lib/analytics/client"
import { FavoriteButton } from "./favorite-button"

export type ConceptGenStatus = "idle" | "generating" | "done" | "error"

export interface ConceptGenState {
  status: ConceptGenStatus
  imageUrls?: string[]
  textOverlaySpecs?: TextOverlaySpec[]
  textOverlayMode?: "with-text" | "without-text"
  /**
   * Per-image baked text renders, index-aligned with imageUrls. The clean base in imageUrls is
   * the source of truth and is never overwritten. We no longer render CSS text fallback on
   * customer results; if a bake is missing, she sees the clean image and the copyable words.
   */
  bakedImageUrls?: Array<string | null>
  /** Persisted gallery ids for baked variants, index-aligned with bakedImageUrls. */
  bakedAiImageIds?: Array<number | null>
  autoBakeSkipped?: string | null
  aiImageId?: number | null
  aiImageIds?: Array<number | null>
  videoUrl?: string
  /** Canonical generated_videos asset id, e.g. video_123. */
  videoAssetId?: string | null
  error?: string
  /** Progressive partial frame (data URL) while streaming - the photo "develops" in place. */
  previewUrl?: string
  /** Durable correlation for a paid OpenAI request whose browser response may be interrupted. */
  pendingRequest?: {
    clientRequestId: string
    startedAt: number
    format: OutputFormat
    expectedCount: number
  }
  /** Durable receipt for a finished result already placed in Calendar. Keeping it with the
   *  generated result prevents a reload from offering the same placement twice. */
  calendarPlacement?: {
    scheduledAt: string
    position?: number
    caption?: string | null
  }
  /** Ready-to-publish copy created in Maya without adding the asset to Feed Planner. */
  finishedPost?: {
    caption?: string | null
  }
}

interface ConceptCardProps {
  concept: ConceptCardData
  gen: ConceptGenState
  format: OutputFormat
  /** Called with her edited baked-text words (if this concept has any and she touched them),
   *  so the caller can bake exactly what she approved instead of Maya's original draft. */
  onGenerate: (editedCopy?: EditableConceptCopy[]) => void
  /** Open the finished image(s) fullscreen (carousels pass all slides). startIndex jumps
   *  straight to the tapped thumbnail instead of always opening at slide 1. */
  onOpen?: (imageUrls: string[], startIndex?: number) => void
  /** Open true Edit Mode on the finished image. */
  onEdit?: () => void
  /** Feed Planner Phase 2c: Maya saves this photo to the member's content calendar herself,
   *  picking the slot - resolves with the day it landed on for the confirmation label.
   *  "forbidden" = this plan has no Calendar (403); the action and offer hide themselves. */
  onAddToCalendar?: () => Promise<
    { scheduledAt: string; position?: number; caption?: string | null } | "forbidden" | null
  >
  /** Completes the post inside Maya. This must not create or update Calendar rows. */
  onFinishPost?: () => Promise<{ caption?: string | null } | null>
  /** Explicitly persists the exact finished visual + caption as one ready post. Caption creation
   *  alone never calls this; the member must choose the save action. */
  onSaveReadyPost?: (
    finishedCaption: string
  ) => Promise<
    { scheduledAt: string; position?: number; caption?: string | null } | "forbidden" | null
  >
  onOpenReadyPost?: () => void
  initialCalendarPlacement?: {
    scheduledAt: string
    position?: number
    caption?: string | null
  } | null
  initialFinishedPost?: {
    caption?: string | null
  } | null
  /** Show Maya's spoken save-offer line above the actions. The concierge passes true for the
   *  FIRST finished photo only, so a 3-card batch doesn't repeat the same sentence 3 times -
   *  the "Add to calendar" button itself stays on every eligible card. */
  /** Retained for callers; the plan action now always renders in the open (UX audit U1). */
  showCalendarOffer?: boolean
  /** Replaces the single idle button when a guided picker should own the next step. */
  idleAction?: ReactNode
  /** Extra guided next steps after a result is created. */
  resultActions?: ReactNode
  /** Retry a failed/missing baked-text pass from the clean result. */
  onRetryText?: () => Promise<void>
  /** Admin-only prompt inspector asset id, e.g. ai_123. */
  promptAssetId?: string | null
  /** Small editorial label above the concept title. */
  eyebrow?: string
  /** Image-led reference used while this is still a direction choice, before generation. */
  directionImageUrl?: string | null
  /** Human-readable position in the direction strip. */
  directionIndex?: number
  /** Fires only after a browser download has been initiated. */
  onDownloaded?: () => void
  disabled?: boolean
  /** Why the create button is disabled — always shown with it so a tap never looks dead. */
  disabledReason?: string | null
}

const FRAME_ASPECT: Record<OutputFormat, string> = {
  photo: "aspect-[4/5]",
  photoshoot: "aspect-[4/5]",
  "reel-cover": "aspect-[9/16]",
  "story-slide": "aspect-[9/16]",
  "story-sequence": "aspect-[9/16]",
  carousel: "aspect-[4/5]",
  video: "aspect-[9/16]",
}

const CREATING_LABEL: Record<OutputFormat, string> = {
  photo: "Maya is creating your photo…",
  photoshoot: "Maya is creating your shoot…",
  "reel-cover": "Maya is creating your Reel cover…",
  carousel: "Maya is creating your carousel…",
  "story-slide": "Maya is creating your Story…",
  "story-sequence": "Maya is creating your Stories…",
  video: "Maya is creating your motion…",
}

function buildSuggestedTextCopy(specs: TextOverlaySpec[] | undefined): string {
  if (!specs?.length) return ""
  return specs
    .map((spec, index) => {
      const lines = [spec.headline, spec.subline].filter(Boolean)
      if (lines.length === 0) return ""
      return specs.length > 1 ? `Slide ${index + 1}\n${lines.join("\n")}` : lines.join("\n")
    })
    .filter(Boolean)
    .join("\n\n")
}

export function ConceptCard({
  // NOSONAR -- legacy result-state renderer; decomposition is outside this narrow production fix.
  concept,
  gen,
  format,
  onGenerate,
  onOpen,
  onEdit,
  onAddToCalendar,
  onFinishPost,
  onSaveReadyPost,
  onOpenReadyPost,
  initialCalendarPlacement = null,
  initialFinishedPost = null,
  showCalendarOffer = true,
  idleAction,
  resultActions,
  onRetryText,
  promptAssetId,
  eyebrow = "Maya's idea",
  directionImageUrl = null,
  directionIndex = 1,
  onDownloaded,
  disabled,
  disabledReason,
}: ConceptCardProps) {
  const plannedOutputs = concept.brief.graphic?.creativePlan?.outputs?.length ?? 0
  const plannedSlides = concept.brief.graphic?.slides?.length ?? 0
  const declaredSlides = concept.brief.graphic?.slideCount ?? 0
  const estimatedCredits = Math.max(1, plannedOutputs, plannedSlides, declaredSlides)
  const isGenerating = gen.status === "generating"
  const images = gen.imageUrls ?? []
  const videoUrl = gen.videoUrl
  const isDone = gen.status === "done" && images.length > 0
  const isVideoDone = gen.status === "done" && !!videoUrl
  const isCarousel = images.length > 1
  const isDirectionChoice = Boolean(
    directionImageUrl && !isGenerating && !isDone && !isVideoDone && gen.status !== "error"
  )
  // MAYA-COPY-PREVIEW-01: the exact words Maya is about to bake, editable before she spends
  // a credit generating them. Seeded once per concept (a new concept.id remounts this card
  // fresh via the parent's key={key}), so her edits survive re-renders but never leak
  // between different concepts.
  const originalCopy = useState(() => getEditableConceptCopy(concept.brief, format))[0]
  const [editedCopy, setEditedCopy] = useState(originalCopy)
  const hasEditableCopy = originalCopy.length > 0
  const copyIsDirty = editedCopy.some(
    (entry, i) => entry.heading !== originalCopy[i]?.heading || entry.body !== originalCopy[i]?.body
  )
  const firstOverlay = gen.textOverlaySpecs?.[0] ?? null
  // A baked render (text in the pixels) wins the card; the clean base stays kept underneath.
  const firstBaked = gen.bakedImageUrls?.[0] ?? null
  const firstCleanAssetId = gen.aiImageIds?.[0] ?? gen.aiImageId ?? null
  const firstDownloadAssetId = firstBaked ? (gen.bakedAiImageIds?.[0] ?? null) : firstCleanAssetId
  const suggestedText = buildSuggestedTextCopy(gen.textOverlaySpecs)
  const [copiedText, setCopiedText] = useState(false)
  const [copyError, setCopyError] = useState(false)
  const [downloadStatus, setDownloadStatus] = useState<"idle" | "downloading" | "error">("idle")
  const [bulkDownloadStatus, setBulkDownloadStatus] = useState<"idle" | "downloading" | "error">(
    "idle"
  )
  const [calendarStatus, setCalendarStatus] = useState<
    "idle" | "saving" | "saved" | "error" | "unavailable"
  >(initialCalendarPlacement ? "saved" : "idle")
  const [finishStatus, setFinishStatus] = useState<"idle" | "finishing" | "finished" | "error">(
    initialFinishedPost ? "finished" : "idle"
  )
  let carouselFinishLabel = "Finish as a post"
  if (finishStatus === "finishing") carouselFinishLabel = "Finishing…"
  if (finishStatus === "error") carouselFinishLabel = "Try finishing again"
  let displayEyebrow = eyebrow
  if (eyebrow === "Maya recommends") displayEyebrow = "Maya's pick"
  if (eyebrow === "Another direction") displayEyebrow = "Also worth trying"
  const [finishedCaption, setFinishedCaption] = useState<string | null>(
    initialFinishedPost?.caption?.trim() || null
  )
  const [finishedCaptionCopied, setFinishedCaptionCopied] = useState(false)
  const [readyPostStatus, setReadyPostStatus] = useState<
    "idle" | "saving" | "saved" | "error" | "unavailable"
  >(initialCalendarPlacement && onSaveReadyPost ? "saved" : "idle")
  const [readyPostReceipt, setReadyPostReceipt] = useState<{
    scheduledAt: string
    position?: number
    caption?: string | null
  } | null>(initialCalendarPlacement && onSaveReadyPost ? initialCalendarPlacement : null)
  const [readinessAnswer, setReadinessAnswer] = useState<"yes" | "almost" | "no" | null>(null)
  const [savedDateLabel, setSavedDateLabel] = useState<string | null>(() => {
    if (!initialCalendarPlacement) return null
    const date = new Date(initialCalendarPlacement.scheduledAt)
    return Number.isNaN(date.getTime())
      ? null
      : date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
  })
  // The plan slot's caption comes back from the placement call — showing it here is what
  // turns "7 images saved" into a publishable post (UX audit U1).
  const [savedCaption, setSavedCaption] = useState<string | null>(
    initialCalendarPlacement?.caption?.trim() || null
  )
  const [savedPosition, setSavedPosition] = useState<number | null>(
    initialCalendarPlacement?.position ?? null
  )
  const [captionCopied, setCaptionCopied] = useState(false)
  const [textRetryStatus, setTextRetryStatus] = useState<"idle" | "retrying" | "error">("idle")
  const handleRetryText = async () => {
    if (!onRetryText || textRetryStatus === "retrying") return
    setTextRetryStatus("retrying")
    try {
      await onRetryText()
      setTextRetryStatus("idle")
    } catch {
      setTextRetryStatus("error")
    }
  }

  const updateCopyField = (index: number, field: "heading" | "body", value: string) => {
    setEditedCopy(current =>
      current.map(entry => (entry.index === index ? { ...entry, [field]: value } : entry))
    )
  }

  const handleAddToCalendar = async () => {
    if (!onAddToCalendar || calendarStatus === "saving" || calendarStatus === "saved") return
    setCalendarStatus("saving")
    try {
      const result = await onAddToCalendar()
      if (result === "forbidden") {
        // Her plan doesn't include the calendar - hide the whole affordance, don't tease it.
        setCalendarStatus("unavailable")
        return
      }
      if (!result) throw new Error("no result")
      const date = new Date(result.scheduledAt)
      setSavedDateLabel(
        Number.isNaN(date.getTime())
          ? null
          : date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
      )
      setSavedCaption(result.caption?.trim() ? result.caption : null)
      setSavedPosition(typeof result.position === "number" ? result.position : null)
      setCalendarStatus("saved")
    } catch {
      setCalendarStatus("error")
    }
  }
  const handleFinishPost = async () => {
    if (!onFinishPost || finishStatus === "finishing" || finishStatus === "finished") return
    setFinishStatus("finishing")
    try {
      const result = await onFinishPost()
      if (!result) throw new Error("no result")
      setFinishedCaption(result.caption?.trim() || null)
      setFinishStatus("finished")
    } catch {
      setFinishStatus("error")
    }
  }
  const handleSaveReadyPost = async () => {
    if (
      !onSaveReadyPost ||
      !finishedCaption ||
      readyPostStatus === "saving" ||
      readyPostStatus === "saved"
    )
      return
    setReadyPostStatus("saving")
    try {
      const result = await onSaveReadyPost(finishedCaption)
      if (result === "forbidden") {
        setReadyPostStatus("unavailable")
        return
      }
      if (!result) throw new Error("no result")
      setReadyPostReceipt(result)
      setReadyPostStatus("saved")
    } catch {
      setReadyPostStatus("error")
    }
  }
  const postFinishAvailable = !!onFinishPost
  const calendarAvailable = !!onAddToCalendar && calendarStatus !== "unavailable"
  const requestedBakedText = gen.textOverlayMode === "with-text"
  const hasAnyBakedText = Boolean(gen.bakedImageUrls?.some(Boolean))
  const bakeMissing = requestedBakedText && Boolean(firstOverlay) && !hasAnyBakedText

  function ratePostReadiness(answer: "yes" | "almost" | "no") {
    if (readinessAnswer) return
    setReadinessAnswer(answer)
    try {
      void Promise.resolve(
        trackAnalyticsEvent({
          event: "suite_post_readiness_rated",
          properties: { format, answer },
        })
      ).catch(() => undefined)
    } catch {
      // Feedback is best effort and must never interrupt a finished post.
    }
  }

  async function handleDownloadPhoto() {
    if (!images[0] || downloadStatus === "downloading") return
    setDownloadStatus("downloading")
    const started = await initiateAssetDownload(
      firstBaked ?? images[0],
      `sselfie-${firstDownloadAssetId ?? "photo"}.png`
    )
    if (!started) {
      setDownloadStatus("error")
      return
    }
    setDownloadStatus("idle")
    void recordSuiteDownloadForReview({
      source: "concept-card",
      format,
      assetId: firstDownloadAssetId,
    })
    onDownloaded?.()
  }

  return (
    <div
      data-concept-state={gen.status}
      data-concept-format={format}
      data-direction-choice={isDirectionChoice ? "true" : undefined}
      className="suite-concept-card min-w-0 max-w-full overflow-hidden rounded-[2px] border border-[#C5C6C8]/35 bg-white transition-colors duration-200 [overflow-x:clip]"
    >
      {/* Visual area ONLY exists once we're generating or done - never an empty placeholder box. */}
      {(isGenerating || isDone || isVideoDone || isDirectionChoice) && (
        <div
          className={`suite-concept-visual relative w-full bg-[#F1F2F2] ${isDirectionChoice ? "aspect-[4/3]" : FRAME_ASPECT[format]} ${isDone || isVideoDone ? "suite-concept-result-preview max-h-[min(62dvh,34rem)] sm:max-h-none" : ""} ${
            isGenerating && !gen.previewUrl ? "animate-pulse motion-reduce:animate-none" : ""
          }`}
        >
          {isVideoDone ? (
            <video
              src={videoUrl}
              controls
              playsInline
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : isDone /* NOSONAR -- mutually exclusive legacy media states are intentionally rendered together. */ ? (
            <button
              type="button"
              onClick={() => onOpen?.(images)}
              className="group absolute inset-0 cursor-zoom-in"
              aria-label="View full size"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={firstBaked ?? images[0]}
                alt={concept.title}
                decoding="async"
                onError={retryGeneratedImageOnce}
                className="absolute inset-0 h-full w-full object-contain transition-transform duration-300 group-hover:scale-[1.02]"
              />
              {isCarousel && (
                <span className="absolute left-0 top-0 bg-[#050505] px-3 py-2 text-[9px] uppercase tracking-[0.18em] text-white">
                  {images.length} slides
                </span>
              )}
              <span className="absolute bottom-0 right-0 bg-[#050505] px-3 py-2 text-[9px] uppercase tracking-[0.18em] text-white opacity-0 transition-opacity group-hover:opacity-100">
                {isCarousel ? "Swipe" : "View"}
              </span>
            </button>
          ) : gen.previewUrl ? (
            <div className="absolute inset-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={gen.previewUrl}
                alt="Developing preview"
                decoding="async"
                className="h-full w-full object-cover opacity-95"
              />
              <span className="absolute bottom-0 left-0 bg-[#050505] px-3 py-2 text-[9px] uppercase tracking-[0.18em] text-white">
                Developing…
              </span>
            </div>
          ) : isDirectionChoice && directionImageUrl ? (
            <button
              type="button"
              onClick={() => onGenerate(hasEditableCopy ? editedCopy : undefined)}
              disabled={disabled}
              aria-label={`Choose direction ${directionIndex}: ${concept.title}`}
              className="group absolute inset-0 text-left disabled:cursor-not-allowed disabled:opacity-45"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={directionImageUrl}
                alt=""
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover grayscale-[18%] transition-[filter,transform] duration-300 group-hover:grayscale-0 group-hover:scale-[1.015] motion-reduce:transition-none"
              />
              <span className="absolute inset-x-0 bottom-0 flex min-h-11 items-center justify-between gap-3 bg-[#050505] px-3 py-2 text-white">
                <span className="min-w-0 truncate text-[10px] uppercase tracking-[0.16em]">
                  {concept.title}
                </span>
                <span aria-hidden className="shrink-0 text-[15px]">
                  →
                </span>
              </span>
            </button>
          ) : (
            <div
              role="status"
              aria-live="polite"
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-5 text-center"
            >
              <Spinner className="h-7 w-7" />
              <p className="text-[11px] uppercase tracking-[0.18em] text-[#6D6E70]">
                {CREATING_LABEL[format]}
              </p>
            </div>
          )}
        </div>
      )}

      {isDone && !isCarousel && !isVideoDone ? (
        <div
          className="suite-concept-result-rail grid divide-x divide-white/20 bg-[#050505] text-white"
          style={{
            gridTemplateColumns: `repeat(${1 + (onEdit ? 1 : 0) + (postFinishAvailable ? 1 : 0)}, minmax(0, 1fr))`,
          }}
        >
          {onEdit ? (
            <button
              type="button"
              onClick={onEdit}
              className="min-h-12 px-2 py-3 text-[9px] uppercase tracking-[0.12em] transition-colors hover:bg-white hover:text-[#050505] sm:text-[10px] sm:tracking-[0.16em]"
            >
              Edit photo
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => void handleDownloadPhoto()}
            disabled={downloadStatus === "downloading"}
            className="min-h-12 px-2 py-3 text-[9px] uppercase tracking-[0.12em] transition-colors hover:bg-white hover:text-[#050505] disabled:opacity-50 sm:text-[10px] sm:tracking-[0.16em]"
          >
            {downloadStatus === "downloading" ? "Preparing…" : "Download"}
          </button>
          {postFinishAvailable ? (
            <button
              type="button"
              onClick={handleFinishPost}
              disabled={finishStatus === "finishing" || finishStatus === "finished"}
              className="min-h-12 px-2 py-3 text-[9px] uppercase tracking-[0.12em] transition-colors hover:bg-[color:var(--suite-accent)] disabled:opacity-60 sm:text-[10px] sm:tracking-[0.16em]"
            >
              {finishStatus === "finishing"
                ? "Finishing…"
                : finishStatus === "finished"
                  ? "Post ready"
                  : finishStatus === "error"
                    ? "Try again"
                    : "Finish as a post"}
            </button>
          ) : null}
        </div>
      ) : null}

      {/* Jump straight to any slide instead of only seeing the cover, or opening fullscreen
          and arrowing through them one at a time. */}
      {isDone && isCarousel && (
        <div className="flex gap-1.5 overflow-x-auto border-b border-[#C5C6C8]/35 bg-[#F8FAFA] p-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {images.map((thumbUrl, thumbIndex) => (
            <button
              key={`${thumbUrl}-${thumbIndex}`}
              type="button"
              onClick={() => onOpen?.(images, thumbIndex)}
              aria-label={`View slide ${thumbIndex + 1} of ${images.length}`}
              className="relative h-14 w-11 shrink-0 overflow-hidden rounded-[4px] transition-opacity hover:opacity-80"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={gen.bakedImageUrls?.[thumbIndex] ?? thumbUrl}
                alt=""
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <span className="absolute bottom-0.5 right-1 text-[9px] font-medium text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.8)]">
                {thumbIndex + 1}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Copy + action */}
      <div
        className={`suite-concept-body min-w-0 space-y-3 ${isDirectionChoice ? "p-3" : "p-4 sm:p-5"}`}
      >
        <div className="min-w-0 break-words [overflow-wrap:anywhere]">
          {isDirectionChoice ? (
            <p className="line-clamp-2 text-[11px] leading-[1.45] text-[#4F5052]">
              {concept.description}
            </p>
          ) : (
            <>
              <p className="suite-concept-eyebrow text-[10px] uppercase tracking-[0.22em] text-[#6D6E70]">
                {displayEyebrow}
              </p>
              <h4 className="mt-1.5 font-serif text-[21px] font-light leading-tight text-[#0D0E10]">
                {concept.title}
              </h4>
              <p className="mt-1.5 text-[13px] leading-relaxed text-[#4F5052]">
                {concept.description}
              </p>
            </>
          )}
        </div>

        {gen.status === "error" && !idleAction && (
          <p
            role="alert"
            className="break-words rounded-[4px] bg-[#282728]/5 px-3 py-2 text-[12px] text-[#282728] [overflow-wrap:anywhere]"
          >
            {gen.error || "That one didn't go through. Try again."}
          </p>
        )}

        {/* MAYA-COPY-PREVIEW-01: the exact words about to bake, before a credit is spent.
            Only while idle - once a slide exists the words are already fixed in the pixels. */}
        {!isDirectionChoice && !isDone && !isVideoDone && hasEditableCopy && (
          <div className="space-y-2.5 rounded-[10px] border border-[#C5C6C8]/50 bg-[#F8FAFA] p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#6D6E70]">
                {editedCopy.length > 1 ? "The words on each slide" : "The words on this cover"}
              </p>
              {copyIsDirty && (
                <button
                  type="button"
                  onClick={() => setEditedCopy(originalCopy)}
                  className="shrink-0 text-[10px] uppercase tracking-[0.14em] text-[#4F5052] underline underline-offset-2 hover:text-[#0D0E10]"
                >
                  Reset to Maya&apos;s words
                </button>
              )}
            </div>
            <p className="text-[12px] leading-relaxed text-[#6D6E70]">
              These exact words get printed on the images. Edit them here, or just tell Maya what to
              change.
            </p>
            <div className="space-y-3">
              {editedCopy.map(entry => (
                <div key={entry.index} className="space-y-1.5">
                  {editedCopy.length > 1 && (
                    <p className="text-[10px] uppercase tracking-[0.14em] text-[#9A9B9D]">
                      Slide {entry.index + 1}
                    </p>
                  )}
                  <input
                    type="text"
                    value={entry.heading}
                    onChange={e => updateCopyField(entry.index, "heading", e.target.value)}
                    onFocus={e => e.currentTarget.scrollIntoView({ block: "center" })}
                    disabled={disabled || isGenerating}
                    aria-label={
                      editedCopy.length > 1 ? `Slide ${entry.index + 1} headline` : "Headline"
                    }
                    placeholder="Headline"
                    autoComplete="off"
                    autoCapitalize="sentences"
                    name={`concept-copy-heading-${entry.index}`}
                    data-lpignore="true"
                    data-1p-ignore="true"
                    // 16px+ is required on iOS Safari: any input under 16px triggers the
                    // browser's own auto-zoom on focus, which is what threw this whole card's
                    // layout (Sandra's live report, 2026-07-20 - a nested input inside this
                    // scrollable thread, itself inside a position:fixed drawer, is exactly the
                    // input shape iOS mis-zooms hardest on).
                    className="w-full rounded-[6px] border border-[#C5C6C8]/70 bg-white px-3 py-2 font-serif text-[16px] leading-snug text-[#0D0E10] focus:border-[#0D0E10] focus:outline-none disabled:opacity-60"
                  />
                  <textarea
                    value={entry.body}
                    onChange={e => updateCopyField(entry.index, "body", e.target.value)}
                    onFocus={e => e.currentTarget.scrollIntoView({ block: "center" })}
                    disabled={disabled || isGenerating}
                    aria-label={
                      editedCopy.length > 1
                        ? `Slide ${entry.index + 1} supporting line`
                        : "Supporting line"
                    }
                    placeholder="Supporting line (optional)"
                    rows={1}
                    autoComplete="off"
                    autoCapitalize="sentences"
                    name={`concept-copy-body-${entry.index}`}
                    data-lpignore="true"
                    data-1p-ignore="true"
                    className="w-full resize-none rounded-[6px] border border-[#C5C6C8]/50 bg-white px-3 py-1.5 text-[16px] leading-relaxed text-[#4F5052] focus:border-[#0D0E10] focus:outline-none disabled:opacity-60"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {isDirectionChoice ? null : isDone ||
          isVideoDone /* NOSONAR -- legacy result-state rendering remains scoped to this card. */ ? (
          <div className="space-y-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[#6D6E70]">
              {isVideoDone ? "Saved to your videos" : "Saved to your gallery"}
            </p>
            {postFinishAvailable && isCarousel && finishStatus !== "finished" ? (
              <button
                type="button"
                onClick={handleFinishPost}
                disabled={finishStatus === "finishing"}
                className="min-h-12 w-full rounded-[8px] bg-[#0D0E10] px-5 py-3.5 text-[11px] uppercase tracking-[0.16em] text-white transition-colors hover:bg-[#282728] disabled:opacity-50"
              >
                {carouselFinishLabel}
              </button>
            ) : null}
            {bakeMissing && (
              <div className="rounded-[4px] bg-[#282728]/5 px-3 py-2 text-[12px] leading-relaxed text-[#4F5052]">
                <p>
                  The clean image is ready. The text did not bake into this one, so Maya left the
                  words below for you to copy or try again.
                </p>
                {onRetryText && (
                  <button
                    type="button"
                    onClick={() => void handleRetryText()}
                    disabled={textRetryStatus === "retrying"}
                    className="mt-2 inline-flex min-h-11 items-center text-[11px] uppercase tracking-[0.14em] text-[#0D0E10] underline underline-offset-2 disabled:opacity-50"
                  >
                    {textRetryStatus === "retrying" ? "Adding text…" : "Try text again"}
                  </button>
                )}
                {textRetryStatus === "error" && (
                  <p className="mt-1 text-[11px] text-[#4F5052]">
                    The text still didn&apos;t go through. Your clean image is safe.
                  </p>
                )}
              </div>
            )}
            {suggestedText && (
              <div className="rounded-[10px] border border-[#C5C6C8]/50 bg-[#F8FAFA] p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-[#6D6E70]">
                    Maya&apos;s suggested text
                  </p>
                  <button
                    type="button"
                    onClick={async () => {
                      setCopyError(false)
                      try {
                        if (!navigator.clipboard) throw new Error("Clipboard unavailable")
                        await navigator.clipboard.writeText(suggestedText)
                        setCopiedText(true)
                        window.setTimeout(() => setCopiedText(false), 1800)
                      } catch {
                        setCopyError(true)
                      }
                    }}
                    className="inline-flex min-h-11 items-center text-[10px] uppercase tracking-[0.14em] text-[#4F5052] underline underline-offset-2 hover:text-[#0D0E10]"
                  >
                    {copiedText ? "Copied" : "Copy"}
                  </button>
                </div>
                <pre className="mt-2 whitespace-pre-wrap break-words font-sans text-[12px] leading-relaxed text-[#282728] [overflow-wrap:anywhere]">
                  {suggestedText}
                </pre>
                {copyError && (
                  <p role="alert" className="mt-2 text-[11px] text-[#4F5052]">
                    Copy did not work. Press and hold the text to copy it.
                  </p>
                )}
              </div>
            )}
            {/* The membership promise ends at a usable post. Finishing creates the caption here
                in Maya; it never creates a hidden Feed Planner slot. */}
            {postFinishAvailable &&
              !isVideoDone &&
              (finishStatus === "finished" ? (
                <div className="rounded-[10px] border border-[#C5C6C8]/50 bg-[#F8FAFA] p-3">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-[#6D6E70]">
                    Post ready
                  </p>
                  {finishedCaption ? (
                    <>
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <p className="text-[10px] uppercase tracking-[0.18em] text-[#6D6E70]">
                          Your caption
                        </p>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              if (!navigator.clipboard) throw new Error("Clipboard unavailable")
                              await navigator.clipboard.writeText(finishedCaption)
                              setFinishedCaptionCopied(true)
                              window.setTimeout(() => setFinishedCaptionCopied(false), 1800)
                            } catch {
                              // Press-and-hold fallback remains available on the text itself.
                            }
                          }}
                          className="inline-flex min-h-11 items-center text-[10px] uppercase tracking-[0.14em] text-[#4F5052] underline underline-offset-2 hover:text-[#0D0E10]"
                        >
                          {finishedCaptionCopied ? "Copied" : "Copy caption"}
                        </button>
                      </div>
                      <pre className="mt-1 max-h-40 overflow-y-auto whitespace-pre-wrap break-words font-sans text-[12px] leading-relaxed text-[#282728] [overflow-wrap:anywhere]">
                        {finishedCaption}
                      </pre>
                    </>
                  ) : (
                    <p className="mt-1 text-[12px] leading-relaxed text-[#4F5052]">
                      Your visual is ready. Ask Maya to help shape the words if you want a caption.
                    </p>
                  )}
                  {finishedCaption &&
                    onSaveReadyPost &&
                    readyPostStatus !== "unavailable" &&
                    (readyPostStatus === "saved" && readyPostReceipt ? (
                      <div className="mt-3 border-t border-[#C5C6C8]/50 pt-3">
                        <p className="text-[12px] font-medium text-[#0D0E10]">
                          Ready in Calendar
                          {typeof readyPostReceipt.position === "number"
                            ? ` · Post ${readyPostReceipt.position}`
                            : ""}
                          {readyPostReceipt.scheduledAt
                            ? ` · ${new Date(`${readyPostReceipt.scheduledAt}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                            : ""}
                        </p>
                        {onOpenReadyPost && (
                          <button
                            type="button"
                            onClick={onOpenReadyPost}
                            className="mt-2 inline-flex min-h-11 items-center text-[10px] uppercase tracking-[0.14em] text-[#4F5052] underline underline-offset-2 hover:text-[#0D0E10]"
                          >
                            Open Calendar
                          </button>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void handleSaveReadyPost()}
                        disabled={readyPostStatus === "saving"}
                        className="mt-3 inline-flex min-h-12 w-full items-center justify-center rounded-[8px] bg-[#0D0E10] px-5 py-3.5 text-center text-[11px] uppercase tracking-[0.16em] text-white transition-colors hover:bg-[#282728] disabled:opacity-50"
                      >
                        {readyPostStatus === "saving"
                          ? "Saving your ready post…"
                          : readyPostStatus === "error"
                            ? "Try saving this ready post again"
                            : "Save as ready post"}
                      </button>
                    ))}
                </div>
              ) : null)}
            {finishStatus === "finished" &&
              !isVideoDone &&
              (!onSaveReadyPost || readyPostStatus === "saved") && (
                <div className="rounded-[10px] border border-[#C5C6C8]/50 bg-white p-3">
                  {readinessAnswer ? (
                    <p className="text-[12px] leading-relaxed text-[#4F5052]">
                      Thank you — this helps Maya improve.
                    </p>
                  ) : (
                    <>
                      <p className="text-[13px] font-medium text-[#0D0E10]">Would you post this?</p>
                      <div className="mt-2 grid grid-cols-3 gap-2">
                        {(
                          [
                            ["yes", "Yes"],
                            ["almost", "Almost"],
                            ["no", "No"],
                          ] as const
                        ).map(([answer, label]) => (
                          <button
                            key={answer}
                            type="button"
                            onClick={() => ratePostReadiness(answer)}
                            className="min-h-11 rounded-[8px] border border-[#C5C6C8]/70 px-3 py-2 text-[12px] text-[#4F5052] transition-colors hover:border-[#0D0E10] hover:text-[#0D0E10]"
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            {/* Calendar placement remains explicit only when Maya was opened from an existing
                Calendar post. It is not part of the normal creation journey. */}
            {calendarAvailable &&
              !isVideoDone &&
              (calendarStatus === "saved" ? (
                <div className="rounded-[10px] border border-[#C5C6C8]/50 bg-[#F8FAFA] p-3">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-[#6D6E70]">
                    Added to calendar
                    {savedPosition ? ` · Post ${savedPosition}` : ""}
                    {savedDateLabel ? ` · ${savedDateLabel}` : ""}
                  </p>
                  {savedCaption ? (
                    <>
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <p className="text-[10px] uppercase tracking-[0.18em] text-[#6D6E70]">
                          Your caption
                        </p>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              if (!navigator.clipboard) throw new Error("Clipboard unavailable")
                              await navigator.clipboard.writeText(savedCaption)
                              setCaptionCopied(true)
                              window.setTimeout(() => setCaptionCopied(false), 1800)
                            } catch {
                              // Press-and-hold fallback is always available on the text itself.
                            }
                          }}
                          className="inline-flex min-h-11 items-center text-[10px] uppercase tracking-[0.14em] text-[#4F5052] underline underline-offset-2 hover:text-[#0D0E10]"
                        >
                          {captionCopied ? "Copied" : "Copy caption"}
                        </button>
                      </div>
                      <pre className="mt-1 max-h-40 overflow-y-auto whitespace-pre-wrap break-words font-sans text-[12px] leading-relaxed text-[#282728] [overflow-wrap:anywhere]">
                        {savedCaption}
                      </pre>
                    </>
                  ) : (
                    <p className="mt-1 text-[12px] leading-relaxed text-[#4F5052]">
                      Your image is placed in your plan. Open it when you want to shape the caption.
                    </p>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleAddToCalendar}
                  disabled={calendarStatus === "saving"}
                  className="inline-flex min-h-12 w-full items-center justify-center rounded-[8px] bg-[#0D0E10] px-5 py-3.5 text-center text-[11px] uppercase tracking-[0.16em] text-white transition-colors hover:bg-[#282728] disabled:opacity-50"
                >
                  {calendarStatus === "saving"
                    ? "Adding to calendar…"
                    : calendarStatus === "error"
                      ? "Try adding to calendar again"
                      : "Add to calendar"}
                </button>
              ))}
            <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2 min-[380px]:gap-3">
              {!isVideoDone && firstDownloadAssetId ? (
                <FavoriteButton assetId={firstDownloadAssetId} />
              ) : null}
              {isVideoDone ? (
                <button
                  type="button"
                  onClick={async () => {
                    setDownloadStatus("downloading")
                    const started = await initiateAssetDownload(
                      videoUrl,
                      `sselfie-${gen.videoAssetId ?? "video"}.mp4`
                    )
                    if (!started) {
                      setDownloadStatus("error")
                      return
                    }
                    setDownloadStatus("idle")
                    void recordSuiteDownloadForReview({
                      source: "concept-card",
                      format: "video",
                      assetId: gen.videoAssetId ?? null,
                    })
                    onDownloaded?.()
                  }}
                  disabled={downloadStatus === "downloading"}
                  className="inline-flex min-h-11 items-center justify-center rounded-[8px] px-3 py-3 text-center text-[11px] uppercase tracking-[0.14em] text-[#4F5052] underline underline-offset-4 disabled:opacity-50"
                >
                  {downloadStatus === "downloading" ? "Preparing…" : "Download video"}
                </button>
              ) : isCarousel ? (
                <>
                  <button
                    type="button"
                    onClick={() => onOpen?.(images)}
                    className="inline-flex min-h-11 items-center justify-center rounded-[8px] border border-[#0D0E10] bg-white px-4 py-3 text-center text-[11px] uppercase tracking-[0.14em] text-[#0D0E10] transition-colors hover:bg-[#F1F2F2]"
                  >
                    View all slides
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (bulkDownloadStatus === "downloading") return
                      setBulkDownloadStatus("downloading")
                      const allUrls = images.map((imgUrl, i) => gen.bakedImageUrls?.[i] ?? imgUrl)
                      const started = await downloadAllSlides(allUrls, concept.title)
                      if (!started) {
                        setBulkDownloadStatus("error")
                        return
                      }
                      setBulkDownloadStatus("idle")
                      void recordSuiteDownloadForReview({
                        source: "concept-card",
                        assetId: null,
                        format,
                      })
                      onDownloaded?.()
                    }}
                    disabled={bulkDownloadStatus === "downloading"}
                    className="inline-flex min-h-11 items-center justify-center rounded-[8px] px-3 py-3 text-center text-[11px] uppercase tracking-[0.14em] text-[#4F5052] underline underline-offset-4 disabled:opacity-50"
                  >
                    {bulkDownloadStatus === "downloading"
                      ? "Preparing…"
                      : `Download all ${images.length}`}
                  </button>
                </>
              ) : null}
            </div>
            {downloadStatus === "error" && (
              <p role="alert" className="text-[12px] text-[#4F5052]">
                Download did not start. Please try again.
              </p>
            )}
            {bulkDownloadStatus === "error" && (
              <p role="alert" className="text-[12px] text-[#4F5052]">
                Some photos didn&apos;t save. Please try again.
              </p>
            )}
            {finishStatus === "finished" ? resultActions : null}
            {promptAssetId && !isVideoDone ? (
              <details className="group border-y border-[#C5C6C8]/55 bg-white">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-3.5 text-[11px] uppercase tracking-[0.14em] text-[#4F5052] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0D0E10]">
                  Details
                  <span aria-hidden className="text-[16px] font-light group-open:rotate-45">
                    +
                  </span>
                </summary>
                <div className="flex flex-wrap gap-2 border-t border-[#C5C6C8]/45 p-3">
                  <a
                    href={`/api/admin/app-v3/generation-prompt?id=${encodeURIComponent(promptAssetId)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-11 items-center rounded-[6px] border border-[#C5C6C8] px-3.5 text-[11px] uppercase tracking-[0.12em] text-[#4F5052] hover:border-[#0D0E10]"
                  >
                    View prompt
                  </a>
                </div>
              </details>
            ) : null}
          </div>
        ) : idleAction ? (
          idleAction
        ) : (
          <button
            type="button"
            onClick={() => onGenerate(hasEditableCopy ? editedCopy : undefined)}
            disabled={disabled || isGenerating}
            className="min-h-11 w-full rounded-[8px] bg-[#0D0E10] px-4 py-3 text-[11px] uppercase tracking-[0.16em] text-white transition-[transform,opacity] duration-150 hover:opacity-90 active:scale-[0.99] disabled:opacity-40 sm:tracking-[0.2em]"
          >
            {isGenerating
              ? "Creating…"
              : format === "photo"
                ? "Create my photo · 1 credit"
                : `Create this · ${estimatedCredits} ${estimatedCredits === 1 ? "credit" : "credits"}`}
          </button>
        )}
        {disabled && !isGenerating && !isDone && !isVideoDone && disabledReason && (
          <p className="text-[12px] leading-relaxed text-[#6D6E70]">{disabledReason}</p>
        )}
      </div>
    </div>
  )
}
