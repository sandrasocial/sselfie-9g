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
  autoBakeSkipped?: string | null
  aiImageId?: number | null
  aiImageIds?: Array<number | null>
  videoUrl?: string
  error?: string
  /** Progressive partial frame (data URL) while streaming - the photo "develops" in place. */
  previewUrl?: string
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
  /** Replaces the single idle button when a guided picker should own the next step. */
  idleAction?: ReactNode
  /** Extra guided next steps after a result is created. */
  resultActions?: ReactNode
  /** Admin-only prompt inspector asset id, e.g. ai_123. */
  promptAssetId?: string | null
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
  idleAction,
  resultActions,
  promptAssetId,
  disabled,
}: ConceptCardProps) {
  const isGenerating = gen.status === "generating"
  const images = gen.imageUrls ?? []
  const videoUrl = gen.videoUrl
  const isDone = gen.status === "done" && images.length > 0
  const isVideoDone = gen.status === "done" && !!videoUrl
  const isCarousel = images.length > 1
  const firstOverlay = gen.textOverlaySpecs?.[0] ?? null
  // A baked render (text in the pixels) wins the card; the clean base stays kept underneath.
  const firstBaked = gen.bakedImageUrls?.[0] ?? null
  const suggestedText = buildSuggestedTextCopy(gen.textOverlaySpecs)
  const [copiedText, setCopiedText] = useState(false)
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
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <Spinner className="h-7 w-7" />
              <p className="text-[11px] uppercase tracking-[0.22em] text-[#818283]">Creating…</p>
            </div>
          )}
        </div>
      )}

      {/* Copy + action */}
      <div className="min-w-0 space-y-3 p-4 sm:p-5">
        <div className="min-w-0 break-words [overflow-wrap:anywhere]">
          <p className="text-[10px] uppercase tracking-[0.22em] text-[#818283]">Maya&apos;s idea</p>
          <h4 className="mt-1.5 font-serif text-[21px] font-light leading-tight text-[#0D0E10]">
            {concept.title}
          </h4>
          <p className="mt-1.5 text-[13px] leading-relaxed text-[#4F5052]">{concept.description}</p>
        </div>

        {gen.status === "error" && (
          <p className="break-words rounded-[4px] bg-[#282728]/5 px-3 py-2 text-[12px] text-[#282728] [overflow-wrap:anywhere]">
            {gen.error || "That one didn't go through. Try again."}
          </p>
        )}

        {isDone || isVideoDone ? (
          <div className="space-y-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[#818283]">
              {isVideoDone ? "Saved to your videos" : "Saved to your gallery"}
            </p>
            {bakeMissing && (
              <p className="rounded-[4px] bg-[#282728]/5 px-3 py-2 text-[12px] leading-relaxed text-[#4F5052]">
                The clean image is ready. The text did not bake into this one, so Maya left the
                words below for you to copy or try again.
              </p>
            )}
            {suggestedText && (
              <div className="rounded-[10px] border border-[#C5C6C8]/50 bg-[#F8FAFA] p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-[#818283]">
                    Maya&apos;s suggested text
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard?.writeText(suggestedText)
                      setCopiedText(true)
                      window.setTimeout(() => setCopiedText(false), 1800)
                    }}
                    className="inline-flex min-h-8 items-center text-[10px] uppercase tracking-[0.14em] text-[#4F5052] underline underline-offset-2 hover:text-[#0D0E10]"
                  >
                    {copiedText ? "Copied" : "Copy"}
                  </button>
                </div>
                <pre className="mt-2 whitespace-pre-wrap break-words font-sans text-[12px] leading-relaxed text-[#282728] [overflow-wrap:anywhere]">
                  {suggestedText}
                </pre>
              </div>
            )}
            <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2 min-[380px]:gap-3">
              {isVideoDone ? (
                <a
                  href={videoUrl}
                  download
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center justify-center rounded-[8px] bg-[#0D0E10] px-4 py-3 text-center text-[11px] uppercase tracking-[0.16em] text-white transition-[transform,opacity] duration-150 hover:opacity-90 active:scale-[0.98] min-[380px]:px-5 min-[380px]:tracking-[0.2em]"
                >
                  Download video
                </a>
              ) : isCarousel ? (
                <button
                  type="button"
                  onClick={() => onOpen?.(images)}
                  className="inline-flex min-h-11 items-center justify-center rounded-[8px] bg-[#0D0E10] px-4 py-3 text-center text-[11px] uppercase tracking-[0.16em] text-white transition-[transform,opacity] duration-150 hover:opacity-90 active:scale-[0.98] min-[380px]:px-5 min-[380px]:tracking-[0.2em]"
                >
                  View all slides
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    // Member pulse: a download is the strongest "she loved it" signal (SUITE-UX-02).
                    import("@/lib/analytics/client")
                      .then(({ trackAnalyticsEvent }) =>
                        trackAnalyticsEvent({
                          event: "suite_image_downloaded",
                          properties: { format, source: "concept-card" },
                        })
                      )
                      .catch(() => {})
                    window.open(firstBaked ?? images[0], "_blank", "noreferrer")
                  }}
                  className="inline-flex min-h-11 items-center justify-center rounded-[8px] bg-[#0D0E10] px-4 py-3 text-center text-[11px] uppercase tracking-[0.16em] text-white transition-[transform,opacity] duration-150 hover:opacity-90 active:scale-[0.98] min-[380px]:px-5 min-[380px]:tracking-[0.2em]"
                >
                  Download
                </button>
              )}
              {onEdit && !isCarousel && !isVideoDone && (
                <button
                  type="button"
                  onClick={onEdit}
                  className="inline-flex min-h-11 items-center justify-center rounded-[8px] border border-[#0D0E10] px-4 py-3 text-center text-[11px] uppercase tracking-[0.14em] text-[#0D0E10] transition-[transform,background-color] duration-150 hover:bg-[#0D0E10]/[0.04] active:scale-[0.98] min-[380px]:px-5 min-[380px]:tracking-[0.18em]"
                >
                  Edit this photo
                </button>
              )}
              {promptAssetId && !isVideoDone && (
                <a
                  href={`/api/admin/app-v3/generation-prompt?id=${encodeURIComponent(promptAssetId)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center justify-center rounded-[8px] border border-[#C5C6C8] px-4 py-3 text-center text-[11px] uppercase tracking-[0.14em] text-[#4F5052] transition-[transform,background-color] duration-150 hover:bg-[#0D0E10]/[0.04] active:scale-[0.98] min-[380px]:px-5 min-[380px]:tracking-[0.18em]"
                >
                  View prompt
                </a>
              )}
            </div>
            <button
              type="button"
              onClick={onGenerate}
              disabled={disabled}
              className="inline-flex min-h-11 items-center text-[11px] uppercase tracking-[0.16em] text-[#818283] underline underline-offset-2 hover:text-[#4F5052] disabled:opacity-40"
            >
              Make another version
            </button>
            {resultActions}
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
                : "Create this"}
          </button>
        )}
      </div>
    </div>
  )
}
