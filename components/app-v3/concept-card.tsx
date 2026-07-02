"use client"

// SSELFIE Studio 3.0 - Concept Card (03, restyled 05A, multi-image 05D, guided 05F).
// One of the 3 directions Maya pulls. Maya-guided + tap-first: BEFORE generating it is a clean
// text card (title + one line + "Generate this") - no empty image frame that looks broken.
// While generating, a framed spinner. When done, the result (tap to open) with a confident
// success state: Use/Download primary, Regenerate secondary, "Ask Maya to tweak" tiny.

import type { ConceptCard as ConceptCardData } from "@/lib/app-v3/maya/concept-types"
import type { OutputFormat } from "./types"
import { Spinner } from "./loading"
import {
  downloadImageWithOverlay,
  TextOverlayEditor,
  TextOverlayLayer,
} from "./text-overlay-layer"
import type { TextOverlaySpec } from "@/lib/app-v3/text-overlay"

export type ConceptGenStatus = "idle" | "generating" | "done" | "error"

export interface ConceptGenState {
  status: ConceptGenStatus
  imageUrls?: string[]
  textOverlaySpecs?: TextOverlaySpec[]
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
  /** Update one editable text layer without regenerating the background image. */
  onOverlayChange?: (index: number, spec: TextOverlaySpec) => void
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

export function ConceptCard({
  concept,
  gen,
  format,
  onGenerate,
  onOpen,
  onEdit,
  onOverlayChange,
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

  return (
    <div className="min-w-0 max-w-full overflow-hidden rounded-[8px] border border-[#C5C6C8]/60 bg-white [overflow-x:clip]">
      {/* Visual area ONLY exists once we're generating or done - never an empty placeholder box. */}
      {(isGenerating || isDone || isVideoDone) && (
        <div className={`relative w-full bg-[#F1F2F2] ${FRAME_ASPECT[format]}`}>
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
                src={images[0]}
                alt={concept.title}
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              />
              {firstOverlay && <TextOverlayLayer spec={firstOverlay} />}
              {isCarousel && (
                <span className="absolute left-2 top-2 rounded-full bg-[#0D0E10]/70 px-2.5 py-1 text-[9px] uppercase tracking-[0.18em] text-white">
                  {images.length} slides
                </span>
              )}
              <span className="absolute bottom-2 right-2 rounded-full bg-[#0D0E10]/70 px-2.5 py-1 text-[9px] uppercase tracking-[0.18em] text-white opacity-0 transition-opacity group-hover:opacity-100">
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
              <span className="absolute bottom-2 left-2 rounded-full bg-[#0D0E10]/70 px-2.5 py-1 text-[9px] uppercase tracking-[0.18em] text-white">
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
      <div className="min-w-0 space-y-3 p-4">
        <div className="min-w-0 break-words [overflow-wrap:anywhere]">
          <p className="text-[10px] uppercase tracking-[0.22em] text-[#818283]">Direction</p>
          <h4 className="mt-1.5 font-serif text-[19px] font-light leading-tight text-[#0D0E10]">
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
            <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2 min-[380px]:gap-3">
              {isVideoDone ? (
                <a
                  href={videoUrl}
                  download
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center justify-center rounded-[4px] bg-[#0D0E10] px-4 py-3 text-center text-[11px] uppercase tracking-[0.16em] text-white min-[380px]:px-5 min-[380px]:tracking-[0.2em]"
                >
                  Download video
                </a>
              ) : isCarousel ? (
                <button
                  type="button"
                  onClick={() => onOpen?.(images)}
                  className="inline-flex min-h-11 items-center justify-center rounded-[4px] bg-[#0D0E10] px-4 py-3 text-center text-[11px] uppercase tracking-[0.16em] text-white min-[380px]:px-5 min-[380px]:tracking-[0.2em]"
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
                    if (firstOverlay) void downloadImageWithOverlay(images[0], firstOverlay)
                    else window.open(images[0], "_blank", "noreferrer")
                  }}
                  className="inline-flex min-h-11 items-center justify-center rounded-[4px] bg-[#0D0E10] px-4 py-3 text-center text-[11px] uppercase tracking-[0.16em] text-white min-[380px]:px-5 min-[380px]:tracking-[0.2em]"
                >
                  Download
                </button>
              )}
              {firstOverlay && onOverlayChange && !isCarousel && !isVideoDone && (
                <TextOverlayEditor
                  spec={firstOverlay}
                  onChange={spec => onOverlayChange(0, spec)}
                />
              )}
              {onEdit && !isCarousel && !isVideoDone && (
                <button
                  type="button"
                  onClick={onEdit}
                  className="inline-flex min-h-11 items-center justify-center rounded-[4px] border border-[#0D0E10] px-4 py-3 text-center text-[11px] uppercase tracking-[0.14em] text-[#0D0E10] hover:bg-[#0D0E10]/[0.04] min-[380px]:px-5 min-[380px]:tracking-[0.18em]"
                >
                  Edit this photo
                </button>
              )}
              {promptAssetId && !isVideoDone && (
                <a
                  href={`/api/admin/app-v3/generation-prompt?id=${encodeURIComponent(promptAssetId)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center justify-center rounded-[4px] border border-[#C5C6C8] px-4 py-3 text-center text-[11px] uppercase tracking-[0.14em] text-[#4F5052] hover:bg-[#0D0E10]/[0.04] min-[380px]:px-5 min-[380px]:tracking-[0.18em]"
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
          </div>
        ) : (
          <button
            type="button"
            onClick={onGenerate}
            disabled={disabled || isGenerating}
            className="min-h-11 w-full rounded-[4px] bg-[#0D0E10] px-4 py-3 text-[11px] uppercase tracking-[0.16em] text-white disabled:opacity-40 sm:tracking-[0.2em]"
          >
            {isGenerating
              ? "Creating…"
              : format === "photo"
                ? "Start my brand shoot"
                : "Create this"}
          </button>
        )}
      </div>
    </div>
  )
}
