"use client"

// SSELFIE Studio 3.0 — image lightbox (MAYA-REBUILD-05 Phase A).
// Lean fullscreen viewer for a generated result. Adapted from the live Studio lightbox, but
// stripped of gallery/feed/favorite coupling and kept icon-free to match /app's clean look.
// Supports keyboard (Esc, arrows), prev/next for multi-image sets, and download.

import { useEffect, useState } from "react"

interface ImageLightboxProps {
  images: string[]
  startIndex?: number
  onClose: () => void
}

export function ImageLightbox({ images, startIndex = 0, onClose }: ImageLightboxProps) {
  const count = images.length
  const [index, setIndex] = useState(Math.min(Math.max(startIndex, 0), Math.max(count - 1, 0)))

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
      if (e.key === "ArrowLeft") setIndex((p) => (p > 0 ? p - 1 : count - 1))
      if (e.key === "ArrowRight") setIndex((p) => (p < count - 1 ? p + 1 : 0))
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [count, onClose])

  const url = images[index]
  if (!url) return null

  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-[#0D0E10]/95 p-4 backdrop-blur-sm">
      <button
        type="button"
        onClick={onClose}
        className="absolute right-5 top-5 text-[11px] uppercase tracking-[0.18em] text-white/80 hover:text-white"
      >
        Close
      </button>

      {count > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous"
            onClick={() => setIndex((p) => (p > 0 ? p - 1 : count - 1))}
            className="absolute left-3 top-1/2 -translate-y-1/2 px-4 py-3 text-3xl leading-none text-white/70 hover:text-white"
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Next"
            onClick={() => setIndex((p) => (p < count - 1 ? p + 1 : 0))}
            className="absolute right-3 top-1/2 -translate-y-1/2 px-4 py-3 text-3xl leading-none text-white/70 hover:text-white"
          >
            ›
          </button>
        </>
      )}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={`Result ${index + 1}`}
        className="mx-auto max-h-[80vh] w-auto max-w-3xl rounded-[6px] object-contain"
      />

      <div className="mt-4 flex items-center gap-4">
        <a
          href={url}
          download
          target="_blank"
          rel="noreferrer"
          className="text-[11px] uppercase tracking-[0.18em] text-white/80 underline underline-offset-4 hover:text-white"
        >
          Download
        </a>
        {count > 1 && (
          <span className="text-[11px] text-white/50">
            {index + 1} / {count}
          </span>
        )}
      </div>
    </div>
  )
}
