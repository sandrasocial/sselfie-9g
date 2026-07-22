"use client"

// SSELFIE Studio 3.0 - image lightbox (MAYA-REBUILD-05 Phase A).
// Lean fullscreen viewer for a generated result. Adapted from the live Studio lightbox, but
// stripped of gallery/feed/favorite coupling and kept icon-free to match /app's clean look.
// Supports keyboard (Esc, arrows), prev/next for multi-image sets, and download.

import { useEffect, useRef, useState } from "react"
import type { TextOverlaySpec } from "@/lib/app-v3/text-overlay"
import { recordSuiteDownloadForReview } from "@/lib/testimonials/review-capture-client"
import { initiateAssetDownload } from "@/lib/app-v3/download-asset"
import { downloadAllSlidesAsZip } from "@/lib/app-v3/download-all-slides"
import { FavoriteButton } from "./favorite-button"

interface ImageLightboxProps {
  images: string[]
  /** Per-image persisted asset ids, index-aligned with images. Missing values stay null. */
  assetIds?: Array<string | number | null>
  /** Persisted ids for baked variants, index-aligned with bakedImageUrls. */
  bakedAssetIds?: Array<string | number | null>
  /** Per-image output formats, index-aligned with images. */
  formats?: Array<string | null>
  /** Per-image favorite state, index-aligned with images. */
  favoriteStates?: boolean[]
  textOverlaySpecs?: TextOverlaySpec[]
  /** Per-image baked text renders, index-aligned with images. */
  bakedImageUrls?: Array<string | null>
  /** Names the "Download all" zip file, e.g. "the-callout-hook.zip". Falls back to a generic name. */
  conceptTitle?: string | null
  startIndex?: number
  onDownloaded?: () => void
  onUseInCalendar?: (index: number) => void
  onCreateVariation?: (index: number) => void
  onClose: () => void
}

export function ImageLightbox({
  images,
  assetIds,
  bakedAssetIds,
  formats,
  favoriteStates,
  textOverlaySpecs,
  bakedImageUrls,
  conceptTitle,
  startIndex = 0,
  onDownloaded,
  onUseInCalendar,
  onCreateVariation,
  onClose,
}: ImageLightboxProps) {
  const count = images.length
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const thumbRailRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const [rawIndex, setIndex] = useState(
    Math.min(Math.max(startIndex, 0), Math.max(count - 1, 0))
  )
  // Defensive clamp: if `images` ever shrinks under an index left over from a prior render
  // (a future caller passing a shorter array in place, without this component remounting),
  // this keeps the viewer showing a real slide instead of silently rendering nothing.
  const index = Math.min(rawIndex, Math.max(count - 1, 0))
  // SUITE-UX-02 mobile: swipe left/right navigates multi-image sets (carousel slides).
  const [touchStartX, setTouchStartX] = useState<number | null>(null)
  const [bulkDownloadStatus, setBulkDownloadStatus] = useState<"idle" | "preparing" | "error">(
    "idle"
  )

  useEffect(() => {
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    const frame = window.requestAnimationFrame(() => closeButtonRef.current?.focus())
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCloseRef.current()
      if (e.key === "ArrowLeft") setIndex(p => (p > 0 ? p - 1 : count - 1))
      if (e.key === "ArrowRight") setIndex(p => (p < count - 1 ? p + 1 : 0))
      if (e.key !== "Tab") return
      const focusable = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
        ) ?? []
      ).filter(element => element.offsetParent !== null)
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener("keydown", onKey)
      if (previouslyFocused?.isConnected) previouslyFocused.focus()
    }
  }, [count])

  // Keep the active thumbnail in view when the index changes via arrows, swipe, or keyboard,
  // not just a direct tap on the rail.
  useEffect(() => {
    thumbRailRef.current
      ?.querySelector<HTMLElement>(`[data-thumb-index="${index}"]`)
      ?.scrollIntoView?.({ behavior: "smooth", inline: "center", block: "nearest" })
  }, [index])

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
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Your finished creation"
      className="pointer-events-auto fixed inset-0 z-[60] flex h-[100dvh] flex-col bg-[#0D0E10]/95 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-[max(env(safe-area-inset-top),0.75rem)] backdrop-blur-sm animate-in fade-in duration-200 motion-reduce:animate-none sm:px-4"
    >
      <div className="flex shrink-0 justify-end">
        <button
          ref={closeButtonRef}
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

      {/* Jump straight to any slide instead of arrowing through them one at a time. */}
      {count > 1 && (
        <div
          ref={thumbRailRef}
          role="tablist"
          aria-label="All slides"
          className="flex shrink-0 gap-2 overflow-x-auto pb-1 pt-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {images.map((thumbUrl, thumbIndex) => {
            const thumbSrc = bakedImageUrls?.[thumbIndex] ?? thumbUrl
            const active = thumbIndex === index
            return (
              <button
                key={`${thumbUrl}-${thumbIndex}`}
                type="button"
                role="tab"
                data-thumb-index={thumbIndex}
                aria-selected={active}
                aria-label={`Slide ${thumbIndex + 1} of ${count}`}
                onClick={() => setIndex(thumbIndex)}
                className={`relative h-14 w-11 shrink-0 overflow-hidden rounded-[6px] ring-2 transition-[opacity,ring-color] sm:h-16 sm:w-12 ${
                  active ? "opacity-100 ring-white" : "opacity-55 ring-transparent hover:opacity-80"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={thumbSrc}
                  alt=""
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <span className="absolute bottom-0.5 right-1 text-[9px] font-medium text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.8)]">
                  {thumbIndex + 1}
                </span>
              </button>
            )
          })}
        </div>
      )}

      <div className="flex shrink-0 flex-col items-center justify-center gap-2 pt-2">
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
        <div className="flex flex-wrap items-center justify-center gap-3">
          {overlay && !baked && (
            <span className="text-[11px] text-white/50">Clean image shown. Text is below.</span>
          )}
          <FavoriteButton
            key={String((baked ? bakedAssetIds?.[index] : assetIds?.[index]) ?? index)}
            assetId={baked ? bakedAssetIds?.[index] : assetIds?.[index]}
            initialFavorite={favoriteStates?.[index] ?? false}
            dark
          />
          <button
            type="button"
            onClick={async () => {
              const started = await initiateAssetDownload(
                baked ?? url,
                `sselfie-${baked ? (bakedAssetIds?.[index] ?? index + 1) : (assetIds?.[index] ?? index + 1)}.png`
              )
              if (!started) return
              void recordSuiteDownloadForReview({
                source: "lightbox",
                assetId: baked ? (bakedAssetIds?.[index] ?? null) : (assetIds?.[index] ?? null),
                format: formats?.[index] ?? null,
              })
              onDownloaded?.()
            }}
            className="inline-flex min-h-11 items-center rounded-full bg-white px-6 py-2.5 text-[11px] uppercase tracking-[0.18em] text-[#0D0E10] transition-[transform,opacity] duration-150 hover:opacity-90 active:scale-95"
          >
            Download
          </button>
          {onUseInCalendar ? (
            <button
              type="button"
              onClick={() => onUseInCalendar(index)}
              className="inline-flex min-h-11 items-center rounded-full border border-white/40 px-5 py-2.5 text-[11px] uppercase tracking-[0.16em] text-white transition-colors hover:border-white"
            >
              Use in Calendar
            </button>
          ) : null}
          {onCreateVariation ? (
            <button
              type="button"
              onClick={() => onCreateVariation(index)}
              className="inline-flex min-h-11 items-center px-3 py-2.5 text-[11px] text-white/80 underline underline-offset-4 hover:text-white"
            >
              Create a variation
            </button>
          ) : null}
          {count > 1 && (
            <button
              type="button"
              onClick={async () => {
                if (bulkDownloadStatus === "preparing") return
                setBulkDownloadStatus("preparing")
                const allUrls = images.map((imgUrl, i) => bakedImageUrls?.[i] ?? imgUrl)
                const started = await downloadAllSlidesAsZip(
                  allUrls,
                  conceptTitle || "sselfie-slides"
                )
                if (!started) {
                  setBulkDownloadStatus("error")
                  return
                }
                setBulkDownloadStatus("idle")
                void recordSuiteDownloadForReview({
                  source: "lightbox",
                  assetId: null,
                  format: formats?.[0] ?? null,
                })
                onDownloaded?.()
              }}
              disabled={bulkDownloadStatus === "preparing"}
              className="inline-flex min-h-11 items-center rounded-full border border-white/40 px-5 py-2.5 text-[11px] uppercase tracking-[0.18em] text-white transition-colors hover:border-white disabled:opacity-50"
            >
              {bulkDownloadStatus === "preparing" ? "Preparing…" : `Download all ${count}`}
            </button>
          )}
          {count > 1 && (
            <span className="text-[11px] text-white/50">
              {index + 1} / {count}
            </span>
          )}
        </div>
        {bulkDownloadStatus === "error" && (
          <p role="alert" className="text-[11px] text-white/70">
            Couldn&apos;t bundle the zip. Please try again.
          </p>
        )}
      </div>
    </div>
  )
}
