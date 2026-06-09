"use client"

// SSELFIE Studio 3.0 — Concept Card (03, restyled 05A, multi-image 05D).
// One of the 3 concept directions Maya proposes inline. Holds its own Generate button, a
// spinner while the synchronous OpenAI call runs, and the finished result. Carousels return
// multiple slide images: the card shows the cover with a slide count, and tapping opens the
// swipeable lightbox. The preview frame matches the output format (square / vertical / 4:5).

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
  disabled?: boolean
}

const FRAME_ASPECT: Record<OutputFormat, string> = {
  photo: "aspect-[4/5]",
  "reel-cover": "aspect-[9/16]",
  "story-slide": "aspect-[9/16]",
  carousel: "aspect-square",
}

export function ConceptCard({ concept, gen, format, onGenerate, onOpen, disabled }: ConceptCardProps) {
  const isGenerating = gen.status === "generating"
  const images = gen.imageUrls ?? []
  const isDone = gen.status === "done" && images.length > 0

  return (
    <div className="overflow-hidden rounded-[8px] border border-[#C5C6C8]/60 bg-white">
      {/* Visual area: result (tap to open), spinner, or empty */}
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
            {images.length > 1 && (
              <span className="absolute left-2 top-2 rounded-full bg-[#0D0E10]/70 px-2.5 py-1 text-[9px] uppercase tracking-[0.18em] text-white">
                {images.length} slides
              </span>
            )}
            <span className="absolute bottom-2 right-2 rounded-full bg-[#0D0E10]/70 px-2.5 py-1 text-[9px] uppercase tracking-[0.18em] text-white opacity-0 transition-opacity group-hover:opacity-100">
              {images.length > 1 ? "Swipe" : "View"}
            </span>
          </button>
        ) : isGenerating ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <Spinner className="h-7 w-7" />
            <p className="text-[11px] uppercase tracking-[0.22em] text-[#818283]">Creating…</p>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="px-6 text-center text-[12px] uppercase tracking-[0.22em] text-[#A6A7A8]">
              {concept.title}
            </p>
          </div>
        )}
      </div>

      {/* Copy + action */}
      <div className="space-y-3 p-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-[#818283]">Concept</p>
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
          <div className="flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#818283]">Saved to gallery</p>
            <button
              type="button"
              onClick={onGenerate}
              disabled={disabled}
              className="text-[11px] uppercase tracking-[0.16em] text-[#4F5052] underline disabled:opacity-40"
            >
              Regenerate
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onGenerate}
            disabled={disabled || isGenerating}
            className="w-full rounded-[4px] bg-[#0D0E10] px-4 py-3 text-[11px] uppercase tracking-[0.2em] text-white disabled:opacity-40"
          >
            {isGenerating ? "Creating…" : "Generate this"}
          </button>
        )}
      </div>
    </div>
  )
}
