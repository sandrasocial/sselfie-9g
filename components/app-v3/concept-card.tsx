"use client"

// SSELFIE Studio 3.0 — Concept Card (MAYA-REBUILD-03).
// One of the 3 concept directions Maya proposes inline in the chat thread. Holds its own
// Generate button, per-card skeleton while the synchronous OpenAI call runs, and the
// finished image with a save-to-gallery note. Presentational — generation state is owned
// by the concierge and passed in.

import Image from "next/image"
import type { ConceptCard as ConceptCardData } from "@/lib/app-v3/maya/concept-types"

export type ConceptGenStatus = "idle" | "generating" | "done" | "error"

export interface ConceptGenState {
  status: ConceptGenStatus
  imageUrl?: string
  error?: string
}

interface ConceptCardProps {
  concept: ConceptCardData
  gen: ConceptGenState
  onGenerate: () => void
  disabled?: boolean
}

export function ConceptCard({ concept, gen, onGenerate, disabled }: ConceptCardProps) {
  const isGenerating = gen.status === "generating"
  const isDone = gen.status === "done" && gen.imageUrl

  return (
    <div className="overflow-hidden rounded-[6px] border border-[#C5C6C8]/60 bg-white">
      {/* Visual area: result, skeleton, or empty */}
      <div className="relative aspect-[4/5] w-full bg-[#F1F2F2]">
        {isDone ? (
          <Image
            src={gen.imageUrl as string}
            alt={concept.title}
            fill
            className="object-cover"
            sizes="(max-width:480px) 90vw, 360px"
          />
        ) : isGenerating ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#C5C6C8] border-t-[#0D0E10]" />
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
          <h4 className="font-serif text-[18px] font-light leading-tight text-[#0D0E10]">
            {concept.title}
          </h4>
          <p className="mt-1 text-[13px] leading-relaxed text-[#4F5052]">{concept.description}</p>
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
