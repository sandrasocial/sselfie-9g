"use client"

// SSELFIE Studio 3.0 - image lightbox (MAYA-REBUILD-05 Phase A).
// Lean fullscreen viewer for a generated result. Adapted from the live Studio lightbox, but
// stripped of gallery/feed/favorite coupling and kept icon-free to match /app's clean look.
// Supports keyboard (Esc, arrows), prev/next for multi-image sets, and download.

import { useEffect, useState } from "react"
import type { TextOverlaySpec } from "@/lib/app-v3/text-overlay"
import { recordSuiteDownloadForReview } from "@/lib/testimonials/review-capture-client"

interface ImageLightboxProps {
  images: string[]
  /** Per-image persisted asset ids, index-aligned with images. Missing values stay null. */
  assetIds?: Array<string | number | null>
  /** Persisted ids for baked variants, index-aligned with bakedImageUrls. */
  bakedAssetIds?: Array<string | number | null>
  /** Per-image output formats, index-aligned with images. */
  formats?: Array<string | null>
  textOverlaySpecs?: TextOverlaySpec[]
  /** Per-image baked text renders, index-aligned with images. */
  bakedImageUrls?: Array<string | null>
  startIndex?: number
  onClose: () => void
}

export function ImageLightbox({
  images,
  assetIds,
  bakedAssetIds,
  formats,
  textOverlaySpecs,
  bakedImageUrls,
  startIndex = 0,
  onClose,
}: ImageLightboxProps) {
  const count = images.length
  const [index, setIndex] = useState(Math.min(Math.max(startIndex, 0), Math.max(count - 1, 0)))
  // SUITE-UX-02 mobile: swipe left/right navigates multi-image sets (carousel slides).
  const [touchStartX, setTouchStartX] = useState<number | null>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
      if (e.key === "ArrowLeft") setIndex(p => (p > 0 ? p - 1 : count - 1))
      if (e.key === "ArrowRight") setIndex(p => (p < count - 1 ? p + 1 : 0))
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [count, onClose])

  const url = images[index]
  const overlay = textOverlaySpecs?.[index] ?? null
  // A baked render wins the view; the clean base in images[] stays kept underneath.
  const baked = bakedImageUrls?.[index] ?? null
  const suggestedText = [overlay?.headline, overlay?.subline].filter(Boolean).join("\n")
  const [copied, setCopied] = useState(false)
  if (!url) return null

  return (
    // SUITE-UX-02 mobile: flex column with a min-h-0 image region (no fixed 80vh), safe-area
    // padding, full-height on the DYNAMIC viewport so phones never crop or letterbox oddly.
    <div className="fixed inset-0 z-[60] flex h-[100dvh] flex-col bg-[#0D0E10]/95 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-[max(env(safe-area-inset-top),0.75rem)] backdrop-blur-sm animate-in fade-in duration-200 motion-reduce:animate-none sm:px-4">
      <div className="flex shrink-0 justify-end">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex min-h-11 items-center px-2 py-2 text-[11px] uppercase tracking-[0.18em] text-white/80 hover:text-white"
        >
          Close
        </button>
      </div>

      <div
        className="relative flex min-h-0 flex-1 items-center justify-center"
        onTouchStart={e => setTouchStartX(e.touches[0]?.clientX ?? null)}
        onTouchEnd={e => {
          if (touchStartX === null || count < 2) return
          const delta = (e.changedTouches[0]?.clientX ?? touchStartX) - touchStartX
          if (delta > 48) setIndex(p => (p > 0 ? p - 1 : count - 1))
          if (delta < -48) setIndex(p => (p < count - 1 ? p + 1 : 0))
          setTouchStartX(null)
        }}
      >
        {count > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous"
              onClick={() => setIndex(p => (p > 0 ? p - 1 : count - 1))}
              className="absolute left-0 top-1/2 z-10 flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center rounded-full px-3 py-3 text-3xl leading-none text-white/70 transition-colors hover:bg-white/10 hover:text-white sm:left-1"
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="Next"
              onClick={() => setIndex(p => (p < count - 1 ? p + 1 : 0))}
              className="absolute right-0 top-1/2 z-10 flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center rounded-full px-3 py-3 text-3xl leading-none text-white/70 transition-colors hover:bg-white/10 hover:text-white sm:right-1"
            >
              ›
            </button>
          </>
        )}

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={baked ?? url}
          alt={`Photo ${index + 1}`}
          decoding="async"
          className="max-h-full max-w-full rounded-[10px] object-contain shadow-[0_24px_80px_rgba(0,0,0,0.55)] animate-in fade-in zoom-in-[0.98] duration-300 motion-reduce:animate-none"
        />
      </div>

      <div className="flex shrink-0 flex-col items-center justify-center gap-2 pt-3">
        {suggestedText && (
          <div className="w-full max-w-md rounded-[12px] border border-white/15 bg-white/10 p-3 text-white">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/55">
                Words for this one
              </p>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard?.writeText(suggestedText)
                  setCopied(true)
                  window.setTimeout(() => setCopied(false), 1800)
                }}
                className="inline-flex min-h-8 items-center text-[10px] uppercase tracking-[0.14em] text-white/75 underline underline-offset-2 hover:text-white"
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <pre className="mt-2 whitespace-pre-wrap break-words font-sans text-[12px] leading-relaxed text-white/85 [overflow-wrap:anywhere]">
              {suggestedText}
            </pre>
          </div>
        )}
        <div className="flex items-center justify-center gap-4">
          {overlay && !baked && (
            <span className="text-[11px] text-white/50">Clean image shown. Text is below.</span>
          )}
          <button
            type="button"
            onClick={() => {
              // Member pulse: downloads = "she loved it" (SUITE-UX-02).
              void recordSuiteDownloadForReview({
                source: "lightbox",
                assetId: baked ? (bakedAssetIds?.[index] ?? null) : (assetIds?.[index] ?? null),
                format: formats?.[index] ?? null,
              })
              window.open(baked ?? url, "_blank", "noreferrer")
            }}
            className="inline-flex min-h-11 items-center rounded-full bg-white px-6 py-2.5 text-[11px] uppercase tracking-[0.18em] text-[#0D0E10] transition-[transform,opacity] duration-150 hover:opacity-90 active:scale-95"
          >
            Download
          </button>
          {count > 1 && (
            <span className="text-[11px] text-white/50">
              {index + 1} / {count}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
