"use client"

// SSELFIE Studio 3.0 - TEXT-STUDIO-01: the full-screen text studio for graphic formats.
//
// Sandra's live feedback (2026-07-02): the inline editor sat BELOW the photo, so she scrolled
// up and down to see her changes. Here the preview is PINNED at the top (never scrolls away)
// and the controls scroll underneath it, mobile-first.
//
// Hybrid two-source model:
// - The CSS layer (TextOverlayLayer) is the instant live preview while she picks style, words,
//   size, and position - free, no API calls.
// - "Apply to photo" bakes the design into the image with ONE gpt-image-2 pass on the CLEAN
//   text-free base (/api/app-v3/maya/bake-text). The clean base is kept forever.
// - "Without text" is an instant client-side swap back to the clean base. No regenerate, ever.
// - If a bake fails, the layer version still previews and downloads (flattened canvas export).
//
// Styling mirrors credit-modal/trial-cap-offer (light editorial, rounded, App v3 palette).
// Sits above the concierge (z-50) and the lightbox (z-[60]).

import { useState } from "react"
import { trackAnalyticsEvent } from "@/lib/analytics/client"
import { isVerticalOverlayFormat, type TextOverlaySpec } from "@/lib/app-v3/text-overlay"
import { downloadImageWithOverlay, TextOverlayEditor, TextOverlayLayer } from "./text-overlay-layer"
import { Spinner } from "./loading"

interface TextStudioProps {
  /** The clean text-free base image. Every bake starts from this, never from a baked result. */
  cleanImageUrl: string
  spec: TextOverlaySpec
  /** The last baked render, if any (persisted alongside the spec in drafts). */
  bakedUrl?: string | null
  onSpecChange: (spec: TextOverlaySpec) => void
  /** A successful bake landed; the parent stores it next to the clean base. */
  onBaked: (url: string) => void
  onClose: () => void
}

export function TextStudio({
  cleanImageUrl,
  spec,
  bakedUrl,
  onSpecChange,
  onBaked,
  onClose,
}: TextStudioProps) {
  // "Without text" = instant swap to the clean base. Client-side only, zero API calls.
  const [showText, setShowText] = useState(true)
  const [baking, setBaking] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  // The spec the current bakedUrl was rendered from. When she edits past it, the live layer
  // takes over the preview so her changes always show instantly; re-applying bakes the new
  // design from the clean base again.
  const [bakedSpecKey, setBakedSpecKey] = useState<string | null>(
    bakedUrl ? JSON.stringify(spec) : null
  )

  const bakedFresh = Boolean(bakedUrl) && bakedSpecKey === JSON.stringify(spec)
  const showBaked = showText && bakedFresh
  const previewAspect = isVerticalOverlayFormat(spec.format) ? "aspect-[9/16]" : "aspect-[4/5]"

  function changeSpec(next: TextOverlaySpec) {
    setShowText(true)
    setNotice(null)
    onSpecChange(next)
  }

  async function applyToPhoto() {
    if (baking) return
    setBaking(true)
    setNotice(null)
    try {
      const res = await fetch("/api/app-v3/maya/bake-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // ALWAYS the clean base: a bake never runs on a previous baked result.
        body: JSON.stringify({ cleanImageUrl, spec }),
      })
      const data = (await res.json().catch(() => null)) as
        | { bakedUrl?: string; error?: string; code?: string }
        | null
      if (res.ok && typeof data?.bakedUrl === "string") {
        setBakedSpecKey(JSON.stringify(spec))
        setShowText(true)
        onBaked(data.bakedUrl)
        return
      }
      if (res.status === 402) {
        setNotice("You're out of credits this month. Your text still shows here, so Download still works.")
        return
      }
      setNotice(
        data?.error ||
          "That didn't go through. Your text still shows here, so you can download this version or try again."
      )
    } catch {
      setNotice(
        "That didn't go through. Your text still shows here, so you can download this version or try again."
      )
    } finally {
      setBaking(false)
    }
  }

  function download() {
    void trackAnalyticsEvent({
      event: "suite_image_downloaded",
      properties: { format: spec.format, source: "text-studio", baked: showBaked },
    }).catch(() => {})
    if (!showText) {
      window.open(cleanImageUrl, "_blank", "noreferrer")
    } else if (showBaked && bakedUrl) {
      window.open(bakedUrl, "_blank", "noreferrer")
    } else {
      void downloadImageWithOverlay(cleanImageUrl, spec)
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex h-[100dvh] flex-col bg-[#F8FAFA] animate-in fade-in duration-200 motion-reduce:animate-none">
      {/* Header (pinned) */}
      <div className="flex shrink-0 items-center justify-between px-4 pb-2 pt-[max(env(safe-area-inset-top),0.75rem)]">
        <p className="text-[10px] uppercase tracking-[0.3em] text-[#818283]">Your words</p>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex min-h-11 items-center px-2 text-[11px] uppercase tracking-[0.18em] text-[#4F5052] hover:text-[#0D0E10]"
        >
          Done
        </button>
      </div>

      {/* Pinned preview: the photo + live layer (or the baked render). NEVER scrolls away. */}
      <div className="relative flex h-[46vh] min-h-[260px] shrink-0 items-center justify-center bg-[#0D0E10] px-3 py-3">
        <div className={`relative h-full max-w-full overflow-hidden rounded-[6px] ${previewAspect}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={showBaked && bakedUrl ? bakedUrl : cleanImageUrl}
            alt=""
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
          />
          {showText && !showBaked && <TextOverlayLayer spec={spec} />}
          {baking && (
            <span className="absolute inset-0 flex items-center justify-center bg-[#0D0E10]/30">
              <Spinner className="h-7 w-7" />
            </span>
          )}
        </div>
        {/* Instant swap chip: this is the "remove text" that used to cost a regenerate. */}
        <button
          type="button"
          onClick={() => setShowText(current => !current)}
          className="absolute bottom-3 right-3 rounded-full bg-white/90 px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] text-[#0D0E10]"
        >
          {showText ? "Without text" : "With text"}
        </button>
      </div>

      {/* Scrollable controls under the pinned preview */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[max(env(safe-area-inset-bottom),1.25rem)] pt-3">
        <TextOverlayEditor spec={spec} imageUrl={cleanImageUrl} onChange={changeSpec} />

        {notice && (
          <p className="mt-3 rounded-[4px] bg-[#282728]/5 px-3 py-2 text-[12px] leading-relaxed text-[#282728]">
            {notice}
          </p>
        )}

        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => void applyToPhoto()}
            disabled={baking}
            className="inline-flex min-h-12 items-center justify-center rounded-[4px] bg-[#0D0E10] px-5 py-3 text-center text-[11px] uppercase tracking-[0.2em] text-white disabled:opacity-50"
          >
            {baking ? "Adding your words..." : "Apply to photo"}
          </button>
          <button
            type="button"
            onClick={download}
            className="inline-flex min-h-12 items-center justify-center rounded-[4px] border border-[#0D0E10] px-5 py-3 text-center text-[11px] uppercase tracking-[0.18em] text-[#0D0E10] hover:bg-[#0D0E10]/[0.04]"
          >
            Download
          </button>
          <p className="text-center text-[11px] leading-relaxed text-[#818283]">
            Apply makes the words part of the photo. Your clean photo stays saved, so you can take
            them off anytime.
          </p>
        </div>
      </div>
    </div>
  )
}
