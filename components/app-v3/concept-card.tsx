"use client"

// SSELFIE Studio 3.0 — Concept Card (03, restyled 05A, multi-image 05D, guided 05F).
// One of the 3 directions Maya pulls. Maya-guided + tap-first: BEFORE generating it is a clean
// text card (title + one line + "Generate this") — no empty image frame that looks broken.
// While generating, a framed spinner. When done, the result (tap to open) with a confident
// success state: Use/Download primary, Regenerate secondary, "Ask Maya to tweak" tiny.

import Image from "next/image"
import type { ConceptCard as ConceptCardData } from "@/lib/app-v3/maya/concept-types"
import type { OutputFormat } from "./types"
import { Spinner } from "./loading"

export type ConceptGenStatus = "idle" | "generating" | "done" | "error"

export interface ConceptGenState {
  status: ConceptGenStatus
  imageUrls?: string[]
  error?: string
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
  disabled?: boolean
}

const FRAME_ASPECT: Record<OutputFormat, string> = {
  photo: "aspect-[4/5]",
  "reel-cover": "aspect-[9/16]",
  "story-slide": "aspect-[9/16]",
  carousel: "aspect-square",
}

export function ConceptCard({ concept, gen, format, onGenerate, onOpen, onEdit, disabled }: ConceptCardProps) {
  const isGenerating = gen.status === "generating"
  const images = gen.imageUrls ?? []
  const isDone = gen.status === "done" && images.length > 0
  const isCarousel = images.length > 1

  return (
    <div className="overflow-hidden rounded-[8px] border border-[#C5C6C8]/60 bg-white">
      {/* Visual area ONLY exists once we're generating or done — never an empty placeholder box. */}
      {(isGenerating || isDone) && (
        <div className={`relative w-full bg-[#F1F2F2] ${FRAME_ASPECT[format]}`}>
          {isDone ? (
            <button
              type="button"
              onClick={() => onOpen?.(images)}
              className="group absolute inset-0 cursor-zoom-in"
              aria-label="View full size"
            >
              <Image
                src={images[0]}
                alt={concept.title}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                sizes="(max-width:480px) 90vw, 360px"
              />
              {isCarousel && (
                <span className="absolute left-2 top-2 rounded-full bg-[#0D0E10]/70 px-2.5 py-1 text-[9px] uppercase tracking-[0.18em] text-white">
                  {images.length} slides
                </span>
              )}
              <span className="absolute bottom-2 right-2 rounded-full bg-[#0D0E10]/70 px-2.5 py-1 text-[9px] uppercase tracking-[0.18em] text-white opacity-0 transition-opacity group-hover:opacity-100">
                {isCarousel ? "Swipe" : "View"}
              </span>
            </button>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <Spinner className="h-7 w-7" />
              <p className="text-[11px] uppercase tracking-[0.22em] text-[#818283]">Creating…</p>
            </div>
          )}
        </div>
      )}

      {/* Copy + action */}
      <div className="space-y-3 p-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-[#818283]">Direction</p>
          <h4 className="mt-1.5 font-serif text-[19px] font-light leading-tight text-[#0D0E10]">
            {concept.title}
          </h4>
          <p className="mt-1.5 text-[13px] leading-relaxed text-[#4F5052]">{concept.description}</p>
        </div>

        {gen.status === "error" && (
          <p className="rounded-[4px] bg-[#282728]/5 px-3 py-2 text-[12px] text-[#282728]">
            {gen.error || "That one didn't go through. Try again."}
          </p>
        )}

        {isDone ? (
          <div className="space-y-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[#818283]">Saved to your gallery</p>
            <div className="flex items-center gap-3">
              {isCarousel ? (
                <button
                  type="button"
                  onClick={() => onOpen?.(images)}
                  className="rounded-[4px] bg-[#0D0E10] px-5 py-3 text-[11px] uppercase tracking-[0.2em] text-white"
                >
                  View all slides
                </button>
              ) : (
                <a
                  href={images[0]}
                  download
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-[4px] bg-[#0D0E10] px-5 py-3 text-[11px] uppercase tracking-[0.2em] text-white"
                >
                  Download
                </a>
              )}
              {onEdit && !isCarousel && (
                <button
                  type="button"
                  onClick={onEdit}
                  className="rounded-[4px] border border-[#0D0E10] px-5 py-3 text-[11px] uppercase tracking-[0.18em] text-[#0D0E10] hover:bg-[#0D0E10]/[0.04]"
                >
                  Edit this photo
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={onGenerate}
              disabled={disabled}
              className="text-[11px] uppercase tracking-[0.16em] text-[#818283] underline underline-offset-2 hover:text-[#4F5052] disabled:opacity-40"
            >
              Make another version
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onGenerate}
            disabled={disabled || isGenerating}
            className="w-full rounded-[4px] bg-[#0D0E10] px-4 py-3 text-[11px] uppercase tracking-[0.2em] text-white disabled:opacity-40"
          >
            {isGenerating ? "Creating…" : format === "photo" ? "Start my brand shoot" : "Create this"}
          </button>
        )}
      </div>
    </div>
  )
}
