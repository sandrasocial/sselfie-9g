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
}

interface ConceptCardProps {
  concept: ConceptCardData
  gen: ConceptGenState
  format: OutputFormat
  onGenerate: () => void
  /** Open the finished image(s) fullscreen (carousels pass all slides). */
  onOpen?: (imageUrls: string[]) => void
  /** Open true Edit Mode on the finished image. */
  onEdit?: () => void
  /** Feed Planner Phase 2c: Maya saves this photo to the member's content calendar herself,
   *  picking the slot - resolves with the day it landed on for the confirmation label.
   *  "forbidden" = this plan has no Calendar (403); the action and offer hide themselves. */
  onAddToCalendar?: () => Promise<{ scheduledAt: string } | "forbidden" | null>
  /** Show Maya's spoken save-offer line above the actions. The concierge passes true for the
   *  FIRST finished photo only, so a 3-card batch doesn't repeat the same sentence 3 times -
   *  the "Add to calendar" button itself stays on every eligible card. */
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
  /** Fires only after a browser download has been initiated. */
  onDownloaded?: () => void
  disabled?: boolean
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
  concept,
  gen,
  format,
  onGenerate,
  onOpen,
  onEdit,
  onAddToCalendar,
  showCalendarOffer = true,
  idleAction,
  resultActions,
  onRetryText,
  promptAssetId,
  eyebrow = "Maya's idea",
  onDownloaded,
  disabled,
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
  const firstOverlay = gen.textOverlaySpecs?.[0] ?? null
  // A baked render (text in the pixels) wins the card; the clean base stays kept underneath.
  const firstBaked = gen.bakedImageUrls?.[0] ?? null
  const firstCleanAssetId = gen.aiImageIds?.[0] ?? gen.aiImageId ?? null
  const firstDownloadAssetId = firstBaked ? (gen.bakedAiImageIds?.[0] ?? null) : firstCleanAssetId
  const suggestedText = buildSuggestedTextCopy(gen.textOverlaySpecs)
  const [copiedText, setCopiedText] = useState(false)
  const [copyError, setCopyError] = useState(false)
  const [downloadStatus, setDownloadStatus] = useState<"idle" | "downloading" | "error">("idle")
  const [calendarStatus, setCalendarStatus] = useState<
    "idle" | "saving" | "saved" | "error" | "unavailable"
  >("idle")
  const [savedDateLabel, setSavedDateLabel] = useState<string | null>(null)
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
      const date = new Date(`${result.scheduledAt}T00:00:00Z`)
      setSavedDateLabel(
        date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
      )
      setCalendarStatus("saved")
    } catch {
      setCalendarStatus("error")
    }
  }
  const calendarAvailable = !!onAddToCalendar && calendarStatus !== "unavailable"
  const requestedBakedText = gen.textOverlayMode === "with-text"
  const hasAnyBakedText = Boolean(gen.bakedImageUrls?.some(Boolean))
  const bakeMissing = requestedBakedText && Boolean(firstOverlay) && !hasAnyBakedText

  return (
    <div className="min-w-0 max-w-full overflow-hidden rounded-[14px] border border-[#C5C6C8]/35 bg-white shadow-[0_1px_2px_rgba(13,14,16,0.04),0_10px_28px_rgba(13,14,16,0.06)] transition-shadow duration-300 hover:shadow-[0_2px_4px_rgba(13,14,16,0.05),0_16px_40px_rgba(13,14,16,0.09)] [overflow-x:clip]">
      {/* Visual area ONLY exists once we're generating or done - never an empty placeholder box. */}
      {(isGenerating || isDone || isVideoDone) && (
        <div
          className={`relative w-full bg-[#F1F2F2] ${FRAME_ASPECT[format]} ${
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
          ) : isDone ? (
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
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              />
              {isCarousel && (
                <span className="absolute left-2.5 top-2.5 rounded-full bg-[#0D0E10]/65 px-2.5 py-1 text-[9px] uppercase tracking-[0.18em] text-white backdrop-blur-sm">
                  {images.length} slides
                </span>
              )}
              <span className="absolute bottom-2.5 right-2.5 rounded-full bg-[#0D0E10]/65 px-2.5 py-1 text-[9px] uppercase tracking-[0.18em] text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
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
              <span className="absolute bottom-2.5 left-2.5 rounded-full bg-[#0D0E10]/65 px-2.5 py-1 text-[9px] uppercase tracking-[0.18em] text-white backdrop-blur-sm">
                Developing…
              </span>
            </div>
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

      {/* Copy + action */}
      <div className="min-w-0 space-y-3 p-4 sm:p-5">
        <div className="min-w-0 break-words [overflow-wrap:anywhere]">
          <p className="text-[10px] uppercase tracking-[0.22em] text-[#6D6E70]">{eyebrow}</p>
          <h4 className="mt-1.5 font-serif text-[21px] font-light leading-tight text-[#0D0E10]">
            {concept.title}
          </h4>
          <p className="mt-1.5 text-[13px] leading-relaxed text-[#4F5052]">{concept.description}</p>
        </div>

        {gen.status === "error" && (
          <p
            role="alert"
            className="break-words rounded-[4px] bg-[#282728]/5 px-3 py-2 text-[12px] text-[#282728] [overflow-wrap:anywhere]"
          >
            {gen.error || "That one didn't go through. Try again."}
          </p>
        )}

        {isDone || isVideoDone ? (
          <div className="space-y-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[#6D6E70]">
              {isVideoDone ? "Saved to your videos" : "Saved to your gallery"}
            </p>
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
            <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2 min-[380px]:gap-3">
              {!isVideoDone && firstDownloadAssetId ? (
                <FavoriteButton assetId={firstDownloadAssetId} />
              ) : null}
              <button
                type="button"
                onClick={onGenerate}
                disabled={disabled}
                className="inline-flex min-h-11 items-center justify-center rounded-[8px] border border-[#0D0E10] bg-white px-4 py-3 text-center text-[11px] uppercase tracking-[0.14em] text-[#0D0E10] transition-colors hover:bg-[#F1F2F2] disabled:opacity-40"
              >
                Continue this shoot
              </button>
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
                <button
                  type="button"
                  onClick={() => onOpen?.(images)}
                  className="inline-flex min-h-11 items-center justify-center rounded-[8px] px-3 py-3 text-center text-[11px] uppercase tracking-[0.14em] text-[#4F5052] underline underline-offset-4"
                >
                  View all slides
                </button>
              ) : (
                <button
                  type="button"
                  onClick={async () => {
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
                  }}
                  disabled={downloadStatus === "downloading"}
                  className="inline-flex min-h-11 items-center justify-center rounded-[8px] px-3 py-3 text-center text-[11px] uppercase tracking-[0.14em] text-[#4F5052] underline underline-offset-4 disabled:opacity-50"
                >
                  {downloadStatus === "downloading" ? "Preparing…" : "Download"}
                </button>
              )}
            </div>
            {downloadStatus === "error" && (
              <p role="alert" className="text-[12px] text-[#4F5052]">
                Download did not start. Please try again.
              </p>
            )}
            {resultActions}
            <details className="group rounded-[8px] border border-[#C5C6C8]/55 bg-white">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-3.5 text-[11px] uppercase tracking-[0.14em] text-[#4F5052] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0D0E10]">
                More
                <span aria-hidden className="text-[16px] font-light group-open:rotate-45">
                  +
                </span>
              </summary>
              <div className="flex flex-wrap gap-2 border-t border-[#C5C6C8]/45 p-3">
                {onEdit && !isCarousel && !isVideoDone && (
                  <button
                    type="button"
                    onClick={onEdit}
                    className="inline-flex min-h-11 items-center rounded-[6px] border border-[#C5C6C8] px-3.5 text-[11px] uppercase tracking-[0.12em] text-[#4F5052] hover:border-[#0D0E10]"
                  >
                    Edit photo
                  </button>
                )}
                {calendarAvailable &&
                  !isCarousel &&
                  !isVideoDone &&
                  (calendarStatus === "saved" ? (
                    <span className="inline-flex min-h-11 items-center px-3.5 text-[11px] uppercase tracking-[0.12em] text-[#4F5052]">
                      Added · {savedDateLabel}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleAddToCalendar}
                      disabled={calendarStatus === "saving"}
                      className="inline-flex min-h-11 items-center rounded-[6px] border border-[#C5C6C8] px-3.5 text-[11px] uppercase tracking-[0.12em] text-[#4F5052] hover:border-[#0D0E10] disabled:opacity-50"
                    >
                      {calendarStatus === "saving"
                        ? "Saving…"
                        : calendarStatus === "error"
                          ? "Try calendar again"
                          : showCalendarOffer
                            ? "Add to calendar"
                            : "Save to calendar"}
                    </button>
                  ))}
                {promptAssetId && !isVideoDone && (
                  <a
                    href={`/api/admin/app-v3/generation-prompt?id=${encodeURIComponent(promptAssetId)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-11 items-center rounded-[6px] border border-[#C5C6C8] px-3.5 text-[11px] uppercase tracking-[0.12em] text-[#4F5052] hover:border-[#0D0E10]"
                  >
                    View prompt
                  </a>
                )}
              </div>
            </details>
          </div>
        ) : idleAction ? (
          idleAction
        ) : (
          <button
            type="button"
            onClick={onGenerate}
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
      </div>
    </div>
  )
}
