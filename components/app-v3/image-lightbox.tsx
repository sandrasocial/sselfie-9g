"use client"

// SSELFIE Studio 3.0 - image lightbox (MAYA-REBUILD-05 Phase A).
// Lean fullscreen viewer for a generated result. Adapted from the live Studio lightbox, but
// stripped of gallery/feed/favorite coupling and kept icon-free to match /app's clean look.
// Supports keyboard (Esc, arrows), prev/next for multi-image sets, and download.

import { useEffect, useState } from "react"
import {
  downloadImageWithOverlay,
  TextOverlayEditor,
  TextOverlayLayer,
} from "./text-overlay-layer"
import type { TextOverlaySpec } from "@/lib/app-v3/text-overlay"

interface ImageLightboxProps {
  images: string[]
  textOverlaySpecs?: TextOverlaySpec[]
  startIndex?: number
  onClose: () => void
  onOverlayChange?: (index: number, spec: TextOverlaySpec) => void
}

export function ImageLightbox({
  images,
  textOverlaySpecs,
  startIndex = 0,
  onClose,
  onOverlayChange,
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
              className="absolute left-0 top-1/2 z-10 min-h-11 min-w-11 -translate-y-1/2 px-3 py-3 text-3xl leading-none text-white/70 hover:text-white sm:left-1"
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="Next"
              onClick={() => setIndex(p => (p < count - 1 ? p + 1 : 0))}
              className="absolute right-0 top-1/2 z-10 min-h-11 min-w-11 -translate-y-1/2 px-3 py-3 text-3xl leading-none text-white/70 hover:text-white sm:right-1"
            >
              ›
            </button>
          </>
        )}

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={`Result ${index + 1}`}
          decoding="async"
          className="max-h-full max-w-full rounded-[6px] object-contain"
        />
        {overlay && <TextOverlayLayer spec={overlay} />}
      </div>

      <div className="flex shrink-0 flex-col items-center justify-center gap-2 pt-3">
        {overlay && onOverlayChange && (
          <div className="w-full max-w-sm">
            <TextOverlayEditor
              spec={overlay}
              imageUrl={url}
              onChange={spec => onOverlayChange(index, spec)}
            />
          </div>
        )}
        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => {
              // Member pulse: downloads = "she loved it" (SUITE-UX-02).
              import("@/lib/analytics/client")
                .then(({ trackAnalyticsEvent }) =>
                  trackAnalyticsEvent({
                    event: "suite_image_downloaded",
                    properties: { source: "lightbox" },
                  })
                )
                .catch(() => {})
              if (overlay) void downloadImageWithOverlay(url, overlay, `sselfie-${index + 1}.png`)
              else window.open(url, "_blank", "noreferrer")
            }}
            className="inline-flex min-h-11 items-center text-[11px] uppercase tracking-[0.18em] text-white/80 underline underline-offset-4 hover:text-white"
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
